'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DebugInfo {
  url?: string
  hash?: string
  search?: string
  session?: {
    user_id: string
    email?: string
    email_confirmed_at?: string
    expires_at?: number
  } | null
  sessionError?: string
  user?: {
    id: string
    email?: string
    email_confirmed_at?: string
    created_at: string
  } | null
  userError?: string
  supabaseUrl?: string
  timestamp: string
  error?: string
}

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        setDebugInfo({
          url: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          session: sessionData.session ? {
            user_id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            email_confirmed_at: sessionData.session.user.email_confirmed_at,
            expires_at: sessionData.session.expires_at
          } : null,
          sessionError: sessionError?.message,
          user: userData.user ? {
            id: userData.user.id,
            email: userData.user.email,
            email_confirmed_at: userData.user.email_confirmed_at,
            created_at: userData.user.created_at
          } : null,
          userError: userError?.message,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Auth Debug Info</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-8 space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Go to Login
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}