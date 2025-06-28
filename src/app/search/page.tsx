'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import SearchFilters from '@/components/SearchFilters'
import CarrierCard from '@/components/CarrierCard'

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
  state: string | null
  city: string | null
  vehicle_count: number | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [savingCarrier, setSavingCarrier] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    state: '',
    safetyRating: '',
    insuranceStatus: '',
    sortBy: ''
  })

  const supabase = createClient()

  const performSearch = async () => {
    setLoading(true)
    setSearched(true)

    let queryBuilder = supabase.from('carriers').select('*')

    // Apply text search if query exists
    if (query.trim()) {
      queryBuilder = queryBuilder.or(`dot_number.ilike.%${query}%,legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
    }

    // Apply filters
    if (filters.state) {
      queryBuilder = queryBuilder.eq('state', filters.state)
    }
    if (filters.safetyRating) {
      queryBuilder = queryBuilder.eq('safety_rating', filters.safetyRating)
    }
    if (filters.insuranceStatus) {
      queryBuilder = queryBuilder.eq('insurance_status', filters.insuranceStatus)
    }

    // Apply sorting
    if (filters.sortBy) {
      const ascending = filters.sortBy === 'legal_name' || filters.sortBy === 'state'
      queryBuilder = queryBuilder.order(filters.sortBy, { ascending })
    }

    queryBuilder = queryBuilder.limit(50)

    const { data } = await queryBuilder

    if (data) {
      setCarriers(data)
    }

    setLoading(false)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    await performSearch()
  }

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      state: '',
      safetyRating: '',
      insuranceStatus: '',
      sortBy: ''
    })
  }

  const handleSaveCarrier = async (carrierId: string) => {
    setSavingCarrier(carrierId)
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        alert('❌ Authentication error. Please try logging in again.')
        setSavingCarrier(null)
        return
      }
      
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      // Verify user profile exists, create if it doesn't
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
          })

        if (createError) {
          console.error('Failed to create profile:', createError)
          alert('❌ Failed to create user profile. Please try again.')
          setSavingCarrier(null)
          return
        }
      } else if (profileError) {
        console.error('Profile error:', profileError)
        alert('❌ Error checking user profile. Please try again.')
        setSavingCarrier(null)
        return
      }

      const { error } = await supabase
        .from('saved_carriers')
        .insert({
          user_id: user.id,
          carrier_id: carrierId
        })

      if (!error) {
        alert('✅ Carrier saved to your dashboard!')
      } else if (error.code === '23505') {
        alert('ℹ️ This carrier is already in your saved list!')
      } else if (error.code === '23503') {
        console.error('Foreign key violation:', error)
        alert('❌ Data error. Please refresh the page and try again.')
      } else {
        console.error('Save carrier error:', error)
        alert(`❌ Error: ${error.message}`)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('❌ Unexpected error occurred')
    }

    setSavingCarrier(null)
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by DOT Number or Company Name
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter DOT number or company name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {Object.values(filters).filter(value => value !== '').length > 0 && (
                  <span>
                    {Object.values(filters).filter(value => value !== '').length} filter(s) active
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Searching...' : 'Search Carriers'}
              </button>
            </div>
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
                  <CarrierCard
                    key={carrier.id}
                    carrier={carrier}
                    onSave={handleSaveCarrier}
                    isSaving={savingCarrier === carrier.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}