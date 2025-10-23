'use client'

import React, { createContext, useContext, useState } from 'react'

// localStorage mode - no authentication required
// This is a stub AuthContext for components that still reference auth

interface User {
  id: string
  email?: string
}

interface UserProfile {
  id: string
  email?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // In localStorage mode, there's no user authentication
  const [user] = useState<User | null>(null)
  const [profile] = useState<UserProfile | null>(null)
  const [loading] = useState(false)

  const signOut = async () => {
    // No-op in localStorage mode
  }

  const value = {
    user,
    profile,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export types for compatibility
export type { User, UserProfile }
