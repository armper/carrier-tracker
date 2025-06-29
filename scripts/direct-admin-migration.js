const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function runDirectMigration() {
  try {
    console.log('🚀 Running direct admin migration...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('📋 Applying schema changes via REST API...')
    
    // Use the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `
          -- Add admin columns to profiles table
          ALTER TABLE public.profiles 
          ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user',
          ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

          -- Add admin columns to carriers table  
          ALTER TABLE public.carriers
          ADD COLUMN IF NOT EXISTS last_manual_update TIMESTAMP,
          ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'manual',
          ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
          ADD COLUMN IF NOT EXISTS admin_notes TEXT,
          ADD COLUMN IF NOT EXISTS created_by_admin UUID;

          -- Set up super admin
          UPDATE public.profiles 
          SET role = 'super_admin', is_admin = true 
          WHERE email = 'alpereastorage@gmail.com';
        `
      })
    })

    if (response.ok) {
      console.log('✅ Schema changes applied successfully')
    } else {
      const error = await response.text()
      console.log('❌ Schema changes failed:', error)
    }

    // Verify the setup
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email, role, is_admin')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (adminProfile?.is_admin) {
      console.log('🎉 Admin system migration completed successfully!')
      console.log(`👑 Super admin: ${adminProfile.email}`)
      console.log('🔗 Admin panel: http://localhost:3000/admin')
    }
    
  } catch (error) {
    console.error('💥 Direct migration failed:', error.message)
  }
}

runDirectMigration()