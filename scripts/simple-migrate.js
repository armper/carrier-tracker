const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Use the direct database URL for DDL operations
const { Client } = require('pg')

async function runMigration() {
  console.log('🚀 Setting up database...')
  
  // Use direct PostgreSQL connection for better DDL support
  const client = new Client({
    connectionString: process.env.DATABASE_URL.replace('supa=base-pooler.x', ''),
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    // Read and execute the setup SQL
    const setupSQL = fs.readFileSync('./setup-quick.sql', 'utf8')
    
    // Split into statements and execute
    const statements = setupSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📋 Executing ${statements.length} SQL statements...`)
    
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        await client.query(statement)
        console.log(`✅ Statement ${index + 1} completed`)
      } catch (error) {
        console.log(`⚠️  Statement ${index + 1} failed: ${error.message}`)
        // Continue with other statements
      }
    }
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...')
    const result = await client.query('SELECT dot_number, legal_name FROM carriers LIMIT 3')
    
    if (result.rows.length > 0) {
      console.log('✅ Sample carriers found:')
      result.rows.forEach(row => {
        console.log(`  - DOT ${row.dot_number}: ${row.legal_name}`)
      })
      console.log('\n🎉 Database setup complete!')
      console.log('🚛 Ready to test! Try searching for "ABC" or "123456"')
    } else {
      console.log('⚠️  No carriers found')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  } finally {
    await client.end()
  }
}

runMigration()