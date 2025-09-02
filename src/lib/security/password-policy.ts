/**
 * Advanced Password Security Policy
 * Implements enterprise-grade password requirements and validation
 */

import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const BCRYPT_ROUNDS = process.env.NODE_ENV === 'production' ? 14 : 12

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !isCommonPassword(password),
    'Password is too common and not secure'
  )

// Common password patterns to reject
const COMMON_PASSWORDS = [
  'password123',
  '123456789',
  'qwerty123',
  'admin123',
  'welcome123',
  'password1',
  'letmein123'
]

const SEQUENTIAL_PATTERNS = [
  '123456',
  'abcdef',
  'qwerty',
  '987654'
]

function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase()
  
  // Check against common passwords
  if (COMMON_PASSWORDS.some(common => lower.includes(common))) {
    return true
  }
  
  // Check for sequential patterns
  if (SEQUENTIAL_PATTERNS.some(pattern => lower.includes(pattern))) {
    return true
  }
  
  // Check for repeated characters
  if (/(.)\1{3,}/.test(password)) {
    return true
  }
  
  return false
}

export async function hashPassword(password: string): Promise<string> {
  const validationResult = passwordSchema.safeParse(password)
  if (!validationResult.success) {
    throw new Error(validationResult.error.errors[0].message)
  }
  
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isSecure: boolean
} {
  const feedback: string[] = []
  let score = 0
  
  // Length scoring
  if (password.length >= 12) score += 20
  else if (password.length >= 8) score += 10
  else feedback.push('Password should be at least 12 characters')
  
  // Character diversity
  if (/[a-z]/.test(password)) score += 10
  else feedback.push('Add lowercase letters')
  
  if (/[A-Z]/.test(password)) score += 10
  else feedback.push('Add uppercase letters')
  
  if (/\d/.test(password)) score += 10
  else feedback.push('Add numbers')
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 15
  else feedback.push('Add special characters')
  
  // Complexity bonus
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.7) score += 15
  else feedback.push('Reduce repeated characters')
  
  // Pattern penalties
  if (isCommonPassword(password)) {
    score -= 30
    feedback.push('Avoid common password patterns')
  }
  
  // Entropy bonus for longer passwords
  if (password.length >= 16) score += 10
  if (password.length >= 20) score += 10
  
  return {
    score: Math.max(0, Math.min(100, score)),
    feedback,
    isSecure: score >= 70
  }
}

export interface PasswordPolicy {
  minLength: number
  requireLowercase: boolean
  requireUppercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  preventCommon: boolean
  maxAge: number // days
  minAge: number // hours
  historySize: number
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
  maxAge: 90, // 90 days
  minAge: 24, // 24 hours
  historySize: 12 // remember last 12 passwords
}

export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): { isValid: boolean; violations: string[] } {
  const violations: string[] = []
  
  if (password.length < policy.minLength) {
    violations.push(`Password must be at least ${policy.minLength} characters`)
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    violations.push('Password must contain lowercase letters')
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    violations.push('Password must contain uppercase letters')
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    violations.push('Password must contain numbers')
  }
  
  if (policy.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    violations.push('Password must contain special characters')
  }
  
  if (policy.preventCommon && isCommonPassword(password)) {
    violations.push('Password is too common')
  }
  
  return {
    isValid: violations.length === 0,
    violations
  }
}