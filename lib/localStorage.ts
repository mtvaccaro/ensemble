// localStorage utilities for persisting data without a backend
// This allows the app to work fully offline with data persistence

import { Podcast, Episode, TranscriptionStatusType, TranscriptionStatus, TranscriptSegment } from '@/types'

const STORAGE_KEYS = {
  PODCASTS: 'clipper_subscribed_podcasts',
  EPISODES: 'clipper_episodes',
  TRANSCRIPTS: 'clipper_transcripts',
  LAST_UPDATED: 'clipper_last_updated'
}

interface StoredTranscript {
  episodeId: string
  transcript: string
  segments?: TranscriptSegment[]
  status: TranscriptionStatusType
  error?: string
  updatedAt: string
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

export const storage = {
  // Get subscribed podcasts from localStorage
  getSubscribedPodcasts: (): Podcast[] => {
    if (!isBrowser) return []
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PODCASTS)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  },

  // Save subscribed podcasts to localStorage
  setSubscribedPodcasts: (podcasts: Podcast[]): void => {
    if (!isBrowser) return
    
    try {
      localStorage.setItem(STORAGE_KEYS.PODCASTS, JSON.stringify(podcasts))
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString())
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  },

  // Add a single podcast to subscriptions
  addPodcast: (podcast: Podcast): void => {
    if (!isBrowser) return
    
    const podcasts = storage.getSubscribedPodcasts()
    
    // Check if already subscribed
    if (podcasts.some(p => p.id === podcast.id)) {
      console.log('Already subscribed to this podcast')
      return
    }
    
    podcasts.push(podcast)
    storage.setSubscribedPodcasts(podcasts)
  },

  // Remove a podcast from subscriptions
  removePodcast: (podcastId: string): void => {
    if (!isBrowser) return
    
    const podcasts = storage.getSubscribedPodcasts()
    const filtered = podcasts.filter(p => p.id !== podcastId)
    storage.setSubscribedPodcasts(filtered)
  },

  // Get a single podcast by ID
  getPodcast: (podcastId: string): Podcast | null => {
    if (!isBrowser) return null
    
    const podcasts = storage.getSubscribedPodcasts()
    return podcasts.find(p => p.id === podcastId) || null
  },

  // Clear all data (useful for testing)
  clearAll: (): void => {
    if (!isBrowser) return
    
    localStorage.removeItem(STORAGE_KEYS.PODCASTS)
    localStorage.removeItem(STORAGE_KEYS.EPISODES)
    localStorage.removeItem(STORAGE_KEYS.TRANSCRIPTS)
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED)
  },

  // === EPISODE STORAGE ===

  // Get all episodes for a podcast
  getEpisodes: (podcastId: string): Episode[] => {
    if (!isBrowser) return []
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EPISODES)
      const allEpisodes: Record<string, Episode[]> = data ? JSON.parse(data) : {}
      return allEpisodes[podcastId] || []
    } catch (error) {
      console.error('Error reading episodes from localStorage:', error)
      return []
    }
  },

  // Save episodes for a podcast
  setEpisodes: (podcastId: string, episodes: Episode[]): void => {
    if (!isBrowser) return
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EPISODES)
      const allEpisodes: Record<string, Episode[]> = data ? JSON.parse(data) : {}
      allEpisodes[podcastId] = episodes
      localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(allEpisodes))
    } catch (error) {
      console.error('Error writing episodes to localStorage:', error)
    }
  },

  // Get a single episode by ID (searches across all podcasts)
  getEpisode: (episodeId: string): Episode | null => {
    if (!isBrowser) return null
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EPISODES)
      const allEpisodes: Record<string, Episode[]> = data ? JSON.parse(data) : {}
      
      for (const episodes of Object.values(allEpisodes)) {
        const episode = episodes.find(e => e.id === episodeId)
        if (episode) return episode
      }
      return null
    } catch (error) {
      console.error('Error finding episode:', error)
      return null
    }
  },

  // Update a single episode (for transcription updates)
  updateEpisode: (episodeId: string, updates: Partial<Episode>): void => {
    if (!isBrowser) return
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EPISODES)
      const allEpisodes: Record<string, Episode[]> = data ? JSON.parse(data) : {}
      
      for (const [podcastId, episodes] of Object.entries(allEpisodes)) {
        const episodeIndex = episodes.findIndex(e => e.id === episodeId)
        if (episodeIndex !== -1) {
          allEpisodes[podcastId][episodeIndex] = {
            ...allEpisodes[podcastId][episodeIndex],
            ...updates
          }
          localStorage.setItem(STORAGE_KEYS.EPISODES, JSON.stringify(allEpisodes))
          return
        }
      }
    } catch (error) {
      console.error('Error updating episode:', error)
    }
  },

  // === TRANSCRIPT STORAGE ===

  // Get transcript for an episode
  getTranscript: (episodeId: string): StoredTranscript | null => {
    if (!isBrowser) return null
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSCRIPTS)
      const transcripts: Record<string, StoredTranscript> = data ? JSON.parse(data) : {}
      return transcripts[episodeId] || null
    } catch (error) {
      console.error('Error reading transcript from localStorage:', error)
      return null
    }
  },

  // Save transcript for an episode
  setTranscript: (episodeId: string, transcript: string, status: TranscriptionStatusType = TranscriptionStatus.COMPLETED, error?: string, segments?: TranscriptSegment[]): void => {
    if (!isBrowser) return
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSCRIPTS)
      const transcripts: Record<string, StoredTranscript> = data ? JSON.parse(data) : {}
      
      transcripts[episodeId] = {
        episodeId,
        transcript,
        segments,
        status,
        error,
        updatedAt: new Date().toISOString()
      }
      
      localStorage.setItem(STORAGE_KEYS.TRANSCRIPTS, JSON.stringify(transcripts))
      
      // Also update the episode with transcript data
      storage.updateEpisode(episodeId, {
        transcript,
        transcript_segments: segments,
        transcription_status: status,
        transcription_error: error
      })
    } catch (error) {
      console.error('Error writing transcript to localStorage:', error)
    }
  },

  // Update transcript status (for in-progress/failed states)
  setTranscriptStatus: (episodeId: string, status: TranscriptionStatusType, error?: string): void => {
    if (!isBrowser) return
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSCRIPTS)
      const transcripts: Record<string, StoredTranscript> = data ? JSON.parse(data) : {}
      
      if (transcripts[episodeId]) {
        transcripts[episodeId].status = status
        transcripts[episodeId].error = error
        transcripts[episodeId].updatedAt = new Date().toISOString()
      } else {
        transcripts[episodeId] = {
          episodeId,
          transcript: '',
          status,
          error,
          updatedAt: new Date().toISOString()
        }
      }
      
      localStorage.setItem(STORAGE_KEYS.TRANSCRIPTS, JSON.stringify(transcripts))
      
      // Also update the episode
      storage.updateEpisode(episodeId, {
        transcription_status: status,
        transcription_error: error
      })
    } catch (error) {
      console.error('Error updating transcript status:', error)
    }
  }
}

