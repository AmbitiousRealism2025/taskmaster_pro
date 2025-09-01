import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { SideNavigation } from '@/components/navigation/SideNavigation'
import { ThemeProvider } from '@/components/theme/theme-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

// Mock hooks
vi.mock('@/hooks/use-sidebar', () => ({
  useSidebar: () => ({
    isOpen: true,
    isMobile: false,
    closeSidebar: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-projects', () => ({
  useProjects: () => ({
    projects: [
      { id: '1', name: 'TaskMaster Pro v2', taskCount: 12 },
      { id: '2', name: 'Client Website', taskCount: 8 },
    ],
    isLoading: false,
  }),
}))

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function SidebarWrapper({ children }: { children: React.ReactNode }) {
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

describe('SideNavigation', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('should render navigation items', () => {
    render(
      <SidebarWrapper>
        <SideNavigation />
      </SidebarWrapper>
    )

    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Recent Projects')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Assigned to Me')).toBeInTheDocument()
  })

  it('should show project list', () => {
    render(
      <SidebarWrapper>
        <SideNavigation />
      </SidebarWrapper>
    )

    expect(screen.getByText('TaskMaster Pro v2')).toBeInTheDocument()
    expect(screen.getByText('Client Website')).toBeInTheDocument()
  })

  it('should show new task button', () => {
    render(
      <SidebarWrapper>
        <SideNavigation />
      </SidebarWrapper>
    )

    expect(screen.getByText('New Task')).toBeInTheDocument()
  })

  it('should have sidebar toggle button', () => {
    render(
      <SidebarWrapper>
        <SideNavigation />
      </SidebarWrapper>
    )

    const toggleButton = screen.getByTestId('sidebar-toggle')
    expect(toggleButton).toBeInTheDocument()
  })
})