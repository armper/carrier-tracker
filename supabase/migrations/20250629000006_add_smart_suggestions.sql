-- Smart Suggestions System
-- High-impact database-driven carrier recommendations

-- Create suggestions table to store generated suggestions
CREATE TABLE user_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  carrier_ids UUID[] NOT NULL,
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 50, -- 1-100, higher = more important
  is_dismissed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient suggestions lookup
CREATE INDEX idx_user_suggestions_user_id ON user_suggestions(user_id);
CREATE INDEX idx_user_suggestions_active ON user_suggestions(user_id, is_dismissed, expires_at) 
  WHERE is_dismissed = FALSE AND expires_at > NOW();

-- Track user interactions with suggestions
CREATE TABLE suggestion_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES user_suggestions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'view', 'click', 'dismiss', 'save_carrier'
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestion_interactions_suggestion ON suggestion_interactions(suggestion_id);

-- Function to calculate safety rating score for comparisons
CREATE OR REPLACE FUNCTION get_safety_rating_score(rating TEXT)
RETURNS INTEGER AS $$
BEGIN
  CASE rating
    WHEN 'satisfactory' THEN RETURN 3;
    WHEN 'conditional' THEN RETURN 2;
    WHEN 'unsatisfactory' THEN RETURN 1;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user's carrier portfolio profile
CREATE OR REPLACE FUNCTION get_user_carrier_profile(p_user_id UUID)
RETURNS TABLE(
  total_carriers INTEGER,
  avg_safety_score NUMERIC,
  states TEXT[],
  cities TEXT[],
  avg_fleet_size NUMERIC,
  safety_distribution JSONB,
  geographic_spread INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_carriers,
    AVG(get_safety_rating_score(c.safety_rating))::NUMERIC as avg_safety_score,
    ARRAY_AGG(DISTINCT c.state) FILTER (WHERE c.state IS NOT NULL) as states,
    ARRAY_AGG(DISTINCT c.city) FILTER (WHERE c.city IS NOT NULL) as cities,
    AVG(c.vehicle_count) FILTER (WHERE c.vehicle_count IS NOT NULL)::NUMERIC as avg_fleet_size,
    jsonb_build_object(
      'satisfactory', COUNT(*) FILTER (WHERE c.safety_rating = 'satisfactory'),
      'conditional', COUNT(*) FILTER (WHERE c.safety_rating = 'conditional'),
      'unsatisfactory', COUNT(*) FILTER (WHERE c.safety_rating = 'unsatisfactory'),
      'not_rated', COUNT(*) FILTER (WHERE c.safety_rating NOT IN ('satisfactory', 'conditional', 'unsatisfactory'))
    ) as safety_distribution,
    COUNT(DISTINCT c.state)::INTEGER as geographic_spread
  FROM saved_carriers sc
  JOIN carriers c ON sc.carrier_id = c.id
  WHERE sc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find better alternatives (higher safety ratings in same locations)
CREATE OR REPLACE FUNCTION find_better_alternatives(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
  carrier_id UUID,
  dot_number TEXT,
  legal_name TEXT,
  safety_rating TEXT,
  state TEXT,
  city TEXT,
  vehicle_count INTEGER,
  improvement_reason TEXT,
  priority_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_profile AS (
    SELECT * FROM get_user_carrier_profile(p_user_id)
  ),
  user_carriers AS (
    SELECT c.* FROM saved_carriers sc
    JOIN carriers c ON sc.carrier_id = c.id
    WHERE sc.user_id = p_user_id
  ),
  user_states AS (
    SELECT DISTINCT c.state 
    FROM saved_carriers sc
    JOIN carriers c ON sc.carrier_id = c.id
    WHERE sc.user_id = p_user_id AND c.state IS NOT NULL
  ),
  improvement_candidates AS (
    SELECT 
      c.id as carrier_id,
      c.dot_number,
      c.legal_name,
      c.safety_rating,
      c.state,
      c.city,
      c.vehicle_count,
      CASE 
        WHEN c.safety_rating = 'satisfactory' AND up.avg_safety_score < 3 
        THEN 'Upgrade to Satisfactory rating'
        WHEN c.safety_rating = 'conditional' AND up.avg_safety_score < 2 
        THEN 'Better than your current average'
        WHEN c.insurance_status = 'Active' 
        THEN 'Active insurance coverage'
        ELSE 'Geographic coverage expansion'
      END as improvement_reason,
      CASE 
        WHEN c.safety_rating = 'satisfactory' THEN 90
        WHEN c.safety_rating = 'conditional' THEN 70
        WHEN c.insurance_status = 'Active' THEN 60
        ELSE 40
      END as priority_score
    FROM carriers c
    CROSS JOIN user_profile up
    WHERE c.id NOT IN (SELECT carrier_id FROM saved_carriers WHERE user_id = p_user_id)
      AND c.state IN (SELECT state FROM user_states)
      AND (
        get_safety_rating_score(c.safety_rating) > up.avg_safety_score
        OR (c.insurance_status = 'Active' AND up.avg_safety_score < 2.5)
        OR (c.safety_rating = 'satisfactory' AND up.avg_safety_score < 3)
      )
      AND c.safety_rating IN ('satisfactory', 'conditional')
  )
  SELECT ic.* FROM improvement_candidates ic
  ORDER BY ic.priority_score DESC, ic.safety_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find coverage gaps (new geographic areas with good carriers)
CREATE OR REPLACE FUNCTION find_coverage_gaps(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
  carrier_id UUID,
  dot_number TEXT,
  legal_name TEXT,
  safety_rating TEXT,
  state TEXT,
  city TEXT,
  vehicle_count INTEGER,
  gap_reason TEXT,
  priority_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_states AS (
    SELECT DISTINCT c.state 
    FROM saved_carriers sc
    JOIN carriers c ON sc.carrier_id = c.id
    WHERE sc.user_id = p_user_id AND c.state IS NOT NULL
  ),
  adjacent_states AS (
    -- Find states adjacent to user's current coverage
    -- This is a simplified approach - in reality you'd want a state adjacency table
    SELECT DISTINCT c.state
    FROM carriers c
    WHERE c.state IS NOT NULL 
      AND c.state NOT IN (SELECT state FROM user_states)
      AND c.safety_rating IN ('satisfactory', 'conditional')
    ORDER BY c.state
    LIMIT 10 -- Focus on top states by carrier quality
  ),
  gap_candidates AS (
    SELECT 
      c.id as carrier_id,
      c.dot_number,
      c.legal_name,
      c.safety_rating,
      c.state,
      c.city,
      c.vehicle_count,
      'Expand coverage to ' || c.state as gap_reason,
      CASE 
        WHEN c.safety_rating = 'satisfactory' THEN 85
        WHEN c.safety_rating = 'conditional' THEN 65
        ELSE 40
      END as priority_score
    FROM carriers c
    WHERE c.id NOT IN (SELECT carrier_id FROM saved_carriers WHERE user_id = p_user_id)
      AND c.state IN (SELECT state FROM adjacent_states)
      AND c.safety_rating IN ('satisfactory', 'conditional')
      AND c.insurance_status = 'Active'
  )
  SELECT gc.* FROM gap_candidates gc
  ORDER BY gc.priority_score DESC, gc.safety_rating DESC, gc.vehicle_count DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find new carriers (recently added with good profiles)
CREATE OR REPLACE FUNCTION find_new_opportunities(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
  carrier_id UUID,
  dot_number TEXT,
  legal_name TEXT,
  safety_rating TEXT,
  state TEXT,
  city TEXT,
  vehicle_count INTEGER,
  opportunity_reason TEXT,
  priority_score INTEGER,
  days_since_added INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_states AS (
    SELECT DISTINCT c.state 
    FROM saved_carriers sc
    JOIN carriers c ON sc.carrier_id = c.id
    WHERE sc.user_id = p_user_id AND c.state IS NOT NULL
  ),
  new_carriers AS (
    SELECT 
      c.id as carrier_id,
      c.dot_number,
      c.legal_name,
      c.safety_rating,
      c.state,
      c.city,
      c.vehicle_count,
      'New carrier in your coverage area' as opportunity_reason,
      CASE 
        WHEN c.safety_rating = 'satisfactory' THEN 80
        WHEN c.safety_rating = 'conditional' THEN 60
        ELSE 30
      END as priority_score,
      EXTRACT(DAYS FROM NOW() - c.created_at)::INTEGER as days_since_added
    FROM carriers c
    WHERE c.id NOT IN (SELECT carrier_id FROM saved_carriers WHERE user_id = p_user_id)
      AND c.created_at > NOW() - INTERVAL '30 days'
      AND c.state IN (SELECT state FROM user_states)
      AND c.safety_rating IN ('satisfactory', 'conditional')
  )
  SELECT nc.* FROM new_carriers nc
  ORDER BY nc.priority_score DESC, nc.days_since_added ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to generate all suggestions for a user
CREATE OR REPLACE FUNCTION generate_user_suggestions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_suggestion_id UUID;
  v_carrier_ids UUID[];
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM get_user_carrier_profile(p_user_id);
  
  -- Skip if user has no saved carriers
  IF v_profile.total_carriers = 0 THEN
    RETURN;
  END IF;
  
  -- Clear existing active suggestions
  UPDATE user_suggestions 
  SET is_dismissed = TRUE 
  WHERE user_id = p_user_id AND is_dismissed = FALSE;
  
  -- Generate Better Alternatives suggestion
  SELECT ARRAY_AGG(carrier_id) INTO v_carrier_ids
  FROM find_better_alternatives(p_user_id, 3);
  
  IF array_length(v_carrier_ids, 1) > 0 THEN
    INSERT INTO user_suggestions (
      user_id, suggestion_type, title, description, carrier_ids, priority, metadata
    ) VALUES (
      p_user_id,
      'better_alternatives',
      'Upgrade Your Carrier Portfolio',
      format('Found %s carriers with better safety ratings in your coverage areas', array_length(v_carrier_ids, 1)),
      v_carrier_ids,
      90,
      jsonb_build_object(
        'improvement_type', 'safety_rating',
        'current_avg_score', v_profile.avg_safety_score,
        'potential_improvement', 'Higher safety ratings available'
      )
    );
  END IF;
  
  -- Generate Coverage Gaps suggestion
  SELECT ARRAY_AGG(carrier_id) INTO v_carrier_ids
  FROM find_coverage_gaps(p_user_id, 3);
  
  IF array_length(v_carrier_ids, 1) > 0 THEN
    INSERT INTO user_suggestions (
      user_id, suggestion_type, title, description, carrier_ids, priority, metadata
    ) VALUES (
      p_user_id,
      'coverage_gaps',
      'Expand Your Coverage Network',
      format('Discover %s quality carriers in new geographic areas', array_length(v_carrier_ids, 1)),
      v_carrier_ids,
      80,
      jsonb_build_object(
        'expansion_type', 'geographic',
        'current_states', v_profile.states,
        'geographic_spread', v_profile.geographic_spread
      )
    );
  END IF;
  
  -- Generate New Opportunities suggestion (if user has good portfolio)
  IF v_profile.avg_safety_score >= 2.0 THEN
    SELECT ARRAY_AGG(carrier_id) INTO v_carrier_ids
    FROM find_new_opportunities(p_user_id, 2);
    
    IF array_length(v_carrier_ids, 1) > 0 THEN
      INSERT INTO user_suggestions (
        user_id, suggestion_type, title, description, carrier_ids, priority, metadata
      ) VALUES (
        p_user_id,
        'new_opportunities',
        'Fresh Market Opportunities',
        format('New carriers recently added in your areas - %s available', array_length(v_carrier_ids, 1)),
        v_carrier_ids,
        70,
        jsonb_build_object(
          'opportunity_type', 'new_carriers',
          'timeframe', '30_days'
        )
      );
    END IF;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Function to refresh suggestions for all users (can be run via cron)
CREATE OR REPLACE FUNCTION refresh_all_suggestions()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_processed INTEGER := 0;
BEGIN
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM saved_carriers 
    WHERE user_id IS NOT NULL
  LOOP
    PERFORM generate_user_suggestions(v_user_id);
    v_processed := v_processed + 1;
  END LOOP;
  
  RETURN v_processed;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE user_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_interactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own suggestions
CREATE POLICY user_suggestions_user_policy ON user_suggestions 
  FOR ALL USING (user_id = auth.uid());

-- Users can only interact with their own suggestions
CREATE POLICY suggestion_interactions_user_policy ON suggestion_interactions 
  FOR ALL USING (user_id = auth.uid());

-- Admins can see all suggestions
CREATE POLICY user_suggestions_admin_policy ON user_suggestions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY suggestion_interactions_admin_policy ON suggestion_interactions 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_suggestions_updated_at 
  BEFORE UPDATE ON user_suggestions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create initial suggestions for existing users
SELECT refresh_all_suggestions();