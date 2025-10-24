'use client'

import { useState } from 'react'
import { Download, Loader2, AlertCircle, CheckCircle, Music2, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react'
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
  const [includeCaptions, setIncludeCaptions] = useState(true)
  const [includeWaveform, setIncludeWaveform] = useState(true)
  const [platform, setPlatform] = useState('instagram')
  const [format, setFormat] = useState('reels')

  const webCodecsSupported = isWebCodecsSupported()

  // Get dimensions based on platform and format
  const getDimensions = () => {
    if (platform === 'tiktok') return { width: 1080, height: 1920, label: 'Vertical (9:16)' }
    if (platform === 'instagram') {
      if (format === 'reels') return { width: 1080, height: 1920, label: 'Reels/Stories (9:16)' }
      if (format === 'square') return { width: 1080, height: 1080, label: 'Feed Square (1:1)' }
      if (format === 'portrait') return { width: 1080, height: 1350, label: 'Feed Portrait (4:5)' }
    }
    if (platform === 'youtube') {
      if (format === 'shorts') return { width: 1080, height: 1920, label: 'Shorts (9:16)' }
      if (format === 'standard') return { width: 1920, height: 1080, label: 'Standard (16:9)' }
    }
    if (platform === 'linkedin') {
      if (format === 'square') return { width: 1080, height: 1080, label: 'Square (1:1)' }
      if (format === 'horizontal') return { width: 1920, height: 1080, label: 'Horizontal (16:9)' }
      if (format === 'vertical') return { width: 1080, height: 1920, label: 'Vertical (9:16)' }
    }
    if (platform === 'twitter') {
      if (format === 'horizontal') return { width: 1280, height: 720, label: 'Horizontal (16:9)' }
      if (format === 'square') return { width: 1080, height: 1080, label: 'Square (1:1)' }
    }
    return { width: 1080, height: 1080, label: 'Square (1:1)' }
  }

  const dimensions = getDimensions()

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
        duration: clip.duration,
        segments: clip.segments
      }))

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Platform & Format Selection */}
      <div className="space-y-4">
        {/* Platform - Segmented Control */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Select Platform
          </label>
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
            <button
              onClick={() => {
                setPlatform('tiktok')
                setFormat('vertical')
              }}
              className={`px-4 py-2.5 rounded-md transition-all duration-200 min-w-[56px] flex items-center justify-center ${
                platform === 'tiktok' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="TikTok"
            >
              <Music2 className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                setPlatform('instagram')
                setFormat('reels')
              }}
              className={`px-4 py-2.5 rounded-md transition-all duration-200 min-w-[56px] flex items-center justify-center ${
                platform === 'instagram' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Instagram"
            >
              <Instagram className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                setPlatform('youtube')
                setFormat('shorts')
              }}
              className={`px-4 py-2.5 rounded-md transition-all duration-200 min-w-[56px] flex items-center justify-center ${
                platform === 'youtube' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="YouTube"
            >
              <Youtube className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                setPlatform('linkedin')
                setFormat('square')
              }}
              className={`px-4 py-2.5 rounded-md transition-all duration-200 min-w-[56px] flex items-center justify-center ${
                platform === 'linkedin' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="LinkedIn"
            >
              <Linkedin className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                setPlatform('twitter')
                setFormat('horizontal')
              }}
              className={`px-4 py-2.5 rounded-md transition-all duration-200 min-w-[56px] flex items-center justify-center ${
                platform === 'twitter' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Twitter/X"
            >
              <Twitter className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Format - conditional based on platform (Radio buttons) */}
        {platform === 'instagram' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="reels"
                  checked={format === 'reels'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Reels / Stories (9:16)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="square"
                  checked={format === 'square'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Feed Square (1:1)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="portrait"
                  checked={format === 'portrait'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Feed Portrait (4:5)</span>
              </label>
            </div>
          </div>
        )}

        {platform === 'youtube' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="shorts"
                  checked={format === 'shorts'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Shorts (9:16)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="standard"
                  checked={format === 'standard'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Standard (16:9)</span>
              </label>
            </div>
          </div>
        )}

        {platform === 'linkedin' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="square"
                  checked={format === 'square'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Square (1:1)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="horizontal"
                  checked={format === 'horizontal'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Horizontal (16:9)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="vertical"
                  checked={format === 'vertical'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Vertical (9:16)</span>
              </label>
            </div>
          </div>
        )}

        {platform === 'twitter' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="horizontal"
                  checked={format === 'horizontal'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Horizontal (16:9)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value="square"
                  checked={format === 'square'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-900">Square (1:1)</span>
              </label>
            </div>
          </div>
        )}
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

      {/* Export Options - Reduced size */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Export Options
        </label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={includeCaptions}
              onChange={(e) => setIncludeCaptions(e.target.checked)}
              className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-xs text-gray-900">Include Captions</span>
          </label>
          
          <label className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={includeWaveform}
              onChange={(e) => setIncludeWaveform(e.target.checked)}
              className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-xs text-gray-900">Include Waveform</span>
          </label>
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
