/**
 * Data Encryption and Protection Service
 * Implements AES-256-GCM encryption for sensitive data
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

export interface EncryptionResult {
  encryptedData: string
  iv: string
  authTag: string
  salt: string
}

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  saltLength: number
  iterations: number
}

export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  iterations: 100000
}

export class DataEncryption {
  private static readonly MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY
  
  /**
   * Encrypt sensitive data
   */
  static async encrypt(
    plaintext: string,
    userKey?: string,
    config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG
  ): Promise<EncryptionResult> {
    if (!this.MASTER_KEY && !userKey) {
      throw new Error('No encryption key available')
    }
    
    // Generate random salt and IV
    const salt = randomBytes(config.saltLength)
    const iv = randomBytes(config.ivLength)
    
    // Derive key using PBKDF2
    const keyMaterial = userKey || this.MASTER_KEY!
    const key = pbkdf2Sync(keyMaterial, salt, config.iterations, config.keyLength, 'sha256')
    
    // Create cipher
    const cipher = createCipheriv(config.algorithm, key, iv)
    
    // Encrypt data
    let encryptedData = cipher.update(plaintext, 'utf8', 'hex')
    encryptedData += cipher.final('hex')
    
    // Get authentication tag
    const authTag = cipher.getAuthTag()
    
    return {
      encryptedData,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex')
    }
  }
  
  /**
   * Decrypt sensitive data
   */
  static async decrypt(
    encryptionResult: EncryptionResult,
    userKey?: string,
    config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG
  ): Promise<string> {
    if (!this.MASTER_KEY && !userKey) {
      throw new Error('No decryption key available')
    }
    
    try {
      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptionResult.iv, 'hex')
      const salt = Buffer.from(encryptionResult.salt, 'hex')
      const authTag = Buffer.from(encryptionResult.authTag, 'hex')
      
      // Derive the same key
      const keyMaterial = userKey || this.MASTER_KEY!
      const key = pbkdf2Sync(keyMaterial, salt, config.iterations, config.keyLength, 'sha256')
      
      // Create decipher
      const decipher = createDecipheriv(config.algorithm, key, iv)
      decipher.setAuthTag(authTag)
      
      // Decrypt data
      let decryptedData = decipher.update(encryptionResult.encryptedData, 'hex', 'utf8')
      decryptedData += decipher.final('utf8')
      
      return decryptedData
    } catch (error) {
      throw new Error('Decryption failed: Invalid key or corrupted data')
    }
  }
  
  /**
   * Encrypt field in database record
   */
  static async encryptField(
    value: string,
    tableName: string,
    fieldName: string,
    recordId: string
  ): Promise<EncryptionResult> {
    const contextKey = `${tableName}:${fieldName}:${recordId}`
    return this.encrypt(value, contextKey)
  }
  
  /**
   * Decrypt field from database record
   */
  static async decryptField(
    encryptionResult: EncryptionResult,
    tableName: string,
    fieldName: string,
    recordId: string
  ): Promise<string> {
    const contextKey = `${tableName}:${fieldName}:${recordId}`
    return this.decrypt(encryptionResult, contextKey)
  }
  
  /**
   * Generate secure random key
   */
  static generateSecureKey(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }
  
  /**
   * Hash sensitive data (one-way)
   */
  static async hashSensitiveData(data: string): Promise<string> {
    const crypto = await import('crypto')
    const salt = randomBytes(16)
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 32, 'sha256')
    return salt.toString('hex') + ':' + hash.toString('hex')
  }
  
  /**
   * Verify hashed sensitive data
   */
  static async verifySensitiveData(data: string, hashedData: string): Promise<boolean> {
    try {
      const [saltHex, hashHex] = hashedData.split(':')
      const salt = Buffer.from(saltHex, 'hex')
      const originalHash = Buffer.from(hashHex, 'hex')
      
      const crypto = await import('crypto')
      const hash = crypto.pbkdf2Sync(data, salt, 100000, 32, 'sha256')
      
      return crypto.timingSafeEqual(originalHash, hash)
    } catch (error) {
      return false
    }
  }
}

/**
 * Sensitive Data Types for Encryption
 */
export interface SensitiveDataType {
  encrypt: boolean
  hash: boolean
  mask: boolean
  auditLog: boolean
}

export const SENSITIVE_DATA_TYPES: Record<string, SensitiveDataType> = {
  password: { encrypt: false, hash: true, mask: true, auditLog: true },
  email: { encrypt: false, hash: false, mask: true, auditLog: true },
  phone: { encrypt: true, hash: false, mask: true, auditLog: true },
  ssn: { encrypt: true, hash: false, mask: true, auditLog: true },
  creditCard: { encrypt: true, hash: false, mask: true, auditLog: true },
  apiKey: { encrypt: true, hash: false, mask: true, auditLog: true },
  personalNote: { encrypt: true, hash: false, mask: false, auditLog: false },
  address: { encrypt: true, hash: false, mask: true, auditLog: true }
}

/**
 * Mask sensitive data for display
 */
export function maskSensitiveData(value: string, type: keyof typeof SENSITIVE_DATA_TYPES): string {
  const config = SENSITIVE_DATA_TYPES[type]
  if (!config.mask) return value
  
  switch (type) {
    case 'email':
      const [localPart, domain] = value.split('@')
      if (!domain) return '***'
      return `${localPart.charAt(0)}***@${domain}`
    
    case 'phone':
      return value.replace(/(\d{3})\d{3}(\d{4})/, '$1-***-$2')
    
    case 'creditCard':
      return value.replace(/\d(?=\d{4})/g, '*')
    
    case 'ssn':
      return value.replace(/\d(?=\d{4})/g, '*')
    
    case 'apiKey':
      return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***'
    
    default:
      return '***'
  }
}

/**
 * Field-level encryption decorator for database models
 */
export function EncryptedField(type: keyof typeof SENSITIVE_DATA_TYPES) {
  return function (target: any, propertyName: string) {
    const config = SENSITIVE_DATA_TYPES[type]
    
    // Store encryption metadata
    if (!target._encryptedFields) {
      target._encryptedFields = {}
    }
    
    target._encryptedFields[propertyName] = {
      type,
      encrypt: config.encrypt,
      hash: config.hash,
      auditLog: config.auditLog
    }
  }
}

/**
 * Automatic encryption/decryption for model fields
 */
export class EncryptedModel {
  protected _encryptedFields: Record<string, any> = {}
  
  async beforeSave(): Promise<void> {
    for (const [fieldName, config] of Object.entries(this._encryptedFields)) {
      const value = (this as any)[fieldName]
      
      if (value && config.encrypt) {
        const encrypted = await DataEncryption.encryptField(
          value,
          this.constructor.name,
          fieldName,
          (this as any).id || 'new'
        )
        
        // Store encrypted data as JSON string
        ;(this as any)[fieldName] = JSON.stringify(encrypted)
      }
    }
  }
  
  async afterLoad(): Promise<void> {
    for (const [fieldName, config] of Object.entries(this._encryptedFields)) {
      const value = (this as any)[fieldName]
      
      if (value && config.encrypt) {
        try {
          const encryptionResult = JSON.parse(value)
          const decrypted = await DataEncryption.decryptField(
            encryptionResult,
            this.constructor.name,
            fieldName,
            (this as any).id
          )
          
          ;(this as any)[fieldName] = decrypted
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldName}:`, error)
          ;(this as any)[fieldName] = null
        }
      }
    }
  }
}