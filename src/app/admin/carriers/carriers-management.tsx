'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/components/ui/notification'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  created_at: string
  data_source: string
  verified: boolean
  trust_score: number
}

interface Props {
  initialCarriers: Carrier[]
}

export default function CarriersManagement({ initialCarriers }: Props) {
  const [carriers, setCarriers] = useState<Carrier[]>(initialCarriers)
  const [lookupDot, setLookupDot] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const { addNotification } = useNotifications()

  const handleFMCSALookup = async () => {
    if (!lookupDot.trim()) {
      addNotification({
        type: 'error',
        title: 'DOT Number Required',
        message: 'Please enter a DOT number to lookup'
      })
      return
    }

    const cleanDot = lookupDot.trim().replace(/\D/g, '')
    if (cleanDot.length < 6) {
      addNotification({
        type: 'error',
        title: 'Invalid DOT Number',
        message: 'DOT number must be at least 6 digits'
      })
      return
    }

    setLookupLoading(true)

    try {
      const response = await fetch(`/api/carriers/lookup?dot=${cleanDot}&refresh=true`)
      const data = await response.json()

      if (data.success && data.data) {
        // Check if this carrier already exists in our list
        const existingIndex = carriers.findIndex(c => c.dot_number === cleanDot)
        
        if (existingIndex >= 0) {
          // Update existing carrier
          const updatedCarriers = [...carriers]
          updatedCarriers[existingIndex] = {
            ...updatedCarriers[existingIndex],
            ...data.data,
            trust_score: data.data.trust_score || 95
          }
          setCarriers(updatedCarriers)
          
          addNotification({
            type: 'success',
            title: 'Carrier Updated',
            message: `Updated ${data.data.legal_name} with fresh FMCSA data`
          })
        } else {
          // Add new carrier to list
          setCarriers(prev => [data.data, ...prev])
          
          addNotification({
            type: 'success',
            title: 'Carrier Added',
            message: `Added ${data.data.legal_name} from FMCSA database`
          })
        }

        setLookupDot('')
      } else {
        addNotification({
          type: 'error',
          title: 'Carrier Not Found',
          message: data.message || `DOT number ${cleanDot} not found in FMCSA database`
        })
      }
    } catch (error) {
      console.error('FMCSA lookup error:', error)
      addNotification({
        type: 'error',
        title: 'Lookup Failed',
        message: 'Failed to connect to FMCSA database. Please try again.'
      })
    } finally {
      setLookupLoading(false)
    }
  }

  const refreshCarrierData = async (carrier: Carrier) => {
    setLookupLoading(true)

    try {
      const response = await fetch(`/api/carriers/lookup?dot=${carrier.dot_number}&refresh=true`)
      const data = await response.json()

      if (data.success && data.data) {
        // Update the carrier in our list
        setCarriers(prev => prev.map(c => 
          c.id === carrier.id 
            ? { ...c, ...data.data, trust_score: data.data.trust_score || 95 }
            : c
        ))
        
        addNotification({
          type: 'success',
          title: 'Data Refreshed',
          message: `Updated ${data.data.legal_name} with latest FMCSA data`
        })
      } else {
        addNotification({
          type: 'warning',
          title: 'Refresh Failed',
          message: data.message || 'Could not refresh carrier data'
        })
      }
    } catch (error) {
      console.error('Refresh error:', error)
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh carrier data. Please try again.'
      })
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-2xl font-bold text-blue-600">
                CarrierTracker Admin
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 font-medium">Carriers</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Carrier Management</h1>
            <p className="text-gray-600 mt-2">Manage carrier data and FMCSA integration</p>
          </div>
          <Link
            href="/admin/carriers/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Carrier
          </Link>
        </div>

        {/* FMCSA Lookup Tool */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">FMCSA Lookup Tool</h2>
          <p className="text-gray-600 mb-4">
            Fetch carrier data directly from the FMCSA SAFER database
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DOT Number
              </label>
              <input
                type="text"
                value={lookupDot}
                onChange={(e) => setLookupDot(e.target.value)}
                placeholder="Enter DOT number (e.g., 123456)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleFMCSALookup()}
              />
            </div>
            <button
              onClick={handleFMCSALookup}
              disabled={lookupLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lookupLoading ? 'Fetching...' : 'Fetch from FMCSA'}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            💡 This will automatically add new carriers or update existing ones with fresh FMCSA data
          </div>
        </div>

        {/* Carriers List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Carriers ({carriers.length})</h2>
          </div>
          
          {carriers && carriers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DOT Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Legal Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trust Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {carriers.map((carrier) => (
                    <tr key={carrier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {carrier.dot_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {carrier.legal_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          carrier.data_source === 'manual' 
                            ? 'bg-blue-100 text-blue-800' 
                            : carrier.data_source === 'fmcsa'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {carrier.data_source || 'manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className="mr-2">{carrier.trust_score || 50}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (carrier.trust_score || 50) >= 90 ? 'bg-green-600' :
                                (carrier.trust_score || 50) >= 70 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${(carrier.trust_score || 50)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          carrier.verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {carrier.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(carrier.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => refreshCarrierData(carrier)}
                          disabled={lookupLoading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {lookupLoading ? '⟳' : '🔄'} Refresh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h2m0 0V6a2 2 0 012-2h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V9M4 13v4a2 2 0 002 2h2m0 0h2a2 2 0 002-2v-4M4 13h2m0 0V9a2 2 0 012-2h2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No carriers found</h3>
              <p className="text-gray-600 mb-4">Get started by adding carriers manually or using the FMCSA lookup tool above.</p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/admin/carriers/add"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Manually
                </Link>
                <button
                  onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="DOT"]')?.focus()}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Use FMCSA Lookup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}