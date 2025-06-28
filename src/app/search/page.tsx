'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import SearchFilters from '@/components/SearchFilters'
import CarrierCard from '@/components/CarrierCard'
import { useNotifications } from '@/components/ui/notification'

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
  const [savedCarrierIds, setSavedCarrierIds] = useState<Set<string>>(new Set())
  const [recentSearches, setRecentSearches] = useState<Array<{
    id: string
    query: string
    filters: typeof filters
    results_count: number
    created_at: string
  }>>([])
  const [popularSearches, setPopularSearches] = useState<Array<{
    query: string
    search_count: number
  }>>([])
  const [filters, setFilters] = useState({
    state: '',
    safetyRating: '',
    insuranceStatus: '',
    sortBy: ''
  })

  const supabase = createClient()
  const { addNotification } = useNotifications()

  // Load user's saved carriers and search history on component mount
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Load saved carriers
        const { data: savedCarriers } = await supabase
          .from('saved_carriers')
          .select('carrier_id')
          .eq('user_id', user.id)
        
        if (savedCarriers) {
          setSavedCarrierIds(new Set(savedCarriers.map(sc => sc.carrier_id)))
        }

        // Load recent searches
        const { data: recentSearchData, error: recentError } = await supabase
          .from('search_history')
          .select('id, query, filters, results_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (recentSearchData) {
          setRecentSearches(recentSearchData)
        }
      }

      // Load popular searches (available to all users)
      const { data: popularSearchData, error: popularError } = await supabase
        .from('popular_searches')
        .select('query, search_count')
        .limit(8)
      
      if (popularSearchData) {
        setPopularSearches(popularSearchData)
      }
    }
    loadUserData()
  }, [supabase])

  const saveSearchHistory = async (searchQuery: string, searchFilters: typeof filters, resultsCount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && searchQuery.trim()) {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            query: searchQuery.trim(),
            filters: searchFilters,
            results_count: resultsCount
          })
      }
    } catch (error) {
      // Silently fail - search history is not critical
      console.log('Search history save failed:', error)
    }
  }

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
      // Save search to history and update recent searches
      await saveSearchHistory(query, filters, data.length)
      // Add to recent searches state (avoid duplicates)
      if (query.trim()) {
        setRecentSearches(prev => {
          const newSearch = {
            id: Date.now().toString(),
            query: query.trim(),
            filters,
            results_count: data.length,
            created_at: new Date().toISOString()
          }
          // Remove existing search with same query and add new one at top
          const filtered = prev.filter(search => search.query !== query.trim())
          return [newSearch, ...filtered].slice(0, 10)
        })
      }
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

  const handleRecentSearchClick = (search: typeof recentSearches[0]) => {
    setQuery(search.query)
    setFilters(search.filters)
    // Trigger search automatically
    performSearch()
  }

  const handlePopularSearchClick = (searchQuery: string) => {
    setQuery(searchQuery)
    // Clear filters for popular searches
    setFilters({
      state: '',
      safetyRating: '',
      insuranceStatus: '',
      sortBy: ''
    })
    // Trigger search automatically
    performSearch()
  }

  const clearSearchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('search_history')
          .delete()
          .eq('user_id', user.id)
        
        setRecentSearches([])
        addNotification({
          type: 'success',
          title: 'History Cleared',
          message: 'Your search history has been cleared.'
        })
      }
    } catch (error) {
      console.error('Clear history error:', error)
      addNotification({
        type: 'error',
        title: 'Clear Failed',
        message: 'Failed to clear search history. Please try again.'
      })
    }
  }

  const handleSaveCarrier = async (carrierId: string) => {
    setSavingCarrier(carrierId)
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        addNotification({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please try logging in again.'
        })
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
          addNotification({
            type: 'error',
            title: 'Profile Creation Failed',
            message: 'Please try again or contact support.'
          })
          setSavingCarrier(null)
          return
        }
      } else if (profileError) {
        console.error('Profile error:', profileError)
        addNotification({
          type: 'error',
          title: 'Profile Error',
          message: 'Error checking user profile. Please try again.'
        })
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
        addNotification({
          type: 'success',
          title: 'Carrier Saved!',
          message: 'Carrier successfully added to your dashboard.'
        })
        // Add to local saved carriers set
        setSavedCarrierIds(prev => new Set([...prev, carrierId]))
      } else if (error.code === '23505') {
        addNotification({
          type: 'info',
          title: 'Already Saved',
          message: 'This carrier is already in your saved list.'
        })
      } else if (error.code === '23503') {
        console.error('Foreign key violation:', error)
        addNotification({
          type: 'error',
          title: 'Data Error',
          message: 'Please refresh the page and try again.'
        })
      } else {
        console.error('Save carrier error:', error)
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: error.message || 'Unknown error occurred.'
        })
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      addNotification({
        type: 'error',
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again.'
      })
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


        {/* Search History Section */}
        {(recentSearches.length > 0 || popularSearches.length > 0) && !searched && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Recent Searches</h3>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.slice(0, 5).map((search) => (
                      <button
                        key={search.id}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full text-left p-2 rounded-md hover:bg-gray-50 border border-gray-200 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-900 font-medium">&ldquo;{search.query}&rdquo;</span>
                          <span className="text-xs text-gray-500">{search.results_count} results</span>
                        </div>
                        {Object.values(search.filters).some(v => v !== '') && (
                          <div className="text-xs text-gray-500 mt-1">
                            Filters: {Object.entries(search.filters)
                              .filter(([, value]) => value !== '')
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              {popularSearches.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Popular Searches</h3>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handlePopularSearchClick(search.query)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {search.query}
                        <span className="ml-1 text-xs text-blue-500">({search.search_count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                    isSaved={savedCarrierIds.has(carrier.id)}
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