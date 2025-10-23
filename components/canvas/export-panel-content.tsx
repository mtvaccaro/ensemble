'use client'

import { useState } from 'react'
import { Download, Video, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasClip } from '@/types'
import { 
  exportClipToVideo, 
  exportReelToVideo, 
  isWebCodecsSupported,
  sanitizeFilename,
  type ClipExportData 
} from '@/lib/video-export'

interface ExportPanelContentProps {
  clips: CanvasClip[]
  onExportComplete?: () => void
}

export function ExportPanelContent({ clips, onExportComplete }: ExportPanelContentProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)

  const webCodecsSupported = isWebCodecsSupported()

  const handleExport = async () => {
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
        duration: clip.duration
      }))

      let videoBlob: Blob

      // Always export as individual clip
      setStatusMessage('Generating video...')
      videoBlob = await exportClipToVideo(clipData[0], (p) => {
        setProgress(p * 100)
      })
      
      // Download the video
      const url = URL.createObjectURL(videoBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFilename(clipData[0].title)}.mp4`
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Export to MP4 Video
        </h3>
        <p className="text-sm text-gray-600">
          {clips.length} clip{clips.length !== 1 ? 's' : ''} · {formatDuration(totalDuration)} · 1080x1080 (LinkedIn optimized)
        </p>
      </div>

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

      {/* Clip List */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Clips to Export
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {clips.map((clip, index) => (
            <div key={clip.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate text-sm">{clip.title}</div>
                <div className="text-xs text-gray-600">{formatDuration(clip.duration)}</div>
              </div>
              <Video className="h-5 w-5 text-purple-600 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-600 font-medium">{statusMessage}</span>
            <span className="text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
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

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting || !webCodecsSupported}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exporting Video...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export as MP4
          </>
        )}
      </Button>
    </div>
  )
}
