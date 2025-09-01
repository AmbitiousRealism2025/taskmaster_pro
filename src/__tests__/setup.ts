import '@testing-library/jest-dom'
import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock NextAuth
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()

vi.mock('next-auth/react', () => ({
  signIn: mockSignIn,
  signOut: mockSignOut,
  getSession: mockGetSession,
  useSession: () => ({
    data: null,
    status: 'unauthenticated'
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Setup test environment
beforeAll(() => {
  // Setup global test configuration
})

// Cleanup after all tests
afterAll(() => {
  // Global cleanup
})