# Carrier Filtering Implementation

## Problem Statement

The SAFER website contains different entity types (carriers, brokers, freight forwarders, etc.), but the CarrierTracker app is specifically designed for brokers to find and analyze motor carriers. When non-carrier entities (like brokers) were imported, they were messing up the analytics and dashboard features that are carrier-specific.

## Solution Overview

Implemented comprehensive filtering to ensure the app only works with motor carriers, excluding brokers and other non-carrier entities from:
- Data import/scraping
- Search results
- Dashboard analytics
- Admin data quality monitoring

## Changes Made

### 1. Database Schema Updates

**Migration File**: `supabase/migrations/20250630030000_add_entity_type_filtering.sql`

- Added `entity_type` column to carriers table
- Created index for efficient filtering
- Created `is_carrier_entity()` function to determine if an entity is a carrier
- Created `carriers_only` view for filtered queries
- Created `get_carrier_count()` function for accurate carrier counts

### 2. Shared Utility Functions

**File**: `src/lib/carrier-filter.ts`

Created reusable utility functions:
- `isCarrierEntity()` - Checks if an entity is a carrier
- `getCarrierOnlyFilters()` - Returns Supabase query filters
- `filterCarriersOnly()` - Filters arrays of carrier data
- `getFilterReason()` - Provides human-readable filter reasons

### 3. SAFER Scraper Updates

**File**: `src/lib/safer-scraper.ts`

- Added carrier filtering during data import
- Non-carrier entities are logged and skipped
- Uses shared utility functions for consistency

### 4. Search Functionality Updates

**File**: `src/app/search/page.tsx`

- Added entity type filtering to search queries
- FMCSA lookup results are filtered for carriers only
- Users get notifications when non-carrier entities are found

### 5. Dashboard Updates

**File**: `src/app/dashboard/page.tsx`

- Updated queries to exclude non-carrier entities
- Analytics now only include actual carriers
- Improved data quality for broker decision-making

### 6. Admin Data Quality Updates

**File**: `src/app/admin/data-quality/page.tsx`

- Admin dashboard now only shows carrier entities
- Data quality metrics are more accurate
- Focused on relevant entities for freight brokers

### 7. Scraper Discovery Updates

**File**: `src/app/api/scraper/discover/route.ts`

- Carrier discovery now filters out non-carrier entities
- Prevents importing brokers and freight forwarders
- Maintains data quality during bulk operations

## Filtering Logic

### Excluded Entity Types
- Brokers (all types)
- Freight forwarders
- Property brokers
- Passenger brokers
- Household goods brokers

### Included Entity Types
- Motor carriers
- Trucking companies
- Transportation companies
- Logistics companies
- Freight companies
- Corporations, LLCs, Incs with carrier operations

### Additional Checks
- Operation classification (general freight, specialized, etc.)
- Carrier operation type (authorized, for hire, private)
- Legacy data (assumed to be carriers if entity_type is null)

## Benefits

1. **Improved Data Quality**: Only relevant motor carriers are included
2. **Better Analytics**: Dashboard metrics reflect actual carrier data
3. **Focused Search**: Users only see carriers, not brokers
4. **Accurate Risk Assessment**: Safety ratings and compliance data are carrier-specific
5. **Better User Experience**: Brokers can focus on finding carriers, not other brokers

## Migration Instructions

To apply the database changes:

```bash
# Option 1: Use the migration script
node scripts/apply-entity-type-migration.js

# Option 2: Apply manually via Supabase dashboard
# Run the SQL from supabase/migrations/20250630030000_add_entity_type_filtering.sql
```

## Testing

After implementation, verify:

1. **Search**: Search for known broker DOT numbers - should be filtered out
2. **Dashboard**: Analytics should only show carrier data
3. **Import**: New scraped data should exclude non-carriers
4. **Admin**: Data quality dashboard should only show carriers

## Future Enhancements

1. **Entity Type Display**: Show entity type in carrier details
2. **Filter Options**: Allow users to see excluded entities if needed
3. **Broker Directory**: Separate section for broker information
4. **Enhanced Filtering**: More sophisticated entity type detection

## Notes

- Legacy data without entity_type is assumed to be carriers
- The filtering is conservative to avoid excluding valid carriers
- All existing functionality remains intact for actual carriers
- Performance impact is minimal due to database indexing 