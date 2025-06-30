import { createClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

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

    // Check authorization - user can generate their own suggestions or admin can generate for anyone
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (user.id !== userId && !profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Call the database function to generate suggestions
    const { data, error } = await supabase.rpc('generate_user_suggestions', {
      p_user_id: userId
    })

    if (error) {
      console.error('Error generating suggestions:', error)
      return Response.json({ error: 'Failed to generate suggestions' }, { status: 500 })
    }

    // Fetch the newly generated suggestions
    const { data: suggestions, error: fetchError } = await supabase
      .from('user_suggestions')
      .select(`
        id,
        suggestion_type,
        title,
        description,
        carrier_ids,
        metadata,
        priority,
        created_at
      `)
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching generated suggestions:', fetchError)
      return Response.json({ error: 'Failed to fetch generated suggestions' }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'Suggestions generated successfully',
      count: suggestions?.length || 0,
      suggestions: suggestions || []
    })

  } catch (error) {
    console.error('Unexpected error in generate suggestions:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}