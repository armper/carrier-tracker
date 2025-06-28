'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string
  insurance_status: string
  authority_status: string
  carb_compliance: boolean
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [savingCarrier, setSavingCarrier] = useState<string | null>(null)

  const supabase = createClient()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    const { data } = await supabase
      .from('carriers')
      .select('*')
      .or(`dot_number.ilike.%${query}%,legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
      .limit(20)

    if (data) {
      setCarriers(data)
    }

    setLoading(false)
  }

  const handleSaveCarrier = async (carrierId: string) => {
    setSavingCarrier(carrierId)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login'
      return
    }

    const { error } = await supabase
      .from('saved_carriers')
      .insert({
        user_id: user.id,
        carrier_id: carrierId
      })

    if (!error) {
      alert('Carrier saved to your dashboard!')
    } else if (error.code === '23505') {
      // Unique constraint violation - already saved
      alert('This carrier is already in your saved list!')
    } else {
      alert('Error saving carrier')
    }

    setSavingCarrier(null)
  }

  const getSafetyRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'satisfactory':
        return 'bg-green-100 text-green-800'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800'
      case 'unsatisfactory':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
              <Link href="/dashboard" className="px-4 py-2 text-blue-600 hover:text-blue-800">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Carriers</h1>
          <p className="text-gray-600">Find and track transportation carriers by DOT number or company name</p>
        </div>

        <div className="max-w-2xl mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter DOT number or company name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {searched && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search Results ({carriers.length})
            </h2>

            {carriers.length === 0 && !loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No carriers found matching your search.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {carriers.map((carrier) => (
                  <div key={carrier.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {carrier.legal_name}
                        </h3>
                        {carrier.dba_name && (
                          <p className="text-sm text-gray-600">DBA: {carrier.dba_name}</p>
                        )}
                        <p className="text-sm text-gray-600">DOT: {carrier.dot_number}</p>
                        {carrier.physical_address && (
                          <p className="text-sm text-gray-600">{carrier.physical_address}</p>
                        )}
                        {carrier.phone && (
                          <p className="text-sm text-gray-600">{carrier.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSaveCarrier(carrier.id)}
                        disabled={savingCarrier === carrier.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {savingCarrier === carrier.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Safety Rating</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSafetyRatingColor(carrier.safety_rating)}`}>
                          {carrier.safety_rating}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Insurance</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          carrier.insurance_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {carrier.insurance_status}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Authority</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          carrier.authority_status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {carrier.authority_status}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">CARB Compliant</span>
                        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          carrier.carb_compliance ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {carrier.carb_compliance ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}