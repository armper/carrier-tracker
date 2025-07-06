# Supabase Authentication Guide

## Authentication Setup

### Client Configuration

#### Browser Client (`src/lib/supabase.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server Client (`src/lib/supabase-server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Regular server client for user operations
export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context - ignored with middleware
          }
        },
      },
    }
  )
}

// Service role client for admin operations (bypasses RLS)
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

### Middleware Protection (`middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /dashboard and /profile routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
     request.nextUrl.pathname.startsWith('/profile'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

## User Management

### Profile Creation
Automatic profile creation via database trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'other')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### User Types
- `driver` - Truck drivers
- `carrier` - Transportation carriers
- `broker` - Freight brokers
- `other` - Default type for general users

### Admin Users
- `is_admin` boolean flag in profiles table
- Admin users can access administrative functions
- Service role client used for admin operations

## Authentication Flow

### Sign Up Process
1. User fills registration form with `user_type` selection
2. Supabase Auth creates user in `auth.users` table
3. `handle_new_user()` trigger automatically creates profile
4. User is redirected to dashboard

### Sign In Process
1. User provides email/password
2. Supabase Auth validates credentials
3. JWT token issued with user ID
4. Middleware validates token on protected routes
5. RLS policies use `auth.uid()` for data access

### Session Management
- JWT tokens stored in secure HTTP-only cookies
- Automatic token refresh handled by Supabase
- Session persistence across browser sessions
- Server-side session validation in middleware

## Row Level Security (RLS)

### Profile Access
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Carrier Data Access
```sql
-- All authenticated users can view carriers
CREATE POLICY "Carriers are viewable by authenticated users" ON carriers
  FOR SELECT USING (auth.role() = 'authenticated');
```

### User-Specific Data
```sql
-- Users can only access their own saved carriers
CREATE POLICY "Users can view own saved carriers" ON saved_carriers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved carriers" ON saved_carriers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Environment Variables

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://axmnmxwjijsigiueednz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Security Notes
- `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose to client
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose, used for RLS
- `SUPABASE_SERVICE_ROLE_KEY` - Keep secret, bypasses RLS

## Client Usage Examples

### Browser Client (Client Components)
```typescript
'use client'
import { createClient } from '@/lib/supabase'

export default function ClientComponent() {
  const supabase = createClient()
  
  const handleSignUp = async (email: string, password: string, userType: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType
        }
      }
    })
    return { data, error }
  }
  
  const handleSignIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }
  
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }
}
```

### Server Client (Server Components)
```typescript
import { createClient } from '@/lib/supabase-server'

export default async function ServerComponent() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch user's saved carriers
  const { data: savedCarriers } = await supabase
    .from('saved_carriers')
    .select(`
      *,
      carriers (
        dot_number,
        legal_name,
        safety_rating
      )
    `)
    .eq('user_id', user?.id)
  
  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      {/* Render saved carriers */}
    </div>
  )
}
```

## Error Handling

### Common Authentication Errors
- `Invalid login credentials` - Wrong email/password
- `Email not confirmed` - User hasn't verified email
- `User not found` - User doesn't exist
- `Session expired` - JWT token expired

### Error Response Format
```typescript
{
  data: null,
  error: {
    message: "Error message",
    status: 400,
    statusText: "Bad Request"
  }
}
```

## iOS Integration Notes

### Swift Package Manager
Add Supabase Swift SDK:
```swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
]
```

### iOS Client Setup
```swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://axmnmxwjijsigiueednz.supabase.co")!,
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
)
```

### Authentication Methods
- Email/Password
- OAuth providers (Google, Apple, etc.)
- Magic links
- Phone authentication

### Session Management
- Automatic token refresh
- Secure keychain storage
- Background session validation
- Deep link handling for auth flows