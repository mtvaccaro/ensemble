'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, X, Info } from 'lucide-react'
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
}

export function WordLevelTranscript({ 
  segments, 
  onSelectionChange,
  startTime,
  endTime
}: WordLevelTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectionStart, setSelectionStart] = useState<WordSelection | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<WordSelection | null>(null)
  const [hoverWord, setHoverWord] = useState<WordSelection | null>(null)

  // Reset selection when parent passes new times
  useEffect(() => {
    if (startTime === null || endTime === null) {
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  }, [startTime, endTime])

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

  // Find matches and highlight segments
  const { highlightedSegments, matchCount } = useMemo(() => {
    if (!searchQuery) {
      return {
        highlightedSegments: segments,
        matchCount: 0
      }
    }

    const query = searchQuery.toLowerCase()
    let count = 0
    
    const highlighted = segments.map(segment => ({
      ...segment,
      hasMatch: segment.text.toLowerCase().includes(query)
    }))

    count = highlighted.filter(s => s.hasMatch).length

    return { highlightedSegments: highlighted, matchCount: count }
  }, [segments, searchQuery])

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
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800">
            <span className="font-semibold">Word-level precision:</span> Click any word to set start point, click another to set end point. 
            Click again to reset. Hover to preview selection.
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 bg-white border-b pb-3 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript... (e.g., 'AI', 'revenue', topic)"
            className="w-full pl-10 pr-20 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          {searchQuery && (
            <>
              <div className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100 rounded p-1"
                title="Clear search"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Word-level Transcript */}
      <div className="space-y-3 pr-1">
        {highlightedSegments.map((segment) => {
          if (!segment.words || segment.words.length === 0) return null

          const hasMatch = 'hasMatch' in segment && segment.hasMatch

          return (
            <div
              key={segment.id}
              className={`
                p-2 rounded-lg border
                ${hasMatch ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}
              `}
            >
              {/* Timestamp header */}
              <div className="text-[10px] text-gray-400 font-mono mb-2">
                {formatTimestampSimple(segment.words[0].start)} - {formatTimestampSimple(segment.words[segment.words.length - 1].end)}
              </div>
              
              {/* Words */}
              <div className="flex flex-wrap gap-1 items-baseline">
                {segment.words.map((word, wordIndex) => {
                  const state = isWordInSelection(segment.id, wordIndex)
                  
                  let bgClass = 'hover:bg-blue-50'
                  let textClass = 'text-gray-800'
                  let borderClass = ''
                  
                  if (state === 'start' || state === 'end') {
                    bgClass = 'bg-blue-500 text-white'
                    textClass = 'text-white'
                    borderClass = 'border-2 border-blue-600'
                  } else if (state === 'selected') {
                    bgClass = 'bg-blue-200'
                    textClass = 'text-blue-900'
                  } else if (state === 'preview') {
                    bgClass = 'bg-blue-100'
                    textClass = 'text-blue-800'
                  }
                  
                  // Highlight low confidence words
                  if (word.confidence < 0.7 && state === null) {
                    textClass = 'text-orange-600'
                  }
                  
                  return (
                    <button
                      key={wordIndex}
                      onClick={() => handleWordClick(segment.id, wordIndex, word)}
                      onMouseEnter={() => setHoverWord({ segmentId: segment.id, wordIndex, timestamp: word.start })}
                      onMouseLeave={() => setHoverWord(null)}
                      className={`
                        px-1 py-0.5 rounded text-sm transition-all cursor-pointer
                        ${bgClass} ${textClass} ${borderClass}
                      `}
                      title={`${formatTimestamp(word.start)} - ${formatTimestamp(word.end)} (${Math.round(word.confidence * 100)}% confident)`}
                    >
                      {word.text}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* No results */}
      {searchQuery && matchCount === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No matches found for <span className="font-semibold">&quot;{searchQuery}&quot;</span></p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}

      {/* Stats footer */}
      <div className="border-t pt-3 text-xs text-gray-500">
        {segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0)} words • {segments.length} segments
        {searchQuery && ` • ${matchCount} search results`}
      </div>
    </div>
  )
}

