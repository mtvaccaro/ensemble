'use client'

import { useState, useMemo, useEffect } from 'react'
import { TranscriptSegment, TranscriptWord } from '@/types'

interface WordSelection {
  segmentId: number
  wordIndex: number
  timestamp: number
}

interface WordLevelTranscriptProps {
  segments: TranscriptSegment[]
  onSelectionChange: (selection: { startTime: number; endTime: number; text: string } | null) => void
  startTime?: number | null
  endTime?: number | null
  searchQuery?: string
  onSearchInfoChange?: (info: { matchCount: number; currentIndex: number; goToNext: () => void; goToPrev: () => void }) => void
}

export function WordLevelTranscript({ 
  segments, 
  onSelectionChange,
  startTime,
  endTime,
  searchQuery = '',
  onSearchInfoChange
}: WordLevelTranscriptProps) {
  const [selectionStart, setSelectionStart] = useState<WordSelection | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<WordSelection | null>(null)
  const [hoverWord, setHoverWord] = useState<WordSelection | null>(null)
  
  // ESC key to cancel selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionStart && !selectionEnd) {
        setSelectionStart(null)
        setHoverWord(null)
        onSelectionChange(null)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectionStart, selectionEnd, onSelectionChange])

  // Speaker color palette - each speaker gets a unique color
  const getSpeakerColor = (speaker: string | null): string => {
    if (!speaker) return 'text-gray-600'
    const colors = [
      'text-blue-600',
      'text-purple-600',
      'text-green-600',
      'text-orange-600',
      'text-pink-600',
      'text-cyan-600',
      'text-indigo-600',
      'text-rose-600'
    ]
    // Use character code of speaker letter (A=0, B=1, C=2, etc.)
    const charCode = speaker.charCodeAt(0) - 65  // 'A' is ASCII 65
    return colors[charCode % colors.length]
  }

  // Reset selection when parent passes new times
  useEffect(() => {
    if (startTime === null || endTime === null) {
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  }, [startTime, endTime])

  // Consolidate segments by speaker - merge consecutive segments from same speaker
  const consolidatedSpeakerBlocks = useMemo(() => {
    const blocks: Array<{
      speaker: string | null
      words: Array<{ word: TranscriptWord; segmentId: number; wordIndex: number }>
      startTimestamp: number
    }> = []

    let currentSpeaker: string | null = null
    let currentBlock: Array<{ word: TranscriptWord; segmentId: number; wordIndex: number }> = []
    let blockStartTime = 0

    segments.forEach(segment => {
      segment.words?.forEach((word, idx) => {
        if (word.speaker !== currentSpeaker && currentBlock.length > 0) {
          // Speaker changed, save current block
          blocks.push({
            speaker: currentSpeaker,
            words: currentBlock,
            startTimestamp: blockStartTime
          })
          currentBlock = []
          currentSpeaker = word.speaker || null
          blockStartTime = word.start
        }
        
        if (currentBlock.length === 0) {
          currentSpeaker = word.speaker || null
          blockStartTime = word.start
        }
        
        currentBlock.push({ word, segmentId: segment.id, wordIndex: idx })
      })
    })

    // Add final block
    if (currentBlock.length > 0) {
      blocks.push({
        speaker: currentSpeaker,
        words: currentBlock,
        startTimestamp: blockStartTime
      })
    }

    return blocks
  }, [segments])

  const handleWordClick = (segmentId: number, wordIndex: number, word: TranscriptWord) => {
    if (!selectionStart) {
      // First click - set start
      setSelectionStart({ segmentId, wordIndex, timestamp: word.start })
      setSelectionEnd(null)
      onSelectionChange(null)
    } else if (!selectionEnd) {
      // Second click - set end
      const endSel = { segmentId, wordIndex, timestamp: word.end }
      setSelectionEnd(endSel)
      
      // Calculate precise times and text from word boundaries
      const { startTimeMs, endTimeMs, selectedText } = getSelectionData(selectionStart, endSel)
      
      onSelectionChange({
        startTime: startTimeMs / 1000,
        endTime: endTimeMs / 1000,
        text: selectedText
      })
    } else {
      // Third click - reset and start new selection
      setSelectionStart({ segmentId, wordIndex, timestamp: word.start })
      setSelectionEnd(null)
      onSelectionChange(null)
    }
  }

  const getSelectionData = (start: WordSelection, end: WordSelection) => {
    let startTimeMs = start.timestamp
    let endTimeMs = end.timestamp
    const selectedWords: string[] = []
    let isCollecting = false

    // Ensure start comes before end
    const isReversed = start.segmentId > end.segmentId || 
      (start.segmentId === end.segmentId && start.wordIndex > end.wordIndex)
    
    const actualStart = isReversed ? end : start
    const actualEnd = isReversed ? start : end

    segments.forEach(segment => {
      segment.words?.forEach((word, idx) => {
        if (segment.id === actualStart.segmentId && idx === actualStart.wordIndex) {
          isCollecting = true
          startTimeMs = word.start
        }
        
        if (isCollecting) {
          selectedWords.push(word.text)
        }
        
        if (segment.id === actualEnd.segmentId && idx === actualEnd.wordIndex) {
          isCollecting = false
          endTimeMs = word.end
        }
      })
    })

    return {
      startTimeMs,
      endTimeMs,
      selectedText: selectedWords.join(' ')
    }
  }

  const isWordInSelection = (segmentId: number, wordIndex: number): 'start' | 'end' | 'selected' | 'preview' | null => {
    // Check if this is the start word
    if (selectionStart && selectionStart.segmentId === segmentId && selectionStart.wordIndex === wordIndex) {
      return 'start'
    }
    
    // Check if this is the end word
    if (selectionEnd && selectionEnd.segmentId === segmentId && selectionEnd.wordIndex === wordIndex) {
      return 'end'
    }
    
    // Check if word is in selected range
    if (selectionStart && selectionEnd) {
      const isReversed = selectionStart.segmentId > selectionEnd.segmentId || 
        (selectionStart.segmentId === selectionEnd.segmentId && selectionStart.wordIndex > selectionEnd.wordIndex)
      
      const actualStart = isReversed ? selectionEnd : selectionStart
      const actualEnd = isReversed ? selectionStart : selectionEnd

      // Check if current word is between start and end
      if (segmentId > actualStart.segmentId && segmentId < actualEnd.segmentId) {
        return 'selected'
      }
      if (segmentId === actualStart.segmentId && segmentId === actualEnd.segmentId) {
        if (wordIndex > actualStart.wordIndex && wordIndex < actualEnd.wordIndex) {
          return 'selected'
        }
      }
      if (segmentId === actualStart.segmentId && segmentId < actualEnd.segmentId && wordIndex > actualStart.wordIndex) {
        return 'selected'
      }
      if (segmentId === actualEnd.segmentId && segmentId > actualStart.segmentId && wordIndex < actualEnd.wordIndex) {
        return 'selected'
      }
    }
    
    // Check if word is in hover preview range
    if (selectionStart && !selectionEnd && hoverWord) {
      const isReversed = selectionStart.segmentId > hoverWord.segmentId || 
        (selectionStart.segmentId === hoverWord.segmentId && selectionStart.wordIndex > hoverWord.wordIndex)
      
      const actualStart = isReversed ? hoverWord : selectionStart
      const actualEnd = isReversed ? selectionStart : hoverWord

      if (segmentId > actualStart.segmentId && segmentId < actualEnd.segmentId) {
        return 'preview'
      }
      if (segmentId === actualStart.segmentId && segmentId === actualEnd.segmentId) {
        if (wordIndex > actualStart.wordIndex && wordIndex < actualEnd.wordIndex) {
          return 'preview'
        }
      }
      if (segmentId === actualStart.segmentId && segmentId < actualEnd.segmentId && wordIndex > actualStart.wordIndex) {
        return 'preview'
      }
      if (segmentId === actualEnd.segmentId && segmentId > actualStart.segmentId && wordIndex < actualEnd.wordIndex) {
        return 'preview'
      }
    }
    
    return null
  }

  // Find all matching words with their locations (supports phrase search)
  const searchMatches = useMemo(() => {
    if (!searchQuery) return []
    
    const query = searchQuery.toLowerCase().trim()
    const matches: Array<{ blockIdx: number; wordIdx: number; text: string }> = []
    
    consolidatedSpeakerBlocks.forEach((block, blockIdx) => {
      // Build full text for this block with word positions
      const blockText = block.words.map(w => w.word.text).join(' ').toLowerCase()
      
      // Find all phrase matches in the block text
      let searchIndex = 0
      while (searchIndex < blockText.length) {
        const matchIndex = blockText.indexOf(query, searchIndex)
        if (matchIndex === -1) break
        
        // Calculate which words are part of this match
        let charCount = 0
        let matchStartWord = -1
        let matchEndWord = -1
        
        for (let i = 0; i < block.words.length; i++) {
          const wordText = block.words[i].word.text.toLowerCase()
          const wordStart = charCount
          const wordEnd = charCount + wordText.length
          
          // Check if this word overlaps with the match
          if (matchStartWord === -1 && wordEnd > matchIndex) {
            matchStartWord = i
          }
          if (matchStartWord !== -1 && wordStart < matchIndex + query.length) {
            matchEndWord = i
          }
          
          charCount += wordText.length + 1 // +1 for space
        }
        
        // Add all words in the matched phrase
        if (matchStartWord !== -1 && matchEndWord !== -1) {
          for (let i = matchStartWord; i <= matchEndWord; i++) {
            matches.push({ 
              blockIdx, 
              wordIdx: i, 
              text: block.words[i].word.text,
              phraseStart: i === matchStartWord,
              phraseEnd: i === matchEndWord
            })
          }
        }
        
        searchIndex = matchIndex + 1
      }
    })
    
    return matches
  }, [consolidatedSpeakerBlocks, searchQuery])
  
  // Group matches by phrase (first word of each phrase)
  const phraseMatches = useMemo(() => {
    const phrases: Array<{ blockIdx: number; wordIdx: number }> = []
    searchMatches.forEach((match: any) => {
      if (match.phraseStart) {
        phrases.push({ blockIdx: match.blockIdx, wordIdx: match.wordIdx })
      }
    })
    return phrases
  }, [searchMatches])
  
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  
  // Reset match index when search changes
  useEffect(() => {
    setCurrentMatchIndex(0)
  }, [searchQuery])
  
  // Navigate to next/previous match (navigate by phrase, not by word)
  const goToNextMatch = () => {
    if (phraseMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % phraseMatches.length)
    }
  }
  
  const goToPrevMatch = () => {
    if (phraseMatches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + phraseMatches.length) % phraseMatches.length)
    }
  }
  
  // Check if a word is a search match
  const isSearchMatch = (blockIdx: number, wordIdx: number): 'current' | 'other' | null => {
    if (!searchQuery || searchMatches.length === 0) return null
    
    // Check if this word is part of the current phrase match
    const currentPhrase = phraseMatches[currentMatchIndex]
    if (currentPhrase) {
      // Find the start word of current phrase in searchMatches
      const phraseStartIdx = searchMatches.findIndex(
        (m: any) => m.blockIdx === currentPhrase.blockIdx && 
                   m.wordIdx === currentPhrase.wordIdx && 
                   m.phraseStart
      )
      
      if (phraseStartIdx !== -1) {
        // Find all consecutive words in this phrase (until we hit phraseEnd)
        for (let i = phraseStartIdx; i < searchMatches.length; i++) {
          const match: any = searchMatches[i]
          if (match.blockIdx === blockIdx && match.wordIdx === wordIdx) {
            return 'current'
          }
          if (match.phraseEnd) {
            break
          }
        }
      }
    }
    
    // Check if word is in any other match
    const isMatch = searchMatches.some((m: any) => m.blockIdx === blockIdx && m.wordIdx === wordIdx)
    return isMatch ? 'other' : null
  }
  
  // Notify parent of search info changes (use phrase count, not word count)
  useEffect(() => {
    if (onSearchInfoChange) {
      onSearchInfoChange({
        matchCount: phraseMatches.length,
        currentIndex: currentMatchIndex,
        goToNext: goToNextMatch,
        goToPrev: goToPrevMatch
      })
    }
  }, [phraseMatches.length, currentMatchIndex, onSearchInfoChange, goToNextMatch, goToPrevMatch])

  const formatTimestamp = (milliseconds: number): string => {
    const totalSeconds = milliseconds / 1000
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    const ms = Math.floor((totalSeconds % 1) * 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  const formatTimestampSimple = (milliseconds: number): string => {
    const totalSeconds = milliseconds / 1000
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Word-level Transcript - Consolidated by Speaker */}
      <div className="space-y-6 px-4">
        {consolidatedSpeakerBlocks.map((block, blockIdx) => {
          const speakerColor = getSpeakerColor(block.speaker)

          return (
            <div key={blockIdx}>
              {/* Speaker label */}
              {block.speaker && (
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[11px] font-semibold ${speakerColor} uppercase tracking-wide`}>
                    Speaker {block.speaker}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formatTimestampSimple(block.startTimestamp)}
                  </span>
                </div>
              )}
              
              {/* Flowing natural text with clickable words */}
              <div className="text-sm leading-[1.8] text-gray-900">
                {block.words.map(({ word, segmentId, wordIndex }, idx) => {
                  const state = isWordInSelection(segmentId, wordIndex)
                  const searchState = isSearchMatch(blockIdx, idx)
                  
                  let bgClass = ''
                  let textClass = 'text-gray-900'
                  let extraClasses = 'hover:bg-gray-100'
                  
                  // Selection states take priority
                  if (state === 'start' || state === 'end') {
                    bgClass = 'bg-blue-500'
                    textClass = 'text-white'
                    extraClasses = 'font-semibold px-1 -mx-0.5 rounded'
                  } else if (state === 'selected') {
                    bgClass = 'bg-blue-200'
                    textClass = 'text-blue-900'
                    extraClasses = 'px-0.5 -mx-0.5 rounded'
                  } else if (state === 'preview') {
                    bgClass = 'bg-blue-100'
                    textClass = 'text-blue-800'
                    extraClasses = 'px-0.5 -mx-0.5 rounded'
                  } 
                  // Search highlighting (only if not selected)
                  else if (searchState === 'current') {
                    bgClass = 'bg-orange-400'
                    textClass = 'text-white'
                    extraClasses = 'font-semibold px-1 -mx-0.5 rounded'
                  } else if (searchState === 'other') {
                    bgClass = 'bg-yellow-200'
                    textClass = 'text-gray-900'
                    extraClasses = 'px-0.5 -mx-0.5 rounded'
                  }
                  
                  return (
                    <span key={idx}>
                      <button
                        onClick={() => handleWordClick(segmentId, wordIndex, word)}
                        onMouseEnter={() => setHoverWord({ segmentId, wordIndex, timestamp: word.start })}
                        onMouseLeave={() => setHoverWord(null)}
                        className={`
                          transition-colors cursor-pointer inline
                          ${bgClass} ${textClass} ${extraClasses}
                        `}
                        title={`${formatTimestamp(word.start)} - ${formatTimestamp(word.end)} (${Math.round(word.confidence * 100)}% confident)${word.speaker ? ` • Speaker ${word.speaker}` : ''}`}
                      >
                        {word.text}
                      </button>
                      {' '}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      <div className="border-t pt-3 text-xs text-gray-500 px-4">
        {consolidatedSpeakerBlocks.reduce((sum, block) => sum + block.words.length, 0)} words • {consolidatedSpeakerBlocks.length} speaker {consolidatedSpeakerBlocks.length === 1 ? 'block' : 'blocks'}
      </div>
    </div>
  )
}

