/**
 * Test script for Clay webhook integration
 * Run with: npx tsx scripts/test-clay-push.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const CLAY_WEBHOOK_URL = process.env.CLAY_WEBHOOK_URL!
const CLAY_API_KEY = process.env.CLAY_API_KEY!

async function testClayPush() {
  console.log('🧪 Testing Clay webhook integration...\n')
  
  console.log('Configuration:')
  console.log(`  Webhook URL: ${CLAY_WEBHOOK_URL}`)
  console.log(`  API Key: ${CLAY_API_KEY ? CLAY_API_KEY.substring(0, 8) + '...' : 'Missing'}\n`)

  if (!CLAY_WEBHOOK_URL || !CLAY_API_KEY) {
    console.error('❌ Missing configuration. Check .env.local')
    process.exit(1)
  }

  const testCompany = {
    company_name: 'TEST - Waldo Integration Test',
    website: 'https://example.com/test-' + Date.now()
  }

  console.log('Test payload:', JSON.stringify(testCompany, null, 2), '\n')

  // Clay webhook sources typically don't need auth - the URL itself is the secret
  // But let's try multiple approaches
  const attempts = [
    { name: 'x-clay-webhook-auth', headers: { 'Content-Type': 'application/json', 'x-clay-webhook-auth': CLAY_API_KEY } },
  ]

  for (const attempt of attempts) {
    console.log(`\n--- Attempt: ${attempt.name} ---`)
    
    try {
      const response = await fetch(CLAY_WEBHOOK_URL, {
        method: 'POST',
        headers: attempt.headers as HeadersInit,
        body: JSON.stringify(testCompany),
      })

      const responseText = await response.text()
      console.log(`Status: ${response.status}`)
      console.log(`Response: ${responseText.substring(0, 300)}`)

      if (response.ok) {
        console.log(`\n✅ SUCCESS with "${attempt.name}"!`)
        console.log('Check your Clay table for the test row.')
        process.exit(0)
      }
    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : error}`)
    }
  }

  console.log('\n❌ All attempts failed. The webhook URL or API key may be incorrect.')
  console.log('\nTroubleshooting:')
  console.log('1. In Clay, verify the webhook URL is correct (HTTP API source)')
  console.log('2. Check if the API key is correct (Clay Settings → API)')
  console.log('3. Make sure the webhook source is enabled/active')
}

testClayPush()
