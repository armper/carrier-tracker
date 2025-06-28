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
        safety_rating,
        insurance_status,
        authority_status
      )
    `)
    .eq('user_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DashboardClient user={user} savedCarriers={savedCarriers as any || []} />
}