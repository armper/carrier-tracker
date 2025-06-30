'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Carrier {
  dot_number: string
  legal_name: string
  last_verified: string | null
  api_sync_status: string
  api_error_count: number
  data_source: string
}

interface Job {
  id: string
  job_type: string
  status: string
  carriers_processed: number
  carriers_updated: number
  carriers_failed: number
  created_at: string
  completed_at: string | null
  metadata?: any
  profiles?: {
    full_name?: string
    email: string
  }
}

interface SyncLog {
  id: string
  api_source: string
  sync_type: string
  success: boolean
  error_message: string | null
  created_at: string
  carriers: {
    dot_number: string
    legal_name: string
  }
}

interface Stats {
  totalCarriers: number
  neverSynced: number
  staleCarriers: number
  recentErrors: number
  scrapedCarriers: number
  activeJobs: number
  successfulSyncs: number
  failedSyncs: number
}

interface Props {
  carriers: Carrier[]
  recentJobs: Job[]
  recentSyncs: SyncLog[]
  stats: Stats
}

export default function ScraperDashboard({ carriers, recentJobs, recentSyncs, stats }: Props) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'jobs' | 'carriers' | 'logs'>('overview')
  const [jobInProgress, setJobInProgress] = useState(false)
  const [jobStatus, setJobStatus] = useState<string | null>(null)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatTimeAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'never': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleManualSync = async (jobType: 'daily' | 'weekly' | 'new-carriers') => {
    setJobInProgress(true)
    setJobStatus(null)

    try {
      const response = await fetch('/api/scraper/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType,
          limit: jobType === 'daily' ? 5 : jobType === 'weekly' ? 10 : 3
        })
      })

      const result = await response.json()

      if (result.success) {
        setJobStatus(`✅ ${jobType} sync completed! Processed: ${result.results.processed}, Success rate: ${result.results.successRate}%`)
        setTimeout(() => window.location.reload(), 3000)
      } else {
        setJobStatus(`❌ Failed to start ${jobType} sync: ${result.error}`)
      }
    } catch (error) {
      setJobStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setJobInProgress(false)
    }
  }

  const handleTestScraper = async () => {
    setJobInProgress(true)
    setJobStatus(null)

    try {
      const response = await fetch('/api/scraper/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dotNumber: '1174814' })
      })

      const result = await response.json()

      if (result.success) {
        setJobStatus(`✅ Test scraping completed! Found: ${result.result?.data?.legal_name || 'No data'}`)
      } else {
        setJobStatus(`❌ Test scraping failed: ${result.error}`)
      }
    } catch (error) {
      setJobStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setJobInProgress(false)
    }
  }

  const handleAddTestCarriers = async () => {
    setJobInProgress(true)
    setJobStatus(null)

    try {
      const response = await fetch('/api/scraper/add-test-carriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const result = await response.json()

      if (result.success) {
        setJobStatus(`✅ ${result.message}! Added ${result.summary.successful} carriers ready for scraping.`)
      } else {
        setJobStatus(`❌ Failed to add test carriers: ${result.error}`)
      }
    } catch (error) {
      setJobStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setJobInProgress(false)
    }
  }

  const handleDiscoverCarriers = async (strategy: 'sequential' | 'random') => {
    setJobInProgress(true)
    setJobStatus(null)

    try {
      const response = await fetch('/api/scraper/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          limit: strategy === 'sequential' ? 5 : 3, // Sequential is more reliable
          startDot: strategy === 'sequential' ? undefined : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        setJobStatus(`✅ ${result.summary}! Success rate: ${result.results.successRate}%`)
        setTimeout(() => window.location.reload(), 5000)
      } else {
        setJobStatus(`❌ Failed carrier discovery: ${result.error}`)
      }
    } catch (error) {
      setJobStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setJobInProgress(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scraping Controls</h3>
        
        {/* Carrier Discovery Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">🔍 Carrier Discovery (Add New Carriers)</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDiscoverCarriers('sequential')}
              disabled={jobInProgress}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Discovering...' : 'Sequential Discovery (5 new)'}
            </button>
            <button
              onClick={() => handleDiscoverCarriers('random')}
              disabled={jobInProgress}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Discovering...' : 'Random Discovery (3 new)'}
            </button>
          </div>
        </div>

        {/* Data Refresh Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">🔄 Data Refresh (Update Existing)</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleManualSync('daily')}
              disabled={jobInProgress}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Starting...' : 'Daily Sync (5 carriers)'}
            </button>
            <button
              onClick={() => handleManualSync('weekly')}
              disabled={jobInProgress}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Starting...' : 'Weekly Sync (10 carriers)'}
            </button>
            <button
              onClick={() => handleManualSync('new-carriers')}
              disabled={jobInProgress}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Starting...' : 'New Carriers Only (3 carriers)'}
            </button>
          </div>
        </div>

        {/* Testing Section */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">🧪 Testing & Debug</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestScraper}
              disabled={jobInProgress}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Testing...' : 'Test Single Scraper'}
            </button>
            <button
              onClick={handleAddTestCarriers}
              disabled={jobInProgress}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {jobInProgress ? 'Adding...' : 'Add Test Data'}
            </button>
            <Link
              href="/api/scraper/check-available"
              target="_blank"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Check Database
            </Link>
          </div>
        </div>
        {jobStatus && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm">{jobStatus}</p>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Carriers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCarriers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Scraped from SAFER</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scrapedCarriers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Stale Data (>30 days)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.staleCarriers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Recent Errors</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentErrors.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'jobs', label: 'Sync Jobs', count: recentJobs.length },
            { key: 'carriers', label: 'Carrier Status', count: carriers.length },
            { key: 'logs', label: 'Sync Logs', count: recentSyncs.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Success Rate</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Successful Syncs</span>
                <span className="text-sm font-medium text-green-600">{stats.successfulSyncs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed Syncs</span>
                <span className="text-sm font-medium text-red-600">{stats.failedSyncs}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${(stats.successfulSyncs / (stats.successfulSyncs + stats.failedSyncs)) * 100}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {Math.round((stats.successfulSyncs / (stats.successfulSyncs + stats.failedSyncs)) * 100)}% success rate
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Freshness</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Never Synced</span>
                <span className="text-sm font-medium text-gray-600">{stats.neverSynced}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Stale (>30 days)</span>
                <span className="text-sm font-medium text-orange-600">{stats.staleCarriers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fresh Data</span>
                <span className="text-sm font-medium text-green-600">
                  {stats.totalCarriers - stats.staleCarriers}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'jobs' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sync Jobs</h3>
            <p className="text-sm text-gray-600">Monitor scraping job status and performance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 capitalize">
                        {job.job_type.replace(/[_-]/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <p>Processed: {job.carriers_processed}</p>
                        <p className="text-green-600">Updated: {job.carriers_updated}</p>
                        {job.carriers_failed > 0 && (
                          <p className="text-red-600">Failed: {job.carriers_failed}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(job.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'carriers' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Carrier Sync Status</h3>
            <p className="text-sm text-gray-600">Monitor individual carrier data freshness</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sync Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Source
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {carriers.slice(0, 50).map((carrier) => (
                  <tr key={carrier.dot_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link 
                          href={`/carrier/${carrier.dot_number}`}
                          className="font-medium text-gray-900 hover:text-teal-600"
                        >
                          {carrier.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSyncStatusColor(carrier.api_sync_status)}`}>
                          {carrier.api_sync_status}
                        </span>
                        {carrier.api_error_count > 0 && (
                          <span className="text-xs text-red-600">
                            {carrier.api_error_count} errors
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {carrier.last_verified ? formatTimeAgo(carrier.last_verified) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        carrier.data_source === 'safer_scraper' 
                          ? 'bg-teal-100 text-teal-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {carrier.data_source || 'manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">SAFER Sync Logs</h3>
            <p className="text-sm text-gray-600">Recent scraping activity and results</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sync Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSyncs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link 
                          href={`/carrier/${log.carriers.dot_number}`}
                          className="font-medium text-gray-900 hover:text-teal-600"
                        >
                          {log.carriers.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {log.carriers.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {log.sync_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                        {log.error_message && (
                          <span className="text-xs text-red-600 truncate max-w-xs" title={log.error_message}>
                            {log.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimeAgo(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}