/**
 * SAFER Web Scraper
 * Free scraping service for DOT carrier data from safer.fmcsa.dot.gov
 * Respectful scraping with rate limiting and error handling
 */

import { createClient } from '@/lib/supabase-server'
import { isCarrierEntity } from './carrier-filter'
import * as cheerio from 'cheerio'

interface ScrapedCarrierData {
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
    console.log(`Scraping DOT ${dotNumber}, attempt 1/3`)
    
    try {
      const url = `https://safer.fmcsa.dot.gov/query.asp`
      const formData = new URLSearchParams({
        searchtype: 'ANY',
        query_type: 'queryCarrierSnapshot',
        query_param: 'USDOT',
        query_string: dotNumber
      })

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: formData.toString()
      })

      if (!response.ok) {
        console.log(`HTTP ${response.status} for DOT ${dotNumber}`)
        return {
          success: false,
          error: `HTTP ${response.status}`,
          httpStatus: response.status
        }
      }

      const html = await response.text()
      
      // Light debug logging for development
      if (process.env.NODE_ENV === 'development') {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) {
          console.log(`DOT ${dotNumber} - ${titleMatch[1]}`)
        }
      }

      // Check if this is actually a company snapshot page
      if (!html.includes('Company Snapshot')) {
        console.log(`DOT ${dotNumber} - Not a valid company snapshot page`)
        return {
          success: false,
          error: 'Not a valid company snapshot page'
        }
      }

      // Use regex to check for company data fields (case-insensitive, ignore whitespace)
      const hasLegalName = /legal\s*name/i.test(html)
      const hasDBAName = /dba\s*name/i.test(html)
      const hasPhysicalAddress = /physical\s*address/i.test(html)
      const hasEntityType = /entity\s*type/i.test(html)

      if (!hasLegalName && !hasDBAName && !hasPhysicalAddress && !hasEntityType) {
        // Check if this is an inactive record
        if (html.includes('RECORD INACTIVE') || html.includes('RECORD NOT FOUND')) {
          return {
            success: false,
            error: 'Carrier record inactive or not found'
          }
        }
        
        // Check if this is a search form page (no company data)
        if (html.includes('Search Criteria') && html.includes('Users can search by DOT Number')) {
          return {
            success: false,
            error: 'No company data found - DOT number may not exist'
          }
        }
        
        return {
          success: false,
          error: 'No company data fields found'
        }
      }

      const data = this.parseCarrierHTML(html, dotNumber)
      
      if (!data.legal_name || data.legal_name.length > 200) {
        console.log(`DOT ${dotNumber} - Invalid legal name extracted: ${data.legal_name}`)
        return {
          success: false,
          error: 'Could not extract valid company name'
        }
      }

      console.log(`Successfully parsed data for DOT ${dotNumber}: ${data.legal_name}`)
      return {
        success: true,
        data
      }

    } catch (error) {
      console.error(`Error scraping DOT ${dotNumber}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
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
      // Load HTML into Cheerio for DOM parsing
      const $ = cheerio.load(html)

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

      // Helper function to extract table values using DOM selectors - enhanced for SAFER structure
      const extractTableValue = (label: string): string | null => {
        // SAFER uses a specific structure: <TH>Label:</TH><TD>Value</TD>
        
        // Approach 1: Look for TH elements containing the label with colon
        let labelCell = $(`th:contains("${label}:")`)
        if (labelCell.length === 0) {
          labelCell = $(`th:contains("${label}")`)
        }
        
        if (labelCell.length > 0) {
          // Get the next TD in the same row
          const dataCell = labelCell.next('td')
          if (dataCell.length > 0) {
            let text = dataCell.text().trim()
            
            // Clean up common SAFER artifacts
            text = text
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            return text || null
          }
        }
        
        // Approach 2: Look for TD elements containing the label as a fallback
        const row = $(`td:contains("${label}:")`)
        if (row.length > 0) {
          const dataCell = row.next('td')
          if (dataCell.length > 0) {
            let text = dataCell.text().trim()
            text = text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
            return text || null
          }
        }
        
        return null
      }

      // Specialized extraction for complex fields with checkboxes
      const extractCheckboxField = (label: string): string[] => {
        const labelElement = $(`th:contains("${label}"), td:contains("${label}")`).first()
        if (labelElement.length === 0) return []
        
        const section = labelElement.closest('tr').nextAll('tr').filter(function() {
          return $(this).find('td').length > 0 && $(this).find('td').first().text().trim() !== ''
        }).first()
        
        if (section.length === 0) return []
        
        const checkedItems: string[] = []
        section.find('td').each(function() {
          const text = $(this).text().trim()
          if (text === 'X') {
            const nextCell = $(this).next('td')
            if (nextCell.length > 0) {
              const item = nextCell.text().trim()
              if (item && item.length > 0) {
                checkedItems.push(item)
              }
            }
          }
        })
        
        return checkedItems
      }

      // Extract Legal Name with better fallbacks
      let legalName = extractTableValue('Legal Name')
      
      // Minimal debug logging
      
      // Validate the extracted legal name
      if (legalName && (legalName.length > 200 || 
          legalName.includes('Query Result') || 
          legalName.includes('SAFER Table Layout') ||
          legalName.includes('Information') ||
          legalName.includes('USDOT Number') ||
          legalName.includes('MC/MX Number') ||
          legalName.includes('Enter Value') ||
          legalName.includes('Search Criteria'))) {
        console.log(`DOT ${dotNumber} - Invalid legal name detected, clearing:`, legalName)
        legalName = null
      }
      
      if (!legalName) {
        // Fallback 1: Try title extraction
        const title = $('title').text()
        const titleMatch = title.match(/SAFER Web - Company Snapshot\s+(.+)/i)
        if (titleMatch) {
          legalName = titleMatch[1].trim()
        }
      }
      
      // Fallback 2: If still no name, try to find any company name pattern
      if (!legalName || legalName.length > 200) {
        // Look for any text that looks like a company name
        const allText = $('body').text()
        const companyNameMatch = allText.match(/([A-Z][A-Z\s&.,'-]{3,50})/g)
        if (companyNameMatch) {
          // Filter out common SAFER page text
          const filteredNames = companyNameMatch.filter(name => 
            name.length > 3 && 
            name.length < 100 &&
            !name.includes('SAFER') &&
            !name.includes('USDOT') &&
            !name.includes('MC/MX') &&
            !name.includes('Query Result') &&
            !name.includes('Information') &&
            !name.includes('Table Layout') &&
            !name.includes('Enter Value') &&
            !name.includes('DOT Number') &&
            !name.includes('Number') &&
            !name.includes('Name') &&
            !name.includes('Search Criteria') &&
            !name.includes('Company Snapshot')
          )
          
          if (filteredNames.length > 0) {
            legalName = filteredNames[0].trim()
          }
        }
      }
      
      // Final validation before using fallback
      if (legalName && (legalName.length > 200 || 
          legalName.includes('Query Result') || 
          legalName.includes('SAFER Table Layout') ||
          legalName.includes('Information') ||
          legalName.includes('USDOT Number') ||
          legalName.includes('MC/MX Number') ||
          legalName.includes('Enter Value') ||
          legalName.includes('Search Criteria'))) {
        console.log(`DOT ${dotNumber} - Final validation failed, using fallback name`)
        legalName = `Carrier ${dotNumber}`
      }
      
      // Final fallback: Use DOT number if no name found
      if (!legalName || legalName.length > 200) {
        legalName = `Carrier ${dotNumber}`
      }
      
      data.legal_name = cleanText(legalName)

      // Extract other fields with correct SAFER labels
      data.dba_name = cleanText(extractTableValue('DBA Name'))
      data.physical_address = cleanText(extractTableValue('Physical Address'))
      data.entity_type = cleanText(extractTableValue('Entity Type'))
      data.operating_status = cleanText(extractTableValue('Operating Status'))
      data.phone = cleanText(extractTableValue('Phone'))
      
      // Try alternative labels for Operating Status
      if (!data.operating_status) {
        data.operating_status = cleanText(extractTableValue('Authority Status'))
      }
      
      // Use specialized extraction for complex checkbox fields
      const carrierOperations = extractCheckboxField('Carrier Operation')
      data.carrier_operation = carrierOperations.length > 0 ? carrierOperations : undefined
      
      const cargoTypes = extractCheckboxField('Cargo Carried')
      data.equipment_types = cargoTypes.length > 0 ? cargoTypes : undefined

      // Additional validation for complex fields
      if (data.carrier_operation && Array.isArray(data.carrier_operation)) {
        // Filter out any HTML artifacts
        data.carrier_operation = data.carrier_operation.filter((op: string) => 
          op && op.length < 50 && !op.includes('SAFER Layout') && !op.includes('Query Result')
        )
      }
      
      if (data.equipment_types && Array.isArray(data.equipment_types)) {
        // Filter out any HTML artifacts
        data.equipment_types = data.equipment_types.filter((cargo: string) => 
          cargo && cargo.length < 50 && !cargo.includes('SAFER Layout') && !cargo.includes('Query Result')
        )
      }

      // Extract Phone
      data.phone = cleanText(extractTableValue('Phone'))

      // Extract Safety Rating
      const rawSafetyRating = extractTableValue('Safety Rating') || extractTableValue('DOT Safety Rating')
      if (rawSafetyRating) {
        const rating = cleanText(rawSafetyRating)?.toLowerCase()
        if (rating?.includes('satisfactory')) data.safety_rating = 'satisfactory'
        else if (rating?.includes('conditional')) data.safety_rating = 'conditional'
        else if (rating?.includes('unsatisfactory')) data.safety_rating = 'unsatisfactory'
        else data.safety_rating = 'not-rated'
      }

      // Extract Authority Status (Operating Authority Status) - improved parsing
      const rawAuthorityStatus = extractTableValue('Operating Authority Status') || extractTableValue('Operating Status') || extractTableValue('Authority Status')
      if (rawAuthorityStatus) {
        const status = cleanText(rawAuthorityStatus)?.toLowerCase()
        if (status?.includes('authorized') || status?.includes('active')) {
          data.authority_status = 'Active'
        } else if (status?.includes('not authorized')) {
          data.authority_status = 'Inactive'
        } else {
          data.authority_status = 'Unknown'
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
        const units = parseInt(cleanText(rawPowerUnits)?.replace(/,/g, '') || '0')
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
        const drivers = parseInt(cleanText(rawDrivers)?.replace(/,/g, '') || '0')
        if (!isNaN(drivers) && drivers > 0) {
          data.driver_count = drivers
        }
      }

      // MC Number (Motor Carrier Authority) - try different SAFER labels
      const mcNumbers = extractTableValue('MC/MX/FF Number(s)') || 
                       extractTableValue('MC/MX Number(s)') ||
                       extractTableValue('MC Number') ||
                       extractTableValue('MC')
      if (mcNumbers) {
        const mcText = cleanText(mcNumbers)
        // Only accept if it looks like an actual MC number (contains MC- or just numbers)
        if (mcText && (mcText.includes('MC-') || /^\d+$/.test(mcText))) {
          const mcMatch = mcText.match(/MC-(\d+)/)
          if (mcMatch) {
            data.mc_number = `MC-${mcMatch[1]}`
          } else if (/^\d+$/.test(mcText)) {
            data.mc_number = `MC-${mcText}`
          } else {
            data.mc_number = mcText
          }
        }
      }

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

      return data

    } catch (error) {
      console.error(`Error parsing HTML for DOT ${dotNumber}:`, error)
      return data
    }
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
    siteDown?: boolean
    siteDownError?: string
  }> {
    const results = {
      successful: 0,
      failed: 0,
      results: [] as Array<{ dotNumber: string; success: boolean; data?: ScrapedCarrierData; error?: string }>,
      siteDown: false,
      siteDownError: undefined as string | undefined
    }

    console.log(`Starting bulk scrape of ${dotNumbers.length} carriers`)

    for (let i = 0; i < dotNumbers.length; i++) {
      const dotNumber = dotNumbers[i]
      
      try {
        onProgress?.(i + 1, dotNumbers.length, dotNumber)
        
        const result = await this.scrapeCarrier(dotNumber)
        
        // If SAFER site is down, abort batch
        if (result.error && result.error.includes('SAFER site down')) {
          results.siteDown = true
          results.siteDownError = result.error
          console.error('SAFER site appears to be down. Aborting bulk scrape.')
          break
        }

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
   * Check if an entity is a carrier based on entity type and other indicators
   */
  private isCarrierEntity(data: ScrapedCarrierData): boolean {
    return isCarrierEntity(data)
  }

  /**
   * Update carrier data in database
   */
  private async updateCarrierInDatabase(data: ScrapedCarrierData): Promise<void> {
    const supabase = await createClient()
    
    try {
      // Check if this entity is actually a carrier
      if (!this.isCarrierEntity(data)) {
        console.log(`Skipping non-carrier entity ${data.dot_number} (${data.entity_type}): ${data.legal_name}`)
        return
      }

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