'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileText, Loader2, Scissors, RotateCcw, Clock, Search, X } from 'lucide-react'
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
  onTranscribe,
  isTranscribing = false
}: EpisodePanelContentProps) {
  const [startSegment, setStartSegment] = useState<TranscriptSegment | null>(null)
  const [endSegment, setEndSegment] = useState<TranscriptSegment | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<TranscriptSegment | null>(null)
  
  // Word-level precision state
  const [useWordLevel, setUseWordLevel] = useState(true)
  const [manualStartTime, setManualStartTime] = useState<number | null>(null)
  const [manualEndTime, setManualEndTime] = useState<number | null>(null)
  const [manualStartInput, setManualStartInput] = useState('')
  const [manualEndInput, setManualEndInput] = useState('')
  const [selectedText, setSelectedText] = useState('')
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
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
    setManualStartInput('')
    setManualEndInput('')
    setSelectedText('')
  }
  
  // Handler for word-level selection changes
  const handleWordLevelSelection = (selection: { startTime: number; endTime: number; text: string } | null) => {
    if (selection) {
      setManualStartTime(selection.startTime)
      setManualEndTime(selection.endTime)
      setSelectedText(selection.text)
      setManualStartInput(formatTimeInput(selection.startTime))
      setManualEndInput(formatTimeInput(selection.endTime))
    } else {
      setManualStartTime(null)
      setManualEndTime(null)
      setSelectedText('')
    }
  }
  
  // Format time for input fields (MM:SS.mmm)
  const formatTimeInput = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }
  
  // Parse time input (MM:SS.mmm or MM:SS or SS.mmm)
  const parseTimeInput = (input: string): number | null => {
    if (!input) return null
    
    try {
      const parts = input.split(':')
      let seconds = 0
      
      if (parts.length === 2) {
        // MM:SS.mmm format
        const mins = parseInt(parts[0])
        const secsParts = parts[1].split('.')
        const secs = parseInt(secsParts[0])
        const ms = secsParts[1] ? parseInt(secsParts[1].padEnd(3, '0')) : 0
        seconds = mins * 60 + secs + ms / 1000
      } else if (parts.length === 1) {
        // SS.mmm or SS format
        const secsParts = parts[0].split('.')
        const secs = parseInt(secsParts[0])
        const ms = secsParts[1] ? parseInt(secsParts[1].padEnd(3, '0')) : 0
        seconds = secs + ms / 1000
      }
      
      return isNaN(seconds) ? null : seconds
    } catch {
      return null
    }
  }
  
  // Handle manual time input changes
  const handleManualStartChange = (value: string) => {
    setManualStartInput(value)
    const parsed = parseTimeInput(value)
    if (parsed !== null) {
      setManualStartTime(parsed)
    }
  }
  
  const handleManualEndChange = (value: string) => {
    setManualEndInput(value)
    const parsed = parseTimeInput(value)
    if (parsed !== null) {
      setManualEndTime(parsed)
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
      {/* Toggle between word-level and segment-level (only if word data available) */}
      {hasTranscript && hasWordLevelData && (
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
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            />
            {searchQuery && (
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
        ) : useWordLevel && hasWordLevelData ? (
          <WordLevelTranscript
            segments={episode.transcript_segments || []}
            onSelectionChange={handleWordLevelSelection}
            startTime={manualStartTime}
            endTime={manualEndTime}
            searchQuery={searchQuery}
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

      {/* Fixed action buttons at bottom (only when range is selected) */}
      {selectedRange && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg">
          <div className="space-y-2">
            {/* Duration display */}
            <div className="text-center text-sm font-semibold text-gray-700">
              {formatDuration(selectedRange.duration)}
            </div>
            
            {/* Manual time inputs (only in word-level mode) */}
            {selectedRange.isWordLevel && (
              <div className="grid grid-cols-2 gap-2 pb-2">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    <Clock className="h-3 w-3" />
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={manualStartInput}
                    onChange={(e) => handleManualStartChange(e.target.value)}
                    placeholder="0:00.000"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                    <Clock className="h-3 w-3" />
                    End Time
                  </label>
                  <input
                    type="text"
                    value={manualEndInput}
                    onChange={(e) => handleManualEndChange(e.target.value)}
                    placeholder="0:00.000"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
            
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





