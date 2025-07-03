-- Fix get_carrier_insurance_status function type mismatches
-- The function has type mismatches between return type and actual returned data

-- Drop and recreate the function with correct return types
DROP FUNCTION IF EXISTS get_carrier_insurance_status(UUID);

CREATE OR REPLACE FUNCTION get_carrier_insurance_status(carrier_uuid UUID)
RETURNS TABLE(
  has_insurance BOOLEAN,
  insurance_carrier VARCHAR,
  policy_number VARCHAR,
  expiry_date DATE,
  days_until_expiry INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE,
  updated_by_email TEXT, -- Changed from VARCHAR to TEXT to match profiles.email type
  verification_status VARCHAR,
  freshness_status VARCHAR,
  confidence_score INTEGER,
  document_url TEXT,
  document_filename TEXT
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
      NULL::TEXT, -- updated_by_email
      'none'::VARCHAR, -- verification_status
      'none'::VARCHAR, -- freshness_status
      0, -- confidence_score
      NULL::TEXT, -- document_url
      NULL::TEXT; -- document_filename
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
    current_info.insurance_carrier::VARCHAR,
    current_info.policy_number::VARCHAR,
    current_info.expiry_date,
    days_diff,
    current_info.submitted_at,
    current_info.submitted_by_email::TEXT,
    current_info.verification_status::VARCHAR,
    freshness::VARCHAR,
    current_info.confidence_score,
    current_info.document_url,
    current_info.document_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_carrier_insurance_status TO authenticated;