'use client'

import { AnalyticsData, formatRiskPercentage } from '@/lib/analytics'

interface AnalyticsSummaryProps {
  analytics: AnalyticsData
}

export default function AnalyticsSummary({ analytics }: AnalyticsSummaryProps) {
  const riskTotal = analytics.riskAssessment.highRisk + analytics.riskAssessment.mediumRisk + analytics.riskAssessment.lowRisk

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Carriers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Total Carriers</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.totalCarriers}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">+{analytics.recentActivity.addedThisWeek}</span>
          <span className="text-gray-600 ml-1">this week</span>
        </div>
      </div>

      {/* High Risk Carriers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">High Risk</p>
            <p className="text-3xl font-bold text-red-600">{analytics.riskAssessment.highRisk}</p>
          </div>
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-red-600 font-medium">{formatRiskPercentage(analytics.riskAssessment.highRisk, riskTotal)}</span>
          <span className="text-gray-600 ml-1">of portfolio</span>
        </div>
      </div>

      {/* Compliance Rate */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Fully Compliant</p>
            <p className="text-3xl font-bold text-green-600">
              {analytics.complianceBreakdown.find(c => c.name === 'Fully Compliant')?.value || 0}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">
            {formatRiskPercentage(
              analytics.complianceBreakdown.find(c => c.name === 'Fully Compliant')?.value || 0, 
              analytics.totalCarriers
            )}
          </span>
          <span className="text-gray-600 ml-1">compliance rate</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Added This Month</p>
            <p className="text-3xl font-bold text-blue-600">{analytics.recentActivity.addedThisMonth}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-600">Growth tracking</span>
        </div>
      </div>
    </div>
  )
}