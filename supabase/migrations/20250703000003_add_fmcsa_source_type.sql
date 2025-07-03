-- Add 'fmcsa_lookup' as a valid source type for insurance submissions
-- This represents insurance information found via FMCSA database lookup

-- Drop existing constraint
ALTER TABLE public.carrier_insurance_info DROP CONSTRAINT IF EXISTS carrier_insurance_info_source_type_check;

-- Add new constraint with fmcsa_lookup included
ALTER TABLE public.carrier_insurance_info ADD CONSTRAINT carrier_insurance_info_source_type_check 
CHECK (source_type::text = ANY (ARRAY[
  'user_submitted'::character varying, 
  'document_upload'::character varying, 
  'carrier_confirmed'::character varying, 
  'third_party'::character varying,
  'fmcsa_lookup'::character varying
]::text[]));