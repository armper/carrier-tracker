import { createClient } from '@/lib/supabase-server'
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

    console.log('Adding test carriers for scraping...')

    // Add some real DOT numbers that should exist in SAFER
    const testCarriers = [
      { dot_number: '1174814', legal_name: 'Test Carrier 1' },
      { dot_number: '2317163', legal_name: 'Test Carrier 2' },
      { dot_number: '3458503', legal_name: 'Test Carrier 3' },
      { dot_number: '2345678', legal_name: 'Test Carrier 4' },
      { dot_number: '1896543', legal_name: 'Test Carrier 5' }
    ]

    const insertResults = []

    for (const carrier of testCarriers) {
      // Check if carrier already exists
      const { data: existing } = await supabase
        .from('carriers')
        .select('id')
        .eq('dot_number', carrier.dot_number)
        .single()

      if (!existing) {
        // Insert new carrier
        const { data, error } = await supabase
          .from('carriers')
          .insert({
            dot_number: carrier.dot_number,
            legal_name: carrier.legal_name,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error(`Failed to insert carrier ${carrier.dot_number}:`, error)
          insertResults.push({ dot_number: carrier.dot_number, success: false, error: error.message })
        } else {
          insertResults.push({ dot_number: carrier.dot_number, success: true, id: data?.id })
        }
      } else {
        // Just mark as existing for now
        console.log(`Carrier ${carrier.dot_number} already exists`)
        insertResults.push({ dot_number: carrier.dot_number, success: true, existing: true })
      }
    }

    const successful = insertResults.filter(r => r.success).length
    const failed = insertResults.filter(r => !r.success).length

    console.log('Insert results:', insertResults)
    console.log('Successful:', successful, 'Failed:', failed)

    return Response.json({
      success: true,
      message: `Prepared ${successful} test carriers for scraping`,
      results: insertResults,
      summary: {
        successful,
        failed,
        total: testCarriers.length
      },
      debug: {
        insertResults,
        successfulCount: successful,
        failedCount: failed
      }
    })

  } catch (error) {
    console.error('Add test carriers error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}