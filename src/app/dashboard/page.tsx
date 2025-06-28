import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's saved carriers
  const { data: savedCarriers } = await supabase
    .from('saved_carriers')
    .select(`
      id,
      notes,
      created_at,
      carriers (
        id,
        dot_number,
        legal_name,
        dba_name,
        physical_address,
        phone,
        safety_rating,
        insurance_status,
        authority_status,
        carb_compliance,
        state,
        city,
        vehicle_count
      )
    `)
    .eq('user_id', user.id)

  // Fetch user's active alerts to show which carriers have monitoring
  const { data: alerts } = await supabase
    .from('monitoring_alerts')
    .select('carrier_id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Create a set of carrier IDs that have active alerts for quick lookup
  const alertedCarrierIds = new Set((alerts || []).map(alert => alert.carrier_id))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardClient user={user} savedCarriers={savedCarriers as any || []} alertedCarrierIds={alertedCarrierIds} />
}