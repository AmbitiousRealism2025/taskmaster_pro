import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/client'
import { env } from '@/lib/config/env'
import bcrypt from 'bcryptjs'

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email'
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.hashedPassword) {
          // Prevent timing attacks by still computing bcrypt
          await bcrypt.compare('dummy', '$2a$12$dummy.hash.to.prevent.timing.attacks')
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isValidPassword) {
          return null
        }

        // Log successful login
        console.log('Successful login:', { 
          userId: user.id, 
          email: user.email,
          timestamp: new Date().toISOString()
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60 // 24 hours
  },
  useSecureCookies: env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        ...(env.NODE_ENV === 'production' && { domain: process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '').split('/')[0] })
      }
    },
    callbackUrl: {
      name: env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production'
      }
    }
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    encode: async (params) => {
      // Enhanced JWT with additional security claims
      const { token, secret } = params
      const jwt = await import('jsonwebtoken')
      
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        ...token,
        iat: now,
        exp: now + (7 * 24 * 60 * 60), // 7 days
        iss: process.env.NEXTAUTH_URL,
        aud: process.env.NEXTAUTH_URL,
        jti: crypto.randomUUID() // JWT ID for tracking
      }
      
      return jwt.sign(payload, secret as string, {
        algorithm: 'HS256',
        issuer: process.env.NEXTAUTH_URL,
        audience: process.env.NEXTAUTH_URL
      })
    }
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      // Enhanced security checks during sign-in
      
      // Prevent account takeover via OAuth provider email verification
      if (account?.type === 'oauth' && user?.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (existingUser) {
            // Check if this specific provider is already linked
            const existingAccount = await prisma.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId
                }
              }
            })
            
            if (!existingAccount) {
              // Only allow linking if email is verified by OAuth provider
              const isEmailVerified = profile?.email_verified ?? 
                                    profile?.verified_email ?? 
                                    account.provider === 'github' // GitHub emails are verified
              
              if (!isEmailVerified) {
                console.warn('OAuth sign-in blocked: unverified email', { 
                  email: user.email, 
                  provider: account.provider 
                })
                return false
              }
              
              // Link the new OAuth account to existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state
                }
              })
              
              console.log('OAuth account linked successfully', {
                userId: existingUser.id,
                provider: account.provider,
                email: user.email
              })
            }
          }
        } catch (error) {
          console.error('Error during secure account linking:', error)
          return false
        }
      }
      
      return true
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.provider = account.provider
      }
      
      // Handle session updates (password change, etc.)
      if (trigger === 'update') {
        // Force new JWT generation for security events
        token.iat = Math.floor(Date.now() / 1000)
        token.jti = crypto.randomUUID()
      }
      
      return token
    },
    async session({ session, token, trigger }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        
        // Add security metadata
        session.iat = token.iat as number
        session.jti = token.jti as string
      }
      
      return session
    },
    async redirect({ url, baseUrl }) {
      // Enhanced redirect validation
      try {
        const redirectUrl = new URL(url, baseUrl)
        const baseUrlObj = new URL(baseUrl)
        
        // Only allow redirects to same origin
        if (redirectUrl.origin === baseUrlObj.origin) {
          return redirectUrl.href
        }
        
        // Allow relative URLs
        if (url.startsWith('/') && !url.startsWith('//')) {
          return `${baseUrl}${url}`
        }
        
        // Default to base URL for security
        return baseUrl
      } catch (error) {
        console.warn('Invalid redirect URL:', url)
        return baseUrl
      }
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log all sign-in events for security monitoring
      const eventData = {
        timestamp: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        provider: account?.provider || 'credentials',
        isNewUser: isNewUser || false,
        userAgent: 'N/A', // Would be captured in middleware
        ipAddress: 'N/A'  // Would be captured in middleware
      }
      
      console.log('Security Event - Sign In:', eventData)
      
      // In production, send to security monitoring service
      if (env.NODE_ENV === 'production') {
        // await securityMonitor.logEvent('user_signin', eventData)
      }
    },
    async signOut({ session, token }) {
      // Log sign-out events
      const eventData = {
        timestamp: new Date().toISOString(),
        userId: token?.id || session?.user?.id,
        sessionId: token?.jti || 'unknown'
      }
      
      console.log('Security Event - Sign Out:', eventData)
      
      if (env.NODE_ENV === 'production') {
        // await securityMonitor.logEvent('user_signout', eventData)
      }
    },
    async session({ session, token }) {
      // Monitor active sessions for anomalies
      if (env.NODE_ENV === 'production') {
        // Check for session anomalies here
      }
    }
  },
  debug: env.NODE_ENV === 'development'
}