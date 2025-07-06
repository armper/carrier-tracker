# Supabase Database Schema Documentation

## Project Configuration
- **Supabase Project ID**: `axmnmxwjijsigiueednz`
- **Database URL**: `postgres://postgres.axmnmxwjijsigiueednz:TM6AjlDrYQUENODF@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
- **Region**: US East 1
- **PostgreSQL Version**: 15+
- **Extensions**: uuid-ossp, pgcrypto, pgjwt

## Core Tables

### profiles
User account management table linked to Supabase Auth
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  role VARCHAR DEFAULT 'user',
  is_admin BOOLEAN DEFAULT FALSE,
  user_type VARCHAR DEFAULT 'other' CHECK (user_type IN ('driver', 'carrier', 'broker', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### carriers
Transportation carrier data with comprehensive FMCSA fields
```sql
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dot_number TEXT UNIQUE NOT NULL,
  legal_name TEXT NOT NULL,
  dba_name TEXT,
  mc_number TEXT,
  ein_number TEXT,
  mx_number TEXT,
  
  -- Contact Information
  physical_address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  business_hours TEXT,
  
  -- Safety & Compliance
  safety_rating TEXT,
  safety_rating_last_changed TIMESTAMPTZ,
  safety_rating_stability_score INTEGER DEFAULT 100 CHECK (safety_rating_stability_score >= 0 AND safety_rating_stability_score <= 100),
  safety_rating_change_count INTEGER DEFAULT 0,
  safety_rating_trend VARCHAR(20) DEFAULT 'stable',
  
  -- Insurance & Authority
  insurance_status TEXT,
  authority_status TEXT,
  cargo_insurance_amount INTEGER,
  financial_responsibility_status TEXT,
  
  -- Operations
  operating_status TEXT,
  entity_type TEXT,
  interstate_operation BOOLEAN,
  hazmat_flag BOOLEAN,
  pc_flag BOOLEAN,
  passenger_flag BOOLEAN,
  migrant_flag BOOLEAN,
  
  -- Fleet Information
  vehicle_count INTEGER,
  driver_count INTEGER,
  total_mileage INTEGER,
  fleet_age INTEGER,
  
  -- Safety Statistics
  crash_count INTEGER,
  fatal_crashes INTEGER,
  injury_crashes INTEGER,
  tow_away_crashes INTEGER,
  inspection_count INTEGER,
  inspection_violations INTEGER,
  out_of_service_orders INTEGER,
  out_of_service_rate INTEGER,
  driver_inspections INTEGER,
  vehicle_inspections INTEGER,
  
  -- Business Information
  years_in_business INTEGER,
  annual_revenue INTEGER,
  credit_score TEXT,
  
  -- Certifications
  drug_testing_program BOOLEAN,
  alcohol_testing_program BOOLEAN,
  hazmat_certification BOOLEAN,
  passenger_certification BOOLEAN,
  school_bus_certification BOOLEAN,
  
  -- Arrays
  carrier_operation TEXT[],
  operation_classification TEXT[],
  equipment_types TEXT[],
  service_areas TEXT[],
  
  -- Data Management
  data_source VARCHAR DEFAULT 'manual',
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP,
  trust_score INTEGER DEFAULT 50,
  data_quality_score INTEGER DEFAULT 50,
  needs_verification BOOLEAN DEFAULT FALSE,
  last_verified TIMESTAMPTZ,
  
  -- API Sync
  api_last_sync TIMESTAMPTZ,
  api_sync_status TEXT DEFAULT 'never',
  api_error_count INTEGER DEFAULT 0,
  
  -- Dates
  out_of_service_date TEXT,
  mcs_150_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### saved_carriers
User's saved/favorited carriers
```sql
CREATE TABLE saved_carriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, carrier_id)
);
```

### monitoring_alerts
User alert configurations for carrier changes
```sql
CREATE TABLE monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'safety_rating', 'insurance', 'authority', etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Insurance & Rating System

### carrier_insurance_info
Crowdsourced insurance information
```sql
CREATE TABLE carrier_insurance_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  insurance_provider TEXT,
  policy_number TEXT,
  effective_date DATE,
  expiration_date DATE,
  coverage_amount INTEGER,
  cargo_coverage_amount INTEGER,
  liability_coverage_amount INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  confidence_score INTEGER DEFAULT 50,
  source_type VARCHAR DEFAULT 'user' CHECK (source_type IN ('user', 'fmcsa', 'verified')),
  submitted_by UUID REFERENCES profiles(id),
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### carrier_ratings
User ratings and reviews for carriers
```sql
CREATE TABLE carrier_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  payment_rating INTEGER CHECK (payment_rating >= 1 AND payment_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  equipment_rating INTEGER CHECK (equipment_rating >= 1 AND equipment_rating <= 5),
  review_text TEXT,
  work_type TEXT,
  route_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(carrier_id, user_id)
);
```

### carrier_rate_submissions
Rate submissions for carriers
```sql
CREATE TABLE carrier_rate_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rate_per_mile DECIMAL(10,2),
  total_rate DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  route_from TEXT,
  route_to TEXT,
  distance_miles INTEGER,
  load_type TEXT,
  equipment_type TEXT,
  weight_lbs INTEGER,
  submission_date TIMESTAMPTZ DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## History & Tracking

### safety_rating_history
Historical safety rating changes
```sql
CREATE TABLE safety_rating_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  old_rating TEXT,
  new_rating TEXT,
  change_date TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  changed_by UUID REFERENCES profiles(id)
);
```

### user_suggestions
Smart suggestions for users
```sql
CREATE TABLE user_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  suggestion_type TEXT,
  suggestion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Administrative Tables

### data_quality_issues
Data quality tracking
```sql
CREATE TABLE data_quality_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  field_name TEXT,
  description TEXT,
  severity VARCHAR CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### api_sync_log
API synchronization logging
```sql
CREATE TABLE api_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  records_processed INTEGER,
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### profiles
- Users can view, update, and insert their own profile only
- Admins can view all profiles

### carriers
- All authenticated users can view carriers
- Only admins can modify carrier data

### saved_carriers, monitoring_alerts
- Users can only access their own saved carriers and alerts
- Full CRUD operations for own records only

### Insurance & Rating Tables
- Users can view all insurance info and ratings
- Users can only create/modify their own submissions
- Verification requires admin privileges

## Database Functions

### User Management
- `handle_new_user()` - Auto-creates profile on user signup
- `generate_user_suggestions(user_id)` - Generates personalized suggestions

### Insurance System
- `submit_insurance_info()` - Submits crowdsourced insurance data
- `vote_on_insurance_info()` - Voting system for insurance accuracy

### Data Quality
- `log_carrier_data_change()` - Logs carrier data changes
- `track_safety_rating_change()` - Tracks safety rating changes

## Indexes

Key indexes for performance:
- `carriers_dot_number_key` - Unique index on DOT number
- `idx_carriers_safety_rating` - Safety rating queries
- `idx_carriers_state` - State-based searches
- `idx_carriers_sync_status` - API sync management
- `idx_profiles_user_type` - User type filtering

## Environment Variables

Required for iOS integration:
```
SUPABASE_URL=https://axmnmxwjijsigiueednz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Authentication Flow

1. User signs up via Supabase Auth
2. `handle_new_user()` trigger creates profile automatically
3. User gets assigned default `user_type` of 'other'
4. RLS policies enforce data access based on user authentication
5. JWT tokens contain user ID for RLS policy enforcement

## API Endpoints

Core endpoints available via Supabase REST API:
- `POST /rest/v1/profiles` - User profile management
- `GET /rest/v1/carriers` - Carrier search and retrieval
- `POST /rest/v1/saved_carriers` - Save/unsave carriers
- `POST /rest/v1/monitoring_alerts` - Alert management
- `POST /rest/v1/carrier_ratings` - Submit ratings
- `POST /rest/v1/carrier_insurance_info` - Submit insurance data

## Real-time Features

Supabase Realtime enabled for:
- `saved_carriers` - Real-time updates to saved carriers
- `monitoring_alerts` - Real-time alert notifications
- `carrier_ratings` - Live rating updates
- `insurance_notifications` - Insurance change notifications