import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST - Process pending insurance alerts (for scheduled tasks/cron jobs)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Simple auth check - require admin or API key
    const authHeader = request.headers.get('authorization')
    const apiKey = request.headers.get('x-api-key')
    
    // For demo purposes, allow admin users or specific API key
    const expectedApiKey = process.env.INSURANCE_ALERT_API_KEY || 'demo-key-123'
    
    if (apiKey !== expectedApiKey) {
      // Check if user is admin
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
        return NextResponse.json({ error: 'Admin access or API key required' }, { status: 403 })
      }
    }

    const currentDate = new Date()
    const currentDateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Get all insurance alerts that haven't been fully processed
    const { data: pendingAlerts, error: alertsError } = await supabase
      .from('insurance_alerts')
      .select(`
        id,
        carrier_id,
        expiry_date,
        alert_sent_30d,
        alert_sent_15d,
        alert_sent_7d,
        alert_sent_1d,
        last_alert_sent,
        carriers (
          legal_name,
          dot_number
        )
      `)
      .or('alert_sent_30d.eq.false,alert_sent_15d.eq.false,alert_sent_7d.eq.false,alert_sent_1d.eq.false')

    if (alertsError) {
      console.error('Error fetching pending alerts:', alertsError)
      return NextResponse.json({ error: 'Failed to fetch pending alerts' }, { status: 500 })
    }

    const processedAlerts: Array<{
      alert_id: string
      carrier_name: string
      dot_number: string
      alert_type: string
      days_until_expiry: number
      action: string
    }> = []

    for (const alert of pendingAlerts) {
      const expiryDate = new Date(alert.expiry_date)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      
      let shouldSendAlert = false
      let alertType = ''
      let updateData: Record<string, any> = { last_alert_sent: currentDate.toISOString() }

      // Check which alerts to send based on days until expiry
      if (daysUntilExpiry <= 1 && !alert.alert_sent_1d) {
        shouldSendAlert = true
        alertType = '1-day'
        updateData.alert_sent_1d = true
      } else if (daysUntilExpiry <= 7 && !alert.alert_sent_7d) {
        shouldSendAlert = true
        alertType = '7-day'
        updateData.alert_sent_7d = true
      } else if (daysUntilExpiry <= 15 && !alert.alert_sent_15d) {
        shouldSendAlert = true
        alertType = '15-day'
        updateData.alert_sent_15d = true
      } else if (daysUntilExpiry <= 30 && !alert.alert_sent_30d) {
        shouldSendAlert = true
        alertType = '30-day'
        updateData.alert_sent_30d = true
      }

      if (shouldSendAlert) {
        // Update the alert record
        const { error: updateError } = await supabase
          .from('insurance_alerts')
          .update(updateData)
          .eq('id', alert.id)

        if (updateError) {
          console.error('Error updating alert:', updateError)
          continue
        }

        // Here you would typically send email/SMS notifications
        // For now, we'll just log and track the alert
        console.log(`Alert sent: ${alertType} alert for ${alert.carriers?.legal_name} (DOT: ${alert.carriers?.dot_number}), expires in ${daysUntilExpiry} days`)

        // Get users who have this carrier saved and want notifications
        const { data: usersToNotify, error: usersError } = await supabase
          .from('saved_carriers')
          .select(`
            user_id,
            profiles (
              email,
              user_insurance_preferences (
                email_notifications,
                dashboard_notifications,
                enable_30d_alerts,
                enable_15d_alerts,
                enable_7d_alerts,
                enable_1d_alerts
              )
            )
          `)
          .eq('carrier_id', alert.carrier_id)

        if (!usersError && usersToNotify) {
          for (const userRecord of usersToNotify) {
            const prefs = userRecord.profiles?.user_insurance_preferences?.[0]
            let shouldNotifyUser = true

            // Check user preferences for this alert type
            if (alertType === '30-day' && !prefs?.enable_30d_alerts) shouldNotifyUser = false
            if (alertType === '15-day' && !prefs?.enable_15d_alerts) shouldNotifyUser = false
            if (alertType === '7-day' && !prefs?.enable_7d_alerts) shouldNotifyUser = false
            if (alertType === '1-day' && !prefs?.enable_1d_alerts) shouldNotifyUser = false

            if (shouldNotifyUser) {
              // TODO: Send actual notification (email/dashboard notification)
              console.log(`Would notify user ${userRecord.profiles?.email} about ${alertType} insurance expiry for ${alert.carriers?.legal_name}`)
            }
          }
        }

        processedAlerts.push({
          alert_id: alert.id,
          carrier_name: alert.carriers?.legal_name || 'Unknown',
          dot_number: alert.carriers?.dot_number || 'Unknown',
          alert_type: alertType,
          days_until_expiry: daysUntilExpiry,
          action: 'Alert sent'
        })
      }
    }

    // Clean up expired alerts (insurance expired more than 30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { error: cleanupError } = await supabase
      .from('insurance_alerts')
      .delete()
      .lt('expiry_date', thirtyDaysAgo.toISOString().split('T')[0])

    if (cleanupError) {
      console.error('Error cleaning up old alerts:', cleanupError)
    }

    return NextResponse.json({
      success: true,
      message: 'Insurance alerts processed successfully',
      data: {
        processed_alerts: processedAlerts,
        total_processed: processedAlerts.length,
        processed_at: currentDate.toISOString()
      }
    })

  } catch (error) {
    console.error('Unexpected error in process insurance alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get status of alert processing (for monitoring)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get summary statistics
    const { data: totalAlerts, error: totalError } = await supabase
      .from('insurance_alerts')
      .select('id', { count: 'exact' })

    const { data: pendingAlerts, error: pendingError } = await supabase
      .from('insurance_alerts')
      .select('id', { count: 'exact' })
      .or('alert_sent_30d.eq.false,alert_sent_15d.eq.false,alert_sent_7d.eq.false,alert_sent_1d.eq.false')

    const { data: criticalAlerts, error: criticalError } = await supabase
      .from('insurance_alerts')
      .select('id', { count: 'exact' })
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    return NextResponse.json({
      success: true,
      data: {
        total_alerts: totalAlerts?.length || 0,
        pending_alerts: pendingAlerts?.length || 0,
        critical_alerts: criticalAlerts?.length || 0,
        checked_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Unexpected error in alert status check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}