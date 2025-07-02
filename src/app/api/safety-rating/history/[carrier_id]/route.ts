import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  carrier_id: string
}

// GET - Get safety rating history for a carrier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { carrier_id } = await params
    const { searchParams } = new URL(request.url)
    const monthsBack = parseInt(searchParams.get('months') || '24')
    
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get carrier basic info
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select(`
        id,
        dot_number,
        legal_name,
        safety_rating,
        safety_rating_last_changed,
        safety_rating_stability_score,
        safety_rating_change_count,
        safety_rating_trend
      `)
      .eq('id', carrier_id)
      .single()

    if (carrierError || !carrier) {
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 })
    }

    // Get safety rating history using database function
    const { data: history, error: historyError } = await supabase
      .rpc('get_safety_rating_history', { 
        carrier_uuid: carrier_id, 
        months_back: monthsBack 
      })

    if (historyError) {
      console.error('Error fetching safety rating history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Calculate risk score
    const { data: riskScore, error: riskError } = await supabase
      .rpc('get_safety_rating_risk_score', { carrier_uuid: carrier_id })

    if (riskError) {
      console.error('Error calculating risk score:', riskError)
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier: {
          ...carrier,
          risk_score: riskScore || null
        },
        history: history || [],
        total_changes: history?.length || 0,
        months_requested: monthsBack
      }
    })

  } catch (error) {
    console.error('Unexpected error in safety rating history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}