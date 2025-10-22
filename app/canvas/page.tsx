'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Scissors, Download, Trash2, FileText, Play, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PodcastSearchResult, CanvasEpisode, CanvasClip, CanvasItem, TranscriptionStatus } from '@/types'
import { storage } from '@/lib/localStorage'
import { EpisodeDetailModal } from '@/components/canvas/episode-detail-modal'
import { ContextualPlayer } from '@/components/canvas/contextual-player'
import { ExportModal } from '@/components/canvas/export-modal'
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
  const [draggedItem, setDraggedItem] = useState<CanvasItem | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Canvas view state (pan/zoom)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Modal state
  const [selectedEpisode, setSelectedEpisode] = useState<CanvasEpisode | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [clipsToExport, setClipsToExport] = useState<CanvasClip[]>([])
  
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
        const formattedEpisodes = data.episodes.map((ep: any, index: number) => ({
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
    ;(window as any).__draggedEpisode = dragData
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    
    const dragData = (window as any).__draggedEpisode
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
      position: { x: constrainedX, y: constrainedY }
    })

    // Clean up
    delete (window as any).__draggedEpisode
  }

  const handleItemMouseDown = (e: React.MouseEvent, item: CanvasItem) => {
    e.stopPropagation()
    
    // If item is not selected, select only this item
    if (!selectedItemIds.includes(item.id)) {
      setSelectedItemIds([item.id])
    }
    
    setDraggedItem(item)
    
    // Store the offset between mouse and item in canvas coordinates
    // This is the key: we're storing how far the mouse is from the item's top-left corner
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Convert mouse viewport position to canvas coordinates
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    const canvasMouseX = (viewportX - canvasOffset.x) / canvasZoom
    const canvasMouseY = (viewportY - canvasOffset.y) / canvasZoom
    
    // Store offset from mouse to item's position
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
    if (!draggedItem) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Convert current mouse position to canvas coordinates
    const viewportX = e.clientX - rect.left
    const viewportY = e.clientY - rect.top
    
    const canvasMouseX = (viewportX - canvasOffset.x) / canvasZoom
    const canvasMouseY = (viewportY - canvasOffset.y) / canvasZoom

    // Calculate new item position by subtracting the stored offset
    const newX = canvasMouseX - dragOffset.x
    const newY = canvasMouseY - dragOffset.y

    // Constrain to canvas bounds
    const constrainedX = Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 280, newX))
    const constrainedY = Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, newY))

    // Update positions of all selected items
    setCanvasItems(items =>
      items.map(item => {
        if (selectedItemIds.includes(item.id)) {
          // Calculate offset from dragged item
          const offsetX = item.position.x - draggedItem.position.x
          const offsetY = item.position.y - draggedItem.position.y
          
          return {
            ...item,
            position: { 
              x: Math.max(CANVAS_MIN_X, Math.min(CANVAS_MAX_X - 280, constrainedX + offsetX)),
              y: Math.max(CANVAS_MIN_Y, Math.min(CANVAS_MAX_Y - 200, constrainedY + offsetY))
            }
          }
        }
        return item
      })
    )
  }

  const handleMouseUp = () => {
    setDraggedItem(null)
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
    
    // Figma-style controls:
    // Cmd/Ctrl + Scroll = Zoom
    // Two-finger drag (trackpad) or Shift + Scroll = Pan
    
    if (e.metaKey || e.ctrlKey) {
      // Zoom with Cmd+scroll
      const zoomSpeed = 0.002
      const delta = -e.deltaY * zoomSpeed
      const newZoom = Math.max(0.25, Math.min(2, canvasZoom + delta))
      setCanvasZoom(newZoom)
    } else {
      // Pan with two-finger drag (natural scrolling on trackpad)
      setCanvasOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }))
    }
  }

  const handleZoomIn = () => {
    setCanvasZoom(prev => Math.min(2, prev + 0.25))
  }

  const handleZoomOut = () => {
    setCanvasZoom(prev => Math.max(0.25, prev - 0.25))
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
    // Deselect all if clicking on empty canvas
    if (e.target === canvasRef.current) {
      setSelectedItemIds([])
    }
  }

  const handleDeleteSelected = () => {
    if (selectedItemIds.length === 0) return
    
    if (confirm(`Delete ${selectedItemIds.length} item(s)?`)) {
      setCanvasItems(items => items.filter(item => !selectedItemIds.includes(item.id)))
      setSelectedItemIds([])
      posthog.capture('canvas_items_deleted', {
        count: selectedItemIds.length
      })
    }
  }

  const handleOpenEpisode = (episode: CanvasEpisode) => {
    setSelectedEpisode(episode)
  }

  const handleTranscribe = async (episodeId: string) => {
    if (!selectedEpisode) return
    
    setIsTranscribing(true)
    
    try {
      const response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioUrl: selectedEpisode.audioUrl,
          episodeTitle: selectedEpisode.title
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Save transcript to localStorage by episodeId for future reuse
        storage.setTranscript(
          selectedEpisode.episodeId, // Use the actual episode ID, not canvas item ID
          data.transcript,
          data.status,
          undefined,
          data.segments
        )
        
        console.log('💾 Transcript saved to localStorage for:', selectedEpisode.title)
        
        // Update the episode in canvas with transcript
        setCanvasItems(items =>
          items.map(item => {
            if (item.id === selectedEpisode.id) {
              return {
                ...item,
                transcript: data.transcript,
                transcript_segments: data.segments
              } as CanvasEpisode
            }
            return item
          })
        )

        // Update the modal episode
        setSelectedEpisode({
          ...selectedEpisode,
          transcript: data.transcript,
          transcript_segments: data.segments
        })

        posthog.capture('canvas_episode_transcribed', {
          episode_id: selectedEpisode.episodeId,
          segment_count: data.segments?.length || 0,
          saved_to_cache: true
        })
      } else {
        alert('Transcription failed. Please try again.')
      }
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Transcription failed. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
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

    // Close the modal
    setSelectedEpisode(null)
  }

  const handleExportClip = (clip: CanvasClip) => {
    setClipsToExport([clip])
    posthog.capture('export_modal_opened', {
      clip_count: 1,
      source: 'single_clip'
    })
  }

  const handleExportSelected = () => {
    const selectedClips = canvasItems.filter(
      item => item.type === 'clip' && selectedItemIds.includes(item.id)
    ) as CanvasClip[]
    
    if (selectedClips.length === 0) {
      alert('Please select at least one clip to export')
      return
    }

    setClipsToExport(selectedClips)
    posthog.capture('export_modal_opened', {
      clip_count: selectedClips.length,
      source: 'toolbar'
    })
  }

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
    const lines: Array<{ clipId: string; episodeId: string; x1: number; y1: number; x2: number; y2: number }> = []
    
    canvasItems.forEach(item => {
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
            clipId: clip.id,
            episodeId: parentEpisode.id,
            x1: episodeX,
            y1: episodeY,
            x2: clipX,
            y2: clipY
          })
        }
      }
    })
    
    return lines
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Podcast Search */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
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

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
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
              <>
                {canvasItems.filter(item => item.type === 'clip' && selectedItemIds.includes(item.id)).length > 0 && (
                  <Button
                    onClick={handleExportSelected}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export ({canvasItems.filter(item => item.type === 'clip' && selectedItemIds.includes(item.id)).length})
                  </Button>
                )}
                <Button
                  onClick={handleDeleteSelected}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItemIds.length})
                </Button>
              </>
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
            backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
          }}
        >
          {/* Canvas Content Container with Transform */}
          <div
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
              {getConnectorLines().map((line) => {
                const isSelected = selectedItemIds.includes(line.clipId) || selectedItemIds.includes(line.episodeId)
                return (
                  <g key={`connector-${line.clipId}`}>
                    {/* Line */}
                    <line
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={isSelected ? '#9333ea' : '#d8b4fe'}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray="8 4"
                      opacity={isSelected ? 0.8 : 0.5}
                    />
                    {/* Circle at episode end */}
                    <circle
                      cx={line.x1}
                      cy={line.y1}
                      r={6}
                      fill={isSelected ? '#9333ea' : '#d8b4fe'}
                      opacity={isSelected ? 0.8 : 0.5}
                    />
                    {/* Circle at clip end */}
                    <circle
                      cx={line.x2}
                      cy={line.y2}
                      r={6}
                      fill={isSelected ? '#9333ea' : '#d8b4fe'}
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
                      className={`absolute cursor-move select-none ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '280px',
                        zIndex: 10
                      }}
                    >
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
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
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEpisode(episode)
                            }}
                          >
                            <Scissors className="h-3 w-3 mr-1" />
                            Create Clip
                          </Button>
                          {episode.transcript_segments && (
                            <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                              <FileText className="h-3 w-3 inline" />
                            </div>
                          )}
                        </div>
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
                      className={`absolute cursor-move select-none ${
                        isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{
                        left: item.position.x,
                        top: item.position.y,
                        width: '280px',
                        zIndex: 10
                      }}
                    >
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-lg border-2 border-purple-300 p-4 hover:shadow-xl transition-shadow">
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
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
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

      {/* Episode Detail Modal */}
      {selectedEpisode && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onCreateClip={handleCreateClip}
          onTranscribe={handleTranscribe}
          isTranscribing={isTranscribing}
        />
      )}

      {/* Export Modal */}
      {clipsToExport.length > 0 && (
        <ExportModal
          clips={clipsToExport}
          onClose={() => setClipsToExport([])}
        />
      )}

      {/* Contextual Audio Player */}
      <ContextualPlayer
        selectedItems={canvasItems.filter(item => selectedItemIds.includes(item.id))}
      />
    </div>
  )
}

