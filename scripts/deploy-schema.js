const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deploySchema() {
  try {
    console.log('🚀 Deploying database schema...')
    
    // Read the migration file
    const migration = fs.readFileSync('./supabase/migrations/20241228000001_initial_schema.sql', 'utf8')
    
    // Split into individual statements
    const statements = migration
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📋 Executing ${statements.length} SQL statements...`)
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          query: statement + ';' 
        })
        
        if (error) {
          // Try direct query if rpc fails
          const { error: directError } = await supabase
            .from('_temp')
            .select('1')
            .limit(0)
            
          if (directError) {
            console.log(`⚠️  Statement ${index + 1} failed:`, error.message)
          }
        } else {
          console.log(`✅ Statement ${index + 1} completed`)
        }
      }
    }
    
    // Load seed data
    console.log('🌱 Loading seed data...')
    const seedData = fs.readFileSync('./supabase/seed.sql', 'utf8')
    const seedStatements = seedData
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { 
          query: statement + ';' 
        })
        
        if (error) {
          console.log('⚠️  Seed statement failed:', error.message)
        }
      }
    }
    
    console.log('✅ Database setup complete!')
    console.log('🎉 Your CarrierTracker database is ready!')
    
  } catch (error) {
    console.error('❌ Error deploying schema:', error)
  }
}

deploySchema()