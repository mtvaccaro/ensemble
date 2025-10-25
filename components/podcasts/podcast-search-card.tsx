'use client'

import React from 'react'

interface PodcastSearchCardProps {
  title: string
  author: string
  episodeCount: number
  imageUrl: string
  onClick?: () => void
}

/**
 * PodcastSearchCard Component - Built from Figma Design (node 22-1788)
 * 
 * Uses ALL exact Figma design tokens:
 * - Card: p-[12px], gap-[16px], rounded-[6px], border-2, w-[329px]
 * - Content: gap-[8px], py-[2px]
 * - Image: w-[57px] h-[57px], rounded-[4px]
 * - Title: 16px SemiBold, lineHeight: 1.4, letterSpacing: -0.32px
 * - Metadata: 12px Medium, lineHeight: 1.2, letterSpacing: -0.24px
 * - Colors: border-#e5e5e5, hover-#808080, active-#e5e5e5
 * - Background: white → hover-#f3f3f3 → active-#e5e5e5
 */
export function PodcastSearchCard({
  title,
  author,
  episodeCount,
  imageUrl,
  onClick
}: PodcastSearchCardProps) {
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
        <div className="flex gap-[8px] items-center py-[2px] w-full">
          {/* Podcast Image */}
          <img
            src={imageUrl}
            alt={title}
            className="w-[57px] h-[57px] rounded-[4px] object-cover shrink-0 bg-black"
          />
          
          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-[4px] justify-center">
            {/* Podcast Title - Title/med: 16px SemiBold */}
            <h3
              className="text-black line-clamp-1"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '1.4',
                letterSpacing: '-0.32px'
              }}
            >
              {title}
            </h3>
            
            {/* Metadata Row - Meta/med: 12px Medium */}
            <div
              className="flex items-center gap-[8px] text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              <span className="truncate">{author}</span>
              <span className="shrink-0 whitespace-nowrap">{episodeCount} Episodes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

