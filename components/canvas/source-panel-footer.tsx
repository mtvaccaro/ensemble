'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

/**
 * Source Panel Footer - Built from Figma Design (node 23:721)
 * 
 * Shows clip creation controls:
 * - Duration/Start/End stats
 * - Create Clip button (primary)
 * - Clear Selection button (secondary)
 */

interface SourcePanelFooterProps {
  duration: number | null
  startTime: number | null
  endTime: number | null
  onCreateClip: () => void
  onClearSelection: () => void
  hasSelection: boolean
}

export function SourcePanelFooter({
  duration,
  startTime,
  endTime,
  onCreateClip,
  onClearSelection,
  hasSelection
}: SourcePanelFooterProps) {
  // Format time as mm:ss
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-[12px]">
      {/* Stats Row - Figma: gap-[10px] */}
      <div className="flex gap-[10px] items-center w-full">
        {/* Duration */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2px] items-center justify-center text-nowrap whitespace-pre">
          <p
            className={`overflow-ellipsis overflow-hidden ${hasSelection ? 'text-black' : 'text-[#808080]'}`}
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            {formatTime(duration)}
          </p>
          <p
            className="text-[#808080] overflow-ellipsis overflow-hidden"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            Duration
          </p>
        </div>

        {/* Start Time */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2px] items-center justify-center text-[#808080] text-nowrap whitespace-pre">
          <p
            className="overflow-ellipsis overflow-hidden"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            {formatTime(startTime)}
          </p>
          <p
            className="overflow-ellipsis overflow-hidden"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            Start
          </p>
        </div>

        {/* End Time */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2px] items-center justify-center text-[#808080] text-nowrap whitespace-pre">
          <p
            className="overflow-ellipsis overflow-hidden"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            {formatTime(endTime)}
          </p>
          <p
            className="overflow-ellipsis overflow-hidden"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            End
          </p>
        </div>
      </div>

      {/* Action Buttons - Figma: gap-[8px] */}
      <div className="flex flex-col gap-[8px] w-full">
        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={onCreateClip}
          disabled={!hasSelection}
          className="w-full"
        >
          Create Clip
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="large"
          onClick={onClearSelection}
          disabled={!hasSelection}
          className="w-full"
        >
          Clear Selection
        </Button>
      </div>
    </div>
  )
}

