const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...')
    
    // Check if carriers table exists and has data
    const { data: carriers, error } = await supabase
      .from('carriers')
      .select('*')
      .limit(5)
    
    if (error) {
      console.log('❌ Error querying carriers table:', error.message)
      console.log('💡 The carriers table probably doesn\'t exist yet')
      return false
    }
    
    console.log(`✅ Carriers table exists with ${carriers?.length || 0} records`)
    if (carriers && carriers.length > 0) {
      console.log('📋 Sample carriers:')
      carriers.forEach(c => console.log(`  - DOT ${c.dot_number}: ${c.legal_name}`))
    }
    
    return carriers && carriers.length > 0
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
    return false
  }
}

checkDatabase().then(hasData => {
  if (!hasData) {
    console.log('\n🚨 Database needs setup!')
    console.log('📝 Copy this SQL to your Supabase SQL Editor:')
    console.log('   supabase/setup-quick.sql')
  }
})