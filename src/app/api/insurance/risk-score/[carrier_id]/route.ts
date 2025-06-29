import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  carrier_id: string
}

// GET - Get insurance risk score for a carrier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const { carrier_id } = await params
    const supabase = await createClient()

    // Call the PostgreSQL function to get insurance risk score
    const { data: riskScore, error } = await supabase
      .rpc('get_insurance_risk_score', { carrier_uuid: carrier_id })

    if (error) {
      console.error('Error fetching insurance risk score:', error)
      return NextResponse.json({ error: 'Failed to fetch insurance risk score' }, { status: 500 })
    }

    // Get carrier basic info for context
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('legal_name, dot_number, insurance_expiry_date, insurance_last_verified')
      .eq('id', carrier_id)
      .single()

    if (carrierError) {
      console.error('Error fetching carrier info:', carrierError)
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 })
    }

    // Calculate additional context
    let daysUntilExpiry = null
    let status = 'unknown'
    
    if (carrier.insurance_expiry_date) {
      const expiryDate = new Date(carrier.insurance_expiry_date)
      const today = new Date()
      daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilExpiry < 0) {
        status = 'expired'
      } else if (daysUntilExpiry <= 7) {
        status = 'critical'
      } else if (daysUntilExpiry <= 15) {
        status = 'high_risk'
      } else if (daysUntilExpiry <= 30) {
        status = 'medium_risk'
      } else {
        status = 'low_risk'
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier_id,
        legal_name: carrier.legal_name,
        dot_number: carrier.dot_number,
        risk_score: riskScore,
        insurance_expiry_date: carrier.insurance_expiry_date,
        days_until_expiry: daysUntilExpiry,
        status,
        last_verified: carrier.insurance_last_verified
      }
    })

  } catch (error) {
    console.error('Unexpected error in insurance risk score API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}