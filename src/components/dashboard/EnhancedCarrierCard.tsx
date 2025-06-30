'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string | null
  insurance_status: string
  authority_status: string
  carb_compliance: boolean
  state: string | null
  city: string | null
  vehicle_count: number | null
  // Insurance tracking fields
  insurance_expiry_date?: string | null
  insurance_carrier?: string | null
  insurance_policy_number?: string | null
  insurance_amount?: number | null
  insurance_effective_date?: string | null
  insurance_last_verified?: string | null
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

interface EnhancedCarrierCardProps {
  savedCarrier: SavedCarrier
  isSelected: boolean
  isAlerted: boolean
  onSelect: (carrierId: string, checked: boolean) => void
  onRemove: (carrierId: string) => void
  onEdit: (savedCarrier: SavedCarrier) => void
  onQuickUpdate: (carrierId: string, field: string, value: unknown) => void
}

export default function EnhancedCarrierCard({ 
  savedCarrier, 
  isSelected, 
  isAlerted,
  onSelect, 
  onRemove, 
  onEdit,
  onQuickUpdate 
}: EnhancedCarrierCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [quickEditMode, setQuickEditMode] = useState<string | null>(null)
  const [quickNote, setQuickNote] = useState(savedCarrier.notes || '')
  
  const carrier = savedCarrier.carriers
  
  // Calculate risk level
  const getRiskLevel = () => {
    const rating = carrier.safety_rating?.toLowerCase()
    const insurance = carrier.insurance_status === 'Active'
    const authority = carrier.authority_status === 'Active'
    const priority = savedCarrier.priority
    
    if (rating === 'unsatisfactory' || (!insurance && !authority) || priority === 'high') {
      return 'high'
    } else if (rating === 'conditional' || !insurance || !authority) {
      return 'medium'
    }
    return 'low'
  }

  const riskLevel = getRiskLevel()
  
  const getRiskLevelConfig = (level: string) => {
    switch (level) {
      case 'high':
        return { 
          bg: 'bg-red-50 border-red-200', 
          header: 'bg-red-500', 
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          label: 'HIGH RISK'
        }
      case 'medium':
        return { 
          bg: 'bg-yellow-50 border-yellow-200', 
          header: 'bg-yellow-500', 
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          label: 'MEDIUM RISK'
        }
      default:
        return { 
          bg: 'bg-green-50 border-green-200', 
          header: 'bg-green-500', 
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          label: 'LOW RISK'
        }
    }
  }

  const getSafetyRatingConfig = (rating: string | null) => {
    if (!rating) {
      return { bg: 'bg-gray-500', text: 'text-white', label: 'NOT RATED' }
    }
    
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return { bg: 'bg-green-500', text: 'text-white', label: 'SATISFACTORY' }
      case 'conditional':
        return { bg: 'bg-yellow-500', text: 'text-white', label: 'CONDITIONAL' }
      case 'unsatisfactory':
        return { bg: 'bg-red-500', text: 'text-white', label: 'UNSATISFACTORY' }
      default:
        return { bg: 'bg-gray-500', text: 'text-white', label: rating.toUpperCase() }
    }
  }

  const getInsuranceStatus = () => {
    if (!carrier.insurance_expiry_date) {
      return {
        status: carrier.insurance_status,
        color: carrier.insurance_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        warning: null
      }
    }

    const expiryDate = new Date(carrier.insurance_expiry_date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) {
      return {
        status: 'EXPIRED',
        color: 'bg-red-100 text-red-800',
        warning: `Expired ${Math.abs(daysUntilExpiry)} days ago`
      }
    } else if (daysUntilExpiry <= 7) {
      return {
        status: 'Expires Soon',
        color: 'bg-red-100 text-red-800',
        warning: `Expires in ${daysUntilExpiry} days`
      }
    } else if (daysUntilExpiry <= 15) {
      return {
        status: 'Expires Soon',
        color: 'bg-orange-100 text-orange-800',
        warning: `Expires in ${daysUntilExpiry} days`
      }
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'Active',
        color: 'bg-yellow-100 text-yellow-800',
        warning: `Expires in ${daysUntilExpiry} days`
      }
    } else {
      return {
        status: 'Active',
        color: 'bg-green-100 text-green-800',
        warning: null
      }
    }
  }

  const handleQuickNoteSubmit = () => {
    onQuickUpdate(savedCarrier.id, 'notes', quickNote.trim() || null)
    setQuickEditMode(null)
  }

  const handleQuickPriorityChange = (priority: 'high' | 'medium' | 'low') => {
    onQuickUpdate(savedCarrier.id, 'priority', priority)
  }

  const riskConfig = getRiskLevelConfig(riskLevel)
  const safetyConfig = getSafetyRatingConfig(carrier.safety_rating)
  
  return (
    <div 
      className={`relative bg-white rounded-lg shadow-md border-2 transition-all duration-200 ${riskConfig.bg} ${
        isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      } ${isHovered ? 'shadow-lg transform scale-[1.02]' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Risk Level Header */}
      <div className={`${riskConfig.header} text-white px-4 py-2 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(savedCarrier.id, e.target.checked)}
              className="rounded border-white text-white focus:ring-white focus:ring-offset-0"
            />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{riskConfig.label}</span>
            {isAlerted && (
              <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2L13.09 8.26L20 9L15 14L16.18 21L10 17.77L3.82 21L5 14L0 9L6.91 8.26L10 2Z"/>
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* Priority Quick Switch */}
        <div className="flex items-center gap-1">
          {(['high', 'medium', 'low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleQuickPriorityChange(p)}
              className={`w-3 h-3 rounded-full border-2 border-white transition-colors ${
                savedCarrier.priority === p ? 'bg-white' : 'bg-transparent hover:bg-white hover:bg-opacity-50'
              }`}
              title={`Set ${p} priority`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Main Carrier Info */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/carrier/${carrier.dot_number}`}
                className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors truncate"
              >
                {carrier.legal_name}
              </Link>
              {carrier.dba_name && (
                <span className="text-sm text-gray-500 truncate">({carrier.dba_name})</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">DOT: {carrier.dot_number}</span>
              {carrier.state && <span>• {carrier.state}</span>}
              {carrier.vehicle_count && <span>• {carrier.vehicle_count} vehicles</span>}
            </div>
          </div>
          
          {/* Quick Actions (appear on hover) */}
          {isHovered && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onEdit(savedCarrier)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onRemove(savedCarrier.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove carrier"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`${safetyConfig.bg} ${safetyConfig.text} px-2 py-1 rounded-full text-xs font-bold`}>
            {safetyConfig.label}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInsuranceStatus().color}`}>
            INS: {getInsuranceStatus().status}
          </span>
          {getInsuranceStatus().warning && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ⚠️ {getInsuranceStatus().warning}
            </span>
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            carrier.authority_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            AUTH: {carrier.authority_status}
          </span>
          {savedCarrier.priority && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              savedCarrier.priority === 'high' ? 'bg-red-100 text-red-800' :
              savedCarrier.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {savedCarrier.priority.toUpperCase()} PRIORITY
            </span>
          )}
        </div>

        {/* Tags */}
        {savedCarrier.tags && savedCarrier.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {savedCarrier.tags.map((tag, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes Section - Quick Edit */}
        <div className="mb-3">
          {quickEditMode === 'notes' ? (
            <div className="space-y-2">
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={2}
                placeholder="Add notes..."
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleQuickNoteSubmit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setQuickEditMode(null)
                    setQuickNote(savedCarrier.notes || '')
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setQuickEditMode('notes')}
              className="cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200 transition-colors"
            >
              {savedCarrier.notes ? (
                <p className="text-sm text-gray-700">{savedCarrier.notes}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">Click to add notes...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Added {new Date(savedCarrier.created_at).toLocaleDateString()}</span>
          {savedCarrier.last_contacted && (
            <span>Last contact: {new Date(savedCarrier.last_contacted).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}