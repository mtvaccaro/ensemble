/**
 * Transcription utility functions
 */

import { TranscriptionStatus, TranscriptionStatusType } from '@/types'

/**
 * Check if an episode needs transcription
 */
export function needsTranscription(
  status?: TranscriptionStatusType,
  transcript?: string
): boolean {
  if (!status) return true
  if (status === TranscriptionStatus.COMPLETED && transcript) return false
  if (status === TranscriptionStatus.IN_PROGRESS) return false
  return true
}

/**
 * Get a human-readable status message
 */
export function getTranscriptionStatusMessage(status?: TranscriptionStatusType): string {
  switch (status) {
    case TranscriptionStatus.NOT_STARTED:
      return 'Not transcribed'
    case TranscriptionStatus.IN_PROGRESS:
      return 'Transcribing...'
    case TranscriptionStatus.COMPLETED:
      return 'Transcribed'
    case TranscriptionStatus.FAILED:
      return 'Transcription failed'
    default:
      return 'Unknown status'
  }
}

/**
 * Get status color class for UI
 */
export function getTranscriptionStatusColor(status?: TranscriptionStatusType): string {
  switch (status) {
    case TranscriptionStatus.NOT_STARTED:
      return 'text-gray-500'
    case TranscriptionStatus.IN_PROGRESS:
      return 'text-blue-500'
    case TranscriptionStatus.COMPLETED:
      return 'text-green-500'
    case TranscriptionStatus.FAILED:
      return 'text-red-500'
    default:
      return 'text-gray-400'
  }
}

/**
 * Estimate transcription cost (OpenAI Whisper pricing: $0.006/minute)
 */
export function estimateTranscriptionCost(durationInSeconds: number): number {
  const minutes = durationInSeconds / 60
  const costPerMinute = 0.006
  return Math.ceil(minutes * costPerMinute * 100) / 100 // Round up to 2 decimals
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * Truncate transcript for preview
 */
export function truncateTranscript(transcript: string, maxLength: number = 200): string {
  if (transcript.length <= maxLength) return transcript
  return transcript.substring(0, maxLength).trim() + '...'
}

/**
 * Calculate transcription progress for batch operations
 */
export interface TranscriptionProgress {
  total: number
  notStarted: number
  inProgress: number
  completed: number
  failed: number
  percentComplete: number
}

export function calculateTranscriptionProgress(
  episodes: Array<{ transcription_status?: TranscriptionStatusType }>
): TranscriptionProgress {
  const progress: TranscriptionProgress = {
    total: episodes.length,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    percentComplete: 0,
  }

  episodes.forEach((episode) => {
    switch (episode.transcription_status) {
      case TranscriptionStatus.NOT_STARTED:
      case undefined:
        progress.notStarted++
        break
      case TranscriptionStatus.IN_PROGRESS:
        progress.inProgress++
        break
      case TranscriptionStatus.COMPLETED:
        progress.completed++
        break
      case TranscriptionStatus.FAILED:
        progress.failed++
        break
    }
  })

  progress.percentComplete = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  return progress
}

/**
 * Batch transcribe episodes with rate limiting
 */
export async function batchTranscribeEpisodes(
  episodeIds: string[],
  onProgress?: (completed: number, total: number, episodeId: string) => void,
  concurrency: number = 1
): Promise<{
  successful: string[]
  failed: Array<{ id: string; error: string }>
}> {
  const successful: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  // Process episodes with concurrency control
  for (let i = 0; i < episodeIds.length; i += concurrency) {
    const batch = episodeIds.slice(i, i + concurrency)
    
    const results = await Promise.allSettled(
      batch.map(async (episodeId) => {
        const response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
          method: 'POST',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Transcription failed')
        }

        const data = await response.json()
        return { episodeId, data }
      })
    )

    results.forEach((result, index) => {
      const episodeId = batch[index]
      
      if (result.status === 'fulfilled') {
        successful.push(episodeId)
        onProgress?.(successful.length + failed.length, episodeIds.length, episodeId)
      } else {
        failed.push({
          id: episodeId,
          error: result.reason?.message || 'Unknown error',
        })
        onProgress?.(successful.length + failed.length, episodeIds.length, episodeId)
      }
    })
  }

  return { successful, failed }
}

