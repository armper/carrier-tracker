-- Create search_history table for MVP Feature #6: Search History
-- Tracks user search queries for recent searches and analytics

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own search history" ON search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" ON search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search history" ON search_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" ON search_history
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history (user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history (query);
CREATE INDEX IF NOT EXISTS idx_search_history_user_created ON search_history (user_id, created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_history_updated_at_trigger
    BEFORE UPDATE ON search_history
    FOR EACH ROW
    EXECUTE FUNCTION update_search_history_updated_at();

-- Create a view for popular searches (for admin analytics)
CREATE OR REPLACE VIEW popular_searches AS
SELECT 
    query,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_count) as avg_results,
    MAX(created_at) as last_searched
FROM search_history 
WHERE created_at >= NOW() - INTERVAL '30 days'
    AND query != ''
GROUP BY query
ORDER BY search_count DESC, unique_users DESC
LIMIT 50;