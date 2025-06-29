import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET - Fetch expiring insurance carriers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('days') || '30')
    const userId = searchParams.get('user_id')
    
    const supabase = await createClient()
    
    // Get current user if not provided
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Call the PostgreSQL function to get expiring insurance
    const { data: expiringCarriers, error } = await supabase
      .rpc('get_expiring_insurance', { days_ahead: daysAhead })

    if (error) {
      console.error('Error fetching expiring insurance:', error)
      return NextResponse.json({ error: 'Failed to fetch expiring insurance' }, { status: 500 })
    }

    // Filter to only carriers that the user is tracking (saved carriers)
    if (userId) {
      const { data: savedCarriers, error: savedError } = await supabase
        .from('saved_carriers')
        .select('carrier_id')
        .eq('user_id', userId)

      if (savedError) {
        console.error('Error fetching saved carriers:', savedError)
        return NextResponse.json({ error: 'Failed to fetch saved carriers' }, { status: 500 })
      }

      const savedCarrierIds = savedCarriers.map(sc => sc.carrier_id)
      const filteredCarriers = expiringCarriers.filter((carrier: any) => 
        savedCarrierIds.includes(carrier.carrier_id)
      )

      return NextResponse.json({
        success: true,
        data: filteredCarriers,
        total: filteredCarriers.length,
        daysAhead
      })
    }

    return NextResponse.json({
      success: true,
      data: expiringCarriers,
      total: expiringCarriers.length,
      daysAhead
    })

  } catch (error) {
    console.error('Unexpected error in insurance alerts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update insurance alerts
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { carrier_id, expiry_date, reset_alerts } = body

    if (!carrier_id || !expiry_date) {
      return NextResponse.json({ error: 'carrier_id and expiry_date are required' }, { status: 400 })
    }

    // Delete existing alert if any
    await supabase
      .from('insurance_alerts')
      .delete()
      .eq('carrier_id', carrier_id)

    // Create new alert
    const { data: alert, error: insertError } = await supabase
      .from('insurance_alerts')
      .insert({
        carrier_id,
        expiry_date,
        alert_sent_30d: reset_alerts ? false : undefined,
        alert_sent_15d: reset_alerts ? false : undefined,
        alert_sent_7d: reset_alerts ? false : undefined,
        alert_sent_1d: reset_alerts ? false : undefined
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating insurance alert:', insertError)
      return NextResponse.json({ error: 'Failed to create insurance alert' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: alert,
      message: 'Insurance alert created successfully'
    })

  } catch (error) {
    console.error('Unexpected error in insurance alerts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}