import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendInsuranceNotificationEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { carrierId, notificationType } = body

    if (!carrierId || !notificationType) {
      return NextResponse.json({ 
        error: 'carrierId and notificationType are required' 
      }, { status: 400 })
    }

    // Get carrier information
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('dot_number, legal_name')
      .eq('id', carrierId)
      .single()

    if (carrierError || !carrier) {
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 })
    }

    // Get users who have this carrier saved and want insurance notifications
    const { data: savedCarriers, error: savedError } = await supabase
      .from('saved_carriers')
      .select(`
        user_id,
        profiles!inner(email, display_name),
        insurance_notification_preferences!inner(
          insurance_updates,
          insurance_expired,
          insurance_disputed
        )
      `)
      .eq('carrier_id', carrierId)

    if (savedError) {
      console.error('Error fetching saved carriers:', savedError)
      return NextResponse.json({ error: 'Failed to fetch notification recipients' }, { status: 500 })
    }

    // Get insurance data for email content
    const { data: insuranceData, error: insuranceError } = await supabase.rpc('get_carrier_insurance_status', {
      carrier_uuid: carrierId
    })

    const insurance = insuranceData?.[0]

    // Send notifications to eligible users
    const notifications = []
    for (const saved of savedCarriers || []) {
      const prefs = saved.insurance_notification_preferences
      let shouldNotify = false

      switch (notificationType) {
        case 'insurance_updated':
          shouldNotify = prefs?.insurance_updates
          break
        case 'insurance_expired':
          shouldNotify = prefs?.insurance_expired
          break
        case 'insurance_disputed':
          shouldNotify = prefs?.insurance_disputed
          break
      }

      if (shouldNotify && saved.profiles) {
        const emailData = {
          recipient_email: saved.profiles.email,
          recipient_name: saved.profiles.display_name || 'User',
          carrier_name: carrier.legal_name,
          carrier_dot: carrier.dot_number,
          notification_type: notificationType,
          insurance_carrier: insurance?.insurance_carrier,
          expiry_date: insurance?.expiry_date,
          updated_by: insurance?.updated_by_email,
          notes: insurance?.notes,
          document_url: insurance?.document_url
        }

        try {
          const result = await sendInsuranceNotificationEmail(emailData)
          notifications.push({
            recipient: saved.profiles.email,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          })

          // Log notification in database
          await supabase
            .from('insurance_notifications')
            .insert({
              user_id: saved.user_id,
              carrier_id: carrierId,
              notification_type: notificationType,
              sent_at: new Date().toISOString(),
              email_sent: result.success
            })

        } catch (error) {
          console.error(`Failed to send notification to ${saved.profiles.email}:`, error)
          notifications.push({
            recipient: saved.profiles.email,
            success: false,
            error: 'Failed to send email'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      notifications
    })

  } catch (error) {
    console.error('Insurance notification error:', error)
    return NextResponse.json({ 
      error: 'Failed to send notifications' 
    }, { status: 500 })
  }
}