import { NextRequest, NextResponse } from 'next/server'
import { DatabaseMigrator } from '@/lib/migrate'

export async function GET(request: NextRequest) {
  // Simple token-based auth for migration endpoint
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') || request.headers.get('authorization')?.replace('Bearer ', '')
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!expectedToken) {
    return NextResponse.json({ 
      error: 'Migration not configured - missing SUPABASE_SERVICE_ROLE_KEY' 
    }, { status: 500 })
  }
  
  if (token !== expectedToken) {
    return NextResponse.json({ 
      error: 'Unauthorized - provide valid token as ?token= or Authorization header' 
    }, { status: 401 })
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