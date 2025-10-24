/**
 * Source Card Component
 * Built from Figma Design: https://www.figma.com/design/E40A2wZTYZKswjtNw8a4OV/Ensemble?node-id=22-2532
 * Node ID: 22:2531 (Source Card - state=default, transcribed=yes)
 * 
 * Represents a podcast episode OR uploaded audio file as a "Source" for clip creation
 * 
 * Figma Specs:
 * - "Source" badge with purple bg (#d0c2fd) and text (#3d00f6)
 * - 2px purple border (#d0c2fd)
 * - 12px border radius
 * - 16px padding
 * - 57x57px thumbnail with purple play button overlay
 * - Title/sm typography (14px SemiBold)
 * - Meta/med typography (12px Medium)
 * - Podcast name + duration metadata
 */

import React from 'react'
import { Play } from 'lucide-react'

interface SourceCardProps {
  id: string
  title: string
  podcastTitle?: string
  duration: number // in seconds
  imageUrl?: string
  isTranscribed: boolean
  isActive?: boolean
  onClick?: () => void
  onPlayClick?: (e: React.MouseEvent) => void
}

export function SourceCard({
  title,
  podcastTitle,
  duration,
  imageUrl,
  isTranscribed,
  isActive = false,
  onClick,
  onPlayClick
}: SourceCardProps) {
  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-[4px] items-start w-full">
      {/* Source Badge - Using exact Figma tokens */}
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
              ? 'bg-[#3d00f6]' 
              : 'bg-[#d0c2fd]'
            }
          `}
        >
          <span 
            className={`
              font-medium 
              leading-[100%]
              ${isActive ? 'text-white' : 'text-[#3d00f6]'}
            `}
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              letterSpacing: '-0.24px'
            }}
          >
            Source
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
            ? 'border-[#3d00f6] shadow-lg' 
            : isTranscribed 
              ? 'border-[#d0c2fd] hover:border-[#3d00f6]' 
              : 'border-[#e5e5e5] hover:border-[#d0c2fd]'
          }
        `}
      >
        <div className="flex items-start gap-[8px] w-full py-[2px]">
          {/* Thumbnail with Play Button - Using exact Figma tokens */}
          <div className="relative shrink-0 group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-[57px] h-[57px] rounded-[4px] object-cover bg-black"
              />
            ) : (
              <div className="w-[57px] h-[57px] rounded-[4px] bg-black" />
            )}
            
            {/* Purple Play Button Overlay - Using exact Figma tokens */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPlayClick?.(e)
              }}
              className="
                absolute 
                left-1/2 
                top-1/2 
                -translate-x-1/2 
                -translate-y-1/2
                w-[32px]
                h-[32px]
                rounded-[80px]
                bg-[#3d00f6]
                flex 
                items-center 
                justify-center
                hover:scale-110
                transition-transform
                opacity-0
                group-hover:opacity-100
              "
              aria-label="Play"
            >
              <Play className="w-[24px] h-[24px] text-white fill-white ml-0.5" />
            </button>
          </div>

          {/* Content - Using exact Figma tokens */}
          <div className="flex-1 min-w-0 flex flex-col gap-[2px] justify-center">
            {/* Episode Title - Title/sm: 14px SemiBold, line-height: 100% */}
            <h3 
              className="
                font-semibold 
                text-black
                line-clamp-2
              "
              style={{ 
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '100%',
                letterSpacing: '-0.28px'
              }}
            >
              {title}
            </h3>

            {/* Metadata Row - Meta/med: 12px Medium, line-height: 100% */}
            <div 
              className="flex items-center gap-[8px]"
              style={{ 
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '100%',
                letterSpacing: '-0.24px'
              }}
            >
              {podcastTitle && (
                <span className="text-black truncate">
                  {podcastTitle}
                </span>
              )}
              <span className="text-[#808080] shrink-0 whitespace-nowrap">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

