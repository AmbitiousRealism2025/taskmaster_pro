# Phase 1 Foundation Tests - TDD Framework

## Overview
This document outlines the failing tests that must be written BEFORE any Phase 1 implementation begins. Each test is designed to fail initially and drive the architecture decisions.

## Test Structure

```
__tests__/
├── setup.ts                    # Test configuration
├── auth/
│   ├── auth-flow.test.ts      # Authentication flows
│   ├── middleware.test.ts     # Route protection
│   └── session.test.ts        # Session management
├── database/
│   ├── models.test.ts         # Prisma schema tests
│   ├── operations.test.ts     # CRUD operations
│   └── relationships.test.ts  # Entity relationships
├── components/
│   ├── ui/
│   │   ├── card.test.ts       # Card component
│   │   ├── button.test.ts     # Button variants
│   │   └── theme-toggle.test.ts # Dark/light toggle
│   └── layout/
│       ├── navigation.test.ts # Top navigation
│       └── sidebar.test.ts    # Sidebar navigation
├── dashboard/
│   ├── metrics.test.ts        # Metric calculations
│   ├── quick-actions.test.ts  # Action buttons
│   └── dashboard-page.test.ts # Full page integration
└── e2e/
    ├── onboarding.spec.ts     # User registration flow
    ├── navigation.spec.ts     # Cross-module navigation
    └── theme-switching.spec.ts # Theme persistence
```

## Critical Failing Tests

### 1. Authentication Flow Tests

**File: `__tests__/auth/auth-flow.test.ts`**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn, signOut, getSession } from 'next-auth/react'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock NextAuth - these will fail initially
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

describe('Authentication Flow', () => {
  it('should render login form when unauthenticated', () => {
    // FAILING TEST: No LoginForm component exists
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    )
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should handle email/password login', async () => {
    // FAILING TEST: No login handler implemented
    const mockSignIn = signIn as jest.Mock
    mockSignIn.mockResolvedValue({ ok: true })

    render(<LoginForm />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'user@example.com',
        password: 'password123'
      })
    })
  })

  it('should handle OAuth providers', async () => {
    // FAILING TEST: No OAuth buttons exist
    render(<LoginForm />)
    
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    const githubButton = screen.getByRole('button', { name: /continue with github/i })
    
    expect(googleButton).toBeInTheDocument()
    expect(githubButton).toBeInTheDocument()

    fireEvent.click(googleButton)
    expect(signIn).toHaveBeenCalledWith('google')
  })

  it('should redirect after successful login', async () => {
    // FAILING TEST: No redirect logic implemented
    const mockPush = jest.fn()
    jest.mock('next/navigation', () => ({
      useRouter: () => ({ push: mockPush })
    }))

    render(<LoginForm />)
    
    // Simulate successful login
    const mockSignIn = signIn as jest.Mock
    mockSignIn.mockResolvedValue({ ok: true, url: '/dashboard' })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})
```

### 2. Database Schema Tests

**File: `__tests__/database/models.test.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// These tests will fail until Prisma schema is created
const prismaMock = mockDeep<PrismaClient>()

describe('Database Models', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('should create user with required fields', async () => {
    // FAILING TEST: No User model in schema
    const userData = {
      id: '1',
      email: 'user@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    prismaMock.user.create.mockResolvedValue(userData)

    const user = await prismaMock.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User'
      }
    })

    expect(user).toMatchObject(userData)
    expect(user.email).toBe('user@example.com')
  })

  it('should enforce email uniqueness', async () => {
    // FAILING TEST: No unique constraint on email
    prismaMock.user.create.mockRejectedValue(
      new Error('Unique constraint failed on email')
    )

    await expect(
      prismaMock.user.create({
        data: {
          email: 'duplicate@example.com',
          name: 'User'
        }
      })
    ).rejects.toThrow('Unique constraint failed')
  })

  it('should create project with user relationship', async () => {
    // FAILING TEST: No Project model or User relationship
    const projectData = {
      id: '1',
      name: 'Test Project',
      userId: '1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    prismaMock.project.create.mockResolvedValue(projectData)

    const project = await prismaMock.project.create({
      data: {
        name: 'Test Project',
        userId: '1'
      }
    })

    expect(project.userId).toBe('1')
    expect(project.name).toBe('Test Project')
  })

  it('should create task with project and user relationships', async () => {
    // FAILING TEST: No Task model with proper relationships
    const taskData = {
      id: '1',
      title: 'Test Task',
      userId: '1',
      projectId: '1',
      status: 'TODO',
      priority: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    prismaMock.task.create.mockResolvedValue(taskData)

    const task = await prismaMock.task.create({
      data: {
        title: 'Test Task',
        userId: '1',
        projectId: '1',
        status: 'TODO',
        priority: 'MEDIUM'
      }
    })

    expect(task).toMatchObject(taskData)
  })
})
```

### 3. Core UI Component Tests

**File: `__tests__/components/ui/card.test.ts`**

```typescript
import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

describe('Card Component', () => {
  it('should render basic card structure', () => {
    // FAILING TEST: No Card components exist
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
        <CardFooter>
          <p>Card footer</p>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
    expect(screen.getByText('Card footer')).toBeInTheDocument()
  })

  it('should apply correct CSS classes', () => {
    // FAILING TEST: No styling system in place
    render(<Card data-testid="card">Content</Card>)
    
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('rounded-xl', 'border', 'shadow-sm')
  })

  it('should support variant props', () => {
    // FAILING TEST: No variant system implemented
    render(<Card variant="elevated" data-testid="elevated-card">Content</Card>)
    
    const card = screen.getByTestId('elevated-card')
    expect(card).toHaveClass('shadow-lg')
  })

  it('should handle hover states', () => {
    // FAILING TEST: No hover interactions
    render(<Card interactive data-testid="interactive-card">Content</Card>)
    
    const card = screen.getByTestId('interactive-card')
    expect(card).toHaveClass('hover:shadow-md', 'transition-shadow')
  })
})
```

### 4. Theme System Tests

**File: `__tests__/components/ui/theme-toggle.test.ts`**

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
  }))
}))

describe('Theme Toggle', () => {
  it('should render theme toggle button', () => {
    // FAILING TEST: No ThemeToggle component
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const toggleButton = screen.getByRole('button', { name: /toggle theme/i })
    expect(toggleButton).toBeInTheDocument()
  })

  it('should switch between light and dark themes', () => {
    // FAILING TEST: No theme switching logic
    const mockSetTheme = jest.fn()
    const { useTheme } = require('next-themes')
    useTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme
    })

    render(<ThemeToggle />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('should display correct icon for current theme', () => {
    // FAILING TEST: No theme-aware icons
    render(<ThemeToggle />)
    
    // Should show sun icon in light mode
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('should persist theme preference', () => {
    // FAILING TEST: No theme persistence
    const mockSetTheme = jest.fn()
    
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    
    // Verify localStorage is used for persistence
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
```

### 5. Dashboard Integration Tests

**File: `__tests__/dashboard/dashboard-page.test.ts`**

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '@/app/dashboard/page'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

describe('Dashboard Page', () => {
  it('should render dashboard layout', async () => {
    // FAILING TEST: No dashboard page exists
    const queryClient = createTestQueryClient()
    
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Tasks Completed Today')).toBeInTheDocument()
      expect(screen.getByText('Active Projects')).toBeInTheDocument()
      expect(screen.getByText('Time Tracked')).toBeInTheDocument()
    })
  })

  it('should display metric cards with data', async () => {
    // FAILING TEST: No metrics calculation or display
    render(<DashboardPage />)

    await waitFor(() => {
      // Should show actual numbers, not placeholders
      expect(screen.getByTestId('tasks-completed')).toHaveTextContent(/^\d+$/)
      expect(screen.getByTestId('active-projects')).toHaveTextContent(/^\d+$/)
      expect(screen.getByTestId('time-tracked')).toHaveTextContent(/^\d+[hm]/)
    })
  })

  it('should render quick action buttons', () => {
    // FAILING TEST: No quick actions implemented
    render(<DashboardPage />)

    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quick note/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start focus/i })).toBeInTheDocument()
  })

  it('should handle loading states', () => {
    // FAILING TEST: No loading state management
    render(<DashboardPage />)
    
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('should handle error states', async () => {
    // FAILING TEST: No error boundary or error states
    // Mock API failure
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>
    )

    // Should show error state when data fetching fails
    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument()
    })
  })
})
```

## Test Configuration Files

### Test Setup
**File: `__tests__/setup.ts`**

```typescript
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Setup MSW
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Exit Criteria for Phase 1

All tests in this document must be **FAILING initially** and then **PASSING** after implementation:

- [ ] Authentication flow tests (4/4 passing)
- [ ] Database model tests (4/4 passing)  
- [ ] Core UI component tests (12/12 passing)
- [ ] Theme system tests (4/4 passing)
- [ ] Dashboard integration tests (5/5 passing)
- [ ] E2E user journey tests (3/3 passing)

**Total: 32 tests must pass before Phase 2 begins**

## Implementation Guidance

Each failing test provides specific requirements:

1. **Write tests first** - All tests should fail initially
2. **Implement minimal code** - Only write enough to pass the test
3. **Refactor** - Improve code while keeping tests green
4. **No implementation without tests** - Every feature needs corresponding tests

This TDD approach ensures robust, well-tested foundation for TaskMaster Pro.