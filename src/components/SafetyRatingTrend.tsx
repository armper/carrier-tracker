'use client'

import { useState, useEffect } from 'react'

interface SafetyRatingHistory {
  id: string
  old_rating: string | null
  new_rating: string
  change_date: string
  data_source: string
  change_reason: string
  months_ago: number
  rating_numeric: number
}

interface SafetyRatingData {
  carrier: {
    id: string
    dot_number: string
    legal_name: string
    safety_rating: string
    safety_rating_last_changed: string | null
    safety_rating_stability_score: number | null
    safety_rating_change_count: number | null
    safety_rating_trend: string | null
    risk_score: number | null
  }
  history: SafetyRatingHistory[]
  total_changes: number
  months_requested: number
}

interface Props {
  carrierId: string
  showTitle?: boolean
  compact?: boolean
}

export default function SafetyRatingTrend({ carrierId, showTitle = true, compact = false }: Props) {
  const [data, setData] = useState<SafetyRatingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonths, setSelectedMonths] = useState(12)

  useEffect(() => {
    fetchSafetyRatingHistory()
  }, [carrierId, selectedMonths])

  const fetchSafetyRatingHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/safety-rating/history/${carrierId}?months=${selectedMonths}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch safety rating history')
      }
    } catch (err) {
      console.error('Error fetching safety rating history:', err)
      setError('Network error while fetching data')
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-500'
      case 'conditional':
        return 'bg-yellow-500'
      case 'unsatisfactory':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getRatingTextColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'text-green-800'
      case 'conditional':
        return 'text-yellow-800'
      case 'unsatisfactory':
        return 'text-red-800'
      default:
        return 'text-gray-800'
    }
  }

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'improving':
        return '📈'
      case 'declining':
        return '📉'
      case 'volatile':
        return '⚡'
      case 'stable':
      default:
        return '📊'
    }
  }

  const getRiskLevelColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-800'
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    if (score >= 40) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTimeAgo = (months: number) => {
    if (months < 1) return 'Less than 1 month ago'
    if (months < 12) return `${Math.round(months)} month${Math.round(months) !== 1 ? 's' : ''} ago`
    const years = Math.floor(months / 12)
    const remainingMonths = Math.round(months % 12)
    if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''} ago`
    return `${years}y ${remainingMonths}m ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-red-600">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { carrier, history } = data

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Safety Rating History</h3>
          {!compact && (
            <select
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
              <option value={36}>Last 36 months</option>
            </select>
          )}
        </div>
      )}

      {/* Current Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Rating</p>
              <p className={`text-lg font-semibold ${getRatingTextColor(carrier.safety_rating)}`}>
                {carrier.safety_rating || 'Not Rated'}
              </p>
            </div>
            <div className={`w-3 h-8 rounded ${getRatingColor(carrier.safety_rating)}`}></div>
          </div>
        </div>

        {carrier.risk_score !== null && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Score</p>
                <p className="text-lg font-semibold text-gray-900">{carrier.risk_score}/100</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(carrier.risk_score)}`}>
                {carrier.risk_score >= 80 ? 'Low Risk' : 
                 carrier.risk_score >= 60 ? 'Medium Risk' : 
                 carrier.risk_score >= 40 ? 'High Risk' : 'Critical'}
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trend</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {getTrendIcon(carrier.safety_rating_trend)} {carrier.safety_rating_trend || 'Stable'}
              </p>
            </div>
            {carrier.safety_rating_stability_score !== null && (
              <span className="text-xs text-gray-600">
                {carrier.safety_rating_stability_score}% stable
              </span>
            )}
          </div>
        </div>
      </div>

      {/* History Timeline */}
      {history.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Recent Changes</h4>
          <div className="space-y-3">
            {history.map((change, index) => (
              <div key={change.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {change.old_rating && (
                    <>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingTextColor(change.old_rating)} bg-white border`}>
                        {change.old_rating}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingTextColor(change.new_rating)} bg-white border`}>
                    {change.new_rating}
                  </span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-900">{formatDate(change.change_date)}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-600">{formatTimeAgo(change.months_ago)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">{change.data_source}</span>
                    {change.change_reason && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{change.change_reason.replace('_', ' ')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Change indicator */}
                <div className="text-right">
                  {change.old_rating && (
                    <span className={`text-xs font-medium ${
                      change.rating_numeric > (change.old_rating === 'satisfactory' ? 3 : change.old_rating === 'conditional' ? 2 : 1)
                        ? 'text-green-600' 
                        : change.rating_numeric < (change.old_rating === 'satisfactory' ? 3 : change.old_rating === 'conditional' ? 2 : 1)
                        ? 'text-red-600' 
                        : 'text-gray-600'
                    }`}>
                      {change.rating_numeric > (change.old_rating === 'satisfactory' ? 3 : change.old_rating === 'conditional' ? 2 : 1) ? '↗ Improved' :
                       change.rating_numeric < (change.old_rating === 'satisfactory' ? 3 : change.old_rating === 'conditional' ? 2 : 1) ? '↘ Declined' : '→ Changed'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Rating Analysis</p>
                <ul className="space-y-1">
                  <li>• {history.length} rating change{history.length !== 1 ? 's' : ''} in the last {selectedMonths} months</li>
                  {carrier.safety_rating_stability_score !== null && (
                    <li>• Stability score: {carrier.safety_rating_stability_score}/100 ({
                      carrier.safety_rating_stability_score >= 80 ? 'Very stable' :
                      carrier.safety_rating_stability_score >= 60 ? 'Stable' :
                      carrier.safety_rating_stability_score >= 40 ? 'Somewhat unstable' : 'Unstable'
                    })</li>
                  )}
                  <li>• Overall trend: {carrier.safety_rating_trend || 'Stable'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No safety rating changes found in the last {selectedMonths} months</p>
          <p className="text-sm mt-1">This indicates a stable safety rating history</p>
        </div>
      )}
    </div>
  )
}