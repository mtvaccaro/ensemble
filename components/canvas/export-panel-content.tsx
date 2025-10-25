'use client'

import { useState } from 'react'
import { Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { CanvasClip } from '@/types'
import { UniversalPanel } from './universal-panel'
import { ClipPanelFooter, ExportPlatform } from './clip-panel-footer'
import { EditableTitle } from '@/components/ui/editable-title'
import { 
  exportClipToVideo,
  exportReelToVideo, 
  isWebCodecsSupported,
  sanitizeFilename,
  type ClipExportData 
} from '@/lib/video-export'
import { useAudioPlayer } from '@/lib/audio-player-context'

interface ExportPanelContentProps {
  clips: CanvasClip[]
  onExportComplete?: () => void
  onUpdateClip?: (clipId: string, updates: Partial<CanvasClip>) => void
}

export function ExportPanelContent({ clips, onExportComplete, onUpdateClip }: ExportPanelContentProps) {
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

  // Use the first clip for display (or first clip if it's a reel)
  const displayClip = clips[0]

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
    console.log('🎬 Export started - clips:', clips.length, clips)
    setIsExporting(true)
    setProgress(0)
    setIsComplete(false)
    setStatusMessage('Preparing export...')

    try {
      const clipData: ClipExportData[] = clips.map(clip => ({
        title: clip.title,
        audioUrl: clip.audioUrl,
        imageUrl: clip.imageUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        segments: clip.segments
      }))
      console.log('📊 Clip data prepared:', clipData)

      let videoBlob: Blob
      let filename: string

      if (clips.length > 1) {
        // Export as reel (concatenated clips)
        setStatusMessage('Generating reel...')
        videoBlob = await exportReelToVideo(clipData, (p) => {
          setProgress(p * 100)
        }, { includeCaptions, includeWaveform, width: dimensions.width, height: dimensions.height })
        filename = `reel-${clips.length}-clips.mp4`
      } else {
        // Export single clip
        setStatusMessage('Generating video...')
        videoBlob = await exportClipToVideo(clipData[0], (p) => {
          setProgress(p * 100)
        }, { includeCaptions, includeWaveform, width: dimensions.width, height: dimensions.height })
        filename = `${sanitizeFilename(clipData[0].title)}.mp4`
      }
      
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
      onExportComplete?.()
      
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

  // Transcript content for the clip
  const transcriptContent = (
    <div className="space-y-4">
      {/* Clip transcript segments */}
      {displayClip.segments && displayClip.segments.length > 0 ? (
        <div className="space-y-4">
          {displayClip.segments.map((segment, idx) => (
            <div key={idx} className="flex flex-col gap-[4px]">
              <div className="flex gap-[8px] items-center">
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
                  {formatTime(segment.start)}
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
              >
                {segment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-[#808080]">No transcript available</p>
        </div>
      )}
    </div>
  )

  // Footer content with export controls
  const footerContent = (
    <div className="flex flex-col gap-[16px]">
      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#ac00f6] font-medium">{statusMessage}</span>
            <span className="text-[#808080]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[#e5e5e5] rounded-full h-2">
            <div 
              className="bg-[#ac00f6] h-2 rounded-full transition-all duration-300"
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
        previewUrl={undefined} // TODO: Generate preview video blob
      />
    </div>
  )

  return (
    <UniversalPanel
      variant="clip"
      title={
        <EditableTitle
          value={displayClip.title}
          onChange={(newTitle) => {
            onUpdateClip?.(displayClip.id, { title: newTitle })
          }}
          placeholder="Untitled Clip"
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
      duration={formatTime(displayClip.duration)}
      isPlaying={audioPlayer.isPlaying}
      currentTime={audioPlayer.currentTime}
      onPlayPause={() => {
        // Always pass the clip when toggling from the panel
        if (audioPlayer.isPlaying) {
          audioPlayer.pause()
        } else {
          audioPlayer.play(displayClip)
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
