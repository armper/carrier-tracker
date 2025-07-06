# Supabase API Guide

## Database Functions

### User Management Functions

#### `handle_new_user()`
Automatically creates user profile when a new user signs up.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'other')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_user_carrier_profile(user_id)`
Returns comprehensive user profile with carrier statistics.
```sql
SELECT * FROM get_user_carrier_profile('user-uuid-here');
```

#### `get_user_reputation(user_id)`
Returns user's reputation score based on contributions.
```sql
SELECT * FROM get_user_reputation('user-uuid-here');
```

### Carrier Management Functions

#### `get_carrier_count()`
Returns total number of carriers in the system.
```sql
SELECT get_carrier_count();
```

#### `get_carrier_ratings(carrier_id)`
Returns aggregated ratings for a carrier.
```sql
SELECT * FROM get_carrier_ratings('carrier-uuid-here');
```

#### `get_carrier_rating_summary(carrier_id)`
Returns summary statistics for carrier ratings.
```sql
SELECT * FROM get_carrier_rating_summary('carrier-uuid-here');
```

#### `get_safety_rating_history(carrier_id)`
Returns historical safety rating changes for a carrier.
```sql
SELECT * FROM get_safety_rating_history('carrier-uuid-here');
```

#### `get_recent_safety_rating_changes(days)`
Returns recent safety rating changes across all carriers.
```sql
SELECT * FROM get_recent_safety_rating_changes(30);
```

### Insurance Functions

#### `submit_insurance_info(carrier_id, insurance_data)`
Submits crowdsourced insurance information for a carrier.
```sql
SELECT submit_insurance_info(
  'carrier-uuid',
  jsonb_build_object(
    'insurance_provider', 'Progressive',
    'policy_number', 'POL123456',
    'coverage_amount', 1000000,
    'effective_date', '2024-01-01',
    'expiration_date', '2024-12-31'
  )
);
```

#### `get_carrier_insurance_status(carrier_id)`
Returns current insurance status for a carrier.
```sql
SELECT * FROM get_carrier_insurance_status('carrier-uuid-here');
```

#### `get_carrier_insurance_with_votes(carrier_id)`
Returns insurance information with voting data.
```sql
SELECT * FROM get_carrier_insurance_with_votes('carrier-uuid-here');
```

#### `vote_insurance_info(insurance_id, vote_type)`
Votes on insurance information accuracy.
```sql
SELECT vote_insurance_info('insurance-uuid', 'upvote');
```

#### `get_expiring_insurance(days_ahead)`
Returns carriers with insurance expiring soon.
```sql
SELECT * FROM get_expiring_insurance(30);
```

### Rating & Review Functions

#### `submit_carrier_rating(carrier_id, rating_data)`
Submits a rating for a carrier.
```sql
SELECT submit_carrier_rating(
  'carrier-uuid',
  jsonb_build_object(
    'overall_rating', 4,
    'payment_rating', 5,
    'communication_rating', 3,
    'review_text', 'Great to work with'
  )
);
```

#### `get_carrier_rate_average(carrier_id)`
Returns average rates for a carrier.
```sql
SELECT * FROM get_carrier_rate_average('carrier-uuid-here');
```

#### `submit_carrier_rate(carrier_id, rate_data)`
Submits rate information for a carrier.
```sql
SELECT submit_carrier_rate(
  'carrier-uuid',
  jsonb_build_object(
    'rate_per_mile', 2.50,
    'route_from', 'Chicago, IL',
    'route_to', 'Atlanta, GA',
    'load_type', 'Dry Van'
  )
);
```

### Suggestion System Functions

#### `generate_user_suggestions(user_id)`
Generates personalized suggestions for a user based on their saved carriers.
```sql
SELECT generate_user_suggestions('user-uuid-here');
```

#### `find_better_alternatives(user_id, limit)`
Finds carriers with better safety ratings in user's coverage areas.
```sql
SELECT * FROM find_better_alternatives('user-uuid-here', 5);
```

#### `find_coverage_gaps(user_id, limit)`
Identifies geographic areas where user could expand coverage.
```sql
SELECT * FROM find_coverage_gaps('user-uuid-here', 3);
```

#### `find_new_opportunities(user_id, limit)`
Finds recently added carriers in user's areas of interest.
```sql
SELECT * FROM find_new_opportunities('user-uuid-here', 2);
```

### Data Quality Functions

#### `calculate_data_quality_score(carrier_id)`
Calculates data quality score for a carrier.
```sql
SELECT calculate_data_quality_score('carrier-uuid-here');
```

#### `identify_carriers_needing_verification()`
Returns carriers that need data verification.
```sql
SELECT * FROM identify_carriers_needing_verification();
```

## Next.js API Routes

### Admin Routes

#### `POST /api/admin/carriers`
Create or update carrier data (admin only).
```typescript
// Request
{
  "dot_number": "123456",
  "legal_name": "ABC Transport",
  "safety_rating": "Satisfactory"
}

// Response
{
  "success": true,
  "carrier_id": "uuid"
}
```

#### `GET /api/admin/users`
Get all users (admin only).
```typescript
// Response
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "user_type": "broker",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/admin/reports`
Get system reports (admin only).
```typescript
// Response
{
  "total_carriers": 15000,
  "total_users": 500,
  "active_users": 250,
  "data_quality_score": 85
}
```

### Carrier Routes

#### `GET /api/carriers/lookup?dot_number=123456`
Lookup carrier by DOT number.
```typescript
// Response
{
  "carrier": {
    "id": "uuid",
    "dot_number": "123456",
    "legal_name": "ABC Transport",
    "safety_rating": "Satisfactory",
    "insurance_status": "Active"
  }
}
```

### Insurance Routes

#### `POST /api/insurance/alerts`
Create insurance alert.
```typescript
// Request
{
  "carrier_id": "uuid",
  "alert_type": "expiring_soon",
  "days_ahead": 30
}

// Response
{
  "alert_id": "uuid",
  "created": true
}
```

#### `GET /api/insurance/risk-score/[carrier_id]`
Get insurance risk score for carrier.
```typescript
// Response
{
  "carrier_id": "uuid",
  "risk_score": 75,
  "factors": [
    "No recent insurance updates",
    "Low verification confidence"
  ]
}
```

### Safety Rating Routes

#### `GET /api/safety-rating/changes`
Get recent safety rating changes.
```typescript
// Response
{
  "changes": [
    {
      "carrier_id": "uuid",
      "dot_number": "123456",
      "old_rating": "Satisfactory",
      "new_rating": "Conditional",
      "change_date": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `GET /api/safety-rating/history/[carrier_id]`
Get safety rating history for specific carrier.
```typescript
// Response
{
  "history": [
    {
      "rating": "Satisfactory",
      "date": "2024-01-01T00:00:00Z",
      "stability_score": 85
    }
  ]
}
```

### Suggestion Routes

#### `GET /api/suggestions/[user_id]`
Get user's active suggestions.
```typescript
// Response
{
  "suggestions": [
    {
      "id": "uuid",
      "type": "better_alternatives",
      "title": "Upgrade Your Carrier Portfolio",
      "description": "Found 3 carriers with better safety ratings",
      "carrier_ids": ["uuid1", "uuid2", "uuid3"],
      "priority": 90
    }
  ]
}
```

#### `POST /api/suggestions/[user_id]/generate`
Generate new suggestions for user.
```typescript
// Response
{
  "generated": true,
  "suggestions_count": 2
}
```

## REST API Usage

### Authentication
All API requests require authentication via Supabase Auth:
```typescript
const supabase = createClient()
const { data, error } = await supabase.auth.getSession()
const token = data.session?.access_token

// Include in API requests
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### Direct Database Access
Using Supabase client for direct table access:
```typescript
// Get carriers
const { data: carriers, error } = await supabase
  .from('carriers')
  .select('*')
  .eq('state', 'CA')
  .order('legal_name')

// Save carrier
const { data, error } = await supabase
  .from('saved_carriers')
  .insert([
    {
      user_id: user.id,
      carrier_id: carrierId,
      notes: 'Great rates on west coast routes'
    }
  ])

// Get user's saved carriers with carrier details
const { data: savedCarriers, error } = await supabase
  .from('saved_carriers')
  .select(`
    *,
    carriers (
      dot_number,
      legal_name,
      safety_rating,
      insurance_status
    )
  `)
  .eq('user_id', user.id)
```

### Real-time Subscriptions
Subscribe to database changes:
```typescript
const subscription = supabase
  .channel('saved_carriers')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'saved_carriers',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      console.log('Saved carriers updated:', payload)
    }
  )
  .subscribe()
```

## Error Handling

### Database Function Errors
```typescript
try {
  const { data, error } = await supabase.rpc('generate_user_suggestions', {
    p_user_id: user.id
  })
  
  if (error) {
    console.error('Function error:', error.message)
  }
} catch (err) {
  console.error('Network error:', err)
}
```

### API Route Errors
```typescript
const response = await fetch('/api/carriers/lookup', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})

if (!response.ok) {
  const error = await response.json()
  console.error('API Error:', error.message)
}
```

## Rate Limiting

### API Rate Limits
- 100 requests per minute per user
- 1000 requests per hour per IP
- Admin endpoints: 500 requests per hour

### Database Connection Limits
- Maximum 60 connections per project
- Connection pooling enabled
- 15-second connection timeout

## Performance Optimization

### Database Indexes
Key indexes for common queries:
- `carriers(dot_number)` - Unique lookups
- `carriers(state, city)` - Geographic searches
- `saved_carriers(user_id, carrier_id)` - User data
- `safety_rating_history(carrier_id, change_date)` - Historical data

### Query Optimization
- Use `select()` to limit returned columns
- Apply filters early with `eq()`, `gt()`, etc.
- Use `limit()` for pagination
- Prefer single queries over multiple requests