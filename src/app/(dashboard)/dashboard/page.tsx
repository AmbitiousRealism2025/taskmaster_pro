'use client'

import React, { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckSquare, Clock, TrendingUp, Users } from 'lucide-react'
import { motion } from 'framer-motion'

// Dashboard skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6" data-testid="dashboard-skeleton">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 h-80 rounded-lg bg-muted animate-pulse" />
        <div className="col-span-3 h-80 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// Mock dashboard data - will be replaced with real data in Phase 2
const dashboardStats = [
  {
    title: 'Total Tasks',
    value: '24',
    change: '+2 from yesterday',
    icon: CheckSquare,
  },
  {
    title: 'In Progress',
    value: '8',
    change: '+1 from yesterday',
    icon: Clock,
  },
  {
    title: 'Completed',
    value: '16',
    change: '+4 from yesterday',
    icon: TrendingUp,
  },
  {
    title: 'Team Members',
    value: '5',
    change: 'No change',
    icon: Users,
  },
]

function DashboardContent() {
  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-teal-600 dark:from-violet-400 dark:to-teal-400">
          Dashboard
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          Welcome back! Here's an overview of your productivity.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
{dashboardStats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold tracking-tight">
                    {stat.title}
                  </CardTitle>
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest tasks and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Task {i + 1}</p>
                  <p className="text-sm text-muted-foreground">
                    Updated 2 hours ago
                  </p>
                </div>
                <Badge variant="secondary">In Progress</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="w-full justify-start" variant="gradient">
                <CheckSquare className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="w-full justify-start" variant="gradient-outline">
                <Users className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="w-full justify-start" variant="outline">
                <Clock className="mr-2 h-5 w-5" />
                Start Timer
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}