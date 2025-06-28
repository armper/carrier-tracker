-- Enhancement for saved_carriers table to support notes, tags, priority, and contact tracking
-- This implements MVP Feature #5: Carrier Notes & Tags

-- Add new columns to saved_carriers table
ALTER TABLE saved_carriers 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS last_contacted DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update the notes column to allow longer text (if not already TEXT)
ALTER TABLE saved_carriers 
ALTER COLUMN notes TYPE TEXT;

-- Create an index on tags for efficient filtering
CREATE INDEX IF NOT EXISTS idx_saved_carriers_tags ON saved_carriers USING GIN (tags);

-- Create an index on priority for filtering
CREATE INDEX IF NOT EXISTS idx_saved_carriers_priority ON saved_carriers (priority);

-- Create an index on last_contacted for sorting
CREATE INDEX IF NOT EXISTS idx_saved_carriers_last_contacted ON saved_carriers (last_contacted);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_saved_carriers_updated_at_trigger ON saved_carriers;
CREATE TRIGGER update_saved_carriers_updated_at_trigger
    BEFORE UPDATE ON saved_carriers
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_carriers_updated_at();

-- Add some predefined tags as comments for reference
-- Common tags might include: 'preferred', 'high-risk', 'new', 'reliable', 'problematic', 'verified'