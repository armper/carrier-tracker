'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import SafetyRatingTrend from '@/components/SafetyRatingTrend'
import InsuranceStatus from '@/components/InsuranceStatus'
import InsuranceUpdateForm from '@/components/InsuranceUpdateForm'
import RateDisplay from '@/components/RateDisplay'
import RateSubmissionForm from '@/components/RateSubmissionForm'
import CarrierRatings from '@/components/CarrierRatings'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string | null
  insurance_status: string | null
  authority_status: string | null
  state: string | null
  city: string | null
  vehicle_count: number | null
  driver_count: number | null
  entity_type: string | null
  created_at: string
  updated_at: string
  // Insurance fields removed - using crowd-sourced data instead
}

interface CarrierDetailClientProps {
  carrier: Carrier
}

export default function CarrierDetailClient({ carrier }: CarrierDetailClientProps) {
  console.log('CarrierDetailClient received carrier:', carrier)
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
  const [showInsuranceForm, setShowInsuranceForm] = useState(false)
  const [insuranceKey, setInsuranceKey] = useState(0)
  const [showRateForm, setShowRateForm] = useState(false)
  const [rateKey, setRateKey] = useState(0)
  const supabase = createClient()

  // Check if carrier is already saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: savedCarrier, error } = await supabase
          .from('saved_carriers')
          .select('id')
          .eq('user_id', user.id)
          .eq('carrier_id', carrier.id)
          .maybeSingle()
        
        // If error is PGRST116 (no rows), that's expected when carrier is not saved
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking saved status:', error)
        }
        
        setIsSaved(!!savedCarrier)
      }
      setIsLoading(false)
    }
    checkSavedStatus()
  }, [supabase, carrier.id])

  const getSafetyRatingColor = (rating: string | null) => {
    if (!rating) return 'bg-gray-100 text-gray-800 border-gray-200'
    
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

  const handleInsuranceUpdate = () => {
    setShowInsuranceForm(true)
  }

  const handleInsuranceSuccess = () => {
    setInsuranceKey(prev => prev + 1)
  }

  const handleRateSubmission = () => {
    setShowRateForm(true)
  }

  const handleRateSuccess = () => {
    setRateKey(prev => prev + 1)
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
            
            {carrier.entity_type === 'CARRIER' && (
              <div>
                <div className="flex items-center space-x-1 mb-2">
                  <label className="block text-sm font-medium text-gray-700">Insurance Status</label>
                  <div className="relative group">
                    <button className="text-gray-400 hover:text-gray-600 cursor-help" type="button">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-64 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <div className="mb-1 font-medium">⚠️ User-Contributed Data</div>
                      <div className="text-gray-200">
                        This is crowd-sourced data. Always verify insurance coverage directly with the carrier.
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <InsuranceStatus 
                  key={insuranceKey}
                  carrierId={carrier.id} 
                  showDetails={false}
                  onUpdateClick={handleInsuranceUpdate}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Authority Status</label>
              <div className={`inline-block px-4 py-2 rounded-lg border text-sm font-medium ${getStatusColor(carrier.authority_status || 'Unknown')}`}>
                {carrier.authority_status || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Information - Only for carriers */}
        {carrier.entity_type === 'CARRIER' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-semibold text-gray-900">Insurance Information</h2>
                <div className="relative group">
                  <button className="text-gray-400 hover:text-gray-600 cursor-help" type="button">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-72 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="mb-1 font-medium">⚠️ User-Contributed Data</div>
                    <div className="text-gray-200">
                      This insurance information is crowd-sourced from users. Always verify insurance coverage directly with the carrier or their insurance provider before making business decisions.
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleInsuranceUpdate}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
              >
                Update Insurance Info
              </button>
            </div>
            <InsuranceStatus 
              key={insuranceKey}
              carrierId={carrier.id} 
              showDetails={true}
            />
          </div>
        )}

        {/* Rate Per Mile Information - Only for carriers */}
        {carrier.entity_type === 'CARRIER' && (
          <RateDisplay 
            key={rateKey}
            carrierId={carrier.id}
            carrierName={carrier.legal_name}
            onSubmitRate={handleRateSubmission}
          />
        )}

        {/* Safety Rating History */}
        <SafetyRatingTrend carrierId={carrier.id} />

        {/* Carrier Ratings & Reviews */}
        <CarrierRatings 
          carrierId={carrier.id}
          carrierName={carrier.legal_name}
        />
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
            {carrier.entity_type === 'CARRIER' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Insurance</span>
                <InsuranceStatus 
                  key={insuranceKey}
                  carrierId={carrier.id} 
                  showDetails={false}
                />
              </div>
            )}
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
                  aria-label="Select issue type"
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
      
      {/* Insurance Update Form Modal - Only for carriers */}
      {showInsuranceForm && carrier.entity_type === 'CARRIER' && (
        <InsuranceUpdateForm
          carrierId={carrier.id}
          carrierName={carrier.legal_name}
          onClose={() => setShowInsuranceForm(false)}
          onSuccess={handleInsuranceSuccess}
        />
      )}

      {/* Rate Submission Form Modal - Only for carriers */}
      {showRateForm && carrier.entity_type === 'CARRIER' && (
        <RateSubmissionForm
          carrierId={carrier.id}
          carrierName={carrier.legal_name}
          onClose={() => setShowRateForm(false)}
          onSuccess={handleRateSuccess}
        />
      )}
    </div>
  )
}