import { SAFERScraper } from '@/lib/safer-scraper'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { dotNumber = '1174814' } = await request.json()
    
    const scraper = new SAFERScraper()
    const result = await scraper.scrapeCarrier(dotNumber)
    
    // Also get the raw HTML for debugging
    const searchPageResponse = await fetch('https://safer.fmcsa.dot.gov/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarrierTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    
    const cookies = searchPageResponse.headers.get('set-cookie') || ''
    
    const searchUrl = 'https://safer.fmcsa.dot.gov/query.asp'
    const searchParams = new URLSearchParams({
      searchtype: 'ANY',
      query_type: 'queryCarrierSnapshot', 
      query_param: 'USDOT',
      query_string: dotNumber
    })

    const response = await fetch(`${searchUrl}?${searchParams}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarrierTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://safer.fmcsa.dot.gov/',
        'Cookie': cookies
      }
    })

    const html = await response.text()
    
    return Response.json({
      success: true,
      dotNumber,
      scrapedData: result.data,
      htmlSnippet: html.substring(0, 5000), // First 5k chars
      htmlLength: html.length,
      containsLegalName: html.includes('Legal Name'),
      containsUSDOT: html.includes('USDOT'),
      containsCompanySnapshot: html.includes('Company Snapshot')
    })

  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}