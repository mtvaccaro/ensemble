'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileText, Loader2, Scissors, RotateCcw, Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TranscriptSegment, CanvasEpisode, CanvasClip } from '@/types'
import { SearchableTranscript } from '@/components/episodes/searchable-transcript'
import { WordLevelTranscript } from '@/components/episodes/word-level-transcript'
import { UniversalPanel } from './universal-panel'
import { SourcePanelFooter } from './source-panel-footer'
import { useAudioPlayer } from '@/lib/audio-player-context'

interface EpisodePanelContentProps {
  episode: CanvasEpisode
  onCreateClip: (clip: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => void
  onTranscribe?: (episodeId: string) => void
  isTranscribing?: boolean
}

export function EpisodePanelContent({ 
  episode, 
  onCreateClip,
  isTranscribing = false
}: EpisodePanelContentProps) {
  // Get audio player from context
  const audioPlayer = useAudioPlayer()
  
  // Set this episode as the playable item when component mounts or episode changes
  useEffect(() => {
    audioPlayer.setPlayableItems([episode], [episode])
  }, [episode.id]) // Only update when episode ID changes
  
  const [startSegment, setStartSegment] = useState<TranscriptSegment | null>(null)
  const [endSegment, setEndSegment] = useState<TranscriptSegment | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<TranscriptSegment | null>(null)
  
  // Word-level precision state (default to true - word-level is the superior UX)
  const [useWordLevel, setUseWordLevel] = useState(true)
  const [manualStartTime, setManualStartTime] = useState<number | null>(null)
  const [manualEndTime, setManualEndTime] = useState<number | null>(null)
  const [selectedText, setSelectedText] = useState('')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInfo, setSearchInfo] = useState<{
    matchCount: number
    currentIndex: number
    goToNext: () => void
    goToPrev: () => void
  } | null>(null)
  
  const hasTranscript = episode.transcript_segments && episode.transcript_segments.length > 0
  
  // Check if transcript has word-level data
  const hasWordLevelData = useMemo(() => {
    return episode.transcript_segments?.some(seg => seg.words && seg.words.length > 0) || false
  }, [episode.transcript_segments])
  
  // Auto-disable word-level if no word data available
  useEffect(() => {
    if (!hasWordLevelData && useWordLevel) {
      setUseWordLevel(false)
    }
  }, [hasWordLevelData, useWordLevel])

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
    setManualStartTime(null)
    setManualEndTime(null)
    setSelectedText('')
  }
  
  // Handler for word-level selection changes
  const handleWordLevelSelection = (selection: { startTime: number; endTime: number; text: string } | null) => {
    if (selection) {
      setManualStartTime(selection.startTime)
      setManualEndTime(selection.endTime)
      setSelectedText(selection.text)
    } else {
      setManualStartTime(null)
      setManualEndTime(null)
      setSelectedText('')
    }
  }
  
  const handleCreateClip = () => {
    // Use manual times if available (word-level), otherwise use segment times
    let startTime: number
    let endTime: number
    let transcript: string
    let selectedSegments: TranscriptSegment[] = []

    if (useWordLevel && manualStartTime !== null && manualEndTime !== null) {
      // Word-level precision mode
      startTime = manualStartTime
      endTime = manualEndTime
      transcript = selectedText || 'Custom clip'
      
      // Find segments that overlap with selected time range
      const segments = episode.transcript_segments || []
      selectedSegments = segments.filter(seg => 
        (seg.start >= startTime && seg.start <= endTime) ||
        (seg.end >= startTime && seg.end <= endTime) ||
        (seg.start <= startTime && seg.end >= endTime)
      )
    } else {
      // Segment-level mode (fallback)
      if (!startSegment || !endSegment) return

      const segments = episode.transcript_segments || []
      const startIndex = segments.findIndex(s => s.id === startSegment.id)
      const endIndex = segments.findIndex(s => s.id === endSegment.id)
      
      selectedSegments = segments.slice(startIndex, endIndex + 1)
      startTime = selectedSegments[0].start
      endTime = selectedSegments[selectedSegments.length - 1].end
      transcript = selectedSegments.map(s => s.text).join(' ')
    }

    // Auto-generate title from first few words
    const words = transcript.split(' ').slice(0, 5)
    const clipTitle = words.length > 0 ? words.join(' ') + '...' : 'Custom clip'

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

  // Calculate selected range for display (works for both modes)
  const selectedRange = useMemo(() => {
    // Word-level mode
    if (useWordLevel && manualStartTime !== null && manualEndTime !== null) {
      return {
        duration: manualEndTime - manualStartTime,
        isWordLevel: true
      }
    }
    
    // Segment-level mode
    if (!startSegment || !endSegment) return null
    
    const segments = episode.transcript_segments || []
    const startIndex = segments.findIndex(s => s.id === startSegment.id)
    const endIndex = segments.findIndex(s => s.id === endSegment.id)
    
    const selectedSegments = segments.slice(startIndex, endIndex + 1)
    const duration = endSegment.end - startSegment.start
    
    return {
      segments: selectedSegments,
      duration,
      count: selectedSegments.length,
      isWordLevel: false
    }
  }, [startSegment, endSegment, episode.transcript_segments, useWordLevel, manualStartTime, manualEndTime])

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

  // Format duration for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Parse duration string like "19:10" to seconds
  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  // Compute start/end times for footer display
  const startTime = useWordLevel 
    ? (manualStartTime ?? 0)
    : (startSegment?.start ?? 0)
  const endTime = useWordLevel
    ? (manualEndTime ?? 0)
    : (endSegment?.end ?? 0)

  // Transcript content to pass to UniversalPanel
  const transcriptContent = (
    <div className="space-y-4">
      {!hasTranscript ? (
        <div className="text-center py-8">
          {isTranscribing ? (
            // Loading skeleton while transcription is in progress
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-[#3d00f6] animate-spin" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-black">
                  Transcribing Episode...
                </h4>
                <p className="text-xs text-[#808080]">
                  This usually takes 20-60 seconds
                </p>
              </div>
              {/* Skeleton lines */}
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-[#e5e5e5] rounded animate-pulse"></div>
                <div className="h-3 bg-[#e5e5e5] rounded animate-pulse w-5/6 mx-auto"></div>
                <div className="h-3 bg-[#e5e5e5] rounded animate-pulse w-4/6 mx-auto"></div>
              </div>
            </div>
          ) : (
            // No transcript and not transcribing
            <div>
              <FileText className="h-12 w-12 text-[#808080] mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-black mb-2">
                No Transcript Available
              </h4>
              <p className="text-sm text-[#808080]">
                Transcript will be generated automatically
              </p>
            </div>
          )}
        </div>
      ) : useWordLevel && hasWordLevelData ? (
        <WordLevelTranscript
          segments={episode.transcript_segments || []}
          onSelectionChange={handleWordLevelSelection}
          startTime={manualStartTime}
          endTime={manualEndTime}
          searchQuery={searchQuery}
          onSearchInfoChange={setSearchInfo}
        />
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
  )

  // Footer content to pass to UniversalPanel
  const footerContent = selectedRange ? (
    <SourcePanelFooter
      duration={selectedRange.duration}
      startTime={startTime}
      endTime={endTime}
      hasSelection={!!selectedRange}
      onCreateClip={handleCreateClip}
      onClearSelection={resetSelection}
    />
  ) : null

  return (
    <UniversalPanel
      variant="source"
      title={episode.title}
      showName={episode.podcastTitle}
      duration={formatTime(episode.duration)}
      isPlaying={audioPlayer.isPlaying}
      currentTime={audioPlayer.currentTime}
      onPlayPause={() => {
        // Always pass the episode when toggling from the panel
        if (audioPlayer.isPlaying) {
          audioPlayer.pause()
        } else {
          audioPlayer.play(episode)
        }
      }}
      onSeek={audioPlayer.seek}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      transcriptContent={transcriptContent}
      footerContent={footerContent}
    />
  )
}





