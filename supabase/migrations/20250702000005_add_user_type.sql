-- Add user_type field to profiles table
-- This allows users to identify themselves as driver, carrier, broker, or other

-- Add user_type column with default value
ALTER TABLE profiles ADD COLUMN user_type VARCHAR DEFAULT 'other';

-- Create check constraint for valid user types
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type IN ('driver', 'carrier', 'broker', 'other'));

-- Add comment to explain the field
COMMENT ON COLUMN profiles.user_type IS 'User type: driver, carrier, broker, or other';

-- Create index for efficient filtering by user type
CREATE INDEX idx_profiles_user_type ON profiles(user_type);