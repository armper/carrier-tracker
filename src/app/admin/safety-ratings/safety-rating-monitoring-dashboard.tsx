'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SafetyRatingChange {
  carrier_id: string
  dot_number: string
  legal_name: string
  old_rating: string
  new_rating: string
  change_date: string
  data_source: string
  change_reason: string
  days_ago: number
}

interface Stats {
  totalCarriers: number
  ratingDistribution: {
    satisfactory: number
    conditional: number
    unsatisfactory: number
    notRated: number
  }
  trends: {
    improving: number
    declining: number
    volatile: number
    stable: number
  }
  recentChanges: {
    total: number
    critical: number
    positive: number
  }
}

interface Props {
  recentChanges: SafetyRatingChange[]
  stats: Stats
}

export default function SafetyRatingMonitoringDashboard({ recentChanges, stats }: Props) {
  const [selectedTab, setSelectedTab] = useState<'changes' | 'trends' | 'distribution'>('changes')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'positive'>('all')

  // Categorize changes
  const criticalChanges = recentChanges.filter(c => 
    (c.old_rating === 'satisfactory' && c.new_rating !== 'satisfactory') ||
    (c.new_rating === 'unsatisfactory')
  )

  const positiveChanges = recentChanges.filter(c => 
    (c.old_rating === 'unsatisfactory' && c.new_rating !== 'unsatisfactory') ||
    (c.old_rating === 'conditional' && c.new_rating === 'satisfactory')
  )

  const getFilteredChanges = () => {
    switch (selectedFilter) {
      case 'critical':
        return criticalChanges
      case 'positive':
        return positiveChanges
      default:
        return recentChanges
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unsatisfactory':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getChangeIndicator = (oldRating: string, newRating: string) => {
    const oldScore = oldRating === 'satisfactory' ? 3 : oldRating === 'conditional' ? 2 : 1
    const newScore = newRating === 'satisfactory' ? 3 : newRating === 'conditional' ? 2 : 1
    
    if (newScore > oldScore) {
      return { icon: '↗', color: 'text-green-600', label: 'Improved' }
    } else if (newScore < oldScore) {
      return { icon: '↘', color: 'text-red-600', label: 'Declined' }
    } else {
      return { icon: '→', color: 'text-gray-600', label: 'Changed' }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDaysAgo = (days: number) => {
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('changes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'changes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Changes ({recentChanges.length})
          </button>
          <button
            onClick={() => setSelectedTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'trends'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Trend Analysis
          </button>
          <button
            onClick={() => setSelectedTab('distribution')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'distribution'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rating Distribution
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'changes' && (
        <div className="space-y-6">
          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Safety Rating Changes</h3>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'critical' | 'positive')}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              >
                <option value="all">All Changes ({recentChanges.length})</option>
                <option value="critical">Critical Changes ({criticalChanges.length})</option>
                <option value="positive">Positive Changes ({positiveChanges.length})</option>
              </select>
            </div>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </div>

          {/* Changes List */}
          {getFilteredChanges().length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carrier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredChanges().map((change) => {
                      const indicator = getChangeIndicator(change.old_rating, change.new_rating)
                      return (
                        <tr key={`${change.carrier_id}-${change.change_date}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <Link 
                                href={`/carrier/${change.dot_number}`} 
                                className="font-medium text-gray-900 hover:text-blue-600"
                              >
                                {change.legal_name}
                              </Link>
                              <p className="text-sm text-gray-600">DOT: {change.dot_number}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRatingColor(change.old_rating)}`}>
                                {change.old_rating}
                              </span>
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRatingColor(change.new_rating)}`}>
                                {change.new_rating}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <p>{formatDate(change.change_date)}</p>
                              <p className="text-xs text-gray-500">{formatDaysAgo(change.days_ago)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <p className="capitalize">{change.data_source}</p>
                              {change.change_reason && (
                                <p className="text-xs text-gray-500 capitalize">
                                  {change.change_reason.replace('_', ' ')}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${indicator.color}`}>
                              {indicator.icon} {indicator.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Changes Found</h3>
              <p className="text-gray-600">No safety rating changes in the selected category for the last 30 days.</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'trends' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Improving</p>
                  <p className="text-2xl font-bold text-green-600">{stats.trends.improving}</p>
                </div>
                <div className="text-green-600">📈</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalCarriers > 0 ? Math.round((stats.trends.improving / stats.totalCarriers) * 100) : 0}% of carriers
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Declining</p>
                  <p className="text-2xl font-bold text-red-600">{stats.trends.declining}</p>
                </div>
                <div className="text-red-600">📉</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalCarriers > 0 ? Math.round((stats.trends.declining / stats.totalCarriers) * 100) : 0}% of carriers
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Volatile</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.trends.volatile}</p>
                </div>
                <div className="text-orange-600">⚡</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalCarriers > 0 ? Math.round((stats.trends.volatile / stats.totalCarriers) * 100) : 0}% of carriers
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stable</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.trends.stable}</p>
                </div>
                <div className="text-blue-600">📊</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalCarriers > 0 ? Math.round((stats.trends.stable / stats.totalCarriers) * 100) : 0}% of carriers
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">Trend Definitions</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Improving:</strong> Recent rating changes show upward movement</li>
                  <li>• <strong>Declining:</strong> Recent rating changes show downward movement</li>
                  <li>• <strong>Volatile:</strong> Frequent rating changes (more than 2 in 12 months)</li>
                  <li>• <strong>Stable:</strong> No significant rating changes in recent period</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'distribution' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Rating Distribution</h3>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="font-medium text-gray-900">Satisfactory</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{stats.ratingDistribution.satisfactory}</p>
                  <p className="text-sm text-gray-600">
                    {stats.totalCarriers > 0 ? Math.round((stats.ratingDistribution.satisfactory / stats.totalCarriers) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="font-medium text-gray-900">Conditional</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{stats.ratingDistribution.conditional}</p>
                  <p className="text-sm text-gray-600">
                    {stats.totalCarriers > 0 ? Math.round((stats.ratingDistribution.conditional / stats.totalCarriers) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="font-medium text-gray-900">Unsatisfactory</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{stats.ratingDistribution.unsatisfactory}</p>
                  <p className="text-sm text-gray-600">
                    {stats.totalCarriers > 0 ? Math.round((stats.ratingDistribution.unsatisfactory / stats.totalCarriers) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="font-medium text-gray-900">Not Rated</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{stats.ratingDistribution.notRated}</p>
                  <p className="text-sm text-gray-600">
                    {stats.totalCarriers > 0 ? Math.round((stats.ratingDistribution.notRated / stats.totalCarriers) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Recent Activity Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Changes (30 days)</span>
                  <span className="font-medium">{stats.recentChanges.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Critical Changes</span>
                  <span className="font-medium text-red-600">{stats.recentChanges.critical}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Positive Changes</span>
                  <span className="font-medium text-green-600">{stats.recentChanges.positive}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <Link
                  href="/admin/carriers"
                  className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <p className="font-medium text-blue-900">Manage Carriers</p>
                  <p className="text-sm text-blue-700">Update safety ratings and carrier data</p>
                </Link>
                <Link
                  href="/admin/reports"
                  className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <p className="font-medium text-green-900">View Reports</p>
                  <p className="text-sm text-green-700">User-submitted data quality reports</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}