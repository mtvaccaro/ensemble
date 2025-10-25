'use client'

import React from 'react'

interface EpisodeSearchCardProps {
  title: string
  description: string
  date: string
  duration: string
  onClick?: () => void
}

/**
 * EpisodeSearchCard Component - Built from Figma Design (node 22-2049)
 * 
 * Uses ALL exact Figma design tokens:
 * - Card: p-[12px], gap-[16px], rounded-[6px], border-2, w-[345px]
 * - Content: gap-[9px], py-[1px]
 * - Title: 14px SemiBold, lineHeight: 1.4, letterSpacing: -0.28px, 2-line clamp
 * - Description: 12px Medium, lineHeight: 1.2, letterSpacing: -0.24px, 2-line clamp, gray-3
 * - Metadata: 12px Medium, lineHeight: 1.2, letterSpacing: -0.24px, black
 * - Colors: border-#e5e5e5, hover-#808080, active-#e5e5e5
 * - Background: white → hover-#f3f3f3 → active-#e5e5e5
 */
export function EpisodeSearchCard({
  title,
  description,
  date,
  duration,
  onClick
}: EpisodeSearchCardProps) {
  return (
    <div
      onClick={onClick}
      className="
        w-full
        bg-white
        border-[2px]
        border-[#e5e5e5]
        rounded-[6px]
        cursor-pointer
        transition-all
        hover:bg-[#f3f3f3]
        hover:border-[#808080]
        active:bg-[#e5e5e5]
        active:border-[#808080]
      "
    >
      <div className="p-[12px] flex flex-col gap-[16px]">
        <div className="flex gap-[9px] items-center py-[1px] w-full">
          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-[4px] justify-center">
            {/* Episode Title - Title/sm: 14px SemiBold, 2 lines */}
            <h3
              className="text-black line-clamp-2"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '1.4',
                letterSpacing: '-0.28px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {title}
            </h3>
            
            {/* Description - Meta/med: 12px Medium, 2 lines, gray */}
            <p
              className="text-[#808080] line-clamp-2"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {description}
            </p>
            
            {/* Metadata Row - Meta/med: 12px Medium, black */}
            <div
              className="flex items-center gap-[8px] text-black"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              <span className="truncate">{date}</span>
              <span className="shrink-0 whitespace-nowrap">{duration}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

