-- Insurance Voting System: Replace admin approval with community verification
-- This creates a voting system where users can upvote/downvote insurance accuracy

-- Create insurance votes table
CREATE TABLE IF NOT EXISTS public.insurance_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  insurance_info_id UUID REFERENCES public.carrier_insurance_info(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(insurance_info_id, user_id) -- One vote per user per insurance entry
);

-- Enable RLS
ALTER TABLE public.insurance_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_votes
CREATE POLICY "Anyone can view votes" ON public.insurance_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.insurance_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON public.insurance_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.insurance_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insurance_votes_info_id ON public.insurance_votes(insurance_info_id);
CREATE INDEX IF NOT EXISTS idx_insurance_votes_user_id ON public.insurance_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_votes_type ON public.insurance_votes(vote_type);

-- Function to get insurance info with vote counts
CREATE OR REPLACE FUNCTION get_carrier_insurance_with_votes(carrier_uuid UUID)
RETURNS TABLE(
  id UUID,
  has_insurance BOOLEAN,
  insurance_carrier VARCHAR,
  policy_number VARCHAR,
  insurance_amount NUMERIC,
  effective_date DATE,
  expiry_date DATE,
  days_until_expiry INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE,
  updated_by_email TEXT,
  verification_status VARCHAR,
  freshness_status VARCHAR,
  confidence_score INTEGER,
  document_url TEXT,
  document_filename TEXT,
  upvotes BIGINT,
  downvotes BIGINT,
  vote_score BIGINT,
  user_vote VARCHAR
) AS $$
DECLARE
  current_info RECORD;
  days_diff INTEGER;
  freshness VARCHAR(20);
  vote_counts RECORD;
  current_user_vote VARCHAR;
BEGIN
  -- Get the most recent insurance info (including disputed, since we use voting now)
  SELECT cii.*, p.email as submitted_by_email
  INTO current_info
  FROM public.carrier_insurance_info cii
  LEFT JOIN public.profiles p ON cii.submitted_by = p.id
  WHERE cii.carrier_id = carrier_uuid
    AND cii.is_current = true
  ORDER BY cii.submitted_at DESC
  LIMIT 1;

  -- If no insurance info found
  IF current_info IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID, -- id
      false, -- has_insurance
      NULL::VARCHAR, -- insurance_carrier
      NULL::VARCHAR, -- policy_number
      NULL::NUMERIC, -- insurance_amount
      NULL::DATE, -- effective_date
      NULL::DATE, -- expiry_date
      NULL::INTEGER, -- days_until_expiry
      NULL::TIMESTAMP WITH TIME ZONE, -- last_updated
      NULL::TEXT, -- updated_by_email
      'none'::VARCHAR, -- verification_status
      'none'::VARCHAR, -- freshness_status
      0, -- confidence_score
      NULL::TEXT, -- document_url
      NULL::TEXT, -- document_filename
      0::BIGINT, -- upvotes
      0::BIGINT, -- downvotes
      0::BIGINT, -- vote_score
      NULL::VARCHAR; -- user_vote
    RETURN;
  END IF;

  -- Calculate days until expiry
  IF current_info.expiry_date IS NOT NULL THEN
    days_diff := (current_info.expiry_date - CURRENT_DATE)::INTEGER;
  END IF;

  -- Calculate freshness status
  IF EXTRACT(EPOCH FROM (NOW() - current_info.submitted_at))::INTEGER / 86400 <= 30 THEN
    freshness := 'recent';
  ELSIF EXTRACT(EPOCH FROM (NOW() - current_info.submitted_at))::INTEGER / 86400 <= 90 THEN
    freshness := 'moderate';
  ELSE
    freshness := 'outdated';
  END IF;

  -- Get vote counts for this insurance entry
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as up_count,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as down_count
  INTO vote_counts
  FROM public.insurance_votes
  WHERE insurance_info_id = current_info.id;

  -- Get current user's vote if authenticated
  IF auth.uid() IS NOT NULL THEN
    SELECT vote_type INTO current_user_vote
    FROM public.insurance_votes
    WHERE insurance_info_id = current_info.id AND user_id = auth.uid();
  END IF;

  RETURN QUERY SELECT
    current_info.id,
    true, -- has_insurance
    current_info.insurance_carrier::VARCHAR,
    current_info.policy_number::VARCHAR,
    current_info.insurance_amount,
    current_info.effective_date,
    current_info.expiry_date,
    days_diff,
    current_info.submitted_at,
    current_info.submitted_by_email::TEXT,
    current_info.verification_status::VARCHAR,
    freshness::VARCHAR,
    current_info.confidence_score,
    current_info.document_url,
    current_info.document_filename,
    COALESCE(vote_counts.up_count, 0),
    COALESCE(vote_counts.down_count, 0),
    COALESCE(vote_counts.up_count, 0) - COALESCE(vote_counts.down_count, 0), -- vote_score
    current_user_vote;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cast a vote on insurance info
CREATE OR REPLACE FUNCTION vote_insurance_info(
  p_insurance_info_id UUID,
  p_vote_type VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  vote_counts RECORD;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate vote type
  IF p_vote_type NOT IN ('upvote', 'downvote') THEN
    RAISE EXCEPTION 'Invalid vote type. Must be upvote or downvote';
  END IF;

  -- Upsert the vote (insert or update if user already voted)
  INSERT INTO public.insurance_votes (insurance_info_id, user_id, vote_type)
  VALUES (p_insurance_info_id, user_id, p_vote_type)
  ON CONFLICT (insurance_info_id, user_id)
  DO UPDATE SET 
    vote_type = EXCLUDED.vote_type,
    updated_at = NOW();

  -- Get updated vote counts
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes
  INTO vote_counts
  FROM public.insurance_votes
  WHERE insurance_info_id = p_insurance_info_id;

  -- Return the updated vote counts
  RETURN jsonb_build_object(
    'upvotes', COALESCE(vote_counts.upvotes, 0),
    'downvotes', COALESCE(vote_counts.downvotes, 0),
    'vote_score', COALESCE(vote_counts.upvotes, 0) - COALESCE(vote_counts.downvotes, 0),
    'user_vote', p_vote_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a vote
CREATE OR REPLACE FUNCTION remove_insurance_vote(p_insurance_info_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_id UUID;
  vote_counts RECORD;
BEGIN
  -- Get current user
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Remove the vote
  DELETE FROM public.insurance_votes 
  WHERE insurance_info_id = p_insurance_info_id AND user_id = user_id;

  -- Get updated vote counts
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'upvote') as upvotes,
    COUNT(*) FILTER (WHERE vote_type = 'downvote') as downvotes
  INTO vote_counts
  FROM public.insurance_votes
  WHERE insurance_info_id = p_insurance_info_id;

  -- Return the updated vote counts
  RETURN jsonb_build_object(
    'upvotes', COALESCE(vote_counts.upvotes, 0),
    'downvotes', COALESCE(vote_counts.downvotes, 0),
    'vote_score', COALESCE(vote_counts.upvotes, 0) - COALESCE(vote_counts.downvotes, 0),
    'user_vote', NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_carrier_insurance_with_votes TO authenticated;
GRANT EXECUTE ON FUNCTION vote_insurance_info TO authenticated;
GRANT EXECUTE ON FUNCTION remove_insurance_vote TO authenticated;

-- Add comments
COMMENT ON TABLE public.insurance_votes IS 'Community votes on insurance information accuracy';
COMMENT ON FUNCTION get_carrier_insurance_with_votes(UUID) IS 'Returns insurance info with community vote counts';
COMMENT ON FUNCTION vote_insurance_info(UUID, VARCHAR) IS 'Allows users to vote on insurance accuracy';
COMMENT ON FUNCTION remove_insurance_vote(UUID) IS 'Allows users to remove their vote';