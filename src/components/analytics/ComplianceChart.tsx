'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AnalyticsData } from '@/lib/analytics'

interface ComplianceChartProps {
  analytics: AnalyticsData
}

export default function ComplianceChart({ analytics }: ComplianceChartProps) {
  if (analytics.complianceBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No data to display</p>
            <p className="text-sm">Add carriers to see analytics</p>
          </div>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} carrier{data.value !== 1 ? 's' : ''} ({Math.round((data.value / analytics.totalCarriers) * 100)}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Prepare data for bar chart
  const chartData = analytics.complianceBreakdown.map(item => ({
    ...item,
    percentage: Math.round((item.value / analytics.totalCarriers) * 100)
  }))

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              fontSize={12}
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              fontSize={12}
              tick={{ fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Bar key={`bar-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Status Legend */}
      <div className="mt-4 grid grid-cols-1 gap-2">
        {analytics.complianceBreakdown.map((entry, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700">{entry.name}</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {entry.value} ({Math.round((entry.value / analytics.totalCarriers) * 100)}%)
            </span>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600 mb-1">Quick Insight:</p>
        <p className="text-sm text-gray-800">
          {analytics.complianceBreakdown.find(c => c.name === 'Fully Compliant')?.value || 0 > analytics.totalCarriers * 0.7 
            ? '🟢 Strong compliance portfolio - most carriers are fully compliant'
            : analytics.complianceBreakdown.find(c => c.name === 'Non-Compliant')?.value || 0 > analytics.totalCarriers * 0.3
            ? '🔴 High risk portfolio - significant non-compliance issues'
            : '🟡 Mixed compliance - monitor partial compliance carriers closely'
          }
        </p>
      </div>
    </div>
  )
}