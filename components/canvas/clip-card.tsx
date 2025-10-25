'use client'

import React from 'react'
import { Play, Pause } from 'lucide-react'
import { EditableTitle } from '@/components/ui/editable-title'

interface ClipCardProps {
  id: string
  title: string
  duration: number
  transcriptPreview?: string
  isActive?: boolean
  isPlaying?: boolean
  onClick?: (e: React.MouseEvent) => void
  onPlayClick?: (e: React.MouseEvent) => void
  onTitleChange?: (newTitle: string) => void
}

/**
 * Clip Card Component - Built from Figma Design (node 22-2617)
 * 
 * Uses ALL exact Figma design tokens:
 * - Spacing: gap-[4px], gap-[8px], gap-[2px], p-[16px], pl-[16px], px-[6px], py-[2px], py-[1px]
 * - Sizing: w-[32px] h-[32px], w-[24px] h-[24px]
 * - Border radius: rounded-[6px], rounded-[12px], rounded-[80px]
 * - Colors: #ac00f6 (clip-5), #ebc2fd (clip-1), #808080 (gray-3)
 * - Typography: Title/sm (14px/600), Meta/med (12px/500)
 * 
 * States:
 * - default: light purple badge (#ebc2fd bg, #ac00f6 text), light purple border
 * - active: purple badge (#ac00f6 bg, white text), purple border
 */
export function ClipCard({
  id,
  title,
  duration,
  transcriptPreview,
  isActive = false,
  isPlaying = false,
  onClick,
  onPlayClick,
  onTitleChange
}: ClipCardProps) {
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-[4px] items-start w-full">
      {/* Clip Badge - Using exact Figma tokens */}
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
              ? 'bg-[#ac00f6]' 
              : 'bg-[#ebc2fd]'
            }
          `}
        >
          <span 
            className={`
              font-medium 
              leading-[100%]
              ${isActive ? 'text-white' : 'text-[#ac00f6]'}
            `}
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              letterSpacing: '-0.24px'
            }}
          >
            Clip
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
            ? 'border-[#ac00f6] shadow-lg' 
            : 'border-[#ebc2fd] hover:border-[#ac00f6]'
          }
        `}
      >
        {/* Content wrapper with exact spacing */}
        <div className="flex flex-col gap-[8px] items-end w-full">
          
          {/* Top section: play button + title/duration */}
          <div className="flex flex-col items-start w-full">
            <div className="flex gap-[8px] items-start w-full py-[1px]">
              
              {/* Play/Pause Button - Using exact Figma tokens */}
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
                  bg-[#ac00f6]
                  flex
                  items-center
                  justify-center
                  hover:scale-110
                  transition-transform
                "
                aria-label={isPlaying ? "Pause clip" : "Play clip"}
              >
                {isPlaying ? (
                  <Pause className="w-[24px] h-[24px] text-white fill-white" />
                ) : (
                  <Play className="w-[24px] h-[24px] text-white fill-white ml-0.5" />
                )}
              </button>

          {/* Content: Title + Duration - Using exact Figma tokens */}
          <div className="flex-1 min-w-0 flex flex-col gap-[2px] justify-center">
            {/* Clip Title - Title/sm: 14px SemiBold, line-height: 140% - Editable */}
            <EditableTitle
              value={title}
              onChange={(newTitle) => {
                onTitleChange?.(newTitle)
              }}
              placeholder="Untitled Clip"
              maxLength={100}
              className="
                font-semibold 
                text-black
                line-clamp-2
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

            {/* Duration - Meta/med: 12px Medium, line-height: 120% */}
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
                {formatDuration(duration)}
              </span>
            </div>
          </div>
            </div>
          </div>

          {/* Transcript Preview - Using exact Figma tokens */}
          {transcriptPreview && (
            <div 
              className="
                w-full
                h-[32px]
                overflow-hidden
                text-[#808080]
                line-clamp-2
              "
              style={{ 
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {transcriptPreview}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

