const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function checkCarriersTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Check carriers table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'carriers' 
      ORDER BY ordinal_position;
    `)

    console.log('\n📋 Carriers table structure:')
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`)
    })

    // Check for any constraints
    const constraints = await client.query(`
      SELECT tc.constraint_name, tc.constraint_type, ccu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = 'carriers';
    `)

    console.log('\n🔒 Constraints:')
    constraints.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.constraint_type} on ${row.column_name}`)
    })

  } catch (error) {
    console.error('💥 Error:', error.message)
  } finally {
    await client.end()
  }
}

checkCarriersTable()