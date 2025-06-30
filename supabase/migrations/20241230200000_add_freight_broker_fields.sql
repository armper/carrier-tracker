-- Add fields useful for freight brokers
ALTER TABLE carriers 
ADD COLUMN IF NOT EXISTS driver_count INTEGER,
ADD COLUMN IF NOT EXISTS safety_review_date TEXT,
ADD COLUMN IF NOT EXISTS safety_rating_date TEXT,
ADD COLUMN IF NOT EXISTS total_mileage INTEGER,
ADD COLUMN IF NOT EXISTS interstate_operation BOOLEAN,
ADD COLUMN IF NOT EXISTS hazmat_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS passenger_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS migrant_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS pc_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS crash_indicator TEXT,
ADD COLUMN IF NOT EXISTS inspection_indicator TEXT,
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS ein_number TEXT,
ADD COLUMN IF NOT EXISTS mc_number TEXT,
ADD COLUMN IF NOT EXISTS mx_number TEXT,
ADD COLUMN IF NOT EXISTS operating_status TEXT,
ADD COLUMN IF NOT EXISTS credit_score TEXT,
ADD COLUMN IF NOT EXISTS out_of_service_date TEXT,
ADD COLUMN IF NOT EXISTS mcs_150_date TEXT,
ADD COLUMN IF NOT EXISTS operation_classification TEXT[],
ADD COLUMN IF NOT EXISTS carrier_operation TEXT[];

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_carriers_mc_number ON carriers(mc_number);
CREATE INDEX IF NOT EXISTS idx_carriers_hazmat_flag ON carriers(hazmat_flag);
CREATE INDEX IF NOT EXISTS idx_carriers_interstate_operation ON carriers(interstate_operation);
CREATE INDEX IF NOT EXISTS idx_carriers_entity_type ON carriers(entity_type);
CREATE INDEX IF NOT EXISTS idx_carriers_vehicle_count ON carriers(vehicle_count);
CREATE INDEX IF NOT EXISTS idx_carriers_driver_count ON carriers(driver_count);
CREATE INDEX IF NOT EXISTS idx_carriers_operating_status ON carriers(operating_status);

-- Comment the table with new field descriptions
COMMENT ON COLUMN carriers.driver_count IS 'Number of drivers employed by the carrier';
COMMENT ON COLUMN carriers.mc_number IS 'Motor Carrier Authority Number';
COMMENT ON COLUMN carriers.hazmat_flag IS 'Whether carrier is authorized for hazardous materials';
COMMENT ON COLUMN carriers.interstate_operation IS 'Whether carrier operates interstate commerce';
COMMENT ON COLUMN carriers.entity_type IS 'Business entity type (Corporation, LLC, etc.)';
COMMENT ON COLUMN carriers.total_mileage IS 'Total miles operated annually';
COMMENT ON COLUMN carriers.pc_flag IS 'Private carrier flag (vs for-hire)';
COMMENT ON COLUMN carriers.operating_status IS 'Detailed operating status from FMCSA';
COMMENT ON COLUMN carriers.safety_review_date IS 'Date of last safety review';
COMMENT ON COLUMN carriers.safety_rating_date IS 'Date safety rating was assigned';
COMMENT ON COLUMN carriers.out_of_service_date IS 'Date carrier was placed out of service (if applicable)';
COMMENT ON COLUMN carriers.mcs_150_date IS 'Date of last MCS-150 filing';
COMMENT ON COLUMN carriers.operation_classification IS 'FMCSA operation classification codes';
COMMENT ON COLUMN carriers.carrier_operation IS 'Type of carrier operation (freight, passenger, etc.)';