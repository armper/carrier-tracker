-- Rate Comments System Migration (Fixed Version)
-- Creates a flexible commenting system for rate submissions

-- Create comment_type enum for different types of content that can be commented on
CREATE TYPE comment_type_enum AS ENUM (
  'rate_submission',
  'insurance_info',
  'carrier_general',
  'safety_concern'
);

-- Create the main comments table
CREATE TABLE rate_submission_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to what's being commented on
  target_type comment_type_enum NOT NULL DEFAULT 'rate_submission',
  target_id UUID NOT NULL, -- References rate submission ID, insurance info ID, etc.
  
  -- Comment content
  comment_text TEXT NOT NULL CHECK (length(comment_text) >= 3 AND length(comment_text) <= 2000),
  
  -- User information
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Reply system - for threaded comments
  parent_comment_id UUID REFERENCES rate_submission_comments(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_flagged BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  flagged_reason TEXT,
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  -- Engagement
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE, -- For highlighting important comments
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create comment votes table for tracking user votes
CREATE TABLE comment_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES rate_submission_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure one vote per user per comment
  UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_comments_target ON rate_submission_comments(target_type, target_id);
CREATE INDEX idx_comments_user ON rate_submission_comments(user_id);
CREATE INDEX idx_comments_parent ON rate_submission_comments(parent_comment_id);
CREATE INDEX idx_comments_created ON rate_submission_comments(created_at DESC);
CREATE INDEX idx_comments_not_deleted ON rate_submission_comments(target_type, target_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user ON comment_votes(user_id);

-- Function to get comments for a specific target
CREATE OR REPLACE FUNCTION get_comments_for_target(
  p_target_type comment_type_enum,
  p_target_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  user_id UUID,
  user_email TEXT,
  user_reputation INTEGER,
  parent_comment_id UUID,
  reply_count INTEGER,
  upvotes INTEGER,
  downvotes INTEGER,
  is_pinned BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_author BOOLEAN,
  user_vote INTEGER
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
  WITH comment_data AS (
    SELECT 
      c.id,
      c.comment_text,
      c.user_id,
      p.email as user_email,
      COALESCE(ur.reputation_score, 0) as user_reputation,
      c.parent_comment_id,
      c.reply_count,
      c.upvotes,
      c.downvotes,
      c.is_pinned,
      c.created_at,
      c.updated_at,
      (c.user_id = current_user_id) as is_author,
      COALESCE(cv.vote_type, 0) as user_vote
    FROM rate_submission_comments c
    JOIN profiles p ON c.user_id = p.id
    LEFT JOIN user_reputation ur ON c.user_id = ur.user_id
    LEFT JOIN comment_votes cv ON c.id = cv.comment_id AND cv.user_id = current_user_id
    WHERE c.target_type = p_target_type
      AND c.target_id = p_target_id
      AND c.deleted_at IS NULL
      AND c.is_approved = TRUE
  )
  SELECT 
    cd.id,
    cd.comment_text,
    cd.user_id,
    cd.user_email,
    cd.user_reputation,
    cd.parent_comment_id,
    cd.reply_count,
    cd.upvotes,
    cd.downvotes,
    cd.is_pinned,
    cd.created_at,
    cd.updated_at,
    cd.is_author,
    cd.user_vote
  FROM comment_data cd
  ORDER BY 
    cd.is_pinned DESC,
    cd.parent_comment_id NULLS FIRST,
    cd.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to create a new comment
CREATE OR REPLACE FUNCTION create_comment(
  p_target_type comment_type_enum,
  p_target_id UUID,
  p_comment_text TEXT,
  p_parent_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_comment_id UUID;
  v_parent_exists BOOLEAN;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate comment text
  IF length(trim(p_comment_text)) < 3 OR length(trim(p_comment_text)) > 2000 THEN
    RAISE EXCEPTION 'Comment must be between 3 and 2000 characters';
  END IF;
  
  -- Check if parent comment exists and is valid (only allow one level of nesting)
  IF p_parent_comment_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM rate_submission_comments 
      WHERE id = p_parent_comment_id 
        AND target_type = p_target_type 
        AND target_id = p_target_id
        AND deleted_at IS NULL
        AND parent_comment_id IS NULL -- Only allow replies to top-level comments
    ) INTO v_parent_exists;
    
    IF NOT v_parent_exists THEN
      RAISE EXCEPTION 'Invalid parent comment or reply depth exceeded';
    END IF;
  END IF;
  
  -- Insert the comment
  INSERT INTO rate_submission_comments (
    target_type,
    target_id,
    comment_text,
    user_id,
    parent_comment_id
  ) VALUES (
    p_target_type,
    p_target_id,
    trim(p_comment_text),
    v_user_id,
    p_parent_comment_id
  ) RETURNING id INTO v_comment_id;
  
  -- Update reply count if this is a reply
  IF p_parent_comment_id IS NOT NULL THEN
    UPDATE rate_submission_comments 
    SET reply_count = reply_count + 1,
        updated_at = NOW()
    WHERE id = p_parent_comment_id;
  END IF;
  
  -- Update user reputation for commenting
  PERFORM update_user_reputation(v_user_id);
  
  RETURN v_comment_id;
END;
$$;

-- Function to vote on a comment
CREATE OR REPLACE FUNCTION vote_on_comment(
  p_comment_id UUID,
  p_vote_type INTEGER -- 1 for upvote, -1 for downvote, 0 to remove vote
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote INTEGER;
  v_vote_change INTEGER;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate vote type
  IF p_vote_type NOT IN (-1, 0, 1) THEN
    RAISE EXCEPTION 'Invalid vote type. Must be -1, 0, or 1';
  END IF;
  
  -- Check if comment exists
  IF NOT EXISTS (SELECT 1 FROM rate_submission_comments WHERE id = p_comment_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;
  
  -- Get existing vote
  SELECT vote_type INTO v_existing_vote
  FROM comment_votes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;
  
  -- Calculate vote change
  v_vote_change := COALESCE(p_vote_type, 0) - COALESCE(v_existing_vote, 0);
  
  -- Handle vote operations
  IF p_vote_type = 0 THEN
    -- Remove vote
    DELETE FROM comment_votes 
    WHERE comment_id = p_comment_id AND user_id = v_user_id;
  ELSE
    -- Insert or update vote
    INSERT INTO comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type)
    ON CONFLICT (comment_id, user_id)
    DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW();
  END IF;
  
  -- Update comment vote counts
  UPDATE rate_submission_comments
  SET 
    upvotes = upvotes + CASE WHEN v_vote_change > 0 THEN v_vote_change ELSE 0 END,
    downvotes = downvotes + CASE WHEN v_vote_change < 0 THEN ABS(v_vote_change) ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_comment_id;
  
  -- If vote change involves removing an upvote, subtract from upvotes
  IF v_existing_vote = 1 AND p_vote_type != 1 THEN
    UPDATE rate_submission_comments
    SET upvotes = GREATEST(0, upvotes - 1)
    WHERE id = p_comment_id;
  END IF;
  
  -- If vote change involves removing a downvote, subtract from downvotes  
  IF v_existing_vote = -1 AND p_vote_type != -1 THEN
    UPDATE rate_submission_comments
    SET downvotes = GREATEST(0, downvotes - 1)
    WHERE id = p_comment_id;
  END IF;
END;
$$;

-- Function to update comment reply counts (trigger function)
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Decrease reply count when comment is deleted
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE rate_submission_comments 
      SET reply_count = GREATEST(0, reply_count - 1)
      WHERE id = OLD.parent_comment_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for reply count updates
CREATE TRIGGER trigger_update_reply_count
  AFTER DELETE ON rate_submission_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reply_count();

-- Row Level Security (RLS) Policies
ALTER TABLE rate_submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Anyone can view approved comments" ON rate_submission_comments
  FOR SELECT USING (is_approved = TRUE AND deleted_at IS NULL);

CREATE POLICY "Users can create comments" ON rate_submission_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON rate_submission_comments
  FOR UPDATE USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '24 hours');

CREATE POLICY "Users can soft delete own comments" ON rate_submission_comments
  FOR UPDATE USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Vote policies
CREATE POLICY "Anyone can view votes" ON comment_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own votes" ON comment_votes
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON rate_submission_comments TO authenticated;
GRANT ALL ON comment_votes TO authenticated;
GRANT EXECUTE ON FUNCTION get_comments_for_target TO authenticated;
GRANT EXECUTE ON FUNCTION create_comment TO authenticated;
GRANT EXECUTE ON FUNCTION vote_on_comment TO authenticated;