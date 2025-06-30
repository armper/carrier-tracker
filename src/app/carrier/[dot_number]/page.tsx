import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import CarrierDetailClient from './carrier-detail-client'

interface PageProps {
  params: Promise<{
    dot_number: string
  }>
}

export default async function CarrierDetailPage({ params }: PageProps) {
  const { dot_number } = await params
  const supabase = await createClient()
  
  // First, try to get carrier from our database
  let { data: carrier } = await supabase
    .from('carriers')
    .select('*')
    .eq('dot_number', dot_number)
    .single()

  // Check if carrier data is stale (older than 7 days for FMCSA/SAFER data, 30 days for manual)
  let shouldRefresh = false
  if (carrier) {
    const lastUpdate = carrier.updated_at
    const hoursOld = lastUpdate ? (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60) : Infinity
    const staleThreshold = (carrier.data_source === 'fmcsa' || carrier.data_source === 'safer_scraper') ? 168 : 720 // 7 days vs 30 days
    shouldRefresh = hoursOld > staleThreshold
  }

  // If not found in our DB OR data is stale, try to fetch from FMCSA
  if (!carrier || shouldRefresh) {
    try {
      // Use our carrier lookup API to fetch from FMCSA
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/carriers/lookup?dot=${dot_number}`, {
        cache: 'no-store' // Always fresh for detail pages
      })
      
      if (response.ok) {
        const lookupData = await response.json()
        if (lookupData.success && lookupData.data) {
          carrier = lookupData.data
          console.log(`${shouldRefresh ? 'Refreshed stale' : 'Auto-populated'} carrier ${dot_number} from FMCSA:`, carrier.legal_name)
        }
      }
    } catch (error) {
      console.error('Error fetching carrier from FMCSA:', error)
    }
  }

  // If still no carrier found, show not found
  if (!carrier) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              CarrierTracker
            </Link>
            <div className="flex gap-4">
              <Link href="/search" className="px-4 py-2 text-blue-600 hover:text-blue-800">
                Search
              </Link>
              <Link href="/dashboard" className="px-4 py-2 text-blue-600 hover:text-blue-800">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
            <li className="inline-flex items-center">
              <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <Link href="/search" className="text-sm font-medium text-gray-700 hover:text-blue-600 ms-1 md:ms-2">
                  Search
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="text-sm font-medium text-gray-500 ms-1 md:ms-2">DOT {dot_number}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{carrier.legal_name}</h1>
              {carrier.dba_name && (
                <p className="text-lg text-gray-600">DBA: {carrier.dba_name}</p>
              )}
              <p className="text-gray-600">DOT Number: {carrier.dot_number}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Data Source Badge */}
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                carrier.data_source === 'fmcsa' || carrier.data_source === 'safer_scraper'
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {carrier.data_source === 'fmcsa' ? '🏛️ FMCSA Data' : 
                 carrier.data_source === 'safer_scraper' ? '🤖 SAFER Scraper' :
                 '📝 Manual Entry'}
              </span>
              
              {/* Trust Score */}
              {carrier.trust_score && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Trust Score:</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-semibold ${
                      carrier.trust_score >= 90 ? 'text-green-600' :
                      carrier.trust_score >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {carrier.trust_score}%
                    </span>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          carrier.trust_score >= 90 ? 'bg-green-600' :
                          carrier.trust_score >= 70 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${carrier.trust_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Data Freshness */}
              {carrier.updated_at && (
                <p className="text-xs text-gray-500">
                  Updated {new Date(carrier.updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Carrier Detail Content */}
        <CarrierDetailClient carrier={carrier} />
      </main>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { dot_number } = await params
  const supabase = await createClient()
  
  // Try to get carrier from our database
  let { data: carrier } = await supabase
    .from('carriers')
    .select('legal_name, dot_number')
    .eq('dot_number', dot_number)
    .single()

  // If not found, try FMCSA (same lazy loading for metadata)
  if (!carrier) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/carriers/lookup?dot=${dot_number}`, {
        cache: 'no-store'
      })
      
      if (response.ok) {
        const lookupData = await response.json()
        if (lookupData.success && lookupData.data) {
          carrier = {
            legal_name: lookupData.data.legal_name,
            dot_number: lookupData.data.dot_number
          }
        }
      }
    } catch (error) {
      console.error('Error fetching carrier metadata from FMCSA:', error)
    }
  }

  if (!carrier) {
    return {
      title: `DOT ${dot_number} - Carrier Not Found | CarrierTracker`,
      description: `Carrier information for DOT ${dot_number} is not available.`
    }
  }

  return {
    title: `${carrier.legal_name} - DOT ${carrier.dot_number} | CarrierTracker`,
    description: `View detailed information for ${carrier.legal_name} (DOT ${carrier.dot_number}) including safety ratings, compliance status, and contact information.`
  }
}