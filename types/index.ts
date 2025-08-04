export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
}

export interface Podcast {
  id: string
  title: string
  description: string
  feed_url: string
  image_url?: string
  author: string
  language: string
  categories: string[]
  episode_count: number
  last_updated: string
}

export interface Episode {
  id: string
  podcast_id: string
  title: string
  description: string
  audio_url: string
  duration: number
  published_at: string
  image_url?: string
  transcript?: string
}

export interface Clip {
  id: string
  episode_id: string
  user_id: string
  title: string
  description: string
  start_time: number
  end_time: number
  duration: number
  audio_url?: string
  transcript: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ClipFormData {
  title: string
  description: string
  start_time: number
  end_time: number
  transcript: string
  tags: string[]
}

export interface PodcastSearchResult {
  id: number
  title: string
  description: string
  author: string
  imageUrl: string
  feedUrl: string
  websiteUrl: string
  language: string
  episodeCount: number
  categories: string[]
  lastUpdated: string
}

export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
} 