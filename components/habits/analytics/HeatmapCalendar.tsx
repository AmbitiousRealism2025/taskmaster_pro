'use client'

import React, { useMemo } from 'react'
import { HabitEntry } from '@/types/habit'

interface HeatmapCalendarProps {
  entries: HabitEntry[]
  year?: number
  className?: string
  onDateClick?: (date: string) => void
}

interface CalendarData {
  date: string
  completed: boolean
  value?: number
  dayOfYear: number
  month: number
  weekday: number
}

export function HeatmapCalendar({ 
  entries, 
  year = new Date().getFullYear(),
  className = '',
  onDateClick 
}: HeatmapCalendarProps) {
  const calendarData = useMemo(() => {
    const data: CalendarData[] = []
    const startDate = new Date(year, 0, 1) // January 1st of the year
    const endDate = new Date(year, 11, 31) // December 31st of the year
    
    // Create a map of entries for quick lookup
    const entriesMap = new Map(entries.map(entry => [entry.date, entry]))
    
    // Generate all dates in the year
    const current = new Date(startDate)
    let dayOfYear = 1
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const entry = entriesMap.get(dateStr)
      
      data.push({
        date: dateStr,
        completed: entry?.completed || false,
        value: entry?.value,
        dayOfYear,
        month: current.getMonth(),
        weekday: current.getDay()
      })
      
      current.setDate(current.getDate() + 1)
      dayOfYear++
    }
    
    return data
  }, [entries, year])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = calendarData.length
    const completed = calendarData.filter(d => d.completed).length
    const completionRate = total > 0 ? (completed / total) * 100 : 0
    
    // Calculate current streak
    let currentStreak = 0
    for (let i = calendarData.length - 1; i >= 0; i--) {
      if (calendarData[i].completed) {
        currentStreak++
      } else {
        break
      }
    }
    
    // Calculate best streak
    let bestStreak = 0
    let tempStreak = 0
    for (const day of calendarData) {
      if (day.completed) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }
    
    return {
      total,
      completed,
      completionRate,
      currentStreak,
      bestStreak
    }
  }, [calendarData])

  const getIntensityClass = (completed: boolean, value?: number) => {
    if (!completed) {
      return 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
    }
    
    // If there's a value, use it for intensity (assuming 0-100 scale)
    if (value !== undefined) {
      if (value >= 80) return 'bg-green-600 hover:bg-green-700'
      if (value >= 60) return 'bg-green-500 hover:bg-green-600'
      if (value >= 40) return 'bg-green-400 hover:bg-green-500'
      if (value >= 20) return 'bg-green-300 hover:bg-green-400'
      return 'bg-green-200 hover:bg-green-300'
    }
    
    // Default completion color
    return 'bg-green-500 hover:bg-green-600'
  }

  const formatTooltipDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Group data by weeks for proper grid layout
  const weeklyData = useMemo(() => {
    const weeks: CalendarData[][] = []
    let currentWeek: CalendarData[] = []
    
    // Start with empty days if the year doesn't start on Sunday
    const firstDate = calendarData[0]
    if (firstDate) {
      const startWeekday = firstDate.weekday
      for (let i = 0; i < startWeekday; i++) {
        currentWeek.push({
          date: '',
          completed: false,
          dayOfYear: 0,
          month: -1,
          weekday: i
        })
      }
    }
    
    calendarData.forEach((day) => {
      currentWeek.push(day)
      
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })
    
    // Add the final week if it's not empty
    if (currentWeek.length > 0) {
      // Fill remaining days with empty cells
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          completed: false,
          dayOfYear: 0,
          month: -1,
          weekday: currentWeek.length
        })
      }
      weeks.push(currentWeek)
    }
    
    return weeks
  }, [calendarData])

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {year} Activity Calendar
        </h3>
        
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.completionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.completed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Days</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.currentStreak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Current</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.bestStreak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Best</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for weekday labels */}
            <div className="flex-1 grid grid-cols-52 gap-1">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const firstWeekOfMonth = Math.floor(
                  new Date(year, monthIndex, 1).getDate() / 7
                ) + Math.floor(monthIndex * 4.33)
                
                return (
                  <div
                    key={monthIndex}
                    className="text-xs text-gray-600 dark:text-gray-400 text-center"
                    style={{
                      gridColumn: `${Math.floor(firstWeekOfMonth) + 1} / span 4`
                    }}
                  >
                    {monthNames[monthIndex]}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex">
            {/* Weekday labels */}
            <div className="w-8 mr-2">
              {weekDays.filter((_, index) => index % 2 === 1).map((day) => (
                <div
                  key={day}
                  className="h-3 mb-1 text-xs text-gray-600 dark:text-gray-400 flex items-center"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex-1">
              <div className="grid grid-cols-53 gap-1">
                {weeklyData.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`
                          w-3 h-3 rounded-sm cursor-pointer transition-all duration-200 relative group
                          ${day.date ? getIntensityClass(day.completed, day.value) : 'bg-transparent'}
                        `}
                        onClick={() => day.date && onDateClick?.(day.date)}
                        title={
                          day.date 
                            ? `${formatTooltipDate(day.date)} - ${day.completed ? 'Completed' : 'Not completed'}${day.value !== undefined ? ` (${day.value})` : ''}`
                            : undefined
                        }
                      >
                        {/* Tooltip */}
                        {day.date && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            <div>{formatTooltipDate(day.date)}</div>
                            <div>
                              {day.completed ? '✅ Completed' : '❌ Not completed'}
                              {day.value !== undefined && ` (${day.value})`}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}