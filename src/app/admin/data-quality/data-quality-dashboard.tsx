'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  data_quality_score: number
  api_sync_status: string
  last_verified: string | null
  api_error_count: number
  needs_verification: boolean
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
  profiles?: {
    full_name?: string
    email: string
  }
}

interface QualityIssue {
  id: string
  issue_type: string
  severity: string
  description: string
  field_name: string | null
  created_at: string
  carriers: {
    dot_number: string
    legal_name: string
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
  highQuality: number
  mediumQuality: number
  lowQuality: number
  needsVerification: number
  recentlySynced: number
  activeJobs: number
  openIssues: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

interface Props {
  carriersData: Carrier[]
  recentJobs: Job[]
  qualityIssues: QualityIssue[]
  syncLog: SyncLog[]
  stats: Stats
}

export default function DataQualityDashboard({ 
  carriersData, 
  recentJobs, 
  qualityIssues, 
  syncLog, 
  stats 
}: Props) {
  const [selectedTab, setSelectedTab] = useState<'carriers' | 'jobs' | 'issues' | 'sync-log'>('carriers')
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'never': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatTimeAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const handleDataSync = async (type: 'stale' | 'refresh-scores') => {
    setSyncInProgress(true)
    setSyncStatus(null)

    try {
      const response = await fetch('/api/admin/data-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'stale' ? 'sync-stale' : 'refresh-quality-scores'
        })
      })

      const result = await response.json()

      if (result.success) {
        setSyncStatus(`✅ ${type === 'stale' ? 'Data sync' : 'Quality score refresh'} completed successfully`)
        // Refresh page after a delay
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setSyncStatus(`❌ ${type === 'stale' ? 'Data sync' : 'Quality score refresh'} failed: ${result.error}`)
      }
    } catch (error) {
      setSyncStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSyncInProgress(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleDataSync('stale')}
            disabled={syncInProgress}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {syncInProgress ? 'Syncing...' : 'Sync Stale Data'}
          </button>
          <button
            onClick={() => handleDataSync('refresh-scores')}
            disabled={syncInProgress}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {syncInProgress ? 'Updating...' : 'Refresh Quality Scores'}
          </button>
          <Link
            href="/admin/carriers/import"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Import Carriers
          </Link>
        </div>
        {syncStatus && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm">{syncStatus}</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'carriers', label: 'Data Quality', count: carriersData.length },
            { key: 'jobs', label: 'Sync Jobs', count: recentJobs.length },
            { key: 'issues', label: 'Quality Issues', count: qualityIssues.length },
            { key: 'sync-log', label: 'Sync Log', count: syncLog.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'carriers' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Carrier Data Quality</h3>
            <p className="text-sm text-gray-600">Monitor data quality scores and verification status</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sync Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {carriersData.slice(0, 50).map((carrier) => (
                  <tr key={carrier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link 
                          href={`/carrier/${carrier.dot_number}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {carrier.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getQualityScoreColor(carrier.data_quality_score)}`}>
                          {carrier.data_quality_score}/100
                        </span>
                        {carrier.needs_verification && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Needs Verification
                          </span>
                        )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/carriers/${carrier.dot_number}/edit`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'jobs' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Sync Jobs</h3>
            <p className="text-sm text-gray-600">Monitor data synchronization jobs and their status</p>
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
                    Created By
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
                        {job.job_type.replace('_', ' ')}
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
                      {job.profiles?.full_name || job.profiles?.email || 'System'}
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

      {selectedTab === 'issues' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Data Quality Issues</h3>
            <p className="text-sm text-gray-600">Unresolved data quality problems requiring attention</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {qualityIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link 
                          href={`/carrier/${issue.carriers.dot_number}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {issue.carriers.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {issue.carriers.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {issue.issue_type.replace('_', ' ')}
                      </span>
                      {issue.field_name && (
                        <p className="text-xs text-gray-500">Field: {issue.field_name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{issue.description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimeAgo(issue.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'sync-log' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">API Sync Log</h3>
            <p className="text-sm text-gray-600">Recent API synchronization activity and results</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {syncLog.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <Link 
                          href={`/carrier/${log.carriers.dot_number}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {log.carriers.legal_name}
                        </Link>
                        <p className="text-sm text-gray-600">DOT: {log.carriers.dot_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.api_source}
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