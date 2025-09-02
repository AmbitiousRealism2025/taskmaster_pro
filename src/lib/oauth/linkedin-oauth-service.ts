// LinkedIn OAuth Service Implementation
// Part of Phase 3.2 - External Integration Layer

import { prisma } from '@/lib/prisma'
import { 
  OAuthCredentials, 
  OAuthTokenResponse, 
  OAuthUserInfo,
  LinkedInProfile,
  LinkedInConnection,
  OAuthServiceResponse,
  CrossPlatformContact
} from '../../types/oauth-providers'

export class LinkedInOAuthService {
  private readonly baseUrl = 'https://api.linkedin.com/v2'
  private readonly authUrl = 'https://www.linkedin.com/oauth/v2/authorization'
  private readonly tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken'
  
  private readonly clientId = process.env.LINKEDIN_CLIENT_ID!
  private readonly clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  private readonly redirectUri = process.env.LINKEDIN_REDIRECT_URI!

  private readonly scopes = [
    'r_liteprofile',        // Basic profile info
    'r_emailaddress',       // Email address
    'r_1st_connections_size', // Connection count
    'w_member_social'       // Post on behalf of user
  ]

  // Generate authorization URL
  generateAuthUrl(userId: string, requestedScopes?: string[]): string {
    const scopes = requestedScopes || this.scopes
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: userId,
      scope: scopes.join(' ')
    })

    return `${this.authUrl}?${params.toString()}`
  }

  // Handle OAuth callback and exchange code for tokens
  async handleCallback(code: string, userId: string): Promise<OAuthCredentials> {
    try {
      const tokenResponse = await this.exchangeCodeForTokens(code)
      const userInfo = await this.getUserInfo(tokenResponse.access_token)
      
      const credentials: OAuthCredentials = {
        providerId: 'linkedin',
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
      console.error('LinkedIn OAuth callback failed:', error)
      throw new Error('Failed to complete LinkedIn authentication')
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
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token exchange failed: ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  }

  // Get user information from LinkedIn API
  private async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    // Get basic profile info
    const profileResponse = await fetch(`${this.baseUrl}/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!profileResponse.ok) {
      throw new Error(`Failed to get profile info: ${profileResponse.statusText}`)
    }

    const profileData = await profileResponse.json()

    // Get email address
    const emailResponse = await fetch(`${this.baseUrl}/emailAddress?q=members&projection=(elements*(handle~))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    let email = ''
    if (emailResponse.ok) {
      const emailData = await emailResponse.json()
      if (emailData.elements && emailData.elements.length > 0) {
        email = emailData.elements[0]['handle~'].emailAddress
      }
    }

    // Extract profile picture URL
    let profilePicture = ''
    if (profileData.profilePicture?.['displayImage~']?.elements?.length > 0) {
      const images = profileData.profilePicture['displayImage~'].elements
      // Get the largest image
      const largestImage = images.reduce((prev: any, current: any) => 
        (current.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0) > 
        (prev.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0) 
          ? current : prev
      )
      if (largestImage?.identifiers?.length > 0) {
        profilePicture = largestImage.identifiers[0].identifier
      }
    }

    // Construct full name
    const firstName = profileData.firstName?.localized?.[Object.keys(profileData.firstName.localized)[0]] || ''
    const lastName = profileData.lastName?.localized?.[Object.keys(profileData.lastName.localized)[0]] || ''
    const fullName = `${firstName} ${lastName}`.trim()

    return {
      id: profileData.id,
      email,
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      picture: profilePicture,
      profile_url: `https://www.linkedin.com/in/${profileData.vanityName || profileData.id}`,
      provider_specific: {
        vanityName: profileData.vanityName,
        headline: profileData.headline,
        summary: profileData.summary,
        industry: profileData.industry,
        location: profileData.location,
        positions: profileData.positions
      }
    }
  }

  // Store OAuth credentials in database
  private async storeCredentials(credentials: OAuthCredentials): Promise<void> {
    await prisma.userAuthProvider.upsert({
      where: {
        userId_provider_providerType: {
          userId: credentials.userId,
          provider: 'linkedin',
          providerType: 'oauth'
        }
      },
      create: {
        userId: credentials.userId,
        provider: 'linkedin',
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

  // Get valid access token (LinkedIn tokens don't auto-refresh)
  async getValidToken(userId: string): Promise<string> {
    const auth = await prisma.userAuthProvider.findUnique({
      where: {
        userId_provider_providerType: {
          userId,
          provider: 'linkedin',
          providerType: 'oauth'
        }
      }
    })

    if (!auth) {
      throw new Error('LinkedIn account not connected')
    }

    // Check if token is still valid (LinkedIn tokens expire in 60 days)
    if (auth.expiresAt && auth.expiresAt > new Date()) {
      return auth.accessToken!
    }

    throw new Error('LinkedIn authentication expired - please reconnect')
  }

  // LinkedIn API Methods

  // Get detailed profile information
  async getDetailedProfile(userId: string): Promise<OAuthServiceResponse<LinkedInProfile>> {
    try {
      const token = await this.getValidToken(userId)

      const response = await fetch(`${this.baseUrl}/people/~:(id,firstName,lastName,headline,summary,industry,positions,profilePicture(displayImage~:playableStreams),vanityName,location)`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.statusText}`)
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
          code: 'PROFILE_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Get user's connections (limited by LinkedIn API)
  async getConnections(userId: string): Promise<OAuthServiceResponse<LinkedInConnection[]>> {
    try {
      const token = await this.getValidToken(userId)

      // LinkedIn heavily restricts connection access
      // This endpoint only returns basic connection count and public profile info
      const response = await fetch(`${this.baseUrl}/people/~:(id,num-connections,num-connections-capped)`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Connections fetch failed: ${response.statusText}`)
      }

      const data = await response.json()

      // LinkedIn doesn't provide detailed connection lists anymore
      // Return connection count and basic info
      return {
        success: true,
        data: [{
          id: 'summary',
          firstName: 'Connection',
          lastName: 'Summary',
          headline: `${data.numConnections} connections`,
          connectedAt: new Date(),
          mutualConnections: 0
        }],
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTIONS_FETCH_ERROR',
          message: error.message
        }
      }
    }
  }

  // Share content on LinkedIn
  async shareContent(
    userId: string,
    content: {
      text: string
      url?: string
      imageUrl?: string
      title?: string
      description?: string
    }
  ): Promise<OAuthServiceResponse<any>> {
    try {
      const token = await this.getValidToken(userId)

      const shareData = {
        author: `urn:li:person:${await this.getLinkedInPersonId(token)}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: content.url || content.imageUrl ? 'ARTICLE' : 'NONE',
            ...(content.url && {
              media: [{
                status: 'READY',
                description: {
                  text: content.description || ''
                },
                originalUrl: content.url,
                title: {
                  text: content.title || ''
                }
              }]
            })
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }

      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(shareData)
      })

      if (!response.ok) {
        throw new Error(`Content sharing failed: ${response.statusText}`)
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
          code: 'SHARE_CONTENT_ERROR',
          message: error.message
        }
      }
    }
  }

  // Get user's company information
  async getCompanyInfo(userId: string): Promise<OAuthServiceResponse<any[]>> {
    try {
      const token = await this.getValidToken(userId)

      // Get companies the user is associated with
      const response = await fetch(`${this.baseUrl}/companies?q=viewerCompany`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Company info fetch failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        data: data.elements || [],
        rateLimitInfo: this.extractRateLimitInfo(response)
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPANY_INFO_ERROR',
          message: error.message
        }
      }
    }
  }

  // Convert LinkedIn profile to cross-platform contact
  async convertToContact(userId: string): Promise<OAuthServiceResponse<CrossPlatformContact>> {
    try {
      const profileResult = await this.getDetailedProfile(userId)
      
      if (!profileResult.success || !profileResult.data) {
        throw new Error('Failed to get LinkedIn profile')
      }

      const profile = profileResult.data
      const firstName = profile.firstName?.localized?.[Object.keys(profile.firstName.localized)[0]] || ''
      const lastName = profile.lastName?.localized?.[Object.keys(profile.lastName.localized)[0]] || ''

      // Get email from stored credentials
      const auth = await prisma.userAuthProvider.findUnique({
        where: {
          userId_provider_providerType: {
            userId,
            provider: 'linkedin',
            providerType: 'oauth'
          }
        }
      })

      const contact: CrossPlatformContact = {
        id: `linkedin_${profile.id}`,
        providerId: 'linkedin',
        name: `${firstName} ${lastName}`.trim(),
        email: auth?.scope?.includes('r_emailaddress') ? 'Available via LinkedIn' : '',
        phoneNumbers: [],
        company: profile.positions?.elements?.[0]?.companyName,
        jobTitle: profile.headline,
        profileUrl: `https://www.linkedin.com/in/${profile.vanityName || profile.id}`,
        avatar: this.extractProfilePicture(profile),
        lastInteraction: new Date(),
        tags: ['linkedin', 'professional'],
        source: 'linkedin',
        syncedAt: new Date()
      }

      return {
        success: true,
        data: contact,
        rateLimitInfo: profileResult.rateLimitInfo
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONTACT_CONVERSION_ERROR',
          message: error.message
        }
      }
    }
  }

  // Helper method to get LinkedIn person ID
  private async getLinkedInPersonId(accessToken: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/people/~:(id)`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get LinkedIn person ID')
    }

    const data = await response.json()
    return data.id
  }

  // Extract profile picture URL from LinkedIn API response
  private extractProfilePicture(profile: LinkedInProfile): string {
    if (!profile.profilePicture?.displayImage) return ''

    const images = (profile.profilePicture.displayImage as any)?.elements
    if (!images || images.length === 0) return ''

    // Get the largest image
    const largestImage = images.reduce((prev: any, current: any) => {
      const prevWidth = prev.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0
      const currentWidth = current.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0
      return currentWidth > prevWidth ? current : prev
    })

    return largestImage?.identifiers?.[0]?.identifier || ''
  }

  // Extract rate limit information from response headers
  private extractRateLimitInfo(response: Response) {
    const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '100')
    const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '3600')
    
    return {
      remaining,
      resetAt: new Date(Date.now() + resetTime * 1000),
      dailyQuota: 500, // LinkedIn's typical daily limit
      used: 100 - remaining
    }
  }

  // Disconnect LinkedIn account
  async disconnect(userId: string): Promise<void> {
    await prisma.userAuthProvider.deleteMany({
      where: {
        userId,
        provider: 'linkedin'
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
          provider: 'linkedin',
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

    const needsReauth = auth.expiresAt ? auth.expiresAt < new Date() : true

    return {
      connected: true,
      expiresAt: auth.expiresAt || undefined,
      needsReauth
    }
  }
}