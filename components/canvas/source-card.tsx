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
    <div className="flex flex-col gap-1 items-start w-full">
      {/* Source Badge */}
      <div className="pl-4">
        <div 
          className="
            inline-flex 
            items-center 
            justify-center 
            px-[6px] 
            py-[2px] 
            rounded-[6px]
            bg-[#d0c2fd]
          "
        >
          <span 
            className="
              text-xs 
              font-medium 
              text-[#3d00f6]
              leading-none
            "
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              letterSpacing: '-0.24px'
            }}
          >
            Source
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        onClick={onClick}
        className={`
          bg-white
          border-2
          rounded-xl
          p-4
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
        <div className="flex items-start gap-2 w-full">
          {/* Thumbnail with Play Button */}
          <div className="relative shrink-0 group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-[57px] h-[57px] rounded object-cover bg-black"
              />
            ) : (
              <div className="w-[57px] h-[57px] rounded bg-black" />
            )}
            
            {/* Purple Play Button Overlay */}
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
                w-8 
                h-8 
                rounded-full 
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
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
            {/* Episode Title - Title/sm: 14px SemiBold */}
            <h3 
              className="
                text-sm 
                font-semibold 
                text-black
                line-clamp-2
                leading-none
              "
              style={{ 
                fontFamily: 'Noto Sans, sans-serif',
                letterSpacing: '-0.28px'
              }}
            >
              {title}
            </h3>

            {/* Metadata Row - Meta/med: 12px Medium */}
            <div 
              className="
                flex 
                items-center 
                gap-2 
                text-xs 
                font-medium
                leading-none
              "
              style={{ 
                fontFamily: 'Noto Sans, sans-serif',
                letterSpacing: '-0.24px'
              }}
            >
              {podcastTitle && (
                <span className="text-black truncate">
                  {podcastTitle}
                </span>
              )}
              <span className="text-[#808080] shrink-0">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

