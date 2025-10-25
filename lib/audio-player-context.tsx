'use client'

import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react'
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
  if (context === null) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
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
  const previousItemTypeRef = useRef<'episode' | 'clip' | 'reel' | null>(null)
  const shouldAutoPlayRef = useRef(false) // Track if we should auto-play after loading
  
  const currentItem = playableItems[currentItemIndex] || null

  // Update audio source when current item changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentItem) return

    console.log('[AudioPlayer] useEffect: currentItem changed', { currentItem: currentItem.id, isPlaying })

    let audioUrl = ''
    
    if (currentItem.type === 'episode') {
      audioUrl = (currentItem as CanvasEpisode).audioUrl
    } else if (currentItem.type === 'clip') {
      audioUrl = (currentItem as CanvasClip).audioUrl
    }

    // Only load if the URL is actually different
    if (audioUrl && audio.src !== audioUrl && !audio.src.endsWith(audioUrl)) {
      console.log('[AudioPlayer] useEffect: Loading new audio source', audioUrl)
      audio.src = audioUrl
      audio.load()
      
      // For clips, set the start time after metadata is loaded
      if (currentItem.type === 'clip') {
        const clip = currentItem as CanvasClip
        const setInitialTime = () => {
          audio.currentTime = clip.startTime
          audio.removeEventListener('loadedmetadata', setInitialTime)
          
          // Auto-play if requested (without creating a loop)
          if (shouldAutoPlayRef.current) {
            console.log('[AudioPlayer] useEffect: Auto-playing clip after metadata load')
            shouldAutoPlayRef.current = false
            audio.play().catch(err => console.error('Auto-play failed:', err))
          }
        }
        audio.addEventListener('loadedmetadata', setInitialTime)
      } else {
        // For episodes, auto-play when ready if requested
        if (shouldAutoPlayRef.current) {
          const playWhenReady = () => {
            console.log('[AudioPlayer] useEffect: Auto-playing episode when ready')
            shouldAutoPlayRef.current = false
            audio.play().catch(err => console.error('Auto-play failed:', err))
            audio.removeEventListener('canplay', playWhenReady)
          }
          audio.addEventListener('canplay', playWhenReady)
        }
      }
    } else if (shouldAutoPlayRef.current) {
      // Audio is already loaded, but auto-play was requested
      console.log('[AudioPlayer] useEffect: Audio already loaded, handling auto-play')
      
      // Set correct position for clips
      if (currentItem.type === 'clip') {
        const clip = currentItem as CanvasClip
        console.log('[AudioPlayer] useEffect: Setting clip start time:', clip.startTime)
        audio.currentTime = clip.startTime
      }
      
      // Play immediately
      console.log('[AudioPlayer] useEffect: Auto-playing now')
      shouldAutoPlayRef.current = false
      audio.play().catch(err => console.error('Auto-play failed:', err))
    }
  }, [currentItem])

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

  const play = useCallback((targetItem?: CanvasItem) => {
    const audio = audioRef.current
    // CRITICAL: Access current state via playableItems/currentItemIndex, NOT the closure variable
    const latestCurrentItem = playableItems[currentItemIndex]
    const itemToPlay = targetItem || latestCurrentItem
    
    if (!audio || !itemToPlay) {
      console.log('[AudioPlayer] play() aborted: no audio ref or itemToPlay', { audio: !!audio, itemToPlay: !!itemToPlay })
      return
    }
    
    console.log('========================================')
    console.log('[AudioPlayer] play() called')
    console.log('  targetItem:', targetItem?.id || 'undefined')
    console.log('  targetItem type:', targetItem?.type || 'undefined')
    console.log('  playableItems:', playableItems.map(i => `${i.type}:${i.id}`).join(', '))
    console.log('  currentItemIndex:', currentItemIndex)
    console.log('  latestCurrentItem:', latestCurrentItem?.id || 'null')
    console.log('  latestCurrentItem type:', latestCurrentItem?.type || 'null')
    console.log('  itemToPlay:', itemToPlay.id)
    console.log('  itemToPlay type:', itemToPlay.type)
    console.log('  audioSrc:', audio.src)
    console.log('  audio.currentTime:', audio.currentTime)
    console.log('========================================')
    
    const isDifferentItem = !latestCurrentItem || itemToPlay.id !== latestCurrentItem.id
    
    let expectedAudioUrl = ''
    if (itemToPlay.type === 'episode') {
      expectedAudioUrl = (itemToPlay as CanvasEpisode).audioUrl
    } else if (itemToPlay.type === 'clip') {
      expectedAudioUrl = (itemToPlay as CanvasClip).audioUrl
    }
    
    console.log('🔍 [AudioPlayer] URL check')
    console.log('   expectedAudioUrl:', expectedAudioUrl)
    console.log('   audioSrc:', audio.src)
    console.log('   match:', audio.src.endsWith(expectedAudioUrl))
    console.log('   isDifferentItem:', isDifferentItem)
    
    // If different item or audio source mismatch, set flag and let useEffect handle loading
    if (isDifferentItem || (expectedAudioUrl && audio.src !== expectedAudioUrl && !audio.src.endsWith(expectedAudioUrl))) {
      console.log('⏳ [AudioPlayer] Audio needs loading - setting auto-play flag')
      console.log('   Reason:', isDifferentItem ? 'Different item' : 'Source mismatch')
      shouldAutoPlayRef.current = true // Request auto-play after load
      // Note: useEffect will detect currentItem change and load the audio
      // When ready, it will check this flag and auto-play
      return
    }
    
    console.log('▶️ [AudioPlayer] Playing audio now')
    
    // Reset position based on item type
    if (itemToPlay.type === 'clip') {
      const clip = itemToPlay as CanvasClip
      // For clips, ensure we're at the clip's start position
      if (audio.currentTime < clip.startTime || audio.currentTime >= clip.startTime + clip.duration) {
        console.log('   Resetting clip to start:', clip.startTime)
        audio.currentTime = clip.startTime
      }
    } else if (itemToPlay.type === 'episode') {
      // For episodes, check if we were previously playing a clip
      // If so, reset to the beginning
      const previousType = previousItemTypeRef.current
      console.log('   Previous item type:', previousType, '| Current item type:', itemToPlay.type)
      if (previousType === 'clip') {
        console.log('   Switching from clip to episode - resetting to start (was at', audio.currentTime, ')')
        audio.currentTime = 0
      }
      // Otherwise continue from current position (user paused and resumed same episode)
    }
    
    // NOW update the ref for next time (do this AFTER checking it)
    previousItemTypeRef.current = itemToPlay.type
    
    audio.play().catch(err => console.error('Play failed:', err))
  }, [playableItems, currentItemIndex]) // Dependencies: playableItems and currentItemIndex

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    console.log('[AudioPlayer] pause() called')
    audio.pause()
  }, [])

  const togglePlay = useCallback(() => {
    console.log('[AudioPlayer] togglePlay() called. isPlaying:', isPlaying)
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return

    const latestCurrentItem = playableItems[currentItemIndex]
    let newAudioTime = time
    if (latestCurrentItem?.type === 'clip') {
      const clip = latestCurrentItem as CanvasClip
      newAudioTime = clip.startTime + time
    }
    
    audio.currentTime = newAudioTime
    setCurrentTime(time)
    console.log('[AudioPlayer] seek() called. New time:', newAudioTime)
  }, [playableItems, currentItemIndex])

  const setPlayableItems = useCallback((items: CanvasItem[], allItems: CanvasItem[]) => {
    console.log('[AudioPlayer] setPlayableItems() called with items:', items.map(i => i.id))
    const resolvedItems = items.flatMap(item => {
      if (item.type === 'reel') {
        const reel = item as CanvasReel
        return reel.clipIds.map(clipId => 
          allItems.find(i => i.id === clipId && i.type === 'clip')
        ).filter(Boolean) as CanvasClip[]
      }
      return [item]
    })
    setPlayableItemsState(resolvedItems)
    setCurrentItemIndex(0)
    setCurrentTime(0)
  }, [])

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
      <audio ref={audioRef} />
    </AudioPlayerContext.Provider>
  )
}
