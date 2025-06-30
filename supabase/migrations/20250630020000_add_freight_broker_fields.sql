-- Add enhanced freight broker fields to carriers table
-- These fields provide critical data for freight brokers evaluating carriers

-- Safety & Compliance History
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS crash_count INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fatal_crashes INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS injury_crashes INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS tow_away_crashes INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS inspection_count INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS inspection_violations INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS out_of_service_orders INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS out_of_service_rate INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS driver_inspections INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS vehicle_inspections INTEGER;

-- Insurance & Financial
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_carrier TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_amount INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_effective_date TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS insurance_expiry_date TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS cargo_insurance_amount INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS financial_responsibility_status TEXT;

-- Operational Details
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS equipment_types TEXT[];
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS service_areas TEXT[];
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS years_in_business INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS annual_revenue INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fleet_age INTEGER;

-- Additional Compliance
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS drug_testing_program BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS alcohol_testing_program BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS hazmat_certification BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS passenger_certification BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS school_bus_certification BOOLEAN;

-- Contact & Business
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS business_hours TEXT;

-- Create indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_carriers_crash_count ON carriers(crash_count);
CREATE INDEX IF NOT EXISTS idx_carriers_inspection_count ON carriers(inspection_count);
CREATE INDEX IF NOT EXISTS idx_carriers_out_of_service_rate ON carriers(out_of_service_rate);
CREATE INDEX IF NOT EXISTS idx_carriers_insurance_amount ON carriers(insurance_amount);
CREATE INDEX IF NOT EXISTS idx_carriers_years_in_business ON carriers(years_in_business);
CREATE INDEX IF NOT EXISTS idx_carriers_safety_rating ON carriers(safety_rating);

-- Add comments for documentation
COMMENT ON COLUMN carriers.crash_count IS 'Total number of crashes in the last 24 months';
COMMENT ON COLUMN carriers.fatal_crashes IS 'Number of fatal crashes in the last 24 months';
COMMENT ON COLUMN carriers.injury_crashes IS 'Number of injury crashes in the last 24 months';
COMMENT ON COLUMN carriers.inspection_count IS 'Total number of inspections in the last 24 months';
COMMENT ON COLUMN carriers.out_of_service_orders IS 'Number of out-of-service orders in the last 24 months';
COMMENT ON COLUMN carriers.out_of_service_rate IS 'Percentage of inspections that resulted in out-of-service orders';
COMMENT ON COLUMN carriers.insurance_amount IS 'Liability insurance coverage amount in dollars';
COMMENT ON COLUMN carriers.cargo_insurance_amount IS 'Cargo insurance coverage amount in dollars';
COMMENT ON COLUMN carriers.equipment_types IS 'Array of equipment types the carrier operates';
COMMENT ON COLUMN carriers.service_areas IS 'Array of states/cities the carrier operates in';
COMMENT ON COLUMN carriers.years_in_business IS 'Estimated years the carrier has been in business'; 