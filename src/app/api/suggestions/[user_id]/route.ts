import { createClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user_id: userId } = await params

    // Verify user authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is requesting their own suggestions or is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (user.id !== userId && !profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get active suggestions for the user
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('user_suggestions')
      .select(`
        id,
        suggestion_type,
        title,
        description,
        carrier_ids,
        metadata,
        priority,
        created_at,
        expires_at
      `)
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (suggestionsError) {
      console.error('Error fetching suggestions:', suggestionsError)
      return Response.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    // For each suggestion, fetch the carrier details
    const enrichedSuggestions = await Promise.all(
      (suggestions || []).map(async (suggestion) => {
        if (!suggestion.carrier_ids || suggestion.carrier_ids.length === 0) {
          return { ...suggestion, carriers: [] }
        }

        const { data: carriers, error: carriersError } = await supabase
          .from('carriers')
          .select(`
            id,
            dot_number,
            legal_name,
            dba_name,
            safety_rating,
            insurance_status,
            authority_status,
            state,
            city,
            vehicle_count,
            phone
          `)
          .in('id', suggestion.carrier_ids)

        if (carriersError) {
          console.error('Error fetching carrier details:', carriersError)
          return { ...suggestion, carriers: [] }
        }

        return {
          ...suggestion,
          carriers: carriers || []
        }
      })
    )

    return Response.json({
      suggestions: enrichedSuggestions,
      count: enrichedSuggestions.length
    })

  } catch (error) {
    console.error('Unexpected error in suggestions API:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user_id: userId } = await params

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check authorization
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, suggestion_id, carrier_id } = body

    if (!action || !suggestion_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Record the interaction
    const { error: interactionError } = await supabase
      .from('suggestion_interactions')
      .insert({
        suggestion_id,
        user_id: userId,
        action_type: action,
        carrier_id: carrier_id || null
      })

    if (interactionError) {
      console.error('Error recording suggestion interaction:', interactionError)
    }

    // Handle specific actions
    switch (action) {
      case 'dismiss':
        const { error: dismissError } = await supabase
          .from('user_suggestions')
          .update({ is_dismissed: true })
          .eq('id', suggestion_id)
          .eq('user_id', userId)

        if (dismissError) {
          return Response.json({ error: 'Failed to dismiss suggestion' }, { status: 500 })
        }
        break

      case 'save_carrier':
        if (!carrier_id) {
          return Response.json({ error: 'Carrier ID required for save action' }, { status: 400 })
        }

        // Check if carrier is already saved
        const { data: existingSave } = await supabase
          .from('saved_carriers')
          .select('id')
          .eq('user_id', userId)
          .eq('carrier_id', carrier_id)
          .single()

        if (!existingSave) {
          const { error: saveError } = await supabase
            .from('saved_carriers')
            .insert({
              user_id: userId,
              carrier_id: carrier_id,
              notes: 'Added from smart suggestion'
            })

          if (saveError) {
            return Response.json({ error: 'Failed to save carrier' }, { status: 500 })
          }
        }
        break
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Unexpected error in suggestions POST:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}