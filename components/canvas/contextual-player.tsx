'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX } from 'lucide-react'
import { CanvasItem, CanvasEpisode, CanvasClip } from '@/types'

interface ContextualPlayerProps {
  selectedItems: CanvasItem[]
  playTrigger?: number
}

export function ContextualPlayer({ selectedItems, playTrigger }: ContextualPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)

  // Determine what to play
  const playableItems = selectedItems.filter(
    item => item.type === 'episode' || item.type === 'clip'
  )

  const currentItem = playableItems[currentItemIndex]
  const hasMultiple = playableItems.length > 1

  // Update audio source when selection changes (but don't auto-play)
  useEffect(() => {
    if (!currentItem) {
      setIsPlaying(false)
      return
    }

    const audio = audioRef.current
    if (!audio) return

    // Set audio source
    const audioUrl = currentItem.type === 'episode' 
      ? (currentItem as CanvasEpisode).audioUrl 
      : (currentItem as CanvasClip).audioUrl

    audio.src = audioUrl
    audio.load()

    // For clips, set up listener to stop at end time
    if (currentItem.type === 'clip') {
      const clip = currentItem as CanvasClip
      
      const handleTimeUpdate = () => {
        if (audio.currentTime >= clip.endTime) {
          if (hasMultiple && currentItemIndex < playableItems.length - 1) {
            // Move to next clip
            setCurrentItemIndex(currentItemIndex + 1)
          } else {
            // Stop playback
            audio.pause()
            setIsPlaying(false)
          }
        }
      }

      audio.addEventListener('timeupdate', handleTimeUpdate)
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentItem, currentItemIndex, playableItems.length, hasMultiple])

  // Handle explicit play trigger
  useEffect(() => {
    if (!playTrigger || !currentItem) return

    const audio = audioRef.current
    if (!audio) return

    // For clips, set start time then play
    if (currentItem.type === 'clip') {
      const clip = currentItem as CanvasClip
      
      const handleCanPlay = () => {
        audio.currentTime = clip.startTime
        audio.play().then(() => {
          setIsPlaying(true)
        }).catch(error => {
          console.log('Auto-play prevented:', error)
          setIsPlaying(false)
        })
      }
      
      if (audio.readyState >= 2) {
        // Already loaded
        handleCanPlay()
      } else {
        audio.addEventListener('canplay', handleCanPlay, { once: true })
      }
    } else {
      // For episodes, just play
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch(error => {
        console.log('Auto-play prevented:', error)
        setIsPlaying(false)
      })
    }
  }, [playTrigger, currentItem])

  // Handle audio metadata loaded
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (currentItem?.type === 'clip') {
        const clip = currentItem as CanvasClip
        setDuration(clip.duration)
      } else {
        setDuration(audio.duration)
      }
    }

    const handleTimeUpdate = () => {
      if (currentItem?.type === 'clip') {
        const clip = currentItem as CanvasClip
        setCurrentTime(audio.currentTime - clip.startTime)
      } else {
        setCurrentTime(audio.currentTime)
      }
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentItem])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleNext = () => {
    if (currentItemIndex < playableItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1)
      setIsPlaying(false)
    }
  }

  const handlePrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1)
      setIsPlaying(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = parseFloat(e.target.value)
    
    if (currentItem?.type === 'clip') {
      const clip = currentItem as CanvasClip
      audio.currentTime = clip.startTime + newTime
    } else {
      audio.currentTime = newTime
    }
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
  }

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTitle = (): string => {
    if (!currentItem) return 'No selection'
    
    if (currentItem.type === 'episode') {
      return (currentItem as CanvasEpisode).title
    } else {
      return (currentItem as CanvasClip).title
    }
  }

  const getType = (): string => {
    if (!currentItem) return ''
    return currentItem.type === 'episode' ? 'Episode' : 'Clip'
  }

  // Don't show player if nothing is selected
  if (playableItems.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl border-t border-gray-700 z-50">
      <audio ref={audioRef} />
      
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Current item info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-purple-400 uppercase">
                {getType()}
              </span>
              {hasMultiple && (
                <span className="text-xs text-gray-400">
                  {currentItemIndex + 1} of {playableItems.length}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate">
              {getTitle()}
            </h3>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3">
            {hasMultiple && (
              <button
                onClick={handlePrevious}
                disabled={currentItemIndex === 0}
                className="hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={togglePlay}
              className="bg-purple-600 hover:bg-purple-700 rounded-full p-3 transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>

            {hasMultiple && (
              <button
                onClick={handleNext}
                disabled={currentItemIndex === playableItems.length - 1}
                className="hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-gray-400 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
              }}
            />
            <span className="text-xs text-gray-400 w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="hover:text-purple-400 transition-colors">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

