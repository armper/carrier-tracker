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