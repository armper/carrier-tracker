'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import UserReputation from './UserReputation'

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
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      let documentData = null
      
      // Upload document if provided
      if (documentFile) {
        setUploadProgress(25)
        const uploadFormData = new FormData()
        uploadFormData.append('document', documentFile)
        
        const uploadResponse = await fetch('/api/upload/insurance-document', {
          method: 'POST',
          body: uploadFormData
        })
        
        setUploadProgress(50)
        
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          throw new Error(uploadError.error || 'Failed to upload document')
        }
        
        const uploadResult = await uploadResponse.json()
        documentData = uploadResult.data
        setUploadProgress(75)
      }
      
      // Call the submit_insurance_info function
      const { data, error: submitError } = await supabase.rpc('submit_insurance_info', {
        p_carrier_id: carrierId,
        p_insurance_carrier: formData.insurance_carrier || null,
        p_policy_number: formData.policy_number || null,
        p_insurance_amount: formData.insurance_amount ? parseFloat(formData.insurance_amount) : null,
        p_effective_date: formData.effective_date || null,
        p_expiry_date: formData.expiry_date || null,
        p_source_type: documentFile ? 'document_upload' : formData.source_type,
        p_notes: formData.notes || null,
        p_document_url: documentData?.url || null,
        p_document_filename: documentData?.filename || null,
        p_document_file_size: documentData?.size || null,
        p_document_mime_type: documentData?.mimeType || null
      })

      if (submitError) {
        throw submitError
      }

      setUploadProgress(100)
      
      // Trigger insurance update notifications
      try {
        await fetch('/api/notifications/insurance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            carrierId,
            notificationType: 'insurance_updated'
          })
        })
      } catch (notificationError) {
        console.warn('Failed to send notifications:', notificationError)
        // Don't fail the submission if notifications fail
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error submitting insurance info:', error)
      setError(error.message || 'Failed to submit insurance information')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only images (JPEG, PNG, WebP) and PDF files are allowed.')
        return
      }
      
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError('File too large. Maximum size is 5MB.')
        return
      }
      
      setDocumentFile(file)
      setError('') // Clear any previous errors
    }
  }

  const removeFile = () => {
    setDocumentFile(null)
    const fileInput = document.getElementById('document-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

          {/* User Reputation Display */}
          <div className="mb-4">
            <UserReputation showDetails={false} inline={true} />
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

            {/* Document Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Document (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Upload insurance certificate, policy document, or screenshot. Images and PDFs only, max 5MB.
              </p>
              
              {!documentFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-gray-400 transition-colors">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-500 font-medium">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </label>
                  <input
                    id="document-upload"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{documentFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(documentFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}
              
              {documentFile && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-800">
                    📄 Document upload will increase your submission confidence score and help verify accuracy.
                  </p>
                </div>
              )}
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