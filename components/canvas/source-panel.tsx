'use client'

import React, { useState } from 'react'
import { UniversalPanel } from './universal-panel'
import { SourcePanelFooter } from './source-panel-footer'
import { EpisodePanelContent } from './episode-panel-content'
import { CanvasEpisode, CanvasClip } from '@/types'

/**
 * Source Panel - Wraps EpisodePanelContent with new UniversalPanel design
 * 
 * Integrates existing episode logic with new Figma-spec'd panel UI
 */

interface SourcePanelProps {
  episode: CanvasEpisode
  onCreateClip: (clip: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => void
  onTranscribe?: (episodeId: string) => void
  isTranscribing?: boolean
  onClose?: () => void
}

export function SourcePanel({
  episode,
  onCreateClip,
  onTranscribe,
  isTranscribing = false,
  onClose
}: SourcePanelProps) {
  // For now, we'll render the old EpisodePanelContent inside the new panel shell
  // TODO: Refactor EpisodePanelContent to extract its transcript rendering logic
  
  return (
    <div className="fixed top-0 right-0 h-screen w-[420px] bg-white z-40">
      <EpisodePanelContent
        episode={episode}
        onCreateClip={onCreateClip}
        onTranscribe={onTranscribe}
        isTranscribing={isTranscribing}
      />
    </div>
  )
}

