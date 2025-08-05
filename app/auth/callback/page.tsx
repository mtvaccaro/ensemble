'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started')
        console.log('Current URL:', window.location.href)
        console.log('Search params:', Object.fromEntries(searchParams.entries()))
        console.log('Hash:', window.location.hash)
        
        // Handle PKCE flow first (query params)
        const code = searchParams.get('code')
        const error_param = searchParams.get('error')
        const error_description = searchParams.get('error_description')
        
        if (error_param) {
          console.error('Auth error from URL:', error_param, error_description)
          setError(error_description || error_param)
          return
        }
        
        if (code) {
          console.log('PKCE code found, exchanging for session...')
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
            
            if (sessionError) {
              console.error('Code exchange error:', sessionError)
              setError(`Failed to complete verification: ${sessionError.message}`)
              return
            }
            
            if (sessionData.session) {
              console.log('PKCE session established successfully')
              router.push('/dashboard')
              return
            }
          } catch (exchangeError) {
            console.error('Code exchange failed:', exchangeError)
            // Continue to other auth methods
          }
        }
        
        // Handle hash-based tokens (legacy or specific configs)
        const hash = window.location.hash.substring(1)
        if (hash) {
          console.log('Hash found:', hash)
          const hashParams = new URLSearchParams(hash)
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')
          const type = hashParams.get('type')
          
          console.log('Hash params:', { access_token: !!access_token, refresh_token: !!refresh_token, type })
          
          if (access_token && refresh_token) {
            console.log('Setting session from hash tokens...')
            try {
              const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token
              })
              
              if (error) {
                console.error('Set session error:', error)
                setError(`Failed to verify email: ${error.message}`)
                return
              }
              
              if (data.session) {
                console.log('Hash session established successfully')
                router.push('/dashboard')
                return
              }
            } catch (setSessionError) {
              console.error('Set session failed:', setSessionError)
              // Continue to check existing session
            }
          }
        }
        
        // Check for existing session (user might already be logged in)
        console.log('Checking for existing session...')
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Get session error:', error)
          setError(`Authentication error: ${error.message}`)
          return
        }

        if (data.session) {
          console.log('Existing session found')
          router.push('/dashboard')
          return
        }

        // If nothing worked, redirect to login with a message
        console.log('No session established, redirecting to login')
        router.push('/login?message=Please sign in to continue')
        
      } catch (error) {
        console.error('Unexpected auth callback error:', error)
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Add a small delay to ensure the page is fully loaded
    const timeoutId = setTimeout(handleAuthCallback, 100)
    return () => clearTimeout(timeoutId)
    
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-red-600">
              Authentication Error
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verifying your account...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete your registration.
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Loading...
            </h2>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}