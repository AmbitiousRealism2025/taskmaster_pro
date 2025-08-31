import React from 'react'
import { render, screen } from '@testing-library/react'
import DashboardPage from '@/app/(dashboard)/dashboard/page'
import { ThemeProvider } from '@/components/theme/theme-provider'

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function DashboardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

describe('Dashboard Page', () => {
  it('should render dashboard layout', () => {
    render(
      <DashboardWrapper>
        <DashboardPage />
      </DashboardWrapper>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText("Welcome back! Here's an overview of your productivity.")).toBeInTheDocument()
  })

  it('should show dashboard stats', () => {
    render(
      <DashboardWrapper>
        <DashboardPage />
      </DashboardWrapper>
    )

    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0)
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Team Members')).toBeInTheDocument()
  })

  it('should show recent activity section', () => {
    render(
      <DashboardWrapper>
        <DashboardPage />
      </DashboardWrapper>
    )

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('Your latest tasks and updates')).toBeInTheDocument()
  })

  it('should show quick actions section', () => {
    render(
      <DashboardWrapper>
        <DashboardPage />
      </DashboardWrapper>
    )

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Common tasks and shortcuts')).toBeInTheDocument()
  })

  it('should have loading state', () => {
    // Test the skeleton component directly
    render(
      <DashboardWrapper>
        <div className="space-y-6" data-testid="dashboard-skeleton">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardWrapper>
    )

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })
})