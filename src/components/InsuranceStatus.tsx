'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface InsuranceStatusData {
  has_insurance: boolean
  insurance_carrier?: string
  policy_number?: string
  expiry_date?: string
  days_until_expiry?: number
  last_updated?: string
  updated_by_email?: string
  verification_status: string
  freshness_status: string
  confidence_score: number
  document_url?: string
  document_filename?: string
}

interface InsuranceStatusProps {
  carrierId: string
  showDetails?: boolean
  onUpdateClick?: () => void
  refreshTrigger?: number // Add a trigger to force refresh
}

export default function InsuranceStatus({ carrierId, showDetails = false, onUpdateClick, refreshTrigger }: InsuranceStatusProps) {
  const [insuranceData, setInsuranceData] = useState<InsuranceStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    fetchInsuranceStatus()
  }, [carrierId])

  // Effect to handle refresh trigger
  useEffect(() => {
    if (refreshTrigger) {
      refreshInsuranceStatus()
    }
  }, [refreshTrigger])

  // Add a method to manually refresh insurance status
  const refreshInsuranceStatus = async () => {
    setLoading(true)
    // Add a small delay to account for potential database replication lag
    await new Promise(resolve => setTimeout(resolve, 500))
    await fetchInsuranceStatus()
  }

  const fetchInsuranceStatus = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_carrier_insurance_status', {
        carrier_uuid: carrierId
      })

      if (error) {
        console.error('Error fetching insurance status:', error)
        return
      }

      if (data && data.length > 0) {
        setInsuranceData(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch insurance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    if (!insuranceData?.has_insurance) {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }

    // Check expiry status first
    if (insuranceData.days_until_expiry !== null && insuranceData.days_until_expiry !== undefined) {
      if (insuranceData.days_until_expiry < 0) {
        return 'bg-red-100 text-red-800 border-red-200' // Expired
      }
      if (insuranceData.days_until_expiry <= 30) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200' // Expiring soon
      }
    }

    // Check freshness and verification status
    if (insuranceData.freshness_status === 'outdated' || 
        insuranceData.verification_status === 'disputed') {
      return 'bg-red-100 text-red-800 border-red-200'
    }

    if (insuranceData.freshness_status === 'moderate' || 
        insuranceData.verification_status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }

    // Recent and verified
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusText = () => {
    if (loading) return 'Loading...'
    
    if (!insuranceData?.has_insurance) {
      return 'No Insurance Info'
    }

    // Check expiry first
    if (insuranceData.days_until_expiry !== null && insuranceData.days_until_expiry !== undefined) {
      if (insuranceData.days_until_expiry < 0) {
        return `Expired ${Math.abs(insuranceData.days_until_expiry)} days ago`
      }
      if (insuranceData.days_until_expiry <= 30) {
        return `Expires in ${insuranceData.days_until_expiry} days`
      }
    }

    // Check verification and freshness
    if (insuranceData.verification_status === 'verified' && insuranceData.freshness_status === 'recent') {
      return 'Insurance Verified'
    }
    
    if (insuranceData.verification_status === 'pending') {
      return 'Insurance Pending Verification'
    }
    
    if (insuranceData.freshness_status === 'outdated') {
      return 'Insurance Info Outdated'
    }

    return 'Insurance Available'
  }

  const getIconColor = () => {
    if (!insuranceData?.has_insurance) return 'text-gray-500'
    
    if (insuranceData.days_until_expiry !== null && insuranceData.days_until_expiry !== undefined) {
      if (insuranceData.days_until_expiry < 0) return 'text-red-500'
      if (insuranceData.days_until_expiry <= 30) return 'text-yellow-500'
    }

    if (insuranceData.freshness_status === 'outdated' || 
        insuranceData.verification_status === 'disputed') {
      return 'text-red-500'
    }

    if (insuranceData.freshness_status === 'moderate' || 
        insuranceData.verification_status === 'pending') {
      return 'text-yellow-500'
    }

    return 'text-green-500'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 relative">
          <div className={`w-3 h-3 rounded-full ${getIconColor().replace('text-', 'bg-')}`}></div>
          <div className="flex items-center space-x-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-gray-600 cursor-help"
                type="button"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-64 z-50">
                  <div className="mb-1 font-medium">⚠️ User-Contributed Data</div>
                  <div className="text-gray-200">
                    This insurance information is crowd-sourced from users. Always verify insurance coverage directly with the carrier or their insurance provider before making business decisions.
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {onUpdateClick && (
          <button
            onClick={onUpdateClick}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Update
          </button>
        )}
      </div>

      {showDetails && insuranceData?.has_insurance && (
        <div className="text-xs text-gray-600 space-y-1">
          {insuranceData.insurance_carrier && (
            <div>Carrier: {insuranceData.insurance_carrier}</div>
          )}
          {insuranceData.policy_number && (
            <div>Policy: {insuranceData.policy_number}</div>
          )}
          {insuranceData.expiry_date && (
            <div>Expires: {formatDate(insuranceData.expiry_date)}</div>
          )}
          {insuranceData.last_updated && (
            <div className="pt-1 border-t border-gray-200">
              Last updated: {formatDate(insuranceData.last_updated)}
              {insuranceData.updated_by_email && (
                <span> by {insuranceData.updated_by_email}</span>
              )}
            </div>
          )}
          <div className="flex items-center space-x-4">
            <span>Confidence: {insuranceData.confidence_score}%</span>
            <span className="capitalize">Status: {insuranceData.verification_status}</span>
            {insuranceData.document_url && (
              <div className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-blue-600">Document</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}