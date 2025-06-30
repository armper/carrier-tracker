import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'

// Test the parsing logic directly without database dependencies
async function testRealCompany() {
  const dotNumber = '4024598'
  
  // Download a real company page using the correct endpoint
  const url = 'https://safer.fmcsa.dot.gov/query.asp'
  const formData = new URLSearchParams({
    searchtype: 'ANY',
    query_type: 'queryCarrierSnapshot',
    query_param: 'USDOT',
    query_string: dotNumber
  })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formData.toString()
    })

    const html = await response.text()
    console.log(`Downloaded HTML for DOT ${dotNumber}, length: ${html.length}`)
    
    // Test the parsing logic
    const result = parseCarrierHTML(html, dotNumber)
    console.log('Parsed result:', result)
    
  } catch (error) {
    console.error('Error downloading HTML:', error)
  }
}

function parseCarrierHTML(html: string, dotNumber: string) {
  const data: any = {
    dot_number: dotNumber
  }

  try {
    // Load HTML into Cheerio for DOM parsing
    const $ = cheerio.load(html)

    // Helper function to clean text
    const cleanText = (text: string | null): string | undefined => {
      if (!text) return undefined
      return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
    }

    // Helper function to extract table values using DOM selectors
    const extractTableValue = (label: string): string | null => {
      console.log(`\n--- Extracting ${label} ---`)
      
      // Try multiple selectors to find the field
      const selectors = [
        `td:contains("${label}") + td`,
        `th:contains("${label}") + td`,
        `td:contains("${label}")`,
        `th:contains("${label}")`
      ]

      for (const selector of selectors) {
        const element = $(selector).first()
        if (element.length > 0) {
          console.log(`Found element with selector: ${selector}`)
          const text = cleanText(element.text())
          console.log(`Raw text: "${text}"`)
          if (text && text !== label) {
            return text
          }
        }
      }

      // Try a more specific approach for SAFER's table structure
      const labelElement = $(`th:contains("${label}"), td:contains("${label}")`).first()
      if (labelElement.length > 0) {
        console.log(`Found label element for ${label}`)
        const row = labelElement.closest('tr')
        if (row.length > 0) {
          const dataCell = row.find('td').not(`:contains("${label}")`).first()
          if (dataCell.length > 0) {
            const text = cleanText(dataCell.text())
            console.log(`Data cell text: "${text}"`)
            return text
          }
        }
      }

      console.log(`No element found for ${label}`)
      return null
    }

    // Specialized extraction for complex fields with checkboxes
    const extractCheckboxField = (label: string): string[] => {
      console.log(`\n--- Extracting ${label} with checkbox method ---`)
      
      // Find the section containing the label
      const labelElement = $(`th:contains("${label}"), td:contains("${label}")`).first()
      if (labelElement.length === 0) {
        console.log(`No label element found for ${label}`)
        return []
      }
      
      console.log(`Found label element for ${label}`)
      
      // Look for the table structure that contains the checkboxes
      // The checkboxes are typically in a nested table structure
      const section = labelElement.closest('tr').nextAll('tr').filter(function() {
        const hasTable = $(this).find('table').length > 0
        const hasX = $(this).text().includes('X')
        return hasTable || hasX
      }).first()
      
      if (section.length === 0) {
        console.log(`No checkbox section found for ${label}`)
        return []
      }
      
      console.log(`Found checkbox section for ${label}`)
      
      const checkedItems: string[] = []
      
      // Look for cells containing "X" and get the next cell's text
      section.find('td').each(function() {
        const text = $(this).text().trim()
        if (text === 'X') {
          const nextCell = $(this).next('td')
          if (nextCell.length > 0) {
            const item = nextCell.text().trim()
            if (item && item.length > 0 && item.length < 50) {
              console.log(`Found checked item: ${item}`)
              checkedItems.push(item)
            }
          }
        }
      })
      
      // If no X marks found, try a different approach - look for the entire section
      if (checkedItems.length === 0) {
        console.log(`No X marks found, trying alternative approach for ${label}`)
        
        // Look for the entire section text and extract items that look like cargo types
        const sectionText = section.text()
        console.log(`Section text: ${sectionText.substring(0, 200)}...`)
        
        // Common cargo types and operations to look for
        const commonItems = [
          'Interstate', 'Intrastate Only (HM)', 'Intrastate Only (Non-HM)',
          'General Freight', 'Household Goods', 'Fresh Produce', 'Commodities Dry Bulk',
          'Refrigerated Food', 'OTHER', 'Auth. For Hire', 'Exempt For Hire', 'Private(Property)'
        ]
        
        for (const item of commonItems) {
          if (sectionText.includes(item)) {
            console.log(`Found item in section: ${item}`)
            checkedItems.push(item)
          }
        }
      }
      
      console.log(`Final items for ${label}:`, checkedItems)
      return checkedItems
    }

    // Extract Legal Name with better fallbacks
    let legalName = extractTableValue('Legal Name')
    
    // Debug logging
    console.log(`DOT ${dotNumber} - Legal Name extraction:`, legalName)
    
    // Validate the extracted legal name
    if (legalName && (legalName.length > 200 || 
        legalName.includes('Query Result') || 
        legalName.includes('SAFER Table Layout') ||
        legalName.includes('Information') ||
        legalName.includes('USDOT Number') ||
        legalName.includes('MC/MX Number') ||
        legalName.includes('Enter Value') ||
        legalName.includes('Search Criteria'))) {
      console.log(`DOT ${dotNumber} - Invalid legal name extracted:`, legalName)
      legalName = null
    }

    // Fallback 1: Extract from page title
    if (!legalName) {
      const title = $('title').text()
      if (title && title.includes('Company Snapshot')) {
        const titleMatch = title.match(/Company Snapshot\s+(.+)/i)
        if (titleMatch && titleMatch[1]) {
          legalName = cleanText(titleMatch[1])
          console.log(`DOT ${dotNumber} - Legal name from title:`, legalName)
        }
      }
    }

    // Fallback 2: Pattern matching for company names
    if (!legalName) {
      const bodyText = $('body').text()
      const companyPatterns = [
        /([A-Z][A-Z\s&.,'-]+(?:LLC|INC|CORP|LTD|CO|COMPANY|SERVICES|TRANSPORT|TRUCKING|LOGISTICS))/i,
        /([A-Z][A-Z\s&.,'-]{3,50})/i
      ]
      
      for (const pattern of companyPatterns) {
        const match = bodyText.match(pattern)
        if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
          legalName = cleanText(match[1])
          console.log(`DOT ${dotNumber} - Legal name from pattern:`, legalName)
          break
        }
      }
    }

    // Final fallback
    if (!legalName) {
      legalName = `Carrier ${dotNumber}`
      console.log(`DOT ${dotNumber} - Using fallback legal name:`, legalName)
    }

    data.legal_name = legalName

    // Extract other fields with debugging
    data.dba_name = extractTableValue('DBA Name') || null
    data.physical_address = extractTableValue('Physical Address') || null
    data.entity_type = extractTableValue('Entity Type') || null
    data.operating_status = extractTableValue('Operating Status') || null
    
    // Use specialized extraction for complex checkbox fields
    const carrierOperations = extractCheckboxField('Carrier Operation')
    data.carrier_operation = carrierOperations.length > 0 ? carrierOperations : null
    
    const cargoTypes = extractCheckboxField('Cargo Carried')
    data.equipment_types = cargoTypes.length > 0 ? cargoTypes : null

    return {
      success: true,
      data
    }

  } catch (error) {
    console.error(`Error parsing HTML for DOT ${dotNumber}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    }
  }
}

// Run the test
testRealCompany().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
}) 