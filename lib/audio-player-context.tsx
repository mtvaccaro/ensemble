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
  play: (targetItem?: CanvasItem) => void
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

    if (audioUrl && audio.src !== audioUrl && !audio.src.endsWith(audioUrl)) {
      const wasPlaying = isPlaying
      audio.src = audioUrl
      audio.load()
      
      // For clips, set the start time after metadata is loaded
      if (currentItem.type === 'clip') {
        const clip = currentItem as CanvasClip
        const setInitialTime = () => {
          audio.currentTime = clip.startTime
          audio.removeEventListener('loadedmetadata', setInitialTime)
          
          // Resume playing if it was playing before OR if play() was called while loading
          if (wasPlaying) {
            audio.play().catch(err => console.error('Auto-play failed:', err))
          }
        }
        audio.addEventListener('loadedmetadata', setInitialTime)
      } else {
        // For episodes, resume playing if it was playing before OR if play() was called while loading
        if (wasPlaying) {
          const playWhenReady = () => {
            audio.play().catch(err => console.error('Auto-play failed:', err))
            audio.removeEventListener('canplay', playWhenReady)
          }
          audio.addEventListener('canplay', playWhenReady)
        }
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

  const play = (targetItem?: CanvasItem) => {
    const audio = audioRef.current
    // Use targetItem if provided, otherwise use currentItem
    const itemToPlay = targetItem || currentItem
    if (!audio || !itemToPlay) return
    
    console.log('[AudioPlayer] play() called', {
      targetItem: targetItem?.id,
      currentItem: currentItem?.id,
      itemToPlay: itemToPlay.id,
      itemToPlayType: itemToPlay.type,
      currentItemType: currentItem?.type,
      audioSrc: audio.src
    })
    
    // Check if we're trying to play a DIFFERENT item than what's currently loaded
    // This is important because clips and episodes can have the same audioUrl
    // but they need different playback behavior (clips have start/end times)
    const isDifferentItem = !currentItem || itemToPlay.id !== currentItem.id
    
    if (isDifferentItem) {
      console.log('[AudioPlayer] Different item detected - need to reload audio')
      // Set isPlaying to true, the useEffect will handle loading and playing
      setIsPlaying(true)
      return
    }
    
    // Get the expected audio URL for the item we want to play
    let expectedAudioUrl = ''
    if (itemToPlay.type === 'episode') {
      expectedAudioUrl = (itemToPlay as CanvasEpisode).audioUrl
    } else if (itemToPlay.type === 'clip') {
      expectedAudioUrl = (itemToPlay as CanvasClip).audioUrl
    }
    
    console.log('[AudioPlayer] URL check', {
      expectedAudioUrl,
      audioSrc: audio.src,
      match: audio.src.endsWith(expectedAudioUrl)
    })
    
    // If the audio source doesn't match, we need to wait for it to load
    // The useEffect will handle loading and auto-playing
    if (expectedAudioUrl && audio.src !== expectedAudioUrl && !audio.src.endsWith(expectedAudioUrl)) {
      console.log('[AudioPlayer] Audio source mismatch - waiting for load')
      // Audio is being loaded, the useEffect will handle playing it
      // Just set isPlaying to true so the UI updates
      setIsPlaying(true)
      return
    }
    
    console.log('[AudioPlayer] Playing audio now')
    
    // For clips, ensure we're at the right position before playing
    if (itemToPlay.type === 'clip') {
      const clip = itemToPlay as CanvasClip
      // If we're before the start or after the end, reset to start
      if (audio.currentTime < clip.startTime || audio.currentTime >= clip.startTime + clip.duration) {
        audio.currentTime = clip.startTime
      }
    }
    
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
    // Don't change isPlaying - let the audio load first, then the play() call will work
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

