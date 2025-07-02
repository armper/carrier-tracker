'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import UserReputation from './UserReputation'

interface CarrierRatingFormProps {
  carrierId: string
  carrierName: string
  onClose: () => void
  onSuccess: () => void
}

interface ExistingRating {
  id: string
  rating: number
  title: string
  review_text: string
  category: string
  would_recommend: boolean | null
  anonymous: boolean
}

export default function CarrierRatingForm({ carrierId, carrierName, onClose, onSuccess }: CarrierRatingFormProps) {
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    review_text: '',
    category: 'general',
    would_recommend: null as boolean | null,
    anonymous: false
  })
  const [existingRating, setExistingRating] = useState<ExistingRating | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchingExisting, setFetchingExisting] = useState(true)

  useEffect(() => {
    fetchExistingRating()
  }, [carrierId])

  const fetchExistingRating = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_user_carrier_rating', {
        p_carrier_id: carrierId
      })

      if (error) {
        console.error('Error fetching existing rating:', error)
        return
      }

      if (data && data.length > 0) {
        const rating = data[0]
        setExistingRating(rating)
        setFormData({
          rating: rating.rating,
          title: rating.title || '',
          review_text: rating.review_text || '',
          category: rating.category || 'general',
          would_recommend: rating.would_recommend,
          anonymous: rating.anonymous
        })
      }
    } catch (error) {
      console.error('Failed to fetch existing rating:', error)
    } finally {
      setFetchingExisting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check for temporary carrier IDs
      if (carrierId.startsWith('temp-')) {
        setError('Cannot rate carriers not yet saved in our database. The carrier data is from FMCSA and needs to be fully processed first.')
        return
      }

      // Validation
      if (formData.rating < 1 || formData.rating > 5) {
        setError('Please select a rating from 1 to 5 stars')
        return
      }

      const supabase = createClient()
      
      // Check authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('You must be logged in to submit a rating')
        return
      }
      
      const { data, error: submitError } = await supabase.rpc('submit_carrier_rating', {
        p_carrier_id: carrierId,
        p_rating: formData.rating,
        p_title: formData.title.trim() || null,
        p_review_text: formData.review_text.trim() || null,
        p_category: formData.category,
        p_would_recommend: formData.would_recommend,
        p_anonymous: formData.anonymous
      })

      if (submitError) {
        console.error('Supabase RPC error:', submitError)
        throw submitError
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error submitting rating:', error)
      setError(error.message || 'Failed to submit rating')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }))
  }

  const handleRecommendClick = (recommend: boolean) => {
    setFormData(prev => ({
      ...prev,
      would_recommend: recommend
    }))
  }

  const categoryOptions = [
    { value: 'general', label: 'General Experience' },
    { value: 'payment', label: 'Payment & Rates' },
    { value: 'communication', label: 'Communication' },
    { value: 'equipment', label: 'Equipment & Maintenance' },
    { value: 'dispatch', label: 'Dispatch & Operations' },
    { value: 'management', label: 'Management & Culture' },
    { value: 'benefits', label: 'Benefits & Support' },
    { value: 'safety', label: 'Safety & Compliance' }
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
              {existingRating ? 'Update' : 'Rate'} {carrierName}
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
              Share your experience to help other drivers and industry professionals make informed decisions.
              {existingRating && ' You can update your previous rating.'}
            </p>
          </div>

          {/* User Reputation Display */}
          <div className="mb-4">
            <UserReputation showDetails={false} inline={true} />
          </div>

          {existingRating && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Previous Rating Found</p>
                  <p className="text-xs text-green-600">
                    {existingRating.rating} stars • {existingRating.category}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="block text-lg font-semibold text-yellow-900 mb-3">
                ⭐ Overall Rating *
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className={`text-3xl transition-colors ${
                      star <= formData.rating
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
                <span className="ml-3 text-lg font-medium text-gray-900">
                  {formData.rating > 0 ? `${formData.rating} star${formData.rating !== 1 ? 's' : ''}` : 'Select rating'}
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                📂 Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                📝 Review Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                maxLength={200}
                placeholder="e.g., Great company to work for, Good pay but poor communication"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Review Text */}
            <div>
              <label htmlFor="review_text" className="block text-sm font-medium text-gray-700 mb-1">
                💬 Detailed Review (Optional)
              </label>
              <textarea
                id="review_text"
                name="review_text"
                value={formData.review_text}
                onChange={handleInputChange}
                rows={4}
                maxLength={2000}
                placeholder="Share your experience working with this carrier. Include details about pay, equipment, management, work-life balance, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.review_text.length}/2000 characters
              </p>
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                🤔 Would you recommend this carrier?
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleRecommendClick(true)}
                  className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                    formData.would_recommend === true
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  👍 Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleRecommendClick(false)}
                  className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                    formData.would_recommend === false
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  👎 No
                </button>
                <button
                  type="button"
                  onClick={() => handleRecommendClick(null)}
                  className={`px-4 py-2 rounded-md border font-medium transition-colors ${
                    formData.would_recommend === null
                      ? 'bg-gray-100 text-gray-800 border-gray-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🤷 Not sure
                </button>
              </div>
            </div>

            {/* Anonymous option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                name="anonymous"
                checked={formData.anonymous}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
                🕶️ Post this review anonymously
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Help the Community</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Your rating and review help drivers, brokers, and shippers make informed decisions. 
                    Please be honest and constructive in your feedback.
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
                disabled={loading || formData.rating === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}