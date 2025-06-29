-- Add FMCSA integration columns to carriers table
-- Part of MVP Backend Feature #3: FMCSA SAFER Database Integration

ALTER TABLE carriers ADD COLUMN IF NOT EXISTS last_fmcsa_update TIMESTAMP;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS mcs_number VARCHAR;