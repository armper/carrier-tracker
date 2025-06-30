'use client'

interface SearchFiltersProps {
  filters: {
    state: string
    safetyRating: string
    insuranceStatus: string
    sortBy: string
    carriersOnly: boolean
  }
  onFilterChange: (filters: {
    state: string
    safetyRating: string
    insuranceStatus: string
    sortBy: string
    carriersOnly: boolean
  }) => void
  onClearFilters: () => void
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

const SAFETY_RATINGS = ['Satisfactory', 'Conditional', 'Unsatisfactory']
const INSURANCE_STATUS = ['Active', 'Inactive']
const SORT_OPTIONS = [
  { value: 'legal_name', label: 'Company Name' },
  { value: 'dot_number', label: 'DOT Number' },
  { value: 'safety_rating', label: 'Safety Rating' },
  { value: 'vehicle_count', label: 'Fleet Size' },
  { value: 'state', label: 'State' }
]

export default function SearchFilters({ filters, onFilterChange, onClearFilters }: SearchFiltersProps) {
  const updateFilter = (key: string, value: string | boolean) => {
    onFilterChange({
      ...filters,
      [key]: value
    })
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key === 'carriersOnly' ? !value : value !== ''
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">Filter Results</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Carriers Only Toggle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Entity Type Filter
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {filters.carriersOnly 
                ? 'Showing motor carriers only (recommended for freight brokers)' 
                : 'Showing all entities (carriers, brokers, forwarders, etc.)'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.carriersOnly}
              onChange={(e) => updateFilter('carriersOnly', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              Carriers Only
            </span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          <select
            value={filters.state}
            onChange={(e) => updateFilter('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All States</option>
            {STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Safety Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Safety Rating
          </label>
          <select
            value={filters.safetyRating}
            onChange={(e) => updateFilter('safetyRating', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Ratings</option>
            {SAFETY_RATINGS.map(rating => (
              <option key={rating} value={rating}>{rating}</option>
            ))}
          </select>
        </div>

        {/* Insurance Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insurance Status
          </label>
          <select
            value={filters.insuranceStatus}
            onChange={(e) => updateFilter('insuranceStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {INSURANCE_STATUS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Default</option>
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}