# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CarrierTracker is a carrier411 competitor - a transportation carrier monitoring platform built with Next.js 14, Supabase, and Tailwind CSS. The platform allows users to search for transportation carriers, view safety ratings and compliance status, and save carriers to a personal dashboard for monitoring.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

### Database Management
- `npm run db:start` - Start local Supabase instance
- `npm run db:stop` - Stop local Supabase instance  
- `npm run db:reset` - Reset local database with all migrations
- `npm run db:migrate` - Push migrations to remote database
- `npm run db:seed` - Seed database with sample data
- `npm run migrate:build` - Run migrations during Vercel build process

### Database Connection & Direct Updates

#### Connection String
For direct database access via `psql`:
```
postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

#### Applying Migrations Directly
```bash
# Apply a specific migration file
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -f supabase/migrations/20250629000005_add_safety_rating_history.sql

# Apply multiple migrations in order
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -f supabase/migrations/20250629000006_add_smart_suggestions.sql
```

#### Database Queries & Maintenance
```bash
# Check table structure
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "\d table_name"

# Check if table exists
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT COUNT(*) FROM table_name;"

# Check RLS policies
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "\d+ table_name"

# Test functions
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT function_name('parameter');"
```

#### Common Database Operations
```bash
# Check user data
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT id, email FROM profiles WHERE id = 'user-uuid';"

# Check saved carriers
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT COUNT(*) FROM saved_carriers WHERE user_id = 'user-uuid';"

# Generate suggestions for user
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT generate_user_suggestions('user-uuid');"

# Check safety rating history
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "SELECT COUNT(*) FROM safety_rating_history WHERE carrier_id = 'carrier-uuid';"
```

#### Fixing Common Issues
```bash
# Drop and recreate problematic functions
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "DROP FUNCTION IF EXISTS function_name(uuid, integer);"

# Fix ambiguous column references
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "CREATE OR REPLACE FUNCTION function_name(...) AS \$\$ ... \$\$ LANGUAGE plpgsql;"

# Recreate indexes
psql "postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" -c "CREATE INDEX IF NOT EXISTS index_name ON table_name(column_name);"
```

#### Environment Variables
Required for database access:
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- Connection string includes password and host details

#### Troubleshooting Database Issues
1. **406 Not Acceptable**: Usually RLS policy blocking query - check user permissions
2. **404 Not Found**: Table/function doesn't exist - apply missing migrations
3. **500 Internal Server Error**: Function errors - check SQL syntax and table aliases
4. **Ambiguous column reference**: Use table aliases in SQL functions
5. **Function not found**: Drop and recreate with corrected syntax

## Architecture

### Tech Stack
- **Frontend/Backend**: Next.js 14 with App Router and TypeScript
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with SSR support
- **Styling**: Tailwind CSS
- **UI Components**: React Aria Components for accessibility

### Database Schema
Core tables:
- `profiles` - User profiles linked to auth.users
- `carriers` - Transportation carrier data (DOT numbers, safety ratings, compliance status)
- `saved_carriers` - User's saved/favorited carriers with notes
- `monitoring_alerts` - User alert configurations for carrier changes

### Authentication Flow
Uses Supabase Auth with SSR:
- Client-side auth: `lib/supabase.ts` (createBrowserClient)
- Server-side auth: `lib/supabase-server.ts` (createServerClient)
- Middleware protection: `middleware.ts` protects `/dashboard` and `/profile` routes
- Auto-profile creation via database trigger on user signup

### Route Structure
- `/` - Landing page with search functionality
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/search` - Carrier search with filtering
- `/dashboard` - Protected user dashboard showing saved carriers

### Key Patterns
- Server Components fetch data using `supabase-server.ts`
- Client Components use `supabase.ts` for mutations and real-time updates
- Dashboard uses hybrid pattern: Server Component fetches initial data, Client Component handles interactions
- RLS policies ensure users only see their own saved carriers and alerts

### Environment Variables
Required in `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for migrations and admin operations
- `DATABASE_URL` - Direct database connection string (for migrations)

### Database Migrations
Stored in `supabase/migrations/` with timestamp prefixes. Use `npm run db:migrate` to apply to remote database. Local development can use `npm run db:start` and `npm run db:reset` for testing schema changes.

## CI/CD Pipeline

### Automated Deployment Workflow
The project uses automated database migrations integrated with Vercel deployment:

```
Code Change → git push → GitHub → Vercel Build → Auto Migration → Deploy
```

### Migration Process
1. **Build Phase**: `npm run build` triggers `npm run migrate:build`
2. **Migration Script**: `scripts/vercel-migrate.js` runs during Vercel build
3. **Schema Changes**: Applied via Supabase CLI using `DATABASE_URL`
4. **Verification**: Database connectivity and data integrity checked
5. **Deployment**: Next.js app deployed with updated schema

### Creating New Migrations
To add schema changes:
```bash
# 1. Create migration file with timestamp
echo "ALTER TABLE carriers ADD COLUMN rating INTEGER;" > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_rating.sql

# 2. Test locally
npm run db:reset

# 3. Deploy (migrations run automatically)
git add . && git commit -m "Add carrier rating field" && git push
```

### Environment Setup for CI/CD
Ensure these environment variables are set in Vercel:
- All database credentials (same as `.env.local`)
- Variables must be set for Production, Preview, and Development environments
- Access Vercel dashboard: Project Settings → Environment Variables

### Migration Troubleshooting
- Check Vercel build logs for migration output
- Use `scripts/check-database.js` to verify database state
- Migration API available at `/api/migrate` for manual runs
- Fallback: Run SQL manually in Supabase SQL Editor

### Project Configuration
- **Supabase Project**: `axmnmxwjijsigiueednz`
- **Vercel Project**: `armandos-projects-cca8df46/carrier-tracker`
- **GitHub Repo**: `armper/carrier-tracker`

### Feature Planning
- **Feature Roadmap**: See `MVP_FEATURES.md` for prioritized feature list
- **Current Focus**: Enhanced search and filtering (Priority #1)
- **Implementation Status**: All features documented with technical requirements
- **Development Order**: Impact/effort optimized for rapid MVP growth

## Development Server

### Background Development Server
The dev server can be run in the background with logs piped to a temp file:
```bash
# Start dev server in background
npm run dev > /tmp/carrier-tracker-dev.log 2>&1 &

# Monitor logs
tail -f /tmp/carrier-tracker-dev.log

# Stop the background server
pkill -f "next dev --turbopack"
```

### Development Log File
- **Log Location**: `/tmp/carrier-tracker-dev.log`
- **Purpose**: Contains Next.js development server output, compilation messages, and runtime logs
- **Usage**: Monitor for build errors, hot reload status, and development debugging
- **Process ID**: Can be found with `ps aux | grep "next dev" | grep -v grep`

### Development Server Status
- **Current Status**: Running in background (PID: 21174)
- **URL**: http://localhost:3000
- **Environment**: .env.local, .env loaded
- **Compilation**: Middleware compiled successfully, ready in 2.1s
- **Pages Compiled**: Home, Search, Auth (Login/Signup), Dashboard all working
- **Log Activity**: Active compilation and request logging in progress