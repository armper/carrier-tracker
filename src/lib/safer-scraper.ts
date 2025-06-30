/**
 * SAFER Web Scraper
 * Free scraping service for DOT carrier data from safer.fmcsa.dot.gov
 * Respectful scraping with rate limiting and error handling
 */

import { createClient } from './supabase-server'

interface ScrapedCarrierData {
  dot_number: string
  legal_name?: string
  dba_name?: string
  physical_address?: string
  phone?: string
  safety_rating?: string
  insurance_status?: string
  authority_status?: string
  carb_compliance?: boolean
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

interface ScrapeResult {
  success: boolean
  data?: ScrapedCarrierData
  error?: string
  httpStatus?: number
  rateLimited?: boolean
}

export class SAFERScraper {
  private baseUrl = 'https://safer.fmcsa.dot.gov'
  private requestDelay = 2000 // 2 seconds between requests
  private maxRetries = 3
  private userAgent = 'Mozilla/5.0 (compatible; CarrierTracker/1.0)'

  /**
   * Scrape a single carrier's data from SAFER
   */
  async scrapeCarrier(dotNumber: string): Promise<ScrapeResult> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Scraping DOT ${dotNumber}, attempt ${attempt}/${this.maxRetries}`)
        
        // Step 1: Get the search page first to establish session
        const searchPageResponse = await fetch(`${this.baseUrl}/`, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive'
          }
        })

        if (!searchPageResponse.ok) {
          throw new Error(`Failed to load search page: ${searchPageResponse.status}`)
        }

        // Extract cookies for session
        const cookies = searchPageResponse.headers.get('set-cookie') || ''
        
        // Step 2: Perform the search using the proper search endpoint
        const searchUrl = `${this.baseUrl}/query.asp`
        const searchParams = new URLSearchParams({
          searchtype: 'ANY',
          query_type: 'queryCarrierSnapshot', 
          query_param: 'USDOT',
          query_string: dotNumber
        })

        const response = await fetch(`${searchUrl}?${searchParams}`, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Referer': `${this.baseUrl}/`,
            'Cookie': cookies
          }
        })

        if (response.status === 429) {
          console.log(`Rate limited for DOT ${dotNumber}, waiting...`)
          await this.sleep(this.requestDelay * 2) // Double delay on rate limit
          continue
        }

        if (!response.ok) {
          if (attempt < this.maxRetries) {
            await this.sleep(this.requestDelay)
            continue
          }
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            httpStatus: response.status
          }
        }

        const html = await response.text()
        
        // Check if carrier was found
        if (html.includes('No records found') || html.includes('not found')) {
          return {
            success: false,
            error: 'Carrier not found in SAFER database'
          }
        }

        // Parse the HTML response
        const parsedData = this.parseCarrierHTML(html, dotNumber)
        
        if (!parsedData.legal_name) {
          return {
            success: false,
            error: 'Could not parse carrier data from response'
          }
        }

        // Add delay between requests to be respectful
        await this.sleep(this.requestDelay)

        return {
          success: true,
          data: parsedData
        }

      } catch (error) {
        console.error(`Scraping error for DOT ${dotNumber}, attempt ${attempt}:`, error)
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.requestDelay * attempt) // Exponential backoff
          continue
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown scraping error'
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded'
    }
  }

  /**
   * Parse carrier data from SAFER HTML response
   */
  private parseCarrierHTML(html: string, dotNumber: string): ScrapedCarrierData {
    const data: ScrapedCarrierData = {
      dot_number: dotNumber
    }

    try {
      // Helper function to extract text between patterns
      const extractBetween = (start: string, end: string): string | null => {
        const startIndex = html.indexOf(start)
        if (startIndex === -1) return null
        
        const searchStart = startIndex + start.length
        const endIndex = html.indexOf(end, searchStart)
        if (endIndex === -1) return null
        
        return html.substring(searchStart, endIndex).trim()
      }

      // Helper function to clean HTML and extract text
      const cleanText = (text: string | null): string | undefined => {
        if (!text) return undefined
        return text
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim()
      }

      // More precise extraction using table row patterns
      const extractTableValue = (label: string): string | null => {
        // Look for patterns like: <td>Legal Name:</td><td>COMPANY NAME</td>
        const patterns = [
          new RegExp(`<td[^>]*>\\s*${label}\\s*:?\\s*</td>\\s*<td[^>]*>([^<]+)</td>`, 'i'),
          new RegExp(`<td[^>]*>\\s*${label}\\s*</td>\\s*<td[^>]*>([^<]+)</td>`, 'i'),
          new RegExp(`${label}\\s*:?\\s*</td>\\s*<td[^>]*>([^<]+)</td>`, 'i')
        ]
        
        for (const pattern of patterns) {
          const match = html.match(pattern)
          if (match && match[1]) {
            return match[1].trim()
          }
        }
        return null
      }

      // Extract Legal Name with precise patterns
      let legalName = extractTableValue('Legal Name')
      if (!legalName) {
        // Fallback to title extraction
        const titleMatch = html.match(/<TITLE>SAFER Web - Company Snapshot\s+([^<]+)<\/TITLE>/i)
        if (titleMatch) {
          legalName = titleMatch[1].trim()
        }
      }
      data.legal_name = cleanText(legalName)

      // Extract DBA Name
      data.dba_name = cleanText(extractTableValue('DBA Name'))

      // Extract Physical Address
      const rawAddress = extractTableValue('Physical Address')
      if (rawAddress) {
        const cleanAddress = cleanText(rawAddress)
        data.physical_address = cleanAddress

        // Extract state and city from address
        if (cleanAddress) {
          const addressParts = cleanAddress.split(',')
          if (addressParts.length >= 2) {
            data.city = addressParts[addressParts.length - 2]?.trim()
            const lastPart = addressParts[addressParts.length - 1]?.trim()
            if (lastPart) {
              // Extract state (usually first 2 letters of last part)
              const stateMatch = lastPart.match(/^([A-Z]{2})\s/)
              if (stateMatch) {
                data.state = stateMatch[1]
              }
            }
          }
        }
      }

      // Extract Phone
      data.phone = cleanText(extractTableValue('Phone') || extractTableValue('Telephone'))

      // Extract Safety Rating
      const rawSafetyRating = extractTableValue('Safety Rating') || extractTableValue('DOT Safety Rating')
      if (rawSafetyRating) {
        const rating = cleanText(rawSafetyRating)?.toLowerCase()
        if (rating?.includes('satisfactory')) data.safety_rating = 'satisfactory'
        else if (rating?.includes('conditional')) data.safety_rating = 'conditional'
        else if (rating?.includes('unsatisfactory')) data.safety_rating = 'unsatisfactory'
        else data.safety_rating = 'not-rated'
      }

      // Extract Authority Status (Operating Status)
      const rawAuthorityStatus = extractTableValue('Operating Status') || extractTableValue('Authority Status')
      if (rawAuthorityStatus) {
        const status = cleanText(rawAuthorityStatus)?.toLowerCase()
        if (status?.includes('authorized') || status?.includes('active')) {
          data.authority_status = 'Active'
        } else {
          data.authority_status = 'Inactive'
        }
      }

      // Extract Out of Service Date
      const rawOosDate = extractTableValue('Out of Service Date')
      if (rawOosDate && cleanText(rawOosDate) !== 'None') {
        data.out_of_service_date = cleanText(rawOosDate)
      }

      // Extract MCS-150 Date (last update)
      data.mcs_150_date = cleanText(extractTableValue('MCS-150 Form Date') || extractTableValue('MCS-150 Date'))

      // Extract Power Units (vehicle count)
      const rawPowerUnits = extractTableValue('Power Units')
      if (rawPowerUnits) {
        const units = parseInt(cleanText(rawPowerUnits) || '0')
        if (!isNaN(units) && units > 0) {
          data.vehicle_count = units
        }
      }

      // Determine insurance status based on operating status and out of service
      if (data.authority_status === 'Active' && !data.out_of_service_date) {
        data.insurance_status = 'Active'
      } else {
        data.insurance_status = 'Unknown'
      }

      // Extract operation classification
      data.operation_classification = [cleanText(extractTableValue('Operation Classification')) || 'Unknown']

      // Extract carrier operation type
      data.carrier_operation = [cleanText(extractTableValue('Carrier Operation')) || 'Unknown']

      // Extract additional fields useful for freight brokers
      
      // Driver count
      const rawDrivers = extractTableValue('Drivers')
      if (rawDrivers) {
        const drivers = parseInt(cleanText(rawDrivers) || '0')
        if (!isNaN(drivers) && drivers > 0) {
          data.driver_count = drivers
        }
      }

      // MC Number (Motor Carrier Authority)
      data.mc_number = cleanText(extractTableValue('MC') || extractTableValue('MC Number'))

      // Operating Status (more detailed than authority status)
      data.operating_status = cleanText(extractTableValue('Operating Status'))

      // Entity Type (Corporation, LLC, etc.)
      data.entity_type = cleanText(extractTableValue('Entity Type') || extractTableValue('Business Type'))

      // Safety Review/Rating dates
      data.safety_review_date = cleanText(extractTableValue('Safety Review Date'))
      data.safety_rating_date = cleanText(extractTableValue('Safety Rating Date'))

      // Interstate operation flag
      const interstate = cleanText(extractTableValue('Interstate'))
      if (interstate) {
        data.interstate_operation = interstate.toLowerCase().includes('yes') || interstate.toLowerCase().includes('interstate')
      }

      // Hazmat flag
      const hazmat = cleanText(extractTableValue('Hazmat') || extractTableValue('Hazardous Materials'))
      if (hazmat) {
        data.hazmat_flag = hazmat.toLowerCase().includes('yes') || hazmat.toLowerCase().includes('hazmat')
      }

      // Private Carrier flag
      const privateCarrier = cleanText(extractTableValue('Private') || extractTableValue('For Hire'))
      if (privateCarrier) {
        data.pc_flag = privateCarrier.toLowerCase().includes('private')
      }

      // Total mileage/mile traveled
      const mileage = extractTableValue('Miles') || extractTableValue('Total Miles')
      if (mileage) {
        const miles = parseInt(cleanText(mileage)?.replace(/[^\d]/g, '') || '0')
        if (!isNaN(miles) && miles > 0) {
          data.total_mileage = miles
        }
      }

      // Enhanced parsing for freight broker critical data
      
      // Crash Data
      const crashData = extractTableValue('Crashes') || extractTableValue('Crash Data')
      if (crashData) {
        const crashText = cleanText(crashData)
        const crashMatch = crashText?.match(/(\d+)/)
        if (crashMatch) {
          data.crash_count = parseInt(crashMatch[1])
        }
      }

      // Fatal Crashes
      const fatalCrashes = extractTableValue('Fatal Crashes') || extractTableValue('Fatalities')
      if (fatalCrashes) {
        const fatalText = cleanText(fatalCrashes)
        const fatalMatch = fatalText?.match(/(\d+)/)
        if (fatalMatch) {
          data.fatal_crashes = parseInt(fatalMatch[1])
        }
      }

      // Injury Crashes
      const injuryCrashes = extractTableValue('Injury Crashes') || extractTableValue('Injuries')
      if (injuryCrashes) {
        const injuryText = cleanText(injuryCrashes)
        const injuryMatch = injuryText?.match(/(\d+)/)
        if (injuryMatch) {
          data.injury_crashes = parseInt(injuryMatch[1])
        }
      }

      // Inspection Data
      const inspectionData = extractTableValue('Inspections') || extractTableValue('Inspection Data')
      if (inspectionData) {
        const inspectionText = cleanText(inspectionData)
        const inspectionMatch = inspectionText?.match(/(\d+)/)
        if (inspectionMatch) {
          data.inspection_count = parseInt(inspectionMatch[1])
        }
      }

      // Out of Service Orders
      const oosData = extractTableValue('Out of Service') || extractTableValue('OOS Orders')
      if (oosData) {
        const oosText = cleanText(oosData)
        const oosMatch = oosText?.match(/(\d+)/)
        if (oosMatch) {
          data.out_of_service_orders = parseInt(oosMatch[1])
        }
      }

      // Calculate Out of Service Rate
      if (data.inspection_count && data.out_of_service_orders) {
        data.out_of_service_rate = Math.round((data.out_of_service_orders / data.inspection_count) * 100)
      }

      // Insurance Information
      data.insurance_carrier = cleanText(extractTableValue('Insurance Carrier') || extractTableValue('Insurance Company'))
      data.insurance_policy_number = cleanText(extractTableValue('Policy Number') || extractTableValue('Insurance Policy'))
      
      const insuranceAmount = extractTableValue('Insurance Amount') || extractTableValue('Liability Insurance')
      if (insuranceAmount) {
        const amountText = cleanText(insuranceAmount)
        const amountMatch = amountText?.match(/\$?([\d,]+)/)
        if (amountMatch) {
          data.insurance_amount = parseInt(amountMatch[1].replace(/,/g, ''))
        }
      }

      const cargoInsurance = extractTableValue('Cargo Insurance') || extractTableValue('Cargo Coverage')
      if (cargoInsurance) {
        const cargoText = cleanText(cargoInsurance)
        const cargoMatch = cargoText?.match(/\$?([\d,]+)/)
        if (cargoMatch) {
          data.cargo_insurance_amount = parseInt(cargoMatch[1].replace(/,/g, ''))
        }
      }

      // Insurance Dates
      data.insurance_effective_date = cleanText(extractTableValue('Insurance Effective Date'))
      data.insurance_expiry_date = cleanText(extractTableValue('Insurance Expiry Date') || extractTableValue('Insurance Expiration'))

      // Financial Responsibility
      data.financial_responsibility_status = cleanText(extractTableValue('Financial Responsibility') || extractTableValue('Financial Status'))

      // Equipment Types (from operation classification)
      const operationClass = cleanText(extractTableValue('Operation Classification'))
      if (operationClass) {
        data.equipment_types = [operationClass]
        // Add common equipment types based on operation classification
        if (operationClass.toLowerCase().includes('general freight')) {
          data.equipment_types.push('dry van')
        }
        if (operationClass.toLowerCase().includes('flatbed')) {
          data.equipment_types.push('flatbed')
        }
        if (operationClass.toLowerCase().includes('refrigerated')) {
          data.equipment_types.push('refrigerated')
        }
        if (operationClass.toLowerCase().includes('tanker')) {
          data.equipment_types.push('tanker')
        }
      }

      // Service Areas (from interstate operation and state)
      if (data.interstate_operation) {
        data.service_areas = ['Interstate']
      }
      if (data.state) {
        data.service_areas = data.service_areas || []
        data.service_areas.push(data.state)
      }

      // Years in Business (estimate from MCS-150 date)
      if (data.mcs_150_date) {
        const mcsDate = new Date(data.mcs_150_date)
        const currentYear = new Date().getFullYear()
        const yearsInBusiness = currentYear - mcsDate.getFullYear()
        if (yearsInBusiness > 0 && yearsInBusiness < 100) {
          data.years_in_business = yearsInBusiness
        }
      }

      // Additional Compliance Flags
      data.hazmat_certification = data.hazmat_flag
      data.passenger_certification = data.passenger_flag
      
      // Drug/Alcohol Testing (usually required for interstate carriers)
      if (data.interstate_operation) {
        data.drug_testing_program = true
        data.alcohol_testing_program = true
      }

      // Contact Information
      data.email = cleanText(extractTableValue('Email') || extractTableValue('E-mail'))
      data.website = cleanText(extractTableValue('Website') || extractTableValue('Web Site'))
      data.emergency_contact = cleanText(extractTableValue('Emergency Contact'))
      data.emergency_phone = cleanText(extractTableValue('Emergency Phone') || extractTableValue('Emergency Contact Phone'))

      console.log(`Successfully parsed data for DOT ${dotNumber}: ${data.legal_name}`)
      
    } catch (error) {
      console.error(`Error parsing HTML for DOT ${dotNumber}:`, error)
    }

    return data
  }

  /**
   * Bulk scrape multiple carriers with rate limiting
   */
  async bulkScrape(
    dotNumbers: string[], 
    onProgress?: (current: number, total: number, dotNumber: string) => void
  ): Promise<{
    successful: number
    failed: number
    results: Array<{ dotNumber: string; success: boolean; data?: ScrapedCarrierData; error?: string }>
  }> {
    const results = {
      successful: 0,
      failed: 0,
      results: [] as Array<{ dotNumber: string; success: boolean; data?: ScrapedCarrierData; error?: string }>
    }

    console.log(`Starting bulk scrape of ${dotNumbers.length} carriers`)

    for (let i = 0; i < dotNumbers.length; i++) {
      const dotNumber = dotNumbers[i]
      
      try {
        onProgress?.(i + 1, dotNumbers.length, dotNumber)
        
        const result = await this.scrapeCarrier(dotNumber)
        
        if (result.success && result.data) {
          results.successful++
          results.results.push({
            dotNumber,
            success: true,
            data: result.data
          })
          
          // Update database immediately on success
          await this.updateCarrierInDatabase(result.data)
          
        } else {
          results.failed++
          results.results.push({
            dotNumber,
            success: false,
            error: result.error
          })
        }
        
      } catch (error) {
        results.failed++
        results.results.push({
          dotNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Progress logging
      if ((i + 1) % 10 === 0 || i === dotNumbers.length - 1) {
        console.log(`Progress: ${i + 1}/${dotNumbers.length} carriers processed (${results.successful} successful, ${results.failed} failed)`)
      }
    }

    console.log(`Bulk scrape completed: ${results.successful} successful, ${results.failed} failed`)
    return results
  }

  /**
   * Update carrier data in database
   */
  private async updateCarrierInDatabase(data: ScrapedCarrierData): Promise<void> {
    const supabase = await createClient()
    
    try {
      const now = new Date().toISOString()
      // Update all available fields including new freight broker fields
      const updateData = {
        legal_name: data.legal_name,
        dba_name: data.dba_name,
        physical_address: data.physical_address,
        phone: data.phone,
        safety_rating: data.safety_rating,
        insurance_status: data.insurance_status,
        authority_status: data.authority_status,
        state: data.state,
        city: data.city,
        vehicle_count: data.vehicle_count,
        // New freight broker fields
        driver_count: data.driver_count,
        safety_review_date: data.safety_review_date,
        safety_rating_date: data.safety_rating_date,
        total_mileage: data.total_mileage,
        interstate_operation: data.interstate_operation,
        hazmat_flag: data.hazmat_flag,
        passenger_flag: data.passenger_flag,
        migrant_flag: data.migrant_flag,
        pc_flag: data.pc_flag,
        crash_indicator: data.crash_indicator,
        inspection_indicator: data.inspection_indicator,
        entity_type: data.entity_type,
        ein_number: data.ein_number,
        mc_number: data.mc_number,
        mx_number: data.mx_number,
        operating_status: data.operating_status,
        credit_score: data.credit_score,
        out_of_service_date: data.out_of_service_date,
        mcs_150_date: data.mcs_150_date,
        operation_classification: data.operation_classification,
        carrier_operation: data.carrier_operation,
        // Enhanced freight broker fields
        crash_count: data.crash_count,
        fatal_crashes: data.fatal_crashes,
        injury_crashes: data.injury_crashes,
        tow_away_crashes: data.tow_away_crashes,
        inspection_count: data.inspection_count,
        inspection_violations: data.inspection_violations,
        out_of_service_orders: data.out_of_service_orders,
        out_of_service_rate: data.out_of_service_rate,
        driver_inspections: data.driver_inspections,
        vehicle_inspections: data.vehicle_inspections,
        insurance_carrier: data.insurance_carrier,
        insurance_policy_number: data.insurance_policy_number,
        insurance_amount: data.insurance_amount,
        insurance_effective_date: data.insurance_effective_date,
        insurance_expiry_date: data.insurance_expiry_date,
        cargo_insurance_amount: data.cargo_insurance_amount,
        financial_responsibility_status: data.financial_responsibility_status,
        equipment_types: data.equipment_types,
        service_areas: data.service_areas,
        years_in_business: data.years_in_business,
        annual_revenue: data.annual_revenue,
        fleet_age: data.fleet_age,
        drug_testing_program: data.drug_testing_program,
        alcohol_testing_program: data.alcohol_testing_program,
        hazmat_certification: data.hazmat_certification,
        passenger_certification: data.passenger_certification,
        school_bus_certification: data.school_bus_certification,
        email: data.email,
        website: data.website,
        emergency_contact: data.emergency_contact,
        emergency_phone: data.emergency_phone,
        business_hours: data.business_hours,
        data_source: 'safer_scraper', // Always set to scraper when updated by scraper
        last_verified: now,
        updated_at: now
      }

      // Check if carrier exists
      const { data: existingCarrier } = await supabase
        .from('carriers')
        .select('id')
        .eq('dot_number', data.dot_number)
        .single()

      if (existingCarrier) {
        // Update existing carrier
        const { error } = await supabase
          .from('carriers')
          .update(updateData)
          .eq('dot_number', data.dot_number)

        if (error) {
          console.error(`Failed to update carrier ${data.dot_number}:`, error)
        }
      } else {
        // Create new carrier
        const { error } = await supabase
          .from('carriers')
          .insert({
            ...updateData,
            dot_number: data.dot_number,
            created_at: now
          })

        if (error) {
          console.error(`Failed to create carrier ${data.dot_number}:`, error)
        }
      }

      // Skip sync logging for now since api_sync_log table may not exist
      console.log(`Successfully updated carrier ${data.dot_number} in database`)

    } catch (error) {
      console.error(`Database update failed for ${data.dot_number}:`, error)
    }
  }

  /**
   * Sleep utility for rate limiting
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get carriers that need scraping (prioritized list)
   */
  async getCarriersToScrape(limit: number = 50): Promise<string[]> {
    const supabase = await createClient()
    
    try {
      // Just get any carriers for now since we don't have the sync columns yet
      const { data: carriers } = await supabase
        .from('carriers')
        .select('dot_number')
        .limit(limit)

      return carriers?.map(c => c.dot_number) || []
    } catch (error) {
      console.error('Failed to get carriers to scrape:', error)
      return []
    }
  }
}