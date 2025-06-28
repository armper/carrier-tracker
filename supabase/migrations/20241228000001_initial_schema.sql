-- Initial schema for CarrierTracker

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table for users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  company_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create carriers table
create table public.carriers (
  id uuid default uuid_generate_v4() primary key,
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

-- Create saved_carriers table for user favorites
create table public.saved_carriers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  carrier_id uuid references public.carriers(id) on delete cascade not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, carrier_id)
);

-- Create monitoring_alerts table
create table public.monitoring_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  carrier_id uuid references public.carriers(id) on delete cascade not null,
  alert_type text not null, -- 'safety_rating', 'insurance', 'authority', etc.
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.carriers enable row level security;
alter table public.saved_carriers enable row level security;
alter table public.monitoring_alerts enable row level security;

-- Create RLS policies
-- Profiles: users can view and update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Carriers: readable by all authenticated users
create policy "Carriers are viewable by authenticated users" on public.carriers
  for select using (auth.role() = 'authenticated');

-- Saved carriers: users can only see their own
create policy "Users can view own saved carriers" on public.saved_carriers
  for select using (auth.uid() = user_id);

create policy "Users can insert own saved carriers" on public.saved_carriers
  for insert with check (auth.uid() = user_id);

create policy "Users can update own saved carriers" on public.saved_carriers
  for update using (auth.uid() = user_id);

create policy "Users can delete own saved carriers" on public.saved_carriers
  for delete using (auth.uid() = user_id);

-- Monitoring alerts: users can only see their own
create policy "Users can view own alerts" on public.monitoring_alerts
  for select using (auth.uid() = user_id);

create policy "Users can insert own alerts" on public.monitoring_alerts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own alerts" on public.monitoring_alerts
  for update using (auth.uid() = user_id);

create policy "Users can delete own alerts" on public.monitoring_alerts
  for delete using (auth.uid() = user_id);

-- Create function to handle user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();