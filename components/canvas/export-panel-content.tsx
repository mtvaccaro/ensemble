'use client'

import { useState } from 'react'
import { Download, FileAudio, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasClip } from '@/types'

interface ExportPanelContentProps {
  clips: CanvasClip[]
  onExportComplete?: () => void
}

export function ExportPanelContent({ clips, onExportComplete }: ExportPanelContentProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav'>('mp3')
  const [exportType, setExportType] = useState<'individual' | 'splice'>('individual')

  const handleExport = async () => {
    setIsExporting(true)

    try {
      if (exportType === 'individual') {
        for (const clip of clips) {
          await exportSingleClip(clip)
        }
      } else {
        await exportSplicedClips(clips)
      }
      onExportComplete?.()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const exportSingleClip = async (clip: CanvasClip) => {
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
  }

  const exportSplicedClips = async (clips: CanvasClip[]) => {
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
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Export {clips.length} Clip{clips.length !== 1 ? 's' : ''}
        </h3>
        <p className="text-sm text-gray-600">
          Total duration: {formatDuration(totalDuration)}
        </p>
      </div>

      {/* Export Type */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Export Type
        </label>
        <div className="space-y-2">
          <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
            <input
              type="radio"
              name="exportType"
              value="individual"
              checked={exportType === 'individual'}
              onChange={(e) => setExportType(e.target.value as any)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Individual Clips</div>
              <div className="text-xs text-gray-600">
                Export each clip as a separate audio file
              </div>
            </div>
          </label>
          
          <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
            <input
              type="radio"
              name="exportType"
              value="splice"
              checked={exportType === 'splice'}
              onChange={(e) => setExportType(e.target.value as any)}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 text-sm">Spliced Compilation</div>
              <div className="text-xs text-gray-600">
                Combine all clips into one continuous audio file
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Audio Format
        </label>
        <div className="flex gap-3">
          <label className="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors flex-1 justify-center">
            <input
              type="radio"
              name="format"
              value="mp3"
              checked={exportFormat === 'mp3'}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="mr-2"
            />
            <span className="font-medium text-gray-900 text-sm">MP3</span>
          </label>
          
          <label className="flex items-center px-4 py-2 border rounded-lg cursor-pointer hover:border-purple-500 transition-colors flex-1 justify-center">
            <input
              type="radio"
              name="format"
              value="wav"
              checked={exportFormat === 'wav'}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="mr-2"
            />
            <span className="font-medium text-gray-900 text-sm">WAV</span>
          </label>
        </div>
      </div>

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
              <FileAudio className="h-5 w-5 text-purple-600 flex-shrink-0" />
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
              Exporting clip metadata (JSON files with timestamps and audio URLs). 
              For full audio file generation, we'll add FFmpeg server-side processing.
            </p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full bg-purple-600 hover:bg-purple-700"
        size="lg"
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
  )
}

