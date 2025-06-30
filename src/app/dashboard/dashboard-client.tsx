'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils'
import { useNotifications } from '@/components/ui/notification'
import { processAnalyticsData } from '@/lib/analytics'
import AnalyticsSummary from '@/components/analytics/AnalyticsSummary'
import SafetyRatingChart from '@/components/analytics/SafetyRatingChart'
import ComplianceChart from '@/components/analytics/ComplianceChart'
import EnhancedCarrierCard from '@/components/dashboard/EnhancedCarrierCard'
import SmartDashboardLayout from '@/components/dashboard/SmartDashboardLayout'
import SmartSuggestions from '@/components/SmartSuggestions'

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

interface DashboardFilters {
  search: string
  riskLevel: 'all' | 'high' | 'medium' | 'low'
  priority: 'all' | 'high' | 'medium' | 'low'
  compliance: 'all' | 'compliant' | 'non-compliant' | 'partial'
  tags: string[]
  sortBy: 'name' | 'added' | 'updated' | 'priority' | 'risk'
  groupBy: 'none' | 'risk' | 'priority' | 'status'
}

interface Props {
  user: User
  savedCarriers: SavedCarrier[]
  alertedCarrierIds: Set<string>
}

export default function DashboardClient({ user, savedCarriers, alertedCarrierIds }: Props) {
  const [carriers, setCarriers] = useState<SavedCarrier[]>(savedCarriers)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [selectedCarriers, setSelectedCarriers] = useState<Set<string>>(new Set())
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({
    search: '',
    riskLevel: 'all',
    priority: 'all',
    compliance: 'all',
    tags: [],
    sortBy: 'risk',
    groupBy: 'risk'
  })
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed')
  const [activeTab, setActiveTab] = useState<'carriers' | 'analytics'>('carriers')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBulkTagModal, setShowBulkTagModal] = useState(false)
  const [bulkTagForm, setBulkTagForm] = useState<{
    action: 'add' | 'remove'
    tags: string[]
  }>({ action: 'add', tags: [] })
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

  // Process analytics data
  const analytics = processAnalyticsData(carriers)

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
    if (!carrier || !carrier.carriers) return

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
        name: carrier.carriers.legal_name || 'Unknown Carrier',
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
    if (!carrier || !carrier.carriers) return

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
          ? `${carrier.carriers.legal_name || 'Carrier'} and ${alertIds.length} alert${alertIds.length > 1 ? 's' : ''} removed.`
          : `${carrier.carriers.legal_name || 'Carrier'} removed from your dashboard.`
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
    if (!carrier || !carrier.carriers) return

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

  // Bulk selection functions
  const handleSelectCarrier = (carrierId: string, checked: boolean) => {
    const newSelected = new Set(selectedCarriers)
    if (checked) {
      newSelected.add(carrierId)
    } else {
      newSelected.delete(carrierId)
    }
    setSelectedCarriers(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedCarriers.size === carriers.length) {
      // Deselect all
      setSelectedCarriers(new Set())
      setShowBulkActions(false)
    } else {
      // Select all
      const allIds = new Set(carriers.map(c => c.id))
      setSelectedCarriers(allIds)
      setShowBulkActions(true)
    }
  }

  const clearSelection = () => {
    setSelectedCarriers(new Set())
    setShowBulkActions(false)
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedCarriers.size === 0) return

    try {
      // Delete all selected carriers
      const deletePromises = Array.from(selectedCarriers).map(async (carrierId) => {
        const carrier = carriers.find(c => c.id === carrierId)
        if (!carrier || !carrier.carriers) return

        // Delete any alerts first
        await supabase
          .from('monitoring_alerts')
          .delete()
          .eq('carrier_id', carrier.carriers.id)
          .eq('user_id', user.id)

        // Delete the saved carrier
        await supabase
          .from('saved_carriers')
          .delete()
          .eq('id', carrierId)
      })

      await Promise.all(deletePromises)

      // Update UI
      const remainingCarriers = carriers.filter(c => !selectedCarriers.has(c.id))
      setCarriers(remainingCarriers)
      
      addNotification({
        type: 'success',
        title: 'Carriers Deleted',
        message: `${selectedCarriers.size} carrier${selectedCarriers.size > 1 ? 's' : ''} removed from your dashboard.`
      })

      clearSelection()
    } catch (error) {
      console.error('Bulk delete error:', error)
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete some carriers. Please try again.'
      })
    }
  }

  const handleBulkExport = (format: 'csv' | 'excel' | 'pdf') => {
    const selectedCarrierData = carriers.filter(c => selectedCarriers.has(c.id))
    
    switch (format) {
      case 'csv':
        exportToCSV(selectedCarrierData)
        break
      case 'excel':
        exportToExcel(selectedCarrierData)
        break
      case 'pdf':
        exportToPDF(selectedCarrierData)
        break
    }

    addNotification({
      type: 'success',
      title: 'Export Complete',
      message: `${selectedCarriers.size} carrier${selectedCarriers.size > 1 ? 's' : ''} exported successfully.`
    })
  }

  const handleBulkTagSubmit = async () => {
    if (selectedCarriers.size === 0 || bulkTagForm.tags.length === 0) return

    try {
      const updatePromises = Array.from(selectedCarriers).map(async (carrierId) => {
        const carrier = carriers.find(c => c.id === carrierId)
        if (!carrier) return

        let newTags = [...(carrier.tags || [])]
        
        if (bulkTagForm.action === 'add') {
          // Add tags that don't already exist
          bulkTagForm.tags.forEach(tag => {
            if (!newTags.includes(tag)) {
              newTags.push(tag)
            }
          })
        } else {
          // Remove specified tags
          newTags = newTags.filter(tag => !bulkTagForm.tags.includes(tag))
        }

        await supabase
          .from('saved_carriers')
          .update({ tags: newTags })
          .eq('id', carrierId)
      })

      await Promise.all(updatePromises)

      // Update UI
      setCarriers(carriers.map(carrier => {
        if (selectedCarriers.has(carrier.id)) {
          let newTags = [...(carrier.tags || [])]
          
          if (bulkTagForm.action === 'add') {
            bulkTagForm.tags.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag)
              }
            })
          } else {
            newTags = newTags.filter(tag => !bulkTagForm.tags.includes(tag))
          }

          return { ...carrier, tags: newTags }
        }
        return carrier
      }))

      addNotification({
        type: 'success',
        title: 'Tags Updated',
        message: `Tags ${bulkTagForm.action === 'add' ? 'added to' : 'removed from'} ${selectedCarriers.size} carrier${selectedCarriers.size > 1 ? 's' : ''}.`
      })

      setShowBulkTagModal(false)
      setBulkTagForm({ action: 'add', tags: [] })
      clearSelection()
    } catch (error) {
      console.error('Bulk tag error:', error)
      addNotification({
        type: 'error',
        title: 'Tag Update Failed',
        message: 'Failed to update tags. Please try again.'
      })
    }
  }

  const addBulkTag = (tag: string) => {
    if (tag && !bulkTagForm.tags.includes(tag)) {
      setBulkTagForm({ ...bulkTagForm, tags: [...bulkTagForm.tags, tag] })
    }
  }

  const removeBulkTag = (tagToRemove: string) => {
    setBulkTagForm({ ...bulkTagForm, tags: bulkTagForm.tags.filter(tag => tag !== tagToRemove) })
  }

  // Quick update functionality for inline editing
  const handleQuickUpdate = async (carrierId: string, field: string, value: unknown) => {
    try {
      const updateData: Record<string, unknown> = {}
      updateData[field] = value

      const { error } = await supabase
        .from('saved_carriers')
        .update(updateData)
        .eq('id', carrierId)

      if (error) throw error

      // Update local state
      setCarriers(carriers.map(carrier => 
        carrier.id === carrierId 
          ? { ...carrier, [field]: value, updated_at: new Date().toISOString() } as SavedCarrier
          : carrier
      ))

      addNotification({
        type: 'success',
        title: 'Updated',
        message: `Carrier ${field} updated successfully.`
      })
    } catch (error: unknown) {
      console.error('Quick update error:', error)
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update carrier. Please try again.'
      })
    }
  }

  // Calculate risk level for filtering
  const getRiskLevel = (savedCarrier: SavedCarrier) => {
    // Check if carrier data exists
    if (!savedCarrier.carriers) {
      return 'low' // Default to low risk if carrier data is missing
    }
    
    const rating = savedCarrier.carriers.safety_rating?.toLowerCase()
    const insurance = savedCarrier.carriers.insurance_status === 'Active'
    const authority = savedCarrier.carriers.authority_status === 'Active'
    const priority = savedCarrier.priority
    
    if (rating === 'unsatisfactory' || (!insurance && !authority) || priority === 'high') {
      return 'high'
    } else if (rating === 'conditional' || !insurance || !authority) {
      return 'medium'
    }
    return 'low'
  }

  // Filter and sort carriers based on dashboard filters
  const filteredAndSortedCarriers = useMemo(() => {
    // Filter out saved carriers with null or missing carrier data
    let filtered = carriers.filter(c => c.carriers != null)

    // Apply search filter
    if (dashboardFilters.search) {
      const searchTerm = dashboardFilters.search.toLowerCase()
      filtered = filtered.filter(c => 
        c.carriers?.legal_name?.toLowerCase().includes(searchTerm) ||
        c.carriers?.dba_name?.toLowerCase().includes(searchTerm) ||
        c.carriers?.dot_number?.includes(searchTerm) ||
        c.notes?.toLowerCase().includes(searchTerm) ||
        c.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Apply risk level filter
    if (dashboardFilters.riskLevel !== 'all') {
      filtered = filtered.filter(c => getRiskLevel(c) === dashboardFilters.riskLevel)
    }

    // Apply priority filter
    if (dashboardFilters.priority !== 'all') {
      filtered = filtered.filter(c => c.priority === dashboardFilters.priority)
    }

    // Apply compliance filter
    if (dashboardFilters.compliance !== 'all') {
      filtered = filtered.filter(c => {
        const insurance = c.carriers?.insurance_status === 'Active'
        const authority = c.carriers?.authority_status === 'Active'
        
        switch (dashboardFilters.compliance) {
          case 'compliant':
            return insurance && authority
          case 'partial':
            return (insurance && !authority) || (!insurance && authority)
          case 'non-compliant':
            return !insurance && !authority
          default:
            return true
        }
      })
    }

    // Apply tag filter
    if (dashboardFilters.tags.length > 0) {
      filtered = filtered.filter(c => 
        c.tags && c.tags.some(tag => dashboardFilters.tags.includes(tag))
      )
    }

    // Sort carriers
    filtered.sort((a, b) => {
      switch (dashboardFilters.sortBy) {
        case 'name':
          return (a.carriers?.legal_name || '').localeCompare(b.carriers?.legal_name || '')
        case 'added':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
          const aUpdated = a.updated_at || a.created_at
          const bUpdated = b.updated_at || b.created_at
          return new Date(bUpdated).getTime() - new Date(aUpdated).getTime()
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.priority || 'medium']
          const bPriority = priorityOrder[b.priority || 'medium']
          return bPriority - aPriority
        case 'risk':
          const riskOrder = { high: 3, medium: 2, low: 1 }
          const aRisk = riskOrder[getRiskLevel(a)]
          const bRisk = riskOrder[getRiskLevel(b)]
          return bRisk - aRisk
        default:
          return 0
      }
    })

    return filtered
  }, [carriers, dashboardFilters])

  // Group carriers if grouping is enabled
  const groupedCarriers = useMemo(() => {
    if (dashboardFilters.groupBy === 'none') {
      return { 'All Carriers': filteredAndSortedCarriers }
    }

    const groups: Record<string, SavedCarrier[]> = {}
    
    filteredAndSortedCarriers.forEach(carrier => {
      let groupKey = ''
      
      switch (dashboardFilters.groupBy) {
        case 'risk':
          const risk = getRiskLevel(carrier)
          groupKey = risk === 'high' ? 'High Risk' : risk === 'medium' ? 'Medium Risk' : 'Low Risk'
          break
        case 'priority':
          groupKey = carrier.priority ? `${carrier.priority.charAt(0).toUpperCase() + carrier.priority.slice(1)} Priority` : 'Medium Priority'
          break
        case 'status':
          const insurance = carrier.carriers?.insurance_status === 'Active'
          const authority = carrier.carriers?.authority_status === 'Active'
          groupKey = insurance && authority ? 'Fully Compliant' : 
                    (insurance || authority) ? 'Partial Compliance' : 'Non-Compliant'
          break
        default:
          groupKey = 'All Carriers'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(carrier)
    })

    return groups
  }, [filteredAndSortedCarriers, dashboardFilters.groupBy])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                CarrierTracker
              </Link>
              <nav className="flex items-center gap-4">
                <Link href="/search" className="text-gray-600 hover:text-gray-900">
                  Search
                </Link>
                <Link href="/dashboard" className="text-blue-600 font-medium">
                  Dashboard
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-50">
                  <span className="text-sm">{user.email?.split('@')[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('carriers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'carriers'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Carriers
                  {carriers.length > 0 && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                      {carriers.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'carriers' && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Saved Carriers {carriers.length > 0 && <span className="text-sm font-normal text-gray-600">({carriers.length})</span>}
              </h2>
              {carriers.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedCarriers.size === carriers.length && carriers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select All
                </label>
              )}
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/monitoring"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Monitoring
              </Link>
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

          {/* Bulk Actions Toolbar */}
          {showBulkActions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedCarriers.size} carrier{selectedCarriers.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Selected
                    </button>
                    {isExportDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleBulkExport('csv');
                              setIsExportDropdownOpen(false);
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            📄 Export as CSV
                          </button>
                          <button
                            onClick={() => {
                              handleBulkExport('excel');
                              setIsExportDropdownOpen(false);
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            📊 Export as Excel
                          </button>
                          <button
                            onClick={() => {
                              handleBulkExport('pdf');
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
                  <button
                    onClick={() => setShowBulkTagModal(true)}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Tag Selected
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

            {/* Enhanced Dashboard Layout */}
          <SmartDashboardLayout
            carriers={filteredAndSortedCarriers}
            analytics={analytics}
            selectedCarriers={selectedCarriers}
            onFilterChange={setDashboardFilters}
            onViewChange={setViewMode}
          >
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
              <>
                {Object.entries(groupedCarriers).map(([groupName, groupCarriers]) => (
                  <div key={groupName} className="space-y-4">
                    {dashboardFilters.groupBy !== 'none' && (
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          {groupCarriers.length} carrier{groupCarriers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    
                    <div className={`grid gap-4 ${
                      viewMode === 'compact' ? 'lg:grid-cols-2' : 'grid-cols-1'
                    }`}>
                      {groupCarriers.map((savedCarrier) => (
                        <EnhancedCarrierCard
                          key={savedCarrier.id}
                          savedCarrier={savedCarrier}
                          isSelected={selectedCarriers.has(savedCarrier.id)}
                          isAlerted={savedCarrier.carriers ? alertedCarrierIds.has(savedCarrier.carriers.id) : false}
                          onSelect={handleSelectCarrier}
                          onRemove={handleRemoveCarrier}
                          onEdit={startEditing}
                          onQuickUpdate={handleQuickUpdate}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </SmartDashboardLayout>

          {/* Smart Suggestions */}
          <div className="mt-8">
            <SmartSuggestions 
              userId={user.id} 
              onCarrierSaved={() => {
                // Refresh the page or update carriers list
                window.location.reload()
              }} 
            />
          </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900">Portfolio Analytics</h2>
              <div className="text-sm text-gray-600">
                Analysis of {carriers.length} carrier{carriers.length !== 1 ? 's' : ''}
              </div>
            </div>

            {carriers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data for analytics</h3>
                <p className="text-gray-600 mb-4">Add carriers to your dashboard to see portfolio analytics and insights.</p>
                <button
                  onClick={() => {
                    setActiveTab('carriers')
                    router.push('/search')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Search Carriers
                </button>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <AnalyticsSummary analytics={analytics} />
                
                {/* Charts Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <SafetyRatingChart analytics={analytics} />
                  <ComplianceChart analytics={analytics} />
                </div>

                {/* Additional Analytics Insights */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Insights</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Assessment</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>High Risk Carriers</span>
                          <span className="font-medium text-red-600">
                            {analytics.riskAssessment.highRisk} ({Math.round((analytics.riskAssessment.highRisk / analytics.totalCarriers) * 100)}%)
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Medium Risk Carriers</span>
                          <span className="font-medium text-yellow-600">
                            {analytics.riskAssessment.mediumRisk} ({Math.round((analytics.riskAssessment.mediumRisk / analytics.totalCarriers) * 100)}%)
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Low Risk Carriers</span>
                          <span className="font-medium text-green-600">
                            {analytics.riskAssessment.lowRisk} ({Math.round((analytics.riskAssessment.lowRisk / analytics.totalCarriers) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Added This Week</span>
                          <span className="font-medium text-blue-600">{analytics.recentActivity.addedThisWeek}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Added This Month</span>
                          <span className="font-medium text-blue-600">{analytics.recentActivity.addedThisMonth}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Portfolio Growth</span>
                          <span className="font-medium text-green-600">
                            {analytics.recentActivity.addedThisMonth > 0 ? '+' : ''}{analytics.recentActivity.addedThisMonth} this month
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
        if (!carrier || !carrier.carriers) return null
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit Carrier Details: {carrier.carriers.legal_name || 'Unknown Carrier'}
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

      {/* Bulk Tag Modal */}
      {showBulkTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Bulk Tag Management
              </h3>
              <button
                onClick={() => {
                  setShowBulkTagModal(false)
                  setBulkTagForm({ action: 'add', tags: [] })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="action"
                      value="add"
                      checked={bulkTagForm.action === 'add'}
                      onChange={(e) => setBulkTagForm({ ...bulkTagForm, action: e.target.value as 'add' | 'remove' })}
                      className="mr-2"
                    />
                    Add Tags
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="action"
                      value="remove"
                      checked={bulkTagForm.action === 'remove'}
                      onChange={(e) => setBulkTagForm({ ...bulkTagForm, action: e.target.value as 'add' | 'remove' })}
                      className="mr-2"
                    />
                    Remove Tags
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {bulkTagForm.action === 'add' ? 'Add Tags' : 'Remove Tags'}
                </label>
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {predefinedTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => addBulkTag(tag)}
                        disabled={bulkTagForm.tags.includes(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          bulkTagForm.tags.includes(tag)
                            ? 'bg-purple-100 text-purple-800 cursor-not-allowed opacity-50'
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
                        addBulkTag(target.value.trim())
                        target.value = ''
                      }
                    }}
                  />
                </div>
                
                {bulkTagForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {bulkTagForm.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                      >
                        #{tag}
                        <button
                          onClick={() => removeBulkTag(tag)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600">
                This will {bulkTagForm.action} the selected tags {bulkTagForm.action === 'add' ? 'to' : 'from'} {selectedCarriers.size} carrier{selectedCarriers.size > 1 ? 's' : ''}.
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkTagModal(false)
                  setBulkTagForm({ action: 'add', tags: [] })
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTagSubmit}
                disabled={bulkTagForm.tags.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {bulkTagForm.action === 'add' ? 'Add Tags' : 'Remove Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}