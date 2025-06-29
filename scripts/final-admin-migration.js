const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function applyMigration() {
  try {
    console.log('🚀 Applying admin system migration directly...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create a custom function to execute raw SQL
    console.log('📋 Creating temporary SQL execution function...')
    
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_text TEXT)
      RETURNS TEXT AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'SUCCESS';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN 'ERROR: ' || SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
    
    const { error: createError } = await supabase.rpc('exec', { sql: createFunctionSQL })
    
    // Apply the migration SQL
    const migrationSQL = `
      -- Add admin columns to profiles table
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
          ALTER TABLE public.profiles ADD COLUMN role VARCHAR DEFAULT 'user';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
          ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
        END IF;
      END $$;

      -- Add admin columns to carriers table
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='last_manual_update') THEN
          ALTER TABLE public.carriers ADD COLUMN last_manual_update TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='data_source') THEN
          ALTER TABLE public.carriers ADD COLUMN data_source VARCHAR DEFAULT 'manual';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='verified') THEN
          ALTER TABLE public.carriers ADD COLUMN verified BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='verification_date') THEN
          ALTER TABLE public.carriers ADD COLUMN verification_date TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='trust_score') THEN
          ALTER TABLE public.carriers ADD COLUMN trust_score INTEGER DEFAULT 50;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='admin_notes') THEN
          ALTER TABLE public.carriers ADD COLUMN admin_notes TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='carriers' AND column_name='created_by_admin') THEN
          ALTER TABLE public.carriers ADD COLUMN created_by_admin UUID;
        END IF;
      END $$;

      -- Set up super admin
      UPDATE public.profiles 
      SET role = 'super_admin', is_admin = true 
      WHERE email = 'alpereastorage@gmail.com';
    `

    console.log('🔧 Applying database schema changes...')
    
    const { error: migrationError } = await supabase.rpc('execute_sql', { sql_text: migrationSQL })
    
    if (migrationError) {
      console.error('❌ Migration error:', migrationError.message)
      throw migrationError
    }

    console.log('✅ Schema changes applied successfully')

    // Verify the setup
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email, role, is_admin')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (adminProfile?.is_admin) {
      console.log('🎉 Admin system migration completed successfully!')
      console.log(`👑 Super admin: ${adminProfile.email}`)
      console.log(`🔐 Role: ${adminProfile.role}`)
      console.log('🔗 Admin panel: http://localhost:3000/admin')
    } else {
      console.log('⚠️  Migration applied but admin setup needs verification')
    }

    // Clean up the temporary function
    await supabase.rpc('execute_sql', { 
      sql_text: 'DROP FUNCTION IF EXISTS execute_sql(TEXT);' 
    })
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    
    // Try a simpler approach with individual operations
    console.log('🔄 Trying alternative approach...')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Just try to add the columns using a simple approach
    try {
      // First create the migration via REST API call
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user',
            ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
            
            UPDATE public.profiles 
            SET role = 'super_admin', is_admin = true 
            WHERE email = 'alpereastorage@gmail.com';
          `
        })
      })
      
      if (response.ok) {
        console.log('✅ Alternative migration succeeded!')
      } else {
        console.log('❌ Alternative migration also failed')
        console.log('📋 Manual intervention required - please run SQL in Supabase dashboard')
      }
    } catch (altError) {
      console.log('❌ All migration approaches failed')
      console.log('📋 Please apply the migration manually in Supabase SQL Editor')
    }
  }
}

applyMigration()