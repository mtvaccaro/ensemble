/**
 * Example: Episode Page with Transcription Integration
 * 
 * This is an example of how to integrate the TranscriptionButton component
 * into your episode listing page. Copy the relevant parts into your actual
 * episode page component.
 * 
 * Location: app/(dashboard)/dashboard/podcasts/[id]/page.tsx
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, Pause, Clock, Calendar, Download, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Episode, Podcast } from '@/types'
import { TranscriptionButton } from '@/components/episodes/transcription-button'
import { estimateTranscriptionCost } from '@/lib/transcription-utils'
import posthog from 'posthog-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PodcastEpisodesPageWithTranscription() {
  const params = useParams()
  const router = useRouter()
  const podcastId = params.id as string
  
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingEpisode, setPlayingEpisode] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (podcastId) {
      fetchPodcastAndEpisodes()
    }
  }, [podcastId])

  const fetchPodcastAndEpisodes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch podcast details
      const podcastResponse = await fetch('/api/podcasts')
      if (podcastResponse.ok) {
        const podcastData = await podcastResponse.json()
        const foundPodcast = podcastData.podcasts.find((p: Podcast) => p.id === podcastId)
        if (foundPodcast) {
          setPodcast(foundPodcast)
        }
      }

      // Fetch episodes
      const episodesResponse = await fetch(`/api/podcasts/${podcastId}/episodes`)
      if (episodesResponse.ok) {
        const episodesData = await episodesResponse.json()
        setEpisodes(episodesData.episodes || [])
      } else {
        setError('Failed to load episodes')
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load podcast data')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayPause = (episodeId: string, audioUrl: string) => {
    if (playingEpisode === episodeId) {
      if (audioElement) {
        audioElement.pause()
        setAudioElement(null)
      }
      setPlayingEpisode(null)
    } else {
      if (audioElement) {
        audioElement.pause()
      }
      
      const episode = episodes.find(e => e.id === episodeId)
      if (episode) {
        posthog.capture('podcast_episode_played', {
          podcast_id: podcastId,
          episode_id: episode.id,
          episode_title: episode.title,
          duration_seconds: episode.duration
        })
      }

      const audio = new Audio(audioUrl)
      audio.play()
      setAudioElement(audio)
      setPlayingEpisode(episodeId)
      
      audio.onended = () => {
        setPlayingEpisode(null)
        setAudioElement(null)
      }
    }
  }

  const handleTranscriptionComplete = (episodeId: string, transcript: string) => {
    // Track transcription completion
    posthog.capture('episode_transcription_completed', {
      podcast_id: podcastId,
      episode_id: episodeId,
      transcript_length: transcript.length,
    })

    // Optionally refresh episodes to get updated data
    fetchPodcastAndEpisodes()
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow border p-6">
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Episodes</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchPodcastAndEpisodes}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {podcast?.title || 'Podcast Episodes'}
          </h1>
          <p className="text-gray-600">
            {episodes.length} episodes • {podcast?.author}
          </p>
        </div>
      </div>

      {/* Podcast Info */}
      {podcast && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-start space-x-4">
            <img
              src={podcast.image_url || '/placeholder-podcast.jpg'}
              alt={podcast.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{podcast.title}</h2>
              <p className="text-gray-600 mt-1">{podcast.author}</p>
              <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                {truncateText(podcast.description, 200)}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {podcast.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episodes List */}
      <div className="space-y-4">
        {episodes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No episodes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              This podcast doesn't have any episodes yet, or there was an error loading them.
            </p>
          </div>
        ) : (
          episodes.map((episode) => (
            <div key={episode.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={episode.image_url || podcast?.image_url || '/placeholder-episode.jpg'}
                    alt={episode.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {episode.title}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(episode.published_at)}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDuration(episode.duration)}
                    </span>
                    <span className="text-xs text-gray-400">
                      Est. cost: ${estimateTranscriptionCost(episode.duration)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {truncateText(episode.description, 300)}
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Button
                      onClick={() => handlePlayPause(episode.id, episode.audio_url)}
                      variant={playingEpisode === episode.id ? "secondary" : "primary"}
                      size="small"
                    >
                      {playingEpisode === episode.id ? (
                        <Pause className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {playingEpisode === episode.id ? 'Pause' : 'Play'}
                    </Button>
                    <Button variant="secondary" size="small" onClick={() => {
                      posthog.capture('create_clip_button_clicked', {
                        podcast_id: podcastId,
                        episode_id: episode.id,
                        episode_title: episode.title
                      })
                    }}>
                      <Scissors className="h-4 w-4 mr-2" />
                      Create Clip
                    </Button>
                    <Button variant="secondary" size="small">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  {/* 🎯 TRANSCRIPTION COMPONENT - NEW! */}
                  <div className="border-t pt-4">
                    <TranscriptionButton
                      episodeId={episode.id}
                      episodeTitle={episode.title}
                      audioUrl={episode.audio_url}
                      initialStatus={episode.transcription_status}
                      initialTranscript={episode.transcript}
                      onTranscriptionComplete={(transcript) => 
                        handleTranscriptionComplete(episode.id, transcript)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

