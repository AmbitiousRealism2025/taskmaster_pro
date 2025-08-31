import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { SideNavigation } from '@/components/navigation/SideNavigation'

// Dynamically import secondary navigation components
const CommandPalette = dynamic(
  () => import('@/components/navigation/CommandPalette').then(mod => ({ default: mod.CommandPalette })),
  { ssr: false }
)

const QuickActions = dynamic(
  () => import('@/components/navigation/QuickActions').then(mod => ({ default: mod.QuickActions })),
  { ssr: false }
)

const Breadcrumbs = dynamic(
  () => import('@/components/navigation/Breadcrumbs').then(mod => ({ default: mod.Breadcrumbs })),
  { ssr: false }
)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation - Fixed header */}
      <TopNavigation />
      
      <div className="flex">
        {/* Sidebar Navigation - Collapsible */}
        <SideNavigation />
        
        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <Suspense fallback={<div className="h-6 mb-6" />}>
              <Breadcrumbs />
            </Suspense>
            
            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
      
      {/* Global Components */}
      <Suspense>
        <CommandPalette />
      </Suspense>
      
      <Suspense>
        <QuickActions />
      </Suspense>
    </div>
  )
}