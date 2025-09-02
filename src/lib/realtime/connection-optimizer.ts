/**
 * Real-time Connection Optimization
 * WebSocket connection pooling, message batching, and performance optimization
 * for enterprise-scale real-time features
 */

import { EventEmitter } from 'events'
import { WebSocket } from 'ws'

export interface ConnectionConfig {
  maxConnections: number
  heartbeatInterval: number
  reconnectAttempts: number
  reconnectDelay: number
  messageQueueSize: number
  batchSize: number
  batchInterval: number
}

export interface ConnectionMetrics {
  activeConnections: number
  messagesSent: number
  messagesReceived: number
  averageLatency: number
  reconnectionCount: number
  errorRate: number
  throughput: number
}

export interface RealtimeMessage {
  id: string
  type: string
  channel: string
  data: any
  timestamp: number
  userId?: string
  priority: 'low' | 'normal' | 'high' | 'critical'
}

export interface ConnectionPool {
  connections: Map<string, OptimizedConnection>
  channels: Map<string, Set<string>>
  messageQueue: RealtimeMessage[]
  batchTimer?: NodeJS.Timeout
}

export class OptimizedConnection extends EventEmitter {
  private ws?: WebSocket
  private userId?: string
  private channels = new Set<string>()
  private messageQueue: RealtimeMessage[] = []
  private heartbeatTimer?: NodeJS.Timeout
  private reconnectTimer?: NodeJS.Timeout
  private reconnectAttempts = 0
  private latencyHistory: number[] = []
  private lastPingTime = 0
  
  constructor(
    private connectionId: string,
    private url: string,
    private config: ConnectionConfig
  ) {
    super()
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.on('open', () => {
        console.log(`✅ WebSocket connected: ${this.connectionId}`)
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.emit('connected')
      })
      
      this.ws.on('message', (data) => {
        this.handleMessage(data.toString())
      })
      
      this.ws.on('close', () => {
        console.log(`❌ WebSocket disconnected: ${this.connectionId}`)
        this.cleanup()
        this.attemptReconnect()
      })
      
      this.ws.on('error', (error) => {
        console.error(`WebSocket error: ${this.connectionId}`, error)
        this.emit('error', error)
      })
      
      this.ws.on('pong', () => {
        const latency = Date.now() - this.lastPingTime
        this.updateLatency(latency)
      })
      
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.attemptReconnect()
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as RealtimeMessage
      
      // Handle system messages
      if (message.type === 'pong') {
        const latency = Date.now() - this.lastPingTime
        this.updateLatency(latency)
        return
      }
      
      this.emit('message', message)
    } catch (error) {
      console.error('Message parsing error:', error)
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        this.ws.ping()
      }
    }, this.config.heartbeatInterval)
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error(`Max reconnection attempts reached: ${this.connectionId}`)
      this.emit('maxReconnectsReached')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // Exponential backoff
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private updateLatency(latency: number): void {
    this.latencyHistory.push(latency)
    
    // Keep only last 100 measurements
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift()
    }
  }

  public send(message: RealtimeMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message if connection is not ready
      if (this.messageQueue.length < this.config.messageQueueSize) {
        this.messageQueue.push(message)
      } else {
        console.warn('Message queue full, dropping message:', message.id)
      }
    }
  }

  public subscribe(channel: string): void {
    this.channels.add(channel)
    this.send({
      id: `sub_${Date.now()}`,
      type: 'subscribe',
      channel,
      data: {},
      timestamp: Date.now(),
      priority: 'normal'
    })
  }

  public unsubscribe(channel: string): void {
    this.channels.delete(channel)
    this.send({
      id: `unsub_${Date.now()}`,
      type: 'unsubscribe',
      channel,
      data: {},
      timestamp: Date.now(),
      priority: 'normal'
    })
  }

  public getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    return this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  public getChannels(): Set<string> {
    return new Set(this.channels)
  }

  public disconnect(): void {
    this.cleanup()
    this.ws?.close()
  }
}

export class RealtimeConnectionOptimizer {
  private static connectionPool: ConnectionPool = {
    connections: new Map(),
    channels: new Map(),
    messageQueue: [],
    batchTimer: undefined
  }
  
  private static config: ConnectionConfig = {
    maxConnections: parseInt(process.env.MAX_REALTIME_CONNECTIONS || '1000'),
    heartbeatInterval: 30000, // 30 seconds
    reconnectAttempts: 5,
    reconnectDelay: 1000, // 1 second base delay
    messageQueueSize: 1000,
    batchSize: 50,
    batchInterval: 100 // 100ms batching interval
  }
  
  private static metrics = {
    activeConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    latencyMeasurements: [] as number[],
    reconnectionCount: 0,
    errorCount: 0
  }

  /**
   * Initialize real-time connection optimization
   */
  static initialize(customConfig?: Partial<ConnectionConfig>): void {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig }
    }
    
    // Start message batching
    this.startMessageBatching()
    
    // Start connection cleanup
    setInterval(() => this.cleanupInactiveConnections(), 60000) // 1 minute
    
    console.log('✅ Realtime Connection Optimizer initialized')
  }

  /**
   * Create or reuse optimized connection
   */
  static async getConnection(userId: string, url: string): Promise<OptimizedConnection> {
    let connection = this.connectionPool.connections.get(userId)
    
    if (!connection || !connection.isConnected()) {
      // Check connection limit
      if (this.connectionPool.connections.size >= this.config.maxConnections) {
        throw new Error('Maximum connections reached')
      }
      
      connection = new OptimizedConnection(userId, url, this.config)
      
      connection.on('connected', () => {
        this.metrics.activeConnections++
      })
      
      connection.on('message', (message: RealtimeMessage) => {
        this.metrics.messagesReceived++
        this.handleIncomingMessage(message)
      })
      
      connection.on('error', () => {
        this.metrics.errorCount++
      })
      
      connection.on('maxReconnectsReached', () => {
        this.connectionPool.connections.delete(userId)
        this.metrics.activeConnections--
      })
      
      this.connectionPool.connections.set(userId, connection)
    }
    
    return connection
  }

  /**
   * Broadcast message to channel subscribers
   */
  static async broadcast(message: RealtimeMessage): Promise<void> {
    const subscribers = this.connectionPool.channels.get(message.channel) || new Set()
    
    // Add to batch queue for efficient delivery
    this.connectionPool.messageQueue.push(message)
    
    // Immediate delivery for critical messages
    if (message.priority === 'critical') {
      await this.flushMessageBatch()
    }
  }

  /**
   * Subscribe connection to channel
   */
  static subscribeToChannel(userId: string, channel: string): void {
    const connection = this.connectionPool.connections.get(userId)
    if (!connection) return
    
    connection.subscribe(channel)
    
    // Update channel subscribers
    if (!this.connectionPool.channels.has(channel)) {
      this.connectionPool.channels.set(channel, new Set())
    }
    this.connectionPool.channels.get(channel)!.add(userId)
  }

  /**
   * Unsubscribe connection from channel
   */
  static unsubscribeFromChannel(userId: string, channel: string): void {
    const connection = this.connectionPool.connections.get(userId)
    if (!connection) return
    
    connection.unsubscribe(channel)
    
    // Update channel subscribers
    const subscribers = this.connectionPool.channels.get(channel)
    if (subscribers) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        this.connectionPool.channels.delete(channel)
      }
    }
  }

  /**
   * Optimized message delivery with batching
   */
  private static startMessageBatching(): void {
    this.connectionPool.batchTimer = setInterval(() => {
      this.flushMessageBatch()
    }, this.config.batchInterval)
  }

  private static async flushMessageBatch(): Promise<void> {
    if (this.connectionPool.messageQueue.length === 0) return
    
    // Group messages by channel and priority
    const channelBatches = new Map<string, RealtimeMessage[]>()
    const criticalMessages: RealtimeMessage[] = []
    
    // Process up to batchSize messages
    const batch = this.connectionPool.messageQueue.splice(0, this.config.batchSize)
    
    for (const message of batch) {
      if (message.priority === 'critical') {
        criticalMessages.push(message)
      } else {
        if (!channelBatches.has(message.channel)) {
          channelBatches.set(message.channel, [])
        }
        channelBatches.get(message.channel)!.push(message)
      }
    }
    
    // Send critical messages immediately
    for (const message of criticalMessages) {
      await this.sendToChannelSubscribers(message)
    }
    
    // Send batched messages by channel
    for (const [channel, messages] of channelBatches) {
      await this.sendBatchToChannel(channel, messages)
    }
    
    this.metrics.messagesSent += batch.length
  }

  private static async sendToChannelSubscribers(message: RealtimeMessage): Promise<void> {
    const subscribers = this.connectionPool.channels.get(message.channel) || new Set()
    
    const promises = Array.from(subscribers).map(userId => {
      const connection = this.connectionPool.connections.get(userId)
      if (connection?.isConnected()) {
        connection.send(message)
      }
    })
    
    await Promise.allSettled(promises)
  }

  private static async sendBatchToChannel(channel: string, messages: RealtimeMessage[]): Promise<void> {
    const subscribers = this.connectionPool.channels.get(channel) || new Set()
    
    // Create batch message
    const batchMessage: RealtimeMessage = {
      id: `batch_${Date.now()}`,
      type: 'batch',
      channel,
      data: { messages },
      timestamp: Date.now(),
      priority: 'normal'
    }
    
    const promises = Array.from(subscribers).map(userId => {
      const connection = this.connectionPool.connections.get(userId)
      if (connection?.isConnected()) {
        connection.send(batchMessage)
      }
    })
    
    await Promise.allSettled(promises)
  }

  /**
   * Handle incoming messages from connections
   */
  private static handleIncomingMessage(message: RealtimeMessage): void {
    // Route message to appropriate handler based on type
    switch (message.type) {
      case 'task_update':
        this.handleTaskUpdate(message)
        break
      case 'habit_completion':
        this.handleHabitCompletion(message)
        break
      case 'productivity_alert':
        this.handleProductivityAlert(message)
        break
      case 'calendar_sync':
        this.handleCalendarSync(message)
        break
      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private static handleTaskUpdate(message: RealtimeMessage): void {
    // Broadcast task updates to relevant channels
    const channels = [`user:${message.userId}:tasks`, `project:${message.data.projectId}:tasks`]
    
    for (const channel of channels) {
      this.broadcast({
        ...message,
        channel,
        type: 'task_updated'
      })
    }
  }

  private static handleHabitCompletion(message: RealtimeMessage): void {
    // Broadcast habit completion to user channel
    this.broadcast({
      ...message,
      channel: `user:${message.userId}:habits`,
      type: 'habit_completed'
    })
  }

  private static handleProductivityAlert(message: RealtimeMessage): void {
    // High priority for productivity alerts
    this.broadcast({
      ...message,
      channel: `user:${message.userId}:alerts`,
      priority: 'high'
    })
  }

  private static handleCalendarSync(message: RealtimeMessage): void {
    // Broadcast calendar updates
    this.broadcast({
      ...message,
      channel: `user:${message.userId}:calendar`
    })
  }

  /**
   * Connection cleanup and maintenance
   */
  private static cleanupInactiveConnections(): void {
    let cleaned = 0
    
    for (const [userId, connection] of this.connectionPool.connections) {
      if (!connection.isConnected()) {
        connection.disconnect()
        this.connectionPool.connections.delete(userId)
        
        // Remove from all channels
        for (const [channel, subscribers] of this.connectionPool.channels) {
          subscribers.delete(userId)
          if (subscribers.size === 0) {
            this.connectionPool.channels.delete(channel)
          }
        }
        
        cleaned++
        this.metrics.activeConnections--
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} inactive connections`)
    }
  }

  /**
   * Get connection performance metrics
   */
  static getMetrics(): ConnectionMetrics {
    let totalLatency = 0
    let latencyCount = 0
    
    // Collect latency from all connections
    for (const connection of this.connectionPool.connections.values()) {
      const avgLatency = connection.getAverageLatency()
      if (avgLatency > 0) {
        totalLatency += avgLatency
        latencyCount++
      }
    }
    
    return {
      activeConnections: this.metrics.activeConnections,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      reconnectionCount: this.metrics.reconnectionCount,
      errorRate: this.metrics.messagesSent > 0 ? this.metrics.errorCount / this.metrics.messagesSent : 0,
      throughput: this.metrics.messagesSent // Messages per time window
    }
  }

  /**
   * Connection load balancing
   */
  static getOptimalEndpoint(): string {
    // Simple load balancing - in production, use more sophisticated algorithms
    const endpoints = [
      process.env.REALTIME_ENDPOINT_1 || 'ws://localhost:3001',
      process.env.REALTIME_ENDPOINT_2 || 'ws://localhost:3002',
      process.env.REALTIME_ENDPOINT_3 || 'ws://localhost:3003'
    ]
    
    // Return endpoint with least connections (simplified)
    return endpoints[Math.floor(Math.random() * endpoints.length)]
  }

  /**
   * Graceful shutdown
   */
  static async shutdown(): Promise<void> {
    // Clear timers
    if (this.connectionPool.batchTimer) {
      clearInterval(this.connectionPool.batchTimer)
    }
    
    // Disconnect all connections
    const disconnectPromises = Array.from(this.connectionPool.connections.values()).map(
      connection => new Promise<void>((resolve) => {
        connection.on('close', resolve)
        connection.disconnect()
        setTimeout(resolve, 5000) // Force resolve after 5 seconds
      })
    )
    
    await Promise.allSettled(disconnectPromises)
    
    // Clear pools
    this.connectionPool.connections.clear()
    this.connectionPool.channels.clear()
    this.connectionPool.messageQueue = []
    
    console.log('✅ Realtime connection optimizer shutdown complete')
  }
}

// Utility functions for common real-time patterns
export const createRealtimeMessage = (
  type: string,
  channel: string,
  data: any,
  priority: RealtimeMessage['priority'] = 'normal',
  userId?: string
): RealtimeMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  channel,
  data,
  timestamp: Date.now(),
  priority,
  userId
})

export const subscribeToUserChannel = (userId: string, channelType: string) => {
  RealtimeConnectionOptimizer.subscribeToChannel(userId, `user:${userId}:${channelType}`)
}

export const broadcastToUser = (userId: string, type: string, data: any, priority?: RealtimeMessage['priority']) => {
  const message = createRealtimeMessage(type, `user:${userId}`, data, priority, userId)
  RealtimeConnectionOptimizer.broadcast(message)
}