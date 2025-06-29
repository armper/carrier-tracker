'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ExpiringCarrier {
  carrier_id: string
  dot_number: string
  legal_name: string
  insurance_expiry_date: string
  days_until_expiry: number
  insurance_carrier: string
  policy_number: string
}

interface InsuranceAlert {
  id: string
  expiry_date: string
  alert_sent_30d: boolean
  alert_sent_15d: boolean
  alert_sent_7d: boolean
  alert_sent_1d: boolean
  carriers: {
    legal_name: string
    dot_number: string
    insurance_carrier: string
    insurance_policy_number: string
  }
}

interface Stats {
  totalCarriers: number
  carriersWithInsurance: number
  activeInsurance: number
  expiringSoon: number
  coverageRate: number
}

interface Props {
  expiringCarriers: ExpiringCarrier[]
  alertsData: InsuranceAlert[]
  stats: Stats
}

export default function InsuranceMonitoringDashboard({ expiringCarriers, alertsData, stats }: Props) {
  const [selectedTab, setSelectedTab] = useState<'expiring' | 'alerts' | 'actions'>('expiring')
  const [processMessage, setProcessMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Categorize expiring carriers
  const critical = expiringCarriers.filter(c => c.days_until_expiry <= 7)
  const warning = expiringCarriers.filter(c => c.days_until_expiry > 7 && c.days_until_expiry <= 15)
  const upcoming = expiringCarriers.filter(c => c.days_until_expiry > 15 && c.days_until_expiry <= 30)

  const getStatusColor = (days: number) => {
    if (days < 0) return 'bg-red-100 text-red-800 border-red-200'
    if (days <= 7) return 'bg-red-100 text-red-800 border-red-200'
    if (days <= 15) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (days <= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusText = (days: number) => {
    if (days < 0) return `EXPIRED (${Math.abs(days)} days ago)`
    if (days === 0) return 'EXPIRES TODAY'
    if (days === 1) return 'EXPIRES TOMORROW'
    return `${days} days remaining`
  }

  const handleProcessAlerts = async () => {
    setIsProcessing(true)
    setProcessMessage('')

    try {
      const response = await fetch('/api/insurance/process-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setProcessMessage(`✅ Successfully processed ${result.data.total_processed} alerts`)
      } else {
        setProcessMessage(`❌ Failed to process alerts: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing alerts:', error)
      setProcessMessage('❌ Failed to process alerts: Network error')
    }

    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setSelectedTab('expiring')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'expiring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expiring Insurance ({expiringCarriers.length})
          </button>
          <button
            onClick={() => setSelectedTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Alert Status ({alertsData.length})
          </button>
          <button
            onClick={() => setSelectedTab('actions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'actions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Actions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'expiring' && (
        <div className="space-y-6">
          {/* Critical Section */}
          {critical.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-4">
                🚨 Critical - Expires in 7 days or less ({critical.length})
              </h3>
              <div className="grid gap-4">
                {critical.map(carrier => (
                  <div key={carrier.carrier_id} className="bg-white border border-red-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <Link href={`/carrier/${carrier.dot_number}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {carrier.legal_name}
                      </Link>
                      <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                      {carrier.insurance_carrier && (
                        <p className="text-sm text-gray-600">Insurer: {carrier.insurance_carrier}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(carrier.days_until_expiry)}`}>
                        {getStatusText(carrier.days_until_expiry)}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Expires: {new Date(carrier.insurance_expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Section */}
          {warning.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-4">
                ⚠️ Warning - Expires in 8-15 days ({warning.length})
              </h3>
              <div className="grid gap-4">
                {warning.map(carrier => (
                  <div key={carrier.carrier_id} className="bg-white border border-orange-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <Link href={`/carrier/${carrier.dot_number}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {carrier.legal_name}
                      </Link>
                      <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                      {carrier.insurance_carrier && (
                        <p className="text-sm text-gray-600">Insurer: {carrier.insurance_carrier}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(carrier.days_until_expiry)}`}>
                        {getStatusText(carrier.days_until_expiry)}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Expires: {new Date(carrier.insurance_expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcoming.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                📅 Upcoming - Expires in 16-30 days ({upcoming.length})
              </h3>
              <div className="grid gap-4">
                {upcoming.map(carrier => (
                  <div key={carrier.carrier_id} className="bg-white border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <Link href={`/carrier/${carrier.dot_number}`} className="font-semibold text-gray-900 hover:text-blue-600">
                        {carrier.legal_name}
                      </Link>
                      <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                      {carrier.insurance_carrier && (
                        <p className="text-sm text-gray-600">Insurer: {carrier.insurance_carrier}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(carrier.days_until_expiry)}`}>
                        {getStatusText(carrier.days_until_expiry)}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Expires: {new Date(carrier.insurance_expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiringCarriers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
              <p className="text-gray-600">No insurance policies expiring in the next 30 days.</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Insurance Alert Status</h3>
            <p className="text-sm text-gray-600">Status of automated insurance expiration alerts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    30 Day Alert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    15 Day Alert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    7 Day Alert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    1 Day Alert
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alertsData.map(alert => (
                  <tr key={alert.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link href={`/carrier/${alert.carriers.dot_number}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {alert.carriers.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {alert.carriers.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(alert.expiry_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_sent_30d ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.alert_sent_30d ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_sent_15d ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.alert_sent_15d ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_sent_7d ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.alert_sent_7d ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_sent_1d ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.alert_sent_1d ? 'Sent' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {alertsData.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No insurance alerts configured.</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Processing</h3>
            <p className="text-gray-600 mb-4">
              Process pending insurance expiration alerts. This will send notifications to users based on their preferences.
            </p>
            <button
              onClick={handleProcessAlerts}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Alerts'}
            </button>
            {processMessage && (
              <div className="mt-4 p-3 rounded-md bg-gray-50 border">
                <p className="text-sm">{processMessage}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/admin/carriers/add"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add New Carrier</p>
                    <p className="text-sm text-gray-600">Add carrier with insurance information</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/carriers"
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Manage Carriers</p>
                    <p className="text-sm text-gray-600">Edit existing carrier insurance data</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h3>
            <p className="text-gray-600 mb-4">
              For automated systems and integrations:
            </p>
            <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded-md">
              <div>GET /api/insurance/alerts - Get expiring insurance</div>
              <div>POST /api/insurance/process-alerts - Process pending alerts</div>
              <div>GET /api/insurance/risk-score/[carrier_id] - Get risk score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}