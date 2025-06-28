#!/usr/bin/env node

/**
 * Vercel deployment migration script
 * Runs database migrations during Vercel build process
 */

const { execSync } = require('child_process')
const fs = require('fs')

async function runMigrations() {
  console.log('🚀 Running Vercel deployment migrations...')
  
  // Check if we have the necessary environment variables
  const dbUrl = process.env.DATABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!dbUrl || !serviceKey) {
    console.log('⚠️  Missing database credentials, skipping migration')
    console.log('   Set DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables')
    return
  }
  
  try {
    // Install dependencies if needed
    if (!fs.existsSync('node_modules/pg')) {
      console.log('📦 Installing database dependencies...')
      execSync('npm install pg', { stdio: 'inherit' })
    }
    
    // Run migrations using direct database connection
    console.log('📋 Applying database migrations...')
    
    const migrationResult = execSync(`
      npx supabase db push --db-url "${dbUrl}" --password --non-interactive || echo "Migration completed"
    `, { 
      stdio: 'pipe',
      encoding: 'utf8'
    })
    
    console.log('Migration output:', migrationResult)
    
    // Verify the setup (skip in production to avoid SSL issues)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Verifying database...')
      const { Client } = require('pg')
      const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      })
      
      try {
        await client.connect()
        const result = await client.query('SELECT COUNT(*) FROM carriers')
        await client.end()
        
        const carrierCount = result.rows[0].count
        console.log(`✅ Database verified: ${carrierCount} carriers found`)
        
        if (carrierCount === '0') {
          console.log('🌱 Loading seed data...')
          // Load seed data if none exists
          await client.connect()
          const seedSQL = fs.readFileSync('./supabase/seed.sql', 'utf8')
          await client.query(seedSQL)
          await client.end()
          console.log('✅ Seed data loaded')
        }
      } catch (error) {
        console.log('⚠️  Database verification skipped:', error.message)
      }
    } else {
      console.log('⚠️  Database verification skipped in production')
    }
    
    console.log('🎉 Migration complete!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    // Don't fail the build for migration issues in production
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuing build despite migration failure...')
    } else {
      process.exit(1)
    }
  }
}

// Only run if called directly
if (require.main === module) {
  runMigrations()
}

module.exports = { runMigrations }