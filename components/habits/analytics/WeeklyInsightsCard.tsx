'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { WeeklyInsights, TimeProductivityData } from '@/types/habit'

interface WeeklyInsightsCardProps {
  insights: WeeklyInsights
  timeProductivity: TimeProductivityData[]
  className?: string
}

export function WeeklyInsightsCard({ 
  insights, 
  timeProductivity, 
  className = '' 
}: WeeklyInsightsCardProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return { icon: '📈', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' }
      case 'DECLINING':
        return { icon: '📉', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
      case 'STABLE':
        return { icon: '➡️', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' }
      default:
        return { icon: '📊', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20' }
    }
  }

  const trendDisplay = getTrendIcon(insights.productivityTrend)

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}${period}`
  }

  // Prepare chart data for time productivity
  const chartData = timeProductivity.map(tp => ({
    hour: formatHour(tp.hour),
    hourNum: tp.hour,
    productivity: Math.round(tp.productivity * 100),
    focusMinutes: tp.focusMinutes,
    taskCount: tp.taskCount,
    habitCompletions: tp.habitCompletions
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Productivity: <span className="font-medium text-blue-600">{data.productivity}%</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Focus: <span className="font-medium text-green-600">{data.focusMinutes}m</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tasks: <span className="font-medium text-purple-600">{data.taskCount}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Habits: <span className="font-medium text-orange-600">{data.habitCompletions}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Weekly Insights
        </h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${trendDisplay.bg} ${trendDisplay.color}`}>
          <span className="mr-2">{trendDisplay.icon}</span>
          Trend: {insights.productivityTrend.toLowerCase()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatHour(insights.peakHour)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Peak Hour</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {insights.averageFocusSession}m
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Focus</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {insights.recommendedFocusTime.split('-')[0]}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Best Window</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {Math.round(insights.confidence * 100)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
        </div>
      </div>

      {/* Time Productivity Chart */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Daily Productivity Pattern
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
              interval={2}
            />
            
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              stroke="#6b7280"
              tickFormatter={(value) => `${value}%`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="productivity"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#productivityGradient)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Low Energy Period Alert */}
      {insights.lowEnergyPeriod !== 'None identified' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
          <div className="flex items-start">
            <div className="text-yellow-600 dark:text-yellow-400 mr-2">⚡</div>
            <div>
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Low Energy Period Detected
              </h5>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Consider avoiding demanding tasks during {insights.lowEnergyPeriod}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights */}
      {insights.keyInsights.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Key Insights
          </h4>
          <div className="space-y-2">
            {insights.keyInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      {insights.actionableRecommendations.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            💡 Recommendations
          </h4>
          <div className="space-y-3">
            {insights.actionableRecommendations.map((recommendation, index) => (
              <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-start">
                  <div className="text-green-600 dark:text-green-400 mr-2 mt-0.5">
                    {index + 1}.
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-200 flex-1">
                    {recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}