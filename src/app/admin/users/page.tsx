import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
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

  // Get all user profiles
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, is_admin, role, created_at, updated_at')
    .order('created_at', { ascending: false })
    .returns<Array<{
      id: string
      email: string
      full_name: string | null
      company_name: string | null
      is_admin: boolean
      role: string
      created_at: string
      updated_at: string
    }>>()

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