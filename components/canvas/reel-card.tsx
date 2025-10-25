'use client'

import React, { useState } from 'react'
import { GripVertical, X, Play, Pause } from 'lucide-react'
import { EditableTitle } from '@/components/ui/editable-title'
import { CanvasClip } from '@/types'

interface ReelCardProps {
  id: string
  title: string
  clipIds: string[]
  clips: CanvasClip[] // All available clips to look up from
  totalDuration: number
  isActive?: boolean
  isPlaying?: boolean
  onClick?: () => void
  onPlayClick?: (e: React.MouseEvent) => void
  onTitleChange?: (newTitle: string) => void
  onReorderClips?: (newClipIds: string[]) => void
  onRemoveClip?: (clipId: string) => void
}

/**
 * Reel Card Component - Built from Figma Design (node 28-1231)
 * 
 * Uses ALL exact Figma design tokens:
 * - Spacing: gap-[4px], gap-[8px], p-[16px], px-[6px], py-[2px]
 * - Border radius: rounded-[6px], rounded-[12px]
 * - Colors: #ff6932 (reel-5), #ffdbce (reel-1)
 * - Typography: Title/sm (14px/600), Meta/med (12px/500)
 * 
 * States:
 * - default: light orange border (#ffdbce), light orange badge bg
 * - active: orange border (#ff6932), orange badge bg
 */
export function ReelCard({
  id,
  title,
  clipIds,
  clips,
  totalDuration,
  isActive = false,
  isPlaying = false,
  onClick,
  onPlayClick,
  onTitleChange,
  onReorderClips,
  onRemoveClip
}: ReelCardProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDragStart = (e: React.DragEvent, clipId: string) => {
    e.stopPropagation()
    setDraggedClipId(clipId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedClipId) return

    const dragIndex = clipIds.indexOf(draggedClipId)
    if (dragIndex === -1) return

    // Reorder the clipIds array
    const newClipIds = [...clipIds]
    newClipIds.splice(dragIndex, 1)
    newClipIds.splice(dropIndex, 0, draggedClipId)

    onReorderClips?.(newClipIds)
    setDraggedClipId(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedClipId(null)
    setDragOverIndex(null)
  }

  return (
    <div className="flex flex-col gap-[4px] items-start w-full">
      {/* Reel Badge - Using exact Figma tokens */}
      <div className="pl-[16px]">
        <div 
          className={`
            inline-flex 
            items-center 
            justify-center 
            px-[6px] 
            py-[2px] 
            rounded-[6px]
            transition-all
            ${isActive 
              ? 'bg-[#ff6932]' 
              : 'bg-[#ffdbce]'
            }
          `}
        >
          <span 
            className={`
              font-medium 
              leading-[100%]
              ${isActive ? 'text-white' : 'text-[#ff6932]'}
            `}
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              letterSpacing: '-0.24px'
            }}
          >
            Reel
          </span>
        </div>
      </div>

      {/* Card - Using exact Figma tokens */}
      <div
        onClick={onClick}
        className={`
          bg-white
          border-[2px]
          rounded-[12px]
          p-[16px]
          w-full
          cursor-pointer
          transition-all
          ${isActive 
            ? 'border-[#ff6932] shadow-lg ring-4 ring-[#ff6932]' 
            : 'border-[#ffdbce] hover:border-[#ff6932]'
          }
        `}
      >
        {/* Content wrapper with exact spacing */}
        <div className="flex flex-col gap-[8px] w-full">
          
          {/* Header: Play button + Title/Duration */}
          <div className="flex gap-[8px] items-start w-full">
            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayClick?.(e)
              }}
              className="
                relative
                shrink-0
                w-[32px]
                h-[32px]
                rounded-[80px]
                bg-[#ff6932]
                flex
                items-center
                justify-center
                hover:scale-110
                transition-transform
              "
              aria-label={isPlaying ? "Pause reel" : "Play reel"}
            >
              {isPlaying ? (
                <Pause className="w-[24px] h-[24px] text-white fill-white" />
              ) : (
                <Play className="w-[24px] h-[24px] text-white fill-white ml-0.5" />
              )}
            </button>

            {/* Title + Total Duration */}
            <div className="flex-1 min-w-0 flex flex-col gap-[2px] justify-center">
              {/* Reel Title - Editable */}
              <EditableTitle
                value={title}
                onChange={(newTitle) => {
                  onTitleChange?.(newTitle)
                }}
                placeholder="Untitled Reel"
                maxLength={100}
                className="
                  font-semibold 
                  text-black
                  -mx-[6px]
                  -my-[2px]
                "
                style={{ 
                  fontFamily: 'Noto Sans, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '1.4',
                  letterSpacing: '-0.28px'
                }}
              />

              {/* Total Duration */}
              <div 
                className="flex items-center gap-[8px]"
                style={{ 
                  fontFamily: 'Noto Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  lineHeight: '1.2',
                  letterSpacing: '-0.24px'
                }}
              >
                <span className="text-[#808080] shrink-0 whitespace-nowrap">
                  {formatDuration(totalDuration)} • {clipIds.length} clip{clipIds.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Clip List - Vertical */}
          {clipIds.length > 0 && (
            <div className="flex flex-col gap-[4px] w-full mt-[4px]">
              {clipIds.map((clipId, index) => {
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
                    onClick={(e) => e.stopPropagation()}
                    className={`
                      flex items-center gap-[8px]
                      bg-[#f3f3f3]
                      rounded-[6px]
                      p-[8px]
                      transition-all
                      ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
                      ${isDropTarget ? 'bg-[#ffdbce]' : ''}
                      hover:bg-[#ffdbce]
                      cursor-move
                    `}
                  >
                    {/* Drag Handle */}
                    <div className="text-[#808080] cursor-grab active:cursor-grabbing shrink-0">
                      <GripVertical className="h-[14px] w-[14px]" />
                    </div>

                    {/* Clip Number Badge */}
                    <div 
                      className="
                        bg-[#ff6932] 
                        text-white 
                        px-[6px] 
                        py-[2px] 
                        rounded-[4px]
                        shrink-0
                      "
                      style={{
                        fontFamily: 'Noto Sans, sans-serif',
                        fontSize: '10px',
                        fontWeight: 600,
                        lineHeight: '1',
                        letterSpacing: '-0.2px'
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Clip Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div 
                        className="text-black truncate"
                        style={{
                          fontFamily: 'Noto Sans, sans-serif',
                          fontSize: '12px',
                          fontWeight: 500,
                          lineHeight: '1.2',
                          letterSpacing: '-0.24px'
                        }}
                      >
                        {clip.title}
                      </div>
                      <div 
                        className="text-[#808080]"
                        style={{
                          fontFamily: 'Noto Sans, sans-serif',
                          fontSize: '10px',
                          fontWeight: 500,
                          lineHeight: '1.2',
                          letterSpacing: '-0.2px'
                        }}
                      >
                        {formatDuration(clip.duration)}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveClip?.(clipId)
                      }}
                      className="
                        shrink-0
                        p-[4px]
                        hover:bg-red-100
                        rounded-[4px]
                        transition-colors
                        text-[#808080]
                        hover:text-red-600
                      "
                      title="Remove from reel"
                    >
                      <X className="h-[14px] w-[14px]" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

