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
    const { dotNumber = '1174814' } = body // Real DOT number that should exist

    console.log(`Testing SAFER scraper with DOT ${dotNumber}`)

    const scraper = new SAFERScraper()
    
    // Test both URL formats
    const testUrl1 = `https://safer.fmcsa.dot.gov/CompanySnapshot.aspx?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${dotNumber}`
    const testUrl2 = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&original_query_param=USDOT&query_string=${dotNumber}`
    
    console.log('Testing new URL:', testUrl1)
    
    const testResponse = await fetch(testUrl1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarrierTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://safer.fmcsa.dot.gov/'
      }
    })
    
    console.log('Response status:', testResponse.status)
    const html = await testResponse.text()
    console.log('HTML length:', html.length)
    console.log('HTML snippet (first 1000 chars):', html.substring(0, 1000))
    console.log('HTML contains "Legal Name":', html.includes('Legal Name'))
    console.log('HTML contains "USDOT":', html.includes('USDOT'))
    console.log('HTML contains DOT number:', html.includes(dotNumber))
    
    // Look for table structures
    const tables = html.match(/<table[^>]*>/gi)
    console.log('Number of tables found:', tables?.length || 0)
    
    // Look for form fields
    const inputs = html.match(/<input[^>]*>/gi)
    console.log('Number of input fields:', inputs?.length || 0)
    
    // Check for any data in the response
    const dataPattern = html.match(/\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/) // ZIP code pattern
    console.log('Found ZIP pattern:', !!dataPattern)
    
    // Look for phone number patterns
    const phonePattern = html.match(/\(\d{3}\)\s*\d{3}-\d{4}/)
    console.log('Found phone pattern:', !!phonePattern)
    
    const result = await scraper.scrapeCarrier(dotNumber)

    // Log more details for debugging
    console.log('Scraper result:', JSON.stringify(result, null, 2))
    if (result.success && result.data) {
      console.log('Found carrier data:', result.data.legal_name)
    } else {
      console.log('No data found or scraping failed:', result.error)
    }

    return Response.json({
      success: true,
      dotNumber,
      result,
      debug: {
        hasData: !!result.data,
        legalName: result.data?.legal_name,
        error: result.error
      }
    })

  } catch (error) {
    console.error('Scraper test error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}