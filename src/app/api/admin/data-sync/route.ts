import { createClient } from '@/lib/supabase-server'
import { DOTSyncService } from '@/lib/dot-sync-service'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'status':
        return await getDataSyncStatus(supabase)
      case 'carriers-needing-sync':
        return await getCarriersNeedingSync(supabase)
      case 'recent-jobs':
        return await getRecentJobs(supabase)
      default:
        return await getDataSyncOverview(supabase)
    }

  } catch (error) {
    console.error('Data sync API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, dotNumbers, jobType } = body

    const syncService = new DOTSyncService()

    switch (action) {
      case 'sync-single':
        return await syncSingleCarrier(supabase, syncService, body.dotNumber, user.id)
      case 'sync-bulk':
        return await syncBulkCarriers(supabase, syncService, dotNumbers || [], user.id)
      case 'sync-stale':
        return await syncStaleCarriers(supabase, syncService, user.id)
      case 'refresh-quality-scores':
        return await refreshQualityScores(supabase, user.id)
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Data sync POST error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getDataSyncOverview(supabase: any) {
  const [
    { data: carriersStats },
    { data: recentJobs },
    { data: qualityIssues }
  ] = await Promise.all([
    // Carrier stats
    supabase
      .from('carriers')
      .select('data_quality_score, api_sync_status, last_verified')
      .not('data_quality_score', 'is', null),
    
    // Recent jobs
    supabase
      .from('data_refresh_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    
    // Quality issues
    supabase
      .from('data_quality_issues')
      .select('severity')
      .eq('resolved', false)
  ])

  const stats = {
    totalCarriers: carriersStats?.length || 0,
    highQuality: carriersStats?.filter(c => c.data_quality_score >= 80).length || 0,
    mediumQuality: carriersStats?.filter(c => c.data_quality_score >= 60 && c.data_quality_score < 80).length || 0,
    lowQuality: carriersStats?.filter(c => c.data_quality_score < 60).length || 0,
    recentlySynced: carriersStats?.filter(c => {
      if (!c.last_verified) return false
      const daysSince = (Date.now() - new Date(c.last_verified).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince <= 7
    }).length || 0,
    needsSync: carriersStats?.filter(c => {
      if (!c.last_verified) return true
      const daysSince = (Date.now() - new Date(c.last_verified).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 30
    }).length || 0,
    recentJobs: recentJobs || [],
    openIssues: {
      critical: qualityIssues?.filter(i => i.severity === 'critical').length || 0,
      high: qualityIssues?.filter(i => i.severity === 'high').length || 0,
      medium: qualityIssues?.filter(i => i.severity === 'medium').length || 0,
      low: qualityIssues?.filter(i => i.severity === 'low').length || 0
    }
  }

  return Response.json(stats)
}

async function getCarriersNeedingSync(supabase: any) {
  const syncService = new DOTSyncService()
  const carriers = await syncService.getCarriersNeedingSync(50)
  return Response.json(carriers)
}

async function getRecentJobs(supabase: any) {
  const { data: jobs, error } = await supabase
    .from('data_refresh_jobs')
    .select(`
      *,
      profiles:created_by (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Failed to fetch recent jobs: ${error.message}`)
  }

  return Response.json(jobs || [])
}

async function syncSingleCarrier(supabase: any, syncService: DOTSyncService, dotNumber: string, userId: string) {
  if (!dotNumber) {
    return Response.json({ error: 'DOT number required' }, { status: 400 })
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('data_refresh_jobs')
    .insert({
      job_type: 'single_carrier',
      status: 'running',
      created_by: userId,
      started_at: new Date().toISOString(),
      metadata: { dot_number: dotNumber }
    })
    .select()
    .single()

  if (jobError) {
    return Response.json({ error: 'Failed to create job' }, { status: 500 })
  }

  try {
    const result = await syncService.syncCarrier(dotNumber)
    
    // Update job status
    await supabase
      .from('data_refresh_jobs')
      .update({
        status: result.success ? 'completed' : 'failed',
        carriers_processed: 1,
        carriers_updated: result.success ? 1 : 0,
        carriers_failed: result.success ? 0 : 1,
        errors: result.success ? [] : [result.error],
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return Response.json({
      success: result.success,
      jobId: job.id,
      data: result
    })

  } catch (error) {
    // Update job status to failed
    await supabase
      .from('data_refresh_jobs')
      .update({
        status: 'failed',
        carriers_processed: 1,
        carriers_failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: job.id
    }, { status: 500 })
  }
}

async function syncBulkCarriers(supabase: any, syncService: DOTSyncService, dotNumbers: string[], userId: string) {
  if (!Array.isArray(dotNumbers) || dotNumbers.length === 0) {
    return Response.json({ error: 'DOT numbers array required' }, { status: 400 })
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('data_refresh_jobs')
    .insert({
      job_type: 'bulk_sync',
      status: 'running',
      created_by: userId,
      started_at: new Date().toISOString(),
      metadata: { dot_numbers: dotNumbers, total_count: dotNumbers.length }
    })
    .select()
    .single()

  if (jobError) {
    return Response.json({ error: 'Failed to create job' }, { status: 500 })
  }

  try {
    const results = await syncService.bulkSync(dotNumbers, async (progress, total) => {
      // Update job progress
      await supabase
        .from('data_refresh_jobs')
        .update({
          carriers_processed: progress,
          metadata: { 
            ...job.metadata, 
            progress_percentage: Math.round((progress / total) * 100) 
          }
        })
        .eq('id', job.id)
    })
    
    // Update final job status
    await supabase
      .from('data_refresh_jobs')
      .update({
        status: 'completed',
        carriers_updated: results.successful,
        carriers_failed: results.failed,
        errors: results.errors,
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return Response.json({
      success: true,
      jobId: job.id,
      results
    })

  } catch (error) {
    // Update job status to failed
    await supabase
      .from('data_refresh_jobs')
      .update({
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id)

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      jobId: job.id
    }, { status: 500 })
  }
}

async function syncStaleCarriers(supabase: any, syncService: DOTSyncService, userId: string) {
  try {
    const carriersToSync = await syncService.getCarriersNeedingSync(100)
    const dotNumbers = carriersToSync.map(c => c.dot_number)
    
    return await syncBulkCarriers(supabase, syncService, dotNumbers, userId)
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stale carriers'
    }, { status: 500 })
  }
}

async function refreshQualityScores(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase.rpc('refresh_data_quality_scores')
    
    if (error) {
      throw new Error(`Failed to refresh quality scores: ${error.message}`)
    }

    return Response.json({
      success: true,
      carriersUpdated: data
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to refresh quality scores'
    }, { status: 500 })
  }
}