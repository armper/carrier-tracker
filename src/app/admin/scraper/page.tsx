import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ScraperDashboard from './scraper-dashboard'

export default async function ScraperPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Check admin privileges
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/dashboard')
  }

  // Fetch scraper statistics
  const [
    carriersResult,
    jobsResult,
    syncLogResult
  ] = await Promise.all([
    supabase
      .from('carriers')
      .select('dot_number, legal_name, last_verified, api_sync_status, api_error_count, data_source')
      .order('last_verified', { ascending: true, nullsFirst: true })
      .limit(100),
    
    supabase
      .from('data_refresh_jobs')
      .select(`
        id,
        job_type,
        status,
        carriers_processed,
        carriers_updated,
        carriers_failed,
        created_at,
        completed_at,
        metadata,
        profiles:created_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20),
    
    supabase
      .from('api_sync_log')
      .select(`
        id,
        api_source,
        sync_type,
        success,
        error_message,
        created_at,
        carriers:carrier_id (
          dot_number,
          legal_name
        )
      `)
      .eq('api_source', 'safer_scraper')
      .order('created_at', { ascending: false })
      .limit(50)
  ])

  // Calculate statistics
  const carriers = carriersResult.data || []
  const totalCarriers = carriers.length
  const neverSynced = carriers.filter(c => !c.last_verified).length
  const staleCarriers = carriers.filter(c => {
    if (!c.last_verified) return true
    const daysSinceSync = (Date.now() - new Date(c.last_verified).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSync > 30
  }).length
  const recentErrors = carriers.filter(c => c.api_error_count > 0).length
  const scrapedCarriers = carriers.filter(c => c.data_source === 'safer_scraper').length

  const jobs = jobsResult.data || []
  const activeJobs = jobs.filter(j => j.status === 'running').length
  const recentJobs = jobs.slice(0, 10)

  const syncLog = syncLogResult.data || []
  const recentSyncs = syncLog.slice(0, 20)
  const successfulSyncs = syncLog.filter(l => l.success).length
  const failedSyncs = syncLog.filter(l => !l.success).length

  const stats = {
    totalCarriers,
    neverSynced,
    staleCarriers,
    recentErrors,
    scrapedCarriers,
    activeJobs,
    successfulSyncs,
    failedSyncs
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-blue-600 hover:text-blue-800 font-medium">
                ← Admin Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SAFER Web Scraper</h1>
                <p className="text-gray-600">Automated data collection and monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                🤖 SCRAPER ADMIN
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScraperDashboard 
          carriers={carriers}
          recentJobs={recentJobs}
          recentSyncs={recentSyncs}
          stats={stats}
        />
      </div>
    </div>
  )
}