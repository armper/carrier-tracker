import { createClient } from '@/lib/supabase-server'
import { SAFERScraper } from '@/lib/safer-scraper'
import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const jobType = url.searchParams.get('type') || 'daily'
    const limit = parseInt(url.searchParams.get('limit') || '20')

    console.log(`Starting cron job: ${jobType}, limit: ${limit}`)

    const supabase = await createClient()
    const scraper = new SAFERScraper()

    // Use service role client to ensure table access
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Try to create the table first using direct SQL
    try {
      await serviceClient.query(`
        CREATE TABLE IF NOT EXISTS data_refresh_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          carriers_processed INTEGER DEFAULT 0,
          carriers_updated INTEGER DEFAULT 0,
          carriers_failed INTEGER DEFAULT 0,
          errors JSONB DEFAULT '[]'::jsonb,
          metadata JSONB DEFAULT '{}'::jsonb,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      )
    } catch (tableError) {
      console.log('Table creation failed, continuing anyway:', tableError)
    }

    // Create job record (cron jobs have no user, use NULL for created_by)
    const { data: job, error: jobError } = await serviceClient
      .from('data_refresh_jobs')
      .insert({
        job_type: `cron_${jobType}`,
        status: 'running',
        started_at: new Date().toISOString(),
        created_by: null, // Cron jobs are system-initiated
        metadata: { 
          cron_type: jobType, 
          max_carriers: limit,
          triggered_by: 'cron'
        }
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create cron job record:', jobError)
      return Response.json({ 
        error: 'Failed to create job record', 
        details: jobError.message || jobError 
      }, { status: 500 })
    }

    let carriersToScrape: string[] = []

    try {
      // Get carriers to scrape based on job type
      switch (jobType) {
        case 'daily':
          // Daily job: scrape most stale carriers
          carriersToScrape = await scraper.getCarriersToScrape(limit)
          break
          
        case 'weekly':
          // Weekly job: larger batch of stale carriers
          carriersToScrape = await scraper.getCarriersToScrape(limit * 3)
          break
          
        case 'new-carriers':
          // New carriers added recently that haven't been scraped
          const { data: newCarriers } = await supabase
            .from('carriers')
            .select('dot_number')
            .is('last_verified', null)
            .eq('data_source', 'manual')
            .order('created_at', { ascending: false })
            .limit(limit)
          
          carriersToScrape = newCarriers?.map(c => c.dot_number) || []
          break
          
        default:
          carriersToScrape = await scraper.getCarriersToScrape(limit)
      }

      if (carriersToScrape.length === 0) {
        await serviceClient
          .from('data_refresh_jobs')
          .update({
            status: 'completed',
            carriers_processed: 0,
            carriers_updated: 0,
            carriers_failed: 0,
            completed_at: new Date().toISOString(),
            metadata: { 
              ...job.metadata, 
              message: 'No carriers found needing sync'
            }
          })
          .eq('id', job.id)

        return Response.json({
          success: true,
          message: 'No carriers needed syncing',
          jobId: job.id
        })
      }

      console.log(`Found ${carriersToScrape.length} carriers to scrape`)

      // Start bulk scraping
      const results = await scraper.bulkScrape(
        carriersToScrape,
        async (current, total, dotNumber) => {
          // Update job progress periodically
          if (current % 5 === 0 || current === total) {
            await serviceClient
              .from('data_refresh_jobs')
              .update({
                carriers_processed: current,
                metadata: { 
                  ...job.metadata, 
                  progress_percentage: Math.round((current / total) * 100),
                  current_dot: dotNumber
                }
              })
              .eq('id', job.id)
          }
        }
      )

      // Update final job status
      await supabase
        .from('data_refresh_jobs')
        .update({
          status: 'completed',
          carriers_processed: carriersToScrape.length,
          carriers_updated: results.successful,
          carriers_failed: results.failed,
          completed_at: new Date().toISOString(),
          metadata: {
            ...job.metadata,
            final_stats: {
              successful: results.successful,
              failed: results.failed,
              success_rate: Math.round((results.successful / carriersToScrape.length) * 100)
            }
          }
        })
        .eq('id', job.id)

      console.log(`Cron job completed: ${results.successful} successful, ${results.failed} failed`)

      return Response.json({
        success: true,
        jobId: job.id,
        results: {
          processed: carriersToScrape.length,
          successful: results.successful,
          failed: results.failed,
          successRate: Math.round((results.successful / carriersToScrape.length) * 100)
        }
      })

    } catch (error) {
      console.error('Cron job error:', error)
      
      // Update job status to failed
      await serviceClient
        .from('data_refresh_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [error instanceof Error ? error.message : 'Unknown error']
        })
        .eq('id', job.id)

      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: job.id
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Cron endpoint error:', error)
    return Response.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Manual trigger endpoint for admin users
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check admin privileges
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return Response.json({ error: 'Admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    const { jobType = 'daily', limit = 10 } = body

    // Create manual trigger URL
    const cronUrl = new URL('/api/cron/data-sync', request.url)
    cronUrl.searchParams.set('type', jobType)
    cronUrl.searchParams.set('limit', limit.toString())

    // Forward to GET endpoint with cron secret
    const response = await fetch(cronUrl.toString(), {
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`
      }
    })

    const result = await response.json()

    return Response.json(result, { status: response.status })

  } catch (error) {
    console.error('Manual cron trigger error:', error)
    return Response.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}