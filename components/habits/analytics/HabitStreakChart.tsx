'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { HabitChartData } from '@/types/habit'

interface HabitStreakChartProps {
  data: HabitChartData[]
  className?: string
}

export function HabitStreakChart({ data, className = '' }: HabitStreakChartProps) {
  const maxStreak = Math.max(...data.map(d => d.streak), 1)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {data.formattedDate} ({data.dayOfWeek})
          </p>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Status: {data.completed ? (
                <span className="text-green-600 dark:text-green-400">✓ Completed</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">✗ Missed</span>
              )}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Streak: <span className="font-medium">{data.streak} days</span>
            </p>
            {data.value !== undefined && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Value: <span className="font-medium">{data.value}</span>
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload) return null

    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={payload.completed ? '#10b981' : '#ef4444'}
        stroke={payload.completed ? '#059669' : '#dc2626'}
        strokeWidth={2}
        className="opacity-80 hover:opacity-100 transition-opacity"
      />
    )
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Streak Progress
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Missed</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="streakGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            interval="preserveStartEnd"
          />
          
          <YAxis
            domain={[0, maxStreak]}
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            label={{ 
              value: 'Streak Length (days)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Area chart for streak visualization */}
          <Area
            type="monotone"
            dataKey="streak"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#streakGradient)"
            fillOpacity={0.6}
          />
          
          {/* Line with custom dots for completion status */}
          <Line
            type="monotone"
            dataKey="streak"
            stroke="transparent"
            strokeWidth={0}
            dot={<CustomDot />}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Streak statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {data[data.length - 1]?.streak || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Current Streak</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {maxStreak}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Best Streak</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {Math.round((data.filter(d => d.completed).length / data.length) * 100)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
        </div>
      </div>
    </div>
  )
}