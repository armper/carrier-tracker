import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

interface Migration {
  id: string
  filename: string
  executed_at: string
}

export class DatabaseMigrator {
  private supabase
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  async ensureMigrationsTable() {
    const { error } = await this.supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS _migrations (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `
    })
    
    if (error && !error.message.includes('already exists')) {
      console.warn('Could not create migrations table:', error.message)
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('_migrations')
      .select('filename')
    
    if (error) {
      console.warn('Could not fetch migrations:', error.message)
      return []
    }
    
    return data?.map(m => m.filename) || []
  }

  async executeSQLStatement(sql: string): Promise<boolean> {
    try {
      // Try using the SQL execution RPC
      const { error } = await this.supabase.rpc('exec_sql', { query: sql })
      
      if (error) {
        // For some operations, errors are expected (like CREATE TABLE IF NOT EXISTS)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          return true
        }
        console.warn('SQL execution warning:', error.message)
        return false
      }
      
      return true
    } catch (err) {
      console.warn('SQL execution error:', err)
      return false
    }
  }

  async executeMigrationSQL(sql: string): Promise<void> {
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements...`)

    for (const [index, statement] of statements.entries()) {
      if (statement.trim()) {
        console.log(`Statement ${index + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        await this.executeSQLStatement(statement + ';')
      }
    }
  }

  async markMigrationExecuted(filename: string): Promise<void> {
    await this.supabase
      .from('_migrations')
      .insert({
        id: filename.replace('.sql', ''),
        filename
      })
  }

  async runMigrations(): Promise<boolean> {
    try {
      console.log('🚀 Running database migrations...')
      
      await this.ensureMigrationsTable()
      
      const executed = await this.getExecutedMigrations()
      console.log(`Already executed: ${executed.length} migrations`)

      // Get migration files from the migrations directory
      const migrationsPath = path.join(process.cwd(), 'supabase', 'migrations')
      
      if (!fs.existsSync(migrationsPath)) {
        console.log('No migrations directory found')
        return true
      }

      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort()

      let newMigrations = 0

      for (const file of migrationFiles) {
        if (executed.includes(file)) {
          console.log(`⏭️  Skipping ${file} (already executed)`)
          continue
        }

        console.log(`🔄 Executing migration: ${file}`)
        
        const sqlContent = fs.readFileSync(path.join(migrationsPath, file), 'utf8')
        await this.executeMigrationSQL(sqlContent)
        await this.markMigrationExecuted(file)
        
        newMigrations++
        console.log(`✅ ${file} completed`)
      }

      // Load seed data if this is a fresh setup
      if (newMigrations > 0) {
        await this.loadSeedData()
      }

      console.log(`🎉 Migration complete! ${newMigrations} new migrations executed`)
      return true

    } catch (error) {
      console.error('❌ Migration failed:', error)
      return false
    }
  }

  async loadSeedData(): Promise<void> {
    console.log('🌱 Loading seed data...')
    
    const seedPath = path.join(process.cwd(), 'supabase', 'seed.sql')
    
    if (fs.existsSync(seedPath)) {
      const seedSQL = fs.readFileSync(seedPath, 'utf8')
      await this.executeMigrationSQL(seedSQL)
      console.log('✅ Seed data loaded')
    }
  }

  async verifySetup(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('carriers')
        .select('dot_number, legal_name')
        .limit(3)

      if (error) {
        console.warn('Could not verify setup:', error.message)
        return false
      }

      if (data && data.length > 0) {
        console.log('✅ Database verification successful:')
        data.forEach(c => console.log(`  - DOT ${c.dot_number}: ${c.legal_name}`))
        return true
      } else {
        console.log('⚠️  No carriers found in database')
        return false
      }
    } catch (error) {
      console.warn('Could not verify database:', error)
      return false
    }
  }
}

// Helper function for API routes
export async function runMigrations(): Promise<boolean> {
  const migrator = new DatabaseMigrator()
  return await migrator.runMigrations()
}

// Helper function to get executed migrations
async function getExecutedMigrations(): Promise<string[]> {
  const migrator = new DatabaseMigrator()
  return await migrator.getExecutedMigrations()
}