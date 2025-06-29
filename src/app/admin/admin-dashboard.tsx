'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface User {
  id: string
  email?: string
}

interface Profile {
  role: string
  is_admin: boolean
}

interface AdminStats {
  totalCarriers: number
  manualCarriers: number
  verifiedCarriers: number
  pendingReports: number
}

interface AdminActivity {
  id: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  created_at: string
  profiles?: {
    full_name?: string
    email: string
  }
}

interface Props {
  user: User
  profile: Profile
  stats: AdminStats
  recentActivities: AdminActivity[]
}

export default function AdminDashboard({ user, profile, stats, recentActivities }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const isSuperAdmin = profile.role === 'super_admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                CarrierTracker
              </Link>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  🛡️ ADMIN PANEL
                </span>
                {isSuperAdmin && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    SUPER ADMIN
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                User Dashboard
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-50">
                  <span className="text-sm">{user.email?.split('@')[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage carrier data and system administration</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <p className="text-sm font-medium text-gray-600">Manual Entries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.manualCarriers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Verified Carriers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.verifiedCarriers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Reports</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReports.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                href="/admin/carriers/add" 
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add New Carrier</p>
                  <p className="text-sm text-gray-600">Manually add carrier data</p>
                </div>
              </Link>

              <Link 
                href="/admin/carriers" 
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:bg-green-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Carriers</p>
                  <p className="text-sm text-gray-600">View and edit carrier database</p>
                </div>
              </Link>

              <Link 
                href="/admin/reports" 
                className="flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:bg-orange-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">Review Reports</p>
                    {stats.pendingReports > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {stats.pendingReports}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">User-submitted data quality reports</p>
                </div>
              </Link>

              <Link 
                href="/admin/insurance" 
                className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Insurance Monitoring</p>
                  <p className="text-sm text-gray-600">Track insurance expiration alerts</p>
                </div>
              </Link>

              <Link 
                href="/admin/safety-ratings" 
                className="flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center group-hover:bg-yellow-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Safety Rating Monitoring</p>
                  <p className="text-sm text-gray-600">Track rating changes and trends</p>
                </div>
              </Link>

              <Link 
                href="/admin/carriers/import" 
                className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-700 transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Bulk Import</p>
                  <p className="text-sm text-gray-600">Import carriers from CSV</p>
                </div>
              </Link>

              {isSuperAdmin && (
                <Link 
                  href="/admin/users" 
                  className="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                >
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Manage Users</p>
                    <p className="text-sm text-gray-600">User management and admin roles</p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Admin Activity</h2>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatActionName(activity.action)}
                      </p>
                      <p className="text-sm text-gray-600">
                        by {activity.profiles?.full_name || activity.profiles?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>No recent admin activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}