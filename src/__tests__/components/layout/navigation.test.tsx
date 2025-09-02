import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { ThemeProvider } from '@/components/theme/theme-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
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

// Mock hooks
vi.mock('@/hooks/use-sidebar', () => ({
  useSidebar: () => ({
    toggleSidebar: vi.fn(),
    isOpen: false,
    isMobile: false,
  }),
}))

vi.mock('@/hooks/use-command-palette', () => ({
  useCommandPalette: () => ({
    open: vi.fn(),
    isOpen: false,
  }),
}))

function NavigationWrapper({ children }: { children: React.ReactNode }) {
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

describe('TopNavigation', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('should render module navigation', () => {
    render(
      <NavigationWrapper>
        <TopNavigation />
      </NavigationWrapper>
    )

    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Tasks')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Projects')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Notes')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Calendar')[0]).toBeInTheDocument()
  })

  it('should highlight active module', () => {
    vi.mocked(usePathname).mockReturnValue('/tasks')
    
    render(
      <NavigationWrapper>
        <TopNavigation />
      </NavigationWrapper>
    )

    const tasksLink = screen.getByTestId('nav-tasks')
    expect(tasksLink).toHaveClass('bg-accent')
  })

  it('should show mobile menu button on mobile', () => {
    render(
      <NavigationWrapper>
        <TopNavigation />
      </NavigationWrapper>
    )

    const mobileMenuButton = screen.getByTestId('mobile-menu-button')
    expect(mobileMenuButton).toBeInTheDocument()
  })

  it('should show user menu', () => {
    render(
      <NavigationWrapper>
        <TopNavigation />
      </NavigationWrapper>
    )

    const userButton = screen.getByRole('button')
    const avatarButton = Array.from(screen.getAllByRole('button')).find(
      button => button.querySelector('img[alt="User avatar"]') || button.textContent?.includes('JD')
    )
    
    expect(avatarButton).toBeInTheDocument()
  })
})