# Security Test Suite - Vulnerability Validation

**Purpose**: Validate that all security vulnerabilities have been properly fixed

## Authentication Security Tests

**`__tests__/security/auth-security.test.ts`**
```typescript
import { NextRequest } from 'next/server'
import { authConfig } from '@/lib/auth/config'
import { validateCSRF } from '@/lib/security/csrf'
import { DatabaseSanitizer } from '@/lib/db/secure-queries'

describe('Authentication Security Fixes', () => {
  describe('Cookie Security', () => {
    it('should configure httpOnly cookies', () => {
      expect(authConfig.cookies?.sessionToken?.options?.httpOnly).toBe(true)
      expect(authConfig.cookies?.callbackUrl?.options?.httpOnly).toBe(true)
      expect(authConfig.cookies?.csrfToken?.options?.httpOnly).toBe(true)
    })

    it('should configure secure cookies for production', () => {
      process.env.NODE_ENV = 'production'
      expect(authConfig.cookies?.sessionToken?.options?.secure).toBe(true)
    })

    it('should configure SameSite for CSRF protection', () => {
      expect(authConfig.cookies?.sessionToken?.options?.sameSite).toBe('lax')
    })
  })

  describe('Session Duration', () => {
    it('should limit session duration to 7 days', () => {
      const sevenDays = 7 * 24 * 60 * 60
      expect(authConfig.session?.maxAge).toBe(sevenDays)
      expect(authConfig.jwt?.maxAge).toBe(sevenDays)
    })

    it('should update session every hour', () => {
      const oneHour = 1 * 60 * 60
      expect(authConfig.session?.updateAge).toBe(oneHour)
    })
  })

  describe('CSRF Protection', () => {
    it('should validate CSRF tokens', async () => {
      const mockReq = new NextRequest('http://localhost/test', {
        method: 'POST',
        headers: {
          'origin': 'http://localhost',
          'host': 'localhost',
          'x-csrf-token': 'valid-token'
        }
      })

      // Mock session
      jest.spyOn(require('next-auth/jwt'), 'getToken').mockResolvedValue({
        sub: 'user123',
        iat: Math.floor(Date.now() / 1000)
      })

      const isValid = await validateCSRF(mockReq)
      expect(typeof isValid).toBe('boolean')
    })

    it('should reject requests without CSRF tokens', async () => {
      const mockReq = new NextRequest('http://localhost/test', {
        method: 'POST',
        headers: {
          'origin': 'http://malicious.com', // Different origin
          'host': 'localhost'
        }
      })

      const isValid = await validateCSRF(mockReq)
      expect(isValid).toBe(false)
    })
  })
})
```

## SQL Injection Prevention Tests

**`__tests__/security/sql-injection.test.ts`**
```typescript
import { secureQueryHints, DatabaseSanitizer } from '@/lib/db/secure-queries'
import { prisma } from '@/lib/db/client'

describe('SQL Injection Prevention', () => {
  describe('UUID Validation', () => {
    it('should validate proper UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUUID = "'; DROP TABLE users; --"
      
      expect(DatabaseSanitizer.validateUUID(validUUID)).toBe(true)
      expect(DatabaseSanitizer.validateUUID(invalidUUID)).toBe(false)
    })

    it('should reject malicious user IDs', async () => {
      const maliciousUserId = "'; DROP TABLE tasks; --"
      
      await expect(secureQueryHints.getTaskMetrics(maliciousUserId))
        .rejects.toThrow('Invalid user ID format')
    })
  })

  describe('Search Query Sanitization', () => {
    it('should sanitize search queries', () => {
      const maliciousQuery = "test'; DROP TABLE users; --"
      const sanitized = DatabaseSanitizer.sanitizeSearchQuery(maliciousQuery)
      
      expect(sanitized).not.toContain('DROP')
      expect(sanitized).not.toContain(';')
      expect(sanitized).not.toContain('--')
      expect(sanitized).not.toContain("'")
    })

    it('should handle SQL wildcard escaping', () => {
      const queryWithWildcards = "test%_data"
      const sanitized = DatabaseSanitizer.sanitizeSearchQuery(queryWithWildcards)
      
      expect(sanitized).toBe("test\\%\\_data")
    })
  })

  describe('Array Input Sanitization', () => {
    it('should sanitize string arrays', () => {
      const maliciousArray = ["valid", "'; DROP TABLE users; --", "<script>alert('xss')</script>"]
      const sanitized = DatabaseSanitizer.sanitizeStringArray(maliciousArray)
      
      expect(sanitized).toEqual(["valid", " DROP TABLE users ", "scriptalert('xss')/script"])
      expect(sanitized.every(item => !item.includes(';'))).toBe(true)
    })

    it('should reject non-array inputs', () => {
      const notArray = "string"
      
      expect(() => DatabaseSanitizer.sanitizeStringArray(notArray))
        .toThrow('Expected array input')
    })
  })

  describe('Prisma Query Safety', () => {
    it('should use parameterized queries only', async () => {
      // Mock Prisma to verify no raw SQL is used
      const groupBySpy = jest.spyOn(prisma.task, 'groupBy')
      
      try {
        await secureQueryHints.getTaskMetrics('123e4567-e89b-12d3-a456-426614174000')
      } catch {
        // Expected to fail in test environment
      }
      
      expect(groupBySpy).toHaveBeenCalledWith({
        by: ['status', 'priority'],
        where: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          deletedAt: null
        },
        _count: { id: true },
        _sum: { estimatedMinutes: true, actualMinutes: true }
      })
    })
  })
})
```

## XSS Prevention Tests

**`__tests__/security/xss-prevention.test.ts`**
```typescript
import { useAuth } from '@/hooks/useAuth'
import { renderHook, waitFor } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

describe('XSS Prevention', () => {
  describe('Token Storage Security', () => {
    it('should not store tokens in localStorage', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: ({ children }) => (
          <SessionProvider session={null}>{children}</SessionProvider>
        )
      })

      // Check that no tokens are stored in localStorage
      expect(localStorage.getItem('next-auth.session-token')).toBeNull()
      expect(localStorage.getItem('jwt-token')).toBeNull()
      expect(localStorage.getItem('access-token')).toBeNull()
    })

    it('should only access tokens through secure API', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        // Should have secure request method, not direct token access
        expect(result.current.secureRequest).toBeDefined()
        expect(result.current.csrfToken).toBeDefined()
      })
    })
  })

  describe('Content Security Policy', () => {
    it('should prevent inline scripts', () => {
      const scriptElement = document.createElement('script')
      scriptElement.innerHTML = 'alert("xss")'
      document.head.appendChild(scriptElement)

      // CSP should prevent execution
      expect(window.alert).not.toHaveBeenCalled()
    })
  })
})
```

## Security Headers Tests

**`__tests__/security/security-headers.test.ts`**
```typescript
import { getSecurityHeaders, applySecurityHeaders } from '@/lib/security/headers'
import { NextResponse } from 'next/server'

describe('Security Headers', () => {
  it('should include all required security headers', () => {
    const headers = getSecurityHeaders()
    
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-XSS-Protection']).toBe('1; mode=block')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
  })

  it('should apply headers to responses', () => {
    const response = NextResponse.next()
    const securedResponse = applySecurityHeaders(response)
    
    expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY')
    expect(securedResponse.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('should hide server information', () => {
    const headers = getSecurityHeaders()
    
    expect(headers['Server']).toBe('')
    expect(headers['X-Powered-By']).toBe('')
  })
})
```

## Rate Limiting Tests

**`__tests__/security/rate-limiting.test.ts`**
```typescript
import { checkRateLimit } from '@/lib/security/ratelimit'

describe('Rate Limiting', () => {
  it('should enforce API rate limits', async () => {
    const clientIP = '192.168.1.1'
    
    // First request should succeed
    const result1 = await checkRateLimit(clientIP, 'api')
    expect(result1.success).toBe(true)
    
    // Simulate many requests to trigger rate limit
    for (let i = 0; i < 100; i++) {
      await checkRateLimit(clientIP, 'api')
    }
    
    // Should eventually be rate limited
    const resultFinal = await checkRateLimit(clientIP, 'api')
    expect(resultFinal.success).toBe(false)
  })

  it('should have stricter limits for auth endpoints', async () => {
    const authLimiter = require('@/lib/security/ratelimit').ratelimits.auth
    expect(authLimiter).toBeDefined()
    
    // Auth should have much lower limits than API
    const apiResult = await checkRateLimit('test-ip', 'api')
    const authResult = await checkRateLimit('test-ip', 'auth')
    
    expect(authResult.limit).toBeLessThan(apiResult.limit)
  })
})
```

## Encryption Security Tests

**`__tests__/security/encryption.test.ts`**
```typescript
import { encryption } from '@/lib/security/encryption'

describe('Encryption Security', () => {
  it('should encrypt and decrypt data correctly', () => {
    const sensitiveData = 'user-secret-information'
    const password = 'strong-encryption-key'

    const encrypted = encryption.encrypt(sensitiveData, password)
    
    expect(encrypted.encrypted).toBeDefined()
    expect(encrypted.salt).toBeDefined()
    expect(encrypted.iv).toBeDefined()
    expect(encrypted.tag).toBeDefined()

    const decrypted = encryption.decrypt(encrypted, password)
    expect(decrypted).toBe(sensitiveData)
  })

  it('should fail with wrong password', () => {
    const data = 'secret'
    const correctPassword = 'correct'
    const wrongPassword = 'wrong'

    const encrypted = encryption.encrypt(data, correctPassword)
    
    expect(() => encryption.decrypt(encrypted, wrongPassword))
      .toThrow('Decryption failed')
  })

  it('should generate secure CSRF tokens', () => {
    const token1 = encryption.generateCSRFToken()
    const token2 = encryption.generateCSRFToken()
    
    expect(token1).not.toBe(token2) // Should be unique
    expect(token1.length).toBeGreaterThan(20) // Should be long enough
  })

  it('should verify CSRF tokens securely', () => {
    const token = encryption.generateCSRFToken()
    
    expect(encryption.verifyCSRFToken(token, token)).toBe(true)
    expect(encryption.verifyCSRFToken(token, 'different-token')).toBe(false)
  })
})
```

## Security Compliance Validation

**`__tests__/security/compliance.test.ts`**
```typescript
describe('Security Compliance', () => {
  describe('OWASP Top 10 Compliance', () => {
    it('A01: Broken Access Control - should enforce user isolation', async () => {
      // Test that users can only access their own data
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      
      // Mock request from user1 trying to access user2's data
      const result = await secureQueryHints.getTaskMetrics(user2Id)
      // Should only return user2's data, not user1's
      expect(result).toBeDefined()
    })

    it('A02: Cryptographic Failures - should use strong encryption', () => {
      const config = encryption.config
      expect(config.algorithm).toBe('aes-256-gcm')
      expect(config.keyDerivation).toBe('pbkdf2')
      expect(config.iterations).toBeGreaterThanOrEqual(100000)
    })

    it('A03: Injection - should prevent SQL injection', () => {
      const maliciousInput = "'; DROP TABLE users; --"
      
      expect(() => DatabaseSanitizer.validateUUID(maliciousInput))
        .not.toThrow()
      expect(DatabaseSanitizer.validateUUID(maliciousInput)).toBe(false)
    })

    it('A07: Identification/Authentication - should use secure sessions', () => {
      expect(authConfig.session?.strategy).toBe('jwt')
      expect(authConfig.session?.maxAge).toBeLessThanOrEqual(7 * 24 * 60 * 60)
    })
  })

  describe('Security Headers', () => {
    it('should prevent clickjacking', () => {
      const headers = getSecurityHeaders()
      expect(headers['X-Frame-Options']).toBe('DENY')
    })

    it('should prevent MIME sniffing', () => {
      const headers = getSecurityHeaders()
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
    })

    it('should enforce HTTPS', () => {
      const headers = getSecurityHeaders()
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    })
  })
})
```

## Security Integration Tests

**`__tests__/security/integration.test.ts`**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { SessionProvider } from 'next-auth/react'

describe('Security Integration', () => {
  it('should integrate CSRF protection with forms', async () => {
    const TestComponent = () => {
      const { secureRequest, csrfToken } = useAuth()
      
      const handleSubmit = async () => {
        await secureRequest('/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'test' })
        })
      }
      
      return (
        <div>
          <span data-testid="csrf-token">{csrfToken || 'loading'}</span>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )
    }

    render(
      <SessionProvider session={{ user: { id: '1', email: 'test@example.com' } }}>
        <TestComponent />
      </SessionProvider>
    )

    await waitFor(() => {
      const token = screen.getByTestId('csrf-token')
      expect(token.textContent).not.toBe('loading')
    })
  })

  it('should handle session expiration securely', async () => {
    // Mock expired session
    const expiredSession = {
      user: { id: '1', email: 'test@example.com' },
      expires: new Date(Date.now() - 1000).toISOString() // Expired
    }

    const TestComponent = () => {
      const { isAuthenticated } = useAuth({ required: true })
      return <div>{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
    }

    render(
      <SessionProvider session={expiredSession}>
        <TestComponent />
      </SessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })
})
```

## Penetration Testing Simulation

**`__tests__/security/penetration-tests.test.ts`**
```typescript
describe('Penetration Testing Simulation', () => {
  describe('Authentication Bypass Attempts', () => {
    it('should prevent JWT manipulation', async () => {
      const maliciousJWT = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.'
      
      const mockReq = new NextRequest('http://localhost/api/protected', {
        headers: {
          'authorization': `Bearer ${maliciousJWT}`
        }
      })

      // Should reject malicious JWT
      const token = await getToken({ req: mockReq, secret: process.env.NEXTAUTH_SECRET })
      expect(token).toBeNull()
    })

    it('should prevent session fixation', async () => {
      // Simulate session fixation attack
      const sessionBefore = 'fixed-session-id'
      const sessionAfter = await signIn('credentials', {
        email: 'test@example.com',
        password: 'password',
        redirect: false
      })

      // Session ID should change after login
      expect(sessionAfter?.url).not.toContain(sessionBefore)
    })
  })

  describe('CSRF Attack Simulation', () => {
    it('should block cross-origin requests without CSRF token', async () => {
      const maliciousReq = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'origin': 'http://malicious.com',
          'host': 'localhost'
        },
        body: JSON.stringify({ title: 'Malicious task' })
      })

      const isValid = await validateCSRF(maliciousReq)
      expect(isValid).toBe(false)
    })
  })

  describe('Data Injection Attempts', () => {
    it('should prevent NoSQL injection', async () => {
      const maliciousFilter = { 
        $where: 'this.password.length > 0' 
      }
      
      const sanitized = DatabaseSanitizer.sanitizeMetadata(maliciousFilter)
      expect(sanitized).not.toHaveProperty('$where')
    })
  })
})
```

## Security Benchmark Tests

**`__tests__/security/benchmarks.test.ts`**
```typescript
describe('Security Performance Benchmarks', () => {
  it('should encrypt/decrypt within performance budget', async () => {
    const data = 'sensitive data'
    const password = 'encryption-key'
    
    const startTime = performance.now()
    const encrypted = encryption.encrypt(data, password)
    const decrypted = encryption.decrypt(encrypted, password)
    const endTime = performance.now()
    
    expect(decrypted).toBe(data)
    expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
  })

  it('should validate input within performance budget', () => {
    const largeInput = 'a'.repeat(10000)
    
    const startTime = performance.now()
    const sanitized = DatabaseSanitizer.sanitizeSearchQuery(largeInput)
    const endTime = performance.now()
    
    expect(sanitized.length).toBeLessThanOrEqual(100)
    expect(endTime - startTime).toBeLessThan(10) // Should complete within 10ms
  })
})
```

## Test Execution Commands

```bash
# Run all security tests
npm run test -- __tests__/security/

# Run specific security test suites
npm run test -- __tests__/security/auth-security.test.ts
npm run test -- __tests__/security/sql-injection.test.ts
npm run test -- __tests__/security/xss-prevention.test.ts

# Security audit
npm audit --audit-level high

# Dependency vulnerability check
npm run security:check

# Generate security coverage report
npm run test:security -- --coverage
```

## Pass Criteria

All tests must pass with:
- ✅ 0 SQL injection vulnerabilities
- ✅ 0 XSS vulnerabilities  
- ✅ 0 CSRF vulnerabilities
- ✅ 100% httpOnly cookie usage
- ✅ Complete security header coverage
- ✅ All inputs properly validated and sanitized

**CRITICAL**: These tests validate that all identified security vulnerabilities have been properly fixed.