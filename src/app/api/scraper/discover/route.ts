import { createClient } from '@/lib/supabase-server'
import { SAFERScraper } from '@/lib/safer-scraper'
import { NextRequest } from 'next/server'
import { isCarrierEntity as checkIsCarrierEntity } from '@/lib/carrier-filter'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check admin privileges
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return Response.json({ error: 'Admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    const { strategy = 'sequential', limit = 10, startDot } = body

    console.log(`Starting carrier discovery: ${strategy}, limit: ${limit}`)

    const scraper = new SAFERScraper()
    const newCarriers: Array<{dotNumber: string, success: boolean, data?: any, error?: string}> = []
    
    // Get existing DOT numbers to avoid duplicates
    const { data: existingCarriers } = await supabase
      .from('carriers')
      .select('dot_number')
    
    const existingDots = new Set(existingCarriers?.map(c => c.dot_number) || [])
    console.log(`Found ${existingDots.size} existing carriers to avoid`)

    let discovered = 0
    let attempts = 0
    const maxAttempts = limit * 10 // Try up to 10x the limit to find new carriers

    switch (strategy) {
      case 'sequential':
        // Try sequential DOT numbers starting from a point
        const startNumber = startDot || await getNextSequentialDot(supabase)
        console.log(`Starting sequential discovery from DOT ${startNumber}`)
        
        for (let i = 0; i < maxAttempts && discovered < limit; i++) {
          const dotNumber = (startNumber + i).toString()
          attempts++
          
          if (existingDots.has(dotNumber)) {
            continue // Skip existing carriers
          }

          console.log(`Attempting to discover DOT ${dotNumber}`)
          const result = await scraper.scrapeCarrier(dotNumber)
          
          if (result.success && result.data?.legal_name) {
            // Found a new carrier!
            const insertResult = await addNewCarrier(supabase, result.data)
            newCarriers.push({
              dotNumber,
              success: insertResult.success,
              data: result.data,
              error: insertResult.error
            })
            
            if (insertResult.success) {
              discovered++
              console.log(`✅ Discovered new carrier: ${result.data.legal_name} (DOT ${dotNumber})`)
            }
          } else if (result.error && result.error.includes('SAFER site down')) {
            // Surface site down error and abort
            return Response.json({
              success: false,
              siteDown: true,
              siteDownError: result.error,
              dotNumber,
              summary: 'SAFER website is currently unavailable. Please try again later.'
            }, { status: 503 })
          } else {
            // DOT number doesn't exist or failed to scrape
            newCarriers.push({
              dotNumber,
              success: false,
              error: result.error || 'No data found'
            })
          }

          // Rate limiting
          if (i < maxAttempts - 1) {
            await scraper.sleep(2000)
          }
        }
        break;

      case 'random':
        // Try random DOT numbers in realistic ranges
        console.log('Starting random discovery')
        
        for (let i = 0; i < maxAttempts && discovered < limit; i++) {
          // Generate realistic DOT number (most active carriers are in these ranges)
          const dotNumber = generateRandomDotNumber()
          attempts++
          
          if (existingDots.has(dotNumber)) {
            continue
          }

          console.log(`Attempting random DOT ${dotNumber}`)
          const result = await scraper.scrapeCarrier(dotNumber)
          
          if (result.success && result.data?.legal_name) {
            const insertResult = await addNewCarrier(supabase, result.data)
            newCarriers.push({
              dotNumber,
              success: insertResult.success,
              data: result.data,
              error: insertResult.error
            })
            
            if (insertResult.success) {
              discovered++
              console.log(`✅ Discovered new carrier: ${result.data.legal_name} (DOT ${dotNumber})`)
            }
          } else if (result.error && result.error.includes('SAFER site down')) {
            // Surface site down error and abort
            return Response.json({
              success: false,
              siteDown: true,
              siteDownError: result.error,
              dotNumber,
              summary: 'SAFER website is currently unavailable. Please try again later.'
            }, { status: 503 })
          } else {
            newCarriers.push({
              dotNumber,
              success: false,
              error: result.error || 'No data found'
            })
          }

          await scraper.sleep(2000)
        }
        break;

      default:
        return Response.json({ error: 'Invalid discovery strategy' }, { status: 400 })
    }

    console.log(`Discovery completed: ${discovered} new carriers found in ${attempts} attempts`)

    return Response.json({
      success: true,
      strategy,
      results: {
        discovered,
        attempts,
        successRate: Math.round((discovered / attempts) * 100),
        newCarriers: newCarriers.filter(c => c.success),
        failed: newCarriers.filter(c => !c.success).length
      },
      summary: `Discovered ${discovered} new carriers out of ${attempts} attempts`
    })

  } catch (error) {
    console.error('Carrier discovery error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getNextSequentialDot(supabase: any): Promise<number> {
  // Get the highest existing DOT number and start from there + 1000
  const { data } = await supabase
    .from('carriers')
    .select('dot_number')
    .order('dot_number', { ascending: false })
    .limit(1)

  if (data && data[0]) {
    const highestDot = parseInt(data[0].dot_number)
    return isNaN(highestDot) ? 3000000 : highestDot + 1000
  }
  
  return 3000000 // Default starting point for new DOT numbers
}

function generateRandomDotNumber(): string {
  // Most active carriers are in these ranges
  const ranges = [
    { min: 1000000, max: 4000000 }, // Established carriers
    { min: 2500000, max: 3500000 }, // Recent registrations
  ]
  
  const range = ranges[Math.floor(Math.random() * ranges.length)]
  const dotNumber = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
  return dotNumber.toString()
}

async function addNewCarrier(supabase: any, carrierData: any): Promise<{success: boolean, error?: string}> {
  try {
    // Check if this entity is actually a carrier
    if (!checkIsCarrierEntity(carrierData)) {
      console.log(`Skipping non-carrier entity ${carrierData.dot_number} (${carrierData.entity_type}): ${carrierData.legal_name}`)
      return { success: false, error: 'Non-carrier entity' }
    }

    // Use createClient to get service role access for inserting carriers
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const insertData = {
      dot_number: carrierData.dot_number,
      legal_name: carrierData.legal_name,
      dba_name: carrierData.dba_name,
      physical_address: carrierData.physical_address,
      phone: carrierData.phone,
      safety_rating: carrierData.safety_rating,
      insurance_status: carrierData.insurance_status,
      authority_status: carrierData.authority_status,
      state: carrierData.state,
      city: carrierData.city,
      vehicle_count: carrierData.vehicle_count,
      // New freight broker fields
      driver_count: carrierData.driver_count,
      safety_review_date: carrierData.safety_review_date,
      safety_rating_date: carrierData.safety_rating_date,
      total_mileage: carrierData.total_mileage,
      interstate_operation: carrierData.interstate_operation,
      hazmat_flag: carrierData.hazmat_flag,
      passenger_flag: carrierData.passenger_flag,
      migrant_flag: carrierData.migrant_flag,
      pc_flag: carrierData.pc_flag,
      crash_indicator: carrierData.crash_indicator,
      inspection_indicator: carrierData.inspection_indicator,
      entity_type: carrierData.entity_type,
      ein_number: carrierData.ein_number,
      mc_number: carrierData.mc_number,
      mx_number: carrierData.mx_number,
      operating_status: carrierData.operating_status,
      credit_score: carrierData.credit_score,
      out_of_service_date: carrierData.out_of_service_date,
      mcs_150_date: carrierData.mcs_150_date,
      operation_classification: carrierData.operation_classification,
      carrier_operation: carrierData.carrier_operation,
      data_source: 'safer_scraper',
      last_verified: new Date().toISOString(),
      api_sync_status: 'synced',
      created_at: new Date().toISOString()
    }

    console.log(`Inserting new carrier ${carrierData.dot_number} with data_source: ${insertData.data_source}`)

    const { data, error } = await serviceSupabase
      .from('carriers')
      .insert(insertData)
      .select()

    if (error) {
      console.error(`Failed to insert new carrier ${carrierData.dot_number}:`, error)
      return { success: false, error: error.message }
    }

    // Verify the data was inserted correctly
    if (data && data[0]) {
      console.log(`Successfully inserted carrier ${carrierData.dot_number} with data_source: ${data[0].data_source}`)
    }

    return { success: true }
  } catch (error) {
    console.error(`Exception in addNewCarrier for ${carrierData.dot_number}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database insert failed' 
    }
  }
}

/**
 * Check if an entity is a carrier based on entity type and other indicators
 */
function isCarrierEntity(carrierData: any): boolean {
  return checkIsCarrierEntity(carrierData)
}