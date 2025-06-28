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
  const { data: savedCarriers, error: savedCarriersError } = await supabase
    .from('saved_carriers')
    .select(`
      id,
      notes,
      created_at,
      tags,
      priority,
      last_contacted,
      updated_at,
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
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false })

  // If the new columns don't exist, fall back to basic query
  let fallbackCarriers = null
  if (savedCarriersError) {
    console.error('Enhanced query failed, trying fallback:', savedCarriersError)
    const { data: basicCarriers } = await supabase
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
      .order('created_at', { ascending: false })
    
    fallbackCarriers = basicCarriers
  }

  // Fetch user's active alerts to show which carriers have monitoring
  const { data: alerts } = await supabase
    .from('monitoring_alerts')
    .select('carrier_id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Create a set of carrier IDs that have active alerts for quick lookup
  const alertedCarrierIds = new Set((alerts || []).map(alert => alert.carrier_id))

  // Use fallback data if enhanced query failed
  const carriersToUse = savedCarriers || fallbackCarriers || []
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardClient user={user} savedCarriers={carriersToUse as any} alertedCarrierIds={alertedCarrierIds} />
}