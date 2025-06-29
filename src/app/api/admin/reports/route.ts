import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const { reportId, updates } = await request.json()
    
    if (!reportId || !updates) {
      return NextResponse.json(
        { error: 'Report ID and updates are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Check if user is authenticated and admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Add resolved_by if status is being changed to resolved/rejected
    if (updates.status === 'resolved' || updates.status === 'rejected') {
      updates.resolved_by = user.id
    }

    // Update the report
    const { data, error } = await supabase
      .from('carrier_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      )
    }

    // Log admin activity
    await supabase.rpc('log_admin_activity', {
      p_action: 'update_report',
      p_entity_type: 'carrier_report',
      p_entity_id: reportId,
      p_details: {
        old_status: data.status,
        new_status: updates.status,
        admin_response: updates.admin_response
      }
    })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}