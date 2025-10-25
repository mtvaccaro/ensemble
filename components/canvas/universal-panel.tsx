'use client'

import React, { ReactNode } from 'react'
import { Play, Pause, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'

/**
 * Universal Panel Component - Built from Figma Design (node 23:440)
 * 
 * Uses ALL exact Figma design tokens for Source and Clip variants:
 * - Panel: w-[420px], h-[982px], bg-white, shadow
 * - Header: px-[24px] py-[16px], gap-[8px], border-b-[2px]
 * - Badge: px-[6px] py-[2px], rounded-[6px], 12px Medium
 * - Title: 18px SemiBold, lineHeight: 1.4, letterSpacing: -0.36px
 * - Player: 32px button, 6px timeline, 16px scrubber
 * - Search: px-[8px] py-[6px], rounded-[6px], bg-[#f3f3f3]
 * - Content: p-[24px], gap-[16px], scrollable
 * - Footer: px-[16px] py-[24px], gap-[12px], border-t
 */

export type PanelVariant = 'source' | 'clip' | 'reel'

interface UniversalPanelProps {
  variant: PanelVariant
  
  // Header content
  title: string | ReactNode
  showName?: string // Only for source variant
  duration: string
  
  // Player state
  isPlaying?: boolean
  currentTime?: number
  onPlayPause?: () => void
  onSeek?: (time: number) => void
  
  // Search
  searchQuery?: string
  onSearchChange?: (query: string) => void
  
  // Transcript content (rendered in scrollable area)
  transcriptContent: ReactNode
  
  // Footer content (variant-specific)
  footerContent: ReactNode
  
  className?: string
}

export function UniversalPanel({
  variant,
  title,
  showName,
  duration,
  isPlaying = false,
  currentTime = 0,
  onPlayPause,
  onSeek,
  searchQuery = '',
  onSearchChange,
  transcriptContent,
  footerContent,
  className
}: UniversalPanelProps) {
  // Variant-specific colors
  const colors = {
    source: {
      badge: '#3d00f6',
      button: '#3d00f6',
      timeline: '#3d00f6',
      speaker: '#3d00f6'
    },
    clip: {
      badge: '#ac00f6',
      button: '#ac00f6',
      timeline: '#ac00f6',
      speaker: '#ac00f6'
    },
    reel: {
      badge: '#ff6932',
      button: '#ff6932',
      timeline: '#ff6932',
      speaker: '#ff6932'
    }
  }

  const color = colors[variant]
  const badgeLabel = variant === 'source' ? 'Source' : variant === 'clip' ? 'Clip' : 'Reel'

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Parse duration string like "19:10" to seconds for progress calculation
  const parseDuration = (durationStr: string): number => {
    const parts = durationStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  const totalDurationSeconds = parseDuration(duration)
  const progress = totalDurationSeconds > 0 ? (currentTime / totalDurationSeconds) * 100 : 0

  // Handle timeline click/drag
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * totalDurationSeconds
    onSeek?.(Math.max(0, Math.min(totalDurationSeconds, newTime)))
  }

  return (
    <div
      className={cn(
        'h-full w-full bg-white flex flex-col',
        className
      )}
      style={{
        outline: 'none'
      }}
      tabIndex={-1}
    >
      {/* Header Section - Using Figma tokens */}
      <div className="flex-none border-b-[2px] border-[#e5e5e5]">
        {/* Title & Metadata - Figma: px-[24px] py-[16px] gap-[8px] */}
        <div className="px-[24px] py-[16px] flex flex-col gap-[8px]">
          {/* Title Row with Badge */}
          <div className="flex gap-[9px] py-[1px]">
            <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
              <div className="flex flex-col gap-[4px]">
                {/* Badge - Figma: px-[6px] py-[2px] rounded-[6px] */}
                <div
                  className="self-start px-[6px] py-[2px] rounded-[6px] flex items-center justify-center"
                  style={{ backgroundColor: color.badge }}
                >
                  <p
                    className="text-white text-nowrap whitespace-pre"
                    style={{
                      fontFamily: 'Noto Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: 'normal',
                      letterSpacing: '-0.24px'
                    }}
                  >
                    {badgeLabel}
                  </p>
                </div>

                {/* Title - Figma: 18px SemiBold lineHeight: 1.4 */}
                <p
                  className="text-black"
                  style={{
                    fontFamily: 'Noto Sans, sans-serif',
                    fontSize: '18px',
                    fontWeight: 600,
                    lineHeight: '1.4',
                    letterSpacing: '-0.36px'
                  }}
                >
                  {title}
                </p>

                {/* Metadata Row - Only for source variant */}
                {variant === 'source' && showName && (
                  <div className="flex gap-[8px] items-center text-nowrap whitespace-pre">
                    <p
                      className="text-black overflow-ellipsis overflow-hidden flex-1 min-w-0"
                      style={{
                        fontFamily: 'Noto Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 600,
                        lineHeight: '1.4',
                        letterSpacing: '-0.28px'
                      }}
                    >
                      {showName}
                    </p>
                    <p
                      className="text-[#808080] shrink-0"
                      style={{
                        fontFamily: 'Noto Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 500,
                        lineHeight: '1.2',
                        letterSpacing: '-0.24px'
                      }}
                    >
                      {duration}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audio Player - Figma: py-[8px] gap-[8px] */}
          <div className="flex gap-[8px] items-center py-[8px]">
            {/* Play/Pause Button - Figma: 32px size, rounded-[80px] */}
            <button
              onClick={onPlayPause}
              className="shrink-0 w-[32px] h-[32px] rounded-[80px] flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: color.button }}
            >
              {isPlaying ? (
                <Pause className="w-[14px] h-[14px] text-white fill-white" />
              ) : (
                <Play className="w-[14px] h-[14px] text-white fill-white" />
              )}
            </button>

            {/* Current Time */}
            <p
              className="text-[#808080] shrink-0 text-nowrap whitespace-pre"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              {formatTime(currentTime)}
            </p>

            {/* Timeline - Figma: h-[6px] rounded-[80px] bg-[#e5e5e5] */}
            <div 
              className="flex-1 min-w-0 h-[6px] bg-[#e5e5e5] rounded-[80px] relative cursor-pointer"
              onClick={handleTimelineClick}
            >
              {/* Scrubber - Figma: 16px size, absolute positioned */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-[5000px]"
                style={{
                  backgroundColor: color.timeline,
                  left: `calc(${progress}% - 8px)` // Center the scrubber at progress position
                }}
              />
            </div>

            {/* Total Duration */}
            <p
              className="text-[#808080] shrink-0 text-nowrap whitespace-pre"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              {duration}
            </p>
          </div>
        </div>

        {/* Search Field - Figma: px-[16px] pb-[16px] pt-0 */}
        <div className="px-[16px] pb-[16px] pt-0">
          <SearchInput
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            showButton={false}
          />
        </div>
      </div>

      {/* Scrollable Transcript Content - Figma: p-[24px] gap-[16px] */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white p-[24px]">
        {transcriptContent}
      </div>

      {/* Footer Section - Figma: px-[16px] py-[24px] border-t */}
      <div className="flex-none border-t border-[#e5e5e5] bg-white px-[16px] py-[24px]">
        {footerContent}
      </div>
    </div>
  )
}

