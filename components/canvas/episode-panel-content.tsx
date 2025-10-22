'use client'

import { useState, useMemo } from 'react'
import { FileText, Loader2, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TranscriptSegment, CanvasEpisode, CanvasClip } from '@/types'
import { SearchableTranscript } from '@/components/episodes/searchable-transcript'

interface EpisodePanelContentProps {
  episode: CanvasEpisode
  onCreateClip: (clip: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => void
  onTranscribe?: (episodeId: string) => void
  isTranscribing?: boolean
}

export function EpisodePanelContent({ 
  episode, 
  onCreateClip,
  onTranscribe,
  isTranscribing = false
}: EpisodePanelContentProps) {
  const [selectedSegments, setSelectedSegments] = useState<TranscriptSegment[]>([])
  const [clipTitle, setClipTitle] = useState('')
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null)
  
  const hasTranscript = episode.transcript_segments && episode.transcript_segments.length > 0

  const handleSegmentClick = (segment: TranscriptSegment) => {
    if (selectionMode === 'start') {
      setSelectedSegments([segment])
      setSelectionMode('end')
    } else if (selectionMode === 'end' && selectedSegments.length > 0) {
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
        
        const previewText = rangeSegments[0].text.split(' ').slice(0, 5).join(' ')
        setClipTitle(previewText + '...')
      }
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
      title: clipTitle || `Clip from ${episode.title}`,
      audioUrl: episode.audioUrl,
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
    <div className="p-6 space-y-6">
      {/* Episode Info */}
      <div>
        {episode.imageUrl && (
          <img
            src={episode.imageUrl}
            alt={episode.title}
            className="w-full aspect-video object-cover rounded-lg mb-4"
          />
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {episode.title}
        </h3>
        <p className="text-sm text-gray-600">
          Duration: {formatDuration(episode.duration)}
        </p>
      </div>

      {/* Transcript Section */}
      <div>
        {!hasTranscript ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              No Transcript Available
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Transcribe this episode to create clips
            </p>
            <Button
              onClick={() => onTranscribe?.(episode.episodeId)}
              disabled={isTranscribing}
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
              <div className="space-y-3">
                {selectionMode === 'start' && (
                  <div className="flex items-center text-blue-700 text-sm">
                    <div className="animate-pulse mr-2">●</div>
                    <span className="font-medium">Click a segment to start</span>
                  </div>
                )}
                {selectionMode === 'end' && (
                  <div className="flex items-center text-blue-700 text-sm">
                    <div className="animate-pulse mr-2">●</div>
                    <span className="font-medium">Click a segment to end</span>
                  </div>
                )}
                {!selectionMode && selectedSegments.length === 0 && (
                  <div className="text-gray-700 text-sm">
                    <span className="font-medium">Create a clip:</span> Select a range from transcript
                  </div>
                )}
                {!selectionMode && selectedSegments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-green-700 text-sm font-medium">
                      {selectedSegments.length} segments ({formatDuration(selectedDuration)})
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
                
                <div className="flex items-center gap-2">
                  {selectionMode ? (
                    <Button onClick={cancelSelection} variant="outline" size="sm" className="w-full">
                      Cancel
                    </Button>
                  ) : selectedSegments.length > 0 ? (
                    <>
                      <Button onClick={cancelSelection} variant="outline" size="sm" className="flex-1">
                        Clear
                      </Button>
                      <Button onClick={handleCreateClip} size="sm" className="flex-1">
                        <Scissors className="h-4 w-4 mr-2" />
                        Create Clip
                      </Button>
                    </>
                  ) : (
                    <Button onClick={startSelection} size="sm" className="w-full">
                      <Scissors className="h-4 w-4 mr-2" />
                      Select Range
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Transcript */}
            <SearchableTranscript
              segments={episode.transcript_segments || []}
              onSegmentClick={handleSegmentClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}

