'use client'

import React, { useState, useEffect, useRef } from 'react'

// Augment Window interface for drag and drop
declare global {
  interface Window {
    __draggedEpisode?: {
      episode: { id: string; title: string; audioUrl: string; duration: number; imageUrl?: string; description?: string; publishedAt?: string }
      podcast: PodcastSearchResult
    }
  }
}
import { Search, Scissors, Download, FileText, Play, Pause, ZoomIn, ZoomOut, Maximize2, RotateCcw, Loader2, Film, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PodcastSearchResult, CanvasEpisode, CanvasClip, CanvasReel, CanvasItem } from '@/types'
import { storage } from '@/lib/localStorage'
import { EpisodePanelContent } from '@/components/canvas/episode-panel-content'
import { ExportPanelContent } from '@/components/canvas/export-panel-content'
import { ReelPanelContent } from '@/components/canvas/reel-panel-content'
import { ContextualPlayer } from '@/components/canvas/contextual-player'
import posthog from 'posthog-js'

interface EpisodeResult {
  id: string
  title: string
  audioUrl: string
  duration: number
  imageUrl?: string
  description: string
  publishedAt: string
}

export default function CanvasPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([])
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSearchResult | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  
  // Canvas state
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Canvas view state (pan/zoom)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Right panel state
  const [panelType, setPanelType] = useState<'episode' | 'export' | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<CanvasEpisode | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [, setClipsToExport] = useState<CanvasClip[]>([])
  
  // Track which episodes are currently transcribing (by episodeId)
  const [transcribingEpisodes, setTranscribingEpisodes] = useState<Set<string>>(new Set())
  
  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  // Play trigger (to differentiate selection from explicit play action)
  const [playTrigger, setPlayTrigger] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pauseTrigger, setPauseTrigger] = useState<number>(0)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  
  // Canvas constraints (keep items within bounds)
  const CANVAS_MIN_X = 0
  const CANVAS_MAX_X = 4000
  const CANVAS_MIN_Y = 0
  const CANVAS_MAX_Y = 3000

  // Load canvas state on mount
  useEffect(() => {
    const state = storage.getCanvasState()
    setCanvasItems(state.items)
    setSelectedItemIds(state.selectedItemIds)
  }, [])

  // Handle Escape key to close panel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panelType !== null) {
        handleClosePanel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [panelType])

  // Save canvas state whenever it changes
  useEffect(() => {
    storage.setCanvasState({
      items: canvasItems,
      selectedItemIds,
      lastUpdated: new Date().toISOString()
    })
  }, [canvasItems, selectedItemIds])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/podcasts/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        posthog.capture('canvas_podcast_searched', {
          search_query: searchQuery,
          result_count: data.podcasts.length
        })
        setSearchResults(data.podcasts)
        setSelectedPodcast(null)
        setEpisodes([])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const loadEpisodes = async (podcast: PodcastSearchResult) => {
    setSelectedPodcast(podcast)
    setIsLoadingEpisodes(true)
    
    try {
      const response = await fetch(`/api/rss?url=${encodeURIComponent(podcast.feedUrl)}`)
      if (response.ok) {
        const data = await response.json()
        const formattedEpisodes = data.episodes.map((ep: { title: string; audioUrl: string; duration: number; imageUrl?: string; description?: string; publishedAt?: string }, index: number) => ({
          id: `${podcast.id}-${index}`,
          title: ep.title,
          audioUrl: ep.audioUrl,
          duration: ep.duration,
          imageUrl: ep.imageUrl || podcast.imageUrl,
          description: ep.description,
          publishedAt: ep.publishedAt
        }))
        setEpisodes(formattedEpisodes)
        posthog.capture('canvas_episodes_loaded', {
          podcast_id: podcast.id,
          podcast_title: podcast.title,
          episode_count: formattedEpisodes.length
        })
      }
    } catch (error) {
      console.error('Failed to load episodes:', error)
    } finally {
      setIsLoadingEpisodes(false)
    }
  }

  const handleDragEpisodeStart = (episode: EpisodeResult, podcast: PodcastSearchResult) => {
    // Store episode data for drop
    const dragData = {
      episode,
      podcast
    }
    // Store in a way that can be accessed on drop
    window.__draggedEpisode = dragData
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    const dragData = window.__draggedEpisode
    if (!dragData) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const { episode, podcast } = dragData

    // Calculate drop position relative to canvas, accounting for zoom and pan
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    
    const x = (clientX - canvasOffset.x) / canvasZoom
    const y = (clientY - canvasOffset.y) / canvasZoom
    
    // Constrain to canvas bounds
    const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 280, x))
    const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, y))

    // Check if we already have a transcript for this episode
    const existingTranscript = storage.getTranscript(episode.id)

    // Create new canvas episode
    const newItem: CanvasEpisode = {
      id: `canvas-episode-${Date.now()}-${Math.random()}`,
      type: 'episode',
      episodeId: episode.id,
      podcastId: podcast.id.toString(),
      title: episode.title,
      audioUrl: episode.audioUrl,
      imageUrl: episode.imageUrl,
      duration: episode.duration,
      position: { x: constrainedX, y: constrainedY },
      // Populate with existing transcript if available
      transcript: existingTranscript?.transcript,
      transcript_segments: existingTranscript?.segments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Log if we're reusing a cached transcript
    if (existingTranscript) {
      console.log('✅ Loaded cached transcript for:', episode.title)
      posthog.capture('cached_transcript_loaded', {
        episode_id: episode.id,
        segment_count: existingTranscript.segments?.length || 0
      })
    }

    setCanvasItems([...canvasItems, newItem])
    posthog.capture('episode_added_to_canvas', {
      episode_title: episode.title,
      podcast_id: podcast.id,
      position: { x: constrainedX, y: constrainedY },
      had_cached_transcript: !!existingTranscript
    })

    // Auto-transcribe if no cached transcript exists
    if (!existingTranscript) {
      console.log('🎙️ Starting auto-transcription for:', episode.title)
      transcribeEpisode(episode.id, episode.audioUrl, episode.title)
    }

    // Clean up
    delete window.__draggedEpisode
  }

  const handleItemMouseDown = (e: React.MouseEvent, item: CanvasItem) => {
    e.stopPropagation()
    
    // Handle Shift+click for multi-select
    if (e.shiftKey) {
      if (selectedItemIds.includes(item.id)) {
        // Remove from selection
        setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
      } else {
        // Add to selection
        setSelectedItemIds([...selectedItemIds, item.id])
      }
      return // Don't start dragging during multi-select
    }
    
    // Determine which items will be dragged
    const itemsToDrag = selectedItemIds.includes(item.id) 
      ? selectedItemIds 
      : [item.id]
    
    // If item is not selected, select only this item
    if (!selectedItemIds.includes(item.id)) {
      setSelectedItemIds([item.id])
    }
    
    // Store the starting positions of ALL items that will be dragged
    const startPositions = new Map<string, { x: number; y: number }>()
    canvasItems.forEach(canvasItem => {
      if (itemsToDrag.includes(canvasItem.id)) {
        startPositions.set(canvasItem.id, {
          x: canvasItem.position.x,
          y: canvasItem.position.y
        })
      }
    })
    
    setDraggedItemId(item.id)
    setDragStartPositions(startPositions)
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Convert mouse viewport position to canvas coordinates
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    const canvasMouseX = (viewportX - canvasOffset.x) / canvasZoom
    const canvasMouseY = (viewportY - canvasOffset.y) / canvasZoom
    
    // Store offset from mouse to item's position (in canvas space)
    setDragOffset({
      x: canvasMouseX - item.position.x,
      y: canvasMouseY - item.position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle canvas panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    // Handle item dragging
    if (!draggedItemId || dragStartPositions.size === 0) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Convert current mouse position to canvas coordinates
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    const canvasMouseX = (viewportX - canvasOffset.x) / canvasZoom
    const canvasMouseY = (viewportY - canvasOffset.y) / canvasZoom

    // Calculate new position for the dragged item
    const newX = canvasMouseX - dragOffset.x
    const newY = canvasMouseY - dragOffset.y

    // Get the dragged item's original position
    const draggedStartPos = dragStartPositions.get(draggedItemId)
    if (!draggedStartPos) return

    // Calculate how much the dragged item has moved from its start position
    const deltaX = newX - draggedStartPos.x
    const deltaY = newY - draggedStartPos.y

    // Update positions of all items that were selected when drag started
    setCanvasItems(items =>
      items.map(item => {
        const startPos = dragStartPositions.get(item.id)
        if (!startPos) return item // This item wasn't part of the drag
        
        // Calculate new position based on the stored start position
        const newPosX = startPos.x + deltaX
        const newPosY = startPos.y + deltaY
        
        // Constrain to canvas bounds
        const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 280, newPosX))
        const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, newPosY))
        
        return {
          ...item,
          position: { x: constrainedX, y: constrainedY }
        }
      })
    )
  }

  const handleMouseUp = () => {
    setDraggedItemId(null)
    setDragStartPositions(new Map())
    setIsPanning(false)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button always pans
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Figma-style controls:
    // Cmd/Ctrl + Scroll = Zoom
    // Two-finger drag (trackpad) or Shift + Scroll = Pan
    
    if (e.metaKey || e.ctrlKey) {
      // Zoom toward cursor position (Figma-style)
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Mouse position in viewport coordinates
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Calculate zoom change
      const zoomSpeed = 0.002
      const delta = -e.deltaY * zoomSpeed
      const newZoom = Math.max(0.25, Math.min(2, canvasZoom + delta))
      
      // Calculate what canvas point is currently under the cursor
      const canvasPointX = (mouseX - canvasOffset.x) / canvasZoom
      const canvasPointY = (mouseY - canvasOffset.y) / canvasZoom
      
      // Calculate new offset so that same canvas point stays under cursor
      const newOffsetX = mouseX - canvasPointX * newZoom
      const newOffsetY = mouseY - canvasPointY * newZoom
      
      setCanvasZoom(newZoom)
      setCanvasOffset({ x: newOffsetX, y: newOffsetY })
    } else {
      // Pan with two-finger drag (natural scrolling on trackpad)
      setCanvasOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }))
    }
  }

  const handleZoomIn = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) {
      setCanvasZoom(prev => Math.min(2, prev + 0.25))
      return
    }
    
    // Zoom toward center of viewport
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const newZoom = Math.min(2, canvasZoom + 0.25)
    
    // Calculate what canvas point is at center
    const canvasPointX = (centerX - canvasOffset.x) / canvasZoom
    const canvasPointY = (centerY - canvasOffset.y) / canvasZoom
    
    // Calculate new offset to keep center point stable
    const newOffsetX = centerX - canvasPointX * newZoom
    const newOffsetY = centerY - canvasPointY * newZoom
    
    setCanvasZoom(newZoom)
    setCanvasOffset({ x: newOffsetX, y: newOffsetY })
  }

  const handleZoomOut = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) {
      setCanvasZoom(prev => Math.max(0.25, prev - 0.25))
      return
    }
    
    // Zoom toward center of viewport
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const newZoom = Math.max(0.25, canvasZoom - 0.25)
    
    // Calculate what canvas point is at center
    const canvasPointX = (centerX - canvasOffset.x) / canvasZoom
    const canvasPointY = (centerY - canvasOffset.y) / canvasZoom
    
    // Calculate new offset to keep center point stable
    const newOffsetX = centerX - canvasPointX * newZoom
    const newOffsetY = centerY - canvasPointY * newZoom
    
    setCanvasZoom(newZoom)
    setCanvasOffset({ x: newOffsetX, y: newOffsetY })
  }

  const handleResetView = () => {
    setCanvasZoom(1)
    setCanvasOffset({ x: 0, y: 0 })
  }

  const handleFitToView = () => {
    if (canvasItems.length === 0) return
    
    // Calculate bounding box of all items
    const positions = canvasItems.map(item => item.position)
    const minX = Math.min(...positions.map(p => p.x))
    const maxX = Math.max(...positions.map(p => p.x + 280))
    const minY = Math.min(...positions.map(p => p.y))
    const maxY = Math.max(...positions.map(p => p.y + 200))
    
    const width = maxX - minX
    const height = maxY - minY
    
    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return
    
    // Calculate zoom to fit
    const zoomX = (canvasRect.width - 100) / width
    const zoomY = (canvasRect.height - 100) / height
    const newZoom = Math.max(0.25, Math.min(1, Math.min(zoomX, zoomY)))
    
    setCanvasZoom(newZoom)
    
    // Center the content
    const offsetX = (canvasRect.width - width * newZoom) / 2 - minX * newZoom
    const offsetY = (canvasRect.height - height * newZoom) / 2 - minY * newZoom
    
    setCanvasOffset({ x: offsetX, y: offsetY })
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect and close panel if clicking directly on canvas background
    // Check if the click target is the canvas or the transform container
    const target = e.target as HTMLElement
    if (target === canvasRef.current || target.closest('[data-canvas-content]')) {
      // If clicking on empty space (not on any card)
      if (target === canvasRef.current || (target.hasAttribute('data-canvas-content') && target === e.target)) {
        setSelectedItemIds([])
        handleClosePanel()
      }
    }
  }

  // Unused - kept for potential future use
  // const handleDeleteSelected = () => {
  //   if (selectedItemIds.length === 0) return
  //   
  //   if (confirm(`Delete ${selectedItemIds.length} item(s)?`)) {
  //     setCanvasItems(items => items.filter(item => !selectedItemIds.includes(item.id)))
  //     setSelectedItemIds([])
  //     posthog.capture('canvas_items_deleted', {
  //       count: selectedItemIds.length
  //     })
  //   }
  // }

  // Unused - kept for potential future use
  // const handleOpenEpisode = (episode: CanvasEpisode) => {
  //   setSelectedEpisode(episode)
  //   setPanelType('episode')
  // }

  const handleClosePanel = () => {
    setPanelType(null)
    // Small delay before clearing state to allow panel to animate out
    setTimeout(() => {
      setSelectedEpisode(null)
      setClipsToExport([])
    }, 300)
  }

  const transcribeEpisode = async (episodeId: string, audioUrl: string, title: string) => {
    // Add to transcribing set
    setTranscribingEpisodes(prev => new Set(prev).add(episodeId))
    
    try {
      const response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioUrl,
          episodeTitle: title
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Save transcript to localStorage by episodeId for future reuse
        storage.setTranscript(
          episodeId,
          data.transcript,
          data.status,
          undefined,
          data.segments
        )
        
        console.log('💾 Transcript saved to localStorage for:', title)
        
        // Update all canvas items with this episodeId
        setCanvasItems(items =>
          items.map(item => {
            if (item.type === 'episode' && (item as CanvasEpisode).episodeId === episodeId) {
              return {
                ...item,
                transcript: data.transcript,
                transcript_segments: data.segments
              } as CanvasEpisode
            }
            return item
          })
        )

        // Update selected episode if it matches
        if (selectedEpisode && selectedEpisode.episodeId === episodeId) {
          setSelectedEpisode({
            ...selectedEpisode,
            transcript: data.transcript,
            transcript_segments: data.segments
          })
        }

        posthog.capture('canvas_episode_transcribed', {
          episode_id: episodeId,
          segment_count: data.segments?.length || 0,
          saved_to_cache: true,
          auto_transcribed: true
        })
      } else {
        console.error('Transcription failed for:', title)
      }
    } catch (error) {
      console.error('Transcription error:', error)
    } finally {
      // Remove from transcribing set
      setTranscribingEpisodes(prev => {
        const next = new Set(prev)
        next.delete(episodeId)
        return next
      })
    }
  }

  const handleTranscribe = async (episodeId: string) => {
    if (!selectedEpisode) return
    
    setIsTranscribing(true)
    await transcribeEpisode(episodeId, selectedEpisode.audioUrl, selectedEpisode.title)
    setIsTranscribing(false)
  }

  const handleCreateClip = (clipData: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => {
    if (!selectedEpisode) return

    // Find all existing clips from this episode
    const existingClips = canvasItems.filter(
      item => item.type === 'clip' && (item as CanvasClip).episodeId === selectedEpisode.episodeId
    ) as CanvasClip[]

    // Smart positioning: place clips in a row below the episode
    const clipWidth = 280
    const clipHeight = 200
    const horizontalSpacing = 20
    const verticalOffset = 250 // Space below episode
    
    // Calculate position for new clip
    const clipIndex = existingClips.length
    const xPosition = selectedEpisode.position.x + (clipIndex * (clipWidth + horizontalSpacing))
    const yPosition = selectedEpisode.position.y + verticalOffset
    
    // Constrain to canvas bounds
    const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - clipWidth, xPosition))
    const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - clipHeight, yPosition))

    const newClip: CanvasClip = {
      ...clipData,
      id: `canvas-clip-${Date.now()}-${Math.random()}`,
      position: {
        x: constrainedX,
        y: constrainedY
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setCanvasItems([...canvasItems, newClip])
    posthog.capture('clip_created_on_canvas', {
      clip_title: clipData.title,
      clip_duration: clipData.duration,
      source_episode: selectedEpisode.episodeId,
      clip_index: clipIndex
    })

    // Don't close panel - user might want to create more clips
  }

  const handleCreateReel = () => {
    // Get selected clips only
    const selectedClips = canvasItems.filter(item => 
      selectedItemIds.includes(item.id) && item.type === 'clip'
    ) as CanvasClip[]
    
    if (selectedClips.length < 2) {
      alert('Please select at least 2 clips to create a Reel')
      return
    }
    
    // Calculate average position (center of selected clips)
    const avgX = selectedClips.reduce((sum, clip) => sum + clip.position.x, 0) / selectedClips.length
    const avgY = selectedClips.reduce((sum, clip) => sum + clip.position.y, 0) / selectedClips.length
    
    // Calculate total duration
    const totalDuration = selectedClips.reduce((sum, clip) => sum + clip.duration, 0)
    
    // Create reel title from clips
    const reelTitle = selectedClips.length === 2 
      ? `${selectedClips[0].title} + ${selectedClips[1].title}`
      : `Reel (${selectedClips.length} clips)`
    
    const newReel: CanvasReel = {
      id: `canvas-reel-${Date.now()}-${Math.random()}`,
      type: 'reel',
      title: reelTitle,
      clipIds: selectedClips.map(clip => clip.id),
      totalDuration,
      position: {
        x: Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 280, avgX)),
        y: Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, avgY + 300)) // Below clips
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setCanvasItems([...canvasItems, newReel])
    setSelectedItemIds([newReel.id]) // Select the new reel
    
    posthog.capture('reel_created_on_canvas', {
      reel_title: reelTitle,
      clip_count: selectedClips.length,
      total_duration: totalDuration
    })
  }

  const handleExportClip = (clip: CanvasClip) => {
    setClipsToExport([clip])
    setPanelType('export')
    posthog.capture('export_panel_opened', {
      clip_count: 1,
      source: 'single_clip'
    })
  }

  // Unused - kept for potential future use
  // const handleExportSelected = () => {
  //   const selectedClips = canvasItems.filter(
  //     item => item.type === 'clip' && selectedItemIds.includes(item.id)
  //   ) as CanvasClip[]
  //   
  //   if (selectedClips.length === 0) {
  //     alert('Please select at least one clip to export')
  //     return
  //   }
  //
  //   setClipsToExport(selectedClips)
  //   setPanelType('export')
  //   posthog.capture('export_panel_opened', {
  //     clip_count: selectedClips.length,
  //     source: 'toolbar'
  //   })
  // }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate connector lines from clips to their parent episodes
  const getConnectorLines = () => {
    const lines: Array<{ 
      type: 'episode-to-clip' | 'clip-to-reel',
      sourceId: string;
      targetId: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
    }> = []
    
    canvasItems.forEach(item => {
      // Episode to Clip connections
      if (item.type === 'clip') {
        const clip = item as CanvasClip
        // Find parent episode
        const parentEpisode = canvasItems.find(
          e => e.type === 'episode' && (e as CanvasEpisode).episodeId === clip.episodeId
        ) as CanvasEpisode | undefined
        
        if (parentEpisode) {
          // Calculate connection points
          // From bottom center of episode to top center of clip
          const episodeX = parentEpisode.position.x + 140 // Half of episode width (280/2)
          const episodeY = parentEpisode.position.y + 200 // Bottom of episode card
          
          const clipX = clip.position.x + 140 // Half of clip width (280/2)
          const clipY = clip.position.y // Top of clip card
          
          lines.push({
            type: 'episode-to-clip',
            sourceId: parentEpisode.id,
            targetId: clip.id,
            x1: episodeX,
            y1: episodeY,
            x2: clipX,
            y2: clipY,
            color: '#9333ea' // purple
          })
        }
      }
      
      // Clip to Reel connections
      if (item.type === 'reel') {
        const reel = item as CanvasReel
        reel.clipIds.forEach(clipId => {
          const clip = canvasItems.find(c => c.id === clipId) as CanvasClip | undefined
          if (clip) {
            // From bottom center of clip to top center of reel
            const clipX = clip.position.x + 140
            const clipY = clip.position.y + 200 // Bottom of clip card
            
            const reelX = reel.position.x + 140
            const reelY = reel.position.y // Top of reel card
            
            lines.push({
              type: 'clip-to-reel',
              sourceId: clip.id,
              targetId: reel.id,
              x1: clipX,
              y1: clipY,
              x2: reelX,
              y2: reelY,
              color: '#ea580c' // orange
            })
          }
        })
      }
    })
    
    return lines
  }

  return (
    <div className="flex h-screen bg-gray-50" style={{ overscrollBehavior: 'none' }}>
      {/* Sidebar - Podcast Search - Collapsible */}
      {!isSidebarCollapsed && (
        <div className="w-[360px] bg-white border-r border-gray-200 flex flex-col overflow-hidden relative">
          {/* Collapse button */}
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Collapse sidebar (more canvas space)"
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Canvas Clip Editor</h2>
            <p className="text-sm text-gray-600 mb-4">Search podcasts, drag episodes to canvas</p>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search podcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isSearching} size="sm">
              {isSearching ? '...' : 'Search'}
            </Button>
          </form>
        </div>

        {/* Search Results or Episodes */}
        <div className="flex-1 overflow-y-auto">
          {selectedPodcast ? (
            // Episode list
            <div className="p-4">
              <button
                onClick={() => {
                  setSelectedPodcast(null)
                  setEpisodes([])
                }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                ← Back to search
              </button>
              
              <div className="flex items-start gap-3 mb-4 pb-4 border-b">
                <img
                  src={selectedPodcast.imageUrl}
                  alt={selectedPodcast.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {selectedPodcast.title}
                  </h3>
                  <p className="text-xs text-gray-600">{selectedPodcast.author}</p>
                </div>
              </div>

              {isLoadingEpisodes ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading episodes...</p>
              ) : (
                <div className="space-y-2">
                  {episodes.map((episode) => (
                    <div
                      key={episode.id}
                      draggable
                      onDragStart={() => handleDragEpisodeStart(episode, selectedPodcast)}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                            {episode.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDuration(episode.duration)}
                          </p>
                        </div>
                        <div className="text-gray-400 text-xs">⋮⋮</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Podcast search results
            <div className="p-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    Search for podcasts to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((podcast) => (
                    <div
                      key={podcast.id}
                      onClick={() => loadEpisodes(podcast)}
                      className="p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={podcast.imageUrl}
                          alt={podcast.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                            {podcast.title}
                          </h3>
                          <p className="text-xs text-gray-600">{podcast.author}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {podcast.episodeCount} episodes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}
      
      {/* Collapsed Sidebar Toggle Button */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="fixed top-4 left-4 z-30 bg-white border border-gray-300 shadow-lg p-3 rounded-lg hover:bg-gray-50 transition-colors"
          title="Show podcast search"
        >
          <Search className="h-5 w-5 text-gray-700" />
        </button>
      )}

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col" style={{ overscrollBehavior: 'none' }}>
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {canvasItems.length} item{canvasItems.length !== 1 ? 's' : ''} on canvas
              </span>
              {selectedItemIds.length > 0 && (
                <span className="text-sm text-blue-600">
                  · {selectedItemIds.length} selected
                </span>
              )}
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-l pl-4">
              <Button onClick={handleZoomOut} variant="outline" size="sm" title="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-600 w-12 text-center font-mono">
                {Math.round(canvasZoom * 100)}%
              </span>
              <Button onClick={handleZoomIn} variant="outline" size="sm" title="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button onClick={handleFitToView} variant="outline" size="sm" title="Fit to view" disabled={canvasItems.length === 0}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button onClick={handleResetView} variant="outline" size="sm" title="Reset view">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 border-l pl-4">
              Two-finger drag to pan · ⌘+Scroll to zoom
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedItemIds.length > 0 && (
              <div className="text-xs text-gray-600 px-3 py-1 bg-gray-100 rounded">
                {selectedItemIds.length} selected
              </div>
            )}
            <Button
              onClick={() => {
                if (confirm('Clear entire canvas?')) {
                  setCanvasItems([])
                  setSelectedItemIds([])
                  posthog.capture('canvas_cleared')
                }
              }}
              variant="outline"
              size="sm"
            >
              Clear Canvas
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden bg-gray-50 ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: `${20 * canvasZoom}px ${20 * canvasZoom}px`,
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
            overscrollBehavior: 'none',
            touchAction: 'none'
          }}
        >
          {/* Canvas Content Container with Transform */}
          <div
            data-canvas-content
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0',
              width: `${CANVAS_MAX_X}px`,
              height: `${CANVAS_MAX_Y}px`,
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            {/* Connector Lines Layer (SVG) */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${CANVAS_MAX_X}px`,
                height: `${CANVAS_MAX_Y}px`,
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              {getConnectorLines().map((line, index) => {
                const isSelected = selectedItemIds.includes(line.sourceId) || selectedItemIds.includes(line.targetId)
                const lightColor = line.type === 'episode-to-clip' ? '#d8b4fe' : '#fed7aa' // purple or orange light
                return (
                  <g key={`connector-${line.type}-${line.sourceId}-${line.targetId}-${index}`}>
                    {/* Line */}
                    <line
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={isSelected ? line.color : lightColor}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray="8 4"
                      opacity={isSelected ? 0.8 : 0.5}
                    />
                    {/* Circle at source end */}
                    <circle
                      cx={line.x1}
                      cy={line.y1}
                      r={6}
                      fill={isSelected ? line.color : lightColor}
                      opacity={isSelected ? 0.8 : 0.5}
                    />
                    {/* Circle at target end */}
                    <circle
                      cx={line.x2}
                      cy={line.y2}
                      r={6}
                      fill={isSelected ? line.color : lightColor}
                      opacity={isSelected ? 0.8 : 0.5}
                    />
                  </g>
                )
              })}
            </svg>

            {canvasItems.length === 0 ? (
              <div 
                className="flex items-center justify-center pointer-events-none"
                style={{ 
                  width: `${CANVAS_MAX_X}px`, 
                  height: `${CANVAS_MAX_Y}px` 
                }}
              >
                <div className="text-center">
                  <div className="text-gray-300 text-6xl mb-4">🎙️</div>
                  <p className="text-gray-400 text-lg">Drop episodes here to start</p>
                  <p className="text-gray-400 text-sm mt-2">Search podcasts in the sidebar →</p>
                </div>
              </div>
            ) : (
              <>
                {canvasItems.map((item) => {
                if (item.type === 'episode') {
                  const episode = item as CanvasEpisode
                  const isSelected = selectedItemIds.includes(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Just select the episode (panel is always visible)
                        if (!e.shiftKey) {
                          setSelectedItemIds([item.id])
                        }
                      }}
                      className={`absolute cursor-pointer select-none group ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '280px',
                        zIndex: 10
                      }}
                    >
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow relative">
                        {/* Floating X delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Remove this episode from canvas?')) {
                              setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                              setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-20"
                          title="Remove from canvas"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        
                        <div className="flex items-start gap-3">
                          {episode.imageUrl && (
                            <img
                              src={episode.imageUrl}
                              alt={episode.title}
                              className="w-16 h-16 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                              {episode.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDuration(episode.duration)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Play/Pause button */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
                          <button
                            className="bg-purple-600 hover:bg-purple-700 rounded-full p-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const isThisPlaying = selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying
                              if (isThisPlaying) {
                                setPauseTrigger(Date.now())
                              } else {
                                setSelectedItemIds([item.id])
                                setPlayTrigger(Date.now())
                              }
                            }}
                            title={selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? "Pause" : "Play"}
                          >
                            {selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? (
                              <Pause className="h-4 w-4 text-white" />
                            ) : (
                              <Play className="h-4 w-4 text-white ml-0.5" />
                            )}
                          </button>
                        </div>
                        
                        {/* Transcript status badge */}
                        {transcribingEpisodes.has(episode.episodeId) ? (
                          <div className="absolute top-2 right-8 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Transcribing...</span>
                          </div>
                        ) : episode.transcript_segments && episode.transcript_segments.length > 0 ? (
                          <div className="absolute top-2 right-8 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>Ready</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                }
                
                if (item.type === 'clip') {
                  const clip = item as CanvasClip
                  const isSelected = selectedItemIds.includes(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute cursor-move select-none group ${
                        isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '280px',
                        zIndex: 10
                      }}
                    >
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg border-2 border-purple-300 p-4 hover:shadow-xl transition-shadow relative">
                        {/* Floating X delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Remove this clip from canvas?')) {
                              setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                              setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-20"
                          title="Remove from canvas"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        
                        <div className="flex items-start gap-2 mb-3">
                          <div className="bg-purple-600 text-white p-2 rounded">
                            <Scissors className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-purple-600 mb-1">CLIP</div>
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                              {clip.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Duration: {formatDuration(clip.duration)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white bg-opacity-50 rounded p-2 mb-3">
                          <p className="text-xs text-gray-700 line-clamp-3">
                            {clip.transcript}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                          {/* Play/Pause button */}
                          <button
                            className="bg-purple-600 hover:bg-purple-700 rounded-full p-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const isThisPlaying = selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying
                              if (isThisPlaying) {
                                setPauseTrigger(Date.now())
                              } else {
                                setSelectedItemIds([item.id])
                                setPlayTrigger(Date.now())
                              }
                            }}
                            title={selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? "Pause" : "Play"}
                          >
                            {selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? (
                              <Pause className="h-4 w-4 text-white" />
                            ) : (
                              <Play className="h-4 w-4 text-white ml-0.5" />
                            )}
                          </button>
                          
                          {/* Export button */}
                          <Button 
                            size="sm" 
                            className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportClip(clip)
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                if (item.type === 'reel') {
                  const reel = item as CanvasReel
                  const isSelected = selectedItemIds.includes(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Select the reel
                        if (!e.shiftKey) {
                          setSelectedItemIds([item.id])
                        }
                      }}
                      className={`absolute cursor-pointer select-none group ${
                        isSelected ? 'ring-2 ring-orange-500 ring-offset-2' : ''
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '280px',
                        zIndex: 10
                      }}
                    >
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow-lg border-2 border-orange-400 p-4 hover:shadow-xl transition-shadow relative">
                        {/* Floating X delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this Reel?')) {
                              setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                              setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
                            }
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-20"
                          title="Delete Reel"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        
                        <div className="flex items-start gap-2 mb-3">
                          <div className="bg-orange-600 text-white p-2 rounded">
                            <Film className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-orange-600 mb-1">🎬 REEL</div>
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                              {reel.title}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              {reel.clipIds.length} clips • {formatDuration(reel.totalDuration)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white bg-opacity-50 rounded p-2 mb-3">
                          <div className="flex flex-wrap gap-1">
                            {reel.clipIds.slice(0, 3).map((clipId, index) => {
                              const clip = canvasItems.find(i => i.id === clipId) as CanvasClip | undefined
                              return (
                                <div key={clipId} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                  {clip ? `Clip ${index + 1}` : 'Clip'}
                                </div>
                              )
                            })}
                            {reel.clipIds.length > 3 && (
                              <div className="text-xs text-gray-600 px-2 py-1">
                                +{reel.clipIds.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 items-center">
                          {/* Play/Pause button */}
                          <button
                            className="bg-orange-600 hover:bg-orange-700 rounded-full p-2 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const isThisPlaying = selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying
                              if (isThisPlaying) {
                                setPauseTrigger(Date.now())
                              } else {
                                setSelectedItemIds([item.id])
                                setPlayTrigger(Date.now())
                              }
                            }}
                            title={selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? "Pause" : "Play"}
                          >
                            {selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying ? (
                              <Pause className="h-4 w-4 text-white" />
                            ) : (
                              <Play className="h-4 w-4 text-white ml-0.5" />
                            )}
                          </button>
                          
                          {/* Export button */}
                          <Button 
                            size="sm" 
                            className="flex-1 text-xs bg-orange-600 hover:bg-orange-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Handle reel export (will open panel with clip list)
                              setSelectedItemIds([item.id])
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                return null
              })}
            </>
          )}
          </div>
          
          {/* Canvas boundary indicator */}
          <div 
            className="absolute pointer-events-none border-2 border-dashed border-gray-300"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})`,
              transformOrigin: '0 0',
              width: `${CANVAS_MAX_X}px`,
              height: `${CANVAS_MAX_Y}px`,
              top: 0,
              left: 0
            }}
          />
        </div>
      </div>

      {/* Always-Visible Right Panel (Figma-style) */}
      <div className="w-[360px] bg-white border-l border-gray-200 flex flex-col overflow-hidden z-40">
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            {selectedItemIds.length === 0 && 'Canvas'}
            {selectedItemIds.length === 1 && (() => {
              const selectedItem = canvasItems.find(item => item.id === selectedItemIds[0])
              if (selectedItem?.type === 'episode') return 'Episode'
              if (selectedItem?.type === 'clip') return 'Clip'
              if (selectedItem?.type === 'reel') return 'Reel'
              return 'Selection'
            })()}
            {selectedItemIds.length > 1 && `${selectedItemIds.length} Items Selected`}
          </h3>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedItemIds.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm p-8 text-center">
              Select something to see details
            </div>
          )}

          {selectedItemIds.length === 1 && (() => {
            const selectedItem = canvasItems.find(item => item.id === selectedItemIds[0])
            
            if (selectedItem?.type === 'episode') {
              const episode = selectedItem as CanvasEpisode
              return (
                <EpisodePanelContent
                  episode={episode}
                  onCreateClip={handleCreateClip}
                  onTranscribe={handleTranscribe}
                  isTranscribing={isTranscribing}
                />
              )
            }
            
            if (selectedItem?.type === 'clip') {
              const clip = selectedItem as CanvasClip
              return (
                <ExportPanelContent
                  clips={[clip]}
                  onExportComplete={() => setSelectedItemIds([])}
                />
              )
            }
            
            if (selectedItem?.type === 'reel') {
              const reel = selectedItem as CanvasReel
              const allClips = canvasItems.filter(item => item.type === 'clip') as CanvasClip[]
              
              return (
                <ReelPanelContent
                  reel={reel}
                  clips={allClips}
                  onUpdateReel={(updatedReel) => {
                    setCanvasItems(canvasItems.map(item => 
                      item.id === updatedReel.id ? updatedReel : item
                    ))
                  }}
                  onRemoveClip={(clipId) => {
                    // Remove clip from reel's clipIds
                    const updatedReel = {
                      ...reel,
                      clipIds: reel.clipIds.filter(id => id !== clipId),
                      totalDuration: reel.clipIds
                        .filter(id => id !== clipId)
                        .reduce((sum, id) => {
                          const clip = allClips.find(c => c.id === id)
                          return sum + (clip?.duration || 0)
                        }, 0),
                      updatedAt: new Date().toISOString()
                    }
                    
                    // Delete reel if no clips left
                    if (updatedReel.clipIds.length === 0) {
                      if (confirm('Reel is empty. Delete it?')) {
                        setCanvasItems(canvasItems.filter(item => item.id !== reel.id))
                        setSelectedItemIds([])
                      }
                    } else {
                      setCanvasItems(canvasItems.map(item => 
                        item.id === reel.id ? updatedReel : item
                      ))
                    }
                  }}
                  onPlayClip={(clipId) => {
                    setSelectedItemIds([clipId])
                    setPlayTrigger(Date.now())
                  }}
                />
              )
            }
            
            return null
          })()}

          {selectedItemIds.length > 1 && (
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  Multi-Selection
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  {(() => {
                    const selectedClips = canvasItems.filter(item => 
                      selectedItemIds.includes(item.id) && item.type === 'clip'
                    ) as CanvasClip[]
                    const totalDuration = selectedClips.reduce((sum, clip) => sum + clip.duration, 0)
                    return (
                      <>
                        <div>{selectedClips.length} clips selected</div>
                        <div>Total duration: {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</div>
                      </>
                    )
                  })()}
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={handleCreateReel}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Reel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Contextual Audio Player */}
      <ContextualPlayer
        selectedItems={canvasItems.filter(item => selectedItemIds.includes(item.id))}
        allItems={canvasItems}
        playTrigger={playTrigger}
        pauseTrigger={pauseTrigger}
        onPlayingChange={setIsPlaying}
      />
    </div>
  )
}
