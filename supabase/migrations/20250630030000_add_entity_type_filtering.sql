-- Add entity_type field to carriers table for filtering non-carrier entities
-- This migration adds the entity_type field and creates filtering logic

-- Add entity_type column if it doesn't exist
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- Add index for entity_type filtering
CREATE INDEX IF NOT EXISTS idx_carriers_entity_type ON carriers(entity_type);

-- Add comment for documentation
COMMENT ON COLUMN carriers.entity_type IS 'Entity type from SAFER (Carrier, Broker, Freight Forwarder, etc.) - used for filtering';

-- Create a function to check if an entity is a carrier
CREATE OR REPLACE FUNCTION is_carrier_entity(entity_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if entity_type is null (legacy data)
  IF entity_type IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Handle multi-entity cases like "CARRIER/SHIPPER/BROKER"
  -- If "carrier" appears first in the entity type, it's primarily a carrier
  IF entity_type LIKE '%/%' THEN
    IF LOWER(SPLIT_PART(entity_type, '/', 1)) = 'carrier' THEN
      RETURN TRUE;
    END IF;
    -- If broker appears first, exclude it
    IF LOWER(SPLIT_PART(entity_type, '/', 1)) = 'broker' THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Explicitly exclude broker-only entities
  IF LOWER(entity_type) = 'broker' OR 
     LOWER(entity_type) = 'freight forwarder' OR
     LOWER(entity_type) = 'property broker' OR
     LOWER(entity_type) = 'household goods broker' OR
     LOWER(entity_type) = 'passenger broker' THEN
    RETURN FALSE;
  END IF;
  
  -- Include carrier-related entities
  RETURN LOWER(entity_type) LIKE '%carrier%' OR
         LOWER(entity_type) LIKE '%motor%' OR
         LOWER(entity_type) LIKE '%truck%' OR
         LOWER(entity_type) LIKE '%transport%' OR
         LOWER(entity_type) LIKE '%logistics%' OR
         LOWER(entity_type) LIKE '%freight%' OR
         LOWER(entity_type) LIKE '%hauling%' OR
         LOWER(entity_type) LIKE '%delivery%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for carriers only (excludes brokers and other non-carrier entities)
CREATE OR REPLACE VIEW carriers_only AS
SELECT * FROM carriers 
WHERE is_carrier_entity(entity_type);

-- Add comment for the view
COMMENT ON VIEW carriers_only IS 'View containing only carrier entities, excluding brokers and other non-carrier entities';

-- Create a function to get carrier count (excluding non-carriers)
CREATE OR REPLACE FUNCTION get_carrier_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM carriers_only);
END;
$$ LANGUAGE plpgsql STABLE; 