// localStorage utilities for persisting data without a backend
// This allows the app to work fully offline with data persistence

import { Podcast } from '@/types'

const STORAGE_KEYS = {
  PODCASTS: 'clipper_subscribed_podcasts',
  LAST_UPDATED: 'clipper_last_updated'
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
    localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED)
  }
}

