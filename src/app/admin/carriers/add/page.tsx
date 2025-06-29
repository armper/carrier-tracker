import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AddCarrierForm from './add-carrier-form'

export default async function AddCarrierPage() {
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

  return <AddCarrierForm user={user} />
}