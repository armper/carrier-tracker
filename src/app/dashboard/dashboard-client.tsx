'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils'
import { useNotifications } from '@/components/ui/notification'

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

interface SavedCarrier {
  id: string
  notes: string | null
  created_at: string
  tags?: string[]
  priority?: 'high' | 'medium' | 'low'
  last_contacted?: string | null
  updated_at?: string
  carriers: Carrier
}

interface User {
  id: string
  email?: string
}

interface Props {
  user: User
  savedCarriers: SavedCarrier[]
  alertedCarrierIds: Set<string>
}

export default function DashboardClient({ user, savedCarriers, alertedCarrierIds }: Props) {
  const [carriers, setCarriers] = useState<SavedCarrier[]>(savedCarriers)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [carrierToDelete, setCarrierToDelete] = useState<{ id: string, name: string, alertCount: number } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [editingCarrier, setEditingCarrier] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    notes: string
    tags: string[]
    priority: 'high' | 'medium' | 'low'
    lastContacted: string
  }>({ notes: '', tags: [], priority: 'medium', lastContacted: '' })
  const router = useRouter()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { addNotification } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleRemoveCarrier = async (savedCarrierId: string) => {
    const carrier = carriers.find(c => c.id === savedCarrierId)
    if (!carrier) return

    // Check if this carrier has any active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('monitoring_alerts')
      .select('id')
      .eq('carrier_id', carrier.carriers.id)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (alertsError) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to check for alerts. Please try again.'
      })
      return
    }

    const alertCount = alerts?.length || 0

    if (alertCount > 0) {
      // Show confirmation modal for carriers with alerts
      setCarrierToDelete({
        id: savedCarrierId,
        name: carrier.carriers.legal_name,
        alertCount
      })
      setShowDeleteModal(true)
      setDeleteConfirmText('')
    } else {
      // Fast deletion for carriers without alerts
      await performCarrierDeletion(savedCarrierId, [])
    }
  }

  const performCarrierDeletion = async (savedCarrierId: string, alertIds: string[]) => {
    const carrier = carriers.find(c => c.id === savedCarrierId)
    if (!carrier) return

    try {
      // Delete alerts first if any exist
      if (alertIds.length > 0) {
        const { error: alertsError } = await supabase
          .from('monitoring_alerts')
          .delete()
          .eq('carrier_id', carrier.carriers.id)
          .eq('user_id', user.id)

        if (alertsError) throw alertsError
      }

      // Delete the saved carrier
      const { error } = await supabase
        .from('saved_carriers')
        .delete()
        .eq('id', savedCarrierId)

      if (error) throw error

      // Update UI
      setCarriers(carriers.filter(c => c.id !== savedCarrierId))
      
      // Show success notification
      addNotification({
        type: 'success',
        title: 'Carrier Removed',
        message: alertIds.length > 0 
          ? `${carrier.carriers.legal_name} and ${alertIds.length} alert${alertIds.length > 1 ? 's' : ''} removed.`
          : `${carrier.carriers.legal_name} removed from your dashboard.`
      })

      // Close modal if open
      setShowDeleteModal(false)
      setCarrierToDelete(null)
      setDeleteConfirmText('')

    } catch (error) {
      console.error('Delete error:', error)
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to remove carrier. Please try again.'
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!carrierToDelete || deleteConfirmText.toLowerCase() !== 'delete') return

    const carrier = carriers.find(c => c.id === carrierToDelete.id)
    if (!carrier) return

    // Get alert IDs for deletion
    const { data: alerts } = await supabase
      .from('monitoring_alerts')
      .select('id')
      .eq('carrier_id', carrier.carriers.id)
      .eq('user_id', user.id)
      .eq('is_active', true)

    const alertIds = alerts?.map(alert => alert.id) || []
    await performCarrierDeletion(carrierToDelete.id, alertIds)
  }

  const getSafetyRatingColor = (rating: string) => {
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

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const predefinedTags = ['preferred', 'high-risk', 'new', 'reliable', 'problematic', 'verified', 'urgent', 'follow-up']

  const startEditing = (savedCarrier: SavedCarrier) => {
    setEditingCarrier(savedCarrier.id)
    setEditForm({
      notes: savedCarrier.notes || '',
      tags: savedCarrier.tags || [],
      priority: savedCarrier.priority || 'medium',
      lastContacted: savedCarrier.last_contacted || ''
    })
  }

  const cancelEditing = () => {
    setEditingCarrier(null)
    setEditForm({ notes: '', tags: [], priority: 'medium', lastContacted: '' })
  }

  const saveCarrierUpdates = async (savedCarrierId: string) => {
    try {
      const { error } = await supabase
        .from('saved_carriers')
        .update({
          notes: editForm.notes || null,
          tags: editForm.tags,
          priority: editForm.priority,
          last_contacted: editForm.lastContacted || null
        })
        .eq('id', savedCarrierId)

      if (error) throw error

      // Update local state
      setCarriers(carriers.map(carrier => 
        carrier.id === savedCarrierId 
          ? { 
              ...carrier, 
              notes: editForm.notes || null,
              tags: editForm.tags,
              priority: editForm.priority,
              last_contacted: editForm.lastContacted || null,
              updated_at: new Date().toISOString()
            }
          : carrier
      ))

      addNotification({
        type: 'success',
        title: 'Carrier Updated',
        message: 'Carrier information has been saved successfully.'
      })

      setEditingCarrier(null)
    } catch (error) {
      console.error('Update error:', error)
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update carrier information. Please try again.'
      })
    }
  }

  const addTag = (tag: string) => {
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, tag] })
    }
  }

  const removeTag = (tagToRemove: string) => {
    setEditForm({ ...editForm, tags: editForm.tags.filter(tag => tag !== tagToRemove) })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Saved Carriers {carriers.length > 0 && <span className="text-sm font-normal text-gray-600">({carriers.length})</span>}
            </h2>
            <div className="flex gap-3">
              <Link
                href="/dashboard/alerts"
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17H7a3 3 0 01-3-3V5a3 3 0 013-3h5m0 0v5a2 2 0 002 2h5M9 9h6m-6 4h6" />
                </svg>
                Alerts
              </Link>
              {carriers.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isExportDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            exportToCSV(carriers);
                            setIsExportDropdownOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          📄 Export as CSV
                        </button>
                        <button
                          onClick={() => {
                            exportToExcel(carriers);
                            setIsExportDropdownOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          📊 Export as Excel
                        </button>
                        <button
                          onClick={() => {
                            exportToPDF(carriers);
                            setIsExportDropdownOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        >
                          📋 Export as PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => router.push('/search')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search Carriers
              </button>
            </div>
          </div>

          {carriers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No saved carriers yet</h3>
              <p className="text-gray-600 mb-4">Start by searching for carriers to track their safety and compliance status.</p>
              <button
                onClick={() => router.push('/search')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Search Carriers
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {carriers.map((savedCarrier) => {
                const carrier = savedCarrier.carriers
                return (
                  <div key={savedCarrier.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/carrier/${carrier.dot_number}`}
                              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {carrier.legal_name}
                            </Link>
                            {alertedCarrierIds.has(carrier.id) && (
                              <div className="flex items-center gap-1">
                                <div className="relative">
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 2L13.09 8.26L20 9L15 14L16.18 21L10 17.77L3.82 21L5 14L0 9L6.91 8.26L10 2Z"/>
                                    </svg>
                                  </div>
                                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                                </div>
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  Monitored
                                </span>
                              </div>
                            )}
                          </div>
                          {carrier.dba_name && (
                            <p className="text-sm text-gray-600">DBA: {carrier.dba_name}</p>
                          )}
                          <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCarrier(savedCarrier.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-gray-600">Safety Rating</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
                          {carrier.safety_rating}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Insurance</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          carrier.insurance_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {carrier.insurance_status}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Authority</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          carrier.authority_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {carrier.authority_status}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Carrier Information */}
                    <div className="space-y-4">
                      {/* Priority and Tags Section */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(savedCarrier.priority || 'medium')}`}>
                          {(savedCarrier.priority || 'medium').toUpperCase()} Priority
                        </div>
                        {savedCarrier.tags && savedCarrier.tags.length > 0 && (
                          <>
                            {savedCarrier.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                #{tag}
                              </span>
                            ))}
                          </>
                        )}
                        {savedCarrier.last_contacted && (
                          <span className="text-xs text-gray-500">
                            Last contacted: {new Date(savedCarrier.last_contacted).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Notes Section */}
                      {savedCarrier.notes && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <span className="text-sm text-gray-600">Notes: </span>
                          <span className="text-sm text-gray-900">{savedCarrier.notes}</span>
                        </div>
                      )}

                      {/* Edit Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => startEditing(savedCarrier)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          Edit Details
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && carrierToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Carrier & Alerts</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                You&apos;re about to remove <strong>{carrierToDelete.name}</strong> from your dashboard.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      This carrier has {carrierToDelete.alertCount} active alert{carrierToDelete.alertCount > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      All alerts will also be permanently deleted and cannot be recovered.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <strong>&quot;delete&quot;</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Type 'delete' to confirm"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setCarrierToDelete(null)
                  setDeleteConfirmText('')
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Delete Carrier & Alerts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Carrier Modal */}
      {editingCarrier && (() => {
        const carrier = carriers.find(c => c.id === editingCarrier)
        if (!carrier) return null
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit Carrier Details: {carrier.carriers.legal_name}
                  </h3>
                  <button
                    onClick={cancelEditing}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Priority Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                    <div className="flex gap-2">
                      {(['high', 'medium', 'low'] as const).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => setEditForm({ ...editForm, priority })}
                          className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                            editForm.priority === priority
                              ? getPriorityColor(priority)
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {priority.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {predefinedTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            disabled={editForm.tags.includes(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              editForm.tags.includes(tag)
                                ? 'bg-blue-100 text-blue-800 cursor-not-allowed opacity-50'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Add custom tag..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const target = e.target as HTMLInputElement
                            addTag(target.value.trim())
                            target.value = ''
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                        >
                          #{tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Add notes about this carrier..."
                    />
                  </div>

                  {/* Last Contacted */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Contacted</label>
                    <input
                      type="date"
                      value={editForm.lastContacted}
                      onChange={(e) => setEditForm({ ...editForm, lastContacted: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={cancelEditing}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveCarrierUpdates(editingCarrier)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}