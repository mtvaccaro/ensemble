'use client'

import { useState } from 'react'
import { GripVertical, X, Play, Download, Loader2, CheckCircle, AlertCircle, Music2, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasReel, CanvasClip } from '@/types'
import { 
  exportReelToVideo,
  isWebCodecsSupported,
  sanitizeFilename,
  type ClipExportData 
} from '@/lib/video-export'

interface ReelPanelContentProps {
  reel: CanvasReel
  clips: CanvasClip[] // All canvas clips to look up from
  onUpdateReel: (updatedReel: CanvasReel) => void
  onRemoveClip: (clipId: string) => void
  onPlayClip: (clipId: string) => void
}

export function ReelPanelContent({ 
  reel, 
  clips,
  onUpdateReel,
  onRemoveClip,
  onPlayClip
}: ReelPanelContentProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isComplete, setIsComplete] = useState(false)
  const [includeCaptions, setIncludeCaptions] = useState(true)
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDragStart = (e: React.DragEvent, clipId: string) => {
    setDraggedClipId(clipId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (!draggedClipId) return

    const dragIndex = reel.clipIds.indexOf(draggedClipId)
    if (dragIndex === -1) return

    // Reorder the clipIds array
    const newClipIds = [...reel.clipIds]
    newClipIds.splice(dragIndex, 1)
    newClipIds.splice(dropIndex, 0, draggedClipId)

    // Update the reel
    onUpdateReel({
      ...reel,
      clipIds: newClipIds,
      updatedAt: new Date().toISOString()
    })

    setDraggedClipId(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedClipId(null)
    setDragOverIndex(null)
  }

  const handleExport = async () => {
    setIsExporting(true)
    setProgress(0)
    setIsComplete(false)
    setStatusMessage('Preparing export...')

    try {
      // Get clips in order from the reel
      const reelClips = reel.clipIds
        .map(clipId => clips.find(c => c.id === clipId))
        .filter((clip): clip is CanvasClip => clip !== undefined)

      if (reelClips.length === 0) {
        alert('This reel has no clips to export')
        return
      }

      const clipData: ClipExportData[] = reelClips.map(clip => ({
        title: clip.title,
        audioUrl: clip.audioUrl,
        imageUrl: clip.imageUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        segments: clip.segments
      }))

      setStatusMessage('Generating reel...')
      const videoBlob = await exportReelToVideo(clipData, (p) => {
        setProgress(p * 100)
      }, { includeCaptions, width: dimensions.width, height: dimensions.height })
      
      // Download the video
      const url = URL.createObjectURL(videoBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizeFilename(reel.title)}.mp4`
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

  return (
    <div className="p-4 space-y-4">
      {/* Reel Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎬</span>
          <h3 className="text-lg font-bold text-gray-900">{reel.title}</h3>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>{reel.clipIds.length} clips</div>
          <div>Total duration: {formatDuration(reel.totalDuration)}</div>
        </div>
      </div>

      {/* Clip List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">Clips (drag to reorder)</h4>
        </div>

        <div className="space-y-2">
          {reel.clipIds.map((clipId, index) => {
            const clip = clips.find(c => c.id === clipId)
            if (!clip) return null

            const isDragging = draggedClipId === clipId
            const isDropTarget = dragOverIndex === index

            return (
              <div
                key={clipId}
                draggable
                onDragStart={(e) => handleDragStart(e, clipId)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  bg-white border rounded-lg p-3 transition-all
                  ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
                  ${isDropTarget ? 'border-orange-400 border-2' : 'border-gray-200'}
                  hover:border-orange-300 cursor-move
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Clip number */}
                  <div className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                    {index + 1}
                  </div>

                  {/* Clip info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {clip.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDuration(clip.duration)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => onPlayClip(clipId)}
                      className="p-1.5 hover:bg-orange-100 rounded transition-colors"
                      title="Play clip"
                    >
                      <Play className="h-4 w-4 text-orange-600" />
                    </button>
                    <button
                      onClick={() => onRemoveClip(clipId)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Remove from reel"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Export Section */}
      <div className="border-t pt-4 space-y-3">
        {/* Browser Support Warning */}
        {!webCodecsSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-yellow-800">
                  Video export requires WebCodecs API. Please use Chrome 94+, Edge 94+, or Safari 16.4+.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Platform & Format Selection */}
        <div className="space-y-3">
          {/* Platform - Segmented Control */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
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
                    ? 'bg-orange-600 text-white shadow-sm' 
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
                    ? 'bg-orange-600 text-white shadow-sm' 
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
                    ? 'bg-orange-600 text-white shadow-sm' 
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
                    ? 'bg-orange-600 text-white shadow-sm' 
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
                    ? 'bg-orange-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                title="Twitter/X"
              >
                <Twitter className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Format - conditional based on platform */}
          {platform === 'instagram' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="reels">Reels / Stories (9:16)</option>
                <option value="square">Feed Square (1:1)</option>
                <option value="portrait">Feed Portrait (4:5)</option>
              </select>
            </div>
          )}

          {platform === 'youtube' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="shorts">Shorts (9:16)</option>
                <option value="standard">Standard (16:9)</option>
              </select>
            </div>
          )}

          {platform === 'linkedin' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="square">Square (1:1)</option>
                <option value="horizontal">Horizontal (16:9)</option>
                <option value="vertical">Vertical (9:16)</option>
              </select>
            </div>
          )}

          {platform === 'twitter' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="horizontal">Horizontal (16:9)</option>
                <option value="square">Square (1:1)</option>
              </select>
            </div>
          )}
        </div>

        {/* Export Options */}
        <div>
          <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={includeCaptions}
              onChange={(e) => setIncludeCaptions(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Include Captions</div>
              <div className="text-xs text-gray-500">Add transcript as subtitles on video</div>
            </div>
          </label>
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-600 font-medium">{statusMessage}</span>
              <span className="text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {isComplete && (
          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <CheckCircle className="h-4 w-4" />
            {statusMessage}
          </div>
        )}

        <Button 
          onClick={handleExport}
          disabled={isExporting || !webCodecsSupported}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting Video...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Reel
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center">
          Export all clips as a continuous sequence
        </p>
      </div>
    </div>
  )
}

