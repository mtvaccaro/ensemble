import { useState, useCallback, useEffect } from 'react'
import { TranscriptionStatus, TranscriptionStatusType } from '@/types'
import { storage } from './localStorage'

interface TranscriptionState {
  status: TranscriptionStatusType
  transcript?: string
  error?: string
  isLoading: boolean
}

interface TranscriptionResponse {
  message?: string
  transcript?: string
  status: TranscriptionStatusType
  error?: string
  details?: string
}

interface StartTranscriptionParams {
  audioUrl: string
  title: string
}

export function useTranscription(episodeId: string) {
  const [state, setState] = useState<TranscriptionState>({
    status: TranscriptionStatus.NOT_STARTED,
    isLoading: false,
  })

  // Load initial status from localStorage
  useEffect(() => {
    const stored = storage.getTranscript(episodeId)
    if (stored) {
      setState({
        status: stored.status,
        transcript: stored.transcript,
        error: stored.error,
        isLoading: false,
      })
    }
  }, [episodeId])

  const startTranscription = useCallback(async ({ audioUrl, title }: StartTranscriptionParams) => {
    // Set status to in-progress in localStorage
    storage.setTranscriptStatus(episodeId, TranscriptionStatus.IN_PROGRESS)
    setState(prev => ({ ...prev, isLoading: true, error: undefined, status: TranscriptionStatus.IN_PROGRESS }))

    try {
      const response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl, title }),
      })

      const data: TranscriptionResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Transcription failed')
      }

      // Save transcript to localStorage
      if (data.transcript) {
        storage.setTranscript(episodeId, data.transcript, TranscriptionStatus.COMPLETED)
      }

      setState({
        status: data.status,
        transcript: data.transcript,
        isLoading: false,
      })

      return {
        success: true,
        transcript: data.transcript,
        status: data.status,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start transcription'
      
      // Save failed status to localStorage
      storage.setTranscriptStatus(episodeId, TranscriptionStatus.FAILED, errorMessage)
      
      setState({
        status: TranscriptionStatus.FAILED,
        error: errorMessage,
        isLoading: false,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [episodeId])

  const checkStatus = useCallback(async () => {
    // In localStorage mode, just read from localStorage
    try {
      const stored = storage.getTranscript(episodeId)
      
      if (stored) {
        setState(prev => ({
          ...prev,
          status: stored.status,
          transcript: stored.transcript,
          error: stored.error,
        }))

        return {
          success: true,
          status: stored.status,
          hasTranscript: !!stored.transcript,
          error: stored.error,
        }
      }

      return {
        success: true,
        status: TranscriptionStatus.NOT_STARTED,
        hasTranscript: false,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check status'
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }))

      return {
        success: false,
        error: errorMessage,
      }
    }
  }, [episodeId])

  const reset = useCallback(() => {
    // Remove from localStorage
    storage.setTranscriptStatus(episodeId, TranscriptionStatus.NOT_STARTED)
    
    setState({
      status: TranscriptionStatus.NOT_STARTED,
      isLoading: false,
    })
  }, [episodeId])

  return {
    ...state,
    startTranscription,
    checkStatus,
    reset,
  }
}
