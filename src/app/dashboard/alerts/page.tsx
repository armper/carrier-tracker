import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AlertsClient from './alerts-client'

export default async function AlertsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's alerts
  const { data: alerts } = await supabase
    .from('monitoring_alerts')
    .select(`
      id,
      alert_type,
      is_active,
      created_at,
      carriers (
        id,
        dot_number,
        legal_name
      )
    `)
    .eq('user_id', user.id)

  // Fetch user's saved carriers for creating new alerts
  const { data: savedCarriers } = await supabase
    .from('saved_carriers')
    .select(`
      carriers (
        id,
        dot_number,
        legal_name
      )
    `)
    .eq('user_id', user.id)

  // Transform alerts data to match client interface
  const transformedAlerts = (alerts || []).map(alert => ({
    ...alert,
    carriers: Array.isArray(alert.carriers) ? alert.carriers[0] : alert.carriers
  }))

  // Transform savedCarriers data to match client interface
  const transformedSavedCarriers = (savedCarriers || []).map(saved => ({
    ...saved,
    carriers: Array.isArray(saved.carriers) ? saved.carriers[0] : saved.carriers
  }))

  return (
    <AlertsClient 
      user={user} 
      alerts={transformedAlerts} 
      savedCarriers={transformedSavedCarriers} 
    />
  )
}