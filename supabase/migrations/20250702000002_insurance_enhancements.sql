-- Insurance System Enhancements: Document Upload, User Reputation, Email Notifications
-- Adds document support, user reputation scoring, and notification preferences

-- Add document storage support to insurance info
ALTER TABLE public.carrier_insurance_info 
ADD COLUMN document_url TEXT,
ADD COLUMN document_filename TEXT,
ADD COLUMN document_file_size INTEGER,
ADD COLUMN document_mime_type VARCHAR(100),
ADD COLUMN document_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create user reputation tracking table
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_submissions INTEGER DEFAULT 0,
  verified_submissions INTEGER DEFAULT 0,
  disputed_submissions INTEGER DEFAULT 0,
  document_submissions INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  last_submission_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create insurance notification preferences table
CREATE TABLE IF NOT EXISTS public.insurance_notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notify_on_updates BOOLEAN DEFAULT true,
  notify_on_expiry BOOLEAN DEFAULT true,
  notify_on_disputes BOOLEAN DEFAULT true,
  email_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create insurance update notifications log
CREATE TABLE IF NOT EXISTS public.insurance_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('insurance_updated', 'insurance_expiring', 'insurance_disputed', 'insurance_verified')),
  message TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reputation
CREATE POLICY "Users can view own reputation" ON public.user_reputation
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view reputation scores" ON public.user_reputation
  FOR SELECT USING (true);

CREATE POLICY "System can manage reputation" ON public.user_reputation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for insurance_notification_preferences
CREATE POLICY "Users can manage own notification preferences" ON public.insurance_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for insurance_notifications
CREATE POLICY "Users can view own notifications" ON public.insurance_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.insurance_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.insurance_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON public.user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON public.user_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_insurance_notification_preferences_user_id ON public.insurance_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_notifications_user_id ON public.insurance_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_notifications_unread ON public.insurance_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_notifications_unsent ON public.insurance_notifications(email_sent) WHERE email_sent = false;

-- Function to calculate and update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_submissions INTEGER;
  v_verified_submissions INTEGER;
  v_disputed_submissions INTEGER;
  v_document_submissions INTEGER;
  v_reputation_score INTEGER;
BEGIN
  -- Get submission counts
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
    COUNT(*) FILTER (WHERE verification_status = 'disputed') as disputed,
    COUNT(*) FILTER (WHERE document_url IS NOT NULL) as documents
  INTO v_total_submissions, v_verified_submissions, v_disputed_submissions, v_document_submissions
  FROM public.carrier_insurance_info
  WHERE submitted_by = p_user_id;

  -- Calculate reputation score
  -- Base: 50 points
  -- +10 points per verified submission
  -- +5 points per document upload
  -- -15 points per disputed submission
  -- Cap at 100 points
  v_reputation_score := LEAST(100, GREATEST(0, 
    50 + 
    (v_verified_submissions * 10) + 
    (v_document_submissions * 5) - 
    (v_disputed_submissions * 15)
  ));

  -- Upsert reputation record
  INSERT INTO public.user_reputation (
    user_id, 
    total_submissions, 
    verified_submissions, 
    disputed_submissions, 
    document_submissions, 
    reputation_score,
    last_submission_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_total_submissions,
    v_verified_submissions,
    v_disputed_submissions,
    v_document_submissions,
    v_reputation_score,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_submissions = EXCLUDED.total_submissions,
    verified_submissions = EXCLUDED.verified_submissions,
    disputed_submissions = EXCLUDED.disputed_submissions,
    document_submissions = EXCLUDED.document_submissions,
    reputation_score = EXCLUDED.reputation_score,
    last_submission_at = EXCLUDED.last_submission_at,
    updated_at = EXCLUDED.updated_at;

  RETURN v_reputation_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create insurance notification
CREATE OR REPLACE FUNCTION create_insurance_notification(
  p_user_id UUID,
  p_carrier_id UUID,
  p_notification_type VARCHAR,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_user_preferences RECORD;
BEGIN
  -- Get user notification preferences
  SELECT * INTO v_user_preferences
  FROM public.insurance_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.insurance_notification_preferences (user_id)
    VALUES (p_user_id);
    
    SELECT * INTO v_user_preferences
    FROM public.insurance_notification_preferences
    WHERE user_id = p_user_id;
  END IF;

  -- Check if user wants this type of notification
  IF (p_notification_type = 'insurance_updated' AND v_user_preferences.notify_on_updates) OR
     (p_notification_type = 'insurance_expiring' AND v_user_preferences.notify_on_expiry) OR
     (p_notification_type = 'insurance_disputed' AND v_user_preferences.notify_on_disputes) OR
     (p_notification_type = 'insurance_verified') THEN
    
    INSERT INTO public.insurance_notifications (
      user_id,
      carrier_id,
      notification_type,
      message
    ) VALUES (
      p_user_id,
      p_carrier_id,
      p_notification_type,
      p_message
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reputation info
CREATE OR REPLACE FUNCTION get_user_reputation(p_user_id UUID)
RETURNS TABLE (
  reputation_score INTEGER,
  total_submissions INTEGER,
  verified_submissions INTEGER,
  document_submissions INTEGER,
  reputation_level TEXT,
  badge_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ur.reputation_score, 50) as reputation_score,
    COALESCE(ur.total_submissions, 0) as total_submissions,
    COALESCE(ur.verified_submissions, 0) as verified_submissions,
    COALESCE(ur.document_submissions, 0) as document_submissions,
    CASE 
      WHEN COALESCE(ur.reputation_score, 50) >= 90 THEN 'Expert'
      WHEN COALESCE(ur.reputation_score, 50) >= 75 THEN 'Trusted'
      WHEN COALESCE(ur.reputation_score, 50) >= 60 THEN 'Contributor'
      ELSE 'New'
    END as reputation_level,
    CASE 
      WHEN COALESCE(ur.reputation_score, 50) >= 90 THEN '🏆 Insurance Expert'
      WHEN COALESCE(ur.reputation_score, 50) >= 75 THEN '⭐ Trusted Contributor'
      WHEN COALESCE(ur.reputation_score, 50) >= 60 THEN '📋 Active Contributor'
      ELSE '🌱 New Member'
    END as badge_title
  FROM public.user_reputation ur
  RIGHT JOIN public.profiles p ON ur.user_id = p.id
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update submit_insurance_info function to handle documents and reputation
CREATE OR REPLACE FUNCTION submit_insurance_info(
  p_carrier_id UUID,
  p_insurance_carrier VARCHAR DEFAULT NULL,
  p_policy_number VARCHAR DEFAULT NULL,
  p_insurance_amount DECIMAL DEFAULT NULL,
  p_effective_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_source_type VARCHAR DEFAULT 'user_submitted',
  p_notes TEXT DEFAULT NULL,
  p_document_url TEXT DEFAULT NULL,
  p_document_filename TEXT DEFAULT NULL,
  p_document_file_size INTEGER DEFAULT NULL,
  p_document_mime_type VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  user_id UUID;
  old_insurance_record RECORD;
  carrier_name TEXT;
  reputation_score INTEGER;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get carrier name for notifications
  SELECT legal_name INTO carrier_name FROM public.carriers WHERE id = p_carrier_id;

  -- Get existing insurance record for comparison
  SELECT * INTO old_insurance_record
  FROM public.carrier_insurance_info 
  WHERE carrier_id = p_carrier_id AND is_current = true
  LIMIT 1;

  -- Mark previous entries as not current
  UPDATE public.carrier_insurance_info 
  SET is_current = false, updated_at = NOW()
  WHERE carrier_id = p_carrier_id AND is_current = true;

  -- Calculate confidence score based on document upload and source type
  DECLARE
    confidence INTEGER := 60; -- Base confidence
  BEGIN
    IF p_document_url IS NOT NULL THEN
      confidence := confidence + 20; -- Document adds confidence
    END IF;
    
    IF p_source_type = 'document_upload' THEN
      confidence := confidence + 20;
    ELSIF p_source_type = 'carrier_confirmed' THEN
      confidence := confidence + 30;
    END IF;
    
    confidence := LEAST(95, confidence); -- Cap at 95%
  END;

  -- Insert new insurance info
  INSERT INTO public.carrier_insurance_info (
    carrier_id,
    insurance_carrier,
    policy_number,
    insurance_amount,
    effective_date,
    expiry_date,
    submitted_by,
    source_type,
    notes,
    confidence_score,
    document_url,
    document_filename,
    document_file_size,
    document_mime_type,
    document_uploaded_at
  ) VALUES (
    p_carrier_id,
    p_insurance_carrier,
    p_policy_number,
    p_insurance_amount,
    p_effective_date,
    p_expiry_date,
    user_id,
    p_source_type,
    p_notes,
    confidence,
    p_document_url,
    p_document_filename,
    p_document_file_size,
    p_document_mime_type,
    CASE WHEN p_document_url IS NOT NULL THEN NOW() ELSE NULL END
  ) RETURNING id INTO new_id;

  -- Update user reputation
  reputation_score := update_user_reputation(user_id);

  -- Create notifications for users who have this carrier saved
  INSERT INTO public.insurance_notifications (user_id, carrier_id, notification_type, message)
  SELECT DISTINCT 
    sc.user_id,
    p_carrier_id,
    'insurance_updated',
    'Insurance information updated for ' || carrier_name || 
    CASE WHEN p_document_url IS NOT NULL THEN ' (document uploaded)' ELSE '' END
  FROM public.saved_carriers sc
  WHERE sc.carrier_id = p_carrier_id 
    AND sc.user_id != user_id -- Don't notify the person who made the update
    AND EXISTS (
      SELECT 1 FROM public.insurance_notification_preferences inp
      WHERE inp.user_id = sc.user_id AND inp.notify_on_updates = true
    );

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update reputation when insurance info is verified/disputed
CREATE OR REPLACE FUNCTION trigger_update_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation when verification status changes
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    PERFORM update_user_reputation(NEW.submitted_by);
    
    -- Create notification for verification status change
    IF NEW.verification_status = 'verified' THEN
      PERFORM create_insurance_notification(
        NEW.submitted_by,
        NEW.carrier_id,
        'insurance_verified',
        'Your insurance submission has been verified!'
      );
    ELSIF NEW.verification_status = 'disputed' THEN
      PERFORM create_insurance_notification(
        NEW.submitted_by,
        NEW.carrier_id,
        'insurance_disputed',
        'Your insurance submission has been disputed and needs review.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_reputation_update
  AFTER UPDATE ON public.carrier_insurance_info
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reputation();

-- Add comments for documentation
COMMENT ON TABLE public.user_reputation IS 'Tracks user reputation scores based on insurance submission quality';
COMMENT ON TABLE public.insurance_notification_preferences IS 'User preferences for insurance-related email notifications';
COMMENT ON TABLE public.insurance_notifications IS 'Log of all insurance-related notifications sent to users';
COMMENT ON FUNCTION update_user_reputation(UUID) IS 'Calculates and updates user reputation score based on submission history';
COMMENT ON FUNCTION create_insurance_notification(UUID, UUID, VARCHAR, TEXT) IS 'Creates a new insurance notification for a user';
COMMENT ON FUNCTION get_user_reputation(UUID) IS 'Returns user reputation info with badges and levels';