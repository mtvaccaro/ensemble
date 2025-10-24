/**
 * Podcast Card Component
 * Built from Figma Design: https://www.figma.com/design/E40A2wZTYZKswjtNw8a4OV/Ensemble
 * Node ID: 22:1787 (Podcast Card - state=default)
 * 
 * Matches Figma specs exactly:
 * - 2px neutral-2 border
 * - 6px border radius
 * - 12px padding
 * - 16px gap between sections
 * - 57x57px image
 * - Title/med typography (16px, SemiBold)
 * - Meta/med typography (12px, Medium)
 */

import React from 'react'

interface PodcastCardProps {
  imageUrl: string
  title: string
  author: string
  episodeCount: number
  onClick?: () => void
}

export function PodcastCardFigma({ 
  imageUrl, 
  title, 
  author, 
  episodeCount,
  onClick 
}: PodcastCardProps) {
  return (
    <div 
      onClick={onClick}
      className="
        bg-white 
        border-2 border-[#e5e5e5] 
        rounded-[6px] 
        p-3
        cursor-pointer
        hover:border-[#3d00f6]
        hover:shadow-md
        transition-all
        w-full
      "
    >
      <div className="flex items-center gap-2 w-full">
        {/* Podcast Image - 57x57px from Figma */}
        <div className="shrink-0">
          <img
            src={imageUrl}
            alt={title}
            className="w-[57px] h-[57px] rounded object-cover bg-black"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          {/* Title - Title/med: 16px SemiBold */}
          <h3 
            className="
              font-semibold 
              text-base 
              text-black 
              truncate
              leading-none
            "
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              letterSpacing: '-0.32px'
            }}
          >
            {title}
          </h3>
          
          {/* Metadata - Meta/med: 12px Medium */}
          <div 
            className="
              flex 
              items-center 
              gap-2 
              text-xs 
              font-medium 
              text-[#808080]
              leading-none
            "
            style={{ 
              fontFamily: 'Noto Sans, sans-serif',
              letterSpacing: '-0.24px'
            }}
          >
            <span className="truncate">{author}</span>
            <span className="shrink-0">{episodeCount} Episodes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

