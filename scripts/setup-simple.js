const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// You'll need your service role key for this
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You need to add this to .env.local

if (!supabaseServiceKey) {
  console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.log('Get it from your Supabase dashboard: Settings -> API -> service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  console.log('🔧 Setting up database tables...')
  
  try {
    // Create profiles table
    console.log('Creating profiles table...')
    const { error: profilesError } = await supabase.rpc('sql', {
      query: `
        create table if not exists public.profiles (
          id uuid references auth.users on delete cascade not null primary key,
          email text unique not null,
          full_name text,
          company_name text,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })
    
    if (profilesError) console.log('Profiles error:', profilesError)
    else console.log('✅ Profiles table created')
    
    // Create carriers table
    console.log('Creating carriers table...')
    const { error: carriersError } = await supabase.rpc('sql', {
      query: `
        create table if not exists public.carriers (
          id uuid default gen_random_uuid() primary key,
          dot_number text unique not null,
          legal_name text not null,
          dba_name text,
          physical_address text,
          phone text,
          email text,
          safety_rating text,
          insurance_status text,
          authority_status text,
          carb_compliance boolean default false,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })
    
    if (carriersError) console.log('Carriers error:', carriersError)
    else console.log('✅ Carriers table created')
    
    console.log('✅ Database setup complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createTables()