const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  try {
    console.log('🚀 Starting admin system migration...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials. Check .env.local file.')
    }
    
    console.log(`🔗 Connecting to: ${supabaseUrl}`)
    
    // Create admin client with service role
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if migration already applied
    console.log('🔍 Checking if migration already applied...')
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_admin')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (!checkError && existingProfile && existingProfile.role === 'super_admin') {
      console.log('✅ Migration already applied - admin system is ready!')
      console.log('🔗 Admin panel available at: /admin')
      return
    }

    console.log('📋 Applying database schema changes...')
    
    // Apply schema changes using PostgreSQL client
    const { Client } = require('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })
    
    await client.connect()
    console.log('   ✅ Connected to PostgreSQL')
    
    const alterQueries = [
      {
        name: 'Add admin columns to profiles table',
        sql: `DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
            ALTER TABLE public.profiles ADD COLUMN role VARCHAR DEFAULT 'user';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
            ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
          END IF;
        END $$;`
      },
      {
        name: 'Add admin columns to carriers table',
        sql: `DO $$ 
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
        END $$;`
      }
    ]

    for (const [index, query] of alterQueries.entries()) {
      console.log(`   [${index + 1}/${alterQueries.length}] ${query.name}`)
      
      try {
        await client.query(query.sql)
        console.log(`   ✅ Applied successfully`)
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`)
      }
    }
    
    await client.end()
    console.log('   ✅ Database connection closed')

    console.log('👤 Setting up super admin...')
    
    // Set alpereastorage@gmail.com as super admin
    const { error: adminError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'super_admin', 
        is_admin: true 
      })
      .eq('email', 'alpereastorage@gmail.com')

    if (adminError) {
      console.error('❌ Admin setup error:', adminError.message)
    } else {
      console.log('✅ Super admin configured successfully')
    }

    // Verify the setup
    const { data: verifyProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_admin, email')
      .eq('email', 'alpereastorage@gmail.com')
      .single()

    if (verifyProfile?.is_admin) {
      console.log('🎉 Migration completed successfully!')
      console.log('🔗 Admin panel available at: /admin')
      console.log(`👑 Super admin: ${verifyProfile.email}`)
    } else {
      console.log('⚠️  Migration completed but admin setup needs verification')
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()