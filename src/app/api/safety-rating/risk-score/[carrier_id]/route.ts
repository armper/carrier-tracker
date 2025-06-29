import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  carrier_id: string
}

// GET - Get safety rating risk score for a carrier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { carrier_id } = await params
    const supabase = await createClient()

    // Get carrier basic info and risk score
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

    // Calculate risk score using database function
    const { data: riskScore, error: riskError } = await supabase
      .rpc('get_safety_rating_risk_score', { carrier_uuid: carrier_id })

    if (riskError) {
      console.error('Error calculating safety rating risk score:', riskError)
      return NextResponse.json({ error: 'Failed to calculate risk score' }, { status: 500 })
    }

    // Get recent changes count for additional context
    const { data: recentChanges, error: changesError } = await supabase
      .from('safety_rating_history')
      .select('id', { count: 'exact' })
      .eq('carrier_id', carrier_id)
      .gte('change_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

    // Calculate additional context
    let stabilityContext = 'unknown'
    let riskLevel = 'medium'
    
    if (carrier.safety_rating_stability_score !== null) {
      if (carrier.safety_rating_stability_score >= 80) {
        stabilityContext = 'very_stable'
      } else if (carrier.safety_rating_stability_score >= 60) {
        stabilityContext = 'stable'
      } else if (carrier.safety_rating_stability_score >= 40) {
        stabilityContext = 'somewhat_unstable'
      } else {
        stabilityContext = 'unstable'
      }
    }

    if (riskScore >= 80) {
      riskLevel = 'low'
    } else if (riskScore >= 60) {
      riskLevel = 'medium'
    } else if (riskScore >= 40) {
      riskLevel = 'high'
    } else {
      riskLevel = 'critical'
    }

    // Calculate days since last change
    let daysSinceLastChange = null
    if (carrier.safety_rating_last_changed) {
      daysSinceLastChange = Math.floor(
        (new Date().getTime() - new Date(carrier.safety_rating_last_changed).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier_id,
        dot_number: carrier.dot_number,
        legal_name: carrier.legal_name,
        current_rating: carrier.safety_rating,
        risk_score: riskScore,
        risk_level: riskLevel,
        stability_score: carrier.safety_rating_stability_score,
        stability_context: stabilityContext,
        trend: carrier.safety_rating_trend,
        total_changes: carrier.safety_rating_change_count || 0,
        recent_changes_12mo: recentChanges?.length || 0,
        last_changed: carrier.safety_rating_last_changed,
        days_since_last_change: daysSinceLastChange
      }
    })

  } catch (error) {
    console.error('Unexpected error in safety rating risk score API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}