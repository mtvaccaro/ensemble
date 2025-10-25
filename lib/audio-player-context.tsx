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
          
          if (isPlaying) {
            console.log('[AudioPlayer] useEffect: Auto-playing clip after metadata load')
            audio.play().catch(err => console.error('Auto-play failed:', err))
          }
        }
        audio.addEventListener('loadedmetadata', setInitialTime)
      } else {
        if (isPlaying) {
          const playWhenReady = () => {
            console.log('[AudioPlayer] useEffect: Auto-playing episode when ready')
            audio.play().catch(err => console.error('Auto-play failed:', err))
            audio.removeEventListener('canplay', playWhenReady)
          }
          audio.addEventListener('canplay', playWhenReady)
        }
      }
    } else if (isPlaying) {
      console.log('[AudioPlayer] useEffect: URL is same, but isPlaying is true. Ensuring playback.')
      audio.play().catch(err => console.error('Auto-play failed:', err))
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
    console.log('  latestCurrentItem:', latestCurrentItem?.id || 'null')
    console.log('  latestCurrentItem type:', latestCurrentItem?.type || 'null')
    console.log('  itemToPlay:', itemToPlay.id)
    console.log('  itemToPlay type:', itemToPlay.type)
    console.log('  audioSrc:', audio.src)
    console.log('========================================')
    
    const isDifferentItem = !latestCurrentItem || itemToPlay.id !== latestCurrentItem.id
    
    if (isDifferentItem) {
      console.log('🔄 [AudioPlayer] Different item detected - need to reload audio')
      console.log('   Reason:', !latestCurrentItem ? 'No current item' : 'Different ID')
      setIsPlaying(true)
      return
    }
    
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
    
    if (expectedAudioUrl && audio.src !== expectedAudioUrl && !audio.src.endsWith(expectedAudioUrl)) {
      console.log('⏳ [AudioPlayer] Audio source mismatch - waiting for load')
      setIsPlaying(true)
      return
    }
    
    console.log('▶️ [AudioPlayer] Playing audio now')
    
    if (itemToPlay.type === 'clip') {
      const clip = itemToPlay as CanvasClip
      if (audio.currentTime < clip.startTime || audio.currentTime >= clip.startTime + clip.duration) {
        audio.currentTime = clip.startTime
      }
    }
    
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
