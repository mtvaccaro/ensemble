'use client'

import { useState } from 'react'
import { X, Download, FileAudio, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasClip } from '@/types'

interface ExportModalProps {
  clips: CanvasClip[]
  onClose: () => void
}

export function ExportModal({ clips, onClose }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav'>('mp3')
  const [exportType, setExportType] = useState<'individual' | 'splice'>('individual')

  const handleExport = async () => {
    setIsExporting(true)

    try {
      if (exportType === 'individual') {
        // Export each clip individually
        for (const clip of clips) {
          await exportSingleClip(clip)
        }
      } else {
        // Export all clips spliced together
        await exportSplicedClips(clips)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportSingleClip = async (clip: CanvasClip) => {
    // For now, we'll create a simple download link
    // In production, this would call an API route that uses FFmpeg to trim audio
    
    // Create a metadata JSON file for the clip
    const metadata = {
      title: clip.title,
      audioUrl: clip.audioUrl,
      startTime: clip.startTime,
      endTime: clip.endTime,
      duration: clip.duration,
      transcript: clip.transcript,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(clip.title)}.json`
    a.click()
    URL.revokeObjectURL(url)

    // Show instructions for manual trimming
    console.log(`To trim audio manually:`)
    console.log(`  Audio URL: ${clip.audioUrl}`)
    console.log(`  Start: ${clip.startTime}s, End: ${clip.endTime}s`)
    console.log(`  Use: ffmpeg -i audio.mp3 -ss ${clip.startTime} -to ${clip.endTime} -c copy output.mp3`)
  }

  const exportSplicedClips = async (clips: CanvasClip[]) => {
    // Export metadata for all clips that need to be spliced
    const metadata = {
      title: `Compilation of ${clips.length} clips`,
      clips: clips.map(clip => ({
        title: clip.title,
        audioUrl: clip.audioUrl,
        startTime: clip.startTime,
        endTime: clip.endTime,
        transcript: clip.transcript
      })),
      totalDuration: clips.reduce((sum, clip) => sum + clip.duration, 0),
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compilation-${clips.length}-clips.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sanitizeFilename = (filename: string): string => {
    return filename
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .substring(0, 50)
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
              Export Clips
            </h2>
            <p className="text-sm text-gray-600">
              {clips.length} clip{clips.length !== 1 ? 's' : ''} · Total duration: {formatDuration(totalDuration)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  onChange={(e) => setExportType(e.target.value as 'individual' | 'splice' | 'mp3' | 'wav')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Individual Clips</div>
                  <div className="text-sm text-gray-600">
                    Export each clip as a separate audio file
                  </div>
                </div>
              </label>
              
              <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="splice"
                  checked={exportType === 'splice'}
                  onChange={(e) => setExportType(e.target.value as 'individual' | 'splice' | 'mp3' | 'wav')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Spliced Compilation</div>
                  <div className="text-sm text-gray-600">
                    Combine all clips into one continuous audio file
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Audio Format
            </label>
            <div className="flex gap-3">
              <label className="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="mp3"
                  checked={exportFormat === 'mp3'}
                  onChange={(e) => setExportFormat(e.target.value as 'individual' | 'splice' | 'mp3' | 'wav')}
                  className="mr-2"
                />
                <span className="font-medium text-gray-900">MP3</span>
              </label>
              
              <label className="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="wav"
                  checked={exportFormat === 'wav'}
                  onChange={(e) => setExportFormat(e.target.value as 'individual' | 'splice' | 'mp3' | 'wav')}
                  className="mr-2"
                />
                <span className="font-medium text-gray-900">WAV</span>
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
                  <FileAudio className="h-5 w-5 text-purple-600" />
                </div>
              ))}
            </div>
          </div>

          {/* MVP Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  MVP Export Mode
                </h4>
                <p className="text-sm text-blue-800">
                  This will export clip metadata (JSON files with timestamps and audio URLs). 
                  For full audio file generation, we&apos;ll need to add FFmpeg server-side processing.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  The JSON files can be used with external tools or a future export API.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {clips.length} Clip{clips.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

