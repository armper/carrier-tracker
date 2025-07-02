'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import CommentThread from './CommentThread'

interface RateAverage {
  average_rate: number
  submission_count: number
  verified_average: number
  verified_count: number
  load_type: string
  route_type: string
}

interface RecentSubmission {
  id: string
  rate_per_mile: number
  load_type: string
  route_type: string
  experience_level: string
  employment_type: string
  comment: string | null
  submission_date: string
  verified: boolean
  verification_count: number
  dispute_count: number
  submitter_reputation: number
}

interface RateDisplayProps {
  carrierId: string
  carrierName: string
  onSubmitRate?: () => void
}

export default function RateDisplay({ carrierId, carrierName, onSubmitRate }: RateDisplayProps) {
  const [rateAverages, setRateAverages] = useState<RateAverage[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilters, setSelectedFilters] = useState({
    load_type: '',
    route_type: ''
  })

  useEffect(() => {
    console.log('RateDisplay component mounted for carrier:', carrierId)
    fetchRateData()
  }, [carrierId, selectedFilters])

  const fetchRateData = async () => {
    try {
      console.log('Fetching rate data for carrier:', carrierId)
      
      // Skip if we have a temporary ID (from FMCSA lookup)
      if (carrierId.startsWith('temp-')) {
        console.log('Skipping rate data fetch for temporary carrier ID')
        setLoading(false)
        return
      }
      
      const supabase = createClient()
      
      // Fetch rate averages
      const { data: averages, error: avgError } = await supabase.rpc('get_carrier_rate_average', {
        p_carrier_id: carrierId,
        p_load_type: selectedFilters.load_type || null,
        p_route_type: selectedFilters.route_type || null
      })

      if (avgError) {
        console.error('Error fetching rate averages:', avgError)
      } else {
        console.log('Rate averages fetched:', averages)
        setRateAverages(averages || [])
      }

      // Fetch recent submissions
      const { data: submissions, error: subError } = await supabase.rpc('get_recent_rate_submissions', {
        p_carrier_id: carrierId,
        p_limit: 10
      })

      if (subError) {
        console.error('Error fetching recent submissions:', subError)
      } else {
        setRecentSubmissions(submissions || [])
      }

    } catch (error) {
      console.error('Failed to fetch rate data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOverallAverage = () => {
    if (rateAverages.length === 0) return null
    
    const totalSubmissions = rateAverages.reduce((sum, avg) => sum + avg.submission_count, 0)
    const weightedSum = rateAverages.reduce((sum, avg) => sum + (avg.average_rate * avg.submission_count), 0)
    
    return totalSubmissions > 0 ? (weightedSum / totalSubmissions) : null
  }

  const getReputationBadge = (score: number) => {
    if (score >= 90) return { text: 'Expert', color: 'bg-green-100 text-green-800' }
    if (score >= 75) return { text: 'Trusted', color: 'bg-blue-100 text-blue-800' }
    if (score >= 60) return { text: 'Active', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'New', color: 'bg-gray-100 text-gray-800' }
  }

  const formatLoadType = (loadType: string) => {
    const map: { [key: string]: string } = {
      'dry_van': 'Dry Van',
      'reefer': 'Refrigerated', 
      'flatbed': 'Flatbed',
      'tanker': 'Tanker',
      'hazmat': 'Hazmat',
      'oversized': 'Oversized',
      'car_hauler': 'Car Hauler',
      'livestock': 'Livestock',
      'other': 'Other'
    }
    return map[loadType] || loadType
  }

  const formatRouteType = (routeType: string) => {
    const map: { [key: string]: string } = {
      'local': 'Local',
      'regional': 'Regional',
      'otr': 'OTR',
      'dedicated': 'Dedicated'
    }
    return map[routeType] || routeType
  }

  const formatExperience = (experience: string) => {
    const map: { [key: string]: string } = {
      'new': 'New Driver',
      'experienced': 'Experienced',
      'veteran': 'Veteran'
    }
    return map[experience] || experience
  }

  const formatEmployment = (employment: string) => {
    const map: { [key: string]: string } = {
      'company_driver': 'Company Driver',
      'owner_operator': 'Owner Operator',
      'lease_operator': 'Lease Operator'
    }
    return map[employment] || employment
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const overallAverage = getOverallAverage()
  const totalSubmissions = rateAverages.reduce((sum, avg) => sum + avg.submission_count, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  // Check for temporary carrier IDs and show info message
  if (carrierId.startsWith('temp-')) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            💰 Rate Per Mile
          </h3>
        </div>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Rate Data Temporarily Unavailable</h4>
          <p className="text-gray-500 mb-4">
            This carrier's data is being loaded from FMCSA. Rate information will be available once the carrier is fully processed in our system.
          </p>
          <p className="text-xs text-gray-400">
            Refresh the page in a few moments to see rate data for {carrierName}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Rate Summary */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            💰 Rate Per Mile
          </h3>
          {onSubmitRate && (
            <button
              onClick={onSubmitRate}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Submit My Rate
            </button>
          )}
        </div>

        {overallAverage ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">
                ${overallAverage.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600">Average Rate</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-900">
                {totalSubmissions}
              </div>
              <div className="text-sm text-green-600">Total Reports</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-900">
                {rateAverages.reduce((sum, avg) => sum + avg.verified_count, 0)}
              </div>
              <div className="text-sm text-purple-600">Verified Reports</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Rate Data Yet</h4>
            <p className="text-gray-500 mb-4">
              Be the first to share rate information for {carrierName}
            </p>
            {onSubmitRate && (
              <button
                onClick={onSubmitRate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Submit First Rate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Detailed Breakdown */}
      {rateAverages.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">📊 Rate Breakdown</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Load Type</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Route</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Average Rate</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Reports</th>
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Verified</th>
                </tr>
              </thead>
              <tbody>
                {rateAverages.map((avg, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 text-sm">{formatLoadType(avg.load_type)}</td>
                    <td className="py-2 text-sm">{formatRouteType(avg.route_type)}</td>
                    <td className="py-2 text-sm font-semibold text-green-600">
                      ${avg.average_rate.toFixed(2)}
                    </td>
                    <td className="py-2 text-sm">{avg.submission_count}</td>
                    <td className="py-2 text-sm">
                      {avg.verified_count > 0 && (
                        <span className="text-blue-600">
                          {avg.verified_count} (${avg.verified_average?.toFixed(2)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">🗣️ Recent Driver Reports</h4>
          
          <div className="space-y-6">
            {recentSubmissions.map((submission, index) => {
              const badge = getReputationBadge(submission.submitter_reputation)
              return (
                <div key={submission.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Rate submission info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl font-bold text-green-600">
                          ${submission.rate_per_mile.toFixed(2)}/mi
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            {badge.text}
                          </span>
                          {submission.verified && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(submission.submission_date)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
                      <div>📦 {formatLoadType(submission.load_type)}</div>
                      <div>🗺️ {formatRouteType(submission.route_type)}</div>
                      <div>👨‍💼 {formatExperience(submission.experience_level)}</div>
                      <div>💼 {formatEmployment(submission.employment_type || 'company_driver')}</div>
                    </div>

                    {submission.comment && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700 italic">"{submission.comment}"</p>
                      </div>
                    )}

                    {(submission.verification_count > 0 || submission.dispute_count > 0) && (
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        {submission.verification_count > 0 && (
                          <span className="text-green-600">
                            👍 {submission.verification_count} verified
                          </span>
                        )}
                        {submission.dispute_count > 0 && (
                          <span className="text-red-600">
                            👎 {submission.dispute_count} disputed
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments section for this rate submission */}
                  <div className="border-t border-gray-100 bg-gray-50">
                    <CommentThread
                      targetType="rate_submission"
                      targetId={submission.id}
                      title="Comments"
                      showCommentCount={true}
                      allowComments={true}
                      className="!bg-transparent !border-0 !rounded-none"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              💡 Rates are reported anonymously by drivers. Verify with the carrier before making decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}