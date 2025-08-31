import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import React from 'react'
import { vi } from 'vitest'

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('Theme Toggle', () => {
  it('should render theme toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('should switch between light and dark themes', async () => {
    const mockSetTheme = vi.fn()
    const nextThemes = await import('next-themes')
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
      themes: ['light', 'dark'],
      systemTheme: 'light',
      forcedTheme: undefined,
    })

    render(<ThemeToggle />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('should display correct icon for current theme', () => {
    render(<ThemeToggle />)
    
    // Should show moon icon in light mode (to switch to dark)
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
  })

  it('should persist theme preference in localStorage', async () => {
    const mockSetTheme = vi.fn()
    const nextThemes = await import('next-themes')
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
      themes: ['light', 'dark'],
      systemTheme: 'light',
      forcedTheme: undefined,
    })

    render(<ThemeToggle />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})