'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Clip Panel Footer - Built from Figma Design (node 23:418)
 * 
 * Shows export controls:
 * - Platform selector (YouTube, Instagram, X, LinkedIn)
 * - Video preview
 * - Export button
 */

export type ExportPlatform = 'youtube' | 'instagram' | 'x' | 'linkedin'

interface ClipPanelFooterProps {
  selectedPlatform?: ExportPlatform
  onPlatformChange: (platform: ExportPlatform) => void
  onExport: () => void
  previewUrl?: string
}

export function ClipPanelFooter({
  selectedPlatform = 'youtube',
  onPlatformChange,
  onExport,
  previewUrl
}: ClipPanelFooterProps) {
  const platforms: { id: ExportPlatform; label: string }[] = [
    { id: 'youtube', label: 'YouTube' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'x', label: 'X' },
    { id: 'linkedin', label: 'LinkedIn' }
  ]

  return (
    <div className="flex flex-col gap-[24px]">
      {/* Export Options Title */}
      <p
        className="text-black text-nowrap whitespace-pre"
        style={{
          fontFamily: 'Noto Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          lineHeight: '1.4',
          letterSpacing: '-0.28px'
        }}
      >
        Export Options
      </p>

      {/* Platform Segmented Controller - Figma: gap-[8px] */}
      <div className="flex gap-[8px] items-start flex-wrap">
        {platforms.map((platform) => {
          const isSelected = selectedPlatform === platform.id
          return (
            <button
              key={platform.id}
              onClick={() => onPlatformChange(platform.id)}
              className={`
                px-[4px] py-[4px] rounded-[8px] transition-all
                ${isSelected 
                  ? 'bg-black border-none' 
                  : 'bg-white border border-[#e5e5e5] hover:bg-[#f3f3f3] hover:border-[#808080] active:bg-[#e5e5e5] active:border-[#808080]'
                }
              `}
            >
              <p
                className={`text-nowrap whitespace-pre ${isSelected ? 'text-white' : 'text-black'}`}
                style={{
                  fontFamily: 'Noto Sans, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '1.2',
                  letterSpacing: '-0.28px'
                }}
              >
                {platform.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Video Preview - Figma: h-[216px] rounded-[4px] bg-[#e5e5e5] */}
      <div className="w-full h-[216px] bg-[#e5e5e5] rounded-[4px] overflow-hidden relative">
        {previewUrl ? (
          <video
            src={previewUrl}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Preview Frame - Figma: w-[129px] h-[216px] bg-[#808080] centered */}
            <div className="w-[129px] h-[216px] bg-[#808080]" />
            <p
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-nowrap whitespace-pre"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                lineHeight: 'normal',
                letterSpacing: '-0.32px'
              }}
            >
              Preview Video
            </p>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex flex-col gap-[8px] w-full">
        <Button
          type="button"
          variant="primary"
          size="large"
          onClick={onExport}
          className="w-full"
        >
          Export Clip
        </Button>
      </div>
    </div>
  )
}

