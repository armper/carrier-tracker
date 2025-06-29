import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SafetyRatingMonitoringDashboard from './safety-rating-monitoring-dashboard'

export default async function AdminSafetyRatingsPage() {
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

  // Fetch safety rating monitoring data
  const [
    { data: recentChanges },
    { data: ratingDistribution },
    { data: statsData }
  ] = await Promise.all([
    // Get recent safety rating changes
    supabase.rpc('get_recent_safety_rating_changes', { days_back: 30 }),
    
    // Get current rating distribution
    supabase
      .from('carriers')
      .select('safety_rating', { count: 'exact' })
      .not('safety_rating', 'is', null),
    
    // Get carriers with safety rating data
    supabase
      .from('carriers')
      .select(`
        id,
        safety_rating,
        safety_rating_stability_score,
        safety_rating_trend,
        safety_rating_change_count,
        safety_rating_last_changed
      `, { count: 'exact' })
      .not('safety_rating', 'is', null)
  ])

  // Calculate statistics
  const totalCarriers = statsData?.length || 0
  const satisfactoryCount = ratingDistribution?.filter(c => c.safety_rating === 'satisfactory').length || 0
  const conditionalCount = ratingDistribution?.filter(c => c.safety_rating === 'conditional').length || 0
  const unsatisfactoryCount = ratingDistribution?.filter(c => c.safety_rating === 'unsatisfactory').length || 0
  const notRatedCount = ratingDistribution?.filter(c => c.safety_rating === 'not-rated').length || 0

  // Calculate trend statistics
  const improvingCount = statsData?.filter(c => c.safety_rating_trend === 'improving').length || 0
  const decliningCount = statsData?.filter(c => c.safety_rating_trend === 'declining').length || 0
  const volatileCount = statsData?.filter(c => c.safety_rating_trend === 'volatile').length || 0
  const stableCount = statsData?.filter(c => c.safety_rating_trend === 'stable').length || 0

  // Calculate recent changes by severity
  const criticalChanges = recentChanges?.filter(c => 
    (c.old_rating === 'satisfactory' && c.new_rating !== 'satisfactory') ||
    (c.new_rating === 'unsatisfactory')
  ).length || 0

  const positiveChanges = recentChanges?.filter(c => 
    (c.old_rating === 'unsatisfactory' && c.new_rating !== 'unsatisfactory') ||
    (c.old_rating === 'conditional' && c.new_rating === 'satisfactory')
  ).length || 0

  const stats = {
    totalCarriers,
    ratingDistribution: {
      satisfactory: satisfactoryCount,
      conditional: conditionalCount,
      unsatisfactory: unsatisfactoryCount,
      notRated: notRatedCount
    },
    trends: {
      improving: improvingCount,
      declining: decliningCount,
      volatile: volatileCount,
      stable: stableCount
    },
    recentChanges: {
      total: recentChanges?.length || 0,
      critical: criticalChanges,
      positive: positiveChanges
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
                <span className="text-gray-900 font-medium">Safety Rating Monitoring</span>
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
                href="/admin/insurance" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Insurance Monitoring
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Safety Rating Monitoring</h1>
          <p className="text-gray-600 mt-2">Track safety rating changes, trends, and risk assessment</p>
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
                <p className="text-sm font-medium text-gray-500">Satisfactory</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.ratingDistribution.satisfactory}</p>
                {totalCarriers > 0 && (
                  <p className="text-xs text-gray-500">
                    {Math.round((stats.ratingDistribution.satisfactory / totalCarriers) * 100)}% of total
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conditional</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.ratingDistribution.conditional}</p>
                {totalCarriers > 0 && (
                  <p className="text-xs text-gray-500">
                    {Math.round((stats.ratingDistribution.conditional / totalCarriers) * 100)}% of total
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unsatisfactory</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.ratingDistribution.unsatisfactory}</p>
                {totalCarriers > 0 && (
                  <p className="text-xs text-gray-500">
                    {Math.round((stats.ratingDistribution.unsatisfactory / totalCarriers) * 100)}% of total
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Changes</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentChanges.total}</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <SafetyRatingMonitoringDashboard 
          recentChanges={recentChanges || []}
          stats={stats}
        />
      </div>
    </div>
  )
}