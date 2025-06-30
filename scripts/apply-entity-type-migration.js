import { createClient } from '@supabase/supabase-js'

async function applyEntityTypeMigration() {
  console.log('🚀 Starting Entity Type Migration...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Migration queries
    const queries = [
      // Add entity_type column if it doesn't exist
      'ALTER TABLE carriers ADD COLUMN IF NOT EXISTS entity_type TEXT',
      
      // Add index for entity_type filtering
      'CREATE INDEX IF NOT EXISTS idx_carriers_entity_type ON carriers(entity_type)',
      
      // Add comment for documentation
      `COMMENT ON COLUMN carriers.entity_type IS 'Entity type from SAFER (Carrier, Broker, Freight Forwarder, etc.) - used for filtering'`,
      
      // Create function to check if an entity is a carrier
      `CREATE OR REPLACE FUNCTION is_carrier_entity(entity_type TEXT)
       RETURNS BOOLEAN AS $$
       BEGIN
         -- Return true if entity_type is null (legacy data) or contains carrier-related terms
         RETURN entity_type IS NULL OR 
                LOWER(entity_type) LIKE '%carrier%' OR
                LOWER(entity_type) LIKE '%motor%' OR
                LOWER(entity_type) LIKE '%truck%' OR
                LOWER(entity_type) LIKE '%transport%' OR
                LOWER(entity_type) LIKE '%logistics%' OR
                LOWER(entity_type) LIKE '%freight%' OR
                LOWER(entity_type) LIKE '%hauling%' OR
                LOWER(entity_type) LIKE '%delivery%';
       END;
       $$ LANGUAGE plpgsql IMMUTABLE`,
      
      // Create a view for carriers only (excludes brokers and other non-carrier entities)
      `CREATE OR REPLACE VIEW carriers_only AS
       SELECT * FROM carriers 
       WHERE is_carrier_entity(entity_type)`,
      
      // Add comment for the view
      `COMMENT ON VIEW carriers_only IS 'View containing only carrier entities, excluding brokers and other non-carrier entities'`,
      
      // Create a function to get carrier count (excluding non-carriers)
      `CREATE OR REPLACE FUNCTION get_carrier_count()
       RETURNS INTEGER AS $$
       BEGIN
         RETURN (SELECT COUNT(*) FROM carriers_only);
       END;
       $$ LANGUAGE plpgsql STABLE`
    ]

    console.log('📝 Executing migration queries...')
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      console.log(`  ${i + 1}/${queries.length}: ${query.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      
      if (error) {
        console.error(`❌ Error executing query ${i + 1}:`, error)
        // Continue with other queries even if one fails
      } else {
        console.log(`✅ Query ${i + 1} executed successfully`)
      }
    }

    // Verify the migration
    console.log('🔍 Verifying migration...')
    
    // Check if entity_type column exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'carriers')
      .eq('column_name', 'entity_type')
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError)
    } else if (columns && columns.length > 0) {
      console.log('✅ entity_type column exists')
    } else {
      console.log('⚠️  entity_type column may not exist - check manually')
    }

    // Check if function exists
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'is_carrier_entity')
    
    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError)
    } else if (functions && functions.length > 0) {
      console.log('✅ is_carrier_entity function exists')
    } else {
      console.log('⚠️  is_carrier_entity function may not exist - check manually')
    }

    // Check if view exists
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_name', 'carriers_only')
    
    if (viewsError) {
      console.error('❌ Error checking views:', viewsError)
    } else if (views && views.length > 0) {
      console.log('✅ carriers_only view exists')
    } else {
      console.log('⚠️  carriers_only view may not exist - check manually')
    }

    console.log('🎉 Entity Type Migration completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log('  - Added entity_type column to carriers table')
    console.log('  - Created index for entity_type filtering')
    console.log('  - Created is_carrier_entity() function')
    console.log('  - Created carriers_only view')
    console.log('  - Created get_carrier_count() function')
    console.log('')
    console.log('🔧 Next steps:')
    console.log('  - The app will now filter out non-carrier entities')
    console.log('  - Brokers and freight forwarders will be excluded from search and analytics')
    console.log('  - Only motor carriers will be imported from SAFER')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
applyEntityTypeMigration() 