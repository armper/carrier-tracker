import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminDashboard from './admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard?error=admin_required')
  }

  // Get admin stats
  const [
    { count: totalCarriers },
    { count: manualCarriers },
    { count: verifiedCarriers },
    { count: pendingReports }
  ] = await Promise.all([
    supabase.from('carriers').select('*', { count: 'exact', head: true }),
    supabase.from('carriers').select('*', { count: 'exact', head: true }).eq('data_source', 'manual'),
    supabase.from('carriers').select('*', { count: 'exact', head: true }).eq('verified', true),
    supabase.from('carrier_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ])

  // Get recent admin activities
  const { data: recentActivities } = await supabase
    .from('admin_activity_log')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      details,
      created_at,
      profiles!admin_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <AdminDashboard 
      user={user}
      profile={profile}
      stats={{
        totalCarriers: totalCarriers || 0,
        manualCarriers: manualCarriers || 0,
        verifiedCarriers: verifiedCarriers || 0,
        pendingReports: pendingReports || 0
      }}
      recentActivities={recentActivities || []}
    />
  )
}