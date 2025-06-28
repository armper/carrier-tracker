# CarrierTracker - Development Workflow

Transportation carrier monitoring platform (carrier411 competitor)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

### 3. Database Setup
```bash
# Apply migrations to your remote database
npm run db:migrate

# Or start local development database
npm run db:start
npm run db:reset  # Applies all migrations + seed data
```

### 4. Start Development Server
```bash
npm run dev
```

## 🔄 Development Workflow

### Making Code Changes
```bash
# 1. Make your changes to components, pages, etc.
# 2. Test locally
npm run dev

# 3. Deploy when ready
git add .
git commit -m "Your changes"
git push  # Automatically deploys to Vercel
```

### Making Database Schema Changes
```bash
# 1. Create a new migration file
echo "ALTER TABLE carriers ADD COLUMN rating INTEGER;" > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_rating.sql

# 2. Test locally (if using local Supabase)
npm run db:reset

# 3. Apply to remote database
npm run db:migrate

# 4. Deploy
git add .
git commit -m "Add carrier rating field"
git push  # Runs migrations automatically on Vercel
```

## 📋 Available Commands

### Development
- `npm run dev` - Start Next.js development server with Turbopack
- `npm run build` - Build for production (includes migration)
- `npm run lint` - Run ESLint

### Database (Local Development)
- `npm run db:start` - Start local Supabase instance
- `npm run db:stop` - Stop local Supabase instance
- `npm run db:reset` - Reset local DB with all migrations + seed data

### Database (Remote)
- `npm run db:migrate` - Push migrations to remote Supabase database
- `npm run db:seed` - Load seed data into remote database

### Migration (Deployment)
- `npm run migrate:build` - Run during Vercel build process
- `npm run migrate:manual` - Manual migration via API (if needed)

## 🏗️ Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # User dashboard
│   │   ├── search/         # Carrier search
│   │   └── api/migrate/    # Migration API endpoint
│   └── lib/                # Shared utilities
│       ├── supabase.ts     # Client-side Supabase
│       ├── supabase-server.ts  # Server-side Supabase
│       └── migrate.ts      # Migration system
├── supabase/
│   ├── migrations/         # Database migration files
│   ├── seed.sql           # Sample data
│   └── config.toml        # Supabase configuration
└── scripts/               # Build and utility scripts
```

## 🌐 Deployment

### Automatic Deployment
Every `git push` to main branch:
1. Triggers Vercel deployment
2. Runs database migrations
3. Builds and deploys the app

### Manual Operations
```bash
# Check database status
node scripts/check-database.js

# Manual migration (if needed)
npm run migrate:manual
```

## 🔧 Environment Variables

Required in both `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for migrations)
- `DATABASE_URL` - Direct database connection string

## 🚛 Testing

Search for these sample carriers to test:
- **"ABC"** or DOT **"123456"** - ABC Transport LLC
- **"Swift"** or DOT **"345678"** - Swift Carriers Corp
- **"XYZ"** or DOT **"789012"** - XYZ Logistics Inc

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Aria Components](https://react-spectrum.adobe.com/react-aria/)