'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useNotifications } from '@/components/ui/notification'

interface User {
  id: string
  email?: string
}

interface Props {
  user: User
}

interface CarrierFormData {
  dot_number: string
  legal_name: string
  dba_name: string
  physical_address: string
  phone: string
  email: string
  safety_rating: string
  insurance_status: string
  authority_status: string
  carb_compliance: boolean
  state: string
  city: string
  vehicle_count: string
  admin_notes: string
  verified: boolean
  // Insurance tracking fields
  insurance_expiry_date: string
  insurance_carrier: string
  insurance_policy_number: string
  insurance_amount: string
  insurance_effective_date: string
}

export default function AddCarrierForm({ user }: Props) {
  const [formData, setFormData] = useState<CarrierFormData>({
    dot_number: '',
    legal_name: '',
    dba_name: '',
    physical_address: '',
    phone: '',
    email: '',
    safety_rating: 'satisfactory',
    insurance_status: 'Active',
    authority_status: 'Active',
    carb_compliance: true,
    state: '',
    city: '',
    vehicle_count: '',
    admin_notes: '',
    verified: true,
    // Insurance tracking fields
    insurance_expiry_date: '',
    insurance_carrier: '',
    insurance_policy_number: '',
    insurance_amount: '',
    insurance_effective_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { addNotification } = useNotifications()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const checkForDuplicate = async (dotNumber: string) => {
    if (!dotNumber.trim()) return

    setCheckingDuplicate(true)
    try {
      const { data: existing } = await supabase
        .from('carriers')
        .select('id, legal_name')
        .eq('dot_number', dotNumber.trim())
        .single()

      if (existing) {
        addNotification({
          type: 'warning',
          title: 'Duplicate DOT Number',
          message: `Carrier "${existing.legal_name}" already exists with this DOT number`
        })
        return false
      }
      return true
    } catch {
      // No existing carrier found, which is good
      return true
    } finally {
      setCheckingDuplicate(false)
    }
  }

  const handleDotNumberBlur = () => {
    if (formData.dot_number.trim()) {
      checkForDuplicate(formData.dot_number.trim())
    }
  }

  const validateForm = () => {
    const errors: string[] = []

    if (!formData.dot_number.trim()) errors.push('DOT Number is required')
    if (!formData.legal_name.trim()) errors.push('Legal Name is required')
    if (!formData.safety_rating) errors.push('Safety Rating is required')
    if (!formData.insurance_status) errors.push('Insurance Status is required')
    if (!formData.authority_status) errors.push('Authority Status is required')

    // Validate DOT number format (should be numeric)
    if (formData.dot_number && !/^\d+$/.test(formData.dot_number.trim())) {
      errors.push('DOT Number must contain only numbers')
    }

    // Validate vehicle count if provided
    if (formData.vehicle_count && !/^\d+$/.test(formData.vehicle_count)) {
      errors.push('Vehicle Count must be a number')
    }

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== handleSubmit called ===')
    e.preventDefault()
    
    const errors = validateForm()
    console.log('Validation errors:', errors)
    if (errors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errors.join(', ')
      })
      return
    }

    // Check for duplicate one more time
    const isDuplicateOk = await checkForDuplicate(formData.dot_number.trim())
    if (!isDuplicateOk) {
      return
    }

    setLoading(true)

    try {
      // Prepare carrier data
      const carrierData = {
        dot_number: formData.dot_number.trim(),
        legal_name: formData.legal_name.trim(),
        dba_name: formData.dba_name.trim() || null,
        physical_address: formData.physical_address.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        safety_rating: formData.safety_rating,
        insurance_status: formData.insurance_status,
        authority_status: formData.authority_status,
        carb_compliance: formData.carb_compliance,
        state: formData.state.trim() || null,
        city: formData.city.trim() || null,
        vehicle_count: formData.vehicle_count ? parseInt(formData.vehicle_count) : null,
        data_source: 'manual',
        verified: formData.verified,
        verification_date: formData.verified ? new Date().toISOString() : null,
        trust_score: formData.verified ? 90 : 70,
        admin_notes: formData.admin_notes.trim() || null,
        created_by_admin: user.id,
        last_manual_update: new Date().toISOString(),
        // Insurance tracking fields
        insurance_expiry_date: formData.insurance_expiry_date || null,
        insurance_carrier: formData.insurance_carrier.trim() || null,
        insurance_policy_number: formData.insurance_policy_number.trim() || null,
        insurance_amount: formData.insurance_amount ? parseFloat(formData.insurance_amount) : null,
        insurance_effective_date: formData.insurance_effective_date || null,
        insurance_last_verified: formData.insurance_expiry_date || formData.insurance_effective_date ? new Date().toISOString() : null
      }

      // Check current user and admin status
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      console.log('Current user:', currentUser?.email, currentUser?.id)
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, is_admin, role')
        .eq('id', currentUser?.id)
        .single()
      
      console.log('User profile:', profile)

      // Insert carrier using service role for admin operations
      console.log('Attempting to insert carrier data:', carrierData)
      
      // Use server-side insert for admin operations
      const response = await fetch('/api/admin/carriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carrierData),
      });
      
      const result = await response.json();
      console.log('Insert result:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to insert carrier');
      }
      
      const carrier = result.data;

      // Log admin activity (optional - if function exists)
      try {
        await supabase.rpc('log_admin_activity', {
          p_action: 'create_carrier',
          p_entity_type: 'carrier',
          p_entity_id: carrier.id,
          p_details: {
            dot_number: carrierData.dot_number,
            legal_name: carrierData.legal_name,
            data_source: 'manual'
          }
        })
      } catch (activityError) {
        console.warn('Admin activity logging failed:', activityError)
        // Continue without failing the carrier creation
      }

      addNotification({
        type: 'success',
        title: 'Carrier Added Successfully',
        message: `${carrierData.legal_name} (DOT: ${carrierData.dot_number}) has been added to the database`
      })

      router.push('/admin/carriers')
    } catch (error: unknown) {
      console.error('Error adding carrier:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      
      if (error && typeof error === 'object') {
        console.error('Error keys:', Object.keys(error))
        console.error('Error details:', {
          message: (error as Record<string, unknown>).message,
          code: (error as Record<string, unknown>).code,
          details: (error as Record<string, unknown>).details,
          hint: (error as Record<string, unknown>).hint,
          stack: (error as Record<string, unknown>).stack
        })
      }
      
      let errorMessage = 'An unexpected error occurred'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = JSON.stringify(error)
      }
      
      addNotification({
        type: 'error',
        title: 'Failed to Add Carrier',
        message: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-2xl font-bold text-blue-600">
                CarrierTracker Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <span className="text-gray-400">/</span>
                <Link href="/admin/carriers" className="text-gray-600 hover:text-gray-900">Carriers</Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Add New</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Carrier</h1>
          <p className="text-gray-600 mt-2">Manually add carrier data to the database</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DOT Number *
                </label>
                <input
                  type="text"
                  name="dot_number"
                  value={formData.dot_number}
                  onChange={handleInputChange}
                  onBlur={handleDotNumberBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1234567"
                  required
                />
                {checkingDuplicate && (
                  <p className="text-sm text-blue-600 mt-1">Checking for duplicates...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Name *
                </label>
                <input
                  type="text"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABC Transport LLC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DBA Name
                </label>
                <input
                  type="text"
                  name="dba_name"
                  value={formData.dba_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABC Transport (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Count
                </label>
                <input
                  type="text"
                  name="vehicle_count"
                  value={formData.vehicle_count}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  name="physical_address"
                  value={formData.physical_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Los Angeles"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contact@company.com"
                />
              </div>
            </div>
          </div>

          {/* Compliance & Status */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance & Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Rating *
                </label>
                <select
                  name="safety_rating"
                  value={formData.safety_rating}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="satisfactory">Satisfactory</option>
                  <option value="conditional">Conditional</option>
                  <option value="unsatisfactory">Unsatisfactory</option>
                  <option value="not-rated">Not Rated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Status *
                </label>
                <select
                  name="insurance_status"
                  value={formData.insurance_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authority Status *
                </label>
                <select
                  name="authority_status"
                  value={formData.authority_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Revoked">Revoked</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="carb_compliance"
                  checked={formData.carb_compliance}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">CARB Compliant</span>
              </label>
            </div>
          </div>

          {/* Insurance Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Carrier
                </label>
                <input
                  type="text"
                  name="insurance_carrier"
                  value={formData.insurance_carrier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Progressive Commercial, State Farm, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  name="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="POL-123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coverage Amount ($)
                </label>
                <input
                  type="number"
                  name="insurance_amount"
                  value={formData.insurance_amount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000000"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  name="insurance_effective_date"
                  value={formData.insurance_effective_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="insurance_expiry_date"
                  value={formData.insurance_expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {formData.insurance_expiry_date && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Setting an expiry date will automatically create insurance alerts for 30, 15, 7, and 1 day notifications.
                </p>
              </div>
            )}
          </div>

          {/* Admin Notes & Verification */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Controls</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes
                </label>
                <textarea
                  name="admin_notes"
                  value={formData.admin_notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Internal notes about this carrier..."
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="verified"
                    checked={formData.verified}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Mark as Verified (increases trust score)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link 
              href="/admin/carriers"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || checkingDuplicate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Carrier...' : 'Add Carrier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}