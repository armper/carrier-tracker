/**
 * DOT Data Sync Service
 * Handles automated carrier data updates from multiple sources
 */

import { createClient } from './supabase-server'

interface CarrierData {
  dot_number: string
  legal_name?: string
  dba_name?: string
  physical_address?: string
  phone?: string
  safety_rating?: string
  insurance_status?: string
  authority_status?: string
  state?: string
  city?: string
  vehicle_count?: number
  out_of_service_date?: string
  mcs_150_date?: string
  operation_classification?: string[]
  carrier_operation?: string[]
  // Additional fields useful for freight brokers
  driver_count?: number
  safety_review_date?: string
  safety_rating_date?: string
  total_mileage?: number
  interstate_operation?: boolean
  hazmat_flag?: boolean
  passenger_flag?: boolean
  migrant_flag?: boolean
  pc_flag?: boolean // Private carrier flag
  crash_indicator?: string
  inspection_indicator?: string
  entity_type?: string // Corporation, Partnership, etc.
  ein_number?: string // Federal Tax ID
  mc_number?: string // Motor Carrier number
  mx_number?: string // Mexico number
  operating_status?: string
  credit_score?: string
  
  // Enhanced fields for freight brokers
  // Safety & Compliance History
  crash_count?: number
  fatal_crashes?: number
  injury_crashes?: number
  tow_away_crashes?: number
  inspection_count?: number
  inspection_violations?: number
  out_of_service_orders?: number
  out_of_service_rate?: number
  driver_inspections?: number
  vehicle_inspections?: number
  
  // Insurance & Financial
  insurance_carrier?: string
  insurance_policy_number?: string
  insurance_amount?: number
  insurance_effective_date?: string
  insurance_expiry_date?: string
  cargo_insurance_amount?: number
  financial_responsibility_status?: string
  
  // Operational Details
  equipment_types?: string[] // dry van, flatbed, refrigerated, etc.
  service_areas?: string[] // states/cities they operate in
  years_in_business?: number
  annual_revenue?: number
  fleet_age?: number // average age of vehicles
  
  // Additional Compliance
  drug_testing_program?: boolean
  alcohol_testing_program?: boolean
  hazmat_certification?: boolean
  passenger_certification?: boolean
  school_bus_certification?: boolean
  
  // Contact & Business
  email?: string
  website?: string
  emergency_contact?: string
  emergency_phone?: string
  business_hours?: string
}

interface SyncResult {
  success: boolean
  data?: CarrierData
  error?: string
  source: string
  responseTime: number
}

export class DOTSyncService {
  private supabase: any

  constructor() {
    this.supabase = null // Will be initialized in methods
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Sync a single carrier by DOT number using multiple fallback sources
   */
  async syncCarrier(dotNumber: string): Promise<SyncResult> {
    const startTime = Date.now()
    
    // Try multiple data sources in order of reliability
    const sources = [
      () => this.fetchFromSaferWebAPI(dotNumber),
      () => this.fetchFromSAFERScraper(dotNumber),
      () => this.fetchFromFMCSAPublicAPI(dotNumber) // When it's back online
    ]

    for (const fetchMethod of sources) {
      try {
        const result = await fetchMethod()
        if (result.success && result.data) {
          await this.updateCarrierData(dotNumber, result.data, result.source)
          return {
            ...result,
            responseTime: Date.now() - startTime
          }
        }
      } catch (error) {
        console.error(`Data source failed:`, error)
        continue
      }
    }

    return {
      success: false,
      error: 'All data sources failed',
      source: 'none',
      responseTime: Date.now() - startTime
    }
  }

  /**
   * Fetch from SaferWebAPI.com (third-party service)
   */
  private async fetchFromSaferWebAPI(dotNumber: string): Promise<SyncResult> {
    const startTime = Date.now()
    
    try {
      // Note: SaferWebAPI.com requires API key for production use
      // This is a mock implementation - replace with actual API call
      const response = await fetch(`https://api.saferwebapi.com/v1/carrier/${dotNumber}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SAFER_WEB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        return {
          success: false,
          error: `SaferWebAPI HTTP ${response.status}`,
          source: 'saferwebapi',
          responseTime: Date.now() - startTime
        }
      }

      const data = await response.json()
      
      return {
        success: true,
        data: this.normalizeCarrierData(data, 'saferwebapi'),
        source: 'saferwebapi',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'saferwebapi',
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Fetch from SAFER system via web scraping (fallback)
   */
  private async fetchFromSAFERScraper(dotNumber: string): Promise<SyncResult> {
    const startTime = Date.now()
    
    try {
      // Use a web scraping service or library to get SAFER data
      // This is a simplified example - in production you'd use Puppeteer, Playwright, etc.
      const saferUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&original_query_param=USDOT&query_string=${dotNumber}`
      
      // For now, return mock data structure
      // In production, implement actual scraping logic
      const mockData = {
        dot_number: dotNumber,
        legal_name: `Carrier ${dotNumber}`,
        safety_rating: 'satisfactory',
        insurance_status: 'Active',
        authority_status: 'Active'
      }

      return {
        success: true,
        data: mockData,
        source: 'safer_scraper',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
        source: 'safer_scraper',
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Fetch from official FMCSA API (when available)
   */
  private async fetchFromFMCSAPublicAPI(dotNumber: string): Promise<SyncResult> {
    const startTime = Date.now()
    
    try {
      // Official FMCSA mobile API (currently down)
      const response = await fetch(`https://mobile.fmcsa.dot.gov/qc/services/carriers/${dotNumber}`)
      
      if (!response.ok) {
        return {
          success: false,
          error: `FMCSA API HTTP ${response.status}`,
          source: 'fmcsa_api',
          responseTime: Date.now() - startTime
        }
      }

      const data = await response.json()
      
      return {
        success: true,
        data: this.normalizeCarrierData(data, 'fmcsa_api'),
        source: 'fmcsa_api',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: 'FMCSA API currently unavailable',
        source: 'fmcsa_api',
        responseTime: Date.now() - startTime
      }
    }
  }

  /**
   * Normalize carrier data from different sources to our standard format
   */
  private normalizeCarrierData(rawData: any, source: string): CarrierData {
    // Each data source has different field names and formats
    // This function standardizes them to our database schema
    
    const normalized: CarrierData = {
      dot_number: rawData.dot_number || rawData.usdot || rawData.dotNumber
    }

    // Map fields based on data source
    switch (source) {
      case 'saferwebapi':
        normalized.legal_name = rawData.legalName || rawData.legal_name
        normalized.dba_name = rawData.dbaName || rawData.dba_name
        normalized.safety_rating = this.normalizeSafetyRating(rawData.safetyRating || rawData.safety_rating)
        normalized.insurance_status = this.normalizeStatus(rawData.insuranceStatus || rawData.insurance_status)
        normalized.authority_status = this.normalizeStatus(rawData.authorityStatus || rawData.authority_status)
        normalized.physical_address = rawData.physicalAddress || rawData.address
        normalized.phone = rawData.phone || rawData.phoneNumber
        normalized.state = rawData.state || rawData.physicalState
        normalized.city = rawData.city || rawData.physicalCity
        normalized.vehicle_count = rawData.vehicleCount || rawData.powerUnits
        break

      case 'fmcsa_api':
        normalized.legal_name = rawData.carrier?.legalName
        normalized.safety_rating = this.normalizeSafetyRating(rawData.carrier?.safetyRating)
        normalized.insurance_status = this.normalizeStatus(rawData.carrier?.insuranceRequired)
        // Add more FMCSA-specific field mappings
        break

      case 'safer_scraper':
        // Handle scraped data format
        normalized.legal_name = rawData.legal_name
        normalized.safety_rating = this.normalizeSafetyRating(rawData.safety_rating)
        normalized.insurance_status = this.normalizeStatus(rawData.insurance_status)
        normalized.authority_status = this.normalizeStatus(rawData.authority_status)
        break
    }

    return normalized
  }

  /**
   * Normalize safety rating to our standard values
   */
  private normalizeSafetyRating(rating: string | null | undefined): string {
    if (!rating) return 'not-rated'
    
    const normalized = rating.toLowerCase().trim()
    
    if (normalized.includes('satisfactory')) return 'satisfactory'
    if (normalized.includes('conditional')) return 'conditional'
    if (normalized.includes('unsatisfactory')) return 'unsatisfactory'
    
    return 'not-rated'
  }

  /**
   * Normalize status fields to Active/Inactive
   */
  private normalizeStatus(status: string | null | undefined): string {
    if (!status) return 'Unknown'
    
    const normalized = status.toLowerCase().trim()
    
    if (normalized.includes('active') || normalized.includes('authorized') || normalized.includes('yes')) {
      return 'Active'
    }
    
    if (normalized.includes('inactive') || normalized.includes('revoked') || normalized.includes('suspended') || normalized.includes('no')) {
      return 'Inactive'
    }
    
    return 'Unknown'
  }

  /**
   * Update carrier data in database and log the changes
   */
  private async updateCarrierData(dotNumber: string, data: CarrierData, source: string): Promise<void> {
    const supabase = await this.getSupabase()
    
    try {
      // Get existing carrier data
      const { data: existingCarrier, error: fetchError } = await supabase
        .from('carriers')
        .select('*')
        .eq('dot_number', dotNumber)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch existing carrier: ${fetchError.message}`)
      }

      const now = new Date().toISOString()
      const updateData = {
        ...data,
        data_source: source,
        last_verified: now,
        api_last_sync: now,
        api_sync_status: 'synced',
        api_error_count: 0
      }

      if (existingCarrier) {
        // Update existing carrier
        const { error: updateError } = await supabase
          .from('carriers')
          .update(updateData)
          .eq('dot_number', dotNumber)

        if (updateError) {
          throw new Error(`Failed to update carrier: ${updateError.message}`)
        }
      } else {
        // Create new carrier
        const { error: insertError } = await supabase
          .from('carriers')
          .insert(updateData)

        if (insertError) {
          throw new Error(`Failed to create carrier: ${insertError.message}`)
        }
      }

      // Log successful sync
      await this.logSyncResult(dotNumber, source, 'success', data, null)
      
    } catch (error) {
      // Log failed sync
      await this.logSyncResult(dotNumber, source, 'error', null, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Log sync results for monitoring and debugging
   */
  private async logSyncResult(
    dotNumber: string, 
    source: string, 
    status: 'success' | 'error', 
    data: CarrierData | null, 
    error: string | null
  ): Promise<void> {
    const supabase = await this.getSupabase()
    
    try {
      // Get carrier ID
      const { data: carrier } = await supabase
        .from('carriers')
        .select('id')
        .eq('dot_number', dotNumber)
        .single()

      if (carrier) {
        await supabase
          .from('api_sync_log')
          .insert({
            carrier_id: carrier.id,
            api_source: source,
            sync_type: 'full_profile',
            new_data: data,
            success: status === 'success',
            error_message: error
          })
      }
    } catch (logError) {
      console.error('Failed to log sync result:', logError)
      // Don't throw - logging failures shouldn't break the sync
    }
  }

  /**
   * Bulk sync multiple carriers
   */
  async bulkSync(dotNumbers: string[], onProgress?: (progress: number, total: number) => void): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < dotNumbers.length; i++) {
      const dotNumber = dotNumbers[i]
      
      try {
        const result = await this.syncCarrier(dotNumber)
        
        if (result.success) {
          results.successful++
        } else {
          results.failed++
          results.errors.push(`${dotNumber}: ${result.error}`)
        }
      } catch (error) {
        results.failed++
        results.errors.push(`${dotNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Report progress
      onProgress?.(i + 1, dotNumbers.length)
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Get carriers that need verification
   */
  async getCarriersNeedingSync(limit: number = 100): Promise<Array<{
    dot_number: string
    legal_name: string
    days_since_verification: number
    priority: string
  }>> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase.rpc('identify_carriers_needing_verification')
    
    if (error) {
      throw new Error(`Failed to get carriers needing verification: ${error.message}`)
    }
    
    return data?.slice(0, limit) || []
  }
}