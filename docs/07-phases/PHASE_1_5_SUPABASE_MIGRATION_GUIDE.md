# Phase 1.5: Supabase Migration Guide

## Quick Reference

**Duration**: 1-2 sessions (4-8 hours)  
**Status**: Planned  
**Prerequisites**: Phase 1 complete, Supabase account  
**Outcome**: Local PostgreSQL → Supabase PostgreSQL with all Prisma code preserved

## Pre-Migration Checklist

### ✅ **Required Setup**
- [ ] Supabase account created/verified
- [ ] New Supabase project created for TaskMaster Pro
- [ ] Database connection details noted
- [ ] Current local database backed up
- [ ] All Phase 1 tests passing locally

### ✅ **Environment Preparation**
- [ ] `.env.local.backup` created with current settings
- [ ] Supabase API keys copied to secure location
- [ ] Development team notified of migration window
- [ ] Rollback plan documented

## Migration Steps

### **Step 1: Supabase Project Configuration** (30 minutes)

1. **Create Project in Supabase Dashboard**
   ```
   - Project name: TaskMaster Pro
   - Database password: [secure-password]
   - Region: [closest-to-deployment]
   ```

2. **Configure Row Level Security**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "Habit" ENABLE ROW LEVEL SECURITY;
   ```

3. **Note Connection Details**
   ```
   Database URL: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   Project URL: https://[project].supabase.co
   Anon Key: [anon-key]
   Service Role Key: [service-role-key]
   ```

### **Step 2: Environment Update** (15 minutes)

```bash
# Update .env.local
DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
SUPABASE_URL="https://[project].supabase.co"
SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[service-role-key]"

# Keep existing
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[existing-secret]"
GOOGLE_CLIENT_ID="[existing-id]"
GOOGLE_CLIENT_SECRET="[existing-secret]"
GITHUB_CLIENT_ID="[existing-id]"  
GITHUB_CLIENT_SECRET="[existing-secret]"
```

### **Step 3: Database Schema Migration** (30 minutes)

```bash
# Generate Prisma client with new connection
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Verify schema in Supabase dashboard
npx prisma studio
```

### **Step 4: Supabase Client Integration** (45 minutes)

```bash
# Install Supabase client
npm install @supabase/supabase-js
```

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```typescript
// src/lib/supabase/types.ts - Auto-generate types
export type Database = {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          name: string | null
          // ... other fields
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
        }
      }
      // ... other tables
    }
  }
}
```

### **Step 5: Health Check Updates** (20 minutes)

```typescript
// Update src/lib/redis/client.ts
export async function checkRedisConnection(): Promise<boolean> {
  try {
    // Check if Supabase is configured instead
    if (!process.env.SUPABASE_URL) {
      console.log('Supabase not configured, skipping health check')
      return true
    }

    // Test Supabase connection
    const { data, error } = await supabase.from('User').select('count').limit(1)
    
    if (error) {
      console.error('Supabase health check failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Supabase health check error:', error)
    return false
  }
}
```

### **Step 6: Testing & Validation** (60 minutes)

```bash
# Run all existing tests
npm run test

# Test API endpoints
curl http://localhost:3000/api/health

# Test authentication flow
npm run dev
# Navigate to /auth/signin and test login

# Performance benchmark
# Compare API response times before/after
```

### **Step 7: Documentation Updates** (30 minutes)

Update the following files:
- `README.md` - Database setup instructions
- `DEPLOYMENT.md` - Production environment variables
- `DEVELOPMENT.md` - Local development with Supabase
- `.env.example` - Add Supabase environment variables

## Validation Checklist

### ✅ **Functionality Tests**
- [ ] All API endpoints respond correctly
- [ ] Authentication flow works (Google, GitHub, credentials)
- [ ] User registration and login successful
- [ ] Task CRUD operations functional
- [ ] Project CRUD operations functional
- [ ] Health check reports Supabase connectivity

### ✅ **Performance Tests**
- [ ] API response times ≤ 200ms (target)
- [ ] Database queries perform as expected
- [ ] No connection timeout issues
- [ ] Health check response time acceptable

### ✅ **Security Validation**
- [ ] Row Level Security policies active
- [ ] API keys properly secured in environment
- [ ] No database credentials in code
- [ ] Connection uses SSL/TLS

## Rollback Plan

**If migration fails at any step:**

1. **Restore Environment**
   ```bash
   cp .env.local.backup .env.local
   ```

2. **Restart Local Database**
   ```bash
   docker-compose up -d postgres
   ```

3. **Verify Local Functionality**
   ```bash
   npm run dev
   # Test all functionality works
   ```

4. **Document Issues**
   - Log specific error messages
   - Note step where failure occurred
   - Prepare for retry with fixes

## Post-Migration Benefits

### **Immediate Gains**
- ✅ **Managed Database**: No more Docker PostgreSQL management
- ✅ **Production Ready**: Database ready for deployment
- ✅ **Monitoring**: Built-in Supabase dashboard monitoring
- ✅ **Backups**: Automatic database backups
- ✅ **Scalability**: Automatic connection pooling and scaling

### **Phase 2 Enhancements Enabled**
- ✅ **Real-time Updates**: Supabase Realtime for live task updates
- ✅ **File Storage**: Task attachments and project files
- ✅ **Advanced Search**: Full-text search capabilities
- ✅ **Collaboration**: Foundation for real-time collaborative features

### **Phase 3 Capabilities Unlocked**
- ✅ **Supabase Auth**: Option to migrate from NextAuth.js
- ✅ **Edge Functions**: Serverless functions for complex operations
- ✅ **Advanced Security**: Row Level Security for multi-tenancy
- ✅ **Analytics**: Built-in query and performance analytics

## Troubleshooting

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| **Connection timeout** | Check DATABASE_URL format, verify Supabase project active |
| **Schema push fails** | Ensure Supabase project allows external connections |
| **Tests fail** | Verify all environment variables set correctly |
| **Slow queries** | Check Supabase project region, consider connection pooling |
| **Auth broken** | Verify NEXTAUTH_URL and callbacks still work |

### **Debug Commands**
```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT version();"

# Check Prisma schema
npx prisma validate

# Inspect Supabase connection
node -e "console.log(process.env.DATABASE_URL)"
```

## Success Criteria

**Phase 1.5 is complete when:**

1. ✅ All existing functionality works with Supabase
2. ✅ All tests pass with new database connection  
3. ✅ API performance meets or exceeds previous benchmarks
4. ✅ Health checks report Supabase connectivity
5. ✅ Development workflow documented
6. ✅ Team can develop locally with Supabase
7. ✅ Ready to add Supabase-specific features in Phase 2

**Phase 2 is ready to begin with enhanced capabilities including real-time features, file storage, and managed infrastructure.**