-- Create carrier rating and comment system
-- Allows users to rate carriers and leave general comments

-- First, add carrier_rating to the comment_type_enum
ALTER TYPE comment_type_enum ADD VALUE 'carrier_rating';

-- Create carrier ratings table
CREATE TABLE carrier_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  review_text TEXT,
  category VARCHAR(50) DEFAULT 'general', -- general, payment, communication, equipment, etc.
  would_recommend BOOLEAN,
  anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- One rating per user per carrier
  UNIQUE(carrier_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_carrier_ratings_carrier_id ON carrier_ratings(carrier_id);
CREATE INDEX idx_carrier_ratings_user_id ON carrier_ratings(user_id);
CREATE INDEX idx_carrier_ratings_rating ON carrier_ratings(rating);
CREATE INDEX idx_carrier_ratings_category ON carrier_ratings(category);
CREATE INDEX idx_carrier_ratings_created_at ON carrier_ratings(created_at);

-- Enable RLS
ALTER TABLE carrier_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all approved ratings" ON carrier_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own ratings" ON carrier_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON carrier_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON carrier_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Function to submit a carrier rating
CREATE OR REPLACE FUNCTION submit_carrier_rating(
  p_carrier_id UUID,
  p_rating INTEGER,
  p_title VARCHAR DEFAULT NULL,
  p_review_text TEXT DEFAULT NULL,
  p_category VARCHAR DEFAULT 'general',
  p_would_recommend BOOLEAN DEFAULT NULL,
  p_anonymous BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_rating_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  
  -- Check if carrier exists
  IF NOT EXISTS (SELECT 1 FROM carriers WHERE id = p_carrier_id) THEN
    RAISE EXCEPTION 'Carrier not found';
  END IF;
  
  -- Insert or update rating
  INSERT INTO carrier_ratings (
    carrier_id,
    user_id,
    rating,
    title,
    review_text,
    category,
    would_recommend,
    anonymous
  ) VALUES (
    p_carrier_id,
    v_user_id,
    p_rating,
    trim(p_title),
    trim(p_review_text),
    p_category,
    p_would_recommend,
    p_anonymous
  )
  ON CONFLICT (carrier_id, user_id)
  DO UPDATE SET
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    review_text = EXCLUDED.review_text,
    category = EXCLUDED.category,
    would_recommend = EXCLUDED.would_recommend,
    anonymous = EXCLUDED.anonymous,
    updated_at = NOW()
  RETURNING id INTO v_rating_id;
  
  -- Update user reputation for rating
  PERFORM update_user_reputation(v_user_id);
  
  RETURN v_rating_id;
END;
$$;

-- Function to get carrier ratings with user information
CREATE OR REPLACE FUNCTION get_carrier_ratings(
  p_carrier_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  title VARCHAR,
  review_text TEXT,
  category VARCHAR,
  would_recommend BOOLEAN,
  anonymous BOOLEAN,
  user_email TEXT,
  user_type VARCHAR,
  user_reputation INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_author BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO current_user_id;
  
  RETURN QUERY
  SELECT 
    cr.id,
    cr.rating,
    cr.title,
    cr.review_text,
    cr.category,
    cr.would_recommend,
    cr.anonymous,
    CASE 
      WHEN cr.anonymous = true THEN 'Anonymous'
      ELSE p.email
    END as user_email,
    COALESCE(p.user_type, 'other') as user_type,
    COALESCE(ur.reputation_score, 0) as user_reputation,
    cr.created_at,
    cr.updated_at,
    (cr.user_id = current_user_id) as is_author
  FROM carrier_ratings cr
  JOIN profiles p ON cr.user_id = p.id
  LEFT JOIN user_reputation ur ON cr.user_id = ur.user_id
  WHERE cr.carrier_id = p_carrier_id
  ORDER BY cr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get carrier rating summary
CREATE OR REPLACE FUNCTION get_carrier_rating_summary(p_carrier_id UUID)
RETURNS TABLE (
  total_ratings INTEGER,
  average_rating DECIMAL(3,2),
  rating_distribution JSONB,
  would_recommend_percent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_ratings,
    ROUND(AVG(rating), 2) as average_rating,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution,
    CASE 
      WHEN COUNT(*) FILTER (WHERE would_recommend IS NOT NULL) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE would_recommend = true) * 100.0 / 
        COUNT(*) FILTER (WHERE would_recommend IS NOT NULL)
      )::INTEGER
    END as would_recommend_percent
  FROM carrier_ratings
  WHERE carrier_id = p_carrier_id;
END;
$$;

-- Function to get user's rating for a carrier
CREATE OR REPLACE FUNCTION get_user_carrier_rating(p_carrier_id UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  title VARCHAR,
  review_text TEXT,
  category VARCHAR,
  would_recommend BOOLEAN,
  anonymous BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    cr.id,
    cr.rating,
    cr.title,
    cr.review_text,
    cr.category,
    cr.would_recommend,
    cr.anonymous,
    cr.created_at,
    cr.updated_at
  FROM carrier_ratings cr
  WHERE cr.carrier_id = p_carrier_id AND cr.user_id = v_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION submit_carrier_rating TO authenticated;
GRANT EXECUTE ON FUNCTION get_carrier_ratings TO authenticated;
GRANT EXECUTE ON FUNCTION get_carrier_rating_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_carrier_rating TO authenticated;