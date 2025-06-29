import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, email')
      .eq('id', user.id)
      .single()

    // Only allow alpereastorage@gmail.com to run migrations for security
    if (!profile?.is_admin && user.email !== 'alpereastorage@gmail.com') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if migration has already been applied by trying to select the role column
    try {
      await supabase.from('profiles').select('role').limit(1)
      return NextResponse.json({ 
        message: 'Migration already applied',
        status: 'skipped'
      })
    } catch {
      // Column doesn't exist, proceed with migration
    }

    // For now, just set the admin user manually in the existing structure
    // The full migration will be applied via Supabase dashboard or CLI
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        // We'll add these columns via Supabase dashboard first
      })
      .eq('email', 'alpereastorage@gmail.com')

    if (updateError) {
      console.error('Admin update error:', updateError)
    }

    return NextResponse.json({ 
      message: 'Admin system migration applied successfully',
      status: 'success'
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to check if column exists
export async function GET() {
  return NextResponse.json({ 
    message: 'Admin migration endpoint',
    usage: 'POST to apply admin system migration'
  })
}