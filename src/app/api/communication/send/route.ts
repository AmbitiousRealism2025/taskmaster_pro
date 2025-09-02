// API Route for sending communications through multiple channels
// Part of Phase 3.2 - External Integration Layer

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { CommunicationManager } from '@/lib/communication/communication-manager'
import { z } from 'zod'

const SendMessageSchema = z.object({
  type: z.enum(['transactional', 'notification', 'marketing', 'system']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  htmlContent: z.string().optional(),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional()
  })).min(1).max(100),
  templateId: z.string().optional(),
  variables: z.record(z.any()).optional(),
  preferredChannels: z.array(z.enum(['email', 'push', 'sms', 'webhook'])).optional(),
  scheduledFor: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
})

const BroadcastMessageSchema = z.object({
  campaignName: z.string().min(1).max(100),
  type: z.enum(['marketing', 'notification', 'system']),
  subject: z.string().min(1).max(200),
  content: z.string().min(1),
  htmlContent: z.string().optional(),
  templateId: z.string().optional(),
  recipientSegment: z.object({
    tags: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional()
  }),
  scheduledFor: z.string().datetime().optional(),
  settings: z.object({
    trackOpens: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
    batchSize: z.number().min(1).max(1000).default(100),
    batchDelay: z.number().min(1).max(3600).default(60)
  }).optional()
})

const communicationManager = new CommunicationManager()

// Send individual message
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
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'broadcast') {
      // Handle broadcast message
      const validatedData = BroadcastMessageSchema.parse(body)
      return await handleBroadcast(session.user.id!, validatedData)
    }

    // Handle individual message
    const validatedData = SendMessageSchema.parse(body)

    const result = await communicationManager.sendMessage(
      session.user.id!,
      {
        type: validatedData.type,
        priority: validatedData.priority,
        subject: validatedData.subject,
        content: validatedData.content,
        htmlContent: validatedData.htmlContent,
        recipients: validatedData.recipients,
        templateId: validatedData.templateId,
        variables: validatedData.variables,
        preferredChannels: validatedData.preferredChannels,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined,
        tags: validatedData.tags,
        metadata: validatedData.metadata
      }
    )

    const response = {
      success: result.success,
      messageId: result.messageId,
      queueId: result.queueId,
      channelUsed: result.channelUsed,
      estimatedDelivery: result.estimatedDelivery,
      recipientCount: validatedData.recipients.length,
      message: result.success 
        ? `Message ${result.queueId ? 'queued' : 'sent'} via ${result.channelUsed}`
        : 'Message delivery failed'
    }

    return NextResponse.json(response, { 
      status: result.success ? 200 : 400 
    })

  } catch (error) {
    console.error('Send communication error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid message data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// Handle broadcast message
async function handleBroadcast(userId: string, data: z.infer<typeof BroadcastMessageSchema>) {
  try {
    // Get recipients based on segment
    const recipients = await getRecipientsFromSegment(data.recipientSegment)

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for the specified segment' },
        { status: 400 }
      )
    }

    if (recipients.length > 10000) {
      return NextResponse.json(
        { error: 'Recipient count exceeds maximum limit (10,000)' },
        { status: 400 }
      )
    }

    // Create campaign record
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId,
        name: data.campaignName,
        description: `Broadcast campaign: ${data.subject}`,
        templateId: data.templateId,
        status: data.scheduledFor ? 'scheduled' : 'draft',
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        settings: JSON.stringify(data.settings || {
          trackOpens: true,
          trackClicks: true,
          batchSize: 100,
          batchDelay: 60
        })
      }
    })

    // Send message through communication manager
    const result = await communicationManager.sendMessage(userId, {
      type: data.type,
      priority: 'normal',
      subject: data.subject,
      content: data.content,
      htmlContent: data.htmlContent,
      recipients,
      templateId: data.templateId,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      tags: ['campaign', campaign.id],
      metadata: {
        campaignId: campaign.id,
        campaignName: data.campaignName,
        broadcast: true
      }
    })

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        status: result.success ? 'sending' : 'failed'
      }
    })

    return NextResponse.json({
      success: result.success,
      campaignId: campaign.id,
      messageId: result.messageId,
      queueId: result.queueId,
      channelUsed: result.channelUsed,
      recipientCount: recipients.length,
      estimatedDelivery: result.estimatedDelivery,
      message: `Broadcast campaign ${result.success ? 'initiated' : 'failed'}`
    })

  } catch (error) {
    console.error('Broadcast campaign error:', error)
    throw error
  }
}

// Get recipients from segment criteria
async function getRecipientsFromSegment(segment: any): Promise<Array<{ email: string; name?: string }>> {
  const where: any = {}

  if (segment.userIds?.length) {
    where.id = { in: segment.userIds }
  }

  if (segment.tags?.length) {
    // This would need to be implemented based on user tagging system
    where.tags = { hasAny: segment.tags }
  }

  // Apply additional filters
  if (segment.filters) {
    Object.assign(where, segment.filters)
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      email: true,
      name: true
    },
    take: 10000 // Maximum limit
  })

  return users.map(user => ({
    email: user.email,
    name: user.name || undefined
  }))
}

// Get message status and history
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
    const messageId = searchParams.get('messageId')
    const queueId = searchParams.get('queueId')
    const campaignId = searchParams.get('campaignId')

    if (messageId) {
      // Get individual message status
      const messageLog = await prisma.emailLog.findFirst({
        where: {
          messageId,
          userId: session.user.id!
        }
      })

      if (!messageLog) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        messageId: messageLog.messageId,
        status: messageLog.success ? 'delivered' : 'failed',
        deliveredAt: messageLog.deliveredAt,
        recipientCount: messageLog.recipientCount,
        error: messageLog.errorMessage,
        metadata: JSON.parse(messageLog.metadata || '{}')
      })
    }

    if (queueId) {
      // Get queue status
      const queue = await prisma.messageQueue.findFirst({
        where: {
          id: queueId,
          userId: session.user.id!
        }
      })

      if (!queue) {
        return NextResponse.json(
          { error: 'Queue not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        queueId: queue.id,
        status: queue.status,
        messageCount: queue.messageCount,
        scheduledFor: queue.scheduledFor,
        processedAt: queue.processedAt,
        completedAt: queue.completedAt,
        retryCount: queue.retryCount
      })
    }

    if (campaignId) {
      // Get campaign status
      const campaign = await prisma.emailCampaign.findFirst({
        where: {
          id: campaignId,
          userId: session.user.id!
        }
      })

      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        campaignId: campaign.id,
        name: campaign.name,
        status: campaign.status,
        scheduledFor: campaign.scheduledFor,
        sentAt: campaign.sentAt,
        completedAt: campaign.completedAt,
        settings: JSON.parse(campaign.settings || '{}')
      })
    }

    // Get recent message history
    const recentMessages = await prisma.emailLog.findMany({
      where: { userId: session.user.id! },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        messageId: true,
        subject: true,
        recipientCount: true,
        success: true,
        deliveredAt: true,
        errorMessage: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      messages: recentMessages,
      total: recentMessages.length
    })

  } catch (error) {
    console.error('Get message status error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve message status' },
      { status: 500 }
    )
  }
}