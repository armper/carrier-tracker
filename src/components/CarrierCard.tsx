'use client'

import Link from 'next/link'
import { useState } from 'react'
import InsuranceStatus from './InsuranceStatus'
import InsuranceUpdateForm from './InsuranceUpdateForm'

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
  data_source?: string
  verified?: boolean
  trust_score?: number
  // Insurance fields removed - using crowd-sourced data instead
}

interface CarrierCardProps {
  carrier: Carrier
  onSave?: (carrierId: string) => void
  isSaving?: boolean
  showSaveButton?: boolean
  isSaved?: boolean
}

export default function CarrierCard({ carrier, onSave, isSaving, showSaveButton = true, isSaved = false }: CarrierCardProps) {
  const [showInsuranceForm, setShowInsuranceForm] = useState(false)
  const [insuranceKey, setInsuranceKey] = useState(0) // For forcing refresh
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

  const handleInsuranceUpdate = () => {
    setShowInsuranceForm(true)
  }

  const handleInsuranceSuccess = () => {
    setInsuranceKey(prev => prev + 1) // Force refresh of insurance status
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <Link href={`/carrier/${carrier.dot_number}`} className="block p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {carrier.legal_name}
              </h3>
              
              {/* Data Source Badge */}
              {carrier.data_source && (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  carrier.data_source === 'fmcsa' || carrier.data_source === 'safer_scraper'
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {carrier.data_source === 'fmcsa' ? '🏛️ FMCSA' : 
                   carrier.data_source === 'safer_scraper' ? '🤖 SAFER' :
                   '📝 Manual'}
                </span>
              )}
              
              {/* Entity Type Badge */}
              {carrier.entity_type && (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  carrier.entity_type.toLowerCase().includes('carrier')
                    ? 'bg-blue-100 text-blue-800'
                    : carrier.entity_type.toLowerCase().includes('broker')
                    ? 'bg-purple-100 text-purple-800'
                    : carrier.entity_type.toLowerCase().includes('forwarder')
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {carrier.entity_type.toLowerCase().includes('carrier') ? '🚛' : 
                   carrier.entity_type.toLowerCase().includes('broker') ? '📋' :
                   carrier.entity_type.toLowerCase().includes('forwarder') ? '📦' : '🏢'} {carrier.entity_type}
                </span>
              )}
              
              {/* Verification Badge */}
              {carrier.verified !== undefined && (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  carrier.verified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {carrier.verified ? '✓ Verified' : '⚠️ Unverified'}
                </span>
              )}
            </div>
            
            {carrier.dba_name && (
              <p className="text-sm text-gray-600 mb-1">DBA: {carrier.dba_name}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>DOT: {carrier.dot_number}</span>
              {carrier.state && carrier.city && (
                <span>📍 {carrier.city}, {carrier.state}</span>
              )}
              {carrier.vehicle_count && (
                <span>🚛 {carrier.vehicle_count} vehicles</span>
              )}
              {/* Trust Score */}
              {carrier.trust_score && (
                <span className={`text-sm font-medium ${
                  carrier.trust_score >= 90 ? 'text-green-600' :
                  carrier.trust_score >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  🛡️ {carrier.trust_score}% trust
                </span>
              )}
            </div>
            {carrier.phone && (
              <p className="text-sm text-gray-600 mt-1">📞 {carrier.phone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600 block mb-1">Safety Rating</span>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
              {carrier.safety_rating || 'Not Rated'}
            </div>
          </div>
          
          <div>
            <span className="text-sm text-gray-600 block mb-1">Insurance</span>
            <InsuranceStatus 
              key={insuranceKey}
              carrierId={carrier.id} 
              showDetails={false}
              onUpdateClick={handleInsuranceUpdate}
            />
          </div>
          
          <div>
            <span className="text-sm text-gray-600 block mb-1">Authority</span>
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              carrier.authority_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {carrier.authority_status}
            </div>
          </div>
        </div>
      </Link>
      
      {showSaveButton && (
        <div className="px-6 pb-6">
          {isSaved ? (
            <div className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm text-center font-medium">
              ✓ Saved to Dashboard
            </div>
          ) : onSave ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSave(carrier.id)
              }}
              disabled={isSaving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isSaving ? 'Saving...' : 'Save to Dashboard'}
            </button>
          ) : null}
        </div>
      )}
      
      {/* Insurance Update Form Modal */}
      {showInsuranceForm && (
        <InsuranceUpdateForm
          carrierId={carrier.id}
          carrierName={carrier.legal_name}
          onClose={() => setShowInsuranceForm(false)}
          onSuccess={handleInsuranceSuccess}
        />
      )}
    </div>
  )
}