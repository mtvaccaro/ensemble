'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, X, Scissors, Download, Trash2, FileText, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PodcastSearchResult, CanvasEpisode, CanvasClip, CanvasItem, TranscriptionStatus } from '@/types'
import { storage } from '@/lib/localStorage'
import { EpisodeDetailModal } from '@/components/canvas/episode-detail-modal'
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
  
  // Modal state
  const [selectedEpisode, setSelectedEpisode] = useState<CanvasEpisode | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  
  const canvasRef = useRef<HTMLDivElement>(null)

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

    // Calculate drop position relative to canvas
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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
      position: { x, y },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setCanvasItems([...canvasItems, newItem])
    posthog.capture('episode_added_to_canvas', {
      episode_title: episode.title,
      podcast_id: podcast.id,
      position: { x, y }
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
    setDragOffset({
      x: e.clientX - item.position.x,
      y: e.clientY - item.position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedItem) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const newX = e.clientX - rect.left - dragOffset.x
    const newY = e.clientY - rect.top - dragOffset.y

    // Update positions of all selected items
    setCanvasItems(items =>
      items.map(item => {
        if (selectedItemIds.includes(item.id)) {
          // Calculate offset from dragged item
          const offsetX = item.position.x - draggedItem.position.x
          const offsetY = item.position.y - draggedItem.position.y
          
          return {
            ...item,
            position: { x: newX + offsetX, y: newY + offsetY }
          }
        }
        return item
      })
    )
  }

  const handleMouseUp = () => {
    setDraggedItem(null)
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
          episode_id: episodeId,
          segment_count: data.segments?.length || 0
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

    // Position the clip near the source episode
    const newClip: CanvasClip = {
      ...clipData,
      id: `canvas-clip-${Date.now()}-${Math.random()}`,
      position: {
        x: selectedEpisode.position.x + 320, // Offset to the right
        y: selectedEpisode.position.y
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setCanvasItems([...canvasItems, newClip])
    posthog.capture('clip_created_on_canvas', {
      clip_title: clipData.title,
      clip_duration: clipData.duration,
      source_episode: selectedEpisode.episodeId
    })

    // Close the modal
    setSelectedEpisode(null)
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
          
          <div className="flex items-center gap-2">
            {selectedItemIds.length > 0 && (
              <Button
                onClick={handleDeleteSelected}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedItemIds.length})
              </Button>
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
          onClick={handleCanvasClick}
          className="flex-1 relative overflow-hidden bg-gray-50"
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {canvasItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
                        width: '280px'
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
                        width: '280px'
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
                          <Button size="sm" className="flex-1 text-xs bg-purple-600 hover:bg-purple-700">
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
    </div>
  )
}

