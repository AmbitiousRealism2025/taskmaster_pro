/**
 * API Route: RLS Validation Endpoint
 * 
 * Provides security validation for Row-Level Security policies
 * Tests user isolation and data access controls
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createRLSManager } from '@/lib/supabase/rls-manager'

export async function POST(request: NextRequest) {
  try {
    // Get current user from session
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Valid authentication required for RLS validation'
        },
        { status: 401 }
      )
    }

    // Create RLS manager and validate user isolation
    const rlsManager = createRLSManager()
    const validation = await rlsManager.validateUserIsolation(user.id)

    // Log validation result for security monitoring
    console.log(`RLS validation for user ${user.id}:`, {
      passed: validation.overallPassed,
      testCount: validation.tests.length,
      failedTests: validation.tests.filter(t => !t.passed).length
    })

    // Return validation results
    return NextResponse.json(validation)

  } catch (error) {
    console.error('RLS validation error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'RLS validation failed',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only allow GET for development/testing
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not allowed in production' },
        { status: 403 }
      )
    }

    const rlsManager = createRLSManager()
    
    // Get all RLS policies
    const policies = await rlsManager.listPolicies()
    
    // Get performance metrics
    const performance = await rlsManager.monitorRLSPerformance()

    return NextResponse.json({
      policies,
      performance,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching RLS information:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch RLS information'
      },
      { status: 500 }
    )
  }
}