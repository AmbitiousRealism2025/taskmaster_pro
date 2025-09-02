// API Route for OAuth provider management
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { OAuthProviderManager } from '@/lib/oauth/oauth-provider-manager'

const oauthManager = new OAuthProviderManager()

// Get available OAuth providers and connection status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      // Get integration status for all providers
      const integrationStatus = await oauthManager.getIntegrationStatus(session.user.id!)
      
      return NextResponse.json({
        integrations: integrationStatus,
        summary: {
          totalConnected: integrationStatus.filter(s => s.connected).length,
          needReauth: integrationStatus.filter(s => s.needsReauth).length,
          totalProviders: integrationStatus.length
        }
      })
    } else if (action === 'metrics') {
      // Get provider metrics (admin only)
      const isAdmin = session.user.role === 'admin'
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      const metrics = await oauthManager.getProviderMetrics()
      return NextResponse.json({ metrics })
    }

    // Default: Get available providers
    const providers = oauthManager.getAvailableProviders()
    const integrationStatus = await oauthManager.getIntegrationStatus(session.user.id!)

    // Combine provider info with user's connection status
    const providersWithStatus = providers.map(provider => {
      const status = integrationStatus.find(s => s.providerId === provider.id)
      return {
        ...provider,
        connected: status?.connected || false,
        needsReauth: status?.needsReauth || false,
        services: status?.services || [],
        lastSync: status?.lastSync,
        quotaUsage: status?.quotaUsage
      }
    })

    return NextResponse.json({
      providers: providersWithStatus,
      summary: {
        available: providers.length,
        enabled: providers.filter(p => p.enabled).length,
        connected: providersWithStatus.filter(p => p.connected).length
      }
    })

  } catch (error) {
    console.error('Get OAuth providers error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve OAuth providers' },
      { status: 500 }
    )
  }
}