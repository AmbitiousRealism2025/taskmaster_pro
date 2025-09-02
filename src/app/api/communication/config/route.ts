// API Route for communication configuration and management
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { CommunicationManager } from '@/lib/communication/communication-manager'
import { EmailService } from '@/lib/communication/email-service'
import { z } from 'zod'

const EmailConfigSchema = z.object({
  providerId: z.enum(['smtp', 'sendgrid', 'resend', 'postmark']),
  type: z.enum(['transactional', 'notification', 'marketing', 'system']),
  settings: z.object({
    fromName: z.string().min(1).max(100),
    fromEmail: z.string().email(),
    replyTo: z.string().email().optional(),
    smtpSettings: z.object({
      host: z.string(),
      port: z.number().min(1).max(65535),
      secure: z.boolean(),
      auth: z.object({
        user: z.string(),
        pass: z.string()
      })
    }).optional(),
    apiSettings: z.object({
      apiKey: z.string(),
      endpoint: z.string().url().optional(),
      region: z.string().optional()
    }).optional()
  }),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false)
})

const CommunicationPreferencesSchema = z.object({
  channels: z.record(z.object({
    enabled: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string()
    }),
    frequency: z.object({
      marketing: z.enum(['never', 'weekly', 'monthly']),
      transactional: z.enum(['all', 'important']),
      notifications: z.enum(['all', 'urgent'])
    }),
    contentTypes: z.array(z.string()),
    languages: z.array(z.string())
  })),
  globalUnsubscribe: z.boolean().default(false),
  doNotDisturb: z.object({
    enabled: z.boolean(),
    until: z.string().datetime().optional()
  })
})

const WebhookEndpointSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(1).max(3600).default(300),
    backoffMultiplier: z.number().min(1).max(10).default(2)
  }).optional()
})

const communicationManager = new CommunicationManager()
const emailService = new EmailService()

// Get communication configuration and status
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
    const section = searchParams.get('section')

    if (section === 'providers') {
      // Get available email providers
      const providers = emailService.getAvailableProviders()
      
      // Get user's configured providers
      const userConfigs = await prisma.emailConfiguration.findMany({
        where: { userId: session.user.id! },
        select: {
          providerId: true,
          type: true,
          fromName: true,
          fromEmail: true,
          isActive: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return NextResponse.json({
        available: providers,
        configured: userConfigs,
        summary: {
          totalAvailable: providers.length,
          totalConfigured: userConfigs.length,
          hasDefault: userConfigs.some(config => config.isDefault)
        }
      })
    }

    if (section === 'channels') {
      // Get available communication channels
      const channels = await communicationManager.getAvailableChannels(session.user.id!)
      
      return NextResponse.json({
        channels,
        summary: {
          totalChannels: channels.length,
          activeChannels: channels.filter(c => c.isActive).length
        }
      })
    }

    if (section === 'preferences') {
      // Get user communication preferences
      const preferences = await prisma.communicationPreferences.findUnique({
        where: { userId: session.user.id! }
      })

      if (!preferences) {
        // Return default preferences
        return NextResponse.json({
          channels: {
            email: {
              enabled: true,
              quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
              frequency: { marketing: 'weekly', transactional: 'all', notifications: 'all' },
              contentTypes: [],
              languages: ['en']
            },
            push: {
              enabled: true,
              quietHours: { enabled: true, start: '22:00', end: '08:00', timezone: 'UTC' },
              frequency: { marketing: 'never', transactional: 'all', notifications: 'urgent' },
              contentTypes: [],
              languages: ['en']
            }
          },
          globalUnsubscribe: false,
          doNotDisturb: { enabled: false }
        })
      }

      return NextResponse.json({
        channels: JSON.parse(preferences.channels),
        globalUnsubscribe: preferences.globalUnsubscribe,
        doNotDisturb: {
          enabled: preferences.dndEnabled,
          until: preferences.dndUntil
        }
      })
    }

    if (section === 'webhooks') {
      // Get user's webhook endpoints
      const webhooks = await prisma.webhookEndpoint.findMany({
        where: { userId: session.user.id! },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({
        webhooks: webhooks.map(webhook => ({
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          lastDeliveryAt: webhook.lastDeliveryAt,
          lastStatus: webhook.lastStatus,
          failureCount: webhook.failureCount,
          createdAt: webhook.createdAt
        })),
        summary: {
          total: webhooks.length,
          active: webhooks.filter(w => w.isActive).length,
          failing: webhooks.filter(w => w.failureCount > 0).length
        }
      })
    }

    if (section === 'analytics') {
      // Get communication analytics
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30) // Last 30 days
      
      const analytics = await communicationManager.getCommunicationAnalytics(
        session.user.id!,
        { start: startDate, end: new Date() }
      )

      return NextResponse.json(analytics)
    }

    // Default: Get overview
    const [providers, channels, preferences] = await Promise.all([
      emailService.getAvailableProviders(),
      communicationManager.getAvailableChannels(session.user.id!),
      prisma.communicationPreferences.findUnique({ where: { userId: session.user.id! } })
    ])

    const configuredProviders = await prisma.emailConfiguration.count({
      where: { userId: session.user.id!, isActive: true }
    })

    return NextResponse.json({
      overview: {
        providers: {
          available: providers.length,
          configured: configuredProviders
        },
        channels: {
          available: channels.length,
          active: channels.filter(c => c.isActive).length
        },
        preferences: {
          configured: !!preferences,
          globalUnsubscribe: preferences?.globalUnsubscribe || false
        }
      }
    })

  } catch (error) {
    console.error('Get communication config error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve communication configuration' },
      { status: 500 }
    )
  }
}

// Configure communication settings
export async function POST(request: NextRequest) {
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

    if (action === 'email-provider') {
      // Configure email provider
      const body = await request.json()
      const validatedData = EmailConfigSchema.parse(body)

      await emailService.configureProvider(session.user.id!, validatedData)

      return NextResponse.json({
        success: true,
        message: `${validatedData.providerId} email provider configured successfully`
      })
    }

    if (action === 'webhook') {
      // Add webhook endpoint
      const body = await request.json()
      const validatedData = WebhookEndpointSchema.parse(body)

      const webhook = await prisma.webhookEndpoint.create({
        data: {
          userId: session.user.id!,
          name: validatedData.name,
          url: validatedData.url,
          events: validatedData.events,
          headers: JSON.stringify(validatedData.headers || {}),
          isActive: true,
          secret: generateWebhookSecret(),
          maxRetries: validatedData.retryPolicy?.maxRetries || 3,
          retryDelay: validatedData.retryPolicy?.retryDelay || 300,
          backoffMultiplier: validatedData.retryPolicy?.backoffMultiplier || 2,
          failureCount: 0
        }
      })

      return NextResponse.json({
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          secret: webhook.secret,
          events: webhook.events
        },
        message: 'Webhook endpoint created successfully'
      })
    }

    // Default: Test configuration
    const { testType, providerId } = await request.json()

    if (testType === 'email') {
      // Send test email
      const result = await communicationManager.sendMessage(session.user.id!, {
        type: 'system',
        priority: 'normal',
        subject: 'Test Email from TaskMaster Pro',
        content: 'This is a test email to verify your email configuration is working correctly.',
        htmlContent: '<p>This is a test email to verify your email configuration is working correctly.</p>',
        recipients: [{ email: session.user.email!, name: session.user.name }],
        tags: ['test'],
        metadata: { test: true }
      })

      return NextResponse.json({
        success: result.success,
        channelUsed: result.channelUsed,
        messageId: result.messageId,
        message: result.success 
          ? 'Test email sent successfully'
          : 'Test email failed'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Configure communication error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid configuration data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to configure communication settings' },
      { status: 500 }
    )
  }
}

// Update communication settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')

    if (section === 'preferences') {
      // Update communication preferences
      const body = await request.json()
      const validatedData = CommunicationPreferencesSchema.parse(body)

      await prisma.communicationPreferences.upsert({
        where: { userId: session.user.id! },
        create: {
          userId: session.user.id!,
          channels: JSON.stringify(validatedData.channels),
          globalUnsubscribe: validatedData.globalUnsubscribe,
          dndEnabled: validatedData.doNotDisturb.enabled,
          dndUntil: validatedData.doNotDisturb.until ? new Date(validatedData.doNotDisturb.until) : null
        },
        update: {
          channels: JSON.stringify(validatedData.channels),
          globalUnsubscribe: validatedData.globalUnsubscribe,
          dndEnabled: validatedData.doNotDisturb.enabled,
          dndUntil: validatedData.doNotDisturb.until ? new Date(validatedData.doNotDisturb.until) : null,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Communication preferences updated successfully'
      })
    }

    const { itemId, ...updateData } = await request.json()

    if (section === 'webhook' && itemId) {
      // Update webhook endpoint
      const webhook = await prisma.webhookEndpoint.update({
        where: {
          id: itemId,
          userId: session.user.id!
        },
        data: {
          name: updateData.name,
          url: updateData.url,
          events: updateData.events,
          isActive: updateData.isActive,
          headers: updateData.headers ? JSON.stringify(updateData.headers) : undefined,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive
        },
        message: 'Webhook endpoint updated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Update communication settings error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update communication settings' },
      { status: 500 }
    )
  }
}

// Delete communication configuration
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
    const section = searchParams.get('section')
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    if (section === 'email-provider') {
      // Delete email provider configuration
      await prisma.emailConfiguration.delete({
        where: {
          userId_providerId: {
            userId: session.user.id!,
            providerId: itemId
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Email provider ${itemId} configuration deleted`
      })
    }

    if (section === 'webhook') {
      // Delete webhook endpoint
      await prisma.webhookEndpoint.delete({
        where: {
          id: itemId,
          userId: session.user.id!
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Webhook endpoint deleted successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid delete request' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Delete communication config error:', error)
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500 }
    )
  }
}

// Generate webhook secret
function generateWebhookSecret(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}