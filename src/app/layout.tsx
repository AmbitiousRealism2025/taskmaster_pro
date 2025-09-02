import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { QueryProvider } from '@/components/providers/query-client-provider'
import { inter } from '@/lib/fonts'
import { reportWebVital } from '@/lib/config/performance'
import { initWebVitals, observeLongTasks, observeResourceTiming } from '@/lib/performance/web-vitals'
import { initCoreWebVitalsOptimizations } from '@/lib/performance/web-vitals-optimization'
import { initPerformanceMonitoring, performanceMonitor } from '@/lib/performance/monitoring'
import { initCaching } from '@/lib/performance/caching'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator'
import { PWAProvider } from '@/components/providers/pwa-provider'
import { PerformanceProvider } from '@/components/providers/performance-provider'

export const metadata: Metadata = {
  title: 'TaskMaster Pro',
  description: 'Full-stack productivity suite for solopreneurs featuring unified task management, project tracking, habit formation, focus sessions, and analytics',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TaskMaster Pro'
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    title: 'TaskMaster Pro',
    description: 'Your intelligent productivity companion',
    type: 'website',
    siteName: 'TaskMaster Pro',
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskMaster Pro',
    description: 'Your intelligent productivity companion'
  },
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <PWAProvider>
          <PerformanceProvider>
            <QueryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <AuthProvider>
                  {children}
                  <InstallPrompt />
                  <OfflineIndicator />
                </AuthProvider>
              </ThemeProvider>
            </QueryProvider>
          </PerformanceProvider>
        </PWAProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize Core Web Vitals optimizations immediately
              if (typeof window !== 'undefined') {
                import('/lib/performance/web-vitals-optimization.js').then(module => {
                  module.initCoreWebVitalsOptimizations()
                  module.monitorCoreWebVitals()
                })
              }
            `
          }}
        />
      </body>
    </html>
  )
}