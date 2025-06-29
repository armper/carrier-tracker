import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import UsersManagement from './users-management'



export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    redirect('/dashboard')
  }

  // Fetch all users (only super admins can access this page)
  if (profile.role !== 'super_admin') {
    redirect('/admin')
  }

  // Get all user profiles using service role client to bypass RLS
  const serviceSupabase = createServiceRoleClient()
  const { data: users, error: usersError } = await serviceSupabase
    .from('profiles')
    .select('id, email, full_name, company_name, is_admin, role, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (usersError) {
    console.error('Error fetching users:', usersError)
    redirect('/admin')
  }

  return (
    <UsersManagement 
      currentUser={user}
      currentProfile={profile}
      users={users || []}
    />
  )
}