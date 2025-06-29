import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InsuranceMonitoringDashboard from './insurance-monitoring-dashboard'

export default async function AdminInsurancePage() {
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

  // Fetch insurance monitoring data
  const [
    { data: expiringCarriers },
    { data: alertsData },
    { data: statsData }
  ] = await Promise.all([
    // Get carriers with insurance expiring in next 30 days
    supabase.rpc('get_expiring_insurance', { days_ahead: 30 }),
    
    // Get insurance alerts summary
    supabase
      .from('insurance_alerts')
      .select(`
        id,
        expiry_date,
        alert_sent_30d,
        alert_sent_15d,
        alert_sent_7d,
        alert_sent_1d,
        carriers (
          legal_name,
          dot_number,
          insurance_carrier,
          insurance_policy_number
        )
      `)
      .order('expiry_date', { ascending: true }),
    
    // Get general statistics
    supabase
      .from('carriers')
      .select('id, insurance_expiry_date, insurance_status', { count: 'exact' })
  ])

  // Calculate statistics
  const totalCarriers = statsData?.length || 0
  const carriersWithInsurance = statsData?.filter(c => c.insurance_expiry_date).length || 0
  const activeInsurance = statsData?.filter(c => c.insurance_status === 'Active').length || 0
  const expiringSoon = expiringCarriers?.filter(c => {
    const days = Math.ceil((new Date(c.insurance_expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return days <= 30
  }).length || 0

  const stats = {
    totalCarriers,
    carriersWithInsurance,
    activeInsurance,
    expiringSoon,
    coverageRate: totalCarriers > 0 ? Math.round((carriersWithInsurance / totalCarriers) * 100) : 0
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
                <span className="text-gray-900 font-medium">Insurance Monitoring</span>
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
                href="/admin/reports" 
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Data Reports
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Insurance Monitoring</h1>
          <p className="text-gray-600 mt-2">Monitor carrier insurance expiration and compliance</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Carriers</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCarriers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">With Insurance</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.carriersWithInsurance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Insurance</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeInsurance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.expiringSoon}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Coverage Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.coverageRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <InsuranceMonitoringDashboard 
          expiringCarriers={expiringCarriers || []}
          alertsData={alertsData || []}
          stats={stats}
        />
      </div>
    </div>
  )
}