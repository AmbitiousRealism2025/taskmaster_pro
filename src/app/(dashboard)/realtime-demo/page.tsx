'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RealtimeTaskList } from '@/components/tasks/RealtimeTaskList'
import { useRealtime, usePresence } from '@/components/providers/realtime-provider'
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor'
import { Task } from '@/types/task'
import { 
  Activity, 
  Users, 
  Wifi, 
  WifiOff, 
  Clock, 
  Database,
  Zap,
  MemoryStick
} from 'lucide-react'

// Mock tasks for demonstration
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement real-time updates',
    description: 'Add WebSocket integration for live task updates across all connected clients',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: new Date('2025-01-20'),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1'
  },
  {
    id: '2', 
    title: 'Optimize performance monitoring',
    description: 'Track render times and memory usage for better user experience',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date('2025-01-25'),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1'
  },
  {
    id: '3',
    title: 'Add virtual scrolling',
    description: 'Implement virtual scrolling for large task lists to improve performance',
    status: 'DONE',
    priority: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1'
  }
]

export default function RealtimeDemoPage() {
  const [simulationRunning, setSimulationRunning] = useState(false)
  const { 
    isConnected, 
    sendEvent, 
    getOfflineQueueLength, 
    connectionStatus,
    metrics: realtimeMetrics 
  } = useRealtime()
  const { onlineUsers, awayUsers, totalUsers } = usePresence()
  const { metrics, clearMetrics } = usePerformanceMonitor('RealtimeDemoPage')

  // Simulate real-time events for demo
  const startSimulation = () => {
    if (simulationRunning) return
    
    setSimulationRunning(true)
    
    const simulationInterval = setInterval(() => {
      const randomTask = mockTasks[Math.floor(Math.random() * mockTasks.length)]
      const statuses = ['TODO', 'IN_PROGRESS', 'DONE']
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
      
      // Simulate task status change
      sendEvent('TASK_STATUS_CHANGED', {
        ...randomTask,
        status: newStatus,
        updatedAt: new Date()
      })
    }, 3000) // Every 3 seconds
    
    // Stop simulation after 30 seconds
    setTimeout(() => {
      clearInterval(simulationInterval)
      setSimulationRunning(false)
    }, 30000)
  }

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-emerald-600'
      case 'connecting':
        return 'text-amber-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Real-time Demo</h1>
          <p className="text-slate-600 mt-2">
            Demonstrating real-time updates, state orchestration, and performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-emerald-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm font-medium ${getConnectionStatusColor(connectionStatus)}`}>
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Real-time metrics dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realtimeMetrics.latency.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Online</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {awayUsers.length} away, {totalUsers} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.memoryUsage.toFixed(1)}MB
            </div>
            <p className="text-xs text-muted-foreground">
              JS heap size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Queue</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getOfflineQueueLength()}</div>
            <p className="text-xs text-muted-foreground">
              Pending sync
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Render Time</div>
              <div className="text-xl font-semibold">
                {metrics.renderTime.toFixed(1)}ms
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Query Count</div>
              <div className="text-xl font-semibold">{metrics.queryCount}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Cache Hit Rate</div>
              <div className="text-xl font-semibold">
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Network Requests</div>
              <div className="text-xl font-semibold">{metrics.networkRequests}</div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearMetrics}
            >
              Clear Metrics
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={startSimulation}
              disabled={simulationRunning}
            >
              {simulationRunning ? 'Simulation Running...' : 'Start Demo Simulation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection status details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status</span>
              <Badge 
                variant={isConnected ? "default" : "secondary"}
                className={isConnected ? "bg-emerald-100 text-emerald-700" : ""}
              >
                {connectionStatus}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Latency</span>
              <span className="font-medium">{realtimeMetrics.latency.toFixed(0)}ms</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Reconnect Count</span>
              <span className="font-medium">{realtimeMetrics.reconnectCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Packets Lost</span>
              <span className="font-medium">{realtimeMetrics.packetsLost}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Online</span>
                <Badge className="bg-emerald-100 text-emerald-700">
                  {onlineUsers.length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Away</span>
                <Badge className="bg-amber-100 text-amber-700">
                  {awayUsers.length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Sessions</span>
                <Badge variant="outline">{totalUsers}</Badge>
              </div>
              
              {simulationRunning && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">
                      Demo simulation running...
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Random task updates every 3 seconds
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time task list */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Task List</CardTitle>
          <p className="text-sm text-slate-600">
            Tasks update in real-time across all connected clients with optimistic updates
          </p>
        </CardHeader>
        <CardContent>
          <RealtimeTaskList 
            initialTasks={mockTasks}
            onTaskUpdate={(task) => {
              console.log('Task updated:', task)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}