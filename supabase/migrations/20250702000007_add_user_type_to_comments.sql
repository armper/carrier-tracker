-- Update get_comments_for_target function to include user_type for comment badges

DROP FUNCTION IF EXISTS get_comments_for_target(comment_type_enum, uuid, integer, integer);

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
  user_type VARCHAR,
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
      COALESCE(p.user_type, 'other') as user_type,
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
    cd.user_type,
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
    -- First, top-level comments (parent_comment_id IS NULL)
    CASE WHEN cd.parent_comment_id IS NULL THEN 0 ELSE 1 END,
    -- Then by pinned status (pinned first)
    cd.is_pinned DESC,
    -- Then by creation time (newest first for top-level, oldest first for replies)
    CASE 
      WHEN cd.parent_comment_id IS NULL THEN cd.created_at 
      ELSE cd.created_at 
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;