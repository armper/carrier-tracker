import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin status - only super admins can manage users
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { userId, role, is_admin } = await request.json()

    if (!userId || !role || typeof is_admin !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Prevent self-modification
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify own role' }, { status: 400 })
    }

    // Validate role values
    const validRoles = ['user', 'admin', 'super_admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Create service role client for admin operations (bypasses RLS)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update user role using service role (bypasses RLS)
    const { data: updatedProfile, error: updateError } = await serviceSupabase
      .from('profiles')
      .update({ 
        role: role,
        is_admin: is_admin,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update user role',
        message: updateError.message,
        details: updateError 
      }, { status: 500 })
    }

    // Log admin activity
    try {
      await serviceSupabase.rpc('log_admin_activity', {
        p_action: 'update_user_role',
        p_entity_type: 'user',
        p_entity_id: userId,
        p_details: {
          previous_role: 'unknown', // We could fetch this if needed
          new_role: role,
          is_admin: is_admin
        }
      })
    } catch (activityError) {
      console.warn('Admin activity logging failed:', activityError)
      // Continue without failing the user update
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedProfile 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}