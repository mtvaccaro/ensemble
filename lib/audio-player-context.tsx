'use client'

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'
import { CanvasItem, CanvasEpisode, CanvasClip, CanvasReel } from '@/types'

interface AudioPlayerContextType {
  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  
  // Current item being played
  currentItem: CanvasItem | null
  
  // Controls
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  
  // Set what to play
  setPlayableItems: (items: CanvasItem[], allItems: CanvasItem[]) => void
  
  // Internal audio element ref (for advanced usage)
  audioRef: React.RefObject<HTMLAudioElement>
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }
  return context
}

interface AudioPlayerProviderProps {
  children: ReactNode
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [playableItems, setPlayableItemsState] = useState<CanvasItem[]>([])
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const currentItem = playableItems[currentItemIndex] || null

  // Update audio source when current item changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentItem) return

    let audioUrl = ''
    
    if (currentItem.type === 'episode') {
      audioUrl = (currentItem as CanvasEpisode).audioUrl
    } else if (currentItem.type === 'clip') {
      audioUrl = (currentItem as CanvasClip).audioUrl
    }

    if (audioUrl && audio.src !== audioUrl) {
      const wasPlaying = isPlaying
      audio.src = audioUrl
      audio.load()
      
      // For clips, set the start time
      if (currentItem.type === 'clip') {
        const clip = currentItem as CanvasClip
        audio.currentTime = clip.startTime
      }
      
      // Resume playing if it was playing before
      if (wasPlaying) {
        audio.play().catch(err => console.error('Auto-play failed:', err))
      }
    }
  }, [currentItem, isPlaying])

  // Handle audio metadata loaded
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (currentItem?.type === 'clip') {
        const clip = currentItem as CanvasClip
        setDuration(clip.duration)
      } else {
        setDuration(audio.duration || 0)
      }
    }

    const handleTimeUpdate = () => {
      if (currentItem?.type === 'clip') {
        const clip = currentItem as CanvasClip
        const relativeTime = audio.currentTime - clip.startTime
        setCurrentTime(relativeTime)
        
        // Stop at end of clip
        if (relativeTime >= clip.duration) {
          audio.pause()
          setIsPlaying(false)
        }
      } else {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [currentItem])

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.play().catch(err => console.error('Play failed:', err))
  }

  const pause = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
  }

  const togglePlay = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const seek = (time: number) => {
    const audio = audioRef.current
    if (!audio) return

    if (currentItem?.type === 'clip') {
      const clip = currentItem as CanvasClip
      audio.currentTime = clip.startTime + time
    } else {
      audio.currentTime = time
    }
    setCurrentTime(time)
  }

  const setPlayableItems = (items: CanvasItem[], allItems: CanvasItem[]) => {
    // Expand reels into their clips
    const expanded = items.flatMap(item => {
      if (item.type === 'reel') {
        const reel = item as CanvasReel
        return reel.clipIds.map(clipId => 
          allItems.find(i => i.id === clipId && i.type === 'clip')
        ).filter(Boolean) as CanvasClip[]
      }
      if (item.type === 'episode' || item.type === 'clip') {
        return [item]
      }
      return []
    })
    
    setPlayableItemsState(expanded)
    setCurrentItemIndex(0)
    setCurrentTime(0)
    setIsPlaying(false)
  }

  const value: AudioPlayerContextType = {
    isPlaying,
    currentTime,
    duration,
    currentItem,
    play,
    pause,
    togglePlay,
    seek,
    setPlayableItems,
    audioRef
  }

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
    </AudioPlayerContext.Provider>
  )
}

