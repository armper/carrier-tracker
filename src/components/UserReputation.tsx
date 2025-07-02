'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface UserReputationData {
  reputation_score: number
  total_submissions: number
  verified_submissions: number
  document_submissions: number
  reputation_level: string
  badge_title: string
}

interface UserReputationProps {
  userId?: string
  showDetails?: boolean
  inline?: boolean
}

export default function UserReputation({ userId, showDetails = false, inline = false }: UserReputationProps) {
  const [reputationData, setReputationData] = useState<UserReputationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserReputation()
  }, [userId])

  const fetchUserReputation = async () => {
    try {
      const supabase = createClient()
      
      let targetUserId = userId
      if (!targetUserId) {
        // Get current user if no userId provided
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        targetUserId = user.id
      }

      const { data, error } = await supabase.rpc('get_user_reputation', {
        p_user_id: targetUserId
      })

      if (error) {
        console.error('Error fetching user reputation:', error)
        return
      }

      if (data && data.length > 0) {
        setReputationData(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch user reputation:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100 border-green-200'
    if (score >= 75) return 'bg-blue-100 border-blue-200'
    if (score >= 60) return 'bg-yellow-100 border-yellow-200'
    return 'bg-gray-100 border-gray-200'
  }

  const getProgressBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 75) return 'bg-blue-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (loading) {
    return inline ? (
      <span className="text-xs text-gray-500">Loading...</span>
    ) : (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    )
  }

  if (!reputationData) {
    return inline ? (
      <span className="text-xs text-gray-500">New Member</span>
    ) : null
  }

  if (inline) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getScoreBg(reputationData.reputation_score)}`}>
          {reputationData.badge_title}
        </span>
        <span className={`text-xs font-medium ${getScoreColor(reputationData.reputation_score)}`}>
          {reputationData.reputation_score}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Your Reputation</h3>
        <span className={`text-xl font-bold ${getScoreColor(reputationData.reputation_score)}`}>
          {reputationData.reputation_score}
        </span>
      </div>

      {/* Badge */}
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mb-3 ${getScoreBg(reputationData.reputation_score)}`}>
        {reputationData.badge_title}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{reputationData.reputation_score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(reputationData.reputation_score)}`}
            style={{ width: `${reputationData.reputation_score}%` }}
          />
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Total Submissions:</span>
            <span className="font-medium">{reputationData.total_submissions}</span>
          </div>
          <div className="flex justify-between">
            <span>Verified Submissions:</span>
            <span className="font-medium text-green-600">{reputationData.verified_submissions}</span>
          </div>
          <div className="flex justify-between">
            <span>Document Uploads:</span>
            <span className="font-medium text-blue-600">{reputationData.document_submissions}</span>
          </div>
          
          <div className="pt-2 mt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <span className="font-medium">How to improve:</span> Submit accurate data, upload documents, and get your submissions verified by the community.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}