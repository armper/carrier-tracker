import { createClient } from '@/lib/supabase-server'
import { SAFERScraper } from '@/lib/safer-scraper'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
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

    console.log('Checking available carriers for scraping...')

    const scraper = new SAFERScraper()
    
    // Check different categories
    const [staleCarriers, newCarriers, allCarriers] = await Promise.all([
      // Stale carriers (what the scraper looks for)
      scraper.getCarriersToScrape(10),
      
      // All carriers (since we don't have sync columns yet)
      supabase
        .from('carriers')
        .select('dot_number, legal_name')
        .limit(10),
      
      // All carriers
      supabase
        .from('carriers')
        .select('dot_number, legal_name, created_at')
        .limit(20)
    ])

    return Response.json({
      success: true,
      staleCarriers: {
        count: staleCarriers.length,
        carriers: staleCarriers
      },
      newCarriers: {
        count: newCarriers.data?.length || 0,
        carriers: newCarriers.data || []
      },
      allCarriers: {
        count: allCarriers.data?.length || 0,
        carriers: allCarriers.data || []
      },
      debug: {
        newCarriersError: newCarriers.error,
        allCarriersError: allCarriers.error
      }
    })

  } catch (error) {
    console.error('Check available carriers error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}