'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import SearchFilters from '@/components/SearchFilters'
import CarrierCard from '@/components/CarrierCard'
import { useNotifications } from '@/components/ui/notification'
import { isCarrierEntity, getCarrierOnlyFilters } from '@/lib/carrier-filter'

interface Carrier {
  id: string
  dot_number: string
  legal_name: string
  dba_name: string | null
  physical_address: string | null
  phone: string | null
  safety_rating: string | null
  insurance_status: string | null
  authority_status: string | null
  state: string | null
  city: string | null
  vehicle_count: number | null
  driver_count: number | null
  entity_type: string | null
  data_source?: string
  verified?: boolean
  trust_score?: number
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
    sortBy: '',
    carriersOnly: true // Default to carriers only
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

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
        const { data: recentSearchData } = await supabase
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
      const { data: popularSearchData } = await supabase
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

    let finalResults: Carrier[] = []

    try {
      // First, search our local database
      let queryBuilder = supabase.from('carriers').select('*, data_source, verified, trust_score')

      // Apply text search if query exists
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`dot_number.ilike.%${query}%,legal_name.ilike.%${query}%,dba_name.ilike.%${query}%`)
      }

      // Filter out non-carrier entities only if carriersOnly is enabled
      if (filters.carriersOnly) {
        queryBuilder = getCarrierOnlyFilters(queryBuilder)
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

      const { data: localResults } = await queryBuilder
      finalResults = localResults || []

      // If we have a query that looks like a DOT number and found no local results, try FMCSA
      const cleanQuery = query.trim().replace(/\D/g, '')
      const isDotNumber = cleanQuery.length >= 6 && cleanQuery.length <= 8 && !isNaN(Number(cleanQuery))
      
      if (isDotNumber && finalResults.length === 0) {
        try {
          // Query FMCSA for this DOT number
          const fmcsaResponse = await fetch(`/api/carriers/lookup?dot=${cleanQuery}`)
          const fmcsaData = await fmcsaResponse.json()
          
          if (fmcsaData.success && fmcsaData.data) {
            // Check if the FMCSA result is a carrier entity
            const isCarrier = isCarrierEntity(fmcsaData.data)
            if (isCarrier) {
              finalResults = [fmcsaData.data]
              
              // Show notification about FMCSA fetch
              addNotification({
                type: 'success',
                title: 'Carrier Found!',
                message: `Retrieved fresh data from FMCSA for DOT ${cleanQuery}`
              })
            } else {
              addNotification({
                type: 'info',
                title: 'Non-Carrier Entity',
                message: `DOT ${cleanQuery} is a ${fmcsaData.data.entity_type || 'non-carrier entity'}, not a motor carrier`
              })
            }
          }
        } catch (fmcsaError) {
          console.error('FMCSA lookup failed:', fmcsaError)
          // Don't show error to user - just continue with empty results
        }
      }

      // Set results
      setCarriers(finalResults)
      
      // Save search to history and update recent searches
      await saveSearchHistory(query, filters, finalResults.length)
      
      // Add to recent searches state (avoid duplicates)
      if (query.trim()) {
        setRecentSearches(prev => {
          const newSearch = {
            id: Date.now().toString(),
            query: query.trim(),
            filters,
            results_count: finalResults.length,
            created_at: new Date().toISOString()
          }
          // Remove existing search with same query and add new one at top
          const filtered = prev.filter(search => search.query !== query.trim())
          return [newSearch, ...filtered].slice(0, 10)
        })
      }

      // Show helpful message if still no results
      if (finalResults.length === 0 && query.trim()) {
        if (isDotNumber) {
          addNotification({
            type: 'info',
            title: 'No Results',
            message: `DOT number ${cleanQuery} not found in FMCSA database. Please verify the number is correct.`
          })
        } else {
          addNotification({
            type: 'info',
            title: 'No Results',
            message: 'No carriers found. Try searching by DOT number for exact matches.'
          })
        }
      }

    } catch (error) {
      console.error('Search error:', error)
      addNotification({
        type: 'error',
        title: 'Search Failed',
        message: 'An error occurred during search. Please try again.'
      })
      setCarriers([])
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
      sortBy: '',
      carriersOnly: true // Reset to default carriers only
    })
    setShowAdvancedFilters(false) // Close advanced filters when clearing
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
      sortBy: '',
      carriersOnly: true
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

        {/* Hero Search Section - Simple & Prominent */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <form onSubmit={handleSearch}>
            {/* Primary Search Input */}
            <div className="mb-6">
              <label className="block text-lg font-medium text-gray-900 mb-3">
                Find Transportation Carriers
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter company name or DOT number (e.g., 'Swift Transportation' or '123456')"
                className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Quick Filters Row - Most Common Options */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {/* State Filter - Most Common */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filter by state:
                </label>
                <select
                  value={filters.state}
                  onChange={(e) => handleFilterChange({ ...filters, state: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All States</option>
                  {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                More Filters
                <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Active Filters Indicator */}
              {(filters.state || filters.safetyRating || filters.insuranceStatus || filters.sortBy || !filters.carriersOnly) && (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                  {[filters.state, filters.safetyRating, filters.insuranceStatus, filters.sortBy].filter(v => v !== '').length + (!filters.carriersOnly ? 1 : 0)} filter(s) active
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  'Search Carriers'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  performSearch()
                }}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Browse All
              </button>
            </div>
          </form>
        </div>

        {/* Advanced Filters Section - Collapsible */}
        {showAdvancedFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              <button
                onClick={handleClearFilters}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All Filters
              </button>
            </div>
            
            <SearchFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}

        {/* Getting Started Hint - Only show when no search has been performed */}
        {!searched && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to find carriers?</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span><strong>Quick start:</strong> Click "Search Carriers" below to browse our database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span><strong>Targeted search:</strong> Enter a DOT number (e.g., 123456) or company name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span><strong>Refine results:</strong> Use filters above to narrow by state, safety rating, or insurance status</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-100 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">💡 Pro tip:</span> The "Carriers Only" filter is enabled by default to show motor carriers relevant to freight brokers. Toggle it off to see all entity types.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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