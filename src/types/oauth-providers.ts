// OAuth Provider Type Definitions
// Part of Phase 3.2 - External Integration Layer

export interface OAuthProvider {
  id: string
  name: string
  displayName: string
  icon: string
  description: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  userInfoUrl: string
  redirectUri: string
  clientId: string
  clientSecret: string
  enabled: boolean
  supportedServices: OAuthService[]
}

export interface OAuthService {
  type: 'calendar' | 'email' | 'profile' | 'contacts' | 'files' | 'tasks'
  name: string
  description: string
  requiredScopes: string[]
  endpoints: Record<string, string>
}

export interface OAuthCredentials {
  providerId: string
  userId: string
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  scope: string[]
  tokenType: string
  providerUserId: string
  userInfo: {
    email: string
    name: string
    profilePicture?: string
    additionalData: Record<string, any>
  }
}

export interface OAuthAuthorizationRequest {
  providerId: string
  userId: string
  services: string[] // Which services to request access to
  redirectUri?: string
  state?: string
  customScopes?: string[]
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}

export interface OAuthUserInfo {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  picture?: string
  profile_url?: string
  locale?: string
  timezone?: string
  verified?: boolean
  provider_specific: Record<string, any>
}

export interface MicrosoftOAuthScopes {
  // Microsoft Graph API scopes
  profile: 'User.Read'
  email: 'Mail.Read'
  calendar: 'Calendars.ReadWrite'
  contacts: 'Contacts.ReadWrite'
  files: 'Files.ReadWrite'
  tasks: 'Tasks.ReadWrite'
  presence: 'Presence.Read'
  teams: 'Team.ReadBasic.All'
}

export interface LinkedInOAuthScopes {
  // LinkedIn API scopes
  profile: 'r_liteprofile'
  email: 'r_emailaddress'
  connections: 'r_1st_connections_size'
  sharing: 'w_member_social'
  companies: 'r_organization_social'
  messaging: 'w_organization_social'
}

export interface ProviderConfiguration {
  microsoft: {
    clientId: string
    clientSecret: string
    tenantId?: string // For organization-specific auth
    authority?: string
    redirectUri: string
    scopes: MicrosoftOAuthScopes
  }
  linkedin: {
    clientId: string
    clientSecret: string
    redirectUri: string
    scopes: LinkedInOAuthScopes
  }
}

export interface OAuthIntegrationStatus {
  providerId: string
  connected: boolean
  lastSync: Date
  services: Array<{
    type: string
    enabled: boolean
    lastUsed: Date
    status: 'active' | 'error' | 'disabled'
    errorMessage?: string
  }>
  tokenExpiry: Date
  needsReauth: boolean
  quotaUsage?: {
    current: number
    limit: number
    resetAt: Date
  }
}

export interface CrossPlatformContact {
  id: string
  providerId: string
  name: string
  email: string
  phoneNumbers: string[]
  company?: string
  jobTitle?: string
  profileUrl?: string
  avatar?: string
  lastInteraction?: Date
  tags: string[]
  notes?: string
  source: 'microsoft' | 'linkedin' | 'google'
  syncedAt: Date
}

export interface OAuthServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  rateLimitInfo?: {
    remaining: number
    resetAt: Date
    dailyQuota: number
    used: number
  }
}

// Microsoft-specific types
export interface MicrosoftCalendarEvent {
  id: string
  subject: string
  bodyPreview: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: {
    displayName: string
    address?: any
  }
  attendees: Array<{
    emailAddress: {
      name: string
      address: string
    }
    status: {
      response: 'none' | 'accepted' | 'declined' | 'tentativelyAccepted'
      time: string
    }
  }>
  importance: 'low' | 'normal' | 'high'
  isAllDay: boolean
  isCancelled: boolean
  isOrganizer: boolean
  recurrence?: any
  responseRequested: boolean
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  webLink: string
}

export interface MicrosoftTask {
  id: string
  title: string
  body?: {
    content: string
    contentType: 'text' | 'html'
  }
  dueDateTime?: {
    dateTime: string
    timeZone: string
  }
  importance: 'low' | 'normal' | 'high'
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  percentComplete: number
  categories: string[]
  hasAttachments: boolean
  parentFolderId: string
  createdDateTime: string
  lastModifiedDateTime: string
}

// LinkedIn-specific types
export interface LinkedInProfile {
  id: string
  firstName: {
    localized: Record<string, string>
    preferredLocale: {
      country: string
      language: string
    }
  }
  lastName: {
    localized: Record<string, string>
    preferredLocale: {
      country: string
      language: string
    }
  }
  profilePicture?: {
    displayImage: string
  }
  vanityName?: string
  headline?: string
  summary?: string
  industry?: string
  location?: {
    name: string
    country: string
  }
  positions?: {
    elements: Array<{
      title: string
      companyName: string
      description?: string
      startDate: {
        year: number
        month: number
      }
      endDate?: {
        year: number
        month: number
      }
      location?: string
    }>
  }
}

export interface LinkedInConnection {
  id: string
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
  publicProfileUrl?: string
  connectedAt: Date
  mutualConnections: number
  industry?: string
  location?: string
}

export interface OAuthProviderMetrics {
  providerId: string
  totalUsers: number
  activeConnections: number
  dailyApiCalls: number
  errorRate: number
  averageResponseTime: number
  quotaUtilization: number
  topEndpoints: Array<{
    endpoint: string
    calls: number
    avgResponseTime: number
  }>
  lastUpdated: Date
}