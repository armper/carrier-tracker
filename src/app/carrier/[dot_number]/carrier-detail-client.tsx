'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string
  insurance_status: string
  authority_status: string
  carb_compliance: boolean
  state: string | null
  city: string | null
  vehicle_count: number | null
}

interface CarrierDetailClientProps {
  carrier: Carrier
}

export default function CarrierDetailClient({ carrier }: CarrierDetailClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const supabase = createClient()

  const getSafetyRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unsatisfactory':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  const handleSaveCarrier = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        setSaveMessage('❌ Authentication error. Please try logging in again.')
        setIsSaving(false)
        return
      }
      
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      // Verify user profile exists, create if it doesn't
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          })

        if (createError) {
          console.error('Failed to create profile:', createError)
          setSaveMessage('❌ Failed to create user profile. Please try again.')
          setIsSaving(false)
          return
        }
      } else if (profileError) {
        console.error('Profile error:', profileError)
        setSaveMessage('❌ Error checking user profile. Please try again.')
        setIsSaving(false)
        return
      }

      const { error } = await supabase
        .from('saved_carriers')
        .insert({
          user_id: user.id,
          carrier_id: carrier.id
        })

      if (!error) {
        setSaveMessage('✅ Carrier saved to your dashboard!')
      } else if (error.code === '23505') {
        setSaveMessage('ℹ️ This carrier is already in your saved list!')
      } else if (error.code === '23503') {
        console.error('Foreign key violation:', error)
        setSaveMessage('❌ Data error. Please refresh the page and try again.')
      } else {
        console.error('Save carrier error:', error)
        setSaveMessage(`❌ Error: ${error.message}`)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setSaveMessage('❌ Unexpected error occurred')
    }

    setIsSaving(false)
    
    // Clear message after 5 seconds (longer for error messages)
    setTimeout(() => setSaveMessage(''), 5000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Name</label>
              <p className="text-gray-900">{carrier.legal_name}</p>
            </div>
            {carrier.dba_name && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DBA Name</label>
                <p className="text-gray-900">{carrier.dba_name}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DOT Number</label>
              <p className="text-gray-900 font-mono">{carrier.dot_number}</p>
            </div>
            {carrier.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">
                  <a href={`tel:${carrier.phone}`} className="text-blue-600 hover:text-blue-800">
                    {carrier.phone}
                  </a>
                </p>
              </div>
            )}
          </div>
          
          {carrier.physical_address && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
              <p className="text-gray-900">{carrier.physical_address}</p>
            </div>
          )}

          {(carrier.city || carrier.state) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {carrier.city && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-900">{carrier.city}</p>
                </div>
              )}
              {carrier.state && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <p className="text-gray-900">{carrier.state}</p>
                </div>
              )}
            </div>
          )}

          {carrier.vehicle_count && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Size</label>
              <p className="text-gray-900">{carrier.vehicle_count} vehicles</p>
            </div>
          )}
        </div>

        {/* Compliance & Safety */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance & Safety</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Safety Rating</label>
              <div className={`inline-block px-4 py-2 rounded-lg border text-sm font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
                {carrier.safety_rating}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Status</label>
              <div className={`inline-block px-4 py-2 rounded-lg border text-sm font-medium ${getStatusColor(carrier.insurance_status)}`}>
                {carrier.insurance_status}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authority Status</label>
              <div className={`inline-block px-4 py-2 rounded-lg border text-sm font-medium ${getStatusColor(carrier.authority_status)}`}>
                {carrier.authority_status}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CARB Compliance</label>
              <div className={`inline-block px-4 py-2 rounded-lg border text-sm font-medium ${
                carrier.carb_compliance ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
              }`}>
                {carrier.carb_compliance ? 'Compliant' : 'Non-Compliant'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Save to Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Save for Monitoring</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add this carrier to your dashboard to track changes and receive alerts.
          </p>
          <button
            onClick={handleSaveCarrier}
            disabled={isSaving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSaving ? 'Saving...' : 'Save to Dashboard'}
          </button>
          {saveMessage && (
            <p className="mt-3 text-sm text-center">{saveMessage}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">DOT Number</span>
              <span className="text-sm font-medium text-gray-900 font-mono">{carrier.dot_number}</span>
            </div>
            {carrier.vehicle_count && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fleet Size</span>
                <span className="text-sm font-medium text-gray-900">{carrier.vehicle_count}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Safety Rating</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getSafetyRatingColor(carrier.safety_rating)}`}>
                {carrier.safety_rating}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Insurance</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(carrier.insurance_status)}`}>
                {carrier.insurance_status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}