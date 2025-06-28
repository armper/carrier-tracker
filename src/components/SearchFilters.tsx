'use client'

interface SearchFiltersProps {
  filters: {
    state: string
    safetyRating: string
    insuranceStatus: string
    sortBy: string
  }
  onFilterChange: (filters: {
    state: string
    safetyRating: string
    insuranceStatus: string
    sortBy: string
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
  const updateFilter = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '')

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