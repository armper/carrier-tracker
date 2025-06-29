/**
 * Trust Score Calculation System
 * 
 * Calculates a trust score (0-100) for carrier data based on various factors:
 * - Data source reliability
 * - Verification status
 * - Data freshness
 * - User report history
 * - Completion of data fields
 */

interface CarrierData {
  data_source?: string
  verified?: boolean
  updated_at?: string
  created_at?: string
  legal_name?: string
  dba_name?: string
  physical_address?: string
  phone?: string
  safety_rating?: string
  insurance_status?: string
  authority_status?: string
  vehicle_count?: number | null
}

interface TrustScoreFactors {
  dataSource: number       // 40 points max
  verification: number     // 25 points max  
  dataFreshness: number    // 15 points max
  dataCompleteness: number // 15 points max
  userReports: number      // 5 points max (negative impact)
}

/**
 * Calculate trust score for a carrier
 */
export function calculateTrustScore(
  carrier: CarrierData, 
  reportCount: number = 0
): { score: number; factors: TrustScoreFactors } {
  const factors: TrustScoreFactors = {
    dataSource: 0,
    verification: 0,
    dataFreshness: 0,
    dataCompleteness: 0,
    userReports: 0
  }

  // Factor 1: Data Source (40 points max)
  if (carrier.data_source === 'fmcsa') {
    factors.dataSource = 40 // FMCSA data is highly trusted
  } else if (carrier.data_source === 'manual') {
    factors.dataSource = 25 // Manual data is moderately trusted
  } else {
    factors.dataSource = 15 // Unknown source gets low trust
  }

  // Factor 2: Verification Status (25 points max)
  if (carrier.verified === true) {
    factors.verification = 25
  } else if (carrier.verified === false) {
    factors.verification = 10 // Explicitly unverified gets some points for transparency
  } else {
    factors.verification = 5 // Unknown verification status
  }

  // Factor 3: Data Freshness (15 points max)
  const lastUpdate = carrier.updated_at || carrier.created_at
  if (lastUpdate) {
    const hoursOld = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60)
    
    if (hoursOld < 24) {
      factors.dataFreshness = 15 // Very fresh (< 1 day)
    } else if (hoursOld < 168) { // 7 days
      factors.dataFreshness = 12 // Fresh (< 1 week)
    } else if (hoursOld < 720) { // 30 days
      factors.dataFreshness = 8 // Moderately fresh (< 1 month)
    } else if (hoursOld < 2160) { // 90 days
      factors.dataFreshness = 4 // Stale (< 3 months)
    } else {
      factors.dataFreshness = 1 // Very stale (> 3 months)
    }
  } else {
    factors.dataFreshness = 3 // No timestamp available
  }

  // Factor 4: Data Completeness (15 points max)
  const requiredFields = [
    carrier.legal_name,
    carrier.safety_rating,
    carrier.insurance_status,
    carrier.authority_status
  ]
  
  const optionalFields = [
    carrier.dba_name,
    carrier.physical_address,
    carrier.phone,
    carrier.vehicle_count
  ]

  const requiredComplete = requiredFields.filter(field => field && field !== '').length
  const optionalComplete = optionalFields.filter(field => field && field !== null && field !== '').length
  
  // Required fields are worth more
  const requiredScore = (requiredComplete / requiredFields.length) * 10
  const optionalScore = (optionalComplete / optionalFields.length) * 5
  
  factors.dataCompleteness = Math.round(requiredScore + optionalScore)

  // Factor 5: User Reports (5 points deduction max)
  // Each unresolved report reduces trust score
  if (reportCount > 0) {
    factors.userReports = -Math.min(reportCount * 1, 5)
  }

  // Calculate final score
  const totalScore = Math.max(0, Math.min(100, 
    factors.dataSource + 
    factors.verification + 
    factors.dataFreshness + 
    factors.dataCompleteness + 
    factors.userReports
  ))

  return {
    score: Math.round(totalScore),
    factors
  }
}

/**
 * Get trust score color class for UI
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get trust score background color class for badges
 */
export function getTrustScoreBadgeColor(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800'
  if (score >= 70) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

/**
 * Get trust score description
 */
export function getTrustScoreDescription(score: number): string {
  if (score >= 90) return 'Highly Trusted'
  if (score >= 70) return 'Moderately Trusted'
  if (score >= 50) return 'Basic Trust'
  return 'Low Trust'
}

/**
 * Batch calculate trust scores for multiple carriers
 */
export function calculateTrustScores(
  carriers: CarrierData[],
  reportCounts: Record<string, number> = {}
): Array<{ carrier: CarrierData; trustScore: number; factors: TrustScoreFactors }> {
  return carriers.map((carrier: CarrierData & { id?: string }) => {
    const reportCount = reportCounts[carrier.id] || 0
    const { score, factors } = calculateTrustScore(carrier, reportCount)
    return {
      carrier,
      trustScore: score,
      factors
    }
  })
}

/**
 * Default trust scores by data source (used when detailed calculation isn't needed)
 */
export const DEFAULT_TRUST_SCORES = {
  fmcsa: 95,
  manual: 50,
  unknown: 25
} as const