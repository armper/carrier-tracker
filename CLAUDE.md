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
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `DATABASE_URL` - Direct database connection string (for migrations)

### Database Migrations
Stored in `supabase/migrations/` with timestamp prefixes. Use `npm run db:migrate` to apply to remote database. Local development can use `npm run db:start` and `npm run db:reset` for testing schema changes.