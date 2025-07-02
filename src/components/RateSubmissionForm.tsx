'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import UserReputation from './UserReputation'

interface RateSubmissionFormProps {
  carrierId: string
  carrierName: string
  onClose: () => void
  onSuccess: () => void
}

interface ExistingSubmission {
  id: string
  rate_per_mile: number
  load_type: string
  route_type: string
  experience_level: string
  employment_type: string
  miles_driven_weekly: number | null
  comment: string | null
  verified: boolean
  verification_count: number
  dispute_count: number
}

export default function RateSubmissionForm({ carrierId, carrierName, onClose, onSuccess }: RateSubmissionFormProps) {
  const [formData, setFormData] = useState({
    rate_per_mile: '',
    load_type: 'dry_van',
    route_type: 'otr',
    experience_level: 'experienced',
    employment_type: 'company_driver',
    miles_driven_weekly: '',
    comment: ''
  })
  const [existingSubmission, setExistingSubmission] = useState<ExistingSubmission | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchingExisting, setFetchingExisting] = useState(true)

  useEffect(() => {
    fetchExistingSubmission()
  }, [carrierId])

  const fetchExistingSubmission = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_user_rate_submission', {
        p_carrier_id: carrierId
      })

      if (error) {
        console.error('Error fetching existing submission:', error)
        return
      }

      if (data && data.length > 0) {
        const submission = data[0]
        setExistingSubmission(submission)
        setFormData({
          rate_per_mile: submission.rate_per_mile.toString(),
          load_type: submission.load_type,
          route_type: submission.route_type,
          experience_level: submission.experience_level,
          employment_type: submission.employment_type || 'company_driver',
          miles_driven_weekly: submission.miles_driven_weekly?.toString() || '',
          comment: submission.comment || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch existing submission:', error)
    } finally {
      setFetchingExisting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check for temporary carrier IDs (from FMCSA lookups)
      if (carrierId.startsWith('temp-')) {
        setError('Cannot submit rates for carriers not yet saved in our database. The carrier data is from FMCSA and needs to be fully processed first.')
        return
      }

      const rate = parseFloat(formData.rate_per_mile)
      
      // Validation
      if (isNaN(rate) || rate < 0.5 || rate > 10) {
        setError('Rate per mile must be between $0.50 and $10.00')
        return
      }

      const weeklyMiles = formData.miles_driven_weekly ? parseInt(formData.miles_driven_weekly) : null
      if (weeklyMiles && (weeklyMiles < 0 || weeklyMiles > 5000)) {
        setError('Weekly miles must be between 0 and 5000')
        return
      }

      const supabase = createClient()
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('You must be logged in to submit rate information')
        return
      }
      
      const { data, error: submitError } = await supabase.rpc('submit_carrier_rate', {
        p_carrier_id: carrierId,
        p_rate_per_mile: rate,
        p_load_type: formData.load_type,
        p_route_type: formData.route_type,
        p_experience_level: formData.experience_level,
        p_employment_type: formData.employment_type,
        p_miles_driven_weekly: weeklyMiles,
        p_comment: formData.comment || null
      })

      if (submitError) {
        console.error('Supabase RPC error:', submitError)
        throw submitError
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error submitting rate:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      setError(error.message || error.details || 'Failed to submit rate information')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const loadTypeOptions = [
    { value: 'dry_van', label: 'Dry Van' },
    { value: 'reefer', label: 'Refrigerated' },
    { value: 'flatbed', label: 'Flatbed' },
    { value: 'tanker', label: 'Tanker' },
    { value: 'hazmat', label: 'Hazmat' },
    { value: 'oversized', label: 'Oversized/Heavy Haul' },
    { value: 'car_hauler', label: 'Car Hauler' },
    { value: 'livestock', label: 'Livestock' },
    { value: 'other', label: 'Other' }
  ]

  const routeTypeOptions = [
    { value: 'local', label: 'Local (within 150 miles)' },
    { value: 'regional', label: 'Regional (150-500 miles)' },
    { value: 'otr', label: 'Over-the-Road (500+ miles)' },
    { value: 'dedicated', label: 'Dedicated Route' }
  ]

  const experienceOptions = [
    { value: 'new', label: 'New Driver (0-2 years)' },
    { value: 'experienced', label: 'Experienced (2-10 years)' },
    { value: 'veteran', label: 'Veteran (10+ years)' }
  ]

  const employmentOptions = [
    { value: 'company_driver', label: 'Company Driver' },
    { value: 'owner_operator', label: 'Owner Operator' },
    { value: 'lease_operator', label: 'Lease Operator' }
  ]

  if (fetchingExisting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-pulse flex items-center">
            <div className="w-4 h-4 bg-blue-200 rounded-full mr-3"></div>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {existingSubmission ? 'Update' : 'Submit'} Rate Information
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Carrier:</strong> {carrierName}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Share what you get paid per mile to help fellow drivers make informed decisions.
              {existingSubmission && ' You can update your previous submission.'}
            </p>
          </div>

          {/* User Reputation Display */}
          <div className="mb-4">
            <UserReputation showDetails={false} inline={true} />
          </div>

          {existingSubmission && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Previous Submission Found</p>
                  <p className="text-xs text-green-600">
                    ${existingSubmission.rate_per_mile}/mile • {existingSubmission.verification_count} verifications
                    {existingSubmission.verified && ' • ✅ Verified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Community Data</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  Rate information is shared anonymously to help drivers understand carrier pay scales. 
                  Please be honest and accurate.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rate Per Mile - Most Important Field */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label htmlFor="rate_per_mile" className="block text-lg font-semibold text-blue-900 mb-2">
                💰 Rate Per Mile *
              </label>
              <div className="flex items-center">
                <span className="text-xl font-bold text-blue-900 mr-2">$</span>
                <input
                  type="number"
                  id="rate_per_mile"
                  name="rate_per_mile"
                  value={formData.rate_per_mile}
                  onChange={handleInputChange}
                  required
                  min="0.50"
                  max="10.00"
                  step="0.01"
                  placeholder="1.85"
                  className="text-xl font-bold w-24 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-lg font-semibold text-blue-900 ml-2">per mile</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Enter your actual pay rate (range: $0.50 - $10.00 per mile)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="load_type" className="block text-sm font-medium text-gray-700 mb-1">
                  🚛 Load Type *
                </label>
                <select
                  id="load_type"
                  name="load_type"
                  value={formData.load_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {loadTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="route_type" className="block text-sm font-medium text-gray-700 mb-1">
                  🗺️ Route Type *
                </label>
                <select
                  id="route_type"
                  name="route_type"
                  value={formData.route_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {routeTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 mb-1">
                  👨‍💼 Experience Level *
                </label>
                <select
                  id="experience_level"
                  name="experience_level"
                  value={formData.experience_level}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {experienceOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 mb-1">
                  💼 Employment Type *
                </label>
                <select
                  id="employment_type"
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {employmentOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="miles_driven_weekly" className="block text-sm font-medium text-gray-700 mb-1">
                📈 Weekly Miles (Optional)
              </label>
              <input
                type="number"
                id="miles_driven_weekly"
                name="miles_driven_weekly"
                value={formData.miles_driven_weekly}
                onChange={handleInputChange}
                min="0"
                max="5000"
                placeholder="2500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many miles do you typically drive per week?
              </p>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                💬 Comments (Optional)
              </label>
              <textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                rows={3}
                placeholder="Share your experience with this carrier - pay schedule, benefits, equipment, etc. Keep it helpful and honest!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Let other drivers know what it's like working with this carrier
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Help the Community</h3>
                  <p className="text-xs text-green-700 mt-1">
                    Your rate information helps other drivers understand what carriers pay. 
                    Other users can verify your submission to increase its reliability.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : existingSubmission ? 'Update Rate' : 'Submit Rate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}