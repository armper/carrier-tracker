import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ReportsManagement from './reports-management'

export default async function AdminReportsPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated and admin
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  // Fetch all carrier reports with carrier and user information
  const { data: reports } = await supabase
    .from('carrier_reports')
    .select(`
      *,
      carriers:carrier_id(dot_number, legal_name, data_source, verified),
      profiles:user_id(email, full_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <ReportsManagement 
      initialReports={reports || []}
      isAdmin={profile.is_admin}
      userRole={profile.role}
    />
  )
}

export const metadata = {
  title: 'Carrier Reports Management | CarrierTracker Admin',
  description: 'Review and manage user-submitted carrier data reports'
}