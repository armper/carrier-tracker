#!/usr/bin/env node

/**
 * Fix migration sync between local and production database
 * Marks migrations as applied without running them since columns already exist
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function fixMigrationSync() {
  console.log('🔧 Fixing migration sync between local and production...')
  
  const dbUrl = process.env.DATABASE_URL || "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set')
    process.exit(1)
  }
  
  const client = new Client({
    connectionString: dbUrl,
    ssl: { 
      rejectUnauthorized: false
    }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to production database')
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
    
    console.log(`📋 Found ${migrationFiles.length} migration files`)
    
    // Get already applied migrations
    const appliedResult = await client.query(`
      SELECT version FROM supabase_migrations.schema_migrations 
      ORDER BY version
    `)
    const appliedMigrations = appliedResult.rows.map(row => row.version)
    
    console.log(`📋 Already applied: ${appliedMigrations.length} migrations`)
    
    // Find migrations that need to be marked as applied
    const pendingMigrations = migrationFiles.filter(file => {
      const version = file.replace('.sql', '')
      return !appliedMigrations.includes(version)
    })
    
    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations are already applied')
      return
    }
    
    console.log(`🔄 Marking ${pendingMigrations.length} migrations as applied...`)
    
    for (const file of pendingMigrations) {
      const version = file.replace('.sql', '')
      const filePath = path.join(migrationsDir, file)
      const sqlContent = fs.readFileSync(filePath, 'utf8')
      
      // Mark migration as applied without running it
      await client.query(`
        INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (version) DO NOTHING
      `, [version, [sqlContent], version])
      
      console.log(`✅ Marked ${version} as applied`)
    }
    
    // Verify final state
    const finalResult = await client.query(`
      SELECT COUNT(*) as count FROM supabase_migrations.schema_migrations
    `)
    
    console.log(`🎉 Migration sync complete! Total applied: ${finalResult.rows[0].count}`)
    
  } catch (error) {
    console.error('❌ Error fixing migration sync:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Only run if called directly
if (require.main === module) {
  fixMigrationSync()
}

module.exports = { fixMigrationSync } 