import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import CarrierDetailClientSocial from './carrier-detail-client-social'

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
    <div>
      {/* Simple Navigation Bar */}
      <header className="bg-white shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-xl font-bold text-gray-900">
              CarrierTracker
            </Link>
            <div className="flex gap-4">
              <Link href="/search" className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Search
              </Link>
              <Link href="/dashboard" className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Social Carrier Detail Component */}
      <CarrierDetailClientSocial carrier={carrier} />
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