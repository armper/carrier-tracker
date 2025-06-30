-- Remove carb_compliance column since it's not available from SAFER website
-- This field was showing misleading default values instead of actual data

ALTER TABLE carriers DROP COLUMN IF EXISTS carb_compliance; 