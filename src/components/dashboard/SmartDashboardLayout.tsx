'use client'

import { useState, useMemo } from 'react'
import { AnalyticsData } from '@/lib/analytics'

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

interface SavedCarrier {
  id: string
  notes: string | null
  created_at: string
  tags?: string[]
  priority?: 'high' | 'medium' | 'low'
  last_contacted?: string | null
  updated_at?: string
  carriers: Carrier
}

interface SmartDashboardLayoutProps {
  carriers: SavedCarrier[]
  analytics: AnalyticsData
  selectedCarriers: Set<string>
  children: React.ReactNode
  onFilterChange: (filters: DashboardFilters) => void
  onViewChange: (view: 'compact' | 'detailed') => void
}

interface DashboardFilters {
  search: string
  riskLevel: 'all' | 'high' | 'medium' | 'low'
  priority: 'all' | 'high' | 'medium' | 'low'
  compliance: 'all' | 'compliant' | 'non-compliant' | 'partial'
  tags: string[]
  sortBy: 'name' | 'added' | 'updated' | 'priority' | 'risk'
  groupBy: 'none' | 'risk' | 'priority' | 'status'
}

export default function SmartDashboardLayout({ 
  carriers, 
  analytics, 
  selectedCarriers,
  children,
  onFilterChange,
  onViewChange 
}: SmartDashboardLayoutProps) {
  const [filters, setFilters] = useState<DashboardFilters>({
    search: '',
    riskLevel: 'all',
    priority: 'all',
    compliance: 'all',
    tags: [],
    sortBy: 'risk',
    groupBy: 'risk'
  })
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed')
  const [showFilters, setShowFilters] = useState(false)

  // Smart filter presets for freight brokers
  const filterPresets = [
    { 
      label: 'Needs Attention', 
      icon: '⚠️',
      filters: { riskLevel: 'high' as const, compliance: 'non-compliant' as const },
      description: 'High risk or non-compliant carriers'
    },
    { 
      label: 'Recently Added', 
      icon: '🆕',
      filters: { sortBy: 'added' as const },
      description: 'Newest carriers in your portfolio'
    },
    { 
      label: 'High Priority', 
      icon: '🔥',
      filters: { priority: 'high' as const },
      description: 'Your high priority carriers'
    },
    { 
      label: 'Need Contact', 
      icon: '📞',
      filters: { sortBy: 'updated' as const },
      description: 'Carriers needing follow-up'
    }
  ]

  const updateFilters = (newFilters: Partial<DashboardFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const applyPreset = (preset: typeof filterPresets[0]) => {
    updateFilters(preset.filters)
  }

  const clearFilters = () => {
    const defaultFilters: DashboardFilters = {
      search: '',
      riskLevel: 'all',
      priority: 'all',
      compliance: 'all',
      tags: [],
      sortBy: 'risk',
      groupBy: 'risk'
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  // Quick stats for freight broker workflow
  const quickStats = useMemo(() => {
    const needsAttention = carriers.filter(c => {
      const rating = c.carriers.safety_rating?.toLowerCase()
      const insurance = c.carriers.insurance_status === 'Active'
      const authority = c.carriers.authority_status === 'Active'
      return rating === 'unsatisfactory' || !insurance || !authority || c.priority === 'high'
    }).length

    const recentlyAdded = carriers.filter(c => {
      const addedDate = new Date(c.created_at)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return addedDate >= sevenDaysAgo
    }).length

    const highPriority = carriers.filter(c => c.priority === 'high').length

    return { needsAttention, recentlyAdded, highPriority }
  }, [carriers])

  const hasActiveFilters = filters.search || filters.riskLevel !== 'all' || filters.priority !== 'all' || 
                          filters.compliance !== 'all' || filters.tags.length > 0

  return (
    <div className="space-y-6">
      {/* Quick Stats Bar */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{carriers.length}</div>
              <div className="text-xs text-gray-600">Total Carriers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{quickStats.needsAttention}</div>
              <div className="text-xs text-gray-600">Need Attention</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{quickStats.highPriority}</div>
              <div className="text-xs text-gray-600">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{quickStats.recentlyAdded}</div>
              <div className="text-xs text-gray-600">Added This Week</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedCarriers.size > 0 && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedCarriers.size} selected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Filter Presets */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707l-2 2A1 1 0 0111 21v-6.586a1 1 0 00-.293-.707L4.293 7.293A1 1 0 014 6.586V4z" />
              </svg>
              Advanced Filters
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {filterPresets.map((preset, index) => (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
              title={preset.description}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors text-sm"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  placeholder="Search carriers..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Risk Level</label>
                <select
                  value={filters.riskLevel}
                  onChange={(e) => updateFilters({ riskLevel: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => updateFilters({ priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              {/* Compliance */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Compliance</label>
                <select
                  value={filters.compliance}
                  onChange={(e) => updateFilters({ compliance: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="compliant">Fully Compliant</option>
                  <option value="partial">Partial Compliance</option>
                  <option value="non-compliant">Non-Compliant</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sort By */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="risk">Risk Level</option>
                  <option value="name">Company Name</option>
                  <option value="added">Date Added</option>
                  <option value="updated">Last Updated</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              {/* Group By */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={filters.groupBy}
                  onChange={(e) => updateFilters({ groupBy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="none">No Grouping</option>
                  <option value="risk">Risk Level</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {/* View Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">View</label>
                <div className="flex rounded-md border border-gray-300">
                  <button
                    onClick={() => {
                      setViewMode('detailed')
                      onViewChange('detailed')
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-md ${
                      viewMode === 'detailed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Detailed
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('compact')
                      onViewChange('compact')
                    }}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-md border-l ${
                      viewMode === 'compact'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Results Summary */}
      {hasActiveFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              Showing filtered results • {carriers.length} carrier{carriers.length !== 1 ? 's' : ''} match your criteria
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}