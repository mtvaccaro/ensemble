'use client'

import { useEffect } from 'react'
import { useTranscription } from '@/lib/use-transcription'
import { TranscriptionStatus, TranscriptSegment } from '@/types'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { WordLevelTranscript } from './word-level-transcript'

interface TranscriptionButtonProps {
  episodeId: string
  episodeTitle: string
  audioUrl: string
  initialStatus?: string
  initialTranscript?: string
  initialSegments?: TranscriptSegment[]
  onTranscriptionComplete?: (transcript: string, segments: TranscriptSegment[]) => void
}

export function TranscriptionButton({
  episodeId,
  episodeTitle,
  audioUrl,
  initialStatus,
  initialTranscript,
  initialSegments,
  onTranscriptionComplete,
}: TranscriptionButtonProps) {
  const { status, transcript, segments, error, isLoading, startTranscription, checkStatus } = useTranscription(episodeId)

  useEffect(() => {
    // Check status on mount
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    // Call callback when transcription completes
    if (status === TranscriptionStatus.COMPLETED && transcript && segments && onTranscriptionComplete) {
      onTranscriptionComplete(transcript, segments)
    }
  }, [status, transcript, segments, onTranscriptionComplete])

  const handleTranscribe = async () => {
    const result = await startTranscription({ audioUrl, title: episodeTitle })
    if (result.success && result.transcript) {
      console.log('Transcription completed:', result.transcript.substring(0, 100) + '...')
      console.log('Segments:', result.segments?.length || 0)
    }
  }

  const currentStatus = status || initialStatus || TranscriptionStatus.NOT_STARTED
  const hasTranscript = transcript || initialTranscript
  const displaySegments = segments || initialSegments || []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {currentStatus === TranscriptionStatus.NOT_STARTED && (
          <Button
            onClick={handleTranscribe}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Transcribe Episode
              </>
            )}
          </Button>
        )}

        {currentStatus === TranscriptionStatus.IN_PROGRESS && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        {currentStatus === TranscriptionStatus.COMPLETED && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Transcription complete</span>
          </div>
        )}

        {currentStatus === TranscriptionStatus.FAILED && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Transcription failed</span>
            </div>
            <Button
              onClick={handleTranscribe}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {hasTranscript && currentStatus === TranscriptionStatus.COMPLETED && (
        <details className="text-sm border border-gray-200 rounded-md p-4" open>
          <summary className="cursor-pointer font-semibold text-base hover:text-blue-600 mb-4">
            View & Search Transcript
          </summary>
          {displaySegments.length > 0 ? (
            <WordLevelTranscript
              segments={displaySegments}
              onSelectionChange={(selection) => {
                if (selection) {
                  console.log('Selected word range:', {
                    startTime: selection.startTime,
                    endTime: selection.endTime,
                    text: selection.text.substring(0, 50)
                  })
                  // TODO: Integrate with audio player to seek to selection.startTime
                  // TODO: Optionally open clip creation modal with this selection pre-selected
                }
              }}
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {transcript || initialTranscript}
              <p className="text-xs text-gray-500 mt-4">
                (Legacy format - no segments available for search)
              </p>
            </div>
          )}
        </details>
      )}
    </div>
  )
}
