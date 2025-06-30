import { createClient } from '@/lib/supabase-server'
import { SAFERScraper } from '@/lib/safer-scraper'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient()
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
    const { jobType = 'daily', limit = 5 } = body

    console.log(`Starting bulk scrape: ${jobType}, limit: ${limit}`)

    const scraper = new SAFERScraper()
    
    // Get carriers to scrape based on job type
    let carriersToScrape: string[] = []
    
    switch (jobType) {
      case 'daily':
        // Get most stale carriers
        carriersToScrape = await scraper.getCarriersToScrape(limit)
        break
        
      case 'weekly':
        // Larger batch
        carriersToScrape = await scraper.getCarriersToScrape(limit * 2)
        break
        
      case 'new-carriers':
        // Get carriers that have never been scraped
        const { data: newCarriers } = await supabase
          .from('carriers')
          .select('dot_number')
          .is('last_verified', null)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        carriersToScrape = newCarriers?.map(c => c.dot_number) || []
        break
        
      default:
        carriersToScrape = await scraper.getCarriersToScrape(limit)
    }

    if (carriersToScrape.length === 0) {
      return Response.json({
        success: true,
        message: 'No carriers found needing sync',
        results: { processed: 0, successful: 0, failed: 0 }
      })
    }

    console.log(`Found ${carriersToScrape.length} carriers to scrape`)

    // Start bulk scraping
    const results = await scraper.bulkScrape(carriersToScrape)

    console.log(`Bulk scrape completed: ${results.successful} successful, ${results.failed} failed`)

    return Response.json({
      success: true,
      jobType,
      results: {
        processed: carriersToScrape.length,
        successful: results.successful,
        failed: results.failed,
        successRate: Math.round((results.successful / carriersToScrape.length) * 100)
      }
    })

  } catch (error) {
    console.error('Bulk scraper error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}