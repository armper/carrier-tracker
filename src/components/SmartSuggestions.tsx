'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useNotifications } from './ui/notification'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  safety_rating: string
  insurance_status: string
  authority_status: string
  state: string | null
  city: string | null
  vehicle_count: number | null
  phone: string | null
}

interface Suggestion {
  id: string
  suggestion_type: string
  title: string
  description: string
  carrier_ids: string[]
  metadata: Record<string, any>
  priority: number
  created_at: string
  expires_at: string
  carriers: Carrier[]
}

interface Props {
  userId: string
  onCarrierSaved?: () => void
}

export default function SmartSuggestions({ userId, onCarrierSaved }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingNew, setGeneratingNew] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const supabase = createClient()
  const { addNotification } = useNotifications()

  useEffect(() => {
    fetchSuggestions()
  }, [userId])

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/suggestions/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load suggestions'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateNewSuggestions = async () => {
    try {
      setGeneratingNew(true)
      const response = await fetch(`/api/suggestions/${userId}/generate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestions')
      }

      const data = await response.json()
      addNotification({
        type: 'success',
        title: 'Suggestions Updated',
        message: `Generated ${data.count} new suggestions`
      })

      // Refresh suggestions
      await fetchSuggestions()
    } catch (error) {
      console.error('Error generating suggestions:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate new suggestions'
      })
    } finally {
      setGeneratingNew(false)
    }
  }

  const handleSuggestionAction = async (suggestionId: string, action: string, carrierId?: string) => {
    try {
      setActionLoading(suggestionId)
      
      const response = await fetch(`/api/suggestions/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          suggestion_id: suggestionId,
          carrier_id: carrierId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to perform action')
      }

      if (action === 'dismiss') {
        setSuggestions(suggestions.filter(s => s.id !== suggestionId))
        addNotification({
          type: 'success',
          title: 'Suggestion Dismissed',
          message: 'Suggestion has been removed from your list'
        })
      } else if (action === 'save_carrier') {
        addNotification({
          type: 'success',
          title: 'Carrier Saved',
          message: 'Carrier has been added to your dashboard'
        })
        onCarrierSaved?.()
      }
    } catch (error) {
      console.error('Error performing suggestion action:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to perform action'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getSafetyRatingColor = (rating: string | null) => {
    if (!rating) return 'bg-gray-100 text-gray-800'
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

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'better_alternatives':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        )
      case 'coverage_gaps':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )
      case 'new_opportunities':
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            💡 Smart Suggestions
          </h3>
          <button
            onClick={generateNewSuggestions}
            disabled={generatingNew}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingNew ? 'Generating...' : 'Generate'}
          </button>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Available</h4>
          <p className="text-gray-600 mb-4">We'll analyze your carrier portfolio and find opportunities for improvement.</p>
          <button
            onClick={generateNewSuggestions}
            disabled={generatingNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingNew ? 'Analyzing...' : 'Get Suggestions'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          💡 Smart Suggestions
          {suggestions.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {suggestions.length}
            </span>
          )}
        </h3>
        <button
          onClick={generateNewSuggestions}
          disabled={generatingNew}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {generatingNew ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-3">
              {getSuggestionIcon(suggestion.suggestion_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === suggestion.id ? null : suggestion.id
                      )}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {expandedSuggestion === suggestion.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => handleSuggestionAction(suggestion.id, 'dismiss')}
                      disabled={actionLoading === suggestion.id}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {expandedSuggestion === suggestion.id && (
                  <div className="mt-4 space-y-3">
                    {suggestion.carriers.map((carrier) => (
                      <div key={carrier.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Link 
                              href={`/carrier/${carrier.dot_number}`}
                              className="font-medium text-gray-900 hover:text-blue-600"
                            >
                              {carrier.legal_name}
                            </Link>
                            <span className="text-sm text-gray-600 font-mono">
                              DOT: {carrier.dot_number}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSafetyRatingColor(carrier.safety_rating)}`}>
                              {carrier.safety_rating}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(carrier.insurance_status)}`}>
                              {carrier.insurance_status}
                            </span>
                            {carrier.state && (
                              <span className="text-xs text-gray-600">
                                {carrier.city}, {carrier.state}
                              </span>
                            )}
                            {carrier.vehicle_count && (
                              <span className="text-xs text-gray-600">
                                {carrier.vehicle_count} vehicles
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/carrier/${carrier.dot_number}`}
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                          >
                            View Details
                          </Link>
                          <button
                            onClick={() => handleSuggestionAction(suggestion.id, 'save_carrier', carrier.id)}
                            disabled={actionLoading === suggestion.id}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {actionLoading === suggestion.id ? 'Saving...' : 'Save Carrier'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Suggestions are refreshed weekly and expire after 7 days. 
          <Link href="/dashboard/monitoring" className="text-blue-600 hover:text-blue-800 ml-1">
            View detailed analytics →
          </Link>
        </p>
      </div>
    </div>
  )
}