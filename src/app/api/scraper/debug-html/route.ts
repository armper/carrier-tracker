import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dotNumber = '4018576' } = body

    console.log(`Debugging HTML for DOT ${dotNumber}`)

    // Step 1: Get the search page first to establish session
    const searchPageResponse = await fetch('https://safer.fmcsa.dot.gov/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarrierTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      }
    })

    console.log('Search page status:', searchPageResponse.status)
    
    // Extract cookies for session
    const cookies = searchPageResponse.headers.get('set-cookie') || ''
    console.log('Cookies:', cookies)
    
    // Step 2: Perform the search using POST request with form data
    const searchUrl = 'https://safer.fmcsa.dot.gov/query.asp'
    const formData = new URLSearchParams({
      searchtype: 'ANY',
      query_type: 'queryCarrierSnapshot', 
      query_param: 'USDOT',
      query_string: dotNumber
    })

    console.log('Form data:', formData.toString())
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarrierTracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Referer': 'https://safer.fmcsa.dot.gov/',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies
      },
      body: formData
    })
    
    console.log('Response status:', response.status)
    const html = await response.text()
    
    // Look for specific patterns that might contain the legal name
    const patterns = [
      /Legal Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i,
      /Legal Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i,
      /<td[^>]*>Legal Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i,
      /Legal Name[^<]*:?[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i,
      /<TITLE>SAFER Web - Company Snapshot\s+([^<]+)<\/TITLE>/i,
      /Company Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i,
      /Business Name[^<]*<\/td>[^<]*<td[^>]*>([^<]+)<\/td>/i
    ]
    
    const foundPatterns = patterns.map((pattern, index) => {
      const match = html.match(pattern)
      return {
        patternIndex: index,
        pattern: pattern.toString(),
        match: match ? match[1] : null,
        found: !!match
      }
    })
    
    // Look for any table structures
    const tableMatches = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi)
    const tableCount = tableMatches?.length || 0
    
    // Look for any td elements that might contain "Legal Name"
    const legalNameTds = html.match(/<td[^>]*>[^<]*Legal Name[^<]*<\/td>/gi)
    
    // Look for any form fields or hidden inputs that might contain data
    const hiddenInputs = html.match(/<input[^>]*type="hidden"[^>]*>/gi)
    
    // Check if the page contains "No records found" or similar
    const noRecords = html.includes('No records found') || html.includes('not found') || html.includes('No data found')
    
    // Extract a sample of the HTML around where we expect the legal name
    const legalNameIndex = html.indexOf('Legal Name')
    const sampleHtml = legalNameIndex > -1 
      ? html.substring(Math.max(0, legalNameIndex - 200), legalNameIndex + 500)
      : 'Legal Name not found in HTML'

    // Also check for USDOT number in the response
    const containsDOT = html.includes(dotNumber)
    const containsUSDOT = html.includes('USDOT')

    return Response.json({
      success: true,
      dotNumber,
      debug: {
        htmlLength: html.length,
        responseStatus: response.status,
        noRecordsFound: noRecords,
        containsDOT,
        containsUSDOT,
        tableCount,
        legalNameTdsCount: legalNameTds?.length || 0,
        hiddenInputsCount: hiddenInputs?.length || 0,
        foundPatterns,
        sampleHtml,
        htmlSnippet: html.substring(0, 2000) // First 2000 chars for debugging
      }
    })

  } catch (error) {
    console.error('HTML debug error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}