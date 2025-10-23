'use client'

import { useState, useMemo } from 'react'
import { X, Scissors, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TranscriptSegment, CanvasEpisode, CanvasClip } from '@/types'
import { SearchableTranscript } from '@/components/episodes/searchable-transcript'

interface EpisodeDetailModalProps {
  episode: CanvasEpisode
  onClose: () => void
  onCreateClip: (clip: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => void
  onTranscribe?: (episodeId: string) => void
  isTranscribing?: boolean
}

export function EpisodeDetailModal({ 
  episode, 
  onClose, 
  onCreateClip,
  onTranscribe,
  isTranscribing = false
}: EpisodeDetailModalProps) {
  const [selectedSegments, setSelectedSegments] = useState<TranscriptSegment[]>([])
  const [clipTitle, setClipTitle] = useState('')
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null)
  
  const hasTranscript = episode.transcript_segments && episode.transcript_segments.length > 0

  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (selectionMode === 'start') {
      // Starting a new selection
      setSelectedSegments([segment])
      setSelectionMode('end')
    } else if (selectionMode === 'end' && selectedSegments.length > 0) {
      // Completing the selection - get all segments in range
      const startSegment = selectedSegments[0]
      const segments = episode.transcript_segments || []
      
      const startIndex = segments.findIndex(s => s.id === startSegment.id)
      const endIndex = segments.findIndex(s => s.id === segment.id)
      
      if (startIndex !== -1 && endIndex !== -1) {
        const [minIndex, maxIndex] = startIndex < endIndex 
          ? [startIndex, endIndex] 
          : [endIndex, startIndex]
        
        const rangeSegments = segments.slice(minIndex, maxIndex + 1)
        setSelectedSegments(rangeSegments)
        setSelectionMode(null)
        
        // Auto-generate clip title from first few words
        const previewText = rangeSegments[0].text.split(' ').slice(0, 5).join(' ')
        setClipTitle(previewText + '...')
      }
    } else {
      // Just viewing, play from this timestamp
      console.log('Play from:', segment.start)
    }
  }

  const startSelection = () => {
    setSelectedSegments([])
    setSelectionMode('start')
    setClipTitle('')
  }

  const cancelSelection = () => {
    setSelectedSegments([])
    setSelectionMode(null)
    setClipTitle('')
  }

  const handleCreateClip = () => {
    if (selectedSegments.length === 0) return

    const startTime = selectedSegments[0].start
    const endTime = selectedSegments[selectedSegments.length - 1].end
    const transcript = selectedSegments.map(s => s.text).join(' ')

    const clipData: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'> = {
      type: 'clip',
      episodeId: episode.episodeId,
      podcastId: episode.podcastId,
      title: clipTitle || `Clip from ${episode.title}`,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      startTime,
      endTime,
      duration: endTime - startTime,
      transcript,
      segments: selectedSegments
    }

    onCreateClip(clipData)
    cancelSelection()
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const selectedDuration = useMemo(() => {
    if (selectedSegments.length === 0) return 0
    const start = selectedSegments[0].start
    const end = selectedSegments[selectedSegments.length - 1].end
    return end - start
  }, [selectedSegments])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {episode.title}
            </h2>
            <p className="text-sm text-gray-600">
              Duration: {formatDuration(episode.duration)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasTranscript ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transcript Available
              </h3>
              <p className="text-gray-600 mb-6">
                Transcribe this episode to create clips from specific segments
              </p>
              <Button
                onClick={() => onTranscribe?.(episode.episodeId)}
                disabled={isTranscribing}
                className="mx-auto"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Transcribe Episode
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selection toolbar */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {selectionMode === 'start' && (
                      <div className="flex items-center text-blue-700">
                        <div className="animate-pulse mr-2">●</div>
                        <span className="font-medium">Click a segment to start your selection</span>
                      </div>
                    )}
                    {selectionMode === 'end' && (
                      <div className="flex items-center text-blue-700">
                        <div className="animate-pulse mr-2">●</div>
                        <span className="font-medium">Click a segment to end your selection</span>
                      </div>
                    )}
                    {!selectionMode && selectedSegments.length === 0 && (
                      <div className="text-gray-700">
                        <span className="font-medium">Create a clip:</span> Select a range from the transcript below
                      </div>
                    )}
                    {!selectionMode && selectedSegments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-700">
                          <span className="font-medium">
                            {selectedSegments.length} segments selected ({formatDuration(selectedDuration)})
                          </span>
                        </div>
                        <Input
                          type="text"
                          placeholder="Clip title..."
                          value={clipTitle}
                          onChange={(e) => setClipTitle(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {selectionMode ? (
                      <Button onClick={cancelSelection} variant="outline" size="sm">
                        Cancel
                      </Button>
                    ) : selectedSegments.length > 0 ? (
                      <>
                        <Button onClick={cancelSelection} variant="outline" size="sm">
                          Clear
                        </Button>
                        <Button onClick={handleCreateClip} size="sm">
                          <Scissors className="h-4 w-4 mr-2" />
                          Create Clip
                        </Button>
                      </>
                    ) : (
                      <Button onClick={startSelection} size="sm">
                        <Scissors className="h-4 w-4 mr-2" />
                        Select Range
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript with selection highlighting */}
              <div className="relative">
                <SearchableTranscript
                  segments={episode.transcript_segments || []}
                  onSegmentClick={handleSegmentClick}
                />
                
                {/* Selection overlay */}
                {selectedSegments.length > 0 && !selectionMode && (
                  <div className="absolute top-0 left-0 w-full pointer-events-none">
                    {/* Visual indication of selected range */}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

