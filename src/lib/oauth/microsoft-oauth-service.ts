// Microsoft OAuth Service Implementation
// Part of Phase 3.2 - External Integration Layer

import { prisma } from '@/lib/prisma'
import { 
  OAuthCredentials, 
  OAuthTokenResponse, 
  OAuthUserInfo,
  MicrosoftCalendarEvent,
  MicrosoftTask,
  OAuthServiceResponse 
} from '../../types/oauth-providers'

export class MicrosoftOAuthService {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0'
  private readonly authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
  private readonly tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  
  private readonly clientId = process.env.MICROSOFT_CLIENT_ID!
  private readonly clientSecret = process.env.MICROSOFT_CLIENT_SECRET!
  private readonly redirectUri = process.env.MICROSOFT_REDIRECT_URI!

  private readonly scopes = [
    'User.Read',           // Basic profile
    'Calendars.ReadWrite', // Calendar access
    'Mail.Read',          // Email read access
    'Tasks.ReadWrite',    // Tasks access
    'Contacts.ReadWrite', // Contacts access
    'offline_access'      // Refresh token
  ]

  // Generate authorization URL
  generateAuthUrl(userId: string, requestedScopes?: string[]): string {
    const scopes = requestedScopes || this.scopes
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: userId,
      response_mode: 'query',
      prompt: 'consent' // Force consent screen to ensure refresh token
    })

    return `${this.authUrl}?${params.toString()}`
  }

  // Handle OAuth callback and exchange code for tokens
  async handleCallback(code: string, userId: string): Promise<OAuthCredentials> {
    try {
      const tokenResponse = await this.exchangeCodeForTokens(code)
      const userInfo = await this.getUserInfo(tokenResponse.access_token)
      
      const credentials: OAuthCredentials = {
        providerId: 'microsoft',
        userId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        scope: tokenResponse.scope.split(' '),
        tokenType: tokenResponse.token_type,
        providerUserId: userInfo.id,
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
          profilePicture: userInfo.picture,
          additionalData: userInfo.provider_specific
        }
      }

      // Store credentials in database
      await this.storeCredentials(credentials)
      
      return credentials

    } catch (error) {
      console.error('Microsoft OAuth callback failed:', error)
      throw new Error('Failed to complete Microsoft authentication')
    }
  }

  // Exchange authorization code for access tokens
  private async exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      })
    })

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return await response.json()
  }

  // Get user information from Microsoft Graph
  private async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      email: data.mail || data.userPrincipalName,
      name: data.displayName,
      first_name: data.givenName,
      last_name: data.surname,
      picture: data.photo?.['@odata.mediaReadLink'],
      profile_url: `https://outlook.live.com/people/0/profile/${data.id}`,
      locale: data.preferredLanguage,
      timezone: data.mailboxSettings?.timeZone,
      verified: data.accountEnabled,
      provider_specific: {
        jobTitle: data.jobTitle,
        department: data.department,
        companyName: data.companyName,
        officeLocation: data.officeLocation,
        businessPhones: data.businessPhones,
        mobilePhone: data.mobilePhone
      }
    }
  }

  // Store OAuth credentials in database
  private async storeCredentials(credentials: OAuthCredentials): Promise<void> {
    await prisma.userAuthProvider.upsert({
      where: {
        userId_provider_providerType: {
          userId: credentials.userId,
          provider: 'microsoft',
          providerType: 'oauth'
        }
      },
      create: {
        userId: credentials.userId,
        provider: 'microsoft',
        providerType: 'oauth',
        providerId: credentials.providerUserId,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope.join(' ')
      },
      update: {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        scope: credentials.scope.join(' ')
      }
    })
  }

  // Get valid access token (refresh if needed)
  async getValidToken(userId: string): Promise<string> {
    const auth = await prisma.userAuthProvider.findUnique({
      where: {
        userId_provider_providerType: {
          userId,
          provider: 'microsoft',
          providerType: 'oauth'
        }
      }
    })

    if (!auth) {
      throw new Error('Microsoft account not connected')
    }

    // Check if token is still valid
    if (auth.expiresAt && auth.expiresAt > new Date()) {
      return auth.accessToken!
    }

    // Refresh token if expired
    if (auth.refreshToken) {
      const newTokens = await this.refreshAccessToken(auth.refreshToken)
      
      // Update stored tokens
      await prisma.userAuthProvider.update({
        where: { id: auth.id },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || auth.refreshToken,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000)
        }
      })

      return newTokens.access_token
    }

    throw new Error('Microsoft authentication expired - please reconnect')
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    return await response.json()
  }

  // Microsoft Graph API Methods

  // Get user's calendar events
  async getCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OAuthServiceResponse<MicrosoftCalendarEvent[]>> {
    try {
      const token = await this.getValidToken(userId)
      
      const params = new URLSearchParams({
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        $orderby: 'start/dateTime',
        $top: '50'
      })

      const response = await fetch(`${this.baseUrl}/me/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Calendar events fetch failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        data: data.value,
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALENDAR_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Create calendar event
  async createCalendarEvent(
    userId: string,
    event: Partial<MicrosoftCalendarEvent>
  ): Promise<OAuthServiceResponse<MicrosoftCalendarEvent>> {
    try {
      const token = await this.getValidToken(userId)

      const response = await fetch(`${this.baseUrl}/me/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })

      if (!response.ok) {
        throw new Error(`Calendar event creation failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        data,
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALENDAR_CREATE_ERROR',
          message: error.message
        }
      }
    }
  }

  // Get user's tasks (Microsoft To-Do)
  async getTasks(userId: string): Promise<OAuthServiceResponse<MicrosoftTask[]>> {
    try {
      const token = await this.getValidToken(userId)

      // Get task lists first
      const listsResponse = await fetch(`${this.baseUrl}/me/todo/lists`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!listsResponse.ok) {
        throw new Error(`Task lists fetch failed: ${listsResponse.statusText}`)
      }

      const lists = await listsResponse.json()
      const allTasks: MicrosoftTask[] = []

      // Get tasks from each list
      for (const list of lists.value) {
        const tasksResponse = await fetch(`${this.baseUrl}/me/todo/lists/${list.id}/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (tasksResponse.ok) {
          const tasks = await tasksResponse.json()
          allTasks.push(...tasks.value)
        }
      }

      return {
        success: true,
        data: allTasks,
        rateLimitInfo: this.extractRateLimitInfo(listsResponse)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TASKS_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Get user's contacts
  async getContacts(userId: string): Promise<OAuthServiceResponse<any[]>> {
    try {
      const token = await this.getValidToken(userId)

      const response = await fetch(`${this.baseUrl}/me/contacts?$top=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Contacts fetch failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        data: data.value,
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTACTS_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Get user's recent emails
  async getRecentEmails(userId: string, count: number = 10): Promise<OAuthServiceResponse<any[]>> {
    try {
      const token = await this.getValidToken(userId)

      const response = await fetch(`${this.baseUrl}/me/messages?$top=${count}&$orderby=receivedDateTime desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Emails fetch failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        data: data.value,
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EMAILS_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Extract rate limit information from response headers
  private extractRateLimitInfo(response: Response) {
    const remaining = parseInt(response.headers.get('x-ms-resource-unit-quota-remaining') || '1000')
    const used = parseInt(response.headers.get('x-ms-resource-unit-quota-used') || '0')
    
    return {
      remaining,
      resetAt: new Date(Date.now() + 60 * 60 * 1000), // Microsoft Graph resets hourly
      dailyQuota: 1000,
      used
    }
  }

  // Disconnect Microsoft account
  async disconnect(userId: string): Promise<void> {
    await prisma.userAuthProvider.deleteMany({
      where: {
        userId,
        provider: 'microsoft'
      }
    })
  }

  // Check connection status
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean
    expiresAt?: Date
    needsReauth: boolean
  }> {
    const auth = await prisma.userAuthProvider.findUnique({
      where: {
        userId_provider_providerType: {
          userId,
          provider: 'microsoft',
          providerType: 'oauth'
        }
      }
    })

    if (!auth) {
      return {
        connected: false,
        needsReauth: false
      }
    }

    const needsReauth = auth.expiresAt ? auth.expiresAt < new Date() && !auth.refreshToken : true

    return {
      connected: true,
      expiresAt: auth.expiresAt || undefined,
      needsReauth
    }
  }
}