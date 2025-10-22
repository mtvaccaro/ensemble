'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, Pause, Clock, Calendar, Download, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { storage } from '@/lib/localStorage'
import { TranscriptionButton } from '@/components/episodes/transcription-button'
import { estimateTranscriptionCost } from '@/lib/transcription-utils'
import { Episode as StorageEpisode } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Episode {
  id: string
  title: string
  description: string
  duration: number
  publishedAt: string
  audioUrl: string
}

export default function DemoPodcastEpisodesPage() {
  const params = useParams()
  const router = useRouter()
  const podcastId = params.id as string
  
  const [playingEpisode, setPlayingEpisode] = useState<string | null>(null)
  const [realEpisodes, setRealEpisodes] = useState<Episode[]>([])
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false)
  const [episodeError, setEpisodeError] = useState<string | null>(null)

  // Get episode data based on podcast
  const getEpisodeData = () => {
    if (podcastId === '1376303362') { // Behind the Money
      return [
        {
          id: '1',
          title: 'The Fed\'s Next Move: Interest Rates and Market Impact',
          description: 'Financial Times reporters analyze the Federal Reserve\'s latest policy decisions and their implications for global markets.',
          duration: 2880, // 48 minutes
          publishedAt: '2024-01-15T10:00:00Z',
          audioUrl: 'https://example.com/audio1.mp3'
        },
        {
          id: '2', 
          title: 'Crypto Regulation: What\'s Next for Digital Assets',
          description: 'Exploring the evolving regulatory landscape for cryptocurrencies and digital assets in major markets.',
          duration: 2700, // 45 minutes
          publishedAt: '2024-01-08T10:00:00Z',
          audioUrl: 'https://example.com/audio2.mp3'
        },
        {
          id: '3',
          title: 'ESG Investing: Beyond the Hype',
          description: 'A deep dive into environmental, social, and governance investing and its real impact on portfolios.',
          duration: 3120, // 52 minutes
          publishedAt: '2024-01-01T10:00:00Z',
          audioUrl: 'https://example.com/audio3.mp3'
        }
      ]
    } else {
      // Default tech episodes
      return [
        {
          id: '1',
          title: 'The Future of AI in Healthcare',
          description: 'In this episode, we explore how artificial intelligence is revolutionizing healthcare, from diagnostic tools to personalized treatment plans.',
          duration: 3240, // 54 minutes
          publishedAt: '2024-01-15T10:00:00Z',
          audioUrl: 'https://example.com/audio1.mp3'
        },
        {
          id: '2', 
          title: 'Building Scalable Systems',
          description: 'Learn about the principles of building systems that can handle millions of users and scale efficiently.',
          duration: 2700, // 45 minutes
          publishedAt: '2024-01-08T10:00:00Z',
          audioUrl: 'https://example.com/audio2.mp3'
        },
        {
          id: '3',
          title: 'Startup Lessons Learned',
          description: 'A candid conversation about the challenges and lessons learned from building a successful startup.',
          duration: 3780, // 63 minutes
          publishedAt: '2024-01-01T10:00:00Z',
          audioUrl: 'https://example.com/audio3.mp3'
        }
      ]
    }
  }

  const mockEpisodes = getEpisodeData()

  // Get podcast data from localStorage first, then fall back to mock data
  const getPodcastData = () => {
    // Try to load from localStorage first
    const storedPodcast = storage.getPodcast(podcastId)
    if (storedPodcast) {
      return {
        title: storedPodcast.title,
        author: storedPodcast.author,
        description: storedPodcast.description,
        image_url: storedPodcast.image_url,
        categories: storedPodcast.categories || []
      }
    }
    
    // Fall back to mock data for demo purposes
    const mockPodcasts = {
      '1376303362': { // Behind the Money ID
        title: 'Behind the Money',
        author: 'Financial Times',
        description: 'Behind the Money is a podcast from the Financial Times that explores the stories behind the headlines in business and finance.',
        image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/28/23/24/282324f8-1d4e-8dbf-f81f-08cd5e7fcd49/mza_4986980885214404076.jpeg/600x600bb.jpg',
        categories: ['Business', 'News', 'Finance']
      },
      '1611767434': { // Bloomberg Tech ID
        title: 'Bloomberg Tech',
        author: 'Bloomberg',
        description: 'Bloomberg Technology brings you the latest in tech news, analysis, and interviews with industry leaders.',
        image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/f5/9c/9f/f59c9f1f-cbc8-0e46-629d-2df7e6a18274/mza_3594252261487211794.jpg/600x600bb.jpg',
        categories: ['Technology', 'News', 'Business']
      },
      'default': {
        title: 'Tech Talk Daily',
        author: 'Tech Media Inc',
        description: 'Daily insights into the world of technology with expert guests and industry leaders.',
        image_url: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Podcast',
        categories: ['Technology', 'News']
      }
    }
    
    return mockPodcasts[podcastId as keyof typeof mockPodcasts] || mockPodcasts.default
  }

  const mockPodcast = getPodcastData()

  // Fetch real episodes from RSS feed
  useEffect(() => {
    const fetchRealEpisodes = async () => {
      const podcast = storage.getPodcast(podcastId)
      if (!podcast || !podcast.feed_url) {
        console.log('No podcast found in localStorage or no feed URL')
        return
      }

      // Skip example.com feeds (they're fake)
      if (podcast.feed_url.includes('example.com')) {
        console.log('Skipping example.com feed - using mock data')
        return
      }

      setIsLoadingEpisodes(true)
      setEpisodeError(null)

      try {
        // Use our server-side API to fetch RSS feed (no CORS issues!)
        const response = await fetch(`/api/rss?url=${encodeURIComponent(podcast.feed_url)}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.details || 'Failed to fetch RSS feed')
        }

        const data = await response.json()
        const episodes: Episode[] = data.episodes.map((ep: { title: string; description?: string; duration: number; publishedAt?: string; audioUrl: string }, index: number) => ({
          id: `${podcastId}-real-${index}`,
          title: ep.title,
          description: ep.description,
          duration: ep.duration,
          publishedAt: ep.publishedAt,
          audioUrl: ep.audioUrl
        }))

        console.log(`Fetched ${episodes.length} real episodes from RSS feed`)
        setRealEpisodes(episodes)
        
        // Save to localStorage (map to StorageEpisode type)
        const storageEpisodes: StorageEpisode[] = episodes.map(ep => ({
          id: ep.id,
          podcast_id: podcastId,
          title: ep.title,
          description: ep.description,
          audio_url: ep.audioUrl,
          duration: ep.duration,
          published_at: ep.publishedAt
        }))
        storage.setEpisodes(podcastId, storageEpisodes)
        
      } catch (error) {
        console.error('Error fetching RSS feed:', error)
        setEpisodeError('Failed to load episodes from RSS feed')
      } finally {
        setIsLoadingEpisodes(false)
      }
    }

    fetchRealEpisodes()
  }, [podcastId])

  // Use real episodes if available, otherwise fall back to mock
  const displayEpisodes = realEpisodes.length > 0 ? realEpisodes : mockEpisodes

  const handlePlayPause = (episodeId: string) => {
    if (playingEpisode === episodeId) {
      setPlayingEpisode(null)
    } else {
      setPlayingEpisode(episodeId)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}`
    }
    return `${minutes} min`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">Demo Episodes</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {mockPodcast.title}
              </h1>
              <p className="text-gray-600">
                {mockEpisodes.length} episodes • {mockPodcast.author}
              </p>
            </div>
          </div>

          {/* Status Notice */}
          {isLoadingEpisodes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Loading Real Episodes...
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Fetching episodes from the podcast&apos;s RSS feed.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {episodeError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {episodeError}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Showing demo episodes instead. Subscribe to a podcast to see real episodes.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {realEpisodes.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Real Episodes Loaded!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Showing {realEpisodes.length} episodes from the RSS feed. Transcription will work with these!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Podcast Info */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-start space-x-4">
              <img
                src={mockPodcast.image_url}
                alt={mockPodcast.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{mockPodcast.title}</h2>
                <p className="text-gray-600 mt-1">{mockPodcast.author}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {mockPodcast.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {mockPodcast.categories.map((category, index) => (
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

          {/* Episodes List */}
          <div className="space-y-4">
            {displayEpisodes.map((episode) => (
              <div key={episode.id} className="bg-white rounded-lg shadow border p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <img
                      src={mockPodcast.image_url}
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
                        {formatDate(episode.publishedAt)}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDuration(episode.duration)}
                      </span>
                      <span className="text-xs text-gray-400">
                        Est. cost: ${estimateTranscriptionCost(episode.duration)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {episode.description}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3 mb-4">
                      <Button
                        onClick={() => handlePlayPause(episode.id)}
                        variant={playingEpisode === episode.id ? "outline" : undefined}
                        size="sm"
                      >
                        {playingEpisode === episode.id ? (
                          <Pause className="h-4 w-4 mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {playingEpisode === episode.id ? 'Pause' : 'Play'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => alert('Demo: This would create a clip from ' + episode.title)}
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Create Clip
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => alert('Demo: This would download ' + episode.title)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    {/* Transcription Section */}
                    <div className="border-t pt-4">
                      <TranscriptionButton
                        episodeId={`${podcastId}-${episode.id}`}
                        episodeTitle={episode.title}
                        audioUrl={episode.audioUrl}
                        onTranscriptionComplete={(transcript) => {
                          console.log('Transcription completed for:', episode.title)
                          console.log('Transcript length:', transcript.length)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
