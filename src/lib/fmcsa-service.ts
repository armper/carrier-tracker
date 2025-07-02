/**
 * FMCSA SAFER Database Integration Service
 * 
 * This service integrates with the FMCSA SAFER database to fetch real-time carrier information.
 * It provides functionality to lookup carriers by DOT number and parse the response data.
 */

import * as cheerio from 'cheerio'

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
        }
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
      }
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
      // Load HTML into Cheerio for DOM parsing
      const $ = cheerio.load(html)

      const data: Partial<FMCSACarrierData> = {
        dotNumber,
        dataSource: 'fmcsa',
        lastUpdated: new Date().toISOString()
      }

      // Helper function to clean text
      const cleanText = (text: string | null): string | undefined => {
        if (!text) return undefined
        return text
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
      }

      // Helper function to extract table values using DOM selectors - improved for SAFER HTML structure
      const extractTableValue = (label: string): string | null => {
        // SAFER HTML uses specific structure: <TH class="querylabelbkg">Label:</TH> followed by <TD class="queryfield">Data</TD>
        
        // Approach 1: Look for the specific SAFER structure
        const labelTh = $('th.querylabelbkg').filter((i, el) => {
          const text = $(el).text().trim()
          return text === label + ':' || text === label || text.includes(label)
        })
        
        if (labelTh.length > 0) {
          // Find the data cell in the same row with class "queryfield"
          const row = labelTh.closest('tr')
          const dataCell = row.find('td.queryfield').first()
          if (dataCell.length > 0) {
            const text = dataCell.text().trim()
            // Clean the text and validate it's not form interface
            if (text && !text.includes('Query Result') && !text.includes('SAFER Table Layout') && !text.includes('Enter Value')) {
              return text
            }
          }
        }
        
        // Approach 2: Fallback to original logic with better filtering
        const row = $(`th:contains("${label}"), td:contains("${label}")`).closest('tr')
        if (row.length === 0) return null

        // Get the corresponding data cell
        const dataCell = row.find('td').not(':contains("' + label + '")').first()
        if (dataCell.length === 0) return null

        // Extract text content, handling nested tags
        const text = dataCell.text().trim()
        
        // Filter out garbage form interface text
        if (!text || 
            text.includes('Query Result') ||
            text.includes('SAFER Table Layout') ||
            text.includes('Enter Value') ||
            text.includes('Information') ||
            text.includes('USDOT Number') ||
            text.includes('MC/MX Number') ||
            text.length > 200) {
          return null
        }
        
        return text || null
      }

      // Check if page requires JavaScript (common with FMCSA)
      if (html.includes('This page requires scripting to be enabled') && !html.includes('Legal Name')) {
        // Only use JavaScript fallback if we can't find any data in the HTML
        // Try to extract from page title as fallback
        const title = $('title').text()
        const titleMatch = title.match(/SAFER Web - Company Snapshot\s+(.+)/i)
        if (titleMatch) {
          const titleName = titleMatch[1].trim()
          if (titleName && 
              titleName !== 'USDOT' && 
              titleName !== 'RECORD INACTIVE' && 
              !titleName.includes('INACTIVE') &&
              titleName.length > 3) {
            data.legalName = titleName
            // Set basic defaults for JavaScript-disabled page
            data.safetyRating = 'not-rated'
            data.insuranceStatus = 'Unknown'
            data.authorityStatus = 'Unknown'
            console.log('Extracted company name from title:', titleName)
          }
        }
      } else {
        // Normal HTML parsing for non-JavaScript pages using Cheerio
        
        // Extract legal name
        const legalName = extractTableValue('Legal Name')
        if (legalName) {
          const name = cleanText(legalName)
          if (name && name !== ':' && name.length > 2) {
            data.legalName = name
          }
        }

        // Extract DBA name
        const dbaName = extractTableValue('DBA Name')
        if (dbaName) {
          const dba = cleanText(dbaName)
          if (dba && dba !== ':' && dba.length > 2) {
            data.dbaName = dba
          }
        }

        // Extract physical address
        const address = extractTableValue('Physical Address')
        if (address) {
          const cleanAddress = cleanText(address)
          if (cleanAddress && cleanAddress !== ':' && cleanAddress.length > 3) {
            data.physicalAddress = cleanAddress
          }
        }

        // Extract phone
        const phone = extractTableValue('Phone')
        if (phone) {
          const cleanPhone = cleanText(phone)
          if (cleanPhone && cleanPhone !== ':' && cleanPhone !== '">Phone:' && cleanPhone.length > 5) {
            data.phone = cleanPhone
          }
        }

        // Extract safety rating
        const safetyRating = extractTableValue('Safety Rating')
        if (safetyRating) {
          const rating = cleanText(safetyRating)?.toLowerCase()
          if (rating && !rating.includes('does not necessarily') && rating.length < 20) {
            data.safetyRating = rating
          }
        }

        // Extract operating authority status (this is the key field we were missing)
        const authorityStatus = extractTableValue('Operating Authority Status') || extractTableValue('Operating Status')
        if (authorityStatus) {
          const status = cleanText(authorityStatus)
          if (status && status !== ':' && status.length < 50 && !status.includes('For Licensing')) {
            data.operatingStatus = status
            // Map operating authority status to our insurance/authority status
            const statusLower = status.toLowerCase()
            if (statusLower.includes('authorized') || statusLower.includes('active')) {
              data.insuranceStatus = 'Active'
              data.authorityStatus = 'Active'
            } else if (statusLower.includes('not authorized') || statusLower.includes('out') || statusLower.includes('inactive')) {
              data.insuranceStatus = 'Inactive'
              data.authorityStatus = 'Inactive'
            } else {
              data.insuranceStatus = 'Unknown'
              data.authorityStatus = 'Unknown'
            }
          }
        }

        // Extract MC/MX/FF Number(s) for MC number
        const mcNumbers = extractTableValue('MC/MX/FF Number(s)')
        if (mcNumbers) {
          const mcText = cleanText(mcNumbers)
          // Look for MC- pattern in the text
          const mcMatch = mcText?.match(/MC-(\d+)/)
          if (mcMatch) {
            data.mcsNumber = `MC-${mcMatch[1]}`
          } else {
            data.mcsNumber = mcText
          }
        }

        // Extract power units (vehicles)
        const powerUnits = extractTableValue('Power Units')
        if (powerUnits) {
          const units = parseInt(cleanText(powerUnits)?.replace(/,/g, '') || '0')
          if (!isNaN(units) && units > 0) {
            data.powerUnits = units
          }
        }

        // Extract drivers
        const drivers = extractTableValue('Drivers')
        if (drivers) {
          const driverCount = parseInt(cleanText(drivers)?.replace(/,/g, '') || '0')
          if (!isNaN(driverCount) && driverCount > 0) {
            data.drivers = driverCount
          }
        }
      }

      // Debug logging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('FMCSA parsed data:', data)
      }

      // Verify we got at least basic data
      if (!data.legalName && !data.dbaName) {
        console.warn('No carrier name found in FMCSA response')
        console.warn('Available data keys:', Object.keys(data))
        // Try one more extraction from HTML content
        const anyNameMatch = html.match(/Company Snapshot[^>]*?\s+(\w+[^<\n\r]{10,})/i)
        if (anyNameMatch) {
          const possibleName = anyNameMatch[1].trim()
          if (possibleName.length > 5 && possibleName.length < 100) {
            data.legalName = possibleName
            console.log('Extracted name from snapshot header:', possibleName)
          }
        }
        
        if (!data.legalName && !data.dbaName) {
          return null
        }
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
  const baseData = {
    dot_number: fmcsaData.dotNumber,
    legal_name: fmcsaData.legalName || undefined,
    dba_name: fmcsaData.dbaName || undefined,
    physical_address: fmcsaData.physicalAddress || undefined,
    phone: fmcsaData.phone || undefined,
    safety_rating: fmcsaData.safetyRating || 'not-rated',
    insurance_status: fmcsaData.insuranceStatus || 'Unknown',
    authority_status: fmcsaData.authorityStatus || 'Unknown',
    vehicle_count: fmcsaData.powerUnits,
    data_source: 'fmcsa',
    verified: true,
    verification_date: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Calculate trust score based on data quality
  import('./trust-score').then(({ calculateTrustScore }) => {
    const { score } = calculateTrustScore(baseData)
    return { ...baseData, trust_score: score }
  }).catch(() => {
    // Fallback to default FMCSA trust score
    return { ...baseData, trust_score: 95 }
  })

  // For now, use default FMCSA trust score until dynamic calculation is implemented
  return { ...baseData, trust_score: 95 }
}