const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifySetup() {
  try {
    console.log('🔍 Verifying admin system setup...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if columns exist and admin is set up
    const { data: adminProfile, error } = await supabase
      .from('profiles')
      .select('email, role, is_admin')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (error) {
      console.log('❌ Error checking admin profile:', error.message)
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('💡 The migration has not been applied yet.')
        console.log('📋 Please run the SQL from the migration script in Supabase SQL Editor.')
        return false
      }
    }

    if (!adminProfile) {
      console.log('❌ Admin profile not found')
      return false
    }

    console.log('✅ Admin profile found:')
    console.log(`   Email: ${adminProfile.email}`)
    console.log(`   Role: ${adminProfile.role || 'not set'}`)
    console.log(`   Is Admin: ${adminProfile.is_admin || false}`)

    if (adminProfile.role === 'super_admin' && adminProfile.is_admin === true) {
      console.log('🎉 Admin system is ready!')
      console.log('🔗 Admin panel available at: http://localhost:3000/admin')
      return true
    } else {
      console.log('⚠️  Admin system needs configuration')
      return false
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message)
    return false
  }
}

verifySetup()