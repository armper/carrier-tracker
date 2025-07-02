'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface InsuranceUpdateFormProps {
  carrierId: string
  carrierName: string
  onClose: () => void
  onSuccess: () => void
}

export default function InsuranceUpdateForm({ carrierId, carrierName, onClose, onSuccess }: InsuranceUpdateFormProps) {
  const [formData, setFormData] = useState({
    insurance_carrier: '',
    policy_number: '',
    insurance_amount: '',
    effective_date: '',
    expiry_date: '',
    source_type: 'user_submitted',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      // Call the submit_insurance_info function
      const { data, error: submitError } = await supabase.rpc('submit_insurance_info', {
        p_carrier_id: carrierId,
        p_insurance_carrier: formData.insurance_carrier || null,
        p_policy_number: formData.policy_number || null,
        p_insurance_amount: formData.insurance_amount ? parseFloat(formData.insurance_amount) : null,
        p_effective_date: formData.effective_date || null,
        p_expiry_date: formData.expiry_date || null,
        p_source_type: formData.source_type,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Update Insurance Information
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
              Help keep carrier information up-to-date by submitting insurance details. 
              Your submission will be verified by the community.
            </p>
          </div>

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">For Reference Only</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  This data is for convenience and should not replace proper insurance verification. 
                  Always confirm coverage directly with the carrier or their insurance provider before making business decisions.
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
            <div>
              <label htmlFor="insurance_carrier" className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Carrier
              </label>
              <input
                type="text"
                id="insurance_carrier"
                name="insurance_carrier"
                value={formData.insurance_carrier}
                onChange={handleInputChange}
                placeholder="e.g., Progressive Commercial, State Farm, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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
                placeholder="Insurance policy number"
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
              <label htmlFor="source_type" className="block text-sm font-medium text-gray-700 mb-1">
                Information Source
              </label>
              <select
                id="source_type"
                name="source_type"
                value={formData.source_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user_submitted">User Submitted</option>
                <option value="document_upload">Document/Certificate</option>
                <option value="carrier_confirmed">Carrier Confirmed</option>
                <option value="third_party">Third Party Source</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about this insurance information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please ensure all information is accurate. Submitting false information may result in account restrictions.
                    This information will be reviewed by other users and administrators.
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
                {loading ? 'Submitting...' : 'Submit Insurance Info'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}