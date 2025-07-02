-- Crowd-sourced Insurance Tracking System
-- Replace automated insurance tracking with user-contributed data

-- Drop and recreate carriers_only view to handle column removal
DROP VIEW IF EXISTS public.carriers_only;

-- Remove columns from carriers table that were used for automated scraping
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_carrier;
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_policy_number;
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_amount;
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_effective_date;
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_expiry_date;
ALTER TABLE public.carriers DROP COLUMN IF EXISTS insurance_last_verified;

-- Recreate carriers_only view without insurance columns
CREATE VIEW public.carriers_only AS
SELECT id,
    dot_number,
    legal_name,
    dba_name,
    physical_address,
    phone,
    email,
    safety_rating,
    insurance_status,
    authority_status,
    created_at,
    updated_at,
    state,
    city,
    vehicle_count,
    last_manual_update,
    data_source,
    verified,
    verification_date,
    trust_score,
    admin_notes,
    created_by_admin,
    carrier_operation,
    operation_classification,
    driver_count,
    mc_number,
    hazmat_flag,
    interstate_operation,
    entity_type,
    total_mileage,
    operating_status,
    out_of_service_date,
    mcs_150_date,
    safety_rating_last_changed,
    safety_rating_stability_score,
    safety_rating_change_count,
    safety_rating_trend,
    crash_count,
    fatal_crashes,
    injury_crashes,
    tow_away_crashes,
    inspection_count,
    inspection_violations,
    out_of_service_orders,
    out_of_service_rate,
    driver_inspections,
    vehicle_inspections,
    cargo_insurance_amount,
    financial_responsibility_status,
    equipment_types,
    service_areas,
    years_in_business,
    annual_revenue,
    fleet_age,
    drug_testing_program,
    alcohol_testing_program,
    hazmat_certification,
    passenger_certification,
    school_bus_certification,
    website,
    emergency_contact,
    emergency_phone,
    business_hours,
    last_verified,
    data_quality_score,
    needs_verification,
    api_last_sync,
    api_sync_status,
    api_error_count
FROM carriers
WHERE is_carrier_entity(entity_type);

-- Create crowd-sourced insurance information table
CREATE TABLE IF NOT EXISTS public.carrier_insurance_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  insurance_carrier VARCHAR(255),
  policy_number VARCHAR(100),
  insurance_amount DECIMAL(12,2),
  effective_date DATE,
  expiry_date DATE,
  
  -- Crowd-sourcing metadata
  submitted_by UUID REFERENCES public.profiles(id) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'disputed', 'outdated')),
  
  -- Data quality fields
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source_type VARCHAR(50) DEFAULT 'user_submitted' CHECK (source_type IN ('user_submitted', 'document_upload', 'carrier_confirmed', 'third_party')),
  notes TEXT,
  
  -- Tracking fields
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_current BOOLEAN DEFAULT true
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_carrier_insurance_info_carrier_id ON public.carrier_insurance_info(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_insurance_info_current ON public.carrier_insurance_info(carrier_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_carrier_insurance_info_expiry ON public.carrier_insurance_info(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carrier_insurance_info_status ON public.carrier_insurance_info(verification_status);

-- Enable RLS
ALTER TABLE public.carrier_insurance_info ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view insurance info" ON public.carrier_insurance_info
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit insurance info" ON public.carrier_insurance_info
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

CREATE POLICY "Users can update their own submissions" ON public.carrier_insurance_info
  FOR UPDATE USING (auth.uid() = submitted_by)
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admins can manage all insurance info" ON public.carrier_insurance_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to get the current insurance info for a carrier
CREATE OR REPLACE FUNCTION get_carrier_insurance_status(carrier_uuid UUID)
RETURNS TABLE (
  has_insurance BOOLEAN,
  insurance_carrier VARCHAR,
  policy_number VARCHAR,
  expiry_date DATE,
  days_until_expiry INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE,
  updated_by_email VARCHAR,
  verification_status VARCHAR,
  freshness_status VARCHAR,
  confidence_score INTEGER
) AS $$
DECLARE
  current_info RECORD;
  days_diff INTEGER;
  freshness VARCHAR(20);
BEGIN
  -- Get the most recent verified or pending insurance info
  SELECT cii.*, p.email as submitted_by_email
  INTO current_info
  FROM public.carrier_insurance_info cii
  LEFT JOIN public.profiles p ON cii.submitted_by = p.id
  WHERE cii.carrier_id = carrier_uuid 
    AND cii.is_current = true
    AND cii.verification_status IN ('verified', 'pending')
  ORDER BY 
    CASE WHEN cii.verification_status = 'verified' THEN 1 ELSE 2 END,
    cii.submitted_at DESC
  LIMIT 1;

  -- If no insurance info found
  IF current_info IS NULL THEN
    RETURN QUERY SELECT 
      false, -- has_insurance
      NULL::VARCHAR, -- insurance_carrier
      NULL::VARCHAR, -- policy_number  
      NULL::DATE, -- expiry_date
      NULL::INTEGER, -- days_until_expiry
      NULL::TIMESTAMP WITH TIME ZONE, -- last_updated
      NULL::VARCHAR, -- updated_by_email
      'none'::VARCHAR, -- verification_status
      'none'::VARCHAR, -- freshness_status
      0; -- confidence_score
    RETURN;
  END IF;

  -- Calculate days until expiry
  IF current_info.expiry_date IS NOT NULL THEN
    days_diff := (current_info.expiry_date - CURRENT_DATE)::INTEGER;
  END IF;

  -- Calculate freshness status
  IF EXTRACT(EPOCH FROM (NOW() - current_info.submitted_at))::INTEGER / 86400 <= 30 THEN
    freshness := 'recent';
  ELSIF EXTRACT(EPOCH FROM (NOW() - current_info.submitted_at))::INTEGER / 86400 <= 90 THEN
    freshness := 'moderate';
  ELSE
    freshness := 'outdated';
  END IF;

  RETURN QUERY SELECT 
    true, -- has_insurance
    current_info.insurance_carrier,
    current_info.policy_number,
    current_info.expiry_date,
    days_diff,
    current_info.submitted_at,
    current_info.submitted_by_email,
    current_info.verification_status,
    freshness,
    current_info.confidence_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit new insurance information
CREATE OR REPLACE FUNCTION submit_insurance_info(
  p_carrier_id UUID,
  p_insurance_carrier VARCHAR DEFAULT NULL,
  p_policy_number VARCHAR DEFAULT NULL,
  p_insurance_amount DECIMAL DEFAULT NULL,
  p_effective_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_source_type VARCHAR DEFAULT 'user_submitted',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  user_id UUID;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Mark previous entries as not current
  UPDATE public.carrier_insurance_info 
  SET is_current = false, updated_at = NOW()
  WHERE carrier_id = p_carrier_id AND is_current = true;

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
    confidence_score
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
    CASE WHEN p_source_type = 'document_upload' THEN 80
         WHEN p_source_type = 'carrier_confirmed' THEN 90
         ELSE 60 END
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing insurance_alerts table to work with new structure
-- Drop the old trigger first
DROP TRIGGER IF EXISTS trigger_create_insurance_alert ON public.carriers;
DROP FUNCTION IF EXISTS create_insurance_alert();

-- Create new trigger function for crowd-sourced data
CREATE OR REPLACE FUNCTION create_insurance_alert_crowdsourced()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create alert if expiry_date is set and this is current info
  IF NEW.expiry_date IS NOT NULL AND NEW.is_current = true THEN
    
    -- Delete existing alert for this carrier
    DELETE FROM public.insurance_alerts WHERE carrier_id = NEW.carrier_id;
    
    -- Create new alert
    INSERT INTO public.insurance_alerts (carrier_id, expiry_date)
    VALUES (NEW.carrier_id, NEW.expiry_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for crowd-sourced insurance alerts
CREATE TRIGGER trigger_create_insurance_alert_crowdsourced
  AFTER INSERT OR UPDATE ON public.carrier_insurance_info
  FOR EACH ROW
  EXECUTE FUNCTION create_insurance_alert_crowdsourced();

-- Update the get_expiring_insurance function to work with new structure
CREATE OR REPLACE FUNCTION get_expiring_insurance(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  carrier_id UUID,
  dot_number VARCHAR,
  legal_name VARCHAR,
  insurance_expiry_date DATE,
  days_until_expiry INTEGER,
  insurance_carrier VARCHAR,
  policy_number VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.dot_number,
    c.legal_name,
    cii.expiry_date,
    (cii.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    cii.insurance_carrier,
    cii.policy_number
  FROM public.carriers c
  INNER JOIN public.carrier_insurance_info cii ON c.id = cii.carrier_id
  WHERE cii.expiry_date IS NOT NULL
    AND cii.is_current = true
    AND cii.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND cii.expiry_date >= CURRENT_DATE
  ORDER BY cii.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update insurance risk score function
CREATE OR REPLACE FUNCTION get_insurance_risk_score(carrier_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  risk_score INTEGER := 100; -- Start with perfect score
  insurance_info RECORD;
  days_until_expiry INTEGER;
  verification_age INTEGER;
BEGIN
  -- Get current insurance data
  SELECT * FROM get_carrier_insurance_status(carrier_uuid) 
  INTO insurance_info;
  
  -- If no insurance data, return very low score
  IF NOT insurance_info.has_insurance THEN
    RETURN 10;
  END IF;
  
  -- Reduce score based on days until expiry
  IF insurance_info.days_until_expiry IS NOT NULL THEN
    IF insurance_info.days_until_expiry < 0 THEN
      risk_score := 0; -- Expired insurance
    ELSIF insurance_info.days_until_expiry <= 7 THEN
      risk_score := risk_score - 50; -- Critical risk
    ELSIF insurance_info.days_until_expiry <= 15 THEN
      risk_score := risk_score - 30; -- High risk
    ELSIF insurance_info.days_until_expiry <= 30 THEN
      risk_score := risk_score - 15; -- Medium risk
    END IF;
  END IF;
  
  -- Reduce score based on data freshness
  IF insurance_info.freshness_status = 'outdated' THEN
    risk_score := risk_score - 20;
  ELSIF insurance_info.freshness_status = 'moderate' THEN
    risk_score := risk_score - 10;
  END IF;
  
  -- Reduce score based on verification status
  IF insurance_info.verification_status = 'pending' THEN
    risk_score := risk_score - 10;
  ELSIF insurance_info.verification_status = 'disputed' THEN
    risk_score := risk_score - 25;
  END IF;
  
  -- Adjust based on confidence score
  risk_score := risk_score - (100 - insurance_info.confidence_score) / 5;
  
  RETURN GREATEST(0, risk_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.carrier_insurance_info IS 'Crowd-sourced insurance information for carriers';
COMMENT ON FUNCTION get_carrier_insurance_status(UUID) IS 'Returns current insurance status with freshness and verification indicators';
COMMENT ON FUNCTION submit_insurance_info(UUID, VARCHAR, VARCHAR, DECIMAL, DATE, DATE, VARCHAR, TEXT) IS 'Submit new insurance information for a carrier';