-- Add admin columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add admin columns to carriers table  
ALTER TABLE public.carriers
ADD COLUMN IF NOT EXISTS last_manual_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_source VARCHAR DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS created_by_admin UUID;

-- Set up super admin
UPDATE public.profiles 
SET role = 'super_admin', is_admin = true 
WHERE email = 'alpereastorage@gmail.com';