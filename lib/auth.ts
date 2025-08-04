import { supabase } from './supabase'
import { User, Session } from '@supabase/supabase-js'

export interface AuthError {
  message: string
}

export interface SignUpData {
  email: string
  password: string
  name?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// Sign up with email and password
export async function signUp({ email, password, name }: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    console.log('Attempting signup with email:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    console.log('Signup result:', { 
      user: !!data.user, 
      session: !!data.session,
      error: error?.message,
      needsConfirmation: data.user && !data.session
    })

    if (error) {
      // Check if this is demo mode
      if (error.message.includes('Demo mode')) {
        return { 
          user: null, 
          error: { 
            message: 'Demo Mode: To test authentication, please add your Supabase credentials to .env.local. For now, you can explore the podcast features directly at /podcasts' 
          } 
        }
      }
      return { user: null, error: { message: error.message } }
    }

    return { user: data.user, error: null }
  } catch (error) {
    return { 
      user: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Sign in with email and password
export async function signIn({ email, password }: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Check if this is demo mode
      if (error.message.includes('Demo mode')) {
        return { 
          user: null, 
          error: { 
            message: 'Demo Mode: To test authentication, please add your Supabase credentials to .env.local. For now, you can explore the podcast features directly at /podcasts' 
          } 
        }
      }
      return { user: null, error: { message: error.message } }
    }

    return { user: data.user, error: null }
  } catch (error) {
    return { 
      user: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Sign out
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return { error: { message: error.message } }
    }

    return { error: null }
  } catch (error) {
    return { 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Get current user
export async function getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return { user: null, error: { message: error.message } }
    }

    return { user, error: null }
  } catch (error) {
    return { 
      user: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Get user profile from current session
export async function getUserProfile(): Promise<{ profile: UserProfile | null; error: AuthError | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { profile: null, error: { message: error?.message || 'User not found' } }
    }

    const profile: UserProfile = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at
    }

    return { profile, error: null }
  } catch (error) {
    return { 
      profile: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Update user profile (updates user metadata)
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<{ profile: UserProfile | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: updates.name,
        avatar_url: updates.avatar_url
      }
    })

    if (error) {
      return { profile: null, error: { message: error.message } }
    }

    if (!data.user) {
      return { profile: null, error: { message: 'User not found' } }
    }

    const profile: UserProfile = {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.name || null,
      avatar_url: data.user.user_metadata?.avatar_url || null,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at
    }

    return { profile, error: null }
  } catch (error) {
    return { 
      profile: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    return false
  }
}

// Get current session
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return { session: null, error: { message: error.message } }
    }

    return { session, error: null }
  } catch (error) {
    return { 
      session: null, 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// Reset password
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      return { error: { message: error.message } }
    }

    return { error: null }
  } catch (error) {
    return { 
      error: { message: error instanceof Error ? error.message : 'An unexpected error occurred' } 
    }
  }
} 