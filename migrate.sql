-- Quick migration script
-- This will be executed via psql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create carriers table  
CREATE TABLE IF NOT EXISTS public.carriers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  dot_number text UNIQUE NOT NULL,
  legal_name text NOT NULL,
  dba_name text,
  physical_address text,
  phone text,
  email text,
  safety_rating text,
  insurance_status text,
  authority_status text,
  carb_compliance boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create saved carriers table
CREATE TABLE IF NOT EXISTS public.saved_carriers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  carrier_id uuid REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, carrier_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_carriers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Carriers viewable by authenticated users" ON public.carriers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own saved carriers" ON public.saved_carriers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved carriers" ON public.saved_carriers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved carriers" ON public.saved_carriers FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sample data
INSERT INTO public.carriers (dot_number, legal_name, dba_name, physical_address, phone, safety_rating, insurance_status, authority_status, carb_compliance) VALUES
('123456', 'ABC Transport LLC', 'ABC Express', '123 Main St, Dallas, TX 75201', '(555) 123-4567', 'Satisfactory', 'Active', 'Active', true),
('789012', 'XYZ Logistics Inc', 'XYZ Freight', '456 Oak Ave, Los Angeles, CA 90210', '(555) 987-6543', 'Satisfactory', 'Active', 'Active', true),
('345678', 'Swift Carriers Corp', null, '789 Pine Rd, Chicago, IL 60601', '(555) 456-7890', 'Conditional', 'Active', 'Active', false),
('901234', 'Reliable Trucking LLC', 'Reliable Express', '321 Elm St, Miami, FL 33101', '(555) 234-5678', 'Satisfactory', 'Active', 'Active', true),
('567890', 'National Freight Co', null, '654 Maple Dr, Phoenix, AZ 85001', '(555) 345-6789', 'Unsatisfactory', 'Inactive', 'Active', false)
ON CONFLICT (dot_number) DO NOTHING;