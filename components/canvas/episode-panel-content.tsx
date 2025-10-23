'use client'

import { useState, useMemo } from 'react'
import { FileText, Loader2, Scissors, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const [startSegment, setStartSegment] = useState<TranscriptSegment | null>(null)
  const [endSegment, setEndSegment] = useState<TranscriptSegment | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<TranscriptSegment | null>(null)
  
  const hasTranscript = episode.transcript_segments && episode.transcript_segments.length > 0

  const handleSegmentClick = (segment: TranscriptSegment) => {
    const segments = episode.transcript_segments || []
    
    // If no start point, set it
    if (!startSegment) {
      setStartSegment(segment)
      setEndSegment(null)
      return
    }
    
    // If start point exists but no end point
    if (startSegment && !endSegment) {
      const startIndex = segments.findIndex(s => s.id === startSegment.id)
      const clickedIndex = segments.findIndex(s => s.id === segment.id)
      
      // Prevent backward selection
      if (clickedIndex < startIndex) {
        return
      }
      
      // Set end point
      setEndSegment(segment)
      return
    }
    
    // If both start and end exist, do nothing (must reset first)
  }

  const handleSegmentHover = (segment: TranscriptSegment | null) => {
    // Only show hover preview if we have a start but no end
    if (startSegment && !endSegment) {
      setHoveredSegment(segment)
    }
  }

  const resetSelection = () => {
    setStartSegment(null)
    setEndSegment(null)
    setHoveredSegment(null)
  }

  const handleCreateClip = () => {
    if (!startSegment || !endSegment) return

    const segments = episode.transcript_segments || []
    const startIndex = segments.findIndex(s => s.id === startSegment.id)
    const endIndex = segments.findIndex(s => s.id === endSegment.id)
    
    const selectedSegments = segments.slice(startIndex, endIndex + 1)
    const startTime = selectedSegments[0].start
    const endTime = selectedSegments[selectedSegments.length - 1].end
    const transcript = selectedSegments.map(s => s.text).join(' ')

    // Auto-generate title from first few words
    const previewText = selectedSegments[0].text.split(' ').slice(0, 5).join(' ')
    const clipTitle = previewText + '...'

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
    // Auto-reset after creating clip
    resetSelection()
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate selected range for display
  const selectedRange = useMemo(() => {
    if (!startSegment || !endSegment) return null
    
    const segments = episode.transcript_segments || []
    const startIndex = segments.findIndex(s => s.id === startSegment.id)
    const endIndex = segments.findIndex(s => s.id === endSegment.id)
    
    const selectedSegments = segments.slice(startIndex, endIndex + 1)
    const duration = endSegment.end - startSegment.start
    
    return {
      segments: selectedSegments,
      duration,
      count: selectedSegments.length
    }
  }, [startSegment, endSegment, episode.transcript_segments])

  // Calculate preview range (for hover effect)
  const previewRange = useMemo(() => {
    if (!startSegment || endSegment || !hoveredSegment) return null
    
    const segments = episode.transcript_segments || []
    const startIndex = segments.findIndex(s => s.id === startSegment.id)
    const hoverIndex = segments.findIndex(s => s.id === hoveredSegment.id)
    
    // Only show preview if hovering after start
    if (hoverIndex < startIndex) return null
    
    return {
      startIndex,
      endIndex: hoverIndex
    }
  }, [startSegment, endSegment, hoveredSegment, episode.transcript_segments])

  return (
    <div className="relative h-full flex flex-col">
      {/* Transcript Section */}
      <div className="flex-1 px-2 pt-4 overflow-y-auto" style={{ paddingBottom: selectedRange ? '140px' : '0' }}>
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
          <SearchableTranscript
            segments={episode.transcript_segments || []}
            onSegmentClick={handleSegmentClick}
            onSegmentHover={handleSegmentHover}
            startSegment={startSegment}
            endSegment={endSegment}
            previewRange={previewRange}
          />
        )}
      </div>

      {/* Fixed action buttons at bottom (only when range is selected) */}
      {selectedRange && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg">
          <div className="space-y-2">
            {/* Duration display */}
            <div className="text-center text-sm font-semibold text-gray-700">
              {formatDuration(selectedRange.duration)}
            </div>
            
            {/* Action buttons stacked */}
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleCreateClip} 
                size="sm"
                className="w-full gap-2"
              >
                <Scissors className="h-4 w-4" />
                Create Clip
              </Button>
              <Button 
                onClick={resetSelection} 
                variant="outline" 
                size="sm"
                className="w-full gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





