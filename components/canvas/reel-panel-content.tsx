'use client'

import { useState } from 'react'
import { GripVertical, X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CanvasReel, CanvasClip } from '@/types'

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDragStart = (e: React.DragEvent, clipId: string, _index: number) => {
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
                onDragStart={(e) => handleDragStart(e, clipId, index)}
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
      <div className="border-t pt-4">
        <Button className="w-full bg-orange-600 hover:bg-orange-700">
          Export Reel
        </Button>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Export all clips as a continuous sequence
        </p>
      </div>
    </div>
  )
}

