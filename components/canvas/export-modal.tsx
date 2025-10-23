'use client'

import { useState } from 'react'
import { X, Download, Video, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasClip } from '@/types'
import { 
  exportClipToVideo, 
  exportReelToVideo, 
  isWebCodecsSupported,
  sanitizeFilename,
  type ClipExportData 
} from '@/lib/video-export'

interface ExportModalProps {
  clips: CanvasClip[]
  onClose: () => void
}

export function ExportModal({ clips, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<'individual' | 'reel'>('individual')
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

      if (exportType === 'individual') {
        // Export first clip
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
      } else {
        // Export reel
        setStatusMessage('Generating reel...')
        videoBlob = await exportReelToVideo(clipData, (p) => {
          setProgress(p * 100)
        })
        
        // Download the video
        const url = URL.createObjectURL(videoBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reel-${clips.length}-clips.mp4`
        a.click()
        URL.revokeObjectURL(url)
      }

      setStatusMessage('Export complete!')
      setIsComplete(true)
      setProgress(100)
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Export to MP4 Video
            </h2>
            <p className="text-sm text-gray-600">
              {clips.length} clip{clips.length !== 1 ? 's' : ''} · Total duration: {formatDuration(totalDuration)} · 1080x1080 (LinkedIn optimized)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            disabled={isExporting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Export Type
            </label>
            <div className="space-y-2">
              <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="individual"
                  checked={exportType === 'individual'}
                  onChange={(e) => setExportType(e.target.value as 'individual' | 'reel')}
                  className="mt-1 mr-3"
                  disabled={!webCodecsSupported}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Individual Clips</div>
                  <div className="text-sm text-gray-600">
                    Export each clip as a separate MP4 video
                  </div>
                </div>
              </label>
              
              <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="reel"
                  checked={exportType === 'reel'}
                  onChange={(e) => setExportType(e.target.value as 'individual' | 'reel')}
                  className="mt-1 mr-3"
                  disabled={!webCodecsSupported}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Reel (Concatenated)</div>
                  <div className="text-sm text-gray-600">
                    Combine all clips into one continuous video
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Clip List */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Clips to Export
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {clips.map((clip, index) => (
                <div key={clip.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{clip.title}</div>
                    <div className="text-xs text-gray-600">{formatDuration(clip.duration)}</div>
                  </div>
                  <Video className="h-5 w-5 text-purple-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Client-Side Video Generation
                </h4>
                <p className="text-sm text-blue-800">
                  Video is generated entirely in your browser using WebCodecs. 
                  No server upload needed - fast and private!
                </p>
              </div>
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
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle className="h-5 w-5" />
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button 
            onClick={onClose} 
            variant="outline"
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !webCodecsSupported}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
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
      </div>
    </div>
  )
}
