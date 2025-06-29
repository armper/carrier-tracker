/**
 * FMCSA SAFER Database Integration Service
 * 
 * This service integrates with the FMCSA SAFER database to fetch real-time carrier information.
 * It provides functionality to lookup carriers by DOT number and parse the response data.
 */

export interface FMCSACarrierData {
  dotNumber: string
  legalName: string | null
  dbaName: string | null
  physicalAddress: string | null
  phone: string | null
  safetyRating: string | null
  insuranceStatus: string | null
  authorityStatus: string | null
  stateCarrierIdNumber: string | null
  dunsNumber: string | null
  powerUnits: number | null
  drivers: number | null
  mcsNumber: string | null
  operatingStatus: string | null
  lastUpdated: string
  dataSource: 'fmcsa'
}

export interface FMCSAResponse {
  success: boolean
  data: FMCSACarrierData | null
  error?: string
  cached?: boolean
  source: 'fmcsa' | 'cache' | 'fallback'
}

/**
 * FMCSA Service Class
 * Handles all interactions with the FMCSA SAFER database
 */
export class FMCSAService {
  private readonly baseUrl = 'https://safer.fmcsa.dot.gov'
  private readonly cacheTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  private cache: Map<string, { data: FMCSACarrierData; timestamp: number }> = new Map()

  /**
   * Lookup carrier information by DOT number
   */
  async lookupCarrier(dotNumber: string): Promise<FMCSAResponse> {
    try {
      // Validate DOT number format
      if (!this.isValidDotNumber(dotNumber)) {
        return {
          success: false,
          data: null,
          error: 'Invalid DOT number format',
          source: 'fmcsa'
        }
      }

      // Check cache first
      const cached = this.getCachedData(dotNumber)
      if (cached) {
        return {
          success: true,
          data: cached,
          cached: true,
          source: 'cache'
        }
      }

      // Fetch from FMCSA
      const carrierData = await this.fetchFromFMCSA(dotNumber)
      
      if (carrierData) {
        // Cache the successful result
        this.setCachedData(dotNumber, carrierData)
        
        return {
          success: true,
          data: carrierData,
          source: 'fmcsa'
        }
      }

      return {
        success: false,
        data: null,
        error: 'Carrier not found in FMCSA database',
        source: 'fmcsa'
      }

    } catch (error) {
      console.error('FMCSA lookup error:', error)
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        source: 'fmcsa'
      }
    }
  }

  /**
   * Fetch carrier data directly from FMCSA SAFER web interface
   */
  private async fetchFromFMCSA(dotNumber: string): Promise<FMCSACarrierData | null> {
    try {
      // Method 1: Try the query interface (most reliable)
      const queryUrl = `${this.baseUrl}/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`
      
      const response = await fetch(queryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000 // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`FMCSA API returned ${response.status}: ${response.statusText}`)
      }

      const htmlContent = await response.text()
      
      // Parse the HTML response
      const carrierData = this.parseCarrierHTML(htmlContent, dotNumber)
      
      return carrierData

    } catch (error) {
      console.error('Error fetching from FMCSA:', error)
      
      // Fallback: try alternative method
      try {
        return await this.fetchFromCompanySnapshot(dotNumber)
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError)
        throw error
      }
    }
  }

  /**
   * Alternative method using CompanySnapshot.aspx
   */
  private async fetchFromCompanySnapshot(dotNumber: string): Promise<FMCSACarrierData | null> {
    const snapshotUrl = `${this.baseUrl}/CompanySnapshot.aspx?ID=${dotNumber}&TYPE=USDOT`
    
    const response = await fetch(snapshotUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`Company snapshot request failed: ${response.status}`)
    }

    const htmlContent = await response.text()
    return this.parseCarrierHTML(htmlContent, dotNumber)
  }

  /**
   * Parse HTML content from FMCSA response
   */
  private parseCarrierHTML(html: string, dotNumber: string): FMCSACarrierData | null {
    try {
      // Basic HTML parsing - looking for key data patterns
      const data: Partial<FMCSACarrierData> = {
        dotNumber,
        dataSource: 'fmcsa',
        lastUpdated: new Date().toISOString()
      }

      // Extract legal name
      const legalNameMatch = html.match(/Legal Name[:\s]*([^<\n\r]+)/i)
      if (legalNameMatch) {
        data.legalName = legalNameMatch[1].trim()
      }

      // Extract DBA name
      const dbaMatch = html.match(/DBA Name[:\s]*([^<\n\r]+)/i)
      if (dbaMatch) {
        data.dbaName = dbaMatch[1].trim()
      }

      // Extract physical address
      const addressMatch = html.match(/Physical Address[:\s]*([^<\n\r]+(?:\n[^<\n\r]+)*)/i)
      if (addressMatch) {
        data.physicalAddress = addressMatch[1].replace(/\s+/g, ' ').trim()
      }

      // Extract phone
      const phoneMatch = html.match(/Phone[:\s]*([^<\n\r]+)/i)
      if (phoneMatch) {
        data.phone = phoneMatch[1].trim()
      }

      // Extract safety rating
      const safetyMatch = html.match(/Safety Rating[:\s]*([^<\n\r]+)/i)
      if (safetyMatch) {
        data.safetyRating = safetyMatch[1].trim().toLowerCase()
      }

      // Extract operating status  
      const statusMatch = html.match(/Operating Status[:\s]*([^<\n\r]+)/i)
      if (statusMatch) {
        data.operatingStatus = statusMatch[1].trim()
        // Map operating status to our insurance/authority status
        const status = statusMatch[1].trim().toLowerCase()
        if (status.includes('active')) {
          data.insuranceStatus = 'Active'
          data.authorityStatus = 'Active'
        } else if (status.includes('out')) {
          data.insuranceStatus = 'Inactive'
          data.authorityStatus = 'Inactive'
        }
      }

      // Extract power units (vehicles)
      const powerUnitsMatch = html.match(/Power Units[:\s]*(\d+)/i)
      if (powerUnitsMatch) {
        data.powerUnits = parseInt(powerUnitsMatch[1])
      }

      // Extract drivers
      const driversMatch = html.match(/Drivers[:\s]*(\d+)/i)
      if (driversMatch) {
        data.drivers = parseInt(driversMatch[1])
      }

      // Extract MCS number
      const mcsMatch = html.match(/MCS[:\s]*([^<\n\r]+)/i)
      if (mcsMatch) {
        data.mcsNumber = mcsMatch[1].trim()
      }

      // Verify we got at least basic data
      if (!data.legalName && !data.dbaName) {
        console.warn('No carrier name found in FMCSA response')
        return null
      }

      return data as FMCSACarrierData

    } catch (error) {
      console.error('Error parsing FMCSA HTML:', error)
      return null
    }
  }

  /**
   * Validate DOT number format
   */
  private isValidDotNumber(dotNumber: string): boolean {
    // DOT numbers are typically 6-8 digits
    const cleaned = dotNumber.replace(/\D/g, '')
    return cleaned.length >= 6 && cleaned.length <= 8 && !isNaN(Number(cleaned))
  }

  /**
   * Get cached carrier data if still valid
   */
  private getCachedData(dotNumber: string): FMCSACarrierData | null {
    const cached = this.cache.get(dotNumber)
    if (cached && (Date.now() - cached.timestamp) < this.cacheTime) {
      return cached.data
    }
    
    // Remove expired cache entry
    if (cached) {
      this.cache.delete(dotNumber)
    }
    
    return null
  }

  /**
   * Cache carrier data
   */
  private setCachedData(dotNumber: string, data: FMCSACarrierData): void {
    this.cache.set(dotNumber, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const fmcsaService = new FMCSAService()

// Export utility functions
export function mapFMCSAToCarrierData(fmcsaData: FMCSACarrierData) {
  return {
    dot_number: fmcsaData.dotNumber,
    legal_name: fmcsaData.legalName,
    dba_name: fmcsaData.dbaName,
    physical_address: fmcsaData.physicalAddress,
    phone: fmcsaData.phone,
    safety_rating: fmcsaData.safetyRating || 'not-rated',
    insurance_status: fmcsaData.insuranceStatus || 'Unknown',
    authority_status: fmcsaData.authorityStatus || 'Unknown',
    vehicle_count: fmcsaData.powerUnits,
    data_source: 'fmcsa',
    last_fmcsa_update: fmcsaData.lastUpdated,
    verified: true,
    verification_date: new Date().toISOString(),
    trust_score: 95 // High trust score for FMCSA data
  }
}