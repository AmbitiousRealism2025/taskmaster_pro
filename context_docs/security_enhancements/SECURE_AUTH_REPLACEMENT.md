# SECURE Authentication Configuration Replacement

**CRITICAL**: Replace the vulnerable authentication configuration in `/context_docs/phase1/02_authentication_security.md` 

## VULNERABLE CODE TO REPLACE (lines 179-187):

```typescript
// INSECURE - REMOVE THIS:
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days - TOO LONG!
  updateAge: 24 * 60 * 60, // 24 hours - TOO LONG!
},
jwt: {
  secret: env.NEXTAUTH_SECRET,
  maxAge: 30 * 24 * 60 * 60, // 30 days - TOO LONG!
},
```

## SECURE REPLACEMENT:

```typescript
// SECURITY FIXED - REPLACE WITH THIS:
session: {
  strategy: 'jwt',
  maxAge: 7 * 24 * 60 * 60, // SECURITY FIX: 7 days instead of 30
  updateAge: 1 * 60 * 60, // SECURITY FIX: 1 hour instead of 24
},
jwt: {
  secret: env.NEXTAUTH_SECRET,
  maxAge: 7 * 24 * 60 * 60, // SECURITY FIX: 7 days instead of 30
},

// SECURITY FIX: Add secure cookie configuration
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: {
      httpOnly: true, // CRITICAL: Prevent XSS access to tokens
      sameSite: 'lax', // CRITICAL: CSRF protection
      path: '/',
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      domain: process.env.NODE_ENV === 'production' ? '.taskmaster-pro.com' : undefined
    }
  },
  callbackUrl: {
    name: 'next-auth.callback-url',
    options: {
      httpOnly: true, // CRITICAL: Prevent XSS access
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    }
  },
  csrfToken: {
    name: 'next-auth.csrf-token',
    options: {
      httpOnly: true, // CRITICAL: Prevent XSS access
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    }
  }
},
```

## Additional Security Fix Required:

### In the JWT callback (around line 194), ADD session timestamp:

```typescript
// EXISTING CODE:
async jwt({ token, user, account }) {
  if (user) {
    token.sub = user.id
    token.email = user.email
    token.name = user.name
    token.picture = user.image
  }

// ADD THIS SECURITY FIX:
  // SECURITY FIX: Add session timestamp for security checks
  if (user) {
    token.iat = Math.floor(Date.now() / 1000)
  }

  // Rest of existing code...
}
```

### In the session callback (around line 216), ADD token validation:

```typescript
// EXISTING CODE:
async session({ session, token }) {
  // SECURITY FIX: Add token age validation
  if (token.iat && (Date.now() / 1000 - token.iat) > 7 * 24 * 60 * 60) {
    logger.warn('Session token expired', { userId: token.sub })
    return null // Force re-authentication
  }
  
  // Send properties to the client
  if (token) {
    session.user.id = token.sub!
    session.user.email = token.email!
    session.user.name = token.name
    session.user.image = token.picture
    // SECURITY: Never expose sensitive token data to client
  }

  return session
},
```

## CRITICAL API ENDPOINT NEEDED:

Create this new secure API endpoint for CSRF tokens:

**`app/api/auth/csrf/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { generateSecureCSRFToken } from '@/lib/security/csrf'
import { env } from '@/lib/config/env'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET })
    
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const csrfToken = generateSecureCSRFToken(token.sub, token.iat || 0)
    
    return NextResponse.json({ csrfToken })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
  }
}
```

## IMMEDIATE ACTION REQUIRED:

1. **Replace session/jwt config** in authentication document (lines 179-187)
2. **Add cookie configuration** after jwt config
3. **Update JWT callback** to include timestamp  
4. **Update session callback** to validate token age
5. **Create CSRF token API endpoint**

These fixes address the critical XSS vulnerability by ensuring JWT tokens are never accessible to client-side JavaScript through httpOnly cookies.