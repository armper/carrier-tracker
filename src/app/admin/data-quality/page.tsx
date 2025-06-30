import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DataQualityDashboard from './data-quality-dashboard'

export default async function AdminDataQualityPage() {
  const supabase = await createClient()

  // Check authentication and admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  // Fetch initial data quality overview
  const [
    { data: carriersData },
    { data: recentJobs },
    { data: qualityIssues },
    { data: syncLog }
  ] = await Promise.all([
    // Get carriers with quality scores
    supabase
      .from('carriers')
      .select(`
        id,
        dot_number,
        legal_name,
        data_quality_score,
        api_sync_status,
        last_verified,
        api_error_count,
        needs_verification,
        entity_type
      `)
      .not('data_quality_score', 'is', null)
      .not('entity_type', 'ilike', '%broker%')
      .not('entity_type', 'ilike', '%freight forwarder%')
      .not('entity_type', 'ilike', '%property broker%')
      .not('entity_type', 'ilike', '%passenger broker%')
      .order('data_quality_score', { ascending: true })
      .limit(100),

    // Get recent data refresh jobs
    supabase
      .from('data_refresh_jobs')
      .select(`
        *,
        profiles:created_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10),

    // Get unresolved quality issues
    supabase
      .from('data_quality_issues')
      .select(`
        *,
        carriers (
          dot_number,
          legal_name
        )
      `)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(50),

    // Get recent sync activity
    supabase
      .from('api_sync_log')
      .select(`
        *,
        carriers (
          dot_number,
          legal_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  // Calculate statistics
  const totalCarriers = carriersData?.length || 0
  const highQuality = carriersData?.filter(c => c.data_quality_score >= 80).length || 0
  const mediumQuality = carriersData?.filter(c => c.data_quality_score >= 60 && c.data_quality_score < 80).length || 0
  const lowQuality = carriersData?.filter(c => c.data_quality_score < 60).length || 0
  
  const needsVerification = carriersData?.filter(c => {
    if (!c.last_verified) return true
    const daysSince = (Date.now() - new Date(c.last_verified).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 30 || c.needs_verification
  }).length || 0

  const recentlySynced = carriersData?.filter(c => {
    if (!c.last_verified) return false
    const daysSince = (Date.now() - new Date(c.last_verified).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 7
  }).length || 0

  const stats = {
    totalCarriers,
    highQuality,
    mediumQuality,
    lowQuality,
    needsVerification,
    recentlySynced,
    activeJobs: recentJobs?.filter(j => j.status === 'running').length || 0,
    openIssues: {
      critical: qualityIssues?.filter(i => i.severity === 'critical').length || 0,
      high: qualityIssues?.filter(i => i.severity === 'high').length || 0,
      medium: qualityIssues?.filter(i => i.severity === 'medium').length || 0,
      low: qualityIssues?.filter(i => i.severity === 'low').length || 0
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
                <span className="text-gray-900 font-medium">Data Quality Management</span>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/carriers" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Manage Carriers
              </Link>
              <Link 
                href="/admin/safety-ratings" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Safety Monitoring
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Quality Management</h1>
          <p className="text-gray-600 mt-2">Monitor data quality, sync status, and manage automated updates</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Quality Data</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.highQuality}</p>
                {totalCarriers > 0 && (
                  <p className="text-xs text-gray-500">
                    {Math.round((stats.highQuality / totalCarriers) * 100)}% of total
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Needs Verification</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.needsVerification}</p>
                <p className="text-xs text-gray-500">Stale or unverified data</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recently Synced</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentlySynced}</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quality Issues</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.openIssues.critical + stats.openIssues.high + stats.openIssues.medium + stats.openIssues.low}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.openIssues.critical} critical, {stats.openIssues.high} high
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <DataQualityDashboard 
          carriersData={carriersData || []}
          recentJobs={recentJobs || []}
          qualityIssues={qualityIssues || []}
          syncLog={syncLog || []}
          stats={stats}
        />
      </div>
    </div>
  )
}