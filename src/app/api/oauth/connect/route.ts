// API Route for OAuth provider connection
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { OAuthProviderManager } from '@/lib/oauth/oauth-provider-manager'
import { z } from 'zod'

const ConnectProviderSchema = z.object({
  providerId: z.enum(['microsoft', 'linkedin']),
  services: z.array(z.string()).optional(),
  redirectUrl: z.string().url().optional()
})

const CallbackSchema = z.object({
  providerId: z.enum(['microsoft', 'linkedin']),
  code: z.string(),
  state: z.string().optional()
})

const oauthManager = new OAuthProviderManager()

// Generate OAuth authorization URL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = ConnectProviderSchema.parse(body)

    const authUrl = await oauthManager.generateAuthUrl(
      validatedData.providerId,
      session.user.id!,
      validatedData.services
    )

    return NextResponse.json({
      success: true,
      authUrl,
      providerId: validatedData.providerId,
      message: `Authorization URL generated for ${validatedData.providerId}`
    })

  } catch (error) {
    console.error('OAuth connect error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

// Handle OAuth callback
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CallbackSchema.parse(body)

    // Verify state parameter matches user ID for security
    if (validatedData.state && validatedData.state !== session.user.id) {
      return NextResponse.json(
        { error: 'Invalid authorization state' },
        { status: 400 }
      )
    }

    const result = await oauthManager.handleCallback(
      validatedData.providerId,
      validatedData.code,
      session.user.id!
    )

    if (result.success) {
      // Start initial sync after successful connection
      try {
        if (validatedData.providerId === 'microsoft') {
          // Sync calendar events and contacts
          setTimeout(async () => {
            try {
              await oauthManager.syncAllContacts(session.user.id!)
            } catch (syncError) {
              console.error('Initial sync failed:', syncError)
            }
          }, 1000)
        }
      } catch (syncError) {
        console.warn('Initial sync scheduling failed:', syncError)
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        userInfo: result.userInfo,
        providerId: validatedData.providerId
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('OAuth callback error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid callback data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to complete OAuth callback' },
      { status: 500 }
    )
  }
}

// Disconnect OAuth provider
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    if (!providerId || !['microsoft', 'linkedin'].includes(providerId)) {
      return NextResponse.json(
        { error: 'Valid provider ID is required' },
        { status: 400 }
      )
    }

    await oauthManager.disconnectProvider(providerId, session.user.id!)

    return NextResponse.json({
      success: true,
      message: `Successfully disconnected from ${providerId}`,
      providerId
    })

  } catch (error) {
    console.error('OAuth disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect OAuth provider' },
      { status: 500 }
    )
  }
}