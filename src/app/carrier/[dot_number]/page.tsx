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
  
  const { data: carrier } = await supabase
    .from('carriers')
    .select('*')
    .eq('dot_number', dot_number)
    .single()

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{carrier.legal_name}</h1>
          {carrier.dba_name && (
            <p className="text-lg text-gray-600">DBA: {carrier.dba_name}</p>
          )}
          <p className="text-gray-600">DOT Number: {carrier.dot_number}</p>
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
  
  const { data: carrier } = await supabase
    .from('carriers')
    .select('legal_name, dot_number')
    .eq('dot_number', dot_number)
    .single()

  if (!carrier) {
    return {
      title: 'Carrier Not Found'
    }
  }

  return {
    title: `${carrier.legal_name} - DOT ${carrier.dot_number} | CarrierTracker`,
    description: `View detailed information for ${carrier.legal_name} (DOT ${carrier.dot_number}) including safety ratings, compliance status, and contact information.`
  }
}