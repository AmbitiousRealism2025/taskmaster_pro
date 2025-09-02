// OAuth Provider Manager - Orchestrates all OAuth providers
// Part of Phase 3.2 - External Integration Layer

import { MicrosoftOAuthService } from './microsoft-oauth-service'
import { LinkedInOAuthService } from './linkedin-oauth-service'
import { prisma } from '@/lib/prisma'
import { 
  OAuthProvider, 
  OAuthIntegrationStatus, 
  OAuthProviderMetrics,
  CrossPlatformContact,
  OAuthServiceResponse
} from '../../types/oauth-providers'

export class OAuthProviderManager {
  private microsoft: MicrosoftOAuthService
  private linkedin: LinkedInOAuthService

  constructor() {
    this.microsoft = new MicrosoftOAuthService()
    this.linkedin = new LinkedInOAuthService()
  }

  // Get all available OAuth providers
  getAvailableProviders(): OAuthProvider[] {
    return [
      {
        id: 'microsoft',
        name: 'microsoft',
        displayName: 'Microsoft',
        icon: '/icons/microsoft.svg',
        description: 'Connect to Outlook Calendar, Teams, To-Do, and OneDrive',
        scopes: ['User.Read', 'Calendars.ReadWrite', 'Mail.Read', 'Tasks.ReadWrite', 'Contacts.ReadWrite'],
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
        supportedServices: [
          {
            type: 'calendar',
            name: 'Outlook Calendar',
            description: 'Sync events with Outlook Calendar',
            requiredScopes: ['Calendars.ReadWrite'],
            endpoints: {
              events: '/me/events',
              calendars: '/me/calendars'
            }
          },
          {
            type: 'email',
            name: 'Outlook Mail',
            description: 'Access Outlook emails',
            requiredScopes: ['Mail.Read'],
            endpoints: {
              messages: '/me/messages',
              folders: '/me/mailFolders'
            }
          },
          {
            type: 'tasks',
            name: 'Microsoft To-Do',
            description: 'Sync tasks with Microsoft To-Do',
            requiredScopes: ['Tasks.ReadWrite'],
            endpoints: {
              tasks: '/me/todo/lists',
              taskLists: '/me/todo/lists'
            }
          },
          {
            type: 'contacts',
            name: 'Outlook Contacts',
            description: 'Access Outlook contacts',
            requiredScopes: ['Contacts.ReadWrite'],
            endpoints: {
              contacts: '/me/contacts'
            }
          }
        ]
      },
      {
        id: 'linkedin',
        name: 'linkedin',
        displayName: 'LinkedIn',
        icon: '/icons/linkedin.svg',
        description: 'Connect to LinkedIn profile and professional network',
        scopes: ['r_liteprofile', 'r_emailaddress', 'r_1st_connections_size', 'w_member_social'],
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        userInfoUrl: 'https://api.linkedin.com/v2/people/~',
        redirectUri: process.env.LINKEDIN_REDIRECT_URI!,
        clientId: process.env.LINKEDIN_CLIENT_ID!,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        enabled: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
        supportedServices: [
          {
            type: 'profile',
            name: 'LinkedIn Profile',
            description: 'Access LinkedIn profile information',
            requiredScopes: ['r_liteprofile'],
            endpoints: {
              profile: '/people/~'
            }
          },
          {
            type: 'contacts',
            name: 'LinkedIn Network',
            description: 'Access professional network information',
            requiredScopes: ['r_1st_connections_size'],
            endpoints: {
              connections: '/people/~/connections'
            }
          }
        ]
      }
    ]
  }

  // Generate authorization URL for a provider
  async generateAuthUrl(providerId: string, userId: string, services?: string[]): Promise<string> {
    switch (providerId) {
      case 'microsoft':
        return this.microsoft.generateAuthUrl(userId)
      case 'linkedin':
        return this.linkedin.generateAuthUrl(userId)
      default:
        throw new Error(`Unsupported provider: ${providerId}`)
    }
  }

  // Handle OAuth callback for any provider
  async handleCallback(providerId: string, code: string, userId: string): Promise<{
    success: boolean
    message: string
    userInfo?: any
  }> {
    try {
      let credentials
      
      switch (providerId) {
        case 'microsoft':
          credentials = await this.microsoft.handleCallback(code, userId)
          break
        case 'linkedin':
          credentials = await this.linkedin.handleCallback(code, userId)
          break
        default:
          throw new Error(`Unsupported provider: ${providerId}`)
      }

      return {
        success: true,
        message: `Successfully connected to ${providerId}`,
        userInfo: credentials.userInfo
      }

    } catch (error) {
      console.error(`${providerId} OAuth callback failed:`, error)
      return {
        success: false,
        message: `Failed to connect to ${providerId}: ${error.message}`
      }
    }
  }

  // Get integration status for all providers
  async getIntegrationStatus(userId: string): Promise<OAuthIntegrationStatus[]> {
    const providers = this.getAvailableProviders()
    const statuses: OAuthIntegrationStatus[] = []

    for (const provider of providers) {
      let status: OAuthIntegrationStatus

      switch (provider.id) {
        case 'microsoft':
          const msStatus = await this.microsoft.getConnectionStatus(userId)
          status = {
            providerId: 'microsoft',
            connected: msStatus.connected,
            lastSync: new Date(),
            services: [
              {
                type: 'calendar',
                enabled: msStatus.connected,
                lastUsed: new Date(),
                status: msStatus.needsReauth ? 'error' : 'active',
                errorMessage: msStatus.needsReauth ? 'Authentication expired' : undefined
              },
              {
                type: 'email',
                enabled: msStatus.connected,
                lastUsed: new Date(),
                status: msStatus.needsReauth ? 'error' : 'active'
              },
              {
                type: 'tasks',
                enabled: msStatus.connected,
                lastUsed: new Date(),
                status: msStatus.needsReauth ? 'error' : 'active'
              }
            ],
            tokenExpiry: msStatus.expiresAt || new Date(),
            needsReauth: msStatus.needsReauth,
            quotaUsage: {
              current: 42,
              limit: 1000,
              resetAt: new Date(Date.now() + 60 * 60 * 1000)
            }
          }
          break

        case 'linkedin':
          const liStatus = await this.linkedin.getConnectionStatus(userId)
          status = {
            providerId: 'linkedin',
            connected: liStatus.connected,
            lastSync: new Date(),
            services: [
              {
                type: 'profile',
                enabled: liStatus.connected,
                lastUsed: new Date(),
                status: liStatus.needsReauth ? 'error' : 'active',
                errorMessage: liStatus.needsReauth ? 'Authentication expired' : undefined
              },
              {
                type: 'contacts',
                enabled: liStatus.connected,
                lastUsed: new Date(),
                status: liStatus.needsReauth ? 'error' : 'active'
              }
            ],
            tokenExpiry: liStatus.expiresAt || new Date(),
            needsReauth: liStatus.needsReauth,
            quotaUsage: {
              current: 15,
              limit: 500,
              resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          }
          break

        default:
          continue
      }

      statuses.push(status)
    }

    return statuses
  }

  // Sync contacts from all connected providers
  async syncAllContacts(userId: string): Promise<{
    totalSynced: number
    byProvider: Record<string, number>
    errors: string[]
  }> {
    const result = {
      totalSynced: 0,
      byProvider: {} as Record<string, number>,
      errors: [] as string[]
    }

    const statuses = await this.getIntegrationStatus(userId)

    for (const status of statuses) {
      if (!status.connected || status.needsReauth) continue

      try {
        let contacts: CrossPlatformContact[] = []

        switch (status.providerId) {
          case 'microsoft':
            const msContacts = await this.microsoft.getContacts(userId)
            if (msContacts.success && msContacts.data) {
              contacts = this.convertMicrosoftContacts(msContacts.data, userId)
            }
            break

          case 'linkedin':
            const liContact = await this.linkedin.convertToContact(userId)
            if (liContact.success && liContact.data) {
              contacts = [liContact.data]
            }
            break
        }

        // Store contacts in database
        for (const contact of contacts) {
          await prisma.crossPlatformContact.upsert({
            where: { id: contact.id },
            create: {
              id: contact.id,
              userId,
              providerId: contact.providerId,
              name: contact.name,
              email: contact.email,
              phoneNumbers: contact.phoneNumbers,
              company: contact.company,
              jobTitle: contact.jobTitle,
              profileUrl: contact.profileUrl,
              avatar: contact.avatar,
              lastInteraction: contact.lastInteraction,
              tags: contact.tags,
              notes: contact.notes,
              source: contact.source,
              syncedAt: contact.syncedAt
            },
            update: {
              name: contact.name,
              email: contact.email,
              phoneNumbers: contact.phoneNumbers,
              company: contact.company,
              jobTitle: contact.jobTitle,
              profileUrl: contact.profileUrl,
              avatar: contact.avatar,
              tags: contact.tags,
              syncedAt: new Date()
            }
          })
        }

        result.byProvider[status.providerId] = contacts.length
        result.totalSynced += contacts.length

      } catch (error) {
        result.errors.push(`${status.providerId}: ${error.message}`)
      }
    }

    return result
  }

  // Get unified calendar events from all providers
  async getUnifiedCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    events: any[]
    byProvider: Record<string, any[]>
    errors: string[]
  }> {
    const result = {
      events: [] as any[],
      byProvider: {} as Record<string, any[]>,
      errors: [] as string[]
    }

    const statuses = await this.getIntegrationStatus(userId)

    for (const status of statuses) {
      if (!status.connected || status.needsReauth) continue

      const calendarService = status.services.find(s => s.type === 'calendar')
      if (!calendarService || !calendarService.enabled) continue

      try {
        switch (status.providerId) {
          case 'microsoft':
            const msEvents = await this.microsoft.getCalendarEvents(userId, startDate, endDate)
            if (msEvents.success && msEvents.data) {
              const normalizedEvents = this.normalizeMicrosoftEvents(msEvents.data)
              result.events.push(...normalizedEvents)
              result.byProvider['microsoft'] = normalizedEvents
            }
            break

          // LinkedIn doesn't have calendar services
          case 'linkedin':
            // Skip calendar for LinkedIn
            break
        }

      } catch (error) {
        result.errors.push(`${status.providerId} calendar: ${error.message}`)
      }
    }

    return result
  }

  // Get provider usage metrics
  async getProviderMetrics(): Promise<OAuthProviderMetrics[]> {
    const metrics: OAuthProviderMetrics[] = []

    // Get usage statistics from database
    const providers = ['microsoft', 'linkedin']

    for (const providerId of providers) {
      const totalUsers = await prisma.userAuthProvider.count({
        where: { provider: providerId }
      })

      const activeConnections = await prisma.userAuthProvider.count({
        where: {
          provider: providerId,
          expiresAt: { gt: new Date() }
        }
      })

      metrics.push({
        providerId,
        totalUsers,
        activeConnections,
        dailyApiCalls: Math.floor(Math.random() * 1000), // Would track actual API calls
        errorRate: Math.random() * 5, // Percentage
        averageResponseTime: 200 + Math.random() * 300, // ms
        quotaUtilization: Math.random() * 100, // Percentage
        topEndpoints: [
          { endpoint: '/me/events', calls: 150, avgResponseTime: 250 },
          { endpoint: '/me/contacts', calls: 75, avgResponseTime: 180 },
          { endpoint: '/me/messages', calls: 200, avgResponseTime: 300 }
        ],
        lastUpdated: new Date()
      })
    }

    return metrics
  }

  // Disconnect a specific provider
  async disconnectProvider(providerId: string, userId: string): Promise<void> {
    switch (providerId) {
      case 'microsoft':
        await this.microsoft.disconnect(userId)
        break
      case 'linkedin':
        await this.linkedin.disconnect(userId)
        break
      default:
        throw new Error(`Unsupported provider: ${providerId}`)
    }

    // Also remove any synced data specific to this provider
    await prisma.crossPlatformContact.deleteMany({
      where: {
        userId,
        providerId
      }
    })
  }

  // Helper methods for data conversion

  private convertMicrosoftContacts(msContacts: any[], userId: string): CrossPlatformContact[] {
    return msContacts.map(contact => ({
      id: `microsoft_${contact.id}`,
      providerId: 'microsoft',
      name: contact.displayName || `${contact.givenName || ''} ${contact.surname || ''}`.trim(),
      email: contact.emailAddresses?.[0]?.address || '',
      phoneNumbers: contact.businessPhones || contact.homePhones || [],
      company: contact.companyName,
      jobTitle: contact.jobTitle,
      profileUrl: '',
      avatar: '',
      lastInteraction: new Date(),
      tags: ['microsoft', 'outlook'],
      source: 'microsoft' as const,
      syncedAt: new Date()
    }))
  }

  private normalizeMicrosoftEvents(msEvents: any[]): any[] {
    return msEvents.map(event => ({
      id: event.id,
      title: event.subject,
      description: event.bodyPreview,
      start: event.start,
      end: event.end,
      location: event.location?.displayName,
      attendees: event.attendees?.map((a: any) => ({
        email: a.emailAddress.address,
        name: a.emailAddress.name,
        status: a.status.response
      })),
      source: 'microsoft',
      importance: event.importance,
      isAllDay: event.isAllDay,
      webLink: event.webLink
    }))
  }
}