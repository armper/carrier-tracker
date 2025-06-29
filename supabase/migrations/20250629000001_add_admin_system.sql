-- Add admin system and enhanced carrier data management
-- Part of MVP 2.0 Feature #1: Manual Carrier Data Entry System

-- Add admin role to profiles
ALTER TABLE profiles ADD COLUMN role VARCHAR DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Set alpereastorage@gmail.com as super admin
UPDATE profiles 
SET role = 'super_admin', is_admin = true 
WHERE email = 'alpereastorage@gmail.com';

-- Add enhanced fields to carriers table
ALTER TABLE carriers ADD COLUMN last_manual_update TIMESTAMP;
ALTER TABLE carriers ADD COLUMN data_source VARCHAR DEFAULT 'manual';
ALTER TABLE carriers ADD COLUMN verified BOOLEAN DEFAULT false;
ALTER TABLE carriers ADD COLUMN verification_date TIMESTAMP;
ALTER TABLE carriers ADD COLUMN trust_score INTEGER DEFAULT 50;
ALTER TABLE carriers ADD COLUMN admin_notes TEXT;
ALTER TABLE carriers ADD COLUMN created_by_admin UUID REFERENCES profiles(id);

-- Create admin activity log
CREATE TABLE admin_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR NOT NULL, -- 'create_carrier', 'update_carrier', 'delete_carrier', 'make_admin'
  entity_type VARCHAR NOT NULL, -- 'carrier', 'user'
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create carrier data reports table (for future data verification system)
CREATE TABLE carrier_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  issue_type VARCHAR NOT NULL, -- 'incorrect_name', 'wrong_rating', 'outdated_info', etc.
  description TEXT,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'rejected'
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id)
);

-- RLS Policies for admin system
-- Admin activity log: only admins can read their own activities, super admins can read all
CREATE POLICY "Admins can view own activity log" ON admin_activity_log
  FOR SELECT USING (
    auth.uid() = admin_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Admins can insert activity log" ON admin_activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = admin_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Carrier reports: users can create and view their own, admins can view all
CREATE POLICY "Users can create carrier reports" ON carrier_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reports, admins can view all" ON carrier_reports
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update carrier reports" ON carrier_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Enhanced carrier policies for admin management
DROP POLICY IF EXISTS "Carriers are viewable by authenticated users" ON carriers;

CREATE POLICY "Carriers are viewable by authenticated users" ON carriers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert carriers" ON carriers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update carriers" ON carriers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete carriers" ON carriers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Enable RLS on new tables
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_reports ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at);
CREATE INDEX idx_carrier_reports_carrier_id ON carrier_reports(carrier_id);
CREATE INDEX idx_carrier_reports_status ON carrier_reports(status);
CREATE INDEX idx_carriers_data_source ON carriers(data_source);
CREATE INDEX idx_carriers_verified ON carriers(verified);
CREATE INDEX idx_carriers_dot_number_verified ON carriers(dot_number, verified);

-- Function to log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;