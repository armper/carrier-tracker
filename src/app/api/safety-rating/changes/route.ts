import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET - Get recent safety rating changes across all carriers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('days') || '30')
    const userId = searchParams.get('user_id')
    
    const supabase = await createClient()
    
    // Get current user if not provided
    let currentUser = null
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      currentUser = user
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId || currentUser?.id)
      .single()

    // Get recent safety rating changes
    const { data: changes, error } = await supabase
      .rpc('get_recent_safety_rating_changes', { days_back: daysBack })

    if (error) {
      console.error('Error fetching recent safety rating changes:', error)
      return NextResponse.json({ error: 'Failed to fetch changes' }, { status: 500 })
    }

    // If not admin, filter to only carriers the user has saved
    let filteredChanges = changes || []
    
    if (!profile?.is_admin && (userId || currentUser)) {
      const { data: savedCarriers, error: savedError } = await supabase
        .from('saved_carriers')
        .select('carrier_id')
        .eq('user_id', userId || currentUser?.id)

      if (savedError) {
        console.error('Error fetching saved carriers:', savedError)
        return NextResponse.json({ error: 'Failed to fetch saved carriers' }, { status: 500 })
      }

      const savedCarrierIds = savedCarriers?.map(sc => sc.carrier_id) || []
      filteredChanges = changes?.filter(change => 
        savedCarrierIds.includes(change.carrier_id)
      ) || []
    }

    // Categorize changes by severity
    const categorized = {
      critical: filteredChanges.filter(c => 
        (c.old_rating === 'satisfactory' && c.new_rating !== 'satisfactory') ||
        (c.new_rating === 'unsatisfactory')
      ),
      warning: filteredChanges.filter(c => 
        (c.old_rating === 'conditional' && c.new_rating === 'unsatisfactory') ||
        (c.old_rating === 'satisfactory' && c.new_rating === 'conditional')
      ),
      positive: filteredChanges.filter(c => 
        (c.old_rating === 'unsatisfactory' && c.new_rating !== 'unsatisfactory') ||
        (c.old_rating === 'conditional' && c.new_rating === 'satisfactory')
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        all_changes: filteredChanges,
        categorized,
        summary: {
          total: filteredChanges.length,
          critical: categorized.critical.length,
          warning: categorized.warning.length,
          positive: categorized.positive.length,
          days_back: daysBack
        }
      }
    })

  } catch (error) {
    console.error('Unexpected error in safety rating changes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Manually record a safety rating change (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { carrier_id, new_rating, change_reason, notes } = body

    if (!carrier_id || !new_rating) {
      return NextResponse.json({ 
        error: 'carrier_id and new_rating are required' 
      }, { status: 400 })
    }

    // Get current carrier rating
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('safety_rating')
      .eq('id', carrier_id)
      .single()

    if (carrierError || !carrier) {
      return NextResponse.json({ error: 'Carrier not found' }, { status: 404 })
    }

    // Don't create history if rating hasn't changed
    if (carrier.safety_rating === new_rating) {
      return NextResponse.json({ 
        success: true,
        message: 'No change detected - rating is already ' + new_rating 
      })
    }

    // Update carrier safety rating (this will trigger the history tracking)
    const { error: updateError } = await supabase
      .from('carriers')
      .update({ 
        safety_rating: new_rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', carrier_id)

    if (updateError) {
      console.error('Error updating carrier safety rating:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update carrier rating' 
      }, { status: 500 })
    }

    // Update the history record with additional info if provided
    if (change_reason || notes) {
      const { error: historyUpdateError } = await supabase
        .from('safety_rating_history')
        .update({ 
          change_reason,
          notes 
        })
        .eq('carrier_id', carrier_id)
        .eq('new_rating', new_rating)
        .order('change_date', { ascending: false })
        .limit(1)
    }

    return NextResponse.json({
      success: true,
      message: `Safety rating updated from ${carrier.safety_rating} to ${new_rating}`,
      data: {
        carrier_id,
        old_rating: carrier.safety_rating,
        new_rating,
        change_reason
      }
    })

  } catch (error) {
    console.error('Unexpected error in safety rating change POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}