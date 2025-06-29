'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/components/ui/notification'

interface CarrierReport {
  id: string
  carrier_id: string
  user_id: string
  issue_type: string
  description: string
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected'
  admin_response?: string
  created_at: string
  resolved_at?: string
  resolved_by?: string
  carriers?: {
    dot_number: string
    legal_name: string
    data_source: string
    verified: boolean
  }
  profiles?: {
    email: string
    full_name: string
  }
}

interface Props {
  initialReports: CarrierReport[]
  isAdmin: boolean
  userRole: string
}

export default function ReportsManagement({ initialReports }: Props) {
  const [reports, setReports] = useState<CarrierReport[]>(initialReports)
  const [selectedReport, setSelectedReport] = useState<CarrierReport | null>(null)
  const [adminResponse, setAdminResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'rejected'>('all')
  const { addNotification } = useNotifications()

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'reviewed':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getIssueTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'incorrect_name': 'Incorrect Name',
      'wrong_rating': 'Wrong Rating',
      'outdated_info': 'Outdated Info',
      'incorrect_address': 'Incorrect Address',
      'wrong_phone': 'Wrong Phone',
      'other': 'Other'
    }
    return labels[type] || type
  }

  const handleStatusUpdate = async (reportId: string, newStatus: string, response?: string) => {
    setIsProcessing(true)
    
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        resolved_at: newStatus === 'resolved' || newStatus === 'rejected' ? new Date().toISOString() : null
      }
      
      if (response) {
        updateData.admin_response = response
      }

      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          updates: updateData
        })
      })

      if (res.ok) {
        // Update the report in our local state
        setReports(prev => prev.map(report => 
          report.id === reportId 
            ? { ...report, ...updateData }
            : report
        ))

        addNotification({
          type: 'success',
          title: 'Report Updated',
          message: `Report marked as ${newStatus}`
        })

        setSelectedReport(null)
        setAdminResponse('')
      } else {
        throw new Error('Failed to update report')
      }
    } catch (error) {
      console.error('Error updating report:', error)
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update report status'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getPendingCount = () => reports.filter(r => r.status === 'pending').length
  const getReviewedCount = () => reports.filter(r => r.status === 'reviewed').length

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
                <span className="text-gray-900 font-medium">Reports</span>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Carrier Data Reports</h1>
            <p className="text-gray-600 mt-2">Review and manage user-submitted data quality reports</p>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['all', 'pending', 'reviewed', 'resolved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'pending' && getPendingCount() > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">
                    {getPendingCount()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
            <div className="text-sm text-gray-600">Total Reports</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-yellow-600">{getPendingCount()}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{getReviewedCount()}</div>
            <div className="text-sm text-gray-600">Under Review</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-600">Resolved</div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filter === 'all' ? 'All Reports' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Reports`}
              ({filteredReports.length})
            </h2>
          </div>
          
          {filteredReports.length > 0 ? (
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
                      Reporter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {report.carriers?.legal_name || 'Unknown Carrier'}
                          </div>
                          <div className="text-sm text-gray-500">
                            DOT {report.carriers?.dot_number}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getIssueTypeLabel(report.issue_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {report.profiles?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {report.profiles?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Review
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'No carrier data reports have been submitted yet.'
                  : `No ${filter} reports at this time.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Review Report</h3>
              <p className="text-sm text-gray-600 mt-1">
                Report for {selectedReport.carriers?.legal_name} (DOT {selectedReport.carriers?.dot_number})
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Type</label>
                  <p className="text-sm text-gray-900">{getIssueTypeLabel(selectedReport.issue_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">User Description</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-900">{selectedReport.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reported By</label>
                <p className="text-sm text-gray-900">
                  {selectedReport.profiles?.full_name} ({selectedReport.profiles?.email})
                </p>
                <p className="text-sm text-gray-500">
                  Submitted {new Date(selectedReport.created_at).toLocaleString()}
                </p>
              </div>

              {selectedReport.admin_response && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Previous Admin Response</label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-gray-900">{selectedReport.admin_response}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Response
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Add your response or notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setSelectedReport(null)
                  setAdminResponse('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
              
              <div className="flex gap-2">
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedReport.id, 'reviewed', adminResponse)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Reviewed
                  </button>
                )}
                
                <button
                  onClick={() => handleStatusUpdate(selectedReport.id, 'resolved', adminResponse)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Mark as Resolved'}
                </button>
                
                <button
                  onClick={() => handleStatusUpdate(selectedReport.id, 'rejected', adminResponse)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}