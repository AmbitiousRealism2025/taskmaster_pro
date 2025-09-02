'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { HabitProductivityCorrelation } from '@/types/habit'

interface ProductivityCorrelationChartProps {
  data: HabitProductivityCorrelation[]
  className?: string
}

export function ProductivityCorrelationChart({ 
  data, 
  className = '' 
}: ProductivityCorrelationChartProps) {
  // Sort by correlation strength
  const sortedData = [...data].sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  const getBarColor = (correlation: number, impact: string) => {
    if (impact === 'NEGATIVE') return '#ef4444' // Red for negative impact
    if (correlation > 0.3) return '#10b981' // Green for high positive
    if (correlation > 0.15) return '#3b82f6' // Blue for medium positive
    if (correlation > 0) return '#6366f1' // Indigo for low positive
    return '#6b7280' // Gray for minimal correlation
  }

  const getImpactBadge = (impact: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
    switch (impact) {
      case 'HIGH':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
      case 'MEDIUM':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'LOW':
        return `${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200`
      case 'NEGATIVE':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return '↗️'
      case 'DECLINING':
        return '↘️'
      case 'STABLE':
        return '➡️'
      default:
        return '➡️'
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {data.habitName}
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Correlation:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {(data.correlation * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Impact:</span>
              <span className={getImpactBadge(data.impact)}>
                {data.impact}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Confidence:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {(data.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Trend:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {getTrendIcon(data.trend)} {data.trend}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">Sample Size:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {data.sampleSize} days
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {data.correlation > 0 
                ? 'This habit correlates with higher productivity'
                : 'This habit may need attention for productivity'
              }
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const chartData = sortedData.map(item => ({
    ...item,
    correlationPercent: item.correlation * 100,
    displayName: item.habitName.length > 15 
      ? item.habitName.substring(0, 15) + '...' 
      : item.habitName
  }))

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Habit-Productivity Correlations
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          How each habit affects your overall productivity
        </p>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">High Impact (+30%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Medium Impact (+15%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-indigo-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Low Impact (+5%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Negative Impact</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            type="number"
            domain={[-50, 50]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `${value}%`}
          />
          
          <YAxis
            type="category"
            dataKey="displayName"
            width={120}
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar dataKey="correlationPercent" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.correlation, entry.impact)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top insights summary */}
      {sortedData.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Key Insights
          </h4>
          <div className="space-y-2">
            {sortedData.slice(0, 2).map((habit, index) => (
              <div key={habit.habitId} className="flex items-start space-x-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  {index + 1}.
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{habit.habitName}</span> shows{' '}
                  <span className={habit.correlation > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {habit.correlation > 0 ? 'positive' : 'negative'}
                  </span>{' '}
                  correlation ({(Math.abs(habit.correlation) * 100).toFixed(1)}%) with productivity
                  {habit.trend !== 'STABLE' && (
                    <span className="ml-1">
                      and is {habit.trend.toLowerCase()} {getTrendIcon(habit.trend)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}