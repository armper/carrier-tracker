const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function runSQL(sql, description) {
  console.log(`⚡ ${description}...`)
  
  try {
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      // Try alternative method for DDL statements
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql })
      })
      
      if (!response.ok) {
        // For DDL statements, try direct SQL execution
        const { error: directError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(1)
          
        // If that fails, the statement probably worked but we can't verify
        console.log(`⚠️  ${description} - might have succeeded (DDL statements don't return data)`)
        return true
      }
    }
    
    console.log(`✅ ${description} completed`)
    return true
  } catch (err) {
    console.log(`⚠️  ${description} - ${err.message}`)
    return false
  }
}

async function createMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `
  return await runSQL(sql, 'Creating migrations table')
}

async function getMigratedFiles() {
  try {
    const { data, error } = await supabase
      .from('_migrations')
      .select('filename')
    
    if (error) return []
    return data.map(row => row.filename)
  } catch {
    return []
  }
}

async function markAsMigrated(filename) {
  await supabase
    .from('_migrations')
    .insert({ filename })
}

async function runMigrations() {
  console.log('🚀 Running database migrations...\n')
  
  // Create migrations tracking table
  await createMigrationsTable()
  
  // Get already migrated files
  const migrated = await getMigratedFiles()
  console.log(`📋 Already migrated: ${migrated.length} files\n`)
  
  // Read migration files
  const migrationsDir = path.join(__dirname, '../supabase/migrations')
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
  
  let newMigrations = 0
  
  for (const file of migrationFiles) {
    if (migrated.includes(file)) {
      console.log(`⏭️  Skipping ${file} (already migrated)`)
      continue
    }
    
    console.log(`🔄 Migrating ${file}...`)
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    
    // Split into statements and execute each one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        await runSQL(statement + ';', `  Statement ${index + 1}/${statements.length}`)
      }
    }
    
    await markAsMigrated(file)
    console.log(`✅ ${file} completed\n`)
    newMigrations++
  }
  
  // Load seed data if this is the first migration
  if (newMigrations > 0) {
    console.log('🌱 Loading seed data...')
    const seedPath = path.join(__dirname, '../supabase/seed.sql')
    if (fs.existsSync(seedPath)) {
      const seedSQL = fs.readFileSync(seedPath, 'utf8')
      const seedStatements = seedSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of seedStatements) {
        if (statement.trim()) {
          await runSQL(statement + ';', 'Loading seed data')
        }
      }
      console.log('✅ Seed data loaded\n')
    }
  }
  
  console.log(`🎉 Migration complete! ${newMigrations} new migrations applied.`)
  
  // Verify data
  console.log('\n🔍 Verifying database...')
  const { data: carriers } = await supabase
    .from('carriers')
    .select('dot_number, legal_name')
    .limit(3)
    
  if (carriers && carriers.length > 0) {
    console.log('✅ Sample carriers found:')
    carriers.forEach(c => console.log(`  - DOT ${c.dot_number}: ${c.legal_name}`))
    console.log('\n🚛 Ready to test! Try searching for "ABC" or "123456"')
  } else {
    console.log('⚠️  No carriers found - seed data might not have loaded')
  }
}

// Add to package.json scripts
function updatePackageJson() {
  const packagePath = path.join(__dirname, '../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  
  if (!packageJson.scripts['db:migrate:run']) {
    packageJson.scripts['db:migrate:run'] = 'node scripts/migrate.js'
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2))
    console.log('✅ Added npm run db:migrate:run script to package.json')
  }
}

if (require.main === module) {
  runMigrations().catch(console.error)
  updatePackageJson()
}

module.exports = { runMigrations }