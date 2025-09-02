// Email & Communication System Type Definitions
// Part of Phase 3.2 - External Integration Layer

export interface EmailProvider {
  id: string
  name: string
  displayName: string
  type: 'smtp' | 'api' | 'oauth'
  icon: string
  description: string
  supported: boolean
  rateLimits: {
    perMinute: number
    perHour: number
    perDay: number
  }
  features: EmailFeature[]
}

export interface EmailFeature {
  name: string
  description: string
  enabled: boolean
  requiresAuth: boolean
}

export interface EmailConfiguration {
  providerId: string
  userId: string
  type: 'transactional' | 'notification' | 'marketing' | 'system'
  settings: {
    fromName: string
    fromEmail: string
    replyTo?: string
    smtpSettings?: {
      host: string
      port: number
      secure: boolean
      auth: {
        user: string
        pass: string
      }
    }
    apiSettings?: {
      apiKey: string
      endpoint: string
      region?: string
    }
  }
  templates: EmailTemplate[]
  isActive: boolean
  isDefault: boolean
}

export interface EmailTemplate {
  id: string
  name: string
  description: string
  category: 'transactional' | 'notification' | 'welcome' | 'reminder' | 'report'
  subject: string
  htmlContent: string
  textContent: string
  variables: EmailVariable[]
  previewData: Record<string, any>
  isActive: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface EmailVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'object'
  description: string
  required: boolean
  defaultValue?: any
  example: any
}

export interface EmailMessage {
  id: string
  templateId?: string
  providerId: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  replyTo?: EmailAddress
  subject: string
  htmlContent: string
  textContent?: string
  attachments?: EmailAttachment[]
  headers?: Record<string, string>
  variables?: Record<string, any>
  scheduledFor?: Date
  priority: 'low' | 'normal' | 'high' | 'urgent'
  tags: string[]
  metadata: Record<string, any>
}

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  contentType: string
  size: number
  disposition?: 'attachment' | 'inline'
  contentId?: string // For inline images
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  providerId: string
  recipientCount: number
  deliveredAt?: Date
  error?: {
    code: string
    message: string
    details?: any
  }
  trackingInfo?: {
    opened: boolean
    clicked: boolean
    bounced: boolean
    complained: boolean
    unsubscribed: boolean
  }
  rateLimitInfo?: {
    remaining: number
    resetAt: Date
  }
}

export interface EmailCampaign {
  id: string
  userId: string
  name: string
  description: string
  templateId: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  recipients: EmailRecipient[]
  scheduledFor?: Date
  sentAt?: Date
  completedAt?: Date
  settings: {
    trackOpens: boolean
    trackClicks: boolean
    trackUnsubscribes: boolean
    batchSize: number
    batchDelay: number // seconds
  }
  analytics: EmailCampaignAnalytics
}

export interface EmailRecipient {
  email: string
  name?: string
  variables?: Record<string, any>
  tags: string[]
  metadata: Record<string, any>
}

export interface EmailCampaignAnalytics {
  sent: number
  delivered: number
  bounced: number
  opened: number
  clicked: number
  unsubscribed: number
  complained: number
  openRate: number
  clickRate: number
  bounceRate: number
  unsubscribeRate: number
  topLinks: Array<{
    url: string
    clicks: number
    uniqueClicks: number
  }>
  deviceBreakdown: Record<string, number>
  locationBreakdown: Record<string, number>
}

export interface CommunicationChannel {
  id: string
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams'
  name: string
  description: string
  configuration: Record<string, any>
  isActive: boolean
  priority: number
  rateLimits: {
    burst: number
    sustained: number
  }
  fallbackChannels: string[]
  filters: CommunicationFilter[]
}

export interface CommunicationFilter {
  type: 'user_preference' | 'time_window' | 'frequency_cap' | 'content_type'
  rules: Record<string, any>
  action: 'allow' | 'deny' | 'delay' | 'redirect'
}

export interface CommunicationPreferences {
  userId: string
  channels: Record<string, {
    enabled: boolean
    quietHours: {
      enabled: boolean
      start: string // HH:MM
      end: string // HH:MM
      timezone: string
    }
    frequency: {
      marketing: 'never' | 'weekly' | 'monthly'
      transactional: 'all' | 'important'
      notifications: 'all' | 'urgent'
    }
    contentTypes: string[]
    languages: string[]
  }>
  globalUnsubscribe: boolean
  doNotDisturb: {
    enabled: boolean
    until?: Date
  }
}

export interface MessageQueue {
  id: string
  type: 'immediate' | 'scheduled' | 'batch'
  priority: 1 | 2 | 3 | 4 | 5 // 1 = highest
  messages: QueuedMessage[]
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  scheduledFor?: Date
  createdAt: Date
  processedAt?: Date
  completedAt?: Date
  retryCount: number
  maxRetries: number
  retryDelay: number // seconds
}

export interface QueuedMessage {
  id: string
  queueId: string
  channelType: string
  recipient: EmailAddress
  content: {
    subject?: string
    body: string
    htmlBody?: string
    attachments?: EmailAttachment[]
  }
  variables: Record<string, any>
  status: 'queued' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  lastAttemptAt?: Date
  deliveredAt?: Date
  error?: string
}

export interface CommunicationAnalytics {
  userId: string
  period: {
    start: Date
    end: Date
  }
  totalMessages: number
  byChannel: Record<string, {
    sent: number
    delivered: number
    failed: number
    deliveryRate: number
  }>
  byTemplate: Record<string, {
    usage: number
    deliveryRate: number
    openRate?: number
    clickRate?: number
  }>
  performance: {
    averageDeliveryTime: number // seconds
    peakSendingHour: number
    mostActiveDay: string
    deliverySuccess: number // percentage
  }
  trends: {
    volumeTrend: 'increasing' | 'decreasing' | 'stable'
    deliveryTrend: 'improving' | 'declining' | 'stable'
    engagementTrend: 'increasing' | 'decreasing' | 'stable'
  }
  recommendations: Array<{
    type: 'optimization' | 'warning' | 'opportunity'
    message: string
    action: string
    impact: 'low' | 'medium' | 'high'
  }>
}

export interface WebhookEndpoint {
  id: string
  userId: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  secret: string
  headers: Record<string, string>
  retryPolicy: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  lastDeliveryAt?: Date
  lastStatus?: number
  failureCount: number
}

export interface SMSConfiguration {
  providerId: 'twilio' | 'aws_sns' | 'messagebird'
  credentials: {
    accountSid?: string
    authToken?: string
    from: string
  }
  settings: {
    enableDeliveryReports: boolean
    enableOptOut: boolean
    maxLength: number
  }
  rateLimits: {
    perSecond: number
    perMinute: number
    perHour: number
  }
}

export interface SlackIntegration {
  workspaceId: string
  botToken: string
  userToken?: string
  channels: Array<{
    id: string
    name: string
    private: boolean
  }>
  webhookUrl?: string
  features: {
    commands: boolean
    mentions: boolean
    reactions: boolean
    fileUploads: boolean
  }
}

export interface TeamsIntegration {
  tenantId: string
  clientId: string
  clientSecret: string
  webhookUrl?: string
  channels: Array<{
    id: string
    name: string
    teamId: string
  }>
  features: {
    adaptiveCards: boolean
    mentions: boolean
    reactions: boolean
  }
}