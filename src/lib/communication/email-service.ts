// Enhanced Email Service Implementation
// Part of Phase 3.2 - External Integration Layer

import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { 
  EmailProvider, 
  EmailConfiguration, 
  EmailMessage, 
  EmailDeliveryResult, 
  EmailTemplate,
  MessageQueue
} from '../../types/email-communication'

export class EmailService {
  private providers: Map<string, EmailProvider>
  private transporters: Map<string, nodemailer.Transporter>
  private rateLimiters: Map<string, RateLimiter>

  constructor() {
    this.providers = new Map()
    this.transporters = new Map()
    this.rateLimiters = new Map()
    this.initializeProviders()
  }

  // Initialize available email providers
  private initializeProviders(): void {
    const providers: EmailProvider[] = [
      {
        id: 'smtp',
        name: 'smtp',
        displayName: 'SMTP Server',
        type: 'smtp',
        icon: '/icons/email.svg',
        description: 'Send emails via SMTP server configuration',
        supported: true,
        rateLimits: {
          perMinute: 60,
          perHour: 1000,
          perDay: 10000
        },
        features: [
          { name: 'HTML Email', description: 'Rich HTML email support', enabled: true, requiresAuth: false },
          { name: 'Attachments', description: 'File attachment support', enabled: true, requiresAuth: false },
          { name: 'Templates', description: 'Email template system', enabled: true, requiresAuth: false }
        ]
      },
      {
        id: 'sendgrid',
        name: 'sendgrid',
        displayName: 'SendGrid',
        type: 'api',
        icon: '/icons/sendgrid.svg',
        description: 'Scalable email delivery via SendGrid API',
        supported: !!(process.env.SENDGRID_API_KEY),
        rateLimits: {
          perMinute: 600,
          perHour: 10000,
          perDay: 100000
        },
        features: [
          { name: 'Analytics', description: 'Email open and click tracking', enabled: true, requiresAuth: true },
          { name: 'Templates', description: 'Dynamic template system', enabled: true, requiresAuth: true },
          { name: 'Webhooks', description: 'Real-time event notifications', enabled: true, requiresAuth: true }
        ]
      },
      {
        id: 'resend',
        name: 'resend',
        displayName: 'Resend',
        type: 'api',
        icon: '/icons/resend.svg',
        description: 'Modern email API for developers',
        supported: !!(process.env.RESEND_API_KEY),
        rateLimits: {
          perMinute: 300,
          perHour: 5000,
          perDay: 50000
        },
        features: [
          { name: 'React Templates', description: 'JSX-based email templates', enabled: true, requiresAuth: true },
          { name: 'Analytics', description: 'Delivery and engagement tracking', enabled: true, requiresAuth: true },
          { name: 'Domain Verification', description: 'Custom domain support', enabled: true, requiresAuth: true }
        ]
      },
      {
        id: 'postmark',
        name: 'postmark',
        displayName: 'Postmark',
        type: 'api',
        icon: '/icons/postmark.svg',
        description: 'Fast transactional email delivery',
        supported: !!(process.env.POSTMARK_API_KEY),
        rateLimits: {
          perMinute: 300,
          perHour: 3600,
          perDay: 50000
        },
        features: [
          { name: 'Fast Delivery', description: 'Optimized for transactional emails', enabled: true, requiresAuth: true },
          { name: 'Bounce Handling', description: 'Automatic bounce management', enabled: true, requiresAuth: true },
          { name: 'Templates', description: 'Template management system', enabled: true, requiresAuth: true }
        ]
      }
    ]

    providers.forEach(provider => {
      this.providers.set(provider.id, provider)
      this.rateLimiters.set(provider.id, new RateLimiter(provider.rateLimits))
    })
  }

  // Get available email providers
  getAvailableProviders(): EmailProvider[] {
    return Array.from(this.providers.values())
  }

  // Configure email provider for a user
  async configureProvider(
    userId: string, 
    configuration: Omit<EmailConfiguration, 'userId'>
  ): Promise<void> {
    const provider = this.providers.get(configuration.providerId)
    if (!provider) {
      throw new Error(`Unsupported email provider: ${configuration.providerId}`)
    }

    // Test the configuration
    await this.testConfiguration(configuration)

    // Store configuration in database
    await prisma.emailConfiguration.upsert({
      where: {
        userId_providerId: {
          userId,
          providerId: configuration.providerId
        }
      },
      create: {
        userId,
        providerId: configuration.providerId,
        type: configuration.type,
        fromName: configuration.settings.fromName,
        fromEmail: configuration.settings.fromEmail,
        replyTo: configuration.settings.replyTo,
        smtpSettings: configuration.settings.smtpSettings ? JSON.stringify(configuration.settings.smtpSettings) : null,
        apiSettings: configuration.settings.apiSettings ? JSON.stringify(configuration.settings.apiSettings) : null,
        isActive: configuration.isActive,
        isDefault: configuration.isDefault
      },
      update: {
        type: configuration.type,
        fromName: configuration.settings.fromName,
        fromEmail: configuration.settings.fromEmail,
        replyTo: configuration.settings.replyTo,
        smtpSettings: configuration.settings.smtpSettings ? JSON.stringify(configuration.settings.smtpSettings) : null,
        apiSettings: configuration.settings.apiSettings ? JSON.stringify(configuration.settings.apiSettings) : null,
        isActive: configuration.isActive,
        isDefault: configuration.isDefault
      }
    })

    // Create transporter if SMTP
    if (provider.type === 'smtp' && configuration.settings.smtpSettings) {
      const transporter = nodemailer.createTransporter(configuration.settings.smtpSettings)
      this.transporters.set(`${userId}_${configuration.providerId}`, transporter)
    }
  }

  // Test email configuration
  private async testConfiguration(configuration: EmailConfiguration): Promise<void> {
    const provider = this.providers.get(configuration.providerId)!

    try {
      if (provider.type === 'smtp' && configuration.settings.smtpSettings) {
        const transporter = nodemailer.createTransporter(configuration.settings.smtpSettings)
        await transporter.verify()
      } else if (provider.type === 'api' && configuration.settings.apiSettings) {
        // Test API configuration based on provider
        await this.testApiConfiguration(configuration.providerId, configuration.settings.apiSettings)
      }
    } catch (error) {
      throw new Error(`Email configuration test failed: ${error.message}`)
    }
  }

  // Test API configuration for different providers
  private async testApiConfiguration(providerId: string, apiSettings: any): Promise<void> {
    switch (providerId) {
      case 'sendgrid':
        const sgResponse = await fetch('https://api.sendgrid.com/v3/user/account', {
          headers: {
            'Authorization': `Bearer ${apiSettings.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        if (!sgResponse.ok) throw new Error('SendGrid API key validation failed')
        break

      case 'resend':
        const resendResponse = await fetch('https://api.resend.com/domains', {
          headers: {
            'Authorization': `Bearer ${apiSettings.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
        if (!resendResponse.ok) throw new Error('Resend API key validation failed')
        break

      case 'postmark':
        const pmResponse = await fetch('https://api.postmarkapp.com/account', {
          headers: {
            'X-Postmark-Account-Token': apiSettings.apiKey,
            'Content-Type': 'application/json'
          }
        })
        if (!pmResponse.ok) throw new Error('Postmark API key validation failed')
        break

      default:
        throw new Error(`API test not implemented for provider: ${providerId}`)
    }
  }

  // Send email message
  async sendEmail(
    userId: string,
    message: Omit<EmailMessage, 'id'>
  ): Promise<EmailDeliveryResult> {
    try {
      // Get user's email configuration
      const configuration = await this.getUserConfiguration(userId, message.providerId)
      if (!configuration) {
        throw new Error(`No email configuration found for provider: ${message.providerId}`)
      }

      // Check rate limits
      const rateLimiter = this.rateLimiters.get(message.providerId)!
      if (!rateLimiter.checkLimit()) {
        throw new Error('Rate limit exceeded')
      }

      // Process template if specified
      let processedMessage = message
      if (message.templateId) {
        processedMessage = await this.processTemplate(message)
      }

      // Send via appropriate provider
      const provider = this.providers.get(message.providerId)!
      let result: EmailDeliveryResult

      if (provider.type === 'smtp') {
        result = await this.sendViaSMTP(userId, configuration, processedMessage)
      } else {
        result = await this.sendViaAPI(configuration, processedMessage)
      }

      // Log email activity
      await this.logEmailActivity(userId, processedMessage, result)

      return result

    } catch (error) {
      console.error('Email send failed:', error)
      
      const result: EmailDeliveryResult = {
        success: false,
        providerId: message.providerId,
        recipientCount: message.to.length,
        error: {
          code: 'SEND_FAILED',
          message: error.message
        }
      }

      await this.logEmailActivity(userId, message, result)
      return result
    }
  }

  // Send email via SMTP
  private async sendViaSMTP(
    userId: string,
    configuration: any,
    message: EmailMessage
  ): Promise<EmailDeliveryResult> {
    const transporterKey = `${userId}_${configuration.providerId}`
    let transporter = this.transporters.get(transporterKey)

    if (!transporter) {
      const smtpSettings = JSON.parse(configuration.smtpSettings)
      transporter = nodemailer.createTransporter(smtpSettings)
      this.transporters.set(transporterKey, transporter)
    }

    const mailOptions = {
      from: `${configuration.fromName} <${configuration.fromEmail}>`,
      to: message.to.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      cc: message.cc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      bcc: message.bcc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      replyTo: message.replyTo ? `${message.replyTo.name} <${message.replyTo.email}>` : configuration.replyTo,
      subject: message.subject,
      html: message.htmlContent,
      text: message.textContent,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: 'base64',
        cid: att.contentId
      })),
      headers: message.headers
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
      providerId: message.providerId,
      recipientCount: message.to.length,
      deliveredAt: new Date()
    }
  }

  // Send email via API
  private async sendViaAPI(
    configuration: any,
    message: EmailMessage
  ): Promise<EmailDeliveryResult> {
    const apiSettings = JSON.parse(configuration.apiSettings)
    
    switch (configuration.providerId) {
      case 'sendgrid':
        return await this.sendViaSendGrid(apiSettings, configuration, message)
      case 'resend':
        return await this.sendViaResend(apiSettings, configuration, message)
      case 'postmark':
        return await this.sendViaPostmark(apiSettings, configuration, message)
      default:
        throw new Error(`API sending not implemented for provider: ${configuration.providerId}`)
    }
  }

  // Send via SendGrid
  private async sendViaSendGrid(
    apiSettings: any,
    configuration: any,
    message: EmailMessage
  ): Promise<EmailDeliveryResult> {
    const payload = {
      personalizations: [{
        to: message.to.map(addr => ({ email: addr.email, name: addr.name })),
        cc: message.cc?.map(addr => ({ email: addr.email, name: addr.name })),
        bcc: message.bcc?.map(addr => ({ email: addr.email, name: addr.name })),
        subject: message.subject
      }],
      from: {
        email: configuration.fromEmail,
        name: configuration.fromName
      },
      reply_to: message.replyTo ? {
        email: message.replyTo.email,
        name: message.replyTo.name
      } : undefined,
      content: [
        { type: 'text/html', value: message.htmlContent },
        ...(message.textContent ? [{ type: 'text/plain', value: message.textContent }] : [])
      ],
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.contentType,
        disposition: att.disposition || 'attachment',
        content_id: att.contentId
      })),
      headers: message.headers,
      categories: message.tags,
      custom_args: message.metadata
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSettings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`SendGrid API error: ${errorData.errors?.[0]?.message || response.statusText}`)
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || undefined,
      providerId: 'sendgrid',
      recipientCount: message.to.length,
      deliveredAt: new Date(),
      rateLimitInfo: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '1000'),
        resetAt: new Date(Date.now() + 60000) // SendGrid resets per minute
      }
    }
  }

  // Send via Resend
  private async sendViaResend(
    apiSettings: any,
    configuration: any,
    message: EmailMessage
  ): Promise<EmailDeliveryResult> {
    const payload = {
      from: `${configuration.fromName} <${configuration.fromEmail}>`,
      to: message.to.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      cc: message.cc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      bcc: message.bcc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email),
      reply_to: message.replyTo ? `${message.replyTo.name} <${message.replyTo.email}>` : undefined,
      subject: message.subject,
      html: message.htmlContent,
      text: message.textContent,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        content: att.content
      })),
      headers: message.headers,
      tags: message.tags
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSettings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Resend API error: ${errorData.message || response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      messageId: result.id,
      providerId: 'resend',
      recipientCount: message.to.length,
      deliveredAt: new Date(),
      rateLimitInfo: {
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '1000'),
        resetAt: new Date(parseInt(response.headers.get('x-ratelimit-reset') || '0') * 1000)
      }
    }
  }

  // Send via Postmark
  private async sendViaPostmark(
    apiSettings: any,
    configuration: any,
    message: EmailMessage
  ): Promise<EmailDeliveryResult> {
    const payload = {
      From: `${configuration.fromName} <${configuration.fromEmail}>`,
      To: message.to.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(','),
      Cc: message.cc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(','),
      Bcc: message.bcc?.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(','),
      ReplyTo: message.replyTo ? `${message.replyTo.name} <${message.replyTo.email}>` : undefined,
      Subject: message.subject,
      HtmlBody: message.htmlContent,
      TextBody: message.textContent,
      Attachments: message.attachments?.map(att => ({
        Name: att.filename,
        Content: att.content,
        ContentType: att.contentType,
        ContentID: att.contentId
      })),
      Headers: Object.entries(message.headers || {}).map(([Name, Value]) => ({ Name, Value })),
      Tag: message.tags[0], // Postmark supports single tag
      Metadata: message.metadata
    }

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': apiSettings.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Postmark API error: ${errorData.Message || response.statusText}`)
    }

    const result = await response.json()

    return {
      success: true,
      messageId: result.MessageID,
      providerId: 'postmark',
      recipientCount: message.to.length,
      deliveredAt: new Date()
    }
  }

  // Process email template
  private async processTemplate(message: EmailMessage): Promise<EmailMessage> {
    if (!message.templateId) return message

    const template = await prisma.emailTemplate.findUnique({
      where: { id: message.templateId }
    })

    if (!template) {
      throw new Error(`Email template not found: ${message.templateId}`)
    }

    // Replace variables in template
    const variables = message.variables || {}
    let processedHtml = template.htmlContent
    let processedText = template.textContent
    let processedSubject = template.subject

    // Simple variable replacement (in production, use a proper template engine)
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      processedHtml = processedHtml.replace(placeholder, String(value))
      processedText = processedText.replace(placeholder, String(value))
      processedSubject = processedSubject.replace(placeholder, String(value))
    }

    return {
      ...message,
      subject: message.subject || processedSubject,
      htmlContent: processedHtml,
      textContent: processedText
    }
  }

  // Get user's email configuration
  private async getUserConfiguration(userId: string, providerId: string) {
    return await prisma.emailConfiguration.findUnique({
      where: {
        userId_providerId: { userId, providerId }
      }
    })
  }

  // Log email activity
  private async logEmailActivity(
    userId: string, 
    message: EmailMessage, 
    result: EmailDeliveryResult
  ): Promise<void> {
    await prisma.emailLog.create({
      data: {
        userId,
        providerId: message.providerId,
        templateId: message.templateId,
        recipientCount: message.to.length,
        subject: message.subject,
        success: result.success,
        messageId: result.messageId,
        deliveredAt: result.deliveredAt,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        tags: message.tags,
        metadata: JSON.stringify(message.metadata)
      }
    })
  }

  // Get email analytics
  async getEmailAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const logs = await prisma.emailLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const totalSent = logs.length
    const totalDelivered = logs.filter(log => log.success).length
    const totalFailed = totalSent - totalDelivered

    const byProvider = logs.reduce((acc, log) => {
      if (!acc[log.providerId]) {
        acc[log.providerId] = { sent: 0, delivered: 0, failed: 0 }
      }
      acc[log.providerId].sent++
      if (log.success) {
        acc[log.providerId].delivered++
      } else {
        acc[log.providerId].failed++
      }
      return acc
    }, {} as Record<string, any>)

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      byProvider,
      period: { startDate, endDate }
    }
  }
}

// Simple rate limiter implementation
class RateLimiter {
  private requests: number[]
  private limits: { perMinute: number; perHour: number; perDay: number }

  constructor(limits: { perMinute: number; perHour: number; perDay: number }) {
    this.requests = []
    this.limits = limits
  }

  checkLimit(): boolean {
    const now = Date.now()
    const oneMinute = 60 * 1000
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * 60 * 60 * 1000

    // Clean old requests
    this.requests = this.requests.filter(time => now - time < oneDay)

    // Check limits
    const lastMinute = this.requests.filter(time => now - time < oneMinute).length
    const lastHour = this.requests.filter(time => now - time < oneHour).length
    const lastDay = this.requests.length

    if (lastMinute >= this.limits.perMinute) return false
    if (lastHour >= this.limits.perHour) return false
    if (lastDay >= this.limits.perDay) return false

    // Add current request
    this.requests.push(now)
    return true
  }
}