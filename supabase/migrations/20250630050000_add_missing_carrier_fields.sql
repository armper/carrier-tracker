-- Add missing carrier fields for comprehensive data capture
-- These fields are being scraped from SAFER but don't exist in the database yet

-- Private carrier flag
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS pc_flag BOOLEAN;

-- Passenger and migrant flags
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS passenger_flag BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS migrant_flag BOOLEAN;

-- Federal Tax ID and Mexico number
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS ein_number TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS mx_number TEXT;

-- Credit score
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS credit_score TEXT;

-- Additional crash and inspection data
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS tow_away_crashes INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS inspection_violations INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS driver_inspections INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS vehicle_inspections INTEGER;

-- Business metrics
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS annual_revenue INTEGER;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS fleet_age INTEGER;

-- Compliance certifications
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS drug_testing_program BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS alcohol_testing_program BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS hazmat_certification BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS passenger_certification BOOLEAN;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS school_bus_certification BOOLEAN;

-- Contact and business information
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS business_hours TEXT;

-- Add indexes for commonly queried new fields
CREATE INDEX IF NOT EXISTS idx_carriers_pc_flag ON carriers(pc_flag);
CREATE INDEX IF NOT EXISTS idx_carriers_passenger_flag ON carriers(passenger_flag);
CREATE INDEX IF NOT EXISTS idx_carriers_migrant_flag ON carriers(migrant_flag);
CREATE INDEX IF NOT EXISTS idx_carriers_ein_number ON carriers(ein_number);
CREATE INDEX IF NOT EXISTS idx_carriers_mx_number ON carriers(mx_number);
CREATE INDEX IF NOT EXISTS idx_carriers_tow_away_crashes ON carriers(tow_away_crashes);
CREATE INDEX IF NOT EXISTS idx_carriers_inspection_violations ON carriers(inspection_violations);
CREATE INDEX IF NOT EXISTS idx_carriers_annual_revenue ON carriers(annual_revenue);
CREATE INDEX IF NOT EXISTS idx_carriers_fleet_age ON carriers(fleet_age);

-- Add comments for documentation
COMMENT ON COLUMN carriers.pc_flag IS 'Private carrier flag - indicates if carrier operates private fleet';
COMMENT ON COLUMN carriers.passenger_flag IS 'Passenger carrier flag - indicates if carrier transports passengers';
COMMENT ON COLUMN carriers.migrant_flag IS 'Migrant worker carrier flag - indicates if carrier transports migrant workers';
COMMENT ON COLUMN carriers.ein_number IS 'Federal Tax ID (Employer Identification Number)';
COMMENT ON COLUMN carriers.mx_number IS 'Mexico authority number for cross-border operations';
COMMENT ON COLUMN carriers.credit_score IS 'Credit score or financial rating';
COMMENT ON COLUMN carriers.tow_away_crashes IS 'Number of crashes requiring tow truck';
COMMENT ON COLUMN carriers.inspection_violations IS 'Number of inspection violations';
COMMENT ON COLUMN carriers.driver_inspections IS 'Number of driver inspections';
COMMENT ON COLUMN carriers.vehicle_inspections IS 'Number of vehicle inspections';
COMMENT ON COLUMN carriers.annual_revenue IS 'Annual revenue in dollars';
COMMENT ON COLUMN carriers.fleet_age IS 'Average age of fleet vehicles in years';
COMMENT ON COLUMN carriers.drug_testing_program IS 'Has drug testing program';
COMMENT ON COLUMN carriers.alcohol_testing_program IS 'Has alcohol testing program';
COMMENT ON COLUMN carriers.hazmat_certification IS 'Has hazardous materials certification';
COMMENT ON COLUMN carriers.passenger_certification IS 'Has passenger transport certification';
COMMENT ON COLUMN carriers.school_bus_certification IS 'Has school bus certification';
COMMENT ON COLUMN carriers.website IS 'Company website URL';
COMMENT ON COLUMN carriers.emergency_contact IS 'Emergency contact person';
COMMENT ON COLUMN carriers.emergency_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN carriers.business_hours IS 'Business operating hours'; 