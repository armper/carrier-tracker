import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendCarrierAlertEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you can add API key verification here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get all active alerts with user and carrier info
    const { data: alerts, error: alertsError } = await supabase
      .from('monitoring_alerts')
      .select(`
        id,
        user_id,
        alert_type,
        carriers (
          id,
          dot_number,
          legal_name,
          safety_rating,
          insurance_status,
          authority_status,
          carb_compliance
        ),
        profiles (
          email,
          full_name
        )
      `)
      .eq('is_active', true)

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ message: 'No active alerts found' })
    }

    // For now, we'll simulate carrier changes since we don't have real-time data
    // In a real implementation, you would:
    // 1. Store historical snapshots of carrier data
    // 2. Compare current data with previous snapshots
    // 3. Detect actual changes

    const simulatedChanges = [
      {
        carrierId: 'test-id',
        carrierName: 'Test Carrier',
        dotNumber: '123456',
        field: 'Safety Rating',
        oldValue: 'Conditional',
        newValue: 'Satisfactory',
        changeDate: new Date().toLocaleDateString()
      }
    ]

    // Group alerts by user and send emails  
    const userAlerts = new Map()
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alerts.forEach((alert: any) => {
      const profile = Array.isArray(alert.profiles) ? alert.profiles[0] : alert.profiles
      const carrier = Array.isArray(alert.carriers) ? alert.carriers[0] : alert.carriers
      
      if (!profile?.email) return
      
      const userId = alert.user_id
      if (!userAlerts.has(userId)) {
        userAlerts.set(userId, {
          userEmail: profile.email,
          userName: profile.full_name || profile.email.split('@')[0],
          changes: []
        })
      }
      
      // Check if this alert type matches any simulated changes
      const relevantChanges = simulatedChanges.filter(change => 
        change.carrierId === carrier?.id
      )
      
      if (relevantChanges.length > 0) {
        userAlerts.get(userId).changes.push(...relevantChanges)
      }
    })

    const emailResults = []
    
    for (const [userId, alertData] of userAlerts.entries()) {
      if (alertData.changes.length > 0) {
        const result = await sendCarrierAlertEmail(alertData)
        emailResults.push({
          userId,
          email: alertData.userEmail,
          success: result.success,
          error: result.error
        })
      }
    }

    return NextResponse.json({
      message: 'Alert check completed',
      alertsChecked: alerts.length,
      emailsSent: emailResults.filter(r => r.success).length,
      results: emailResults
    })

  } catch (error) {
    console.error('Alert processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// For testing the email system
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const testEmail = url.searchParams.get('email')
    
    if (!testEmail) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    // Send a test email
    const testData = {
      userEmail: testEmail,
      userName: 'Test User',
      changes: [
        {
          carrierName: 'Test Carrier LLC',
          dotNumber: '123456',
          field: 'Safety Rating',
          oldValue: 'Conditional',
          newValue: 'Satisfactory',
          changeDate: new Date().toLocaleDateString()
        }
      ]
    }

    const result = await sendCarrierAlertEmail(testData)
    
    return NextResponse.json({
      message: 'Test email sent',
      success: result.success,
      error: result.error
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}