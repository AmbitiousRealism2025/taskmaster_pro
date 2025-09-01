# Infrastructure Foundation Subgroup - Phase 1 Week 1

## ⚠️ Implementation Notes
- **Subgroup Number**: 1 (First subgroup - includes project scaffolding)
- **MCP Requirements**: MANDATORY - Verify Memory, Serena, Playwright, Context7 servers via `/prime`
- **MCP Initialization**: Load project foundation context, no previous memories exist
- **MCP Storage**: Store project architecture, tech stack decisions, development patterns
- **Compact After Completion**: MANDATORY - Must compact before proceeding to Subgroup 2
- **Test Coverage**: Phase1_Foundation_Tests.md (Tests 1-6)
- **Dependencies**: None - This is the first subgroup
- **Related Enhancements**: None
- **Estimated Context Usage**: 30-40% (includes project setup)

## 🔌 MCP Server Workflow for This Subgroup

### Pre-Implementation (REQUIRED):
1. **Session Startup**: Run `/prime` command - verify all 4 MCP servers operational
2. **Initial Context**: Knowledge graph empty (first subgroup)
3. **Framework Access**: Use `mcp__context7__resolve-library-id()` for Next.js, Prisma documentation

### During Implementation:
1. **Store Decisions**: `mcp__serena__write_memory("infrastructure_foundation", "Project architecture decisions")`
2. **Create Entities**: `mcp__memory__create_entities()` for tech stack, development patterns
3. **Test Execution**: `mcp__playwright__playwright_navigate()` once development server is ready

### Post-Implementation:
1. **Knowledge Graph**: Update with project foundation, tech stack relationships
2. **Architectural Summary**: `mcp__serena__write_memory("subgroup_1_complete", completion_summary)`
3. **Pattern Storage**: Store Next.js patterns, Prisma configuration, testing setup

---

**Responsible Team**: Platform/DevOps + Backend Engineers  
**Duration**: Week 1 of Phase 1  
**Prerequisites**: None (foundation layer)  
**Dependencies**: All other subgroups depend on this foundation

## Subgroup Overview

The Infrastructure Foundation subgroup establishes the core platform infrastructure, development environment, and operational foundation for TaskMaster Pro. This includes containerization, database setup, CI/CD pipelines, monitoring, logging, and deployment automation.

### Core Responsibilities

1. **Development Environment Setup**
   - Docker containerization for consistent environments
   - Database configuration and migration system
   - Environment variable management
   - Development toolchain configuration

2. **CI/CD Pipeline Infrastructure**
   - Automated testing workflows
   - Build and deployment pipelines
   - Code quality gates and security scanning
   - Environment-specific deployment strategies

3. **Database Infrastructure**
   - PostgreSQL setup with Prisma ORM
   - Migration management system
   - Database performance monitoring
   - Backup and recovery procedures

4. **Monitoring & Observability**
   - Application performance monitoring
   - Structured logging with centralized collection
   - Error tracking and alerting
   - Health check endpoints and metrics

5. **Security Foundation**
   - Secret management and environment security
   - HTTPS/TLS configuration
   - Database security and access controls
   - Security headers and CORS setup

## Test Coverage Requirements

Based on Phase1_Foundation_Tests.md, this subgroup must implement tests that cover:

### Database Schema Tests (`__tests__/database/models.test.ts`)
- User model with email uniqueness constraints
- Project model with user relationships
- Task model with project and user relationships
- Relationship integrity and cascading operations

### Authentication Infrastructure Tests (`__tests__/auth/auth-flow.test.ts`)
- NextAuth configuration and provider setup
- Session management and persistence
- OAuth provider integration (Google, GitHub)
- Credential-based authentication flow

### Setup and Configuration Tests (`__tests__/setup.ts`)
- Test environment configuration
- Mock service initialization
- Database connection and cleanup
- Environment variable validation

## Infrastructure Setup Patterns

### 1. Docker Development Environment

**`docker-compose.yml`**
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://taskmaster:password@db:5432/taskmaster_dev
      - NEXTAUTH_SECRET=dev-secret-key
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db
      - redis
    networks:
      - taskmaster-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=taskmaster
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=taskmaster_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - taskmaster-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - taskmaster-network

  test-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=taskmaster
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=taskmaster_test
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data
    networks:
      - taskmaster-network

volumes:
  postgres_data:
  redis_data:

networks:
  taskmaster-network:
    driver: bridge
```

**`Dockerfile.dev`**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Development command
CMD ["npm", "run", "dev"]
```

### 2. Environment Configuration Management

**`.env.local` (Development)**
```bash
# Database
DATABASE_URL="postgresql://taskmaster:password@localhost:5432/taskmaster_dev"
DATABASE_TEST_URL="postgresql://taskmaster:password@localhost:5433/taskmaster_test"

# Authentication
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="debug"

# AI Integration (OpenRouter)
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
```

**`lib/config/env.ts`** - Environment validation
```typescript
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  DATABASE_TEST_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  REDIS_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  OPENROUTER_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)

// Runtime environment checks
export const isDevelopment = env.NODE_ENV === 'development'
export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
```

### 3. CI/CD Pipeline Configuration

**`.github/workflows/ci.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  test:
    name: Test & Quality Check
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: taskmaster
          POSTGRES_PASSWORD: password
          POSTGRES_DB: taskmaster_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma db push
        env:
          DATABASE_URL: postgresql://taskmaster:password@localhost:5432/taskmaster_test

      - name: Type check
        run: npm run type-check

      - name: Lint code
        run: npm run lint

      - name: Run unit tests
        run: npm run test -- --coverage
        env:
          DATABASE_TEST_URL: postgresql://taskmaster:password@localhost:5432/taskmaster_test
          NEXTAUTH_SECRET: test-secret-key-min-32-characters
          NEXTAUTH_URL: http://localhost:3000
          REDIS_URL: redis://localhost:6379

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_TEST_URL: postgresql://taskmaster:password@localhost:5432/taskmaster_test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [test, security]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/

  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - name: Deploy to Vercel Staging
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Development Environment Configuration

### 1. Database Setup and Migration Patterns

**`prisma/schema.prisma`**
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  
  // Authentication
  accounts Account[]
  sessions Session[]
  
  // Application data
  projects Project[]
  tasks    Task[]
  notes    Note[]
  habits   Habit[]
  
  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verificationtokens")
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#6366f1")
  userId      String
  
  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks Task[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("projects")
}

enum TaskStatus {
  TODO
  IN_PROGRESS  
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  estimatedMinutes Int?
  actualMinutes    Int?
  
  userId    String
  projectId String?
  
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  completedAt DateTime?
  
  @@map("tasks")
}

model Note {
  id      String @id @default(cuid())
  title   String
  content String @db.Text
  userId  String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("notes")
}

model Habit {
  id          String @id @default(cuid())
  name        String
  description String?
  color       String @default("#10b981")
  targetFreq  Int    @default(1) // times per day
  userId      String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("habits")
}
```

**Database Migration Scripts**

**`scripts/db-setup.sh`**
```bash
#!/bin/bash
set -e

echo "🚀 Setting up TaskMaster Pro database..."

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
fi

# Create development database
echo "📦 Creating development database..."
docker-compose up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec db pg_isready -U taskmaster; do
  sleep 2
done

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "📋 Running database migrations..."
npx prisma db push

# Seed database with initial data
echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ Database setup complete!"
```

**`prisma/seed.ts`**
```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const hashedPassword = await hash('demo123', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@taskmaster.com' },
    update: {},
    create: {
      email: 'demo@taskmaster.com',
      name: 'Demo User',
    },
  })

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project' },
    update: {},
    create: {
      id: 'demo-project',
      name: 'Getting Started',
      description: 'Learn how to use TaskMaster Pro',
      color: '#6366f1',
      userId: user.id,
    },
  })

  // Create demo tasks
  const tasks = await Promise.all([
    prisma.task.upsert({
      where: { id: 'demo-task-1' },
      update: {},
      create: {
        id: 'demo-task-1',
        title: 'Explore the dashboard',
        description: 'Take a look around and familiarize yourself with the interface',
        status: 'COMPLETED',
        priority: 'HIGH',
        userId: user.id,
        projectId: project.id,
        completedAt: new Date(),
      },
    }),
    prisma.task.upsert({
      where: { id: 'demo-task-2' },
      update: {},
      create: {
        id: 'demo-task-2',
        title: 'Create your first task',
        description: 'Add a new task to get started with task management',
        status: 'TODO',
        priority: 'MEDIUM',
        userId: user.id,
        projectId: project.id,
      },
    }),
  ])

  // Create demo habit
  await prisma.habit.upsert({
    where: { id: 'demo-habit' },
    update: {},
    create: {
      id: 'demo-habit',
      name: 'Daily Review',
      description: 'Review tasks and plan for tomorrow',
      color: '#10b981',
      targetFreq: 1,
      userId: user.id,
    },
  })

  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### 2. Database Client Configuration

**`lib/db/client.ts`**
```typescript
import { PrismaClient } from '@prisma/client'
import { env } from '@/lib/config/env'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// Singleton pattern for Prisma client
export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.NODE_ENV === 'test' ? env.DATABASE_TEST_URL : env.DATABASE_URL
    }
  }
})

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn)
}
```

## Monitoring and Logging Setup

### 1. Structured Logging Configuration

**`lib/monitoring/logger.ts`**
```typescript
import winston from 'winston'
import { env } from '@/lib/config/env'

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { 
    service: 'taskmaster-pro',
    environment: env.NODE_ENV 
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
})

// Add file transport for production
if (env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }))
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }))
}

// Request logging middleware
export function logRequest(req: Request, res: Response, duration: number) {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    duration: `${duration}ms`,
    status: res.status
  })
}

// Error logging helper
export function logError(error: Error, context?: Record<string, any>) {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  })
}

// Performance logging helper
export function logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  })
}
```

### 2. Health Check and Metrics

**`app/api/health/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/db/client'
import { logger } from '@/lib/monitoring/logger'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  services: {
    database: boolean
    cache: boolean
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const databaseHealthy = await checkDatabaseConnection()
    
    // Check cache connection (Redis)
    let cacheHealthy = false
    try {
      // Add Redis health check here when implemented
      cacheHealthy = true
    } catch {
      cacheHealthy = false
    }

    const healthStatus: HealthStatus = {
      status: databaseHealthy && cacheHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: databaseHealthy,
        cache: cacheHealthy
      }
    }

    const duration = Date.now() - startTime
    logger.info('Health check completed', { duration, status: healthStatus.status })

    return NextResponse.json(healthStatus, { 
      status: healthStatus.status === 'healthy' ? 200 : 503 
    })
  } catch (error) {
    logger.error('Health check failed', { error })
    
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Internal server error' 
      },
      { status: 503 }
    )
  }
}
```

**`app/api/metrics/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  try {
    const [
      userCount,
      taskCount,
      projectCount,
      completedTasksToday
    ] = await Promise.all([
      prisma.user.count(),
      prisma.task.count(),
      prisma.project.count(),
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    const metrics = {
      users_total: userCount,
      tasks_total: taskCount,
      projects_total: projectCount,
      tasks_completed_today: completedTasksToday,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
```

## Error Handling and Recovery Patterns

### 1. Global Error Handling

**`lib/errors/handlers.ts`**
```typescript
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/monitoring/logger'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Log the error
  logger.error('API Error', { 
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  })

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          { error: 'Resource already exists' },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          { error: 'Resource not found' },
          { status: 404 }
        )
      default:
        return NextResponse.json(
          { error: 'Database operation failed' },
          { status: 500 }
        )
    }
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

// Error boundary for async route handlers
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
```

### 2. Database Error Recovery

**`lib/db/resilience.ts`**
```typescript
import { prisma } from './client'
import { logger } from '@/lib/monitoring/logger'

interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = { ...defaultRetryOptions, ...options }
  
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxAttempts) {
        break
      }
      
      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      
      logger.warn(`Database operation failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts,
        error: lastError.message
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    'connection refused',
    'connection timeout',
    'server closed the connection',
    'connection lost'
  ]
  
  return retryablePatterns.some(pattern =>
    error.message.toLowerCase().includes(pattern)
  )
}

// Circuit breaker pattern
class CircuitBreaker {
  private failures = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private nextAttempt = Date.now()

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open')
      }
      this.state = 'half-open'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
      this.nextAttempt = Date.now() + this.recoveryTimeout
    }
  }
}

export const databaseCircuitBreaker = new CircuitBreaker()
```

## Integration Points with Other Subgroups

### 1. Authentication & Security Integration

**Provides to Authentication subgroup:**
- Database user and session models
- Environment configuration for NextAuth
- Health check endpoints for auth services

**Receives from Authentication subgroup:**
- Authentication middleware requirements
- Session management patterns
- Security header configurations

### 2. Design System Integration

**Provides to Design System subgroup:**
- Component development environment
- Theme configuration infrastructure
- Build system for CSS processing

**Receives from Design System subgroup:**
- Theme token requirements
- Asset processing needs
- Performance budgets

### 3. API Layer Integration

**Provides to API Layer subgroup:**
- Database models and relationships
- Error handling patterns
- Logging and monitoring infrastructure

**Receives from API Layer subgroup:**
- API endpoint specifications
- Data validation requirements
- Caching strategies

## Code Examples for Common Infrastructure Tasks

### 1. Environment-Aware Configuration

**`lib/config/database.ts`**
```typescript
import { env } from './env'

export const databaseConfig = {
  url: env.NODE_ENV === 'test' ? env.DATABASE_TEST_URL : env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './prisma/migrations',
    tableName: 'migrations'
  },
  seeds: {
    directory: './prisma/seeds'
  }
}

export const cacheConfig = {
  redis: {
    url: env.REDIS_URL,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    family: 4,
    keyPrefix: `taskmaster:${env.NODE_ENV}:`
  }
}
```

### 2. Performance Monitoring Middleware

**`middleware.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { logRequest, logger } from '@/lib/monitoring/logger'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Skip monitoring for static files
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    return NextResponse.next()
  }
  
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Log request after response
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`)
  
  // Schedule async logging (don't block response)
  process.nextTick(() => {
    logRequest(request, response, Date.now() - startTime)
  })
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
```

### 3. Background Job Processing

**`lib/jobs/processor.ts`**
```typescript
import { logger } from '@/lib/monitoring/logger'

export interface Job {
  id: string
  type: string
  data: any
  priority: number
  attempts: number
  maxAttempts: number
  createdAt: Date
  processAt: Date
}

export interface JobHandler {
  type: string
  handler: (data: any) => Promise<void>
}

class JobProcessor {
  private handlers = new Map<string, JobHandler['handler']>()
  private processing = false

  register(handler: JobHandler) {
    this.handlers.set(handler.type, handler.handler)
    logger.info(`Registered job handler: ${handler.type}`)
  }

  async start() {
    if (this.processing) return
    
    this.processing = true
    logger.info('Job processor started')
    
    // Process jobs every 10 seconds
    const interval = setInterval(async () => {
      if (!this.processing) {
        clearInterval(interval)
        return
      }
      
      await this.processJobs()
    }, 10000)
  }

  async stop() {
    this.processing = false
    logger.info('Job processor stopped')
  }

  private async processJobs() {
    // Implementation would fetch jobs from database
    // and process them using registered handlers
    try {
      // Example: fetch pending jobs from database
      const jobs = await this.getPendingJobs()
      
      for (const job of jobs) {
        await this.processJob(job)
      }
    } catch (error) {
      logger.error('Job processing failed', { error })
    }
  }

  private async processJob(job: Job) {
    const handler = this.handlers.get(job.type)
    if (!handler) {
      logger.error(`No handler found for job type: ${job.type}`)
      return
    }

    try {
      await handler(job.data)
      logger.info('Job completed successfully', { jobId: job.id, type: job.type })
    } catch (error) {
      logger.error('Job failed', { jobId: job.id, type: job.type, error })
    }
  }

  private async getPendingJobs(): Promise<Job[]> {
    // This would query the database for pending jobs
    // For now, return empty array
    return []
  }
}

export const jobProcessor = new JobProcessor()
```

## Testing Approaches for Infrastructure Code

### 1. Database Testing Patterns

**`__tests__/database/connection.test.ts`**
```typescript
import { prisma, checkDatabaseConnection } from '@/lib/db/client'
import { withRetry, databaseCircuitBreaker } from '@/lib/db/resilience'

describe('Database Connection', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should connect to test database', async () => {
    const isConnected = await checkDatabaseConnection()
    expect(isConnected).toBe(true)
  })

  it('should handle connection failures gracefully', async () => {
    // Mock database failure
    const originalQuery = prisma.$queryRaw
    const mockQueryRaw = jest.spyOn(prisma, '$queryRaw').mockRejectedValue(
      new Error('connection refused')
    )

    const isConnected = await checkDatabaseConnection()
    expect(isConnected).toBe(false)

    mockQueryRaw.mockRestore()
  })

  it('should retry failed operations', async () => {
    let attempts = 0
    const operation = jest.fn().mockImplementation(() => {
      attempts++
      if (attempts < 3) {
        throw new Error('connection timeout')
      }
      return Promise.resolve('success')
    })

    const result = await withRetry(operation, { maxAttempts: 3, baseDelay: 10 })
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('should implement circuit breaker pattern', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('database error'))

    // Trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await databaseCircuitBreaker.execute(failingOperation)
      } catch {
        // Expected to fail
      }
    }

    // Circuit should now be open
    await expect(
      databaseCircuitBreaker.execute(failingOperation)
    ).rejects.toThrow('Circuit breaker is open')
  })
})
```

### 2. Configuration Testing

**`__tests__/config/env.test.ts`**
```typescript
import { env } from '@/lib/config/env'

describe('Environment Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should validate required environment variables', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-min-32-characters'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.REDIS_URL = 'redis://localhost:6379'

    expect(() => require('@/lib/config/env')).not.toThrow()
  })

  it('should fail validation for invalid URLs', () => {
    process.env.DATABASE_URL = 'invalid-url'

    expect(() => require('@/lib/config/env')).toThrow()
  })

  it('should provide correct environment flags', () => {
    process.env.NODE_ENV = 'development'
    
    const { isDevelopment, isProduction, isTest } = require('@/lib/config/env')
    expect(isDevelopment).toBe(true)
    expect(isProduction).toBe(false)
    expect(isTest).toBe(false)
  })
})
```

### 3. API Health Check Testing

**`__tests__/api/health.test.ts`**
```typescript
import { GET } from '@/app/api/health/route'
import { checkDatabaseConnection } from '@/lib/db/client'

jest.mock('@/lib/db/client', () => ({
  checkDatabaseConnection: jest.fn()
}))

describe('/api/health', () => {
  const mockCheckDatabaseConnection = checkDatabaseConnection as jest.MockedFunction<
    typeof checkDatabaseConnection
  >

  it('should return healthy status when all services are up', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(true)

    const request = new Request('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.services.database).toBe(true)
  })

  it('should return degraded status when database is down', async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false)

    const request = new Request('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.services.database).toBe(false)
  })
})
```

### 4. Performance and Load Testing

**`__tests__/performance/load.test.ts`**
```typescript
import { performance } from 'perf_hooks'
import { prisma } from '@/lib/db/client'

describe('Performance Tests', () => {
  beforeAll(async () => {
    // Seed test data
    await prisma.user.createMany({
      data: Array.from({ length: 100 }, (_, i) => ({
        email: `user${i}@test.com`,
        name: `User ${i}`
      }))
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: '@test.com' } }
    })
    await prisma.$disconnect()
  })

  it('should handle concurrent database operations', async () => {
    const startTime = performance.now()

    // Simulate concurrent requests
    const operations = Array.from({ length: 10 }, (_, i) =>
      prisma.user.findUnique({
        where: { email: `user${i}@test.com` }
      })
    )

    const results = await Promise.all(operations)
    const duration = performance.now() - startTime

    expect(results).toHaveLength(10)
    expect(results.every(user => user !== null)).toBe(true)
    expect(duration).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should maintain performance under load', async () => {
    const iterations = 50
    const results: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      
      await prisma.user.count()
      
      const duration = performance.now() - start
      results.push(duration)
    }

    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length
    const maxTime = Math.max(...results)

    expect(averageTime).toBeLessThan(50) // Average should be under 50ms
    expect(maxTime).toBeLessThan(200) // Max should be under 200ms
  })
})
```

## Success Metrics and Exit Criteria

### Phase 1 Week 1 Completion Requirements

**Infrastructure Setup (Required)**
- [ ] Docker development environment fully functional
- [ ] PostgreSQL database with Prisma ORM configured
- [ ] Environment configuration system implemented
- [ ] CI/CD pipeline with automated testing
- [ ] Logging and monitoring system operational

**Database Foundation (Required)**
- [ ] All Prisma models defined and validated
- [ ] Database migrations working in all environments
- [ ] Seed data system functional
- [ ] Database connection pooling and resilience

**Testing Infrastructure (Required)**
- [ ] All Phase 1 foundation tests written and initially failing
- [ ] Test environment configuration complete
- [ ] Mock services and test utilities ready
- [ ] Performance and load testing framework

**Operational Readiness (Required)**
- [ ] Health check endpoints functional
- [ ] Error handling and logging comprehensive
- [ ] Security headers and basic hardening
- [ ] Development workflow documentation

### Performance Benchmarks

**Database Performance**
- Connection establishment: < 100ms
- Simple queries: < 50ms average
- Complex queries: < 200ms average
- Concurrent operations: Handle 10+ simultaneous requests

**API Performance**
- Health check endpoint: < 10ms response time
- Error handling overhead: < 5ms additional latency
- Logging overhead: < 1ms per request

**CI/CD Performance**
- Test suite execution: < 5 minutes
- Build process: < 3 minutes
- Security scans: < 2 minutes

### Handoff to Phase 1 Week 2 Subgroups

**Documentation Deliverables**
- Infrastructure setup guide
- Database schema documentation
- API error handling patterns
- Performance monitoring playbook

**Integration Points Ready**
- Authentication system database models
- Design system build configuration
- API layer error handling patterns
- Dashboard layout data queries

This infrastructure foundation provides the robust, scalable, and observable platform required for TaskMaster Pro's continued development across all subsequent phases.