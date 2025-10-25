'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'

// Augment Window interface for drag and drop
declare global {
  interface Window {
    __draggedEpisode?: {
      episode: { id: string; title: string; audioUrl: string; duration: number; imageUrl?: string; description?: string; publishedAt?: string }
      podcast: PodcastSearchResult
    }
  }
}
import { Search, Scissors, FileText, Play, Pause, ZoomIn, ZoomOut, Maximize2, Loader2, Film, X, Plus, Sparkles, Upload, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PodcastSearchResult, CanvasEpisode, CanvasClip, CanvasReel, CanvasItem, ClipSuggestion } from '@/types'
import { storage } from '@/lib/localStorage'
import { EpisodePanelContent } from '@/components/canvas/episode-panel-content'
import { ExportPanelContent } from '@/components/canvas/export-panel-content'
import { ReelPanelContent } from '@/components/canvas/reel-panel-content'
import { ContextualPlayer } from '@/components/canvas/contextual-player'
import { SourceCard } from '@/components/canvas/source-card'
import { ClipCard } from '@/components/canvas/clip-card'
import { PodcastSearchCard } from '@/components/podcasts/podcast-search-card'
import { EpisodeSearchCard } from '@/components/podcasts/episode-search-card'
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
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 }) // Current drag offset for visual feedback
  
  // Canvas view state (pan/zoom)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Selection rectangle state (drag to multi-select)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 })
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 })
  const [selectionShiftHeld, setSelectionShiftHeld] = useState(false)
  const [justCompletedSelection, setJustCompletedSelection] = useState(false)
  
  // Connection dragging state (drag from clip to reel)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingClipId, setConnectingClipId] = useState<string | null>(null)
  const [connectionEndPoint, setConnectionEndPoint] = useState({ x: 0, y: 0 })
  const [hoveredReelId, setHoveredReelId] = useState<string | null>(null)
  
  // Right panel state
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  // Track which episodes are currently transcribing (by episodeId)
  const [transcribingEpisodes, setTranscribingEpisodes] = useState<Set<string>>(new Set())
  
  // Track which episode is generating AI clips
  const [generatingClipsFor, setGeneratingClipsFor] = useState<string | null>(null)
  
  // Store uploaded audio files by episodeId for transcription
  const uploadedFilesRef = useRef<Map<string, File>>(new Map())
  
  // Search panel state
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  
  // Right panel resize state
  const [rightPanelWidth, setRightPanelWidth] = useState(360)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const MIN_PANEL_WIDTH = 260
  const MAX_PANEL_WIDTH = 600
  
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

  // Load canvas state and panel widths on mount
  useEffect(() => {
    const state = storage.getCanvasState()
    
    // Migrate old episodes: add podcastTitle if missing
    const migratedItems = state.items.map(item => {
      if (item.type === 'episode') {
        const episode = item as CanvasEpisode
        // If podcastTitle is missing, use a fallback
        if (!episode.podcastTitle) {
          return {
            ...episode,
            podcastTitle: 'Podcast' // Generic fallback - user can re-add for correct name
          } as CanvasEpisode
        }
      }
      return item
    })
    
    setCanvasItems(migratedItems)
    setSelectedItemIds(state.selectedItemIds)
    
    // Load right panel width from localStorage
    const savedRightWidth = localStorage.getItem('rightPanelWidth')
    if (savedRightWidth) setRightPanelWidth(parseInt(savedRightWidth))
    
    // Auto fit-to-view when returning to canvas with items
    if (migratedItems.length > 0) {
      setTimeout(() => {
        handleFitToView()
      }, 100)
    }
  }, [])

  // Handle Delete/Backspace key to remove selected items
  useEffect(() => {
    const handleDelete = (e: KeyboardEvent) => {
      // Check if Delete or Backspace was pressed
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemIds.length > 0) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return
        }

        e.preventDefault()
        
        // Remove selected items from canvas
        setCanvasItems(items => items.filter(item => !selectedItemIds.includes(item.id)))
        setSelectedItemIds([])
        
        posthog.capture('canvas_items_deleted', {
          count: selectedItemIds.length,
          method: 'keyboard'
        })
      }
    }

    window.addEventListener('keydown', handleDelete)
    return () => window.removeEventListener('keydown', handleDelete)
  }, [selectedItemIds])

  // Handle right panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRight) {
        const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - e.clientX))
        setRightPanelWidth(newWidth)
        localStorage.setItem('rightPanelWidth', newWidth.toString())
      }
    }

    const handleMouseUp = () => {
      setIsResizingRight(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizingRight) {
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isResizingRight, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH])
  
  // Auto-expand search panel when results are loaded
  useEffect(() => {
    if (searchResults.length > 0 || selectedPodcast) {
      setIsSearchExpanded(true)
    }
  }, [searchResults, selectedPodcast])
  
  // Collapse search panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside the search panel
      const searchPanel = document.querySelector('[data-search-panel]')
      if (isSearchExpanded && searchPanel && !searchPanel.contains(target)) {
        setIsSearchExpanded(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchExpanded])

  // Automatic debounced search - triggers 1 second after user stops typing
  useEffect(() => {
    // Clear results if search is empty
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSelectedPodcast(null)
      setEpisodes([])
      return
    }

    // Set up debounce timer
    setIsSearching(true)
    const debounceTimer = setTimeout(async () => {
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
    }, 250) // 0.25 second debounce

    // Cleanup function to cancel previous timer
    return () => {
      clearTimeout(debounceTimer)
      setIsSearching(false)
    }
  }, [searchQuery])

  // Save canvas state whenever it changes
  useEffect(() => {
    storage.setCanvasState({
      items: canvasItems,
      selectedItemIds,
      lastUpdated: new Date().toISOString()
    })
  }, [canvasItems, selectedItemIds])

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
    const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 340, x))
    const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, y))

    // Check if we already have a transcript for this episode
    const existingTranscript = storage.getTranscript(episode.id)

    // Create new canvas episode
    const newItem: CanvasEpisode = {
      id: `canvas-episode-${Date.now()}-${Math.random()}`,
      type: 'episode',
      episodeId: episode.id,
      podcastId: podcast.id.toString(),
      podcastTitle: podcast.title,
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
    
    // Auto-select the newly dropped episode
    setSelectedItemIds([newItem.id])
    
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
    // Handle connection dragging
    if (isConnecting) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Convert to canvas coordinates
      const viewportX = e.clientX - rect.left
      const viewportY = e.clientY - rect.top
      
      const canvasX = (viewportX - canvasOffset.x) / canvasZoom
      const canvasY = (viewportY - canvasOffset.y) / canvasZoom
      
      setConnectionEndPoint({ x: canvasX, y: canvasY })
      return
    }
    
    // Handle selection rectangle
    if (isSelecting) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Convert to canvas coordinates
      const viewportX = e.clientX - rect.left
      const viewportY = e.clientY - rect.top
      
      const canvasX = (viewportX - canvasOffset.x) / canvasZoom
      const canvasY = (viewportY - canvasOffset.y) / canvasZoom
      
      setSelectionEnd({ x: canvasX, y: canvasY })
      return
    }
    
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

    // Handle item dragging - only update visual delta, not state
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

    // Only update the visual delta, not the actual positions (for performance)
    setDragDelta({ x: deltaX, y: deltaY })
  }

  const handleMouseUp = () => {
    // Complete connection dragging
    if (isConnecting && connectingClipId && hoveredReelId) {
      // Add clip to reel
      setCanvasItems(items =>
        items.map(item => {
          if (item.id === hoveredReelId && item.type === 'reel') {
            const reel = item as CanvasReel
            // Only add if not already in the reel
            if (!reel.clipIds.includes(connectingClipId)) {
              return {
                ...reel,
                clipIds: [...reel.clipIds, connectingClipId]
              }
            }
          }
          return item
        })
      )
      
      posthog.capture('clip_connected_to_reel', {
        clip_id: connectingClipId,
        reel_id: hoveredReelId
      })
    }
    
    setIsConnecting(false)
    setConnectingClipId(null)
    setHoveredReelId(null)
    
    // Complete selection rectangle
    if (isSelecting) {
      // Calculate selection rectangle bounds
      const left = Math.min(selectionStart.x, selectionEnd.x)
      const right = Math.max(selectionStart.x, selectionEnd.x)
      const top = Math.min(selectionStart.y, selectionEnd.y)
      const bottom = Math.max(selectionStart.y, selectionEnd.y)
      
      // Find items that intersect with the selection rectangle
      const selectedIds = canvasItems
        .filter(item => {
          const itemLeft = item.position.x
          const itemRight = item.position.x + 340 // Card width
          const itemTop = item.position.y
          const itemBottom = item.position.y + (item.type === 'episode' ? 180 : 220) // Approx card heights
          
          // Check for intersection
          return !(right < itemLeft || left > itemRight || bottom < itemTop || top > itemBottom)
        })
        .map(item => item.id)
      
      // Update selection (respect shift key for additive selection)
      if (selectionShiftHeld) {
        // Add to existing selection
        setSelectedItemIds(prev => {
          const uniqueNew = selectedIds.filter(id => !prev.includes(id))
          return [...prev, ...uniqueNew]
        })
      } else {
        // Replace selection
        setSelectedItemIds(selectedIds)
      }
      
      setIsSelecting(false)
      setSelectionShiftHeld(false)
      setJustCompletedSelection(true)
      
      // Reset the flag after a brief delay to allow click event to be ignored
      setTimeout(() => setJustCompletedSelection(false), 10)
      return
    }
    
    // Apply final positions if we were dragging
    if (draggedItemId && dragStartPositions.size > 0 && (dragDelta.x !== 0 || dragDelta.y !== 0)) {
      setCanvasItems(items =>
        items.map(item => {
          const startPos = dragStartPositions.get(item.id)
          if (!startPos) return item // This item wasn't part of the drag
          
          // Calculate final position based on the stored start position + delta
          const newPosX = startPos.x + dragDelta.x
          const newPosY = startPos.y + dragDelta.y
          
          // Constrain to canvas bounds
          const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 340, newPosX))
          const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, newPosY))
          
          return {
            ...item,
            position: { x: constrainedX, y: constrainedY }
          }
        })
      )
    }
    
    setDraggedItemId(null)
    setDragStartPositions(new Map())
    setDragDelta({ x: 0, y: 0 })
    setIsPanning(false)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button always pans
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Left click on canvas background (not on items) starts selection rectangle
    const target = e.target as HTMLElement
    const isCanvasBackground = 
      target === canvasRef.current || 
      target.hasAttribute('data-canvas-content') ||
      target.tagName.toLowerCase() === 'svg'
    
    if (e.button === 0 && isCanvasBackground) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      // Convert to canvas coordinates
      const viewportX = e.clientX - rect.left
      const viewportY = e.clientY - rect.top
      
      const canvasX = (viewportX - canvasOffset.x) / canvasZoom
      const canvasY = (viewportY - canvasOffset.y) / canvasZoom
      
      setIsSelecting(true)
      setSelectionStart({ x: canvasX, y: canvasY })
      setSelectionEnd({ x: canvasX, y: canvasY })
      setSelectionShiftHeld(e.shiftKey)
      
      // Clear selection immediately if not holding shift
      if (!e.shiftKey) {
        setSelectedItemIds([])
      }
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

  const handleFitToView = () => {
    if (canvasItems.length === 0) return
    
    // Calculate bounding box of all items
    const positions = canvasItems.map(item => item.position)
    const minX = Math.min(...positions.map(p => p.x))
    const maxX = Math.max(...positions.map(p => p.x + 340))
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
    // Don't clear selection if we just completed a drag-to-select
    if (justCompletedSelection) {
      return
    }
    
    // Only deselect and close panel if clicking directly on canvas background
    // Check if the click target is the canvas or the transform container
    const target = e.target as HTMLElement
    if (target === canvasRef.current || target.closest('[data-canvas-content]')) {
      // If clicking on empty space (not on any card)
      if (target === canvasRef.current || (target.hasAttribute('data-canvas-content') && target === e.target)) {
        setSelectedItemIds([])
        setIsSearchExpanded(false) // Collapse search when clicking canvas
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

  const transcribeEpisode = async (episodeId: string, audioUrl: string, title: string) => {
    // Add to transcribing set
    setTranscribingEpisodes(prev => new Set(prev).add(episodeId))
    
    try {
      // Check if this is an uploaded file
      const audioFile = uploadedFilesRef.current.get(episodeId)
      
      let response
      if (audioFile) {
        // Use FormData for uploaded files
        const formData = new FormData()
        formData.append('audio', audioFile)
        formData.append('title', title)
        
        response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
          method: 'POST',
          body: formData
        })
      } else {
        // Use JSON for podcast episodes with URLs
        response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audioUrl,
            episodeTitle: title
          })
        })
      }

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

        posthog.capture('canvas_episode_transcribed', {
          episode_id: episodeId,
          segment_count: data.segments?.length || 0,
          saved_to_cache: true,
          auto_transcribed: true
        })
        
        // Clean up uploaded file from memory
        if (uploadedFilesRef.current.has(episodeId)) {
          uploadedFilesRef.current.delete(episodeId)
          console.log('🗑️ Cleaned up uploaded file from memory')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Transcription failed for:', title)
        console.error('Error details:', errorData.details || errorData.error)
        
        // Show user-friendly error
        alert(`Transcription failed: ${errorData.details || errorData.error}\n\nEpisode: ${title}`)
        
        posthog.capture('canvas_transcription_failed', {
          episode_id: episodeId,
          episode_title: title,
          error: errorData.details || errorData.error
        })
      }
    } catch (error) {
      console.error('❌ Transcription error:', error)
      alert(`Transcription error: ${error instanceof Error ? error.message : 'Network error'}\n\nEpisode: ${title}`)
      
      posthog.capture('canvas_transcription_error', {
        episode_id: episodeId,
        episode_title: title,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
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
    // Find the episode from canvas items
    const episode = canvasItems.find(
      item => item.type === 'episode' && (item as CanvasEpisode).episodeId === episodeId
    ) as CanvasEpisode | undefined
    
    if (!episode) {
      console.error('Episode not found on canvas:', episodeId)
      return
    }
    
    setIsTranscribing(true)
    await transcribeEpisode(episodeId, episode.audioUrl, episode.title)
    setIsTranscribing(false)
  }

  const handleCreateClip = (clipData: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => {
    // Find the parent episode from canvas items
    const episode = canvasItems.find(
      item => item.type === 'episode' && (item as CanvasEpisode).episodeId === clipData.episodeId
    ) as CanvasEpisode | undefined
    
    if (!episode) {
      console.error('Parent episode not found on canvas:', clipData.episodeId)
      return
    }

    // Find all existing clips from this episode
    const existingClips = canvasItems.filter(
      item => item.type === 'clip' && (item as CanvasClip).episodeId === episode.episodeId
    ) as CanvasClip[]

    // Smart positioning: place clips in a row below the episode
    const clipWidth = 340
    const clipHeight = 200
    const horizontalSpacing = 20
    const verticalOffset = 250 // Space below episode
    
    // Calculate position for new clip
    const clipIndex = existingClips.length
    const xPosition = episode.position.x + (clipIndex * (clipWidth + horizontalSpacing))
    const yPosition = episode.position.y + verticalOffset
    
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
    
    // Auto-select the newly created clip (optimizes for fast clip creation flow)
    setSelectedItemIds([newClip.id])
    
    posthog.capture('clip_created_on_canvas', {
      clip_title: clipData.title,
      clip_duration: clipData.duration,
      source_episode: episode.episodeId,
      clip_index: clipIndex
    })
  }

  /**
   * Generate AI clip suggestions and add them to canvas
   */
  const handleGenerateAIClips = async (episode: CanvasEpisode) => {
    if (!episode.transcript_segments || episode.transcript_segments.length === 0) {
      alert('Episode needs to be transcribed first')
      return
    }

    setGeneratingClipsFor(episode.episodeId)

    try {
      const response = await fetch(`/api/episodes/${episode.episodeId}/analyze-clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: episode.transcript_segments.map(s => s.text).join(' '),
          segments: episode.transcript_segments,
          maxSuggestions: 3, // Only get top 3
          episodeTitle: episode.title,
          episodeDescription: '' // TODO: Add description to CanvasEpisode type
        })
      })

      if (!response.ok) {
        throw new Error('AI analysis failed')
      }

      const { suggestions } = await response.json()

      if (!suggestions || suggestions.length === 0) {
        alert('No clips found. Try transcribing a different episode.')
        return
      }

      // Find all existing clips from this episode to position new ones correctly
      const existingClips = canvasItems.filter(
        item => item.type === 'clip' && (item as CanvasClip).episodeId === episode.episodeId
      ) as CanvasClip[]

      // Create clip cards on canvas for each suggestion
      const newClips: CanvasClip[] = []
      suggestions.forEach((suggestion: ClipSuggestion, index: number) => {
        const clipData: Omit<CanvasClip, 'id' | 'createdAt' | 'updatedAt' | 'position'> = {
          type: 'clip',
          episodeId: episode.episodeId,
          title: suggestion.title,
          audioUrl: episode.audioUrl,
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          duration: suggestion.duration,
          transcript: suggestion.transcript,
          segments: suggestion.segments
        }

        // Position clips below the episode, spread horizontally
        const clipWidth = 340
        const horizontalSpacing = 20
        const clipIndex = existingClips.length + index
        const xOffset = clipIndex * (clipWidth + horizontalSpacing)
        const yOffset = 250 // Below the episode card
        
        const xPosition = episode.position.x + xOffset
        const yPosition = episode.position.y + yOffset
        
        // Constrain to canvas bounds
        const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - clipWidth, xPosition))
        const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, yPosition))

        const newClip: CanvasClip = {
          ...clipData,
          id: `canvas-clip-ai-${Date.now()}-${index}`,
          position: {
            x: constrainedX,
            y: constrainedY
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        newClips.push(newClip)
      })

      // Add all clips to canvas
      setCanvasItems(prev => [...prev, ...newClips])

      // Select the episode and new clips to highlight them
      setSelectedItemIds([episode.id, ...newClips.map(c => c.id)])

      // Track event
      posthog.capture('ai_clips_generated', {
        episode_id: episode.episodeId,
        clip_count: newClips.length,
        episode_title: episode.title
      })

      console.log(`✨ Generated ${newClips.length} AI clips!`)

    } catch (error) {
      console.error('Failed to generate AI clips:', error)
      alert('Failed to generate clips. Please try again.')
    } finally {
      setGeneratingClipsFor(null)
    }
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
        x: Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 340, avgX)),
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Only accept audio files
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, etc.)')
      return
    }

    // Create blob URL for the audio file (for playback)
    const audioUrl = URL.createObjectURL(file)
    
    // Extract filename without extension for title
    const fileName = file.name.replace(/\.[^/.]+$/, '')
    
    // Create audio element to get duration
    const audio = new Audio()
    audio.src = audioUrl
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(audio.duration)
      const episodeId = `upload-${Date.now()}`
      
      // Store the File object for transcription
      uploadedFilesRef.current.set(episodeId, file)
      
      // Create new canvas episode from uploaded file
      const newItem: CanvasEpisode = {
        id: `canvas-episode-upload-${Date.now()}-${Math.random()}`,
        type: 'episode',
        episodeId: episodeId,
        podcastId: 'uploaded-file',
        podcastTitle: 'Uploaded Audio',
        title: fileName,
        audioUrl: audioUrl,
        imageUrl: undefined, // No image for uploaded files
        duration: duration,
        position: { 
          x: 100, 
          y: 100 
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setCanvasItems(prev => [...prev, newItem])
      
      // Auto-select the newly uploaded file
      setSelectedItemIds([newItem.id])
      
      posthog.capture('audio_file_uploaded', {
        file_name: fileName,
        file_size: file.size,
        duration: duration
      })

      // Auto-transcribe the uploaded file
      console.log('🎙️ Starting auto-transcription for uploaded file:', fileName)
      transcribeEpisode(episodeId, audioUrl, fileName)
    })

    // Reset file input
    e.target.value = ''
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
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Memoize connector lines calculation - include dragDelta for live updates during drag
  const connectorLines = useMemo(() => {
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
          let episodeX = parentEpisode.position.x + 170 // Half of episode width (340/2)
          let episodeY = parentEpisode.position.y + 110 // Bottom of episode card (adjusted for compact height)
          
          let clipX = clip.position.x + 170 // Half of clip width (340/2)
          let clipY = clip.position.y // Top of clip card
          
          // Apply drag delta if items are being dragged
          if (dragStartPositions.has(parentEpisode.id)) {
            episodeX += dragDelta.x
            episodeY += dragDelta.y
          }
          if (dragStartPositions.has(clip.id)) {
            clipX += dragDelta.x
            clipY += dragDelta.y
          }
          
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
            let clipX = clip.position.x + 170
            let clipY = clip.position.y + 200 // Bottom of clip card
            
            let reelX = reel.position.x + 170
            let reelY = reel.position.y // Top of reel card
            
            // Apply drag delta if items are being dragged
            if (dragStartPositions.has(clip.id)) {
              clipX += dragDelta.x
              clipY += dragDelta.y
            }
            if (dragStartPositions.has(reel.id)) {
              reelX += dragDelta.x
              reelY += dragDelta.y
            }
            
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
  }, [canvasItems, dragDelta, dragStartPositions])

  return (
    <div className="flex h-screen bg-gray-50" style={{ overscrollBehavior: 'none' }}>
      {/* Floating Search Card - Top Left */}
      <div 
        data-search-panel
        className="fixed top-4 left-4 z-30 w-80 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-xl"
      >
        {/* Header - Always Visible - Using Figma tokens: p-[16px] outer card + p-[4px] logo container */}
        <div className="px-[16px] pt-[16px] pb-0">
          <div className="p-[4px]">
            <img 
              src="/ensemble-studio-logo-v1.svg" 
              alt="Ensemble" 
              className="h-[32px] w-auto"
            />
          </div>
        </div>

        {/* Search Input - Only show when NOT viewing episodes */}
        {!selectedPodcast && (
          <div className="px-[16px] pt-[8px] pb-[16px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search podcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
                onFocus={() => {
                  if (searchResults.length > 0 || selectedPodcast) {
                    setIsSearchExpanded(true)
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* "Back to search" button - Only show when viewing episodes */}
        {selectedPodcast && (
          <div className="px-[16px] pt-[8px]">
            <Button
              type="button"
              variant="tertiary"
              size="med"
              onClick={() => {
                setSelectedPodcast(null)
                setEpisodes([])
              }}
              className="w-full justify-start"
            >
              ← Return to Search
            </Button>
          </div>
        )}

        {/* Expanded Results (Collapsible) */}
        {isSearchExpanded && (searchResults.length > 0 || selectedPodcast) && (
          <>
            {/* Results Container - Scrollable with proper structure */}
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {selectedPodcast ? (
                // Episode list with podcast header - Using Figma structure for state=state3
                <div className="flex flex-col h-full">
                  {/* Podcast Header - Figma: px-[4px] py-[8px] gap-[10px] */}
                  <div className="flex flex-col gap-[10px] px-[4px] py-[8px] shrink-0">
                    <div className="flex gap-[9px] items-center py-[1px]">
                      <img
                        src={selectedPodcast.imageUrl}
                        alt={selectedPodcast.title}
                        className="w-[57px] h-[57px] rounded-[4px] object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
                        <h3 
                          className="text-black line-clamp-2"
                          style={{
                            fontFamily: 'Noto Sans, sans-serif',
                            fontSize: '16px',
                            fontWeight: 600,
                            lineHeight: '1.4',
                            letterSpacing: '-0.32px'
                          }}
                        >
                          {selectedPodcast.title}
                        </h3>
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
                          {selectedPodcast.author}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Episode List - Figma: bg-white gap-[8px] grow */}
                  <div className="flex-1 bg-white flex flex-col gap-[8px] overflow-y-auto">
                    {isLoadingEpisodes ? (
                      <p className="text-sm text-gray-500 text-center py-4">Loading episodes...</p>
                    ) : (
                      <>
                        {episodes.map((episode) => (
                          <div 
                            key={episode.id}
                            draggable
                            onDragStart={() => handleDragEpisodeStart(episode, selectedPodcast)}
                            className="cursor-move"
                          >
                            <EpisodeSearchCard
                              title={episode.title}
                              description={episode.description || ''}
                              date={new Date(episode.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              duration={formatDuration(episode.duration)}
                              onClick={() => {}}
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Podcast search results - Figma: content inside basis-0 grow container with gap-[10px]
                <div className="px-[16px] flex flex-col gap-[10px] h-full">
                  {searchResults.map((podcast) => (
                    <PodcastSearchCard
                      key={podcast.id}
                      title={podcast.title}
                      author={podcast.author}
                      episodeCount={podcast.episodeCount}
                      imageUrl={podcast.imageUrl}
                      onClick={() => loadEpisodes(podcast)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Upload Button - Figma: border-t-[1px] border-[#f3f3f3] gap-[8px] pt-[8px] pb-0 px-[4px] */}
            <div className="border-t border-[#f3f3f3] flex gap-[8px] items-center justify-end pt-[8px] pb-0 px-[4px] bg-white shrink-0">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload"
              />
              <Button
                type="button"
                variant="tertiary"
                size="med"
                onClick={() => document.getElementById('audio-upload')?.click()}
              >
                Upload File
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col" style={{ overscrollBehavior: 'none' }}>
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
              {connectorLines.map((line, index) => {
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
              
              {/* Active connection line during drag */}
              {isConnecting && connectingClipId && (() => {
                const connectingClip = canvasItems.find(i => i.id === connectingClipId)
                if (!connectingClip) return null
                
                const clipX = connectingClip.position.x + 170 // Center of card
                const clipY = connectingClip.position.y + 220 // Bottom of clip card
                
                return (
                  <g>
                    <line
                      x1={clipX}
                      y1={clipY}
                      x2={connectionEndPoint.x}
                      y2={connectionEndPoint.y}
                      stroke="#f97316"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      opacity={0.8}
                    />
                    <circle
                      cx={clipX}
                      cy={clipY}
                      r={6}
                      fill="#f97316"
                      opacity={0.8}
                    />
                    <circle
                      cx={connectionEndPoint.x}
                      cy={connectionEndPoint.y}
                      r={6}
                      fill={hoveredReelId ? "#22c55e" : "#f97316"}
                      opacity={0.8}
                    />
                  </g>
                )
              })()}
            </svg>

            {/* Selection Rectangle */}
            {isSelecting && (
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.min(selectionStart.x, selectionEnd.x)}px`,
                  top: `${Math.min(selectionStart.y, selectionEnd.y)}px`,
                  width: `${Math.abs(selectionEnd.x - selectionStart.x)}px`,
                  height: `${Math.abs(selectionEnd.y - selectionStart.y)}px`,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '2px solid rgb(59, 130, 246)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  zIndex: 999
                }}
              />
            )}

            {canvasItems.length === 0 ? null : (
              <>
                {canvasItems.map((item) => {
                if (item.type === 'episode') {
                  const episode = item as CanvasEpisode
                  const isSelected = selectedItemIds.includes(item.id)
                  const isDragging = dragStartPositions.has(item.id)
                  const isTranscribing = transcribingEpisodes.has(episode.episodeId)
                  const hasTranscript = episode.transcript_segments && episode.transcript_segments.length > 0
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      className={`absolute select-none group ${
                        isDragging ? '' : 'transition-all duration-150'
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '361px',
                        zIndex: isSelected ? 20 : 10,
                        transform: isDragging ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : 'none'
                      }}
                    >
                      {/* Figma Source Card */}
                      <SourceCard
                        id={episode.episodeId}
                        title={episode.title}
                        podcastTitle={episode.podcastTitle}
                        duration={episode.duration}
                        imageUrl={episode.imageUrl}
                        isTranscribed={hasTranscript}
                        isActive={isSelected}
                        onClick={(e) => {
                          if (!e) return
                          e.stopPropagation()
                          if (!(e as React.MouseEvent).shiftKey) {
                            setSelectedItemIds([item.id])
                          }
                        }}
                        onPlayClick={(e) => {
                          e.stopPropagation()
                          const isThisPlaying = selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying
                          if (isThisPlaying) {
                            setPauseTrigger(Date.now())
                          } else {
                            setSelectedItemIds([item.id])
                            setPlayTrigger(Date.now())
                          }
                        }}
                      />
                      
                      {/* Floating X delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                          setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-30"
                        title="Remove from canvas"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      
                      {/* AI Transcribing indicator */}
                      {isTranscribing && (
                        <div className="absolute -top-8 left-0 right-0 flex justify-center pointer-events-none">
                          <div className="inline-flex bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] px-2 py-1 rounded-full items-center gap-1 shadow-lg">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="font-medium">AI Transcribing</span>
                          </div>
                        </div>
                      )}
                      
                      {/* AI Clip Generator Button - hanging off bottom-right */}
                      {hasTranscript && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await handleGenerateAIClips(episode)
                          }}
                          disabled={generatingClipsFor === episode.episodeId}
                          className="absolute -bottom-3 -right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all shadow-lg hover:shadow-xl hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed z-30"
                          title="Generate AI clip suggestions"
                        >
                          {generatingClipsFor === episode.episodeId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )
                }
                
                if (item.type === 'clip') {
                  const clip = item as CanvasClip
                  const isSelected = selectedItemIds.includes(item.id)
                  const isDragging = dragStartPositions.has(item.id)
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      className={`absolute select-none group ${
                        isDragging ? '' : 'transition-all duration-150'
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '361px',
                        zIndex: isSelected ? 20 : 10,
                        transform: isDragging ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : 'none'
                      }}
                    >
                      {/* Figma Clip Card */}
                      <ClipCard
                        id={clip.id}
                        title={clip.title}
                        duration={clip.duration}
                        transcriptPreview={clip.transcript}
                        isActive={isSelected}
                        onClick={(e) => {
                          if (!e) return
                          e.stopPropagation()
                          if (!(e as React.MouseEvent).shiftKey) {
                            setSelectedItemIds([item.id])
                          }
                        }}
                        onPlayClick={(e) => {
                          e.stopPropagation()
                          const isThisPlaying = selectedItemIds.includes(item.id) && selectedItemIds.length === 1 && isPlaying
                          if (isThisPlaying) {
                            setPauseTrigger(Date.now())
                          } else {
                            setSelectedItemIds([item.id])
                            setPlayTrigger(Date.now())
                          }
                        }}
                      />
                      
                      {/* Floating X delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                          setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-30"
                        title="Remove from canvas"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      
                      {/* Connection handle at bottom center - drag to add to reel */}
                      <div
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity shadow-lg cursor-pointer hover:scale-110 z-30 flex items-center justify-center"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setIsConnecting(true)
                          setConnectingClipId(clip.id)
                          setConnectionEndPoint({ x: item.position.x + 170, y: item.position.y + 220 })
                        }}
                        title="Drag to add this clip to a reel"
                      >
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )
                }
                
                if (item.type === 'reel') {
                  const reel = item as CanvasReel
                  const isSelected = selectedItemIds.includes(item.id)
                  const isDragging = dragStartPositions.has(item.id)
                  
                  const isHoveredForConnection = isConnecting && hoveredReelId === item.id
                  
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, item)}
                      onMouseEnter={() => {
                        if (isConnecting) {
                          setHoveredReelId(item.id)
                        }
                      }}
                      onMouseLeave={() => {
                        if (isConnecting) {
                          setHoveredReelId(null)
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Select the reel
                        if (!e.shiftKey) {
                          setSelectedItemIds([item.id])
                        }
                      }}
                      className={`absolute cursor-pointer select-none group ${
                        isDragging ? '' : 'transition-all duration-150'
                      } ${
                        isSelected ? 'ring-4 ring-orange-500 shadow-xl rounded-lg' : 
                        isHoveredForConnection ? 'ring-4 ring-green-500 shadow-xl rounded-lg' : 
                        'ring-0 ring-transparent'
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '340px',
                        zIndex: isSelected ? 20 : 10,
                        transform: isDragging ? `translate(${dragDelta.x}px, ${dragDelta.y}px)` : 'none'
                      }}
                    >
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow-lg border-2 border-orange-400 p-4 hover:shadow-xl transition-shadow relative">
                        {/* Floating X delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCanvasItems(canvasItems.filter(i => i.id !== item.id))
                            setSelectedItemIds(selectedItemIds.filter(id => id !== item.id))
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
          
          {/* Floating Zoom Controls - Bottom Right */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-1 z-40">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded transition-colors group"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4 text-gray-700 group-hover:text-gray-900" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded transition-colors group"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4 text-gray-700 group-hover:text-gray-900" />
            </button>
            <button
              onClick={handleFitToView}
              disabled={canvasItems.length === 0}
              className="p-2 hover:bg-gray-100 rounded transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
              title="Fit to view"
            >
              <Maximize2 className="h-4 w-4 text-gray-700 group-hover:text-gray-900" />
            </button>
          </div>

          {/* Contextual Audio Player */}
          <ContextualPlayer
            selectedItems={canvasItems.filter(item => selectedItemIds.includes(item.id))}
            allItems={canvasItems}
            playTrigger={playTrigger}
            pauseTrigger={pauseTrigger}
            onPlayingChange={setIsPlaying}
          />
          
          {/* Empty State - Outside transformed content */}
          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="text-center">
                <div className="text-gray-300 text-6xl mb-4">🎙️</div>
                <p className="text-gray-400 text-lg font-medium">Drop episodes here to start</p>
                <p className="text-gray-400 text-sm mt-2">← Search podcasts in the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Always-Visible Right Panel (Figma-style) */}
      <div 
        className="bg-white border-l border-gray-200 flex flex-col overflow-hidden z-40 relative group"
        style={{ width: `${rightPanelWidth}px`, minWidth: `${MIN_PANEL_WIDTH}px`, maxWidth: `${MAX_PANEL_WIDTH}px` }}
      >
        {/* Resize Handle */}
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 group-hover:bg-blue-300 transition-colors z-50"
          onMouseDown={() => setIsResizingRight(true)}
          title="Drag to resize"
        />
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          {selectedItemIds.length === 1 && (() => {
            const selectedItem = canvasItems.find(item => item.id === selectedItemIds[0])
            if (selectedItem?.type === 'episode') {
              const episode = selectedItem as CanvasEpisode
              return (
                <div className="flex items-center gap-3">
                  {episode.imageUrl ? (
                    <img
                      src={episode.imageUrl}
                      alt={episode.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Music className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Podcast title eyebrow */}
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                      {episode.podcastTitle}
                    </p>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                      {episode.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDuration(episode.duration)}
                    </p>
                  </div>
                </div>
              )
            }
            if (selectedItem?.type === 'clip') {
              const clip = selectedItem as CanvasClip
              return (
                <div className="flex items-center gap-3">
                  {clip.imageUrl ? (
                    <img
                      src={clip.imageUrl}
                      alt={clip.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Scissors className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 leading-tight">
                      {clip.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Clip · {formatDuration(clip.duration)}
                    </p>
                  </div>
                </div>
              )
            }
            if (selectedItem?.type === 'reel') {
              const reel = selectedItem as CanvasReel
              return (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                    <Film className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 leading-tight">
                      {reel.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reel · {reel.clipIds.length} clips · {formatDuration(reel.totalDuration)}
                    </p>
                  </div>
                </div>
              )
            }
            return <h3 className="text-sm font-semibold text-gray-900">Selection</h3>
          })()}
          {selectedItemIds.length > 1 && (
            <h3 className="text-sm font-semibold text-gray-900">{selectedItemIds.length} Items Selected</h3>
          )}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedItemIds.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">
                  {canvasItems.length === 0 ? 'Canvas is empty' : `${canvasItems.length} item${canvasItems.length !== 1 ? 's' : ''} on canvas`}
                </p>
                <p className="text-xs text-gray-400">
                  Select an item to see details
                </p>
              </div>
              
              {canvasItems.length > 0 && (
                <Button
                  onClick={() => {
                    setCanvasItems([])
                    setSelectedItemIds([])
                    posthog.capture('canvas_cleared')
                  }}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  Clear Canvas
                </Button>
              )}
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
                      setCanvasItems(canvasItems.filter(item => item.id !== reel.id))
                      setSelectedItemIds([])
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
    </div>
  )
}
