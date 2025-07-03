-- Consolidate submit_insurance_info functions to resolve ambiguity
-- Remove multiple overloaded versions and create one comprehensive function

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS submit_insurance_info(UUID, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS submit_insurance_info(UUID, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, VARCHAR, TEXT, TEXT, TEXT, INTEGER, VARCHAR);

-- Create single comprehensive function that handles all cases
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

  -- Calculate confidence score based on document upload and source type
  IF p_document_url IS NOT NULL THEN
    confidence := confidence + 20; -- Document adds confidence
  END IF;
  
  IF p_source_type = 'document_upload' THEN
    confidence := confidence + 20;
  ELSIF p_source_type = 'carrier_confirmed' THEN
    confidence := confidence + 30;
  ELSIF p_source_type = 'fmcsa_lookup' THEN
    confidence := confidence + 25; -- FMCSA lookup is highly reliable
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION submit_insurance_info TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION submit_insurance_info(UUID, VARCHAR, VARCHAR, NUMERIC, DATE, DATE, VARCHAR, TEXT, TEXT, TEXT, INTEGER, VARCHAR) IS 'Consolidated function for submitting insurance information with optional document support';