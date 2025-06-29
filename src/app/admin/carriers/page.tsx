import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import CarriersManagement from './carriers-management'

export default async function AdminCarriersPage() {
  const supabase = await createClient()

  // Check authentication and admin status
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    redirect('/dashboard')
  }

  // Get recent carriers
  const { data: carriers } = await supabase
    .from('carriers')
    .select('id, dot_number, legal_name, created_at, data_source, verified, trust_score')
    .order('created_at', { ascending: false })
    .limit(50)

  return <CarriersManagement initialCarriers={carriers || []} />
}