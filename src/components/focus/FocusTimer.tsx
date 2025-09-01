'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Timer, 
  Coffee,
  Brain,
  Zap
} from 'lucide-react'
import { useFocusStore } from '@/stores/focusStore'
import { FocusType } from '@/types/focus'
import { cn } from '@/lib/utils'

interface FocusTimerProps {
  className?: string
}

export function FocusTimer({ className }: FocusTimerProps) {
  const {
    currentSession,
    timerState,
    focusSettings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setShowSettings,
    initWorker,
    destroyWorker
  } = useFocusStore()

  // Initialize worker on mount
  React.useEffect(() => {
    initWorker()
    return () => {
      destroyWorker()
    }
  }, [initWorker, destroyWorker])

  // Request notification permission
  React.useEffect(() => {
    if (focusSettings.enableNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [focusSettings.enableNotifications])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = (): number => {
    if (!currentSession) return 0
    const totalSeconds = currentSession.duration * 60
    const elapsed = totalSeconds - timerState.timeRemaining
    return (elapsed / totalSeconds) * 100
  }

  const getPhaseIcon = () => {
    switch (timerState.currentPhase) {
      case 'FOCUS':
        return <Brain className="h-5 w-5" />
      case 'SHORT_BREAK':
      case 'LONG_BREAK':
        return <Coffee className="h-5 w-5" />
      default:
        return <Timer className="h-5 w-5" />
    }
  }

  const getPhaseColor = () => {
    switch (timerState.currentPhase) {
      case 'FOCUS':
        return 'text-blue-600'
      case 'SHORT_BREAK':
        return 'text-green-600'
      case 'LONG_BREAK':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleStartPomodoro = () => {
    startTimer('POMODORO', focusSettings.defaultFocusDuration)
  }

  const handleStartCustom = (duration: number) => {
    startTimer('CUSTOM', duration)
  }

  const handleStartDeepWork = () => {
    startTimer('DEEP_WORK', 90) // 1.5 hours
  }

  if (!currentSession && !timerState.isRunning) {
    // Timer selection screen
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Focus Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pomodoro */}
            <Button
              onClick={handleStartPomodoro}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Timer className="h-6 w-6 text-red-500" />
              <div className="text-center">
                <div className="font-medium">Pomodoro</div>
                <div className="text-xs text-muted-foreground">
                  {focusSettings.defaultFocusDuration} min
                </div>
              </div>
            </Button>

            {/* Short Focus */}
            <Button
              onClick={() => handleStartCustom(15)}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Zap className="h-6 w-6 text-yellow-500" />
              <div className="text-center">
                <div className="font-medium">Quick Focus</div>
                <div className="text-xs text-muted-foreground">15 min</div>
              </div>
            </Button>

            {/* Long Focus */}
            <Button
              onClick={() => handleStartCustom(45)}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Brain className="h-6 w-6 text-blue-500" />
              <div className="text-center">
                <div className="font-medium">Long Focus</div>
                <div className="text-xs text-muted-foreground">45 min</div>
              </div>
            </Button>

            {/* Deep Work */}
            <Button
              onClick={handleStartDeepWork}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <Coffee className="h-6 w-6 text-purple-500" />
              <div className="text-center">
                <div className="font-medium">Deep Work</div>
                <div className="text-xs text-muted-foreground">90 min</div>
              </div>
            </Button>
          </div>

          {/* Custom Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Duration</label>
            <div className="flex gap-2">
              {[10, 30, 60, 120].map((minutes) => (
                <Button
                  key={minutes}
                  onClick={() => handleStartCustom(minutes)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <Button
            onClick={() => setShowSettings(true)}
            variant="ghost"
            className="w-full"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Active timer screen
  return (
    <Card className={cn('text-center', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={getPhaseColor()}>
            {getPhaseIcon()}
            <span className="ml-2">
              {timerState.currentPhase === 'FOCUS' ? 'Focus Time' : 
               timerState.currentPhase === 'SHORT_BREAK' ? 'Short Break' : 
               'Long Break'}
            </span>
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="space-y-4">
          <div className="text-6xl font-mono font-bold tracking-tight">
            {formatTime(timerState.timeRemaining)}
          </div>
          
          <Progress 
            value={getProgressPercentage()} 
            className="h-3"
          />
          
          <div className="text-sm text-muted-foreground">
            Session {timerState.sessionCount + 1} • {currentSession?.type}
            {currentSession?.duration && ` (${currentSession.duration}m)`}
          </div>
        </div>

        {/* Session Info */}
        {currentSession?.taskTitle && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">Working on:</div>
            <div className="text-sm text-muted-foreground">
              {currentSession.taskTitle}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {timerState.isRunning ? (
            <Button
              onClick={pauseTimer}
              variant="outline"
              size="lg"
              className="rounded-full w-16 h-16"
            >
              <Pause className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              onClick={resumeTimer}
              variant="default"
              size="lg"
              className="rounded-full w-16 h-16"
            >
              <Play className="h-6 w-6" />
            </Button>
          )}
          
          <Button
            onClick={stopTimer}
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
          >
            <Square className="h-5 w-5" />
          </Button>
        </div>

        {/* Status */}
        <div className="text-sm text-muted-foreground">
          {timerState.isPaused && 'Paused'}
          {timerState.isRunning && 'Running'}
          {!timerState.isRunning && !timerState.isPaused && 'Ready'}
        </div>
      </CardContent>
    </Card>
  )
}