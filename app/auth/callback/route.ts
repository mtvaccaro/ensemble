import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('Server-side auth callback:', { code: !!code, error, error_description })

  if (error) {
    console.error('Auth callback error:', error, error_description)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error_description || error)}`, request.url))
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url))
      }

      if (data.session) {
        console.log('Server-side session established successfully')
        return NextResponse.redirect(new URL(next, request.url))
      }
    } catch (exchangeError) {
      console.error('Server-side code exchange failed:', exchangeError)
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent('Failed to complete authentication')}`, request.url))
    }
  }

  // If no code and no error, redirect to login
  return NextResponse.redirect(new URL('/login?message=Please sign in to continue', request.url))
}