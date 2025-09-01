'use client'

import React from 'react'
import { FocusTimer } from '@/components/focus/FocusTimer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFocusSessions, useFocusSettings } from '@/hooks/use-focus'
import { formatDistanceToNow } from 'date-fns'
import { Clock, CheckCircle, Calendar, TrendingUp } from 'lucide-react'

export default function FocusPage() {
  const { data: sessions, isLoading: sessionsLoading } = useFocusSessions()
  const { data: settings, isLoading: settingsLoading } = useFocusSettings()

  const recentSessions = sessions?.slice(0, 5) || []
  const completedToday = sessions?.filter((session: any) => 
    session.status === 'COMPLETED' && 
    new Date(session.startTime).toDateString() === new Date().toDateString()
  ).length || 0

  const totalFocusTime = sessions?.reduce((total: number, session: any) => 
    session.status === 'COMPLETED' ? total + session.actualFocusTime : total, 0
  ) || 0

  const avgSessionLength = sessions && sessions.length > 0 
    ? Math.round(totalFocusTime / sessions.filter((s: any) => s.status === 'COMPLETED').length) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Focus Mode</h1>
        <p className="text-muted-foreground">
          Enter distraction-free focus sessions with Pomodoro and custom timers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2">
          <FocusTimer />
        </div>

        {/* Stats */}
        <div className="space-y-6">
          {/* Today's Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="text-sm font-medium">Today</div>
                </div>
                <div className="text-2xl font-bold mt-1">{completedToday}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div className="text-sm font-medium">Average</div>
                </div>
                <div className="text-2xl font-bold mt-1">{avgSessionLength}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </CardContent>
            </Card>
          </div>

          {/* Total Focus Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium">Total Focus Time</div>
              </div>
              <div className="text-3xl font-bold">
                {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
              </div>
              <div className="text-xs text-muted-foreground">
                Across {sessions?.filter((s: any) => s.status === 'COMPLETED').length || 0} sessions
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessionsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading sessions...</div>
              ) : recentSessions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No sessions yet</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {recentSessions.map((session: any) => (
                    <div key={session.id} className="px-4 py-2 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={session.status === 'COMPLETED' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {session.type}
                            </Badge>
                            <span className="text-sm font-medium">
                              {session.duration}m
                            </span>
                          </div>
                          {session.taskTitle && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {session.taskTitle}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}