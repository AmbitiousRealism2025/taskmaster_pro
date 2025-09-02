'use client'

/**
 * Performance Monitoring Dashboard Component
 * 
 * Real-time performance metrics visualization and alerting
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  performanceMonitor, 
  PerformanceAlert, 
  PerformanceDashboardData 
} from '@/lib/performance/monitoring'
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  TrendingDown,
  TrendingUp,
  Zap
} from 'lucide-react'

interface PerformanceDashboardProps {
  className?: string
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Subscribe to performance alerts
    const unsubscribe = performanceMonitor.subscribe((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10)) // Keep latest 10 alerts
    })

    // Load initial data
    loadDashboardData()

    // Update dashboard every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)

    return () => {
      unsubscribe && typeof unsubscribe === 'function' && unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      // In a real app, this would fetch from an API
      // For now, we'll use mock data structure
      const mockData: PerformanceDashboardData = {
        webVitals: {
          lcp: { value: 2100, rating: 'good', trend: 'stable' },
          fid: { value: 85, rating: 'good', trend: 'down' },
          cls: { value: 0.08, rating: 'good', trend: 'stable' },
          fcp: { value: 1600, rating: 'good', trend: 'up' },
          ttfb: { value: 650, rating: 'good', trend: 'down' }
        },
        bundleSize: {
          total: 285,
          trend: 'up',
          budget: 300,
          budgetUsed: 95
        },
        alerts: performanceMonitor.getAlerts(),
        recommendations: [
          'Consider lazy loading for dashboard charts',
          'Enable gzip compression for static assets',
          'Optimize image sizes for mobile devices'
        ],
        lastUpdated: new Date().toISOString()
      }
      
      setDashboardData(mockData)
      setAlerts(performanceMonitor.getAlerts())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resolveAlert = (alertId: string) => {
    performanceMonitor.resolveAlert(alertId)
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const getSeverityColor = (severity: PerformanceAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600'
      case 'needs-improvement': return 'text-yellow-600'  
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'stable': return <Activity className="h-4 w-4 text-blue-600" />
    }
  }

  const formatMetricValue = (metric: string, value: number) => {
    switch (metric.toUpperCase()) {
      case 'CLS':
        return value.toFixed(3)
      case 'FCP':
      case 'FID':
      case 'LCP':  
      case 'TTFB':
        return `${Math.round(value)}ms`
      default:
        return value.toString()
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Failed to load performance data</p>
        <Button onClick={loadDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
        <Badge variant="outline" className="text-xs">
          Last updated: {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(dashboardData.webVitals).map(([key, data]) => (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium uppercase">
                    {key}
                  </CardTitle>
                  {getTrendIcon(data.trend)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatMetricValue(key, data.value)}
                  </div>
                  <p className={`text-xs ${getRatingColor(data.rating)}`}>
                    {data.rating}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Bundle Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: {dashboardData.bundleSize.total}KB</span>
                    <span>Budget: {dashboardData.bundleSize.budget}KB</span>
                  </div>
                  <Progress 
                    value={dashboardData.bundleSize.budgetUsed} 
                    className="h-2"
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {getTrendIcon(dashboardData.bundleSize.trend)}
                    <span>{dashboardData.bundleSize.budgetUsed}% of budget used</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Alerts</span>
                    <Badge variant={alerts.length > 0 ? 'destructive' : 'default'}>
                      {alerts.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Rating</span>
                    <Badge variant="default" className="text-green-600 bg-green-50">
                      Good
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="web-vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(dashboardData.webVitals).map(([key, data]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="uppercase">{key}</span>
                    <Badge className={getRatingColor(data.rating)}>
                      {data.rating}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {formatMetricValue(key, data.value)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getTrendIcon(data.trend)}
                    <span>Trend: {data.trend}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bundle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Analysis</CardTitle>
              <CardDescription>
                Monitor bundle size and performance budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {dashboardData.bundleSize.total}KB
                    </div>
                    <div className="text-sm text-gray-500">Total bundle size</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium">
                      {dashboardData.bundleSize.budgetUsed}%
                    </div>
                    <div className="text-sm text-gray-500">Budget used</div>
                  </div>
                </div>
                
                <Progress 
                  value={dashboardData.bundleSize.budgetUsed} 
                  className="h-3"
                />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Budget:</span>
                    <span className="ml-2 font-medium">{dashboardData.bundleSize.budget}KB</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining:</span>
                    <span className="ml-2 font-medium">
                      {dashboardData.bundleSize.budget - dashboardData.bundleSize.total}KB
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Active Alerts</h3>
                  <p className="text-gray-500">Your application is performing well!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex justify-between items-start flex-1">
                    <div>
                      <AlertTitle className="flex items-center gap-2">
                        {alert.message}
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        Value: {Math.round(alert.value)} | Threshold: {Math.round(alert.threshold)}
                        {alert.url && (
                          <span className="block text-xs text-gray-500 mt-1">
                            URL: {alert.url}
                          </span>
                        )}
                        <span className="block text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </AlertDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {dashboardData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dashboardData.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}