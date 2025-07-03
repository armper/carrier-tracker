'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import SafetyRatingTrend from '@/components/SafetyRatingTrend'
import InsuranceStatusWithVoting from '@/components/InsuranceStatusWithVoting'
import InsuranceLookupGuide from '@/components/InsuranceLookupGuide'
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
  email: string | null
  safety_rating: string | null
  insurance_status: string | null
  authority_status: string | null
  state: string | null
  city: string | null
  vehicle_count: number | null
  entity_type: string | null
  mc_number: string | null
  created_at: string
}

interface CarrierDetailClientSocialProps {
  carrier: Carrier
}

export default function CarrierDetailClientSocial({ carrier }: CarrierDetailClientSocialProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState({
    issue_type: '',
    description: ''
  })
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [showInsuranceLookup, setShowInsuranceLookup] = useState(false)
  const [insuranceKey, setInsuranceKey] = useState(0)
  const [showRateForm, setShowRateForm] = useState(false)
  const [rateKey, setRateKey] = useState(0)
  const [showCompactInfo, setShowCompactInfo] = useState(false)
  const [activeTab, setActiveTab] = useState<'rates' | 'community'>('rates')
  const supabase = createClient()

  useEffect(() => {
    checkIfSaved()
  }, [carrier.id])

  const checkIfSaved = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_carriers')
        .select('id')
        .eq('carrier_id', carrier.id)
        .single()

      if (data) {
        setIsSaved(true)
      }
    } catch (error) {
      // Not saved - this is fine
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCarrier = async () => {
    setIsSaving(true)
    setSaveMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setSaveMessage('⚠️ Please log in to save carriers')
        return
      }

      const { error } = await supabase
        .from('saved_carriers')
        .insert([{
          user_id: user.id,
          carrier_id: carrier.id,
          notes: `Added ${carrier.legal_name} for monitoring`
        }])

      if (error) {
        if (error.code === '23505') {
          setSaveMessage('ℹ️ Carrier already saved to your dashboard')
        } else {
          throw error
        }
      } else {
        setIsSaved(true)
        setSaveMessage('✅ Carrier saved to dashboard successfully!')
      }
    } catch (error) {
      console.error('Error saving carrier:', error)
      setSaveMessage('❌ Failed to save carrier. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInsuranceLookup = () => {
    setShowInsuranceLookup(true)
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

  const getSafetyRatingColor = (rating: string | null) => {
    if (!rating) return 'bg-gray-100 text-gray-800'
    
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-100 text-green-800'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800'
      case 'unsatisfactory':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Social First */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            {/* Carrier Identity & Social Proof */}
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 14.846 4.632 16 6.414 16h7.172a1 1 0 000-2H6.414l1-1h7.586a1 1 0 00.951-.69L17.5 5H5.414a1 1 0 00-.993.883L4.16 8H3a1 1 0 100 2z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{carrier.legal_name}</h1>
                  {carrier.dba_name && (
                    <p className="text-lg text-gray-600">"{carrier.dba_name}"</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm font-medium text-gray-500">DOT: {carrier.dot_number}</span>
                    {carrier.mc_number && (
                      <span className="text-sm font-medium text-gray-500">MC: {carrier.mc_number}</span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
                      {carrier.safety_rating || 'Not Rated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Metrics */}
              <div className="grid grid-cols-2 md:flex md:items-center md:space-x-8 gap-4 md:gap-0">
                <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <div className="text-sm">
                    <span className="font-bold text-yellow-700">4.2</span>
                    <span className="text-yellow-600 ml-1">(24 reviews)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium text-green-700">87% recommend</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium text-blue-700">42 discussions</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-purple-50 rounded-lg border border-purple-200">
                  <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                  </svg>
                  <span className="text-sm font-medium text-purple-700">156 watching</span>
                </div>
              </div>
            </div>

            {/* Primary CTAs */}
            <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleRateSubmission}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Share Rate Info
              </button>
              <button className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Rate Carrier
              </button>
              {!isSaved && (
                <button
                  onClick={handleSaveCarrier}
                  disabled={isSaving || isLoading}
                  className="px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                  {isSaving ? 'Saving...' : 'Watch'}
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity Indicator */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">3 users</span> active in last hour
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Latest: Rate update 12min ago
                </div>
              </div>
              <button
                onClick={() => setShowCompactInfo(!showCompactInfo)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className={`w-4 h-4 mr-2 transition-transform ${showCompactInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
                {showCompactInfo ? 'Hide' : 'Show'} carrier details
              </button>
            </div>
            
            {showCompactInfo && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {carrier.phone && (
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        <a href={`tel:${carrier.phone}`} className="text-blue-600 hover:text-blue-800">
                          {carrier.phone}
                        </a>
                      </div>
                    )}
                    {carrier.physical_address && (
                      <div className="flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>{carrier.physical_address}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Insurance</h4>
                  <InsuranceStatusWithVoting 
                    carrierId={carrier.id} 
                    showDetails={false}
                    onUpdateClick={handleInsuranceLookup}
                    refreshTrigger={insuranceKey}
                  />
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Fleet Info</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {carrier.vehicle_count && (
                      <div>Vehicles: {carrier.vehicle_count}</div>
                    )}
                    <div>Authority: {carrier.authority_status || 'Unknown'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Social Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('rates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Rates & Pay
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'community'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Reviews & Discussion
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'rates' && (
          <div className="space-y-8">
            {/* Rate Information - Prominent */}
            {carrier.entity_type === 'CARRIER' && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Rate Per Mile Information</h2>
                    <p className="text-gray-600 mt-1">Community-sourced pay rates and terms</p>
                  </div>
                  <button
                    onClick={handleRateSubmission}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    💡 Share Rate Info
                  </button>
                </div>
                <RateDisplay 
                  key={rateKey}
                  carrierId={carrier.id}
                  carrierName={carrier.legal_name}
                  onSubmitRate={handleRateSubmission}
                />
              </div>
            )}

            {/* Safety Rating Trend */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Safety Performance</h2>
              <SafetyRatingTrend carrierId={carrier.id} />
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="space-y-8">
            {/* Carrier Ratings & Reviews - Prominent */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <CarrierRatings 
                carrierId={carrier.id}
                carrierName={carrier.legal_name}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInsuranceLookup && carrier.entity_type === 'CARRIER' && (
        <InsuranceLookupGuide
          carrierId={carrier.id}
          carrierName={carrier.legal_name}
          dotNumber={carrier.dot_number}
          mcNumber={carrier.mc_number}
          onClose={() => setShowInsuranceLookup(false)}
          onSuccess={handleInsuranceSuccess}
        />
      )}

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