-- Add DOT Safety Rating History System
-- MVP Backend Feature #7: Track historical safety rating changes and trends

-- Create safety rating history table
CREATE TABLE IF NOT EXISTS public.safety_rating_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  old_rating VARCHAR(50),
  new_rating VARCHAR(50) NOT NULL,
  change_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data_source VARCHAR(50) DEFAULT 'fmcsa' NOT NULL, -- 'fmcsa', 'manual', 'verification'
  change_reason VARCHAR(100), -- 'fmcsa_update', 'manual_correction', 'inspection_result', 'review_completed'
  changed_by UUID REFERENCES public.profiles(id), -- admin who made manual change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Metadata for tracking data quality
  confidence_score INTEGER DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Add safety rating stability tracking fields to carriers table
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS safety_rating_last_changed TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS safety_rating_stability_score INTEGER DEFAULT 100 CHECK (safety_rating_stability_score >= 0 AND safety_rating_stability_score <= 100);
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS safety_rating_change_count INTEGER DEFAULT 0;
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS safety_rating_trend VARCHAR(20) DEFAULT 'stable'; -- 'improving', 'declining', 'stable', 'volatile'

-- Enable RLS on safety rating history table
ALTER TABLE public.safety_rating_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for safety_rating_history
CREATE POLICY "Users can view safety history for their saved carriers" ON public.safety_rating_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_carriers sc
      WHERE sc.carrier_id = safety_rating_history.carrier_id
      AND sc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage safety rating history" ON public.safety_rating_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_carrier_id ON public.safety_rating_history(carrier_id);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_change_date ON public.safety_rating_history(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_new_rating ON public.safety_rating_history(new_rating);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_data_source ON public.safety_rating_history(data_source);
CREATE INDEX IF NOT EXISTS idx_carriers_safety_rating_last_changed ON public.carriers(safety_rating_last_changed) WHERE safety_rating_last_changed IS NOT NULL;

-- Function to automatically track safety rating changes
CREATE OR REPLACE FUNCTION track_safety_rating_change()
RETURNS TRIGGER AS $$
DECLARE
  change_count INTEGER;
  months_since_last_change NUMERIC;
  stability_score INTEGER;
  trend_direction VARCHAR(20);
BEGIN
  -- Only track if safety_rating actually changed
  IF NEW.safety_rating IS DISTINCT FROM OLD.safety_rating THEN
    
    -- Insert history record
    INSERT INTO public.safety_rating_history (
      carrier_id,
      old_rating,
      new_rating,
      change_date,
      data_source,
      change_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.safety_rating,
      NEW.safety_rating,
      timezone('utc'::text, now()),
      COALESCE(NEW.data_source, 'manual'),
      CASE 
        WHEN NEW.data_source = 'fmcsa' THEN 'fmcsa_update'
        WHEN auth.uid() IS NOT NULL THEN 'manual_correction'
        ELSE 'system_update'
      END,
      auth.uid()
    );
    
    -- Update carrier tracking fields
    NEW.safety_rating_last_changed := timezone('utc'::text, now());
    NEW.safety_rating_change_count := COALESCE(OLD.safety_rating_change_count, 0) + 1;
    
    -- Calculate stability score based on change frequency
    change_count := NEW.safety_rating_change_count;
    
    -- Get months since last change (if any previous changes)
    SELECT EXTRACT(EPOCH FROM (NEW.safety_rating_last_changed - MAX(change_date))) / (30 * 24 * 3600)
    INTO months_since_last_change
    FROM public.safety_rating_history 
    WHERE carrier_id = NEW.id AND change_date < NEW.safety_rating_last_changed;
    
    -- Calculate stability score (more changes = lower stability)
    stability_score := GREATEST(0, 100 - (change_count * 15));
    
    -- Bonus for stable periods
    IF months_since_last_change IS NOT NULL AND months_since_last_change > 12 THEN
      stability_score := LEAST(100, stability_score + 20);
    END IF;
    
    NEW.safety_rating_stability_score := stability_score;
    
    -- Determine trend based on recent rating changes
    SELECT 
      CASE 
        WHEN COUNT(*) = 0 THEN 'stable'
        WHEN rating_trend > 0 THEN 'improving'
        WHEN rating_trend < 0 THEN 'declining'
        WHEN COUNT(*) > 2 THEN 'volatile'
        ELSE 'stable'
      END
    INTO trend_direction
    FROM (
      SELECT 
        CASE new_rating
          WHEN 'satisfactory' THEN 3
          WHEN 'conditional' THEN 2
          WHEN 'unsatisfactory' THEN 1
          ELSE 0
        END -
        CASE old_rating
          WHEN 'satisfactory' THEN 3
          WHEN 'conditional' THEN 2
          WHEN 'unsatisfactory' THEN 1
          ELSE 0
        END as rating_trend
      FROM public.safety_rating_history 
      WHERE carrier_id = NEW.id 
      AND change_date >= (timezone('utc'::text, now()) - INTERVAL '12 months')
    ) trends
    WHERE rating_trend != 0;
    
    NEW.safety_rating_trend := trend_direction;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track safety rating changes
DROP TRIGGER IF EXISTS trigger_track_safety_rating_change ON public.carriers;
CREATE TRIGGER trigger_track_safety_rating_change
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW
  EXECUTE FUNCTION track_safety_rating_change();

-- Function to get safety rating history for a carrier
CREATE OR REPLACE FUNCTION get_safety_rating_history(carrier_uuid UUID, months_back INTEGER DEFAULT 24)
RETURNS TABLE (
  id UUID,
  old_rating VARCHAR,
  new_rating VARCHAR,
  change_date TIMESTAMP WITH TIME ZONE,
  data_source VARCHAR,
  change_reason VARCHAR,
  months_ago NUMERIC,
  rating_numeric INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.old_rating,
    h.new_rating,
    h.change_date,
    h.data_source,
    h.change_reason,
    EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - h.change_date)) / (30 * 24 * 3600) as months_ago,
    CASE h.new_rating
      WHEN 'satisfactory' THEN 3
      WHEN 'conditional' THEN 2
      WHEN 'unsatisfactory' THEN 1
      ELSE 0
    END as rating_numeric
  FROM public.safety_rating_history h
  WHERE h.carrier_id = carrier_uuid
    AND h.change_date >= (timezone('utc'::text, now()) - INTERVAL '1 month' * months_back)
  ORDER BY h.change_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate safety rating risk score
CREATE OR REPLACE FUNCTION get_safety_rating_risk_score(carrier_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_rating VARCHAR;
  stability_score INTEGER;
  trend VARCHAR;
  change_count INTEGER;
  last_change_months NUMERIC;
  risk_score INTEGER := 100; -- Start with perfect score
BEGIN
  -- Get current carrier data
  SELECT 
    safety_rating,
    safety_rating_stability_score,
    safety_rating_trend,
    safety_rating_change_count,
    EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - safety_rating_last_changed)) / (30 * 24 * 3600)
  INTO current_rating, stability_score, trend, change_count, last_change_months
  FROM public.carriers 
  WHERE id = carrier_uuid;
  
  -- Base score on current rating
  CASE current_rating
    WHEN 'satisfactory' THEN risk_score := 100;
    WHEN 'conditional' THEN risk_score := 60;
    WHEN 'unsatisfactory' THEN risk_score := 20;
    WHEN 'not-rated' THEN risk_score := 80;
    ELSE risk_score := 50;
  END CASE;
  
  -- Adjust based on stability
  IF stability_score IS NOT NULL THEN
    risk_score := (risk_score + stability_score) / 2;
  END IF;
  
  -- Adjust based on trend
  CASE trend
    WHEN 'improving' THEN risk_score := LEAST(100, risk_score + 10);
    WHEN 'declining' THEN risk_score := GREATEST(0, risk_score - 20);
    WHEN 'volatile' THEN risk_score := GREATEST(0, risk_score - 15);
    ELSE NULL; -- stable, no adjustment
  END CASE;
  
  -- Penalty for frequent changes
  IF change_count IS NOT NULL AND change_count > 3 THEN
    risk_score := GREATEST(0, risk_score - (change_count * 5));
  END IF;
  
  -- Bonus for long stability
  IF last_change_months IS NOT NULL AND last_change_months > 24 THEN
    risk_score := LEAST(100, risk_score + 10);
  END IF;
  
  RETURN GREATEST(0, LEAST(100, risk_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get carriers with recent safety rating changes
CREATE OR REPLACE FUNCTION get_recent_safety_rating_changes(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  carrier_id UUID,
  dot_number VARCHAR,
  legal_name VARCHAR,
  old_rating VARCHAR,
  new_rating VARCHAR,
  change_date TIMESTAMP WITH TIME ZONE,
  data_source VARCHAR,
  change_reason VARCHAR,
  days_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.carrier_id,
    c.dot_number,
    c.legal_name,
    h.old_rating,
    h.new_rating,
    h.change_date,
    h.data_source,
    h.change_reason,
    EXTRACT(DAY FROM (timezone('utc'::text, now()) - h.change_date))::INTEGER as days_ago
  FROM public.safety_rating_history h
  JOIN public.carriers c ON h.carrier_id = c.id
  WHERE h.change_date >= (timezone('utc'::text, now()) - INTERVAL '1 day' * days_back)
  ORDER BY h.change_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.safety_rating_history IS 'Tracks historical safety rating changes for carriers';
COMMENT ON COLUMN public.carriers.safety_rating_stability_score IS 'Score 0-100 based on rating change frequency (100 = very stable)';
COMMENT ON COLUMN public.carriers.safety_rating_trend IS 'Recent trend: improving, declining, stable, or volatile';
COMMENT ON FUNCTION get_safety_rating_history(UUID, INTEGER) IS 'Returns safety rating history for a carrier within specified months';
COMMENT ON FUNCTION get_safety_rating_risk_score(UUID) IS 'Calculates safety rating risk score (0-100) based on current rating, stability, and trends';
COMMENT ON FUNCTION get_recent_safety_rating_changes(INTEGER) IS 'Returns carriers with safety rating changes within specified days';

-- Create initial history records for existing carriers with ratings
INSERT INTO public.safety_rating_history (carrier_id, old_rating, new_rating, change_date, data_source, change_reason)
SELECT 
  id,
  NULL,
  safety_rating,
  COALESCE(updated_at, created_at, timezone('utc'::text, now())),
  COALESCE(data_source, 'unknown'),
  'initial_record'
FROM public.carriers 
WHERE safety_rating IS NOT NULL 
  AND safety_rating != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.safety_rating_history h 
    WHERE h.carrier_id = carriers.id
  );

-- Update carrier tracking fields for existing data
UPDATE public.carriers 
SET 
  safety_rating_last_changed = updated_at,
  safety_rating_change_count = 0,
  safety_rating_stability_score = 100,
  safety_rating_trend = 'stable'
WHERE safety_rating IS NOT NULL 
  AND safety_rating != ''
  AND safety_rating_last_changed IS NULL;