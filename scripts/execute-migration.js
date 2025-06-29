const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function executeMigration() {
  console.log('🚀 Executing admin migration directly...')
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Add admin columns to profiles
    console.log('📋 Adding admin columns to profiles table...')
    await client.query(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
    `)
    console.log('✅ Profiles table updated')

    // Add admin columns to carriers
    console.log('📋 Adding admin columns to carriers table...')
    await client.query(`
      ALTER TABLE public.carriers
      ADD COLUMN IF NOT EXISTS last_manual_update TIMESTAMP,
      ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS admin_notes TEXT,
      ADD COLUMN IF NOT EXISTS created_by_admin UUID;
    `)
    console.log('✅ Carriers table updated')

    // Set up super admin
    console.log('👤 Setting up super admin...')
    const result = await client.query(`
      UPDATE public.profiles 
      SET role = 'super_admin', is_admin = true 
      WHERE email = 'alpereastorage@gmail.com'
      RETURNING email, role, is_admin;
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Super admin configured:', result.rows[0])
      console.log('🎉 Migration completed successfully!')
      console.log('🔗 Admin panel: http://localhost:3000/admin')
    } else {
      console.log('⚠️  No user found with email alpereastorage@gmail.com')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    throw error
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

executeMigration().catch(console.error)