export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
}

// Transcription status enum
export const TranscriptionStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type TranscriptionStatusType = typeof TranscriptionStatus[keyof typeof TranscriptionStatus]

export interface TranscriptSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

export interface TranscriptionData {
  transcript: string
  segments: TranscriptSegment[]
  duration?: number
  language?: string
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
  transcript_segments?: TranscriptSegment[]
  transcription_status?: TranscriptionStatusType
  transcription_error?: string
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

// Canvas types for clip editor
export interface CanvasPosition {
  x: number
  y: number
}

export type CanvasItemType = 'episode' | 'clip' | 'reel'

export interface CanvasItem {
  id: string
  type: CanvasItemType
  position: CanvasPosition
  createdAt: string
  updatedAt: string
}

export interface CanvasEpisode extends CanvasItem {
  type: 'episode'
  episodeId: string
  podcastId: string
  title: string
  audioUrl: string
  imageUrl?: string
  duration: number
  transcript?: string
  transcript_segments?: TranscriptSegment[]
}

export interface CanvasClip extends CanvasItem {
  type: 'clip'
  episodeId: string
  podcastId?: string
  title: string
  audioUrl: string
  imageUrl?: string
  startTime: number
  endTime: number
  duration: number
  transcript: string
  segments: TranscriptSegment[]
}

export interface CanvasReel extends CanvasItem {
  type: 'reel'
  title: string
  clipIds: string[] // References to CanvasClip IDs in order
  totalDuration: number
}

export interface CanvasState {
  items: CanvasItem[]
  selectedItemIds: string[]
  lastUpdated: string
}

// AI Clip Suggestion types
export interface ClipSuggestion {
  startTime: number
  endTime: number
  duration: number
  title: string
  reason: string // Why this is a good clip
  hookScore: number // 1-10 rating
  viralPotential: number // 1-10 overall shareability
  contentType: 'story' | 'insight' | 'quote' | 'debate' | 'funny'
  transcript: string
  segments: TranscriptSegment[]
}

export interface ClipAnalysis {
  episodeId: string
  suggestions: ClipSuggestion[]
  analyzedAt: string
  costInCents: number
} 