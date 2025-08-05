'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [results, setResults] = useState<Array<{
    test: string
    success: boolean
    data: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      const testResults = []

      // Test 1: Basic connectivity
      try {
        const { data, error } = await supabase.auth.getSession()
        testResults.push({
          test: 'Auth Session Check',
          success: !error,
          data: error ? error.message : `Connection successful (has session: ${!!data.session})`
        })
      } catch (err) {
        testResults.push({
          test: 'Auth Session Check',
          success: false,
          data: err instanceof Error ? err.message : 'Unknown error'
        })
      }

      // Test 2: Database connectivity (try to query a table)
      try {
        const { data, error } = await supabase.from('podcasts').select('count').limit(1)
        testResults.push({
          test: 'Database Query Test',
          success: !error,
          data: error ? error.message : `Database accessible (result: ${JSON.stringify(data)})`
        })
      } catch (err) {
        testResults.push({
          test: 'Database Query Test',
          success: false,
          data: err instanceof Error ? err.message : 'Unknown error'
        })
      }

      // Test 3: Try a simple signup to see the exact error
      try {
        const testEmail = `test-${Date.now()}@example.com`
        const { data, error } = await supabase.auth.signUp({
          email: testEmail,
          password: 'TestPassword123!',
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        testResults.push({
          test: 'Test Signup',
          success: !error,
          data: error ? `${error.message} (Status: ${error.status}) - Full error: ${JSON.stringify(error)}` : `Signup successful (user: ${!!data.user}, session: ${!!data.session})`
        })
      } catch (err) {
        testResults.push({
          test: 'Test Signup',
          success: false,
          data: err instanceof Error ? err.message : 'Unknown error'
        })
      }

      setResults(testResults)
      setLoading(false)
    }

    runTests()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Connection Test</h1>
          <p>Running tests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Connection Test</h1>
        
        <div className="space-y-4">
          {results.map((result, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}
            >
              <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.test}: {result.success ? '✓ PASS' : '✗ FAIL'}
              </h3>
              <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.data}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Rerun Tests
          </button>
        </div>
      </div>
    </div>
  )
}