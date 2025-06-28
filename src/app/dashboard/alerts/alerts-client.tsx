'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
}

interface Alert {
  id: string
  alert_type: string
  is_active: boolean
  created_at: string
  carriers: Carrier
}

interface SavedCarrier {
  carriers: Carrier
}

interface User {
  id: string
  email?: string
}

interface Props {
  user: User
  alerts: Alert[]
  savedCarriers: SavedCarrier[]
}

const ALERT_TYPES = [
  { value: 'safety_rating_change', label: 'Safety Rating Changes' },
  { value: 'insurance_status_change', label: 'Insurance Status Changes' },
  { value: 'authority_status_change', label: 'Authority Status Changes' },
  { value: 'carb_compliance_change', label: 'CARB Compliance Changes' },
  { value: 'all_changes', label: 'Any Status Changes' },
]

export default function AlertsClient({ user, alerts, savedCarriers }: Props) {
  const [userAlerts, setUserAlerts] = useState<Alert[]>(alerts)
  const [isCreating, setIsCreating] = useState(false)
  const [newAlert, setNewAlert] = useState({
    carrierId: '',
    alertType: ''
  })
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlert.carrierId || !newAlert.alertType) return

    setLoading('create')
    
    const { data, error } = await supabase
      .from('monitoring_alerts')
      .insert({
        user_id: user.id,
        carrier_id: newAlert.carrierId,
        alert_type: newAlert.alertType,
        is_active: true
      })
      .select(`
        id,
        alert_type,
        is_active,
        created_at,
        carriers (
          id,
          dot_number,
          legal_name
        )
      `)
      .single()

    if (!error && data) {
      // Transform the data to match our Alert interface
      const alertWithCarrier = {
        ...data,
        carriers: Array.isArray(data.carriers) ? data.carriers[0] : data.carriers
      }
      setUserAlerts([...userAlerts, alertWithCarrier])
      setNewAlert({ carrierId: '', alertType: '' })
      setIsCreating(false)
    } else {
      alert('Error creating alert. Please try again.')
    }

    setLoading(null)
  }

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    setLoading(alertId)

    const { error } = await supabase
      .from('monitoring_alerts')
      .update({ is_active: !isActive })
      .eq('id', alertId)

    if (!error) {
      setUserAlerts(userAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, is_active: !isActive }
          : alert
      ))
    } else {
      alert('Error updating alert. Please try again.')
    }

    setLoading(null)
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    setLoading(alertId)

    const { error } = await supabase
      .from('monitoring_alerts')
      .delete()
      .eq('id', alertId)

    if (!error) {
      setUserAlerts(userAlerts.filter(alert => alert.id !== alertId))
    } else {
      alert('Error deleting alert. Please try again.')
    }

    setLoading(null)
  }

  const getAlertTypeLabel = (alertType: string) => {
    return ALERT_TYPES.find(type => type.value === alertType)?.label || alertType
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Alert Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create New Alert */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Email Alerts</h2>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isCreating ? 'Cancel' : 'Create Alert'}
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">
            Get notified by email when your saved carriers have status changes.
          </p>

          {isCreating && (
            <form onSubmit={handleCreateAlert} className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Carrier
                  </label>
                  <select
                    value={newAlert.carrierId}
                    onChange={(e) => setNewAlert({ ...newAlert, carrierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a carrier...</option>
                    {savedCarriers.map((item) => (
                      <option key={item.carriers.id} value={item.carriers.id}>
                        {item.carriers.legal_name} (DOT: {item.carriers.dot_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <select
                    value={newAlert.alertType}
                    onChange={(e) => setNewAlert({ ...newAlert, alertType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose alert type...</option>
                    {ALERT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading === 'create'}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading === 'create' ? 'Creating...' : 'Create Alert'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Existing Alerts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Active Alerts ({userAlerts.filter(alert => alert.is_active).length})
          </h3>

          {userAlerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17H7a3 3 0 01-3-3V5a3 3 0 013-3h5m0 0v5a2 2 0 002 2h5M9 9h6m-6 4h6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts configured</h3>
              <p className="text-gray-600 mb-4">Create your first alert to get notified of carrier status changes.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create First Alert
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${
                    alert.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {alert.carriers.legal_name}
                        </h4>
                        <span className="text-sm text-gray-600 font-mono">
                          DOT: {alert.carriers.dot_number}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Alert Type: {getAlertTypeLabel(alert.alert_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                        disabled={loading === alert.id}
                        className={`px-3 py-1 text-sm rounded-md ${
                          alert.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {loading === alert.id ? '...' : (alert.is_active ? 'Pause' : 'Resume')}
                      </button>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        disabled={loading === alert.id}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                      >
                        {loading === alert.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Settings Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">How Email Alerts Work</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Alerts are checked daily for status changes</li>
                <li>• You&apos;ll receive an email within 24 hours of any detected changes</li>
                <li>• Weekly digest emails summarize all your monitored carriers</li>
                <li>• You can pause or delete alerts at any time</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}