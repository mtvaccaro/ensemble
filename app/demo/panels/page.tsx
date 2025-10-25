'use client'

import React, { useState } from 'react'
import { UniversalPanel } from '@/components/canvas/universal-panel'
import { SourcePanelFooter } from '@/components/canvas/source-panel-footer'
import { ClipPanelFooter, ExportPlatform } from '@/components/canvas/clip-panel-footer'

/**
 * Panel Demo Page
 * 
 * Showcases the new Figma-designed Universal Panel component
 * with both Source and Clip variants side-by-side
 */

export default function PanelDemoPage() {
  // Source panel state
  const [sourceSearchQuery, setSourceSearchQuery] = useState('')
  const [sourceSelection, setSourceSelection] = useState({
    duration: 12,
    startTime: 5,
    endTime: 17
  })
  const [hasSourceSelection, setHasSourceSelection] = useState(true)

  // Clip panel state
  const [clipSearchQuery, setClipSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('youtube')

  // Mock transcript content for Source panel
  const mockSourceTranscript = () => (
    <div className="space-y-4">
      {/* Mock transcript segments */}
      <div className="space-y-4">
        <div className="flex flex-col gap-[4px]">
          <div className="flex gap-[8px] items-center">
            <p
              className="text-[#3d00f6]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              Speaker A
            </p>
            <p
              className="text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              0:00
            </p>
          </div>
          <p
            className="text-black"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            Welcome to today&apos;s episode where we discuss the latest trends in technology and innovation. 
            The market has been incredibly volatile this quarter, with significant shifts in investor sentiment.
          </p>
        </div>

        <div className="flex flex-col gap-[4px]">
          <div className="flex gap-[8px] items-center">
            <p
              className="text-[#f62d00]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              Speaker B
            </p>
            <p
              className="text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              0:12
            </p>
          </div>
          <p
            className="text-black"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            That&apos;s absolutely right. We&apos;ve seen unprecedented changes in how companies approach digital transformation. 
            The key question is: how can businesses adapt to these rapid changes while maintaining profitability?
          </p>
        </div>

        <div className="flex flex-col gap-[4px]">
          <div className="flex gap-[8px] items-center">
            <p
              className="text-[#3d00f6]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              Speaker A
            </p>
            <p
              className="text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              0:28
            </p>
          </div>
          <p
            className="text-black"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            Innovation requires a fundamental shift in mindset. Companies that succeed are those that embrace change 
            rather than resist it. They invest heavily in R&D and aren&apos;t afraid to cannibalize their own products.
          </p>
        </div>

        <div className="flex flex-col gap-[4px]">
          <div className="flex gap-[8px] items-center">
            <p
              className="text-[#f62d00]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              Speaker B
            </p>
            <p
              className="text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              0:45
            </p>
          </div>
          <p
            className="text-black"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            Exactly. The companies that thrive are the ones building resilient systems. They understand that 
            disruption isn&apos;t a one-time event—it&apos;s continuous. You need to build an organization that can adapt quickly.
          </p>
        </div>

        <div className="flex flex-col gap-[4px]">
          <div className="flex gap-[8px] items-center">
            <p
              className="text-[#3d00f6]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              Speaker A
            </p>
            <p
              className="text-[#808080]"
              style={{
                fontFamily: 'Noto Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '1.2',
                letterSpacing: '-0.24px'
              }}
            >
              1:02
            </p>
          </div>
          <p
            className="text-black"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '1.2',
              letterSpacing: '-0.28px'
            }}
          >
            Looking ahead, the next decade will be defined by artificial intelligence and machine learning. 
            These technologies are no longer futuristic concepts—they&apos;re here now, transforming every industry.
          </p>
        </div>
      </div>
    </div>
  )

  // Mock transcript content for Clip panel (similar structure but clip-specific)
  const mockClipTranscript = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-[4px]">
        <div className="flex gap-[8px] items-center">
          <p
            className="text-[#ac00f6]"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            Speaker A
          </p>
          <p
            className="text-[#808080]"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            0:05
          </p>
        </div>
        <p
          className="text-black"
          style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '1.2',
            letterSpacing: '-0.28px'
          }}
        >
          The key question is: how can businesses adapt to these rapid changes while maintaining profitability? 
          This is the challenge every CEO faces today.
        </p>
      </div>

      <div className="flex flex-col gap-[4px]">
        <div className="flex gap-[8px] items-center">
          <p
            className="text-[#f62d00]"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            Speaker B
          </p>
          <p
            className="text-[#808080]"
            style={{
              fontFamily: 'Noto Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 500,
              lineHeight: '1.2',
              letterSpacing: '-0.24px'
            }}
          >
            0:17
          </p>
        </div>
        <p
          className="text-black"
          style={{
            fontFamily: 'Noto Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
            lineHeight: '1.2',
            letterSpacing: '-0.28px'
          }}
        >
          Innovation requires a fundamental shift in mindset. Companies that succeed are those that embrace change 
          rather than resist it.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Universal Panel Demo
        </h1>
        <p className="text-gray-600">
          Figma-designed panels with exact tokens • Source (purple) & Clip (magenta) variants
        </p>
      </div>

      {/* Panels Side-by-Side */}
      <div className="max-w-7xl mx-auto flex gap-8 justify-center">
        {/* Source Panel */}
        <div className="relative">
          <div className="absolute -top-6 left-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Source Panel (Episode)
          </div>
          <UniversalPanel
            variant="source"
            title="Navigating Market Volatility and Innovation Trends"
            showName="Behind The Money"
            duration="19:10"
            isPlaying={false}
            currentTime={0}
            onPlayPause={() => console.log('Play/Pause clicked')}
            onSeek={() => console.log('Seek')}
            searchQuery={sourceSearchQuery}
            onSearchChange={setSourceSearchQuery}
            transcriptContent={mockSourceTranscript()}
            footerContent={
              hasSourceSelection ? (
                <SourcePanelFooter
                  duration={sourceSelection.duration}
                  startTime={sourceSelection.startTime}
                  endTime={sourceSelection.endTime}
                  hasSelection={hasSourceSelection}
                  onCreateClip={() => {
                    console.log('Create Clip clicked')
                    alert('Clip created! (Demo)')
                  }}
                  onClearSelection={() => {
                    console.log('Clear Selection clicked')
                    setHasSourceSelection(false)
                    setTimeout(() => setHasSourceSelection(true), 2000) // Re-enable after 2s for demo
                  }}
                />
              ) : null
            }
            className="shadow-2xl"
          />
        </div>

        {/* Clip Panel */}
        <div className="relative">
          <div className="absolute -top-6 left-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Clip Panel (Export)
          </div>
          <UniversalPanel
            variant="clip"
            title="The Future of Business Innovation"
            duration="0:35"
            isPlaying={false}
            currentTime={0}
            onPlayPause={() => console.log('Play/Pause clicked')}
            onSeek={() => console.log('Seek')}
            searchQuery={clipSearchQuery}
            onSearchChange={setClipSearchQuery}
            transcriptContent={mockClipTranscript()}
            footerContent={
              <ClipPanelFooter
                selectedPlatform={selectedPlatform}
                onPlatformChange={(platform) => {
                  console.log('Platform changed:', platform)
                  setSelectedPlatform(platform)
                }}
                onExport={() => {
                  console.log('Export clicked for platform:', selectedPlatform)
                  alert(`Exporting to ${selectedPlatform}! (Demo)`)
                }}
              />
            }
            className="shadow-2xl"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto mt-12 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ✨ Interactive Demo Features
        </h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Source Panel (Left)</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Purple theme (#3d00f6)</li>
              <li>• Episode title + podcast name</li>
              <li>• Mock transcript with speaker labels</li>
              <li>• Duration/Start/End stats footer</li>
              <li>• Create Clip & Clear Selection buttons</li>
              <li>• Search transcript functionality</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Clip Panel (Right)</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• Magenta theme (#ac00f6)</li>
              <li>• Clip title (no podcast name)</li>
              <li>• Shorter transcript preview</li>
              <li>• Platform selector (YouTube, Instagram, X, LinkedIn)</li>
              <li>• Video preview area (216px)</li>
              <li>• Export Clip button</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>All Figma tokens applied:</strong> Exact spacing (px-[24px], gap-[8px]), typography (Noto Sans with exact sizes/weights), 
            colors (hex values), border radius (rounded-[8px]), and component dimensions (420px × 982px).
          </p>
        </div>
      </div>
    </div>
  )
}

