'use client'

import { useState, useMemo, useEffect } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { TranscriptSegment, CanvasEpisode, CanvasClip } from '@/types'
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
  
  // Word-level selection state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
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
  const totalWordCount = useMemo(() => {
    return episode.transcript_segments?.reduce((sum, seg) => sum + (seg.words?.length || 0), 0) || 0
  }, [episode.transcript_segments, episode.transcript_segments?.length])
  
  const hasWordLevelData = totalWordCount > 0

  const resetSelection = () => {
    setStartTime(null)
    setEndTime(null)
    setSelectedText('')
  }
  
  // Handler for word-level selection changes
  const handleWordLevelSelection = (selection: { startTime: number; endTime: number; text: string } | null) => {
    if (selection) {
      setStartTime(selection.startTime)
      setEndTime(selection.endTime)
      setSelectedText(selection.text)
    } else {
      setStartTime(null)
      setEndTime(null)
      setSelectedText('')
    }
  }
  
  const handleCreateClip = () => {
    if (startTime === null || endTime === null) return

    // Find segments that overlap with selected time range
    const segments = episode.transcript_segments || []
    const selectedSegments = segments.filter(seg => 
      (seg.start >= startTime && seg.start <= endTime) ||
      (seg.end >= startTime && seg.end <= endTime) ||
      (seg.start <= startTime && seg.end >= endTime)
    )

    // Default to "Untitled Clip" - user can rename inline
    const clipData: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'> = {
      type: 'clip',
      episodeId: episode.episodeId,
      podcastId: episode.podcastId,
      title: 'Untitled Clip',
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      startTime,
      endTime,
      duration: endTime - startTime,
      transcript: selectedText,
      segments: selectedSegments
    }

    onCreateClip(clipData)
    // Auto-reset after creating clip
    resetSelection()
  }

  // Calculate selected range for display
  const selectedRange = useMemo(() => {
    if (startTime === null || endTime === null) return null
    
    return {
      duration: endTime - startTime
    }
  }, [startTime, endTime])

  // Format duration for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
      ) : hasWordLevelData ? (
        <WordLevelTranscript
          segments={episode.transcript_segments || []}
          onSelectionChange={handleWordLevelSelection}
          startTime={startTime}
          endTime={endTime}
          searchQuery={searchQuery}
          onSearchInfoChange={setSearchInfo}
        />
      ) : (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-[#3d00f6] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#808080]">
            Processing word-level data...
          </p>
        </div>
      )}
    </div>
  )

  // Footer content to pass to UniversalPanel
  const footerContent = selectedRange ? (
    <SourcePanelFooter
      duration={selectedRange.duration}
      startTime={startTime ?? 0}
      endTime={endTime ?? 0}
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





