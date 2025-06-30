import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySafetyRatingMigration() {
  console.log('🚀 Applying safety rating history migration...')
  
  try {
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('safety_rating_history')
      .select('id')
      .limit(1)
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log('📋 safety_rating_history table does not exist, creating...')
      
      // Since we can't create tables directly via the client, we'll need to use the SQL editor
      console.log('⚠️  Table creation requires manual SQL execution')
      console.log('📋 Please run the following SQL in your Supabase SQL Editor:')
      console.log(`
CREATE TABLE IF NOT EXISTS public.safety_rating_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  carrier_id UUID REFERENCES public.carriers(id) ON DELETE CASCADE NOT NULL,
  old_rating VARCHAR(50),
  new_rating VARCHAR(50) NOT NULL,
  change_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data_source VARCHAR(50) DEFAULT 'fmcsa' NOT NULL,
  change_reason VARCHAR(100),
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  confidence_score INTEGER DEFAULT 100 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

ALTER TABLE public.carriers 
ADD COLUMN IF NOT EXISTS safety_rating_last_changed TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS safety_rating_stability_score INTEGER DEFAULT 100 CHECK (safety_rating_stability_score >= 0 AND safety_rating_stability_score <= 100),
ADD COLUMN IF NOT EXISTS safety_rating_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS safety_rating_trend VARCHAR(20) DEFAULT 'stable';

CREATE INDEX IF NOT EXISTS idx_safety_rating_history_carrier_id ON public.safety_rating_history(carrier_id);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_change_date ON public.safety_rating_history(change_date DESC);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_new_rating ON public.safety_rating_history(new_rating);
CREATE INDEX IF NOT EXISTS idx_safety_rating_history_data_source ON public.safety_rating_history(data_source);
CREATE INDEX IF NOT EXISTS idx_carriers_safety_rating_last_changed ON public.carriers(safety_rating_last_changed) WHERE safety_rating_last_changed IS NOT NULL;

ALTER TABLE public.safety_rating_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety history for their saved carriers" ON public.safety_rating_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.saved_carriers sc
      WHERE sc.carrier_id = safety_rating_history.carrier_id
      AND sc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can manage safety rating history" ON public.safety_rating_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
      `)
      
      return
    } else if (checkError) {
      console.error('❌ Error checking table:', checkError)
      return
    } else {
      console.log('✅ safety_rating_history table already exists')
    }
    
    // Check if the functions exist
    console.log('🔍 Checking if functions exist...')
    
    // Try to call the function to see if it exists
    const { data: testHistory, error: historyError } = await supabase
      .rpc('get_safety_rating_history', { carrier_uuid: '00000000-0000-0000-0000-000000000000', months_back: 1 })
    
    if (historyError && historyError.code === 'PGRST202') {
      console.log('⚠️  Functions do not exist, please run the following SQL in your Supabase SQL Editor:')
      console.log(`
CREATE OR REPLACE FUNCTION get_safety_rating_history(carrier_uuid UUID, months_back INTEGER DEFAULT 24)
RETURNS TABLE (
  id UUID,
  old_rating VARCHAR,
  new_rating VARCHAR,
  change_date TIMESTAMP WITH TIME ZONE,
  data_source VARCHAR,
  change_reason VARCHAR,
  months_ago NUMERIC,
  rating_numeric INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.old_rating,
    h.new_rating,
    h.change_date,
    h.data_source,
    h.change_reason,
    EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - h.change_date)) / (30 * 24 * 3600) as months_ago,
    CASE h.new_rating
      WHEN 'satisfactory' THEN 3
      WHEN 'conditional' THEN 2
      WHEN 'unsatisfactory' THEN 1
      ELSE 0
    END as rating_numeric
  FROM public.safety_rating_history h
  WHERE h.carrier_id = carrier_uuid
    AND h.change_date >= (timezone('utc'::text, now()) - INTERVAL '1 month' * months_back)
  ORDER BY h.change_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_safety_rating_risk_score(carrier_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  current_rating VARCHAR;
  stability_score INTEGER;
  trend VARCHAR;
  change_count INTEGER;
  last_change_months NUMERIC;
  risk_score INTEGER := 100;
BEGIN
  SELECT 
    safety_rating,
    safety_rating_stability_score,
    safety_rating_trend,
    safety_rating_change_count,
    EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - safety_rating_last_changed)) / (30 * 24 * 3600)
  INTO current_rating, stability_score, trend, change_count, last_change_months
  FROM public.carriers 
  WHERE id = carrier_uuid;
  
  CASE current_rating
    WHEN 'satisfactory' THEN risk_score := 100;
    WHEN 'conditional' THEN risk_score := 60;
    WHEN 'unsatisfactory' THEN risk_score := 20;
    WHEN 'not-rated' THEN risk_score := 80;
    ELSE risk_score := 50;
  END CASE;
  
  IF stability_score IS NOT NULL THEN
    risk_score := (risk_score + stability_score) / 2;
  END IF;
  
  CASE trend
    WHEN 'improving' THEN risk_score := LEAST(100, risk_score + 10);
    WHEN 'declining' THEN risk_score := GREATEST(0, risk_score - 20);
    WHEN 'volatile' THEN risk_score := GREATEST(0, risk_score - 15);
    ELSE NULL;
  END CASE;
  
  IF change_count IS NOT NULL AND change_count > 3 THEN
    risk_score := GREATEST(0, risk_score - (change_count * 5));
  END IF;
  
  IF last_change_months IS NOT NULL AND last_change_months > 24 THEN
    risk_score := LEAST(100, risk_score + 10);
  END IF;
  
  RETURN GREATEST(0, LEAST(100, risk_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
      `)
      return
    } else {
      console.log('✅ Functions already exist')
    }
    
    // Create initial history records for existing carriers
    console.log('📋 Creating initial history records...')
    const { data: carriers } = await supabase
      .from('carriers')
      .select('id, safety_rating, updated_at, created_at, data_source')
      .not('safety_rating', 'is', null)
      .neq('safety_rating', '')
    
    if (carriers && carriers.length > 0) {
      for (const carrier of carriers) {
        // Check if history record already exists
        const { data: existingHistory } = await supabase
          .from('safety_rating_history')
          .select('id')
          .eq('carrier_id', carrier.id)
          .limit(1)
        
        if (!existingHistory || existingHistory.length === 0) {
          const { error: insertError } = await supabase
            .from('safety_rating_history')
            .insert({
              carrier_id: carrier.id,
              old_rating: null,
              new_rating: carrier.safety_rating,
              change_date: carrier.updated_at || carrier.created_at || new Date().toISOString(),
              data_source: carrier.data_source || 'unknown',
              change_reason: 'initial_record'
            })
          
          if (insertError) {
            console.error(`❌ Error creating history for carrier ${carrier.id}:`, insertError)
          } else {
            console.log(`✅ Created history for carrier ${carrier.id}`)
          }
        }
      }
    }
    
    console.log('🎉 Safety rating history migration completed successfully!')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  }
}

applySafetyRatingMigration() 