-- Fix the submit_insurance_info function to use correct confidence_score column name
-- This fixes the "column confidence does not exist" error

-- Drop both versions of the function
DROP FUNCTION IF EXISTS submit_insurance_info(UUID, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS submit_insurance_info(UUID, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, VARCHAR, TEXT, TEXT, TEXT, INTEGER, VARCHAR);

-- Recreate the basic version first
CREATE OR REPLACE FUNCTION submit_insurance_info(
  p_carrier_id UUID,
  p_insurance_carrier VARCHAR DEFAULT NULL,
  p_policy_number VARCHAR DEFAULT NULL,
  p_insurance_amount NUMERIC DEFAULT NULL,
  p_effective_date DATE DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL,
  p_source_type VARCHAR DEFAULT 'user_submitted',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  user_id UUID;
  confidence INTEGER := 60; -- Base confidence
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

  -- Insert new insurance record
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
    confidence
  ) RETURNING id INTO new_id;

  -- Update user reputation
  PERFORM update_user_reputation(user_id);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the extended version with document support
CREATE OR REPLACE FUNCTION submit_insurance_info(
  p_carrier_id UUID,
  p_insurance_carrier VARCHAR DEFAULT NULL,
  p_policy_number VARCHAR DEFAULT NULL,
  p_insurance_amount NUMERIC DEFAULT NULL,
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
  confidence INTEGER := 60; -- Base confidence
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Calculate confidence score based on document upload and source type
  IF p_document_url IS NOT NULL THEN
    confidence := confidence + 20; -- Document adds confidence
  END IF;
  
  IF p_source_type = 'document_upload' THEN
    confidence := confidence + 20;
  ELSIF p_source_type = 'carrier_confirmed' THEN
    confidence := confidence + 30;
  END IF;
  
  confidence := LEAST(95, confidence); -- Cap at 95%

  -- Mark previous entries as not current
  UPDATE public.carrier_insurance_info 
  SET is_current = false, updated_at = NOW()
  WHERE carrier_id = p_carrier_id AND is_current = true;

  -- Insert new insurance record
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
  PERFORM update_user_reputation(user_id);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_insurance_info TO authenticated;