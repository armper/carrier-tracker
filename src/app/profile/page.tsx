import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, updated_at, is_admin, role, user_type')
    .eq('id', user.id)
    .single()

  return <ProfileClient user={user} profile={profile} />
}