/**
 * Test Transcription Script
 * 
 * This script helps you test the transcription API.
 * Run it with: npx tsx scripts/test-transcription.ts
 * 
 * You'll need to install tsx: npm install -D tsx
 */

interface TestConfig {
  baseUrl: string
  episodeId: string
  // For authenticated requests, you'd need to pass auth headers
}

const config: TestConfig = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  episodeId: process.env.TEST_EPISODE_ID || 'your-episode-id-here',
}

async function testTranscriptionStatus() {
  console.log('🔍 Testing transcription status endpoint...\n')
  
  try {
    const response = await fetch(`${config.baseUrl}/api/episodes/${config.episodeId}/transcribe`)
    const data = await response.json()
    
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    console.log('✅ Status check successful\n')
    
    return data
  } catch (error) {
    console.error('❌ Status check failed:', error)
    throw error
  }
}

async function testStartTranscription() {
  console.log('🎙️  Testing transcription start endpoint...\n')
  
  try {
    const response = await fetch(`${config.baseUrl}/api/episodes/${config.episodeId}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('✅ Transcription started successfully\n')
      
      if (data.transcript) {
        console.log('📝 Transcript preview:')
        console.log(data.transcript.substring(0, 200) + '...\n')
      }
    } else {
      console.log('❌ Transcription request failed\n')
    }
    
    return data
  } catch (error) {
    console.error('❌ Transcription start failed:', error)
    throw error
  }
}

async function pollTranscriptionStatus(maxAttempts = 10, interval = 5000) {
  console.log('⏳ Polling transcription status...\n')
  
  for (let i = 0; i < maxAttempts; i++) {
    const status = await testTranscriptionStatus()
    
    console.log(`Attempt ${i + 1}/${maxAttempts}: ${status.status}`)
    
    if (status.status === 'completed') {
      console.log('✅ Transcription completed!\n')
      return status
    }
    
    if (status.status === 'failed') {
      console.error('❌ Transcription failed:', status.error)
      return status
    }
    
    if (i < maxAttempts - 1) {
      console.log(`Waiting ${interval / 1000} seconds...\n`)
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  
  console.log('⏰ Max polling attempts reached\n')
  return null
}

async function runTests() {
  console.log('🚀 Starting Transcription API Tests\n')
  console.log('Configuration:')
  console.log(`- Base URL: ${config.baseUrl}`)
  console.log(`- Episode ID: ${config.episodeId}\n`)
  console.log('=' .repeat(60) + '\n')
  
  if (config.episodeId === 'your-episode-id-here') {
    console.error('❌ Error: Please set TEST_EPISODE_ID environment variable')
    console.log('\nUsage:')
    console.log('TEST_EPISODE_ID=abc-123 npx tsx scripts/test-transcription.ts\n')
    process.exit(1)
  }
  
  try {
    // Test 1: Check current status
    console.log('Test 1: Check Transcription Status')
    console.log('-'.repeat(60))
    const initialStatus = await testTranscriptionStatus()
    
    // Test 2: Start transcription (if not already in progress or completed)
    if (initialStatus.status === 'not_started' || initialStatus.status === 'failed') {
      console.log('\nTest 2: Start Transcription')
      console.log('-'.repeat(60))
      await testStartTranscription()
      
      // Test 3: Poll for completion
      console.log('\nTest 3: Poll Until Complete')
      console.log('-'.repeat(60))
      await pollTranscriptionStatus()
    } else if (initialStatus.status === 'completed') {
      console.log('✅ Episode already transcribed!')
      
      if (initialStatus.hasTranscript) {
        console.log('📝 Transcript is available\n')
      }
    } else if (initialStatus.status === 'in_progress') {
      console.log('⏳ Transcription already in progress')
      
      console.log('\nTest 3: Poll Until Complete')
      console.log('-'.repeat(60))
      await pollTranscriptionStatus()
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests completed successfully!\n')
    
  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ Tests failed with error:', error)
    console.error('='.repeat(60) + '\n')
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
}

export { testTranscriptionStatus, testStartTranscription, pollTranscriptionStatus }

