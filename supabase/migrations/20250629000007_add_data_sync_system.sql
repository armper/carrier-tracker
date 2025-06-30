-- Data Sync and Quality Management System
-- Automated carrier data refresh and quality tracking

-- Add data tracking fields to carriers table
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual';
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS last_verified TIMESTAMPTZ;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 50; -- 0-100 scale
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS api_last_sync TIMESTAMPTZ;
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS api_sync_status TEXT DEFAULT 'never'; -- 'synced', 'error', 'not_found', 'never'
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS api_error_count INTEGER DEFAULT 0;

-- Create data refresh jobs table
CREATE TABLE data_refresh_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- 'safety_ratings', 'insurance_status', 'full_sync', 'single_carrier'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  carriers_processed INTEGER DEFAULT 0,
  carriers_updated INTEGER DEFAULT 0,
  carriers_failed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}', -- job configuration
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create API sync log table
CREATE TABLE api_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  api_source TEXT NOT NULL, -- 'fmcsa_safer', 'saferwebapi', 'manual'
  sync_type TEXT NOT NULL, -- 'safety_rating', 'insurance_status', 'full_profile'
  old_data JSONB,
  new_data JSONB,
  changes_detected JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data quality issues table
CREATE TABLE data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL, -- 'stale_data', 'api_error', 'inconsistent_data', 'missing_fields'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  field_name TEXT,
  expected_value TEXT,
  actual_value TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_data_refresh_jobs_status ON data_refresh_jobs(status, created_at);
CREATE INDEX idx_api_sync_log_carrier ON api_sync_log(carrier_id, created_at);
CREATE INDEX idx_data_quality_issues_carrier ON data_quality_issues(carrier_id, resolved);
CREATE INDEX idx_carriers_sync_status ON carriers(api_sync_status, last_verified);
CREATE INDEX idx_carriers_quality_score ON carriers(data_quality_score, needs_verification);

-- Function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_data_quality_score(p_carrier_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_carrier RECORD;
  v_days_since_verification INTEGER;
  v_error_count INTEGER;
  v_missing_fields INTEGER := 0;
BEGIN
  -- Get carrier data
  SELECT * INTO v_carrier FROM carriers WHERE id = p_carrier_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check data freshness (max penalty: -30 points)
  IF v_carrier.last_verified IS NULL THEN
    v_score := v_score - 30;
  ELSE
    v_days_since_verification := EXTRACT(DAYS FROM NOW() - v_carrier.last_verified);
    CASE 
      WHEN v_days_since_verification > 180 THEN v_score := v_score - 30;
      WHEN v_days_since_verification > 90 THEN v_score := v_score - 20;
      WHEN v_days_since_verification > 30 THEN v_score := v_score - 10;
      -- Less than 30 days is good, no penalty
    END CASE;
  END IF;
  
  -- Check API sync errors (max penalty: -25 points)
  v_error_count := COALESCE(v_carrier.api_error_count, 0);
  CASE 
    WHEN v_error_count > 5 THEN v_score := v_score - 25;
    WHEN v_error_count > 2 THEN v_score := v_score - 15;
    WHEN v_error_count > 0 THEN v_score := v_score - 5;
  END CASE;
  
  -- Check for missing critical fields (max penalty: -20 points)
  IF v_carrier.safety_rating IS NULL OR v_carrier.safety_rating = '' THEN
    v_missing_fields := v_missing_fields + 1;
  END IF;
  
  IF v_carrier.insurance_status IS NULL OR v_carrier.insurance_status = '' THEN
    v_missing_fields := v_missing_fields + 1;
  END IF;
  
  IF v_carrier.authority_status IS NULL OR v_carrier.authority_status = '' THEN
    v_missing_fields := v_missing_fields + 1;
  END IF;
  
  IF v_carrier.physical_address IS NULL OR v_carrier.physical_address = '' THEN
    v_missing_fields := v_missing_fields + 1;
  END IF;
  
  v_score := v_score - (v_missing_fields * 5);
  
  -- Check data source quality (max penalty: -15 points)
  CASE v_carrier.data_source
    WHEN 'fmcsa_api' THEN v_score := v_score + 0; -- No penalty for official API
    WHEN 'saferwebapi' THEN v_score := v_score - 5; -- Small penalty for 3rd party
    WHEN 'manual' THEN v_score := v_score - 10; -- Penalty for manual entry
    WHEN 'import' THEN v_score := v_score - 15; -- Penalty for bulk import
  END CASE;
  
  -- Check for active quality issues (max penalty: -10 points)
  SELECT COUNT(*) INTO v_error_count 
  FROM data_quality_issues 
  WHERE carrier_id = p_carrier_id AND resolved = FALSE;
  
  v_score := v_score - LEAST(v_error_count * 2, 10);
  
  -- Ensure score stays within bounds
  v_score := GREATEST(v_score, 0);
  v_score := LEAST(v_score, 100);
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to identify carriers needing verification
CREATE OR REPLACE FUNCTION identify_carriers_needing_verification()
RETURNS TABLE(
  carrier_id UUID,
  dot_number TEXT,
  legal_name TEXT,
  days_since_verification INTEGER,
  quality_score INTEGER,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as carrier_id,
    c.dot_number,
    c.legal_name,
    CASE 
      WHEN c.last_verified IS NULL THEN 999
      ELSE EXTRACT(DAYS FROM NOW() - c.last_verified)::INTEGER
    END as days_since_verification,
    calculate_data_quality_score(c.id) as quality_score,
    CASE 
      WHEN c.last_verified IS NULL THEN 'high'
      WHEN EXTRACT(DAYS FROM NOW() - c.last_verified) > 180 THEN 'high'
      WHEN EXTRACT(DAYS FROM NOW() - c.last_verified) > 90 THEN 'medium'
      WHEN c.api_error_count > 3 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM carriers c
  WHERE 
    c.last_verified IS NULL 
    OR c.last_verified < NOW() - INTERVAL '30 days'
    OR c.api_error_count > 0
    OR c.needs_verification = TRUE
  ORDER BY 
    CASE 
      WHEN c.last_verified IS NULL THEN 1
      WHEN EXTRACT(DAYS FROM NOW() - c.last_verified) > 180 THEN 2
      WHEN c.api_error_count > 3 THEN 3
      ELSE 4
    END,
    c.last_verified ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql;

-- Function to update carrier data quality scores
CREATE OR REPLACE FUNCTION refresh_data_quality_scores()
RETURNS INTEGER AS $$
DECLARE
  v_carrier_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_carrier_id IN SELECT id FROM carriers LOOP
    UPDATE carriers 
    SET 
      data_quality_score = calculate_data_quality_score(v_carrier_id),
      needs_verification = CASE 
        WHEN calculate_data_quality_score(v_carrier_id) < 70 THEN TRUE
        ELSE FALSE
      END
    WHERE id = v_carrier_id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to log data changes
CREATE OR REPLACE FUNCTION log_carrier_data_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if specific fields changed
  IF (OLD.safety_rating IS DISTINCT FROM NEW.safety_rating) OR
     (OLD.insurance_status IS DISTINCT FROM NEW.insurance_status) OR
     (OLD.authority_status IS DISTINCT FROM NEW.authority_status) OR
     (OLD.legal_name IS DISTINCT FROM NEW.legal_name) THEN
    
    INSERT INTO api_sync_log (
      carrier_id,
      api_source,
      sync_type,
      old_data,
      new_data,
      changes_detected,
      success
    ) VALUES (
      NEW.id,
      COALESCE(NEW.data_source, 'unknown'),
      'data_update',
      jsonb_build_object(
        'safety_rating', OLD.safety_rating,
        'insurance_status', OLD.insurance_status,
        'authority_status', OLD.authority_status,
        'legal_name', OLD.legal_name
      ),
      jsonb_build_object(
        'safety_rating', NEW.safety_rating,
        'insurance_status', NEW.insurance_status,
        'authority_status', NEW.authority_status,
        'legal_name', NEW.legal_name
      ),
      jsonb_build_object(
        'safety_rating_changed', (OLD.safety_rating IS DISTINCT FROM NEW.safety_rating),
        'insurance_status_changed', (OLD.insurance_status IS DISTINCT FROM NEW.insurance_status),
        'authority_status_changed', (OLD.authority_status IS DISTINCT FROM NEW.authority_status),
        'legal_name_changed', (OLD.legal_name IS DISTINCT FROM NEW.legal_name)
      ),
      TRUE
    );
    
    -- Update quality score after change
    NEW.data_quality_score := calculate_data_quality_score(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging changes
CREATE TRIGGER trigger_log_carrier_changes
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION log_carrier_data_change();

-- Add RLS policies
ALTER TABLE data_refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;

-- Admins can see all data sync information
CREATE POLICY data_refresh_jobs_admin_policy ON data_refresh_jobs 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY api_sync_log_admin_policy ON api_sync_log 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY data_quality_issues_admin_policy ON data_quality_issues 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Initialize data quality scores for existing carriers
SELECT refresh_data_quality_scores();