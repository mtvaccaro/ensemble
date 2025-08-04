import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})


// Database types - these will be updated with generated types from Supabase
export type Database = {
  public: {
    Tables: {
      podcasts: {
        Row: {
          id: string
          title: string
          description: string
          feed_url: string
          image_url: string | null
          author: string
          language: string
          categories: string[]
          episode_count: number
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          feed_url: string
          image_url?: string | null
          author: string
          language: string
          categories?: string[]
          episode_count?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          feed_url?: string
          image_url?: string | null
          author?: string
          language?: string
          categories?: string[]
          episode_count?: number
          last_updated?: string
          created_at?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          id: string
          podcast_id: string
          title: string
          description: string
          audio_url: string
          duration: number
          published_at: string
          image_url: string | null
          transcript: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          podcast_id: string
          title: string
          description: string
          audio_url: string
          duration: number
          published_at: string
          image_url?: string | null
          transcript?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          podcast_id?: string
          title?: string
          description?: string
          audio_url?: string
          duration?: number
          published_at?: string
          image_url?: string | null
          transcript?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clips: {
        Row: {
          id: string
          episode_id: string
          user_id: string
          title: string
          description: string
          start_time: number
          end_time: number
          duration: number
          audio_url: string | null
          transcript: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          user_id: string
          title: string
          description: string
          start_time: number
          end_time: number
          duration: number
          audio_url?: string | null
          transcript: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          user_id?: string
          title?: string
          description?: string
          start_time?: number
          end_time?: number
          duration?: number
          audio_url?: string | null
          transcript?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 