'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface InsuranceLookupGuideProps {
  carrierId: string
  carrierName: string
  dotNumber: string
  mcNumber?: string
  onClose: () => void
  onSuccess: () => void
}

export default function InsuranceLookupGuide({
  carrierId,
  carrierName,
  dotNumber,
  mcNumber,
  onClose,
  onSuccess
}: InsuranceLookupGuideProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    insurance_carrier: '',
    policy_number: '',
    insurance_amount: '',
    effective_date: '',
    expiry_date: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Generate the FMCSA URL with pre-filled carrier info
  const getFMCSAUrl = () => {
    // Use MC number if available, otherwise use DOT number
    const queryNumber = mcNumber || dotNumber
    return `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&original_query_param=NAME&query_string=${queryNumber}&original_query_string=${encodeURIComponent(carrierName)}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { data, error: submitError } = await supabase.rpc('submit_insurance_info', {
        p_carrier_id: carrierId,
        p_insurance_carrier: formData.insurance_carrier || null,
        p_policy_number: formData.policy_number || null,
        p_insurance_amount: formData.insurance_amount ? parseFloat(formData.insurance_amount) : null,
        p_effective_date: formData.effective_date || null,
        p_expiry_date: formData.expiry_date || null,
        p_source_type: 'fmcsa_lookup',
        p_notes: formData.notes || null
      })

      if (submitError) {
        throw submitError
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error submitting insurance info:', error)
      setError(error.message || 'Failed to submit insurance information')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: "Find Current Insurance Information",
      content: (
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Help us verify insurance information</h3>
              <p className="text-sm text-gray-600 mt-1">
                We'll guide you to the official FMCSA database to find the most current insurance information for <strong>{carrierName}</strong>.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Why this helps</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Provides the most up-to-date official insurance information</li>
                    <li>Helps other users make informed decisions</li>
                    <li>Community-verified data improves accuracy for everyone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Let's Start
            </button>
          </div>
        </div>
      )
    },
    {
      title: "Access FMCSA Database",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Step 1: Open the FMCSA Safety Database</h3>
            <p className="text-sm text-gray-600 mb-4">
              We've pre-filled the search with {carrierName}'s information. Click the link below to open the FMCSA database:
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">FMCSA Safety Database</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {mcNumber ? `MC-${mcNumber}` : `DOT-${dotNumber}`} • {carrierName}
                  </div>
                </div>
                <a
                  href={getFMCSAUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Open FMCSA
                  <svg className="ml-2 -mr-0.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Next Steps</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Click "Open FMCSA" above (opens in new tab)</li>
                    <li>Look for and click the <strong>"Licensing & Insurance"</strong> link</li>
                    <li>Find the insurance information in the results</li>
                    <li>Come back here to enter what you found</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              I Found the Information
            </button>
          </div>
        </div>
      )
    },
    {
      title: "Enter Insurance Details",
      content: (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Step 2: Enter the Insurance Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the insurance details you found on the FMCSA database. Fill in as much information as available:
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="insurance_carrier" className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Company *
              </label>
              <input
                type="text"
                id="insurance_carrier"
                name="insurance_carrier"
                value={formData.insurance_carrier}
                onChange={handleInputChange}
                required
                placeholder="e.g., Progressive Commercial, State Farm, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="policy_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  id="policy_number"
                  name="policy_number"
                  value={formData.policy_number}
                  onChange={handleInputChange}
                  placeholder="Policy number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="insurance_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Coverage Amount ($)
                </label>
                <input
                  type="number"
                  id="insurance_amount"
                  name="insurance_amount"
                  value={formData.insurance_amount}
                  onChange={handleInputChange}
                  placeholder="e.g., 1000000"
                  min="0"
                  step="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="effective_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  id="effective_date"
                  name="effective_date"
                  value={formData.effective_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  id="expiry_date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Any additional information about the insurance..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Community Verification</h3>
                  <div className="mt-2 text-sm text-green-700">
                    After you submit, other users can vote on whether this information is accurate. This helps maintain data quality through community verification.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !formData.insurance_carrier.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Insurance Info'}
              </button>
            </div>
          </form>
        </div>
      )
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep - 1].title}</h2>
              <div className="flex items-center space-x-2 mt-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-8 h-2 rounded-full ${
                      index + 1 <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {steps[currentStep - 1].content}
        </div>
      </div>
    </div>
  )
}