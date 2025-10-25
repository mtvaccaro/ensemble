'use client'

import { useState, useMemo } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { CanvasReel, CanvasClip } from '@/types'
import { UniversalPanel } from './universal-panel'
import { ClipPanelFooter, ExportPlatform } from './clip-panel-footer'
import { EditableTitle } from '@/components/ui/editable-title'
import { 
  exportReelToVideo,
  isWebCodecsSupported,
  sanitizeFilename,
  type ClipExportData 
} from '@/lib/video-export'
import { useAudioPlayer } from '@/lib/audio-player-context'

interface ReelPanelContentProps {
  reel: CanvasReel
  clips: CanvasClip[] // All canvas clips to look up from
  onUpdateReel: (updatedReel: CanvasReel) => void
}

export function ReelPanelContent({ 
  reel, 
  clips,
  onUpdateReel
}: ReelPanelContentProps) {
  // Get audio player from context
  const audioPlayer = useAudioPlayer()
  
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [includeCaptions, setIncludeCaptions] = useState(true)
  const [includeWaveform, setIncludeWaveform] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('youtube')
  const [format, setFormat] = useState('shorts')
  const [searchQuery, setSearchQuery] = useState('')

  const webCodecsSupported = isWebCodecsSupported()

  // Get all clips in the reel
  const reelClips = useMemo(() => {
    return reel.clipIds
      .map(clipId => clips.find(c => c.id === clipId))
      .filter((c): c is CanvasClip => c !== undefined)
  }, [reel.clipIds, clips])

  // NOTE: Do NOT set playable items here in useEffect!
  // This causes the audio to restart on every render, creating choppy playback.
  // Playable items are set when the user clicks play in page.tsx

  // Get dimensions based on platform and format
  const getDimensions = () => {
    if (selectedPlatform === 'youtube') {
      if (format === 'shorts') return { width: 1080, height: 1920 }
      if (format === 'standard') return { width: 1920, height: 1080 }
    }
    if (selectedPlatform === 'instagram') {
      if (format === 'reels') return { width: 1080, height: 1920 }
      if (format === 'square') return { width: 1080, height: 1080 }
      if (format === 'portrait') return { width: 1080, height: 1350 }
    }
    if (selectedPlatform === 'linkedin') {
      if (format === 'square') return { width: 1080, height: 1080 }
      if (format === 'horizontal') return { width: 1920, height: 1080 }
      if (format === 'vertical') return { width: 1080, height: 1920 }
    }
    if (selectedPlatform === 'x') {
      if (format === 'horizontal') return { width: 1280, height: 720 }
      if (format === 'square') return { width: 1080, height: 1080 }
    }
    return { width: 1080, height: 1920 }
  }

  const dimensions = getDimensions()

  const handleExport = async () => {
    console.log('🎬 Export started - reel with', reelClips.length, 'clips')
    setIsExporting(true)
    setProgress(0)
    setIsComplete(false)
    setStatusMessage('Preparing export...')

    try {
      const clipData: ClipExportData[] = reelClips.map(clip => ({
        title: clip.title,
        audioUrl: clip.audioUrl,
        imageUrl: clip.imageUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        segments: clip.segments
      }))
      console.log('📊 Clip data prepared:', clipData)

      // Export as reel (concatenated clips)
      setStatusMessage('Generating reel...')
      const videoBlob = await exportReelToVideo(clipData, (p) => {
        setProgress(p * 100)
      }, { includeCaptions, includeWaveform, width: dimensions.width, height: dimensions.height })
      
      const filename = `${sanitizeFilename(reel.title)}.mp4`
      
      // Download the video
      const url = URL.createObjectURL(videoBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setStatusMessage('Export complete!')
      setIsComplete(true)
      setProgress(100)
      
      // Reset after 3 seconds
      setTimeout(() => {
        setStatusMessage('')
        setIsComplete(false)
        setProgress(0)
      }, 3000)
    } catch (error) {
      console.error('Export failed:', error)
      setStatusMessage('')
      setProgress(0)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Build concatenated transcript with clip headers and sequential timestamps
  const transcriptContent = useMemo(() => {
    if (reelClips.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-[#808080]">No clips in this reel</p>
        </div>
      )
    }

    let cumulativeTime = 0
    const segments: Array<{
      clipTitle: string
      clipIndex: number
      speaker: string | null
      text: string
      absoluteTime: number
      originalTime: number
    }> = []

    // Build concatenated transcript with sequential timestamps
    reelClips.forEach((clip, clipIndex) => {
      if (clip.segments && clip.segments.length > 0) {
        clip.segments.forEach(segment => {
          // Get speaker from first word in segment if available
          const speaker = segment.words?.[0]?.speaker || null
          segments.push({
            clipTitle: clip.title,
            clipIndex: clipIndex + 1,
            speaker,
            text: segment.text,
            absoluteTime: cumulativeTime + segment.start,
            originalTime: segment.start
          })
        })
      }
      cumulativeTime += clip.duration
    })

    // Filter by search query if provided
    const filteredSegments = searchQuery
      ? segments.filter(seg => 
          seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seg.speaker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          seg.clipTitle.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : segments

    if (filteredSegments.length === 0 && searchQuery) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-[#808080]">No matches found for &ldquo;{searchQuery}&rdquo;</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {filteredSegments.map((segment, idx) => {
          // Show clip header when we start a new clip
          const showClipHeader = idx === 0 || segment.clipIndex !== filteredSegments[idx - 1].clipIndex

          return (
            <div key={`${segment.clipIndex}-${idx}`}>
              {showClipHeader && (
                <div 
                  className="
                    bg-[#ffdbce] 
                    border-l-4 
                    border-[#ff6932] 
                    px-[12px] 
                    py-[8px] 
                    mb-[8px]
                    rounded-[4px]
                  "
                  style={{
                    fontFamily: 'Noto Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    lineHeight: '1.2',
                    letterSpacing: '-0.24px'
                  }}
                >
                  <span className="text-[#ff6932]">
                    Clip {segment.clipIndex}: {segment.clipTitle}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col gap-[4px]">
                <div className="flex gap-[8px] items-center">
                  <p
                    className="text-[#ff6932]"
                    style={{
                      fontFamily: 'Noto Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: '1.2',
                      letterSpacing: '-0.24px'
                    }}
                  >
                    {segment.speaker}
                  </p>
                  <p
                    className="text-[#808080]"
                    style={{
                      fontFamily: 'Noto Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: '1.2',
                      letterSpacing: '-0.24px'
                    }}
                  >
                    {formatTime(segment.absoluteTime)}
                  </p>
                </div>
                <p
                  className="text-black"
                  style={{
                    fontFamily: 'Noto Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '1.2',
                    letterSpacing: '-0.28px'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: searchQuery
                      ? segment.text.replace(
                          new RegExp(`(${searchQuery})`, 'gi'),
                          '<mark style="background-color: #ffdbce; color: #ff6932; font-weight: 600;">$1</mark>'
                        )
                      : segment.text
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [reelClips, searchQuery])

  // Footer content for export controls
  const footerContent = (
    <div className="flex flex-col gap-[16px]">
      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#ff6932] font-medium">{statusMessage}</span>
            <span className="text-[#808080]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[#e5e5e5] rounded-full h-2">
            <div
              className="bg-[#ff6932] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
          <CheckCircle className="h-5 w-5" />
          {statusMessage}
        </div>
      )}

      {/* Browser Support Warning */}
      {!webCodecsSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                Browser Not Supported
              </h4>
              <p className="text-sm text-yellow-800">
                Video export requires WebCodecs API. Please use Chrome 94+, Edge 94+, or Safari 16.4+.
              </p>
            </div>
          </div>
        </div>
      )}

      <ClipPanelFooter
        selectedPlatform={selectedPlatform}
        onPlatformChange={setSelectedPlatform}
        onExport={handleExport}
        previewUrl={undefined}
      />
    </div>
  )

  // Calculate cumulative time across all clips in the reel
  const cumulativeTime = useMemo(() => {
    if (!audioPlayer.currentItem) return 0
    
    // Find the index of the currently playing clip
    const currentClipIndex = reelClips.findIndex(clip => clip.id === audioPlayer.currentItem?.id)
    
    if (currentClipIndex === -1) return 0
    
    // Sum durations of all clips before the current one
    let cumulative = 0
    for (let i = 0; i < currentClipIndex; i++) {
      cumulative += reelClips[i].duration
    }
    
    // Add the current time within the current clip
    cumulative += audioPlayer.currentTime
    
    return cumulative
  }, [audioPlayer.currentItem, audioPlayer.currentTime, reelClips])
  
  // Create segment markers for visual timeline
  const timelineSegments = useMemo(() => {
    const segments = []
    let cumulative = 0
    
    for (const clip of reelClips) {
      segments.push({
        startTime: cumulative,
        endTime: cumulative + clip.duration,
        duration: clip.duration
      })
      cumulative += clip.duration
    }
    
    return segments
  }, [reelClips])

  return (
    <UniversalPanel
      variant="reel"
      title={
        <EditableTitle
          value={reel.title}
          onChange={(newTitle) => {
            onUpdateReel({ ...reel, title: newTitle, updatedAt: new Date().toISOString() })
          }}
          placeholder="Untitled Reel"
          maxLength={100}
          className="text-black -mx-[6px] -my-[2px]"
          style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: '1.4',
            letterSpacing: '-0.36px'
          }}
        />
      }
      duration={formatTime(reel.totalDuration)}
      isPlaying={audioPlayer.isPlaying}
      currentTime={cumulativeTime}
      timelineSegments={timelineSegments}
      onPlayPause={() => {
        if (audioPlayer.isPlaying) {
          audioPlayer.pause()
        } else {
          if (reelClips.length > 0) {
            // Check if we're resuming from a paused state or starting fresh
            const isResumingSameReel = audioPlayer.currentItem && reel.clipIds.includes(audioPlayer.currentItem.id)
            
            // Only set playable items if we're starting a new reel (not resuming)
            if (!isResumingSameReel) {
              audioPlayer.setPlayableItems(reelClips, reelClips)
            }
            
            // If resuming, play the current clip (resumes from current position)
            // If starting fresh, play the first clip
            audioPlayer.play(isResumingSameReel ? audioPlayer.currentItem! : reelClips[0])
          }
        }
      }}
      onSeek={(time) => {
        // Find which clip this time falls into and seek accordingly
        let cumulativeTime = 0
        for (const clip of reelClips) {
          if (time < cumulativeTime + clip.duration) {
            // Time falls in this clip
            const clipTime = time - cumulativeTime
            audioPlayer.seek(clipTime)
            break
          }
          cumulativeTime += clip.duration
        }
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      transcriptContent={transcriptContent}
      footerContent={footerContent}
    />
  )
}
