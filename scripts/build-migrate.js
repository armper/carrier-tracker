#!/usr/bin/env node

/**
 * Build-time migration script
 * Runs automatically during Vercel deployment
 */

const https = require('https')
require('dotenv').config({ path: '.env.local' })

async function runBuildMigration() {
  console.log('🚀 Running build-time database migration...')
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'vercel.app') || 'http://localhost:3000'
  
  const migrationUrl = `${baseUrl}/api/migrate`
  const authToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!authToken) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found, skipping build-time migration')
    console.log('🔧 Add environment variables to Vercel or run migration manually')
    console.log('   Vercel Dashboard → Project Settings → Environment Variables')
    process.exit(0)
  }
  
  try {
    console.log(`📡 Calling migration endpoint: ${migrationUrl}`)
    
    const success = await callMigrationAPI(migrationUrl, authToken)
    
    if (success) {
      console.log('✅ Build-time migration completed successfully')
      process.exit(0)
    } else {
      console.log('⚠️  Build-time migration failed, but continuing build...')
      // Don't fail the build, just warn
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Build migration error:', error.message)
    // Don't fail the build for migration issues
    console.log('⚠️  Continuing build despite migration failure...')
    process.exit(0)
  }
}

function callMigrationAPI(url, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          console.log('Migration response:', response)
          resolve(response.success)
        } catch (error) {
          console.log('Could not parse migration response:', data)
          resolve(false)
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('Migration request timeout'))
    })
    
    req.end()
  })
}

// Only run if called directly
if (require.main === module) {
  runBuildMigration()
}

module.exports = { runBuildMigration }