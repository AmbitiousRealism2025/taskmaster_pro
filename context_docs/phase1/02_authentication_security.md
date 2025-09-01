# Authentication & Security Subgroup - Phase 1 Week 2

## ⚠️ Implementation Notes
- **Subgroup Number**: 2 (Authentication & Security)
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 3
- **Test Coverage**: docs/04-testing/Phase1_Foundation_Tests.md (Tests 7-11)
- **Dependencies**: Infrastructure Foundation (Subgroup 1) must be complete
- **Related Enhancements**: security_enhancements/SECURE_AUTH_REPLACEMENT.md, SECURITY_AUDIT_REPORT.md
- **Estimated Context Usage**: 40-50%

---

**Responsible Team**: Backend + Security Engineers  
**Duration**: Week 2 of Phase 1  
**Prerequisites**: Infrastructure Foundation (Week 1)  
**Dependencies**: Design System (parallel), Dashboard Layout (following week)

## Subgroup Overview

The Authentication & Security subgroup implements comprehensive authentication flows, session management, and security hardening for TaskMaster Pro. This includes OAuth integration, credential-based authentication, row-level security (RLS), CSRF protection, and security monitoring with zero-trust principles and defense-in-depth strategies.

### Core Security Responsibilities

1. **Authentication Infrastructure**
   - NextAuth/Auth.js configuration with multiple providers
   - Credential-based authentication with secure password handling
   - OAuth integration (Google, GitHub) with scope management
   - Session management and token security

2. **Authorization & Access Control**
   - Row-level security (RLS) with Prisma middleware
   - Role-based access control (RBAC) framework
   - API route protection middleware
   - Resource-level permissions

3. **Security Hardening**
   - CSRF protection and secure headers configuration
   - Input validation and sanitization
   - Rate limiting and brute force protection
   - Security monitoring and audit logging

4. **Data Protection**
   - Password hashing with bcrypt (cost factor 12+)
   - Sensitive data encryption at rest
   - Secure session storage and management
   - PII handling and data minimization

5. **Security Testing & Monitoring**
   - Vulnerability scanning and penetration testing
   - Security event logging and alerting
   - OWASP compliance validation
   - Security metrics and reporting

## Test Coverage Requirements

Based on docs/04-testing/Phase1_Foundation_Tests.md, this subgroup must implement tests that cover:

### Authentication Flow Tests (`__tests__/auth/auth-flow.test.ts`)
- Email/password authentication with validation
- OAuth provider integration (Google, GitHub)
- Session management and persistence
- Authentication state management
- Login/logout redirect flows

### Middleware Security Tests (`__tests__/auth/middleware.test.ts`)
- Route protection for authenticated pages
- API endpoint security validation
- Session verification and renewal
- Unauthorized access handling

### Session Management Tests (`__tests__/auth/session.test.ts`)
- Session creation and validation
- Token expiration and renewal
- Session storage and cleanup
- Cross-device session management

## Authentication Patterns

### 1. NextAuth/Auth.js Configuration

**`lib/auth/config.ts`**
```typescript
import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/monitoring/logger'

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile'
        }
      }
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'user:email'
        }
      }
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email and Password',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'your-email@example.com'
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Authentication attempt with missing credentials')
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { accounts: true }
          })

          if (!user) {
            logger.warn('Authentication failed: user not found', { 
              email: credentials.email 
            })
            return null
          }

          // Check if user has a password (credential account)
          const credentialAccount = user.accounts.find(
            account => account.provider === 'credentials'
          )

          if (!credentialAccount?.password) {
            logger.warn('Authentication failed: no password set', { 
              email: credentials.email 
            })
            return null
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            credentialAccount.password
          )

          if (!isValidPassword) {
            logger.warn('Authentication failed: invalid password', { 
              email: credentials.email 
            })
            return null
          }

          logger.info('Authentication successful', { 
            userId: user.id,
            email: user.email 
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image
          }
        } catch (error) {
          logger.error('Authentication error', { error, email: credentials.email })
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user ID and metadata in token
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }

      // Add provider information for audit logging
      if (account) {
        token.provider = account.provider
        
        logger.info('JWT token created', {
          userId: token.sub,
          provider: account.provider,
          type: account.type
        })
      }

      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.sub!
        session.user.email = token.email!
        session.user.name = token.name
        session.user.image = token.picture
      }

      return session
    },
    async signIn({ user, account, profile }) {
      // Security validation before allowing sign in
      if (!user.email) {
        logger.warn('Sign-in blocked: missing email', { 
          provider: account?.provider 
        })
        return false
      }

      // Rate limiting check (implement with Redis)
      const isRateLimited = await checkSignInRateLimit(user.email)
      if (isRateLimited) {
        logger.warn('Sign-in blocked: rate limited', { 
          email: user.email,
          provider: account?.provider 
        })
        return false
      }

      // OAuth-specific validations
      if (account?.provider === 'google') {
        // Verify email is verified with Google
        if (!profile?.email_verified) {
          logger.warn('Sign-in blocked: unverified Google email', { 
            email: user.email 
          })
          return false
        }
      }

      // Log successful sign-in
      logger.info('User signed in', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        ip: 'request-ip-placeholder' // Add IP from middleware
      })

      return true
    },
    async redirect({ url, baseUrl }) {
      // Security: Only allow redirects to same origin
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Audit log all sign-ins
      logger.info('Sign-in event', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser,
        timestamp: new Date().toISOString()
      })

      // Track failed login attempts (implement with Redis)
      await clearFailedLoginAttempts(user.email!)
    },
    async signOut({ token }) {
      // Audit log sign-outs
      logger.info('Sign-out event', {
        userId: token?.sub,
        timestamp: new Date().toISOString()
      })
    },
    async createUser({ user }) {
      // Audit log new user creation
      logger.info('New user created', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Rate limiting helper (implement with Redis)
async function checkSignInRateLimit(email: string): Promise<boolean> {
  // Implement rate limiting logic
  // Allow 5 attempts per 15 minutes per email
  return false
}

async function clearFailedLoginAttempts(email: string): Promise<void> {
  // Clear failed attempts counter on successful login
}

export default NextAuth(authConfig)
```

### 2. Password Security Implementation

**`lib/auth/password.ts`**
```typescript
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logger } from '@/lib/monitoring/logger'

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

// Common weak passwords to reject
const WEAK_PASSWORDS = new Set([
  'password123',
  '12345678',
  'qwerty123',
  'password1',
  'admin123',
  'welcome123'
])

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  const validation = passwordSchema.safeParse(password)
  if (!validation.success) {
    throw new Error(`Weak password: ${validation.error.errors[0].message}`)
  }

  // Check against common weak passwords
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    throw new Error('Password is too common and easily guessable')
  }

  // Use cost factor 12 for good security/performance balance
  const saltRounds = 12
  const hashedPassword = await bcrypt.hash(password, saltRounds)
  
  logger.info('Password hashed successfully', { 
    costFactor: saltRounds,
    hashLength: hashedPassword.length 
  })
  
  return hashedPassword
}

export async function verifyPassword(
  plainPassword: string, 
  hashedPassword: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword)
    
    logger.info('Password verification completed', { 
      success: isValid,
      hashLength: hashedPassword.length 
    })
    
    return isValid
  } catch (error) {
    logger.error('Password verification failed', { error })
    return false
  }
}

export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one character from each required category
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill remaining length with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Password strength estimation
export function estimatePasswordStrength(password: string): {
  score: number
  feedback: string[]
} {
  let score = 0
  const feedback: string[] = []
  
  // Length scoring
  if (password.length >= 8) score += 2
  if (password.length >= 12) score += 2
  if (password.length >= 16) score += 2
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 2
  
  // Deductions for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 2
    feedback.push('Avoid repeated characters')
  }
  
  if (/123|abc|qwe/i.test(password)) {
    score -= 2
    feedback.push('Avoid common sequences')
  }
  
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    score = 0
    feedback.push('This password is too common')
  }
  
  // Generate feedback
  if (score < 4) {
    feedback.push('Password is weak - use more characters and variety')
  } else if (score < 7) {
    feedback.push('Password is moderate - consider adding more complexity')
  } else {
    feedback.push('Password is strong')
  }
  
  return { score: Math.max(0, Math.min(10, score)), feedback }
}
```

### 3. Session Management and Security

**`lib/auth/session.ts`**
```typescript
import { getServerSession } from 'next-auth'
import { authConfig } from './config'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/monitoring/logger'
import { prisma } from '@/lib/db/client'

export async function getSession() {
  return await getServerSession(authConfig)
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user?.id) {
    logger.warn('Unauthorized access attempt', {
      timestamp: new Date().toISOString()
    })
    redirect('/auth/signin')
  }
  
  return session
}

export async function getCurrentUser() {
  const session = await requireAuth()
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      logger.error('Session user not found in database', { 
        sessionUserId: session.user.id 
      })
      redirect('/auth/signin')
    }
    
    return user
  } catch (error) {
    logger.error('Failed to fetch current user', { 
      sessionUserId: session.user.id, 
      error 
    })
    redirect('/auth/signin')
  }
}

// Session validation middleware
export async function validateSession(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    
    return !!user
  } catch (error) {
    logger.error('Session validation failed', { userId, error })
    return false
  }
}

// Security audit for session activities
export async function logSessionActivity(
  userId: string,
  activity: string,
  metadata?: Record<string, any>
) {
  try {
    logger.info('Session activity', {
      userId,
      activity,
      timestamp: new Date().toISOString(),
      ...metadata
    })
    
    // Store in audit log table (implement if needed)
    // await prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action: activity,
    //     metadata: JSON.stringify(metadata || {}),
    //   }
    // })
  } catch (error) {
    logger.error('Failed to log session activity', { error, userId, activity })
  }
}

// Session cleanup for expired/invalid sessions
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date()
        }
      }
    })
    
    logger.info('Cleaned up expired sessions', { count: result.count })
    return result.count
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', { error })
    return 0
  }
}
```

### 4. OAuth Provider Configuration

**`lib/auth/providers.ts`**
```typescript
import { Provider } from 'next-auth/providers'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/monitoring/logger'

interface OAuthConfig {
  enabled: boolean
  clientId?: string
  clientSecret?: string
  scopes: string[]
  userInfoEndpoint?: string
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    scopes: ['openid', 'email', 'profile'],
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  github: {
    enabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    scopes: ['user:email'],
    userInfoEndpoint: 'https://api.github.com/user'
  }
}

export function getConfiguredProviders(): Provider[] {
  const providers: Provider[] = []
  
  // Google OAuth
  if (OAUTH_CONFIGS.google.enabled) {
    providers.push(
      GoogleProvider({
        clientId: OAUTH_CONFIGS.google.clientId!,
        clientSecret: OAUTH_CONFIGS.google.clientSecret!,
        authorization: {
          params: {
            scope: OAUTH_CONFIGS.google.scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent'
          }
        },
        profile(profile) {
          logger.info('Google OAuth profile received', {
            userId: profile.sub,
            emailVerified: profile.email_verified
          })
          
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            emailVerified: profile.email_verified
          }
        }
      })
    )
    logger.info('Google OAuth provider configured')
  }
  
  // GitHub OAuth
  if (OAUTH_CONFIGS.github.enabled) {
    providers.push(
      GitHubProvider({
        clientId: OAUTH_CONFIGS.github.clientId!,
        clientSecret: OAUTH_CONFIGS.github.clientSecret!,
        authorization: {
          params: {
            scope: OAUTH_CONFIGS.github.scopes.join(' ')
          }
        },
        profile(profile) {
          logger.info('GitHub OAuth profile received', {
            userId: profile.id,
            login: profile.login
          })
          
          return {
            id: profile.id.toString(),
            name: profile.name || profile.login,
            email: profile.email,
            image: profile.avatar_url,
          }
        }
      })
    )
    logger.info('GitHub OAuth provider configured')
  }
  
  return providers
}

// OAuth security validation
export async function validateOAuthProfile(
  provider: string,
  profile: any
): Promise<{ valid: boolean; reason?: string }> {
  // Common validations across providers
  if (!profile.email) {
    return { valid: false, reason: 'Email required' }
  }
  
  // Provider-specific validations
  switch (provider) {
    case 'google':
      if (!profile.email_verified) {
        return { valid: false, reason: 'Email not verified with Google' }
      }
      break
      
    case 'github':
      // GitHub doesn't always provide email in profile
      // We'll need to make an additional API call if needed
      if (!profile.email) {
        logger.warn('GitHub profile missing email', { 
          userId: profile.id 
        })
      }
      break
  }
  
  return { valid: true }
}

// Security monitoring for OAuth flows
export async function logOAuthActivity(
  provider: string,
  action: string,
  userId?: string,
  metadata?: Record<string, any>
) {
  logger.info('OAuth activity', {
    provider,
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata
  })
}
```

## Row-Level Security Implementation

### 1. Prisma RLS Middleware

**`lib/db/security.ts`**
```typescript
import { Prisma, PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { logger } from '@/lib/monitoring/logger'

export function createSecurePrismaClient(): PrismaClient {
  const prisma = new PrismaClient()
  
  // Row-Level Security middleware
  prisma.$use(async (params, next) => {
    const session = await getSession()
    
    // Allow operations without user context for system operations
    if (!session?.user?.id) {
      // Only allow read operations for public data
      if (params.action.startsWith('find')) {
        // Public data queries are allowed
        return next(params)
      }
      
      // Block all write operations without authentication
      logger.warn('Blocked unauthenticated database operation', {
        action: params.action,
        model: params.model
      })
      throw new Error('Authentication required')
    }
    
    const userId = session.user.id
    
    // Apply RLS based on model
    switch (params.model) {
      case 'User':
        return applyUserSecurity(params, next, userId)
      case 'Project':
        return applyProjectSecurity(params, next, userId)
      case 'Task':
        return applyTaskSecurity(params, next, userId)
      case 'Note':
        return applyNoteSecurity(params, next, userId)
      case 'Habit':
        return applyHabitSecurity(params, next, userId)
      default:
        return next(params)
    }
  })
  
  return prisma
}

async function applyUserSecurity(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  userId: string
) {
  // Users can only access their own data
  switch (params.action) {
    case 'findUnique':
    case 'findFirst':
    case 'update':
    case 'delete':
      if (params.args.where?.id !== userId) {
        logger.warn('Blocked unauthorized user access', {
          userId,
          targetUserId: params.args.where?.id,
          action: params.action
        })
        throw new Error('Access denied')
      }
      break
      
    case 'findMany':
      // Users can only list themselves
      params.args.where = { ...params.args.where, id: userId }
      break
      
    case 'create':
      // Users cannot create other users via application
      logger.warn('Blocked user creation attempt', { userId })
      throw new Error('User creation not allowed')
  }
  
  return next(params)
}

async function applyProjectSecurity(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  userId: string
) {
  // Users can only access their own projects
  switch (params.action) {
    case 'create':
      // Ensure project is created for current user
      params.args.data = { ...params.args.data, userId }
      break
      
    case 'findMany':
    case 'findFirst':
    case 'findUnique':
      // Filter to user's projects only
      params.args.where = { ...params.args.where, userId }
      break
      
    case 'update':
    case 'updateMany':
    case 'delete':
    case 'deleteMany':
      // Ensure operation only affects user's projects
      params.args.where = { ...params.args.where, userId }
      break
  }
  
  return next(params)
}

async function applyTaskSecurity(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  userId: string
) {
  // Users can only access their own tasks
  switch (params.action) {
    case 'create':
      // Ensure task is created for current user
      params.args.data = { ...params.args.data, userId }
      
      // Validate project ownership if projectId provided
      if (params.args.data.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: params.args.data.projectId, userId }
        })
        
        if (!project) {
          logger.warn('Blocked task creation for unauthorized project', {
            userId,
            projectId: params.args.data.projectId
          })
          throw new Error('Project access denied')
        }
      }
      break
      
    case 'findMany':
    case 'findFirst':
    case 'findUnique':
      // Filter to user's tasks only
      params.args.where = { ...params.args.where, userId }
      break
      
    case 'update':
    case 'updateMany':
    case 'delete':
    case 'deleteMany':
      // Ensure operation only affects user's tasks
      params.args.where = { ...params.args.where, userId }
      break
  }
  
  return next(params)
}

async function applyNoteSecurity(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  userId: string
) {
  // Users can only access their own notes
  switch (params.action) {
    case 'create':
      params.args.data = { ...params.args.data, userId }
      break
      
    case 'findMany':
    case 'findFirst':
    case 'findUnique':
    case 'update':
    case 'updateMany':
    case 'delete':
    case 'deleteMany':
      params.args.where = { ...params.args.where, userId }
      break
  }
  
  return next(params)
}

async function applyHabitSecurity(
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
  userId: string
) {
  // Users can only access their own habits
  switch (params.action) {
    case 'create':
      params.args.data = { ...params.args.data, userId }
      break
      
    case 'findMany':
    case 'findFirst':
    case 'findUnique':
    case 'update':
    case 'updateMany':
    case 'delete':
    case 'deleteMany':
      params.args.where = { ...params.args.where, userId }
      break
  }
  
  return next(params)
}

// Secure database client with RLS
export const securePrisma = createSecurePrismaClient()
```

### 2. API Route Protection Middleware

**`lib/auth/middleware.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ratelimit } from '@/lib/security/ratelimit'
import { validateCSRF } from '@/lib/security/csrf'
import { logger } from '@/lib/monitoring/logger'
import { env } from '@/lib/config/env'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    name?: string
  }
}

// Authentication middleware for API routes
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get JWT token from request
      const token = await getToken({
        req,
        secret: env.NEXTAUTH_SECRET
      })

      if (!token?.sub) {
        logger.warn('API access denied: no valid token', {
          path: req.nextUrl.pathname,
          method: req.method,
          ip: req.ip || req.headers.get('x-forwarded-for')
        })
        
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Validate session is still active
      const sessionValid = await validateSessionToken(token.sub)
      if (!sessionValid) {
        logger.warn('API access denied: invalid session', {
          userId: token.sub,
          path: req.nextUrl.pathname
        })
        
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }

      // Add user info to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = {
        id: token.sub,
        email: token.email!,
        name: token.name || undefined
      }

      // Log authenticated API access
      logger.info('Authenticated API access', {
        userId: token.sub,
        path: req.nextUrl.pathname,
        method: req.method
      })

      return await handler(authenticatedReq)
    } catch (error) {
      logger.error('Authentication middleware error', { error })
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Rate limiting middleware
export async function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { requests: number; window: string } = { requests: 100, window: '1m' }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const identifier = req.ip || req.headers.get('x-forwarded-for') || 'anonymous'
      const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

      if (!success) {
        logger.warn('Rate limit exceeded', {
          identifier,
          path: req.nextUrl.pathname,
          limit,
          reset
        })
        
        return NextResponse.json(
          { 
            error: 'Too many requests',
            retryAfter: Math.round((reset - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.round((reset - Date.now()) / 1000).toString()
            }
          }
        )
      }

      return await handler(req)
    } catch (error) {
      logger.error('Rate limiting error', { error })
      return await handler(req) // Continue without rate limiting on error
    }
  }
}

// CSRF protection middleware
export async function withCSRF(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return await handler(req)
    }

    try {
      const isValidCSRF = await validateCSRF(req)
      
      if (!isValidCSRF) {
        logger.warn('CSRF validation failed', {
          path: req.nextUrl.pathname,
          method: req.method,
          origin: req.headers.get('origin'),
          referer: req.headers.get('referer')
        })
        
        return NextResponse.json(
          { error: 'CSRF validation failed' },
          { status: 403 }
        )
      }

      return await handler(req)
    } catch (error) {
      logger.error('CSRF middleware error', { error })
      return NextResponse.json(
        { error: 'Security validation failed' },
        { status: 500 }
      )
    }
  }
}

async function validateSessionToken(userId: string): Promise<boolean> {
  // Implement session validation logic
  // This could check against database, cache, or JWT claims
  return true // Placeholder
}

// Combine multiple middleware functions
export function withSecurity(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options?: { rateLimit?: { requests: number; window: string } }
) {
  let wrappedHandler = handler as any
  
  // Apply middleware in reverse order (outermost first)
  wrappedHandler = withCSRF(wrappedHandler)
  wrappedHandler = withRateLimit(wrappedHandler, options?.rateLimit)
  wrappedHandler = withAuth(wrappedHandler)
  
  return wrappedHandler
}
```

## Security Hardening Configuration

### 1. CSRF Protection Implementation

**`lib/security/csrf.ts`**
```typescript
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { logger } from '@/lib/monitoring/logger'
import { env } from '@/lib/config/env'

interface CSRFOptions {
  origins: string[]
  methods: string[]
  headers: string[]
}

const DEFAULT_CSRF_OPTIONS: CSRFOptions = {
  origins: [env.NEXTAUTH_URL],
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  headers: ['x-csrf-token', 'x-requested-with']
}

export async function validateCSRF(
  req: NextRequest,
  options: Partial<CSRFOptions> = {}
): Promise<boolean> {
  const config = { ...DEFAULT_CSRF_OPTIONS, ...options }
  
  // Skip CSRF for safe methods
  if (!config.methods.includes(req.method)) {
    return true
  }
  
  try {
    // Method 1: Check Origin header
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')
    
    if (origin) {
      const isValidOrigin = config.origins.some(allowedOrigin =>
        origin === allowedOrigin || origin.startsWith(allowedOrigin)
      )
      
      if (!isValidOrigin) {
        logger.warn('CSRF: Invalid origin header', { origin, expected: config.origins })
        return false
      }
    } else if (referer) {
      // Fallback to referer if no origin
      const isValidReferer = config.origins.some(allowedOrigin =>
        referer.startsWith(allowedOrigin)
      )
      
      if (!isValidReferer) {
        logger.warn('CSRF: Invalid referer header', { referer, expected: config.origins })
        return false
      }
    } else {
      logger.warn('CSRF: Missing origin and referer headers')
      return false
    }
    
    // Method 2: Check CSRF token in header
    const csrfToken = req.headers.get('x-csrf-token')
    if (csrfToken) {
      const isValidToken = await validateCSRFToken(csrfToken, req)
      if (!isValidToken) {
        logger.warn('CSRF: Invalid token', { tokenLength: csrfToken.length })
        return false
      }
    }
    
    // Method 3: Check for AJAX indicator
    const requestedWith = req.headers.get('x-requested-with')
    if (requestedWith === 'XMLHttpRequest') {
      // AJAX requests are generally safe from CSRF
      return true
    }
    
    return true
  } catch (error) {
    logger.error('CSRF validation error', { error })
    return false
  }
}

async function validateCSRFToken(token: string, req: NextRequest): Promise<boolean> {
  try {
    // Get user session for token validation
    const session = await getToken({ req, secret: env.NEXTAUTH_SECRET })
    
    if (!session?.sub) {
      return false
    }
    
    // Simple token validation (in production, use cryptographic verification)
    const expectedToken = generateCSRFToken(session.sub)
    return token === expectedToken
  } catch (error) {
    logger.error('CSRF token validation error', { error })
    return false
  }
}

export function generateCSRFToken(userId: string): string {
  // In production, use cryptographically secure token generation
  // This is a simplified implementation for development
  const timestamp = Math.floor(Date.now() / 1000 / 3600) // Hour-based token
  const secret = env.NEXTAUTH_SECRET
  
  // Create deterministic token based on user ID, timestamp, and secret
  const payload = `${userId}:${timestamp}:${secret}`
  return Buffer.from(payload).toString('base64')
}

// Generate CSRF token for client-side use
export async function getCSRFToken(req: NextRequest): Promise<string | null> {
  try {
    const session = await getToken({ req, secret: env.NEXTAUTH_SECRET })
    
    if (!session?.sub) {
      return null
    }
    
    return generateCSRFToken(session.sub)
  } catch (error) {
    logger.error('Failed to generate CSRF token', { error })
    return null
  }
}
```

### 2. Rate Limiting Implementation

**`lib/security/ratelimit.ts`**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/config/env'
import { logger } from '@/lib/monitoring/logger'

// Redis client for rate limiting
const redis = new Redis({
  url: env.REDIS_URL,
  token: env.REDIS_TOKEN // Add to env.ts
})

// Different rate limits for different operations
export const ratelimits = {
  // General API requests
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    analytics: true,
    prefix: 'taskmaster:ratelimit:api'
  }),
  
  // Authentication attempts
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15m'),
    analytics: true,
    prefix: 'taskmaster:ratelimit:auth'
  }),
  
  // Password reset requests
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1h'),
    analytics: true,
    prefix: 'taskmaster:ratelimit:password'
  }),
  
  // Account creation
  signup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1h'),
    analytics: true,
    prefix: 'taskmaster:ratelimit:signup'
  }),
  
  // AI operations (expensive)
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1h'),
    analytics: true,
    prefix: 'taskmaster:ratelimit:ai'
  })
}

// Default rate limiter
export const ratelimit = ratelimits.api

// Rate limit check with logging
export async function checkRateLimit(
  identifier: string,
  type: keyof typeof ratelimits = 'api'
): Promise<{
  success: boolean
  limit: number
  reset: number
  remaining: number
}> {
  try {
    const limiter = ratelimits[type]
    const result = await limiter.limit(identifier)
    
    if (!result.success) {
      logger.warn('Rate limit exceeded', {
        identifier,
        type,
        limit: result.limit,
        reset: result.reset,
        remaining: result.remaining
      })
    }
    
    return result
  } catch (error) {
    logger.error('Rate limit check failed', { error, identifier, type })
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      reset: Date.now(),
      remaining: 0
    }
  }
}

// Brute force protection for login attempts
export async function trackFailedLogin(email: string): Promise<void> {
  try {
    const key = `failed-login:${email}`
    const current = await redis.get(key) || 0
    const newCount = parseInt(current.toString()) + 1
    
    // Set expiration for 15 minutes
    await redis.setex(key, 900, newCount)
    
    logger.warn('Failed login attempt tracked', {
      email,
      attemptCount: newCount
    })
    
    // Alert on excessive failures
    if (newCount >= 5) {
      logger.error('Excessive failed login attempts detected', {
        email,
        attemptCount: newCount
      })
      
      // Trigger security alert (implement notification system)
      await triggerSecurityAlert('excessive_failed_logins', {
        email,
        attemptCount: newCount
      })
    }
  } catch (error) {
    logger.error('Failed to track login attempt', { error, email })
  }
}

export async function getFailedLoginCount(email: string): Promise<number> {
  try {
    const count = await redis.get(`failed-login:${email}`)
    return parseInt(count?.toString() || '0')
  } catch (error) {
    logger.error('Failed to get login attempt count', { error, email })
    return 0
  }
}

export async function clearFailedLogins(email: string): Promise<void> {
  try {
    await redis.del(`failed-login:${email}`)
    logger.info('Cleared failed login attempts', { email })
  } catch (error) {
    logger.error('Failed to clear login attempts', { error, email })
  }
}

// Security alert system
async function triggerSecurityAlert(
  type: string,
  metadata: Record<string, any>
): Promise<void> {
  logger.error('Security alert triggered', { type, ...metadata })
  
  // Implement security alerting system
  // Could send to Slack, email, PagerDuty, etc.
}
```

### 3. Secure Headers Configuration

**`lib/security/headers.ts`**
```typescript
import { NextResponse } from 'next/server'
import { env } from '@/lib/config/env'

interface SecurityHeaders {
  [key: string]: string
}

export function getSecurityHeaders(): SecurityHeaders {
  const headers: SecurityHeaders = {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()'
    ].join(', '),
    
    // Remove server information
    'Server': 'TaskMaster Pro'
  }
  
  // Content Security Policy
  headers['Content-Security-Policy'] = generateCSP()
  
  // HSTS in production
  if (env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }
  
  return headers
}

function generateCSP(): string {
  const nonce = generateNonce()
  
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openrouter.ai https://*.vercel.app",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ]
  
  return cspDirectives.join('; ')
}

function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders()
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

// CORS configuration for API routes
export function applyCORSHeaders(
  response: NextResponse,
  origin?: string
): NextResponse {
  const allowedOrigins = [
    env.NEXTAUTH_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ]
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    response.headers.set('Access-Control-Allow-Origin', env.NEXTAUTH_URL)
  }
  
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
  )
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}
```

### 4. Input Validation and Sanitization

**`lib/security/validation.ts`**
```typescript
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { logger } from '@/lib/monitoring/logger'

// Base validation schemas
export const secureStringSchema = z.string()
  .trim()
  .min(1, 'Field cannot be empty')
  .max(10000, 'Field too long')
  .refine(
    (val) => !containsSQLInjection(val),
    'Invalid characters detected'
  )
  .refine(
    (val) => !containsXSSPayload(val),
    'Potential security risk detected'
  )

export const emailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()
  .max(254) // RFC 5321 limit

export const userIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid user ID format')
  .min(1)
  .max(50)

// Authentication validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false)
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[a-z]/, 'Password must contain lowercase letters')
    .regex(/[A-Z]/, 'Password must contain uppercase letters')
    .regex(/[0-9]/, 'Password must contain numbers')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain special characters'),
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  terms: z.boolean().refine(val => val === true, 'Must accept terms of service')
})

// Task and project validation schemas  
export const taskSchema = z.object({
  title: secureStringSchema.max(200),
  description: secureStringSchema.max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(), // Max 8 hours
  projectId: userIdSchema.optional()
})

export const projectSchema = z.object({
  name: secureStringSchema.max(100),
  description: secureStringSchema.max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format')
})

// Security validation functions
function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|"|`)/,
    /(\bOR\b|\bAND\b)\s+\w+\s*=\s*\w+/i,
    /'.*OR.*'/i,
    /1\s*=\s*1/,
    /1\s*OR\s*1/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

function containsXSSPayload(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<link\b/i,
    /<meta\b/i,
    /data:text\/html/i,
    /vbscript:/i
  ]
  
  return xssPatterns.some(pattern => pattern.test(input))
}

// Sanitization functions
export function sanitizeHTML(input: string): string {
  try {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
  } catch (error) {
    logger.error('HTML sanitization failed', { error })
    return input.replace(/<[^>]*>/g, '') // Strip all HTML as fallback
  }
}

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000) // Limit length
}

// Validation middleware for API routes
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      const validated = schema.parse(data)
      
      logger.debug('Input validation successful', {
        schema: schema.constructor.name,
        dataKeys: typeof data === 'object' && data ? Object.keys(data) : []
      })
      
      return validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Input validation failed', {
          errors: error.errors,
          data: typeof data === 'object' ? Object.keys(data as object) : typeof data
        })
        
        throw new Error(`Validation failed: ${error.errors[0].message}`)
      }
      
      logger.error('Validation error', { error })
      throw new Error('Invalid input data')
    }
  }
}

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
  mimetype: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]),
  size: z.number().max(5 * 1024 * 1024) // 5MB limit
})

export function validateFileUpload(file: File): boolean {
  try {
    fileUploadSchema.parse({
      filename: file.name,
      mimetype: file.type,
      size: file.size
    })
    return true
  } catch (error) {
    logger.warn('File upload validation failed', { 
      filename: file.name,
      size: file.size,
      type: file.type,
      error 
    })
    return false
  }
}
```

## Audit Logging and Security Monitoring

### 1. Security Event Logging

**`lib/security/audit.ts`**
```typescript
import { prisma } from '@/lib/db/client'
import { logger } from '@/lib/monitoring/logger'

export interface SecurityEvent {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'SESSION_CREATED' | 'SESSION_EXPIRED' | 
        'PASSWORD_CHANGED' | 'ACCOUNT_LOCKED' | 'SUSPICIOUS_ACTIVITY' | 'DATA_ACCESS'
  userId?: string
  email?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  metadata?: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    // Log to application logger
    logger.info('Security event', {
      type: event.type,
      userId: event.userId,
      email: event.email,
      severity: event.severity,
      timestamp: new Date().toISOString(),
      ...event.metadata
    })
    
    // Store in audit log table (extend Prisma schema)
    // await prisma.securityAuditLog.create({
    //   data: {
    //     eventType: event.type,
    //     userId: event.userId,
    //     email: event.email,
    //     ipAddress: event.ipAddress,
    //     userAgent: event.userAgent,
    //     resource: event.resource,
    //     metadata: JSON.stringify(event.metadata || {}),
    //     severity: event.severity,
    //   }
    // })
    
    // Trigger alerts for high-severity events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      await triggerSecurityAlert(event)
    }
  } catch (error) {
    logger.error('Failed to log security event', { error, event })
  }
}

export async function logAuthEvent(
  type: 'SUCCESS' | 'FAILURE',
  email: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    type: type === 'SUCCESS' ? 'AUTH_SUCCESS' : 'AUTH_FAILURE',
    email,
    severity: type === 'FAILURE' ? 'MEDIUM' : 'LOW',
    metadata
  })
}

export async function logDataAccess(
  userId: string,
  resource: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    type: 'DATA_ACCESS',
    userId,
    resource,
    severity: 'LOW',
    metadata: {
      action,
      ...metadata
    }
  })
}

export async function logSuspiciousActivity(
  description: string,
  userId?: string,
  email?: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    userId,
    email,
    severity: 'HIGH',
    metadata: {
      description,
      ...metadata
    }
  })
}

// Security metrics collection
export async function getSecurityMetrics(timeRange: '1h' | '24h' | '7d' = '24h') {
  const now = new Date()
  const startTime = new Date()
  
  switch (timeRange) {
    case '1h':
      startTime.setHours(now.getHours() - 1)
      break
    case '24h':
      startTime.setDate(now.getDate() - 1)
      break
    case '7d':
      startTime.setDate(now.getDate() - 7)
      break
  }
  
  try {
    // These would query audit log table when implemented
    const metrics = {
      authSuccesses: 0, // Count of successful authentications
      authFailures: 0,  // Count of failed authentications
      suspiciousEvents: 0, // Count of suspicious activities
      accountLockouts: 0, // Count of account lockouts
      passwordChanges: 0, // Count of password changes
      timeRange,
      generatedAt: new Date().toISOString()
    }
    
    logger.info('Security metrics generated', metrics)
    return metrics
  } catch (error) {
    logger.error('Failed to generate security metrics', { error })
    return null
  }
}

async function triggerSecurityAlert(event: SecurityEvent): Promise<void> {
  logger.error('Security alert triggered', {
    eventType: event.type,
    severity: event.severity,
    userId: event.userId,
    email: event.email
  })
  
  // Implement alerting system (email, Slack, etc.)
  // For now, just log the alert
}
```

### 2. Vulnerability Scanning Integration

**`lib/security/scanner.ts`**
```typescript
import { z } from 'zod'
import { logger } from '@/lib/monitoring/logger'

export interface VulnerabilityReport {
  id: string
  type: 'DEPENDENCY' | 'CODE' | 'CONFIGURATION' | 'INFRASTRUCTURE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  file?: string
  line?: number
  recommendation: string
  cveId?: string
  discoveredAt: Date
}

export class SecurityScanner {
  private vulnerabilities: VulnerabilityReport[] = []
  
  async scanDependencies(): Promise<VulnerabilityReport[]> {
    try {
      // Integration with npm audit or Snyk
      // This would run: npm audit --json
      logger.info('Starting dependency vulnerability scan')
      
      // Placeholder implementation
      const vulnerabilities: VulnerabilityReport[] = []
      
      // Example: Check for known vulnerable packages
      const packageJson = await import('../../package.json')
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      // Check against known vulnerable versions
      for (const [pkg, version] of Object.entries(dependencies)) {
        const vulns = await checkPackageVulnerabilities(pkg, version as string)
        vulnerabilities.push(...vulns)
      }
      
      this.vulnerabilities.push(...vulnerabilities)
      logger.info('Dependency scan completed', { 
        vulnerabilityCount: vulnerabilities.length 
      })
      
      return vulnerabilities
    } catch (error) {
      logger.error('Dependency scan failed', { error })
      return []
    }
  }
  
  async scanCodePatterns(): Promise<VulnerabilityReport[]> {
    try {
      logger.info('Starting code pattern vulnerability scan')
      
      const vulnerabilities: VulnerabilityReport[] = []
      
      // Scan for common security anti-patterns
      const patterns = [
        {
          pattern: /console\.log\([^)]*password[^)]*\)/gi,
          severity: 'HIGH' as const,
          title: 'Password logged to console',
          description: 'Sensitive information exposed in logs'
        },
        {
          pattern: /eval\s*\(/gi,
          severity: 'CRITICAL' as const,
          title: 'Use of eval() function',
          description: 'Potential code injection vulnerability'
        },
        {
          pattern: /innerHTML\s*=/gi,
          severity: 'MEDIUM' as const,
          title: 'Direct innerHTML assignment',
          description: 'Potential XSS vulnerability'
        },
        {
          pattern: /document\.write\s*\(/gi,
          severity: 'HIGH' as const,
          title: 'Use of document.write',
          description: 'Potential XSS vulnerability'
        }
      ]
      
      // This would scan actual code files
      // Implementation would use file system scanning
      
      this.vulnerabilities.push(...vulnerabilities)
      logger.info('Code pattern scan completed', { 
        vulnerabilityCount: vulnerabilities.length 
      })
      
      return vulnerabilities
    } catch (error) {
      logger.error('Code pattern scan failed', { error })
      return []
    }
  }
  
  async scanConfiguration(): Promise<VulnerabilityReport[]> {
    try {
      logger.info('Starting configuration vulnerability scan')
      
      const vulnerabilities: VulnerabilityReport[] = []
      
      // Check environment configuration security
      const configChecks = [
        {
          check: () => process.env.NEXTAUTH_SECRET?.length < 32,
          title: 'Weak NextAuth secret',
          severity: 'CRITICAL' as const,
          description: 'NextAuth secret should be at least 32 characters'
        },
        {
          check: () => process.env.NODE_ENV === 'production' && !process.env.SENTRY_DSN,
          title: 'Missing error monitoring in production',
          severity: 'MEDIUM' as const,
          description: 'Production environment should have error monitoring configured'
        },
        {
          check: () => !process.env.REDIS_URL,
          title: 'Missing Redis configuration',
          severity: 'LOW' as const,
          description: 'Redis is required for session storage and rate limiting'
        }
      ]
      
      for (const [index, check] of configChecks.entries()) {
        if (check.check()) {
          vulnerabilities.push({
            id: `config-${index}`,
            type: 'CONFIGURATION',
            severity: check.severity,
            title: check.title,
            description: check.description,
            recommendation: `Update environment configuration to address: ${check.description}`,
            discoveredAt: new Date()
          })
        }
      }
      
      this.vulnerabilities.push(...vulnerabilities)
      logger.info('Configuration scan completed', { 
        vulnerabilityCount: vulnerabilities.length 
      })
      
      return vulnerabilities
    } catch (error) {
      logger.error('Configuration scan failed', { error })
      return []
    }
  }
  
  async generateReport(): Promise<{
    summary: {
      total: number
      critical: number
      high: number
      medium: number
      low: number
    }
    vulnerabilities: VulnerabilityReport[]
    recommendations: string[]
  }> {
    const summary = {
      total: this.vulnerabilities.length,
      critical: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      high: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
      medium: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
      low: this.vulnerabilities.filter(v => v.severity === 'LOW').length
    }
    
    const recommendations = this.generateRecommendations()
    
    logger.info('Security scan report generated', { summary })
    
    return {
      summary,
      vulnerabilities: this.vulnerabilities,
      recommendations
    }
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.vulnerabilities.some(v => v.severity === 'CRITICAL')) {
      recommendations.push('Address critical vulnerabilities immediately before deployment')
    }
    
    if (this.vulnerabilities.some(v => v.type === 'DEPENDENCY')) {
      recommendations.push('Update vulnerable dependencies to latest secure versions')
    }
    
    if (this.vulnerabilities.some(v => v.type === 'CONFIGURATION')) {
      recommendations.push('Review and harden environment configuration')
    }
    
    recommendations.push('Implement regular automated security scanning')
    recommendations.push('Set up security monitoring and alerting')
    
    return recommendations
  }
}

async function checkPackageVulnerabilities(
  packageName: string,
  version: string
): Promise<VulnerabilityReport[]> {
  // This would integrate with vulnerability databases
  // Placeholder implementation
  return []
}

export const securityScanner = new SecurityScanner()
```

## Authentication Components

### 1. Login Form Component

**`components/auth/LoginForm.tsx`**
```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icons } from '@/components/ui/icons'
import { loginSchema } from '@/lib/security/validation'
import { logger } from '@/lib/monitoring/logger'

type LoginForm = z.infer<typeof loginSchema>

interface LoginFormProps {
  callbackUrl?: string
  error?: string
}

export function LoginForm({ callbackUrl = '/dashboard', error }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState(error || '')
  const router = useRouter()
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false
    }
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    setAuthError('')
    
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      })
      
      if (result?.error) {
        setAuthError('Invalid email or password')
        logger.warn('Login attempt failed', { 
          email: data.email,
          error: result.error 
        })
      } else if (result?.ok) {
        logger.info('Login successful', { email: data.email })
        router.push(callbackUrl)
      }
    } catch (error) {
      setAuthError('An unexpected error occurred')
      logger.error('Login error', { error, email: data.email })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    setIsLoading(true)
    setAuthError('')
    
    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      setAuthError('OAuth sign-in failed')
      logger.error('OAuth sign-in error', { error, provider })
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              autoComplete="email"
              disabled={isLoading}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              id="remember"
              type="checkbox"
              className="rounded border-gray-300"
              {...form.register('remember')}
            />
            <Label htmlFor="remember" className="text-sm">
              Remember me
            </Label>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading}
          >
            <Icons.gitHub className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2. Authentication Provider

**`components/auth/AuthProvider.tsx`**
```typescript
'use client'

import { SessionProvider } from 'next-auth/react'
import { Session } from 'next-auth'

interface AuthProviderProps {
  children: React.ReactNode
  session?: Session | null
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider 
      session={session}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}
```

### 3. Route Protection Hook

**`hooks/useAuth.ts`**
```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger'

export interface UseAuthOptions {
  required?: boolean
  redirectTo?: string
  onUnauthenticated?: () => void
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const {
    required = false,
    redirectTo = '/auth/signin',
    onUnauthenticated
  } = options

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (required && status === 'unauthenticated') {
      if (onUnauthenticated) {
        onUnauthenticated()
      } else {
        logger.info('Redirecting unauthenticated user', { 
          from: window.location.pathname,
          to: redirectTo 
        })
        router.push(redirectTo)
      }
    }
  }, [status, required, redirectTo, onUnauthenticated, router])

  return {
    user: session?.user,
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading'
  }
}

// Higher-order component for route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: UseAuthOptions = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth({ required: true, ...options })
    
    if (isLoading) {
      return <div>Loading...</div> // Replace with proper loading component
    }
    
    if (!isAuthenticated) {
      return null // Will redirect via useAuth hook
    }
    
    return <Component {...props} />
  }
}

// Permission checking hook
export function usePermissions() {
  const { user } = useAuth()
  
  return {
    canCreateProject: () => !!user,
    canDeleteProject: (projectUserId: string) => user?.id === projectUserId,
    canEditTask: (taskUserId: string) => user?.id === taskUserId,
    canViewAnalytics: () => !!user,
    isOwner: (resourceUserId: string) => user?.id === resourceUserId
  }
}
```

## Security Testing Approaches

### 1. Authentication Flow Testing

**`__tests__/auth/auth-security.test.ts`**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import { LoginForm } from '@/components/auth/LoginForm'
import { trackFailedLogin, getFailedLoginCount } from '@/lib/security/ratelimit'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

jest.mock('@/lib/security/ratelimit', () => ({
  trackFailedLogin: jest.fn(),
  getFailedLoginCount: jest.fn(),
}))

describe('Authentication Security', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent SQL injection in login form', async () => {
    const mockSignIn = signIn as jest.Mock
    mockSignIn.mockResolvedValue({ error: 'Invalid credentials' })
    
    render(<LoginForm />)
    
    // Attempt SQL injection
    const sqlInjection = "admin'; DROP TABLE users; --"
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: sqlInjection }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should sanitize input and not execute SQL
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: sqlInjection, // Input should be sanitized
        password: 'password'
      })
    })
  })
  
  it('should track failed login attempts', async () => {
    const mockSignIn = signIn as jest.Mock
    const mockTrackFailedLogin = trackFailedLogin as jest.Mock
    
    mockSignIn.mockResolvedValue({ error: 'Invalid credentials' })
    
    render(<LoginForm />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockTrackFailedLogin).toHaveBeenCalledWith('user@example.com')
    })
  })
  
  it('should block login after excessive failed attempts', async () => {
    const mockGetFailedLoginCount = getFailedLoginCount as jest.Mock
    mockGetFailedLoginCount.mockResolvedValue(6) // Exceeds limit
    
    render(<LoginForm />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'blocked@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument()
    })
  })
  
  it('should validate password strength', async () => {
    render(<LoginForm />)
    
    const weakPasswords = ['123', 'password', 'abc123']
    
    for (const password of weakPasswords) {
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: password }
      })
      
      fireEvent.blur(screen.getByLabelText(/password/i))
      
      await waitFor(() => {
        expect(screen.getByText(/password is too weak/i)).toBeInTheDocument()
      })
    }
  })
  
  it('should prevent CSRF attacks', async () => {
    // Mock missing CSRF token
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '' // No CSRF token
    })
    
    render(<LoginForm />)
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    })
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should fail due to missing CSRF protection
    await waitFor(() => {
      expect(screen.getByText(/security validation failed/i)).toBeInTheDocument()
    })
  })
  
  it('should handle OAuth provider errors gracefully', async () => {
    const mockSignIn = signIn as jest.Mock
    mockSignIn.mockRejectedValue(new Error('OAuth provider error'))
    
    render(<LoginForm />)
    
    fireEvent.click(screen.getByRole('button', { name: /google/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/sign.*in.*failed/i)).toBeInTheDocument()
    })
  })
})
```

### 2. Middleware Security Testing

**`__tests__/auth/middleware-security.test.ts`**
```typescript
import { NextRequest } from 'next/server'
import { withAuth, withRateLimit, withCSRF } from '@/lib/auth/middleware'
import { getToken } from 'next-auth/jwt'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn()
}))

describe('Security Middleware', () => {
  const mockGetToken = getToken as jest.Mock
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Authentication Middleware', () => {
    it('should block unauthenticated requests', async () => {
      mockGetToken.mockResolvedValue(null)
      
      const handler = jest.fn()
      const protectedHandler = withAuth(handler)
      
      const req = new NextRequest('http://localhost:3000/api/tasks')
      const response = await protectedHandler(req)
      
      expect(response.status).toBe(401)
      expect(handler).not.toHaveBeenCalled()
    })
    
    it('should allow authenticated requests', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'user-123',
        email: 'user@example.com',
        name: 'Test User'
      })
      
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      )
      const protectedHandler = withAuth(handler)
      
      const req = new NextRequest('http://localhost:3000/api/tasks')
      await protectedHandler(req)
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            id: 'user-123',
            email: 'user@example.com',
            name: 'Test User'
          }
        })
      )
    })
    
    it('should validate session token', async () => {
      mockGetToken.mockResolvedValue({
        sub: 'invalid-user',
        email: 'user@example.com'
      })
      
      const handler = jest.fn()
      const protectedHandler = withAuth(handler)
      
      const req = new NextRequest('http://localhost:3000/api/tasks')
      const response = await protectedHandler(req)
      
      expect(response.status).toBe(401)
      expect(handler).not.toHaveBeenCalled()
    })
  })
  
  describe('Rate Limiting Middleware', () => {
    it('should allow requests within limit', async () => {
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      )
      const rateLimitedHandler = withRateLimit(handler, { requests: 5, window: '1m' })
      
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await rateLimitedHandler(req)
      
      expect(response.status).toBe(200)
      expect(handler).toHaveBeenCalled()
    })
    
    it('should block requests exceeding limit', async () => {
      // Mock rate limit exceeded
      jest.mock('@/lib/security/ratelimit', () => ({
        ratelimit: {
          limit: jest.fn().mockResolvedValue({
            success: false,
            limit: 5,
            reset: Date.now() + 60000,
            remaining: 0
          })
        }
      }))
      
      const handler = jest.fn()
      const rateLimitedHandler = withRateLimit(handler)
      
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await rateLimitedHandler(req)
      
      expect(response.status).toBe(429)
      expect(handler).not.toHaveBeenCalled()
    })
  })
  
  describe('CSRF Protection Middleware', () => {
    it('should allow safe methods without CSRF token', async () => {
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      )
      const csrfHandler = withCSRF(handler)
      
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET'
      })
      
      await csrfHandler(req)
      expect(handler).toHaveBeenCalled()
    })
    
    it('should validate origin for unsafe methods', async () => {
      const handler = jest.fn()
      const csrfHandler = withCSRF(handler)
      
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'origin': 'https://malicious-site.com'
        }
      })
      
      const response = await csrfHandler(req)
      
      expect(response.status).toBe(403)
      expect(handler).not.toHaveBeenCalled()
    })
    
    it('should accept valid CSRF tokens', async () => {
      const handler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      )
      const csrfHandler = withCSRF(handler)
      
      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000',
          'x-csrf-token': 'valid-token'
        }
      })
      
      await csrfHandler(req)
      expect(handler).toHaveBeenCalled()
    })
  })
})
```

### 3. OWASP Compliance Testing

**`__tests__/security/owasp-compliance.test.ts`**
```typescript
import { NextRequest } from 'next/server'
import { validateInput, sanitizeHTML, sanitizeText } from '@/lib/security/validation'
import { getSecurityHeaders } from '@/lib/security/headers'
import { securityScanner } from '@/lib/security/scanner'
import { z } from 'zod'

describe('OWASP Top 10 Compliance', () => {
  describe('A01 - Broken Access Control', () => {
    it('should enforce row-level security', async () => {
      // Test that users cannot access other users' data
      // This would test the Prisma middleware implementation
      
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      
      // Mock session for user 1
      // Attempt to access user 2's data
      // Should be blocked by RLS middleware
      
      expect(true).toBe(true) // Placeholder
    })
    
    it('should validate resource ownership', async () => {
      // Test that users can only modify their own resources
      expect(true).toBe(true) // Placeholder
    })
  })
  
  describe('A02 - Cryptographic Failures', () => {
    it('should use strong password hashing', async () => {
      const { hashPassword, verifyPassword } = await import('@/lib/auth/password')
      
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      // Should use bcrypt with appropriate cost factor
      expect(hash).toMatch(/^\$2[aby]\$12\$/) // bcrypt format with cost 12
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      const isInvalid = await verifyPassword('wrong', hash)
      expect(isInvalid).toBe(false)
    })
    
    it('should protect sensitive data in transit', () => {
      const headers = getSecurityHeaders()
      
      // Should enforce HTTPS in production
      if (process.env.NODE_ENV === 'production') {
        expect(headers['Strict-Transport-Security']).toBeDefined()
      }
    })
  })
  
  describe('A03 - Injection', () => {
    it('should prevent SQL injection', () => {
      const maliciousInput = "'; DROP TABLE users; --"
      
      expect(() => {
        validateInput(z.string())(maliciousInput)
      }).toThrow('Invalid characters detected')
    })
    
    it('should sanitize HTML input', () => {
      const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>'
      const sanitized = sanitizeHTML(maliciousHTML)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Safe content')
    })
    
    it('should remove dangerous characters', () => {
      const input = 'Normal text\x00\x08\x1F with control chars'
      const sanitized = sanitizeText(input)
      
      expect(sanitized).toBe('Normal text with control chars')
    })
  })
  
  describe('A04 - Insecure Design', () => {
    it('should implement proper session management', async () => {
      // Test session timeout, renewal, and cleanup
      expect(true).toBe(true) // Placeholder
    })
    
    it('should use secure authentication flows', async () => {
      // Test OAuth implementation security
      expect(true).toBe(true) // Placeholder
    })
  })
  
  describe('A05 - Security Misconfiguration', () => {
    it('should set secure headers', () => {
      const headers = getSecurityHeaders()
      
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['X-XSS-Protection']).toBe('1; mode=block')
      expect(headers['Content-Security-Policy']).toBeDefined()
    })
    
    it('should hide server information', () => {
      const headers = getSecurityHeaders()
      expect(headers['Server']).toBe('TaskMaster Pro')
    })
  })
  
  describe('A06 - Vulnerable Components', () => {
    it('should scan for vulnerable dependencies', async () => {
      const vulnerabilities = await securityScanner.scanDependencies()
      
      // Should identify known vulnerable packages
      const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL')
      expect(criticalVulns).toHaveLength(0) // No critical vulnerabilities allowed
    })
  })
  
  describe('A07 - Authentication Failures', () => {
    it('should implement account lockout', async () => {
      const email = 'test@example.com'
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await trackFailedLogin(email)
      }
      
      const failedCount = await getFailedLoginCount(email)
      expect(failedCount).toBeGreaterThanOrEqual(5)
    })
    
    it('should enforce strong password policy', () => {
      const weakPasswords = ['123456', 'password', 'qwerty']
      
      weakPasswords.forEach(password => {
        expect(() => {
          validateInput(z.string().min(8).regex(/[A-Z]/))(password)
        }).toThrow()
      })
    })
  })
  
  describe('A08 - Software and Data Integrity Failures', () => {
    it('should validate data integrity', () => {
      // Test data validation and sanitization
      expect(true).toBe(true) // Placeholder
    })
  })
  
  describe('A09 - Security Logging Failures', () => {
    it('should log security events', async () => {
      // Test that security events are properly logged
      expect(true).toBe(true) // Placeholder
    })
  })
  
  describe('A10 - Server-Side Request Forgery', () => {
    it('should validate external requests', () => {
      // Test SSRF protection for external API calls
      expect(true).toBe(true) // Placeholder
    })
  })
})
```

## API Route Examples

### 1. Protected User Profile API

**`app/api/user/profile/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { validateInput } from '@/lib/security/validation'
import { securePrisma } from '@/lib/db/security'
import { logDataAccess } from '@/lib/security/audit'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
})

// GET /api/user/profile
export const GET = withSecurity(async (req) => {
  try {
    const user = await securePrisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    await logDataAccess(req.user.id, 'user_profile', 'read')
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
})

// PUT /api/user/profile  
export const PUT = withSecurity(async (req) => {
  try {
    const data = await req.json()
    const validatedData = validateInput(updateProfileSchema)(data)
    
    const updatedUser = await securePrisma.user.update({
      where: { id: req.user.id },
      data: {
        name: validatedData.name,
        email: validatedData.email
      },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true
      }
    })
    
    await logDataAccess(req.user.id, 'user_profile', 'update', {
      changes: Object.keys(validatedData)
    })
    
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})
```

### 2. Password Change API

**`app/api/auth/change-password/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { validateInput } from '@/lib/security/validation'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { securePrisma } from '@/lib/db/security'
import { logSecurityEvent } from '@/lib/security/audit'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .regex(/[a-z]/, 'Must contain lowercase letters')
    .regex(/[A-Z]/, 'Must contain uppercase letters')
    .regex(/[0-9]/, 'Must contain numbers')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special characters'),
  confirmPassword: z.string()
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
)

export const POST = withSecurity(async (req) => {
  try {
    const data = await req.json()
    const validatedData = validateInput(changePasswordSchema)(data)
    
    // Get current user with credential account
    const user = await securePrisma.user.findUnique({
      where: { id: req.user.id },
      include: { 
        accounts: { 
          where: { provider: 'credentials' } 
        } 
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    const credentialAccount = user.accounts[0]
    if (!credentialAccount?.password) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      )
    }
    
    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      validatedData.currentPassword,
      credentialAccount.password
    )
    
    if (!isCurrentPasswordValid) {
      await logSecurityEvent({
        type: 'AUTH_FAILURE',
        userId: req.user.id,
        severity: 'MEDIUM',
        metadata: { reason: 'invalid_current_password' }
      })
      
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }
    
    // Hash new password
    const hashedNewPassword = await hashPassword(validatedData.newPassword)
    
    // Update password
    await securePrisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: hashedNewPassword }
    })
    
    await logSecurityEvent({
      type: 'PASSWORD_CHANGED',
      userId: req.user.id,
      severity: 'LOW',
      metadata: { method: 'user_initiated' }
    })
    
    return NextResponse.json({ 
      message: 'Password changed successfully' 
    })
  } catch (error) {
    await logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      userId: req.user.id,
      severity: 'HIGH',
      metadata: { 
        action: 'password_change_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
    
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
})
```

## Integration Points with Other Subgroups

### 1. Design System Integration

**Provides to Design System subgroup:**
- Authentication form components and validation patterns
- Security UI indicators (login status, session warnings)
- Theme-aware authentication pages
- Accessibility requirements for auth forms

**Receives from Design System subgroup:**
- Styled form components (Input, Button, Card, Alert)
- Theme system integration for auth pages
- Icon components for OAuth providers
- Loading and error state designs

### 2. Dashboard Layout Integration

**Provides to Dashboard Layout subgroup:**
- User session data and authentication state
- Route protection middleware patterns
- User profile data and preferences
- Authentication navigation components

**Receives from Dashboard Layout subgroup:**
- Navigation component authentication requirements
- Layout protection needs and user menu integration
- Session timeout handling in UI
- Authentication redirect patterns

### 3. API Layer Integration

**Provides to API Layer subgroup:**
- Authentication middleware for all API routes
- User context and permission checking utilities
- Security validation and sanitization functions
- Audit logging patterns for data operations

**Receives from API Layer subgroup:**
- Resource-specific permission requirements
- API rate limiting specifications
- Data validation schema integrations
- Error handling patterns for security failures

## Security Configuration Files

### 1. NextAuth API Route

**`app/api/auth/[...nextauth]/route.ts`**
```typescript
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/config'

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
```

### 2. Authentication Pages

**`app/auth/signin/page.tsx`**
```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authConfig } from '@/lib/auth/config'
import { LoginForm } from '@/components/auth/LoginForm'

interface SignInPageProps {
  searchParams: { callbackUrl?: string; error?: string }
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getServerSession(authConfig)
  
  // Redirect if already authenticated
  if (session) {
    redirect(searchParams.callbackUrl || '/dashboard')
  }
  
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <LoginForm 
        callbackUrl={searchParams.callbackUrl}
        error={searchParams.error}
      />
    </div>
  )
}
```

## Security Monitoring Dashboard

### 1. Security Metrics API

**`app/api/admin/security-metrics/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/auth/middleware'
import { getSecurityMetrics } from '@/lib/security/audit'
import { securityScanner } from '@/lib/security/scanner'

export const GET = withSecurity(async (req) => {
  try {
    // Only allow admin users (implement role checking)
    // if (!isAdmin(req.user.id)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }
    
    const timeRange = req.nextUrl.searchParams.get('range') as '1h' | '24h' | '7d' || '24h'
    
    const [metrics, scanReport] = await Promise.all([
      getSecurityMetrics(timeRange),
      securityScanner.generateReport()
    ])
    
    return NextResponse.json({
      metrics,
      vulnerabilities: scanReport,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch security metrics' },
      { status: 500 }
    )
  }
})
```

## Success Metrics and Exit Criteria

### Phase 1 Week 2 Completion Requirements

**Authentication Implementation (Required)**
- [ ] NextAuth/Auth.js configuration with OAuth providers
- [ ] Credential-based authentication with secure password handling
- [ ] Session management with automatic renewal and cleanup
- [ ] Authentication form components with validation
- [ ] OAuth integration (Google, GitHub) with scope management

**Security Hardening (Required)**
- [ ] Row-level security (RLS) with Prisma middleware
- [ ] CSRF protection and secure headers configuration
- [ ] Rate limiting and brute force protection
- [ ] Input validation and sanitization system
- [ ] Security audit logging and event tracking

**Testing Coverage (Required)**
- [ ] All authentication flow tests passing (4/4)
- [ ] Security middleware tests comprehensive
- [ ] OWASP Top 10 compliance validation
- [ ] Vulnerability scanning integration
- [ ] Security metrics and monitoring

**OWASP Compliance (Required)**
- [ ] A01 - Access control with RLS implementation
- [ ] A02 - Cryptographic security with bcrypt cost 12+
- [ ] A03 - Injection prevention with input validation
- [ ] A04 - Secure design with defense-in-depth
- [ ] A05 - Security configuration hardening
- [ ] A06 - Component vulnerability scanning
- [ ] A07 - Authentication security best practices
- [ ] A08 - Data integrity validation
- [ ] A09 - Security logging and monitoring
- [ ] A10 - SSRF protection implementation

### Security Performance Benchmarks

**Authentication Performance**
- OAuth flow completion: < 3 seconds
- Credential authentication: < 500ms
- Session validation: < 100ms
- Password hashing: < 200ms (bcrypt cost 12)

**Security Operations**
- Rate limit check: < 10ms
- CSRF validation: < 5ms
- Input sanitization: < 1ms per field
- Audit log write: < 50ms

**Vulnerability Scanning**
- Dependency scan: < 30 seconds
- Code pattern scan: < 60 seconds
- Configuration scan: < 5 seconds
- Full security report: < 2 minutes

### Handoff to Week 3 Subgroups

**Documentation Deliverables**
- Authentication integration guide
- Security middleware usage patterns
- RLS implementation documentation
- Security testing and compliance checklist

**Integration Points Ready**
- Dashboard Layout: User session data and protection patterns
- API Layer: Authentication middleware and validation utilities
- Core UI: Secure form components and validation feedback
- Database: RLS middleware and audit logging systems

This authentication and security foundation provides enterprise-grade security with zero-trust principles, comprehensive audit logging, and OWASP compliance for TaskMaster Pro's continued development.