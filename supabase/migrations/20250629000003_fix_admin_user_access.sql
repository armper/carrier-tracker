-- Fix admin user access for user management
-- Allow admins to view all profiles while maintaining user privacy

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create a new policy that allows users to view their own profile OR allows admins to view all profiles
CREATE POLICY "Users can view profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Also ensure admins can update user roles and admin status for user management
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND is_admin = true
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view profiles" ON profiles IS 
'Allows users to view their own profile and admins to view all profiles for user management';

COMMENT ON POLICY "Users can update profiles" ON profiles IS 
'Allows users to update their own profile and admins to update any profile for user management';