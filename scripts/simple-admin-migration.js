const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  try {
    console.log('🚀 Starting admin system migration...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // First, let's just try to set up the admin user using existing columns
    console.log('👤 Setting up admin user with existing schema...')
    
    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (!existingProfile) {
      console.log('❌ Admin user profile not found. Please sign up first.')
      return
    }

    console.log('✅ Admin user found:', existingProfile.email)
    
    // For now, we'll manually add the columns via SQL
    console.log('\n📋 Manual SQL to run in Supabase SQL Editor:')
    console.log('---')
    console.log(`
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
`)
    console.log('---')
    console.log('\n🔗 Go to: https://supabase.com/dashboard/project/axmnmxwjijsigiueednz/sql')
    console.log('💡 Copy and paste the SQL above, then run it.')
    console.log('🔄 Then run this script again to verify the setup.')
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
  }
}

runMigration()