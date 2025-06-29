import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UserMonitoringDashboard from './user-monitoring-dashboard'

export default async function UserMonitoringPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Fetch user's saved carriers with monitoring data
  const { data: savedCarriers } = await supabase
    .from('saved_carriers')
    .select(`
      id,
      carriers (
        id,
        dot_number,
        legal_name,
        safety_rating,
        insurance_status,
        insurance_expiry_date,
        insurance_carrier,
        safety_rating_stability_score,
        safety_rating_trend,
        safety_rating_last_changed
      )
    `)
    .eq('user_id', user.id)

  // Get recent safety rating changes for user's carriers
  const carrierIds = savedCarriers?.map(sc => sc.carriers.id) || []
  let recentSafetyChanges = []
  
  if (carrierIds.length > 0) {
    const { data: safetyChanges } = await supabase.rpc('get_recent_safety_rating_changes', { 
      days_back: 30 
    })
    
    // Filter to only user's carriers
    recentSafetyChanges = safetyChanges?.filter(change => 
      carrierIds.includes(change.carrier_id)
    ) || []
  }

  // Get user's active alerts
  const { data: activeAlerts } = await supabase
    .from('monitoring_alerts')
    .select(`
      id,
      alert_type,
      carrier_id,
      created_at,
      carriers (
        dot_number,
        legal_name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Calculate insurance expiration alerts for user's carriers
  const insuranceAlerts = savedCarriers?.filter(sc => {
    if (!sc.carriers.insurance_expiry_date) return false
    
    const expiryDate = new Date(sc.carriers.insurance_expiry_date)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }) || []

  // Calculate summary statistics
  const totalCarriers = savedCarriers?.length || 0
  const carrierStats = {
    withInsuranceData: savedCarriers?.filter(sc => sc.carriers.insurance_expiry_date).length || 0,
    insuranceExpiringSoon: insuranceAlerts.length,
    recentSafetyChanges: recentSafetyChanges.length,
    totalAlerts: activeAlerts?.length || 0
  }

  const riskySafetyCarriers = savedCarriers?.filter(sc => 
    sc.carriers.safety_rating === 'unsatisfactory' || 
    sc.carriers.safety_rating === 'conditional'
  ).length || 0

  const monitoringStats = {
    totalCarriers,
    carriersWithInsurance: carrierStats.withInsuranceData,
    upcomingExpirations: carrierStats.insuranceExpiringSoon,
    recentSafetyChanges: carrierStats.recentSafetyChanges,
    riskySafetyRatings: riskySafetyCarriers,
    activeAlerts: carrierStats.totalAlerts
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Carrier Monitoring</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/alerts" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Manage Alerts
              </Link>
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Carrier Monitoring Overview</h2>
          <p className="text-gray-600">Track insurance expiration dates, safety rating changes, and compliance status for your saved carriers.</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Carriers</p>
                <p className="text-2xl font-semibold text-gray-900">{monitoringStats.totalCarriers}</p>
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
                <p className="text-sm font-medium text-gray-500">Insurance Expiring Soon</p>
                <p className="text-2xl font-semibold text-gray-900">{monitoringStats.upcomingExpirations}</p>
                <p className="text-xs text-gray-500">Next 30 days</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Safety Changes</p>
                <p className="text-2xl font-semibold text-gray-900">{monitoringStats.recentSafetyChanges}</p>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <UserMonitoringDashboard 
          savedCarriers={savedCarriers || []}
          recentSafetyChanges={recentSafetyChanges}
          activeAlerts={activeAlerts || []}
          stats={monitoringStats}
        />
      </main>
    </div>
  )
}