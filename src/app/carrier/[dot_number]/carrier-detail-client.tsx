'use client'

import { useState, useEffect } from 'react'
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
  // Insurance tracking fields
  insurance_expiry_date: string | null
  insurance_carrier: string | null
  insurance_policy_number: string | null
  insurance_amount: number | null
  insurance_effective_date: string | null
  insurance_last_verified: string | null
}

interface CarrierDetailClientProps {
  carrier: Carrier
}

export default function CarrierDetailClient({ carrier }: CarrierDetailClientProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState({
    issue_type: '',
    description: ''
  })
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const supabase = createClient()

  // Check if carrier is already saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: savedCarrier } = await supabase
          .from('saved_carriers')
          .select('id')
          .eq('user_id', user.id)
          .eq('carrier_id', carrier.id)
          .single()
        
        setIsSaved(!!savedCarrier)
      }
      setIsLoading(false)
    }
    checkSavedStatus()
  }, [supabase, carrier.id])

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
        setIsSaved(true)
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

  const handleReportSubmit = async () => {
    if (!reportData.issue_type || !reportData.description.trim()) {
      setReportMessage('❌ Please select an issue type and provide a description')
      return
    }

    setIsSubmittingReport(true)
    setReportMessage('')

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setReportMessage('❌ Please log in to report issues')
        setIsSubmittingReport(false)
        return
      }

      const { error } = await supabase
        .from('carrier_reports')
        .insert({
          carrier_id: carrier.id,
          user_id: user.id,
          issue_type: reportData.issue_type,
          description: reportData.description.trim()
        })

      if (error) {
        console.error('Report submission error:', error)
        setReportMessage('❌ Failed to submit report. Please try again.')
      } else {
        setReportMessage('✅ Report submitted successfully! Our team will review it.')
        setReportData({ issue_type: '', description: '' })
        setTimeout(() => {
          setShowReportModal(false)
          setReportMessage('')
        }, 2000)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setReportMessage('❌ Unexpected error occurred')
    }

    setIsSubmittingReport(false)
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

        {/* Insurance Information */}
        {(carrier.insurance_expiry_date || carrier.insurance_carrier || carrier.insurance_policy_number || carrier.insurance_amount) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carrier.insurance_carrier && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Carrier</label>
                  <p className="text-gray-900">{carrier.insurance_carrier}</p>
                </div>
              )}
              
              {carrier.insurance_policy_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                  <p className="text-gray-900 font-mono">{carrier.insurance_policy_number}</p>
                </div>
              )}
              
              {carrier.insurance_amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount</label>
                  <p className="text-gray-900">${carrier.insurance_amount.toLocaleString()}</p>
                </div>
              )}
              
              {carrier.insurance_effective_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                  <p className="text-gray-900">{new Date(carrier.insurance_effective_date).toLocaleDateString()}</p>
                </div>
              )}
              
              {carrier.insurance_expiry_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900">{new Date(carrier.insurance_expiry_date).toLocaleDateString()}</p>
                    {(() => {
                      const expiryDate = new Date(carrier.insurance_expiry_date)
                      const today = new Date()
                      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      
                      if (daysUntilExpiry < 0) {
                        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded border border-red-200">EXPIRED</span>
                      } else if (daysUntilExpiry <= 7) {
                        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded border border-red-200">Expires in {daysUntilExpiry} days</span>
                      } else if (daysUntilExpiry <= 15) {
                        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded border border-orange-200">Expires in {daysUntilExpiry} days</span>
                      } else if (daysUntilExpiry <= 30) {
                        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded border border-yellow-200">Expires in {daysUntilExpiry} days</span>
                      }
                      return null
                    })()}
                  </div>
                </div>
              )}
              
              {carrier.insurance_last_verified && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Verified</label>
                  <p className="text-gray-900">{new Date(carrier.insurance_last_verified).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Save to Dashboard */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Save for Monitoring</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add this carrier to your dashboard to track changes and receive alerts.
          </p>
          {isLoading ? (
            <div className="w-full px-4 py-3 bg-gray-100 text-gray-600 rounded-md text-center font-medium">
              Loading...
            </div>
          ) : isSaved ? (
            <div className="w-full px-4 py-3 bg-green-100 text-green-800 rounded-md text-center font-medium">
              ✓ Saved to Dashboard
            </div>
          ) : (
            <button
              onClick={handleSaveCarrier}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isSaving ? 'Saving...' : 'Save to Dashboard'}
            </button>
          )}
          {saveMessage && (
            <p className="mt-3 text-sm text-center">{saveMessage}</p>
          )}
        </div>

        {/* Report Issue */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Issue</h3>
          <p className="text-sm text-gray-600 mb-4">
            Found incorrect or outdated information? Help us improve data quality.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
          >
            Report Data Issue
          </button>
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

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Report Data Issue</h3>
              <p className="text-sm text-gray-600 mt-1">
                Help us improve data quality for {carrier.legal_name}
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type
                </label>
                <select
                  value={reportData.issue_type}
                  onChange={(e) => setReportData(prev => ({ ...prev, issue_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select an issue type</option>
                  <option value="incorrect_name">Incorrect Company Name</option>
                  <option value="wrong_rating">Wrong Safety Rating</option>
                  <option value="outdated_info">Outdated Information</option>
                  <option value="incorrect_address">Incorrect Address</option>
                  <option value="wrong_phone">Wrong Phone Number</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Please describe the issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {reportMessage && (
                <div className="text-sm text-center p-2 rounded-md bg-gray-50">
                  {reportMessage}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportData({ issue_type: '', description: '' })
                  setReportMessage('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={isSubmittingReport}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}