-- Add Insurance Expiration Tracking System
-- MVP Backend Feature #6: Critical for freight broker compliance and risk management

-- Add insurance tracking fields to carriers table
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_carrier VARCHAR(255);
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(12,2);
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_effective_date DATE;
ALTER TABLE public.carriers ADD COLUMN IF NOT EXISTS insurance_last_verified TIMESTAMP WITH TIME ZONE;

-- Create insurance alerts tracking table
CREATE TABLE IF NOT EXISTS public.insurance_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  expiry_date DATE NOT NULL,
  alert_sent_30d BOOLEAN DEFAULT false,
  alert_sent_15d BOOLEAN DEFAULT false,
  alert_sent_7d BOOLEAN DEFAULT false,
  alert_sent_1d BOOLEAN DEFAULT false,
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user insurance alert preferences table
CREATE TABLE IF NOT EXISTS public.user_insurance_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  enable_30d_alerts BOOLEAN DEFAULT true,
  enable_15d_alerts BOOLEAN DEFAULT true,
  enable_7d_alerts BOOLEAN DEFAULT true,
  enable_1d_alerts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  dashboard_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- Create insurance history table for tracking changes
CREATE TABLE IF NOT EXISTS public.insurance_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  old_expiry_date DATE,
  new_expiry_date DATE,
  old_insurance_carrier VARCHAR(255),
  new_insurance_carrier VARCHAR(255),
  old_policy_number VARCHAR(100),
  new_policy_number VARCHAR(100),
  change_reason VARCHAR(50), -- 'manual_update', 'auto_refresh', 'verification'
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.insurance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insurance_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_alerts
CREATE POLICY "Users can view alerts for their saved carriers" ON public.insurance_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_carriers sc
      WHERE sc.carrier_id = insurance_alerts.carrier_id
      AND sc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage insurance alerts" ON public.insurance_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for user_insurance_preferences
CREATE POLICY "Users can manage own insurance preferences" ON public.user_insurance_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for insurance_history
CREATE POLICY "Users can view insurance history for their saved carriers" ON public.insurance_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_carriers sc
      WHERE sc.carrier_id = insurance_history.carrier_id
      AND sc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage insurance history" ON public.insurance_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carriers_insurance_expiry ON public.carriers(insurance_expiry_date) WHERE insurance_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_carrier_id ON public.insurance_alerts(carrier_id);
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_expiry_date ON public.insurance_alerts(expiry_date);
CREATE INDEX IF NOT EXISTS idx_insurance_alerts_pending ON public.insurance_alerts(expiry_date) 
  WHERE alert_sent_30d = false OR alert_sent_15d = false OR alert_sent_7d = false OR alert_sent_1d = false;
CREATE INDEX IF NOT EXISTS idx_insurance_history_carrier_id ON public.insurance_history(carrier_id);
CREATE INDEX IF NOT EXISTS idx_user_insurance_preferences_user_id ON public.user_insurance_preferences(user_id);

-- Function to automatically create insurance alerts when expiry date is set
CREATE OR REPLACE FUNCTION create_insurance_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create alert if insurance_expiry_date is set and changed
  IF NEW.insurance_expiry_date IS NOT NULL AND 
     (OLD.insurance_expiry_date IS NULL OR OLD.insurance_expiry_date != NEW.insurance_expiry_date) THEN
    
    -- Delete existing alert for this carrier
    DELETE FROM public.insurance_alerts WHERE carrier_id = NEW.id;
    
    -- Create new alert
    INSERT INTO public.insurance_alerts (carrier_id, expiry_date)
    VALUES (NEW.id, NEW.insurance_expiry_date);
    
    -- Log the change in history
    INSERT INTO public.insurance_history (
      carrier_id, 
      old_expiry_date, 
      new_expiry_date,
      old_insurance_carrier,
      new_insurance_carrier,
      old_policy_number,
      new_policy_number,
      change_reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.insurance_expiry_date,
      NEW.insurance_expiry_date,
      OLD.insurance_carrier,
      NEW.insurance_carrier,
      OLD.insurance_policy_number,
      NEW.insurance_policy_number,
      'manual_update',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create insurance alerts
CREATE TRIGGER trigger_create_insurance_alert
  AFTER UPDATE ON public.carriers
  FOR EACH ROW
  EXECUTE FUNCTION create_insurance_alert();

-- Function to get carriers with expiring insurance
CREATE OR REPLACE FUNCTION get_expiring_insurance(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  carrier_id UUID,
  dot_number VARCHAR,
  legal_name VARCHAR,
  insurance_expiry_date DATE,
  days_until_expiry INTEGER,
  insurance_carrier VARCHAR,
  policy_number VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.dot_number,
    c.legal_name,
    c.insurance_expiry_date,
    (c.insurance_expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    c.insurance_carrier,
    c.insurance_policy_number
  FROM public.carriers c
  WHERE c.insurance_expiry_date IS NOT NULL
    AND c.insurance_expiry_date <= CURRENT_DATE + INTERVAL '1 day' * days_ahead
    AND c.insurance_expiry_date >= CURRENT_DATE
  ORDER BY c.insurance_expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get insurance risk score for a carrier
CREATE OR REPLACE FUNCTION get_insurance_risk_score(carrier_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  risk_score INTEGER := 100; -- Start with perfect score
  expiry_date DATE;
  days_until_expiry INTEGER;
  verification_age INTEGER;
BEGIN
  -- Get insurance data
  SELECT 
    insurance_expiry_date,
    EXTRACT(EPOCH FROM (NOW() - insurance_last_verified))::INTEGER / 86400 -- days since verification
  INTO expiry_date, verification_age
  FROM public.carriers 
  WHERE id = carrier_uuid;
  
  -- If no insurance data, return very low score
  IF expiry_date IS NULL THEN
    RETURN 10;
  END IF;
  
  -- Calculate days until expiry
  days_until_expiry := (expiry_date - CURRENT_DATE)::INTEGER;
  
  -- Reduce score based on days until expiry
  IF days_until_expiry < 0 THEN
    risk_score := 0; -- Expired insurance
  ELSIF days_until_expiry <= 7 THEN
    risk_score := risk_score - 50; -- Critical risk
  ELSIF days_until_expiry <= 15 THEN
    risk_score := risk_score - 30; -- High risk
  ELSIF days_until_expiry <= 30 THEN
    risk_score := risk_score - 15; -- Medium risk
  END IF;
  
  -- Reduce score based on verification age
  IF verification_age IS NOT NULL THEN
    IF verification_age > 90 THEN
      risk_score := risk_score - 20; -- Very old verification
    ELSIF verification_age > 30 THEN
      risk_score := risk_score - 10; -- Old verification
    END IF;
  ELSE
    risk_score := risk_score - 15; -- Never verified
  END IF;
  
  RETURN GREATEST(0, risk_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.insurance_alerts IS 'Tracks insurance expiration alerts for carriers';
COMMENT ON TABLE public.user_insurance_preferences IS 'User preferences for insurance alert notifications';
COMMENT ON TABLE public.insurance_history IS 'Historical record of insurance data changes';
COMMENT ON FUNCTION get_expiring_insurance(INTEGER) IS 'Returns carriers with insurance expiring within specified days';
COMMENT ON FUNCTION get_insurance_risk_score(UUID) IS 'Calculates insurance risk score (0-100) for a carrier based on expiry and verification status';