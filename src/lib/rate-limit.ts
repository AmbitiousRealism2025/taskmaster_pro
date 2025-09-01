import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  windowMs: number
  max: number
  standardHeaders?: boolean
  keyGenerator?: (req: NextRequest) => string
}

// In-memory store for rate limiting (use Redis in production)
const store = new Map<string, { count: number; resetTime: number }>()

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, standardHeaders = true, keyGenerator } = options

  return async (req: NextRequest) => {
    // Generate key for rate limiting
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.ip || 'anonymous'}:${req.nextUrl.pathname}`
    
    const now = Date.now()
    const windowStart = now
    const windowEnd = windowStart + windowMs

    // Get or create rate limit data
    let rateLimitData = store.get(key)
    
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Reset or create new window
      rateLimitData = { count: 0, resetTime: windowEnd }
      store.set(key, rateLimitData)
    }

    // Increment counter
    rateLimitData.count++

    // Check if limit exceeded
    const isBlocked = rateLimitData.count > max
    const remaining = Math.max(0, max - rateLimitData.count)
    const resetTime = Math.ceil(rateLimitData.resetTime / 1000)

    // Create response
    let response: NextResponse

    if (isBlocked) {
      response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitData.resetTime - now) / 1000)} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          success: false
        },
        { status: 429 }
      )
    } else {
      response = NextResponse.next()
    }

    // Add standard rate limit headers
    if (standardHeaders) {
      response.headers.set('X-RateLimit-Limit', max.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetTime.toString())
      
      if (isBlocked) {
        response.headers.set('Retry-After', Math.ceil((rateLimitData.resetTime - now) / 1000).toString())
      }
    }

    return response
  }
}

// Pre-configured rate limiters
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  standardHeaders: true
})

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  standardHeaders: true
})