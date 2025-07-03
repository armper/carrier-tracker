'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface InsuranceData {
  id?: string
  has_insurance: boolean
  insurance_carrier?: string
  policy_number?: string
  insurance_amount?: number
  effective_date?: string
  expiry_date?: string
  days_until_expiry?: number
  last_updated?: string
  updated_by_email?: string
  verification_status: string
  freshness_status: string
  confidence_score: number
  document_url?: string
  document_filename?: string
  upvotes: number
  downvotes: number
  vote_score: number
  user_vote?: string
}

interface InsuranceStatusWithVotingProps {
  carrierId: string
  showDetails?: boolean
  onUpdateClick?: () => void
  refreshTrigger?: number
}

export default function InsuranceStatusWithVoting({ 
  carrierId, 
  showDetails = false, 
  onUpdateClick, 
  refreshTrigger 
}: InsuranceStatusWithVotingProps) {
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    fetchInsuranceStatus()
  }, [carrierId])

  useEffect(() => {
    if (refreshTrigger) {
      refreshInsuranceStatus()
    }
  }, [refreshTrigger])

  const refreshInsuranceStatus = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    await fetchInsuranceStatus()
  }

  const fetchInsuranceStatus = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_carrier_insurance_with_votes', {
        carrier_uuid: carrierId
      })

      if (error) {
        console.error('Error fetching insurance status:', error)
        return
      }

      if (data && data.length > 0) {
        setInsuranceData(data[0])
      } else {
        setInsuranceData({
          has_insurance: false,
          verification_status: 'none',
          freshness_status: 'none',
          confidence_score: 0,
          upvotes: 0,
          downvotes: 0,
          vote_score: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch insurance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!insuranceData?.id) return
    
    setVoting(true)
    try {
      const supabase = createClient()
      
      // If user is clicking the same vote type they already voted, remove the vote
      if (insuranceData.user_vote === voteType) {
        const { data, error } = await supabase.rpc('remove_insurance_vote', {
          p_insurance_info_id: insuranceData.id
        })
        
        if (error) throw error
        
        setInsuranceData(prev => prev ? {
          ...prev,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          vote_score: data.vote_score,
          user_vote: undefined
        } : null)
      } else {
        // Cast new vote
        const { data, error } = await supabase.rpc('vote_insurance_info', {
          p_insurance_info_id: insuranceData.id,
          p_vote_type: voteType
        })
        
        if (error) throw error
        
        setInsuranceData(prev => prev ? {
          ...prev,
          upvotes: data.upvotes,
          downvotes: data.downvotes,
          vote_score: data.vote_score,
          user_vote: data.user_vote
        } : null)
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setVoting(false)
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

    // Check vote score and freshness
    const voteScore = insuranceData.vote_score || 0
    if (voteScore < -2 || insuranceData.freshness_status === 'outdated') {
      return 'bg-red-100 text-red-800 border-red-200'
    }

    if (voteScore < 2 || insuranceData.freshness_status === 'moderate') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }

    // Verified by community and recent
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

    // Check community verification
    const voteScore = insuranceData.vote_score || 0
    if (voteScore >= 3) {
      return 'Community Verified Insurance'
    }
    if (voteScore <= -3) {
      return 'Insurance Info Disputed'
    }
    if (insuranceData.freshness_status === 'recent') {
      return 'Insurance Available'
    }
    if (insuranceData.freshness_status === 'outdated') {
      return 'Insurance Info May Be Outdated'
    }

    return 'Insurance Available'
  }

  const getIconColor = () => {
    if (!insuranceData?.has_insurance) return 'text-gray-500'
    
    if (insuranceData.days_until_expiry !== null && insuranceData.days_until_expiry !== undefined) {
      if (insuranceData.days_until_expiry < 0) return 'text-red-500'
      if (insuranceData.days_until_expiry <= 30) return 'text-yellow-500'
    }

    const voteScore = insuranceData.vote_score || 0
    if (voteScore < -2 || insuranceData.freshness_status === 'outdated') {
      return 'text-red-500'
    }

    if (voteScore < 2 || insuranceData.freshness_status === 'moderate') {
      return 'text-yellow-500'
    }

    return 'text-green-500'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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
    <div className="space-y-3">
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
              
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg w-64 z-50">
                  <div className="mb-1 font-medium">🏛️ Community-Verified Data</div>
                  <div className="text-gray-200">
                    This insurance information is verified by the community through voting. 
                    Data sourced from official FMCSA database lookups.
                  </div>
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

      {/* Community Voting Section */}
      {insuranceData?.has_insurance && insuranceData.id && (
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">Community:</span>
            <button
              onClick={() => handleVote('upvote')}
              disabled={voting}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                insuranceData.user_vote === 'upvote'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
              } disabled:opacity-50`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>{insuranceData.upvotes}</span>
            </button>
            <button
              onClick={() => handleVote('downvote')}
              disabled={voting}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                insuranceData.user_vote === 'downvote'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
              } disabled:opacity-50`}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{insuranceData.downvotes}</span>
            </button>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            insuranceData.vote_score > 0 
              ? 'bg-green-100 text-green-700'
              : insuranceData.vote_score < 0
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}>
            Score: {insuranceData.vote_score > 0 ? '+' : ''}{insuranceData.vote_score}
          </div>
        </div>
      )}

      {showDetails && insuranceData?.has_insurance && (
        <div className="text-xs text-gray-600 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            {insuranceData.insurance_carrier && (
              <div>
                <span className="font-medium">Carrier:</span> {insuranceData.insurance_carrier}
              </div>
            )}
            {insuranceData.policy_number && (
              <div>
                <span className="font-medium">Policy:</span> {insuranceData.policy_number}
              </div>
            )}
            {insuranceData.insurance_amount && (
              <div>
                <span className="font-medium">Coverage:</span> {formatCurrency(insuranceData.insurance_amount)}
              </div>
            )}
            {insuranceData.expiry_date && (
              <div>
                <span className="font-medium">Expires:</span> {formatDate(insuranceData.expiry_date)}
              </div>
            )}
          </div>
          
          {insuranceData.last_updated && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span>
                  <span className="font-medium">Last updated:</span> {formatDate(insuranceData.last_updated)}
                  {insuranceData.updated_by_email && (
                    <span> by {insuranceData.updated_by_email}</span>
                  )}
                </span>
                {insuranceData.document_url && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-blue-600">Document</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}