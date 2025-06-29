'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  safety_rating: string
  insurance_status: string
  insurance_expiry_date: string | null
  insurance_carrier: string | null
  safety_rating_stability_score: number | null
  safety_rating_trend: string | null
  safety_rating_last_changed: string | null
}

interface SavedCarrier {
  id: string
  carriers: Carrier
}

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

interface Alert {
  id: string
  alert_type: string
  carrier_id: string
  created_at: string
  carriers: {
    dot_number: string
    legal_name: string
  }
}

interface Stats {
  totalCarriers: number
  carriersWithInsurance: number
  upcomingExpirations: number
  recentSafetyChanges: number
  riskySafetyRatings: number
  activeAlerts: number
}

interface Props {
  savedCarriers: SavedCarrier[]
  recentSafetyChanges: SafetyRatingChange[]
  activeAlerts: Alert[]
  stats: Stats
}

export default function UserMonitoringDashboard({ savedCarriers, recentSafetyChanges, activeAlerts, stats }: Props) {
  const [selectedTab, setSelectedTab] = useState<'insurance' | 'safety' | 'alerts'>('insurance')

  const getSafetyRatingColor = (rating: string) => {
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

  const getInsuranceStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  const getRiskLevelColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-800'
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    if (score >= 40) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
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

  const getExpirationWarning = (expiryDate: string | null) => {
    if (!expiryDate) return null
    
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) {
      return { level: 'expired', message: 'EXPIRED', color: 'bg-red-100 text-red-800' }
    } else if (daysUntilExpiry <= 7) {
      return { level: 'critical', message: `Expires in ${daysUntilExpiry} days`, color: 'bg-red-100 text-red-800' }
    } else if (daysUntilExpiry <= 15) {
      return { level: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'bg-orange-100 text-orange-800' }
    } else if (daysUntilExpiry <= 30) {
      return { level: 'attention', message: `Expires in ${daysUntilExpiry} days`, color: 'bg-yellow-100 text-yellow-800' }
    }
    return null
  }

  // Filter carriers for insurance monitoring
  const carriersWithInsurance = savedCarriers.filter(sc => sc.carriers.insurance_expiry_date)
  const upcomingExpirations = carriersWithInsurance.filter(sc => {
    const warning = getExpirationWarning(sc.carriers.insurance_expiry_date)
    return warning && warning.level !== 'expired'
  })

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('insurance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'insurance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Insurance Monitoring ({carriersWithInsurance.length})
          </button>
          <button
            onClick={() => setSelectedTab('safety')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'safety'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Safety Rating Trends ({savedCarriers.length})
          </button>
          <button
            onClick={() => setSelectedTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Alerts ({activeAlerts.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'insurance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Insurance Expiration Monitoring</h3>
            <p className="text-sm text-gray-600">{carriersWithInsurance.length} carriers with insurance data</p>
          </div>

          {carriersWithInsurance.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carrier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Insurance Carrier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {carriersWithInsurance.map((savedCarrier) => {
                      const warning = getExpirationWarning(savedCarrier.carriers.insurance_expiry_date)
                      return (
                        <tr key={savedCarrier.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <Link 
                                href={`/carrier/${savedCarrier.carriers.dot_number}`} 
                                className="font-medium text-gray-900 hover:text-blue-600"
                              >
                                {savedCarrier.carriers.legal_name}
                              </Link>
                              <p className="text-sm text-gray-600">DOT: {savedCarrier.carriers.dot_number}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {savedCarrier.carriers.insurance_carrier || 'Not available'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(savedCarrier.carriers.insurance_expiry_date!)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getInsuranceStatusColor(savedCarrier.carriers.insurance_status)}`}>
                                {savedCarrier.carriers.insurance_status}
                              </span>
                              {warning && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${warning.color}`}>
                                  {warning.message}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link 
                              href={`/carrier/${savedCarrier.carriers.dot_number}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View Details
                            </Link>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Insurance Data Available</h3>
              <p className="text-gray-600">Your saved carriers don't have insurance expiration data yet.</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'safety' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Safety Rating Overview</h3>
            <p className="text-sm text-gray-600">{recentSafetyChanges.length} recent changes</p>
          </div>

          {/* Safety Rating Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Current Ratings</h4>
              <div className="space-y-3">
                {savedCarriers.map((savedCarrier) => (
                  <div key={savedCarrier.id} className="flex items-center justify-between">
                    <Link 
                      href={`/carrier/${savedCarrier.carriers.dot_number}`}
                      className="text-sm text-gray-900 hover:text-blue-600 truncate"
                    >
                      {savedCarrier.carriers.legal_name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSafetyRatingColor(savedCarrier.carriers.safety_rating)}`}>
                        {savedCarrier.carriers.safety_rating}
                      </span>
                      {savedCarrier.carriers.safety_rating_stability_score && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(savedCarrier.carriers.safety_rating_stability_score)}`}>
                          {savedCarrier.carriers.safety_rating_stability_score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Recent Changes</h4>
              {recentSafetyChanges.length > 0 ? (
                <div className="space-y-3">
                  {recentSafetyChanges.slice(0, 5).map((change, index) => {
                    const indicator = getChangeIndicator(change.old_rating, change.new_rating)
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <Link 
                            href={`/carrier/${change.dot_number}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600"
                          >
                            {change.legal_name}
                          </Link>
                          <p className="text-xs text-gray-500">{formatDaysAgo(change.days_ago)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-1 py-0.5 rounded text-xs ${getSafetyRatingColor(change.old_rating)}`}>
                            {change.old_rating}
                          </span>
                          <span className={`text-sm ${indicator.color}`}>{indicator.icon}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${getSafetyRatingColor(change.new_rating)}`}>
                            {change.new_rating}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No recent safety rating changes</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Risk Assessment</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Satisfactory</span>
                  <span className="font-medium text-green-600">
                    {savedCarriers.filter(sc => sc.carriers.safety_rating === 'satisfactory').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conditional</span>
                  <span className="font-medium text-yellow-600">
                    {savedCarriers.filter(sc => sc.carriers.safety_rating === 'conditional').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Unsatisfactory</span>
                  <span className="font-medium text-red-600">
                    {savedCarriers.filter(sc => sc.carriers.safety_rating === 'unsatisfactory').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'alerts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Active Monitoring Alerts</h3>
            <Link 
              href="/dashboard/alerts" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Manage Alerts
            </Link>
          </div>

          {activeAlerts.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carrier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alert Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <Link 
                              href={`/carrier/${alert.carriers.dot_number}`} 
                              className="font-medium text-gray-900 hover:text-blue-600"
                            >
                              {alert.carriers.legal_name}
                            </Link>
                            <p className="text-sm text-gray-600">DOT: {alert.carriers.dot_number}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="capitalize">
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(alert.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link 
                            href="/dashboard/alerts"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17H7a3 3 0 01-3-3V5a3 3 0 013-3h5m0 0v5a2 2 0 002 2h5M9 9h6m-6 4h6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
              <p className="text-gray-600 mb-4">Set up alerts to monitor your carriers for changes.</p>
              <Link 
                href="/dashboard/alerts" 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create First Alert
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Monitoring Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Insurance Monitoring:</strong> Track expiration dates and get warnings before coverage lapses</li>
              <li>• <strong>Safety Rating Tracking:</strong> Monitor changes in safety ratings and risk scores</li>
              <li>• <strong>Email Alerts:</strong> Receive notifications when your carriers have status changes</li>
              <li>• <strong>Trend Analysis:</strong> View historical data and identify patterns in carrier performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}