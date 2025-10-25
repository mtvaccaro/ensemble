'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileText, Loader2, Scissors, RotateCcw, Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TranscriptSegment, CanvasEpisode, CanvasClip } from '@/types'
import { SearchableTranscript } from '@/components/episodes/searchable-transcript'
import { WordLevelTranscript } from '@/components/episodes/word-level-transcript'

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
    const hasWords = episode.transcript_segments?.some(seg => seg.words && seg.words.length > 0) || false
    console.log('🔍 hasWordLevelData check:', {
      segmentCount: episode.transcript_segments?.length || 0,
      firstSegmentHasWords: episode.transcript_segments?.[0]?.words?.length || 0,
      hasWords,
      useWordLevel
    })
    return hasWords
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  return (
    <div className="relative h-full flex flex-col">
      {/* Toggle between word-level and segment-level - Hidden for POC (keeping logic for future free/premium tiers) */}
      {hasTranscript && hasWordLevelData && false && (
        <div className="px-3 pt-3 pb-2 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-700">Selection Mode:</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUseWordLevel(true)
                  resetSelection()
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  useWordLevel 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Word-level
              </button>
              <button
                onClick={() => {
                  setUseWordLevel(false)
                  resetSelection()
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  !useWordLevel 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Segment-level
              </button>
            </div>
          </div>
        </div>
      )}
      
      {hasTranscript && hasWordLevelData && (
        <div className="px-3 pt-3 pb-2 bg-gray-50">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-32 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder:text-gray-500"
            />
            {searchQuery && searchInfo && searchInfo.matchCount > 0 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-xs text-gray-600 font-medium">
                  {searchInfo.currentIndex + 1}/{searchInfo.matchCount}
                </span>
                <button
                  onClick={searchInfo.goToPrev}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Previous match"
                >
                  <ChevronUp className="h-3 w-3 text-gray-600" />
                </button>
                <button
                  onClick={searchInfo.goToNext}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Next match"
                >
                  <ChevronDown className="h-3 w-3 text-gray-600" />
                </button>
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-gray-100 rounded ml-1"
                  title="Clear search"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            )}
            {searchQuery && (!searchInfo || searchInfo.matchCount === 0) && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded p-1"
                title="Clear search"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transcript Section */}
      <div className="flex-1 px-2 pt-4 overflow-y-auto" style={{ paddingBottom: selectedRange ? (selectedRange.isWordLevel ? '220px' : '140px') : '0' }}>
        {!hasTranscript ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            {isTranscribing ? (
              // Loading skeleton while transcription is in progress
              <div className="space-y-4 px-4">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Transcribing Episode...
                  </h4>
                  <p className="text-xs text-gray-600">
                    This usually takes 20-60 seconds
                  </p>
                </div>
                {/* Skeleton lines */}
                <div className="space-y-2 pt-4">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6 mx-auto"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6 mx-auto"></div>
                </div>
              </div>
            ) : (
              // No transcript and not transcribing (shouldn't happen with auto-transcribe)
              <div>
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  No Transcript Available
                </h4>
                <p className="text-sm text-gray-600">
                  Transcript will be generated automatically
                </p>
              </div>
            )}
          </div>
        ) : useWordLevel && hasWordLevelData ? (
          <>
            {console.log('✅ Rendering WordLevelTranscript')}
            <WordLevelTranscript
              segments={episode.transcript_segments || []}
              onSelectionChange={handleWordLevelSelection}
              startTime={manualStartTime}
              endTime={manualEndTime}
              searchQuery={searchQuery}
              onSearchInfoChange={setSearchInfo}
            />
          </>
        ) : (
          <>
            {console.log('❌ Rendering SearchableTranscript (fallback)', { useWordLevel, hasWordLevelData })}
            <SearchableTranscript
              segments={episode.transcript_segments || []}
              onSegmentClick={handleSegmentClick}
              onSegmentHover={handleSegmentHover}
              startSegment={startSegment}
              endSegment={endSegment}
              previewRange={previewRange}
            />
          </>
        )}
      </div>

      {/* Fixed action buttons at bottom (only when range is selected) */}
      {selectedRange && (() => {
        // Compute start/end times based on selection type
        const startTime = useWordLevel 
          ? (manualStartTime ?? 0)
          : (startSegment?.start ?? 0)
        const endTime = useWordLevel
          ? (manualEndTime ?? 0)
          : (endSegment?.end ?? 0)
        
        return (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg">
            <div className="space-y-3">
              {/* Clip metadata - Duration, Start, End as read-only labels */}
              <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-gray-200">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Duration</div>
                  <div className="text-xs font-semibold text-gray-900">{formatDuration(selectedRange.duration)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Start</div>
                  <div className="text-xs font-mono text-gray-900">{formatDuration(startTime)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">End</div>
                  <div className="text-xs font-mono text-gray-900">{formatDuration(endTime)}</div>
                </div>
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
        )
      })()}
    </div>
  )
}





