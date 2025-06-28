import { NextRequest, NextResponse } from 'next/server'
import { DatabaseMigrator } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  // Security check - only allow in development or with proper auth
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.MIGRATION_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting database migration...')
    
    const migrator = new DatabaseMigrator()
    const success = await migrator.runMigrations()
    
    if (success) {
      const verified = await migrator.verifySetup()
      
      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        verified
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Migration failed'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}