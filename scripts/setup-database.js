const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function setupDatabase() {
  try {
    console.log('Setting up database schema...')
    
    const schema = fs.readFileSync('./supabase/schema.sql', 'utf8')
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error('Error executing statement:', error)
        } else {
          console.log('✓ Success')
        }
      }
    }
    
    console.log('Database setup complete!')
    
  } catch (error) {
    console.error('Error setting up database:', error)
  }
}

setupDatabase()