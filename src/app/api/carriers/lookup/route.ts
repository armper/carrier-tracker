import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fmcsaService, mapFMCSAToCarrierData } from '@/lib/fmcsa-service'

/**
 * Carrier Lookup API with FMCSA Integration
 * 
 * This endpoint provides intelligent carrier lookup that:
 * 1. First checks our local database
 * 2. If not found or data is stale, queries FMCSA SAFER database
 * 3. Automatically updates our database with fresh FMCSA data
 * 4. Returns the most current carrier information available
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dotNumber = searchParams.get('dot')
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!dotNumber) {
      return NextResponse.json({ 
        error: 'DOT number is required',
        message: 'Please provide a DOT number as a query parameter: ?dot=123456'
      }, { status: 400 })
    }

    // Clean DOT number (remove non-digits)
    const cleanDotNumber = dotNumber.replace(/\D/g, '')
    
    if (!cleanDotNumber || cleanDotNumber.length < 6) {
      return NextResponse.json({ 
        error: 'Invalid DOT number format',
        message: 'DOT number must be at least 6 digits'
      }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Step 1: Check our local database first (unless force refresh)
    let carrierData = null
    let fromDatabase = false
    
    if (!forceRefresh) {
      const { data: existingCarrier } = await supabase
        .from('carriers')
        .select('*')
        .eq('dot_number', cleanDotNumber)
        .single()

      if (existingCarrier) {
        // Check if data is fresh (less than 7 days old for FMCSA data, 30 days for manual data)
        const lastUpdate = existingCarrier.last_fmcsa_update || existingCarrier.updated_at
        const hoursOld = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60) : Infinity
        const staleThreshold = existingCarrier.data_source === 'fmcsa' ? 168 : 720 // 7 days vs 30 days
        
        if (hoursOld < staleThreshold) {
          carrierData = existingCarrier
          fromDatabase = true
        }
      }
    }

    // Step 2: If no fresh local data, query FMCSA
    let fmcsaResponse = null
    if (!carrierData) {
      console.log(`Fetching carrier ${cleanDotNumber} from FMCSA...`)
      fmcsaResponse = await fmcsaService.lookupCarrier(cleanDotNumber)
      
      if (fmcsaResponse.success && fmcsaResponse.data) {
        // Step 3: Update our database with fresh FMCSA data
        const mappedData = mapFMCSAToCarrierData(fmcsaResponse.data)
        
        // Use service role for database updates
        const serviceSupabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: updatedCarrier, error: upsertError } = await serviceSupabase
          .from('carriers')
          .upsert({
            ...mappedData,
            updated_at: new Date().toISOString()
            // TODO: Add last_fmcsa_update after database migration
          }, {
            onConflict: 'dot_number'
          })
          .select()
          .single()

        if (upsertError) {
          console.error('Error updating carrier in database:', upsertError)
          // Continue with FMCSA data even if database update fails
          carrierData = {
            id: 'temp-' + cleanDotNumber,
            ...mappedData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        } else {
          carrierData = updatedCarrier
        }
      }
    }

    // Step 4: Return results
    if (carrierData) {
      return NextResponse.json({
        success: true,
        data: carrierData,
        source: fromDatabase ? 'database' : 'fmcsa',
        cached: fmcsaResponse?.cached || false,
        freshness: {
          lastUpdated: carrierData.last_fmcsa_update || carrierData.updated_at,
          source: carrierData.data_source,
          isFresh: !fromDatabase || (Date.now() - new Date(carrierData.updated_at).getTime()) < (24 * 60 * 60 * 1000)
        }
      })
    }

    // No data found anywhere
    return NextResponse.json({
      success: false,
      error: 'Carrier not found',
      message: `No carrier found with DOT number ${cleanDotNumber} in FMCSA database`,
      searchedSources: ['database', 'fmcsa'],
      dotNumber: cleanDotNumber
    }, { status: 404 })

  } catch (error) {
    console.error('Carrier lookup error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      service: 'carrier-lookup'
    }, { status: 500 })
  }
}

/**
 * POST endpoint for batch carrier lookups
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dotNumbers, forceRefresh = false } = body

    if (!Array.isArray(dotNumbers) || dotNumbers.length === 0) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'dotNumbers must be a non-empty array'
      }, { status: 400 })
    }

    if (dotNumbers.length > 10) {
      return NextResponse.json({
        error: 'Too many requests',
        message: 'Maximum 10 DOT numbers per batch request'
      }, { status: 400 })
    }

    const results = []
    
    // Process each DOT number
    for (const dotNumber of dotNumbers) {
      try {
        // Reuse the GET logic for individual lookups
        const searchParams = new URLSearchParams({
          dot: dotNumber.toString(),
          refresh: forceRefresh.toString()
        })
        
        const lookupUrl = new URL(`${request.url}?${searchParams}`)
        const lookupRequest = new NextRequest(lookupUrl, { method: 'GET' })
        
        const response = await GET(lookupRequest)
        const data = await response.json()
        
        results.push({
          dotNumber: dotNumber.toString(),
          ...data
        })
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        results.push({
          dotNumber: dotNumber.toString(),
          success: false,
          error: 'Lookup failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: dotNumbers.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    })

  } catch (error) {
    console.error('Batch carrier lookup error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 })
  }
}