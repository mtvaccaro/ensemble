'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { TranscriptSegment } from '@/types'

interface SearchableTranscriptProps {
  segments: TranscriptSegment[]
  onSegmentClick?: (segment: TranscriptSegment) => void
}

export function SearchableTranscript({ segments, onSegmentClick }: SearchableTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Find matches and highlight segments
  const { highlightedSegments, matchCount } = useMemo(() => {
    if (!searchQuery) {
      return {
        highlightedSegments: segments.map(s => ({ ...s, hasMatch: false })),
        matchCount: 0
      }
    }

    const query = searchQuery.toLowerCase()
    let count = 0
    
    const highlighted = segments.map(segment => {
      const hasMatch = segment.text.toLowerCase().includes(query)
      if (hasMatch) count++
      return { ...segment, hasMatch }
    })

    return { highlightedSegments: highlighted, matchCount: count }
  }, [segments, searchQuery])

  // Group segments into paragraphs based on pauses
  const paragraphs = useMemo(() => {
    const groups: typeof highlightedSegments[] = []
    let currentGroup: typeof highlightedSegments = []

    for (let i = 0; i < highlightedSegments.length; i++) {
      currentGroup.push(highlightedSegments[i])

      // Check if there's a long pause (>2 seconds) before next segment
      if (i < highlightedSegments.length - 1) {
        const gap = highlightedSegments[i + 1].start - highlightedSegments[i].end
        if (gap > 2.0) {
          groups.push(currentGroup)
          currentGroup = []
        }
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }, [highlightedSegments])

  return (
    <div className="space-y-4">
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

      {/* Transcript Paragraphs */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {paragraphs.map((paragraphSegments, paragraphIndex) => {
          const hasMatchInParagraph = paragraphSegments.some(s => s.hasMatch)

          return (
            <div
              key={paragraphIndex}
              className={`
                space-y-0.5 p-2 rounded border
                ${hasMatchInParagraph ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}
              `}
            >
              {paragraphSegments.map((segment) => (
                <div
                  key={segment.id}
                  className={`
                    flex gap-2 p-1.5 rounded cursor-pointer transition-colors
                    ${segment.hasMatch ? 'bg-yellow-100' : 'hover:bg-white'}
                  `}
                  onClick={() => onSegmentClick?.(segment)}
                  title={`Click to jump to ${formatTimestamp(segment.start)}`}
                >
                  {/* Timestamp */}
                  <div className="text-[10px] text-gray-500 font-mono min-w-[50px] flex-shrink-0 hover:text-blue-600">
                    {formatTimestamp(segment.start)}
                  </div>
                  
                  {/* Text with highlights */}
                  <div className="text-xs text-gray-700 flex-1 leading-snug">
                    {searchQuery ? (
                      <HighlightedText text={segment.text} query={searchQuery} />
                    ) : (
                      segment.text
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* No results */}
      {searchQuery && matchCount === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No matches found for <span className="font-semibold">"{searchQuery}"</span></p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}

      {/* Stats footer */}
      <div className="border-t pt-3 text-xs text-gray-500">
        {segments.length} segments • {paragraphs.length} paragraphs
        {searchQuery && ` • ${matchCount} search results`}
      </div>
    </div>
  )
}

// Helper component to highlight search terms
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-300 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

