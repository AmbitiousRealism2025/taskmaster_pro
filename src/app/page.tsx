'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </main>
    )
  }

  // Show landing page for unauthenticated users
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            TaskMaster Pro
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Full-stack productivity suite for solopreneurs featuring unified task management, 
            project tracking, habit formation, focus sessions, and analytics
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700">
            <Link href="/auth/signin">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">View Demo</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Task Management</h3>
            <p className="text-sm text-muted-foreground">Organize and track your tasks with advanced filtering and progress tracking</p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900 rounded-lg mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Real-time Sync</h3>
            <p className="text-sm text-muted-foreground">Seamless synchronization across all your devices and platforms</p>
          </div>
          
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="text-sm text-muted-foreground">Detailed insights into your productivity patterns and performance metrics</p>
          </div>
        </div>
      </div>
    </main>
  )
}