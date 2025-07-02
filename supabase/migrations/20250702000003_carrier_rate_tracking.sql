-- Carrier Rate-Per-Mile Tracking System
-- Creates crowd-sourced rate reporting for carriers

-- Enum types for rate categorization
CREATE TYPE load_type_enum AS ENUM (
  'dry_van',
  'reefer', 
  'flatbed',
  'tanker',
  'hazmat',
  'oversized',
  'car_hauler',
  'livestock',
  'other'
);

CREATE TYPE route_type_enum AS ENUM (
  'local',
  'regional',
  'otr',
  'dedicated'
);

CREATE TYPE experience_level_enum AS ENUM (
  'new',
  'experienced', 
  'veteran'
);

-- Main table for rate submissions
CREATE TABLE carrier_rate_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rate information
  rate_per_mile DECIMAL(4,2) NOT NULL CHECK (rate_per_mile >= 0.50 AND rate_per_mile <= 10.00),
  load_type load_type_enum NOT NULL DEFAULT 'dry_van',
  route_type route_type_enum NOT NULL DEFAULT 'otr',
  experience_level experience_level_enum NOT NULL DEFAULT 'experienced',
  
  -- Additional context
  comment TEXT,
  miles_driven_weekly INTEGER CHECK (miles_driven_weekly >= 0 AND miles_driven_weekly <= 5000),
  employment_type VARCHAR(20) CHECK (employment_type IN ('company_driver', 'owner_operator', 'lease_operator')),
  
  -- Verification tracking
  verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  
  -- Metadata
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one submission per user per carrier (they can update their rate)
  UNIQUE(carrier_id, user_id)
);

-- Table for tracking rate verifications by other users
CREATE TABLE rate_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_submission_id UUID NOT NULL REFERENCES carrier_rate_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL, -- true = verify, false = dispute
  verification_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  comment TEXT,
  
  -- Prevent duplicate verifications
  UNIQUE(rate_submission_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_carrier_rate_submissions_carrier_id ON carrier_rate_submissions(carrier_id);
CREATE INDEX idx_carrier_rate_submissions_user_id ON carrier_rate_submissions(user_id);
CREATE INDEX idx_carrier_rate_submissions_date ON carrier_rate_submissions(submission_date);
CREATE INDEX idx_carrier_rate_submissions_load_type ON carrier_rate_submissions(load_type);
CREATE INDEX idx_carrier_rate_submissions_route_type ON carrier_rate_submissions(route_type);
CREATE INDEX idx_rate_verifications_submission_id ON rate_verifications(rate_submission_id);

-- Function to get carrier rate averages with filtering
CREATE OR REPLACE FUNCTION get_carrier_rate_average(
  p_carrier_id UUID,
  p_load_type load_type_enum DEFAULT NULL,
  p_route_type route_type_enum DEFAULT NULL,
  p_days_back INTEGER DEFAULT 365
)
RETURNS TABLE (
  average_rate DECIMAL(4,2),
  submission_count INTEGER,
  verified_average DECIMAL(4,2),
  verified_count INTEGER,
  load_type load_type_enum,
  route_type route_type_enum
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(crs.rate_per_mile), 2) as average_rate,
    COUNT(*)::INTEGER as submission_count,
    ROUND(AVG(CASE WHEN crs.verified THEN crs.rate_per_mile END), 2) as verified_average,
    COUNT(CASE WHEN crs.verified THEN 1 END)::INTEGER as verified_count,
    crs.load_type,
    crs.route_type
  FROM carrier_rate_submissions crs
  WHERE crs.carrier_id = p_carrier_id
    AND crs.submission_date >= NOW() - INTERVAL '1 day' * p_days_back
    AND (p_load_type IS NULL OR crs.load_type = p_load_type)
    AND (p_route_type IS NULL OR crs.route_type = p_route_type)
    AND crs.rate_per_mile IS NOT NULL
  GROUP BY crs.load_type, crs.route_type
  ORDER BY submission_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent rate submissions for a carrier (anonymized for public view)
CREATE OR REPLACE FUNCTION get_recent_rate_submissions(
  p_carrier_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  rate_per_mile DECIMAL(4,2),
  load_type load_type_enum,
  route_type route_type_enum,
  experience_level experience_level_enum,
  employment_type VARCHAR(20),
  comment TEXT,
  submission_date TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN,
  verification_count INTEGER,
  dispute_count INTEGER,
  submitter_reputation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crs.rate_per_mile,
    crs.load_type,
    crs.route_type,
    crs.experience_level,
    crs.employment_type,
    crs.comment,
    crs.submission_date,
    crs.verified,
    crs.verification_count,
    crs.dispute_count,
    COALESCE(ur.reputation_score, 50) as submitter_reputation
  FROM carrier_rate_submissions crs
  LEFT JOIN user_reputation ur ON crs.user_id = ur.user_id
  WHERE crs.carrier_id = p_carrier_id
  ORDER BY crs.submission_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit or update a rate
CREATE OR REPLACE FUNCTION submit_carrier_rate(
  p_carrier_id UUID,
  p_rate_per_mile DECIMAL(4,2),
  p_load_type load_type_enum,
  p_route_type route_type_enum,
  p_experience_level experience_level_enum,
  p_employment_type VARCHAR(20),
  p_miles_driven_weekly INTEGER,
  p_comment TEXT
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_submission_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate carrier exists and is a carrier (not broker)
  IF NOT EXISTS (
    SELECT 1 FROM carriers 
    WHERE id = p_carrier_id 
    AND entity_type = 'CARRIER'
  ) THEN
    RAISE EXCEPTION 'Invalid carrier or carrier not found';
  END IF;

  -- Insert or update rate submission
  INSERT INTO carrier_rate_submissions (
    carrier_id,
    user_id,
    rate_per_mile,
    load_type,
    route_type,
    experience_level,
    employment_type,
    miles_driven_weekly,
    comment,
    submission_date,
    updated_at
  ) VALUES (
    p_carrier_id,
    v_user_id,
    p_rate_per_mile,
    p_load_type,
    p_route_type,
    p_experience_level,
    p_employment_type,
    p_miles_driven_weekly,
    p_comment,
    NOW(),
    NOW()
  )
  ON CONFLICT (carrier_id, user_id) 
  DO UPDATE SET
    rate_per_mile = EXCLUDED.rate_per_mile,
    load_type = EXCLUDED.load_type,
    route_type = EXCLUDED.route_type,
    experience_level = EXCLUDED.experience_level,
    employment_type = EXCLUDED.employment_type,
    miles_driven_weekly = EXCLUDED.miles_driven_weekly,
    comment = EXCLUDED.comment,
    updated_at = NOW(),
    -- Reset verification when rate is updated
    verified = FALSE,
    verification_count = 0,
    dispute_count = 0
  RETURNING id INTO v_submission_id;

  -- Update user reputation for rate submission
  PERFORM update_user_reputation(v_user_id);

  RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify/dispute a rate submission
CREATE OR REPLACE FUNCTION verify_rate_submission(
  p_rate_submission_id UUID,
  p_is_accurate BOOLEAN,
  p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_submission_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get submission user to prevent self-verification
  SELECT user_id INTO v_submission_user_id 
  FROM carrier_rate_submissions 
  WHERE id = p_rate_submission_id;

  IF v_submission_user_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot verify your own rate submission';
  END IF;

  -- Insert verification
  INSERT INTO rate_verifications (
    rate_submission_id,
    user_id,
    is_accurate,
    comment
  ) VALUES (
    p_rate_submission_id,
    v_user_id,
    p_is_accurate,
    p_comment
  )
  ON CONFLICT (rate_submission_id, user_id)
  DO UPDATE SET
    is_accurate = EXCLUDED.is_accurate,
    comment = EXCLUDED.comment,
    verification_date = NOW();

  -- Update verification counts on the submission
  UPDATE carrier_rate_submissions SET
    verification_count = (
      SELECT COUNT(*) FROM rate_verifications 
      WHERE rate_submission_id = p_rate_submission_id AND is_accurate = TRUE
    ),
    dispute_count = (
      SELECT COUNT(*) FROM rate_verifications 
      WHERE rate_submission_id = p_rate_submission_id AND is_accurate = FALSE
    ),
    verified = (
      SELECT COUNT(*) FROM rate_verifications 
      WHERE rate_submission_id = p_rate_submission_id AND is_accurate = TRUE
    ) >= 3
  WHERE id = p_rate_submission_id;

  -- Update reputation for both users
  PERFORM update_user_reputation(v_user_id);
  PERFORM update_user_reputation(v_submission_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's rate submission for a carrier
CREATE OR REPLACE FUNCTION get_user_rate_submission(
  p_carrier_id UUID
)
RETURNS TABLE (
  id UUID,
  rate_per_mile DECIMAL(4,2),
  load_type load_type_enum,
  route_type route_type_enum,
  experience_level experience_level_enum,
  employment_type VARCHAR(20),
  miles_driven_weekly INTEGER,
  comment TEXT,
  submission_date TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN,
  verification_count INTEGER,
  dispute_count INTEGER
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    crs.id,
    crs.rate_per_mile,
    crs.load_type,
    crs.route_type,
    crs.experience_level,
    crs.employment_type,
    crs.miles_driven_weekly,
    crs.comment,
    crs.submission_date,
    crs.verified,
    crs.verification_count,
    crs.dispute_count
  FROM carrier_rate_submissions crs
  WHERE crs.carrier_id = p_carrier_id 
    AND crs.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE carrier_rate_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for carrier_rate_submissions
CREATE POLICY "Users can view their own rate submissions" ON carrier_rate_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate submissions" ON carrier_rate_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate submissions" ON carrier_rate_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for rate_verifications
CREATE POLICY "Users can view their own verifications" ON rate_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications" ON rate_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verifications" ON rate_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Update user_reputation calculation to include rate submissions
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_submissions INTEGER;
  v_verified_submissions INTEGER;
  v_document_submissions INTEGER;
  v_rate_submissions INTEGER;
  v_rate_verifications INTEGER;
  v_reputation_score INTEGER;
  v_badge_title TEXT;
  v_reputation_level TEXT;
BEGIN
  -- Count insurance submissions
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN cii.verification_status = 'verified' THEN 1 END),
    COUNT(CASE WHEN cii.document_url IS NOT NULL THEN 1 END)
  INTO v_total_submissions, v_verified_submissions, v_document_submissions
  FROM carrier_insurance_info cii
  WHERE cii.submitted_by = p_user_id;

  -- Count rate submissions and verifications
  SELECT COUNT(*) INTO v_rate_submissions
  FROM carrier_rate_submissions crs
  WHERE crs.user_id = p_user_id;

  SELECT COUNT(*) INTO v_rate_verifications
  FROM rate_verifications rv
  WHERE rv.user_id = p_user_id;

  -- Add rate contributions to total
  v_total_submissions := v_total_submissions + v_rate_submissions;

  -- Calculate reputation score (0-100)
  v_reputation_score := LEAST(100, 
    50 + -- Base score
    (v_total_submissions * 5) + -- 5 points per submission
    (v_verified_submissions * 10) + -- 10 bonus points for verified submissions
    (v_document_submissions * 8) + -- 8 bonus points for document uploads
    (v_rate_verifications * 3) -- 3 points for helping verify others
  );

  -- Determine badge and level
  IF v_reputation_score >= 90 THEN
    v_reputation_level := 'expert';
    v_badge_title := 'Expert Contributor';
  ELSIF v_reputation_score >= 75 THEN
    v_reputation_level := 'trusted';
    v_badge_title := 'Trusted Member';
  ELSIF v_reputation_score >= 60 THEN
    v_reputation_level := 'contributor';
    v_badge_title := 'Active Contributor';
  ELSE
    v_reputation_level := 'new';
    v_badge_title := 'New Member';
  END IF;

  -- Insert or update reputation
  INSERT INTO user_reputation (
    user_id,
    reputation_score,
    total_submissions,
    verified_submissions,
    document_submissions,
    reputation_level,
    badge_title,
    last_updated
  ) VALUES (
    p_user_id,
    v_reputation_score,
    v_total_submissions,
    v_verified_submissions,
    v_document_submissions,
    v_reputation_level,
    v_badge_title,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    reputation_score = EXCLUDED.reputation_score,
    total_submissions = EXCLUDED.total_submissions,
    verified_submissions = EXCLUDED.verified_submissions,
    document_submissions = EXCLUDED.document_submissions,
    reputation_level = EXCLUDED.reputation_level,
    badge_title = EXCLUDED.badge_title,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;