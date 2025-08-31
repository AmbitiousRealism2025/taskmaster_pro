import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { inter } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'TaskMaster Pro',
  description: 'Full-stack productivity suite for solopreneurs featuring unified task management, project tracking, habit formation, focus sessions, and analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}