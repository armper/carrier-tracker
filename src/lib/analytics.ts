// Analytics utilities for dashboard insights
// Processes saved carrier data to generate visual analytics

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

export interface AnalyticsData {
  totalCarriers: number
  safetyRatingDistribution: Array<{ name: string; value: number; color: string }>
  complianceBreakdown: Array<{ name: string; value: number; color: string }>
  priorityDistribution: Array<{ name: string; value: number; color: string }>
  riskAssessment: {
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
  recentActivity: {
    addedThisWeek: number
    addedThisMonth: number
  }
}

export function processAnalyticsData(savedCarriers: SavedCarrier[]): AnalyticsData {
  const totalCarriers = savedCarriers.length

  // Safety Rating Distribution
  const safetyRatings = savedCarriers.reduce((acc, sc) => {
    const rating = sc.carriers.safety_rating || 'Unknown'
    acc[rating] = (acc[rating] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const safetyRatingDistribution = Object.entries(safetyRatings).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: getSafetyRatingColor(name)
  }))

  // Compliance Breakdown (Insurance + Authority)
  const complianceData = savedCarriers.reduce((acc, sc) => {
    const insurance = sc.carriers.insurance_status === 'Active'
    const authority = sc.carriers.authority_status === 'Active'
    
    if (insurance && authority) {
      acc.fullCompliance = (acc.fullCompliance || 0) + 1
    } else if (insurance || authority) {
      acc.partialCompliance = (acc.partialCompliance || 0) + 1
    } else {
      acc.nonCompliant = (acc.nonCompliant || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const complianceBreakdown = [
    { name: 'Fully Compliant', value: complianceData.fullCompliance || 0, color: '#10b981' },
    { name: 'Partial Compliance', value: complianceData.partialCompliance || 0, color: '#f59e0b' },
    { name: 'Non-Compliant', value: complianceData.nonCompliant || 0, color: '#ef4444' }
  ].filter(item => item.value > 0)

  // Priority Distribution
  const priorities = savedCarriers.reduce((acc, sc) => {
    const priority = sc.priority || 'medium'
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const priorityDistribution = Object.entries(priorities).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: getPriorityColor(name as 'high' | 'medium' | 'low')
  }))

  // Risk Assessment
  const riskAssessment = savedCarriers.reduce((acc, sc) => {
    const rating = sc.carriers.safety_rating?.toLowerCase()
    const insurance = sc.carriers.insurance_status === 'Active'
    const authority = sc.carriers.authority_status === 'Active'
    const priority = sc.priority || 'medium'

    // Calculate risk based on multiple factors
    let riskLevel = 'lowRisk'
    
    if (rating === 'unsatisfactory' || (!insurance && !authority) || priority === 'high') {
      riskLevel = 'highRisk'
    } else if (rating === 'conditional' || !insurance || !authority || priority === 'medium') {
      riskLevel = 'mediumRisk'
    }

    acc[riskLevel as keyof typeof acc] = (acc[riskLevel as keyof typeof acc] || 0) + 1
    return acc
  }, { highRisk: 0, mediumRisk: 0, lowRisk: 0 })

  // Recent Activity
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentActivity = savedCarriers.reduce((acc, sc) => {
    const createdAt = new Date(sc.created_at)
    if (createdAt >= oneWeekAgo) {
      acc.addedThisWeek++
    }
    if (createdAt >= oneMonthAgo) {
      acc.addedThisMonth++
    }
    return acc
  }, { addedThisWeek: 0, addedThisMonth: 0 })

  return {
    totalCarriers,
    safetyRatingDistribution,
    complianceBreakdown,
    priorityDistribution,
    riskAssessment,
    recentActivity
  }
}

function getSafetyRatingColor(rating: string | null): string {
  if (!rating) return '#6b7280' // gray
  
  switch (rating.toLowerCase()) {
    case 'satisfactory':
      return '#10b981' // green
    case 'conditional':
      return '#f59e0b' // yellow
    case 'unsatisfactory':
      return '#ef4444' // red
    default:
      return '#6b7280' // gray
  }
}

function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return '#ef4444' // red
    case 'medium':
      return '#f59e0b' // yellow
    case 'low':
      return '#10b981' // green
    default:
      return '#6b7280' // gray
  }
}

export function formatRiskPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}