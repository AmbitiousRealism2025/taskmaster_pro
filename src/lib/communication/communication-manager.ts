// Communication Manager - Orchestrates all communication channels
// Part of Phase 3.2 - External Integration Layer

import { EmailService } from './email-service'
import { prisma } from '@/lib/prisma'
import { getNotificationService } from '../notifications/EnhancedNotificationService'
import { 
  CommunicationChannel,
  CommunicationPreferences,
  MessageQueue,
  QueuedMessage,
  CommunicationAnalytics,
  EmailMessage,
  WebhookEndpoint
} from '../../types/email-communication'

export class CommunicationManager {
  private emailService: EmailService
  private notificationService: any
  private messageQueues: Map<string, MessageQueue>
  private processingQueues: Set<string>

  constructor() {
    this.emailService = new EmailService()
    this.notificationService = getNotificationService()
    this.messageQueues = new Map()
    this.processingQueues = new Set()
    this.startQueueProcessing()
  }

  // Get available communication channels
  async getAvailableChannels(userId: string): Promise<CommunicationChannel[]> {
    const channels: CommunicationChannel[] = [
      {
        id: 'email',
        type: 'email',
        name: 'Email',
        description: 'Traditional email communication',
        configuration: {},
        isActive: true,
        priority: 1,
        rateLimits: {
          burst: 10,
          sustained: 100
        },
        fallbackChannels: ['push'],
        filters: []
      },
      {
        id: 'push',
        type: 'push',
        name: 'Push Notifications',
        description: 'Browser and mobile push notifications',
        configuration: {},
        isActive: true,
        priority: 2,
        rateLimits: {
          burst: 20,
          sustained: 200
        },
        fallbackChannels: ['email'],
        filters: []
      },
      {
        id: 'webhook',
        type: 'webhook',
        name: 'Webhooks',
        description: 'HTTP webhook notifications',
        configuration: {},
        isActive: true,
        priority: 3,
        rateLimits: {
          burst: 50,
          sustained: 500
        },
        fallbackChannels: [],
        filters: []
      }
    ]

    // Get user's webhook endpoints
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { userId, isActive: true }
    })

    if (webhooks.length > 0) {
      channels.push({
        id: 'custom_webhook',
        type: 'webhook',
        name: 'Custom Webhooks',
        description: `${webhooks.length} configured webhook endpoint(s)`,
        configuration: { endpoints: webhooks.length },
        isActive: true,
        priority: 4,
        rateLimits: {
          burst: 100,
          sustained: 1000
        },
        fallbackChannels: ['email'],
        filters: []
      })
    }

    return channels
  }

  // Send message through optimal channel
  async sendMessage(
    userId: string,
    message: {
      type: 'transactional' | 'notification' | 'marketing' | 'system'
      priority: 'low' | 'normal' | 'high' | 'urgent'
      subject: string
      content: string
      htmlContent?: string
      recipients: Array<{ email: string; name?: string }>
      templateId?: string
      variables?: Record<string, any>
      preferredChannels?: string[]
      scheduledFor?: Date
      tags?: string[]
      metadata?: Record<string, any>
    }
  ): Promise<{
    success: boolean
    channelUsed: string
    messageId?: string
    queueId?: string
    estimatedDelivery?: Date
  }> {
    try {
      // Get user's communication preferences
      const preferences = await this.getUserPreferences(userId)
      
      // Determine optimal channel
      const channel = await this.selectOptimalChannel(
        userId,
        message,
        preferences
      )

      // Check if message should be queued or sent immediately
      const shouldQueue = message.scheduledFor || 
                         message.priority === 'low' ||
                         message.type === 'marketing'

      if (shouldQueue) {
        return await this.queueMessage(userId, message, channel)
      } else {
        return await this.sendImmediate(userId, message, channel)
      }

    } catch (error) {
      console.error('Send message failed:', error)
      return {
        success: false,
        channelUsed: 'none'
      }
    }
  }

  // Send immediate message
  private async sendImmediate(
    userId: string,
    message: any,
    channel: CommunicationChannel
  ): Promise<{
    success: boolean
    channelUsed: string
    messageId?: string
  }> {
    try {
      switch (channel.type) {
        case 'email':
          return await this.sendViaEmail(userId, message)
        
        case 'push':
          return await this.sendViaPush(userId, message)
        
        case 'webhook':
          return await this.sendViaWebhook(userId, message)
        
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`)
      }
    } catch (error) {
      // Try fallback channels
      for (const fallbackChannelId of channel.fallbackChannels) {
        const fallbackChannel = (await this.getAvailableChannels(userId))
          .find(c => c.id === fallbackChannelId)
        
        if (fallbackChannel) {
          try {
            return await this.sendImmediate(userId, message, fallbackChannel)
          } catch (fallbackError) {
            console.error(`Fallback channel ${fallbackChannelId} failed:`, fallbackError)
          }
        }
      }

      throw error
    }
  }

  // Send via email
  private async sendViaEmail(
    userId: string,
    message: any
  ): Promise<{ success: boolean; channelUsed: string; messageId?: string }> {
    // Get user's default email configuration
    const emailConfig = await prisma.emailConfiguration.findFirst({
      where: { userId, isDefault: true, isActive: true }
    })

    if (!emailConfig) {
      throw new Error('No default email configuration found')
    }

    const emailMessage: Omit<EmailMessage, 'id'> = {
      templateId: message.templateId,
      providerId: emailConfig.providerId,
      from: {
        email: emailConfig.fromEmail,
        name: emailConfig.fromName
      },
      to: message.recipients,
      replyTo: emailConfig.replyTo ? {
        email: emailConfig.replyTo,
        name: emailConfig.fromName
      } : undefined,
      subject: message.subject,
      htmlContent: message.htmlContent || `<p>${message.content}</p>`,
      textContent: message.content,
      priority: message.priority,
      tags: message.tags || [],
      variables: message.variables || {},
      metadata: message.metadata || {}
    }

    const result = await this.emailService.sendEmail(userId, emailMessage)

    return {
      success: result.success,
      channelUsed: 'email',
      messageId: result.messageId
    }
  }

  // Send via push notification
  private async sendViaPush(
    userId: string,
    message: any
  ): Promise<{ success: boolean; channelUsed: string; messageId?: string }> {
    const result = await this.notificationService.sendNotification(
      userId,
      {
        title: message.subject,
        body: message.content,
        data: message.metadata
      },
      message.priority.toUpperCase()
    )

    return {
      success: result.success,
      channelUsed: 'push',
      messageId: result.batchId
    }
  }

  // Send via webhook
  private async sendViaWebhook(
    userId: string,
    message: any
  ): Promise<{ success: boolean; channelUsed: string; messageId?: string }> {
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { userId, isActive: true }
    })

    if (webhooks.length === 0) {
      throw new Error('No active webhooks configured')
    }

    const payload = {
      event: 'message',
      type: message.type,
      priority: message.priority,
      subject: message.subject,
      content: message.content,
      recipients: message.recipients,
      metadata: message.metadata,
      timestamp: new Date().toISOString()
    }

    let successCount = 0
    let lastMessageId = ''

    for (const webhook of webhooks) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': this.generateWebhookSignature(payload, webhook.secret),
            ...webhook.headers
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          successCount++
          lastMessageId = webhook.id
          
          // Update webhook success
          await prisma.webhookEndpoint.update({
            where: { id: webhook.id },
            data: {
              lastDeliveryAt: new Date(),
              lastStatus: response.status,
              failureCount: 0
            }
          })
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error)
        
        // Update webhook failure
        await prisma.webhookEndpoint.update({
          where: { id: webhook.id },
          data: {
            lastStatus: 0,
            failureCount: { increment: 1 }
          }
        })
      }
    }

    return {
      success: successCount > 0,
      channelUsed: 'webhook',
      messageId: lastMessageId
    }
  }

  // Queue message for later delivery
  private async queueMessage(
    userId: string,
    message: any,
    channel: CommunicationChannel
  ): Promise<{
    success: boolean
    channelUsed: string
    queueId: string
    estimatedDelivery: Date
  }> {
    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const queue: MessageQueue = {
      id: queueId,
      type: message.scheduledFor ? 'scheduled' : 'batch',
      priority: this.getPriorityNumber(message.priority),
      messages: message.recipients.map((recipient: any) => ({
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        queueId,
        channelType: channel.type,
        recipient,
        content: {
          subject: message.subject,
          body: message.content,
          htmlBody: message.htmlContent,
          attachments: []
        },
        variables: message.variables || {},
        status: 'queued',
        attempts: 0
      })),
      status: 'pending',
      scheduledFor: message.scheduledFor,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      retryDelay: 300 // 5 minutes
    }

    this.messageQueues.set(queueId, queue)

    // Store in database for persistence
    await prisma.messageQueue.create({
      data: {
        id: queueId,
        userId,
        type: queue.type,
        priority: queue.priority,
        channelType: channel.type,
        status: queue.status,
        scheduledFor: queue.scheduledFor,
        retryCount: queue.retryCount,
        maxRetries: queue.maxRetries,
        retryDelay: queue.retryDelay,
        messageCount: queue.messages.length,
        content: JSON.stringify({
          subject: message.subject,
          content: message.content,
          recipients: message.recipients,
          variables: message.variables
        })
      }
    })

    const estimatedDelivery = message.scheduledFor || 
                             new Date(Date.now() + 60000) // 1 minute from now

    return {
      success: true,
      channelUsed: channel.type,
      queueId,
      estimatedDelivery
    }
  }

  // Process message queues
  private startQueueProcessing(): void {
    setInterval(async () => {
      const now = new Date()
      
      for (const [queueId, queue] of this.messageQueues) {
        if (this.processingQueues.has(queueId)) continue
        
        const shouldProcess = queue.status === 'pending' && 
                            (!queue.scheduledFor || queue.scheduledFor <= now)

        if (shouldProcess) {
          this.processingQueues.add(queueId)
          this.processQueue(queueId, queue).finally(() => {
            this.processingQueues.delete(queueId)
          })
        }
      }
    }, 10000) // Check every 10 seconds

    console.log('Communication Manager: Queue processing started')
  }

  // Process individual queue
  private async processQueue(queueId: string, queue: MessageQueue): Promise<void> {
    try {
      queue.status = 'processing'
      queue.processedAt = new Date()

      let successCount = 0
      let failureCount = 0

      for (const message of queue.messages) {
        if (message.status !== 'queued') continue

        try {
          // Process message based on channel type
          message.attempts++
          message.lastAttemptAt = new Date()

          // Mock processing - in real implementation, send via appropriate channel
          await new Promise(resolve => setTimeout(resolve, 100))
          
          message.status = 'sent'
          message.deliveredAt = new Date()
          successCount++

        } catch (error) {
          console.error(`Message ${message.id} processing failed:`, error)
          
          if (message.attempts < queue.maxRetries) {
            // Will retry later
            message.status = 'queued'
          } else {
            message.status = 'failed'
            message.error = error.message
            failureCount++
          }
        }
      }

      // Update queue status
      if (failureCount === 0) {
        queue.status = 'completed'
        queue.completedAt = new Date()
        this.messageQueues.delete(queueId)
      } else if (successCount === 0) {
        queue.status = 'failed'
        queue.completedAt = new Date()
      } else {
        queue.status = 'pending' // Partial success, will retry failures
      }

      // Update database
      await prisma.messageQueue.update({
        where: { id: queueId },
        data: {
          status: queue.status,
          processedAt: queue.processedAt,
          completedAt: queue.completedAt
        }
      })

    } catch (error) {
      console.error(`Queue ${queueId} processing failed:`, error)
      queue.status = 'failed'
      queue.retryCount++
      
      if (queue.retryCount < queue.maxRetries) {
        // Schedule retry
        setTimeout(() => {
          queue.status = 'pending'
        }, queue.retryDelay * 1000)
      }
    }
  }

  // Get user communication preferences
  private async getUserPreferences(userId: string): Promise<CommunicationPreferences> {
    const preferences = await prisma.communicationPreferences.findUnique({
      where: { userId }
    })

    if (!preferences) {
      // Return default preferences
      return {
        userId,
        channels: {
          email: {
            enabled: true,
            quietHours: {
              enabled: false,
              start: '22:00',
              end: '08:00',
              timezone: 'UTC'
            },
            frequency: {
              marketing: 'weekly',
              transactional: 'all',
              notifications: 'all'
            },
            contentTypes: [],
            languages: ['en']
          },
          push: {
            enabled: true,
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00',
              timezone: 'UTC'
            },
            frequency: {
              marketing: 'never',
              transactional: 'all',
              notifications: 'urgent'
            },
            contentTypes: [],
            languages: ['en']
          }
        },
        globalUnsubscribe: false,
        doNotDisturb: {
          enabled: false
        }
      }
    }

    return {
      userId: preferences.userId,
      channels: JSON.parse(preferences.channels),
      globalUnsubscribe: preferences.globalUnsubscribe,
      doNotDisturb: {
        enabled: preferences.dndEnabled,
        until: preferences.dndUntil
      }
    }
  }

  // Select optimal communication channel
  private async selectOptimalChannel(
    userId: string,
    message: any,
    preferences: CommunicationPreferences
  ): Promise<CommunicationChannel> {
    const availableChannels = await this.getAvailableChannels(userId)
    
    // Filter by user preferences
    let eligibleChannels = availableChannels.filter(channel => {
      const channelPrefs = preferences.channels[channel.type]
      return channelPrefs?.enabled && channel.isActive
    })

    // Apply priority-based selection
    eligibleChannels.sort((a, b) => {
      if (message.priority === 'urgent') {
        // For urgent messages, prefer faster channels
        return a.priority - b.priority
      } else {
        // For normal messages, prefer reliable channels
        return b.priority - a.priority
      }
    })

    // Return the best channel or email as fallback
    return eligibleChannels[0] || availableChannels.find(c => c.type === 'email')!
  }

  // Generate webhook signature
  private generateWebhookSignature(payload: any, secret: string): string {
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return `sha256=${hmac.digest('hex')}`
  }

  // Convert priority to number
  private getPriorityNumber(priority: string): number {
    const priorities = { low: 5, normal: 4, high: 2, urgent: 1 }
    return priorities[priority as keyof typeof priorities] || 4
  }

  // Get communication analytics
  async getCommunicationAnalytics(
    userId: string,
    period: { start: Date; end: Date }
  ): Promise<CommunicationAnalytics> {
    // Get email analytics
    const emailAnalytics = await this.emailService.getEmailAnalytics(
      userId,
      period.start,
      period.end
    )

    // Get message queue analytics
    const queueStats = await prisma.messageQueue.findMany({
      where: {
        userId,
        createdAt: {
          gte: period.start,
          lte: period.end
        }
      }
    })

    const totalMessages = emailAnalytics.totalSent + queueStats.reduce((sum, q) => sum + q.messageCount, 0)
    
    return {
      userId,
      period,
      totalMessages,
      byChannel: {
        email: {
          sent: emailAnalytics.totalSent,
          delivered: emailAnalytics.totalDelivered,
          failed: emailAnalytics.totalFailed,
          deliveryRate: emailAnalytics.deliveryRate
        },
        push: {
          sent: queueStats.filter(q => q.channelType === 'push').reduce((sum, q) => sum + q.messageCount, 0),
          delivered: queueStats.filter(q => q.channelType === 'push' && q.status === 'completed').reduce((sum, q) => sum + q.messageCount, 0),
          failed: queueStats.filter(q => q.channelType === 'push' && q.status === 'failed').reduce((sum, q) => sum + q.messageCount, 0),
          deliveryRate: 95 // Mock data
        }
      },
      byTemplate: {},
      performance: {
        averageDeliveryTime: 30,
        peakSendingHour: 14,
        mostActiveDay: 'Tuesday',
        deliverySuccess: (emailAnalytics.deliveryRate + 95) / 2
      },
      trends: {
        volumeTrend: 'stable',
        deliveryTrend: 'stable',
        engagementTrend: 'stable'
      },
      recommendations: [
        {
          type: 'optimization',
          message: 'Consider using push notifications for urgent messages to improve delivery speed',
          action: 'Configure push notification preferences',
          impact: 'medium'
        }
      ]
    }
  }
}