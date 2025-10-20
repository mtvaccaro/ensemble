'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Podcast, Users, Calendar, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PodcastSearchResult, Podcast as PodcastType } from '@/types'
import posthog from 'posthog-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function DashboardPodcastsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([])
  const [subscribedPodcasts, setSubscribedPodcasts] = useState<PodcastType[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState<number | null>(null)
  const [isUnsubscribing, setIsUnsubscribing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'subscribed' | 'search'>('subscribed')
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    fetchSubscribedPodcasts()
  }, [])

  const fetchSubscribedPodcasts = async () => {
    try {
      const response = await fetch('/api/podcasts')
      if (response.ok) {
        const data = await response.json()
        setSubscribedPodcasts(data.podcasts)
      }
    } catch (error) {
      console.error('Failed to fetch subscribed podcasts:', error)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/podcasts/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.podcasts)
        setActiveTab('search')
        // Check if we're getting demo data
        const isDemo = data.podcasts.some((p: PodcastSearchResult) => p.feedUrl?.includes('feeds.example.com'))
        setIsDemoMode(isDemo)
        posthog.capture('podcast-searched', {
          search_query: searchQuery,
          result_count: data.podcasts.length,
          is_demo_mode: isDemo
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubscribe = async (podcast: PodcastSearchResult) => {
    setIsSubscribing(podcast.id)
    try {
      const response = await fetch('/api/podcasts/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedUrl: podcast.feedUrl,
          title: podcast.title,
          description: podcast.description,
          author: podcast.author,
          imageUrl: podcast.imageUrl,
          language: podcast.language,
          categories: podcast.categories
        })
      })

      if (response.ok) {
        posthog.capture('podcast-subscribed', {
          podcast_id: podcast.id,
          podcast_title: podcast.title,
          podcast_author: podcast.author
        })
        await fetchSubscribedPodcasts()
        setActiveTab('subscribed')
      }
    } catch (error) {
      console.error('Subscribe failed:', error)
    } finally {
      setIsSubscribing(null)
    }
  }

  const handleUnsubscribe = async (podcastId: string) => {
    if (!confirm('Are you sure you want to unsubscribe from this podcast?')) {
      return
    }

    setIsUnsubscribing(podcastId)
    try {
      const response = await fetch(`/api/podcasts/${podcastId}/unsubscribe`, {
        method: 'DELETE'
      })

      if (response.ok) {
        posthog.capture('podcast-unsubscribed', { podcast_id: podcastId })
        await fetchSubscribedPodcasts()
      }
    } catch (error) {
      console.error('Unsubscribe failed:', error)
    } finally {
      setIsUnsubscribing(null)
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Podcasts</h1>
          <p className="text-gray-600">Search and manage your podcast subscriptions</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search for podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {isDemoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Demo Mode Active
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Showing demo podcast results while waiting for Podcast Index API credentials. 
                  You can still test the subscription and UI functionality!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('subscribed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscribed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Podcasts ({subscribedPodcasts.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Search Results ({searchResults.length})
          </button>
        </nav>
      </div>

      {activeTab === 'subscribed' && (
        <div className="space-y-4">
          {subscribedPodcasts.length === 0 ? (
            <div className="text-center py-12">
              <Podcast className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No podcasts yet</h3>
              <p className="mt-1 text-sm text-gray-500">Search for podcasts to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscribedPodcasts.map((podcast) => (
                <div key={podcast.id} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={podcast.image_url || '/placeholder-podcast.jpg'}
                      alt={podcast.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors hover:underline"
                        onClick={() => router.push(`/dashboard/podcasts/${podcast.id}`)}
                        title="Click to view episodes"
                      >
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-gray-500">{podcast.author}</p>
                      <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {podcast.episode_count} episodes
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 line-clamp-3">
                    {truncateText(podcast.description, 120)}
                  </p>
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex flex-wrap gap-1">
                      {podcast.categories.slice(0, 2).map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleUnsubscribe(podcast.id)}
                        disabled={isUnsubscribing === podcast.id}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-4">
          {searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No search results</h3>
              <p className="mt-1 text-sm text-gray-500">Try searching for a podcast name or topic.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((podcast) => (
                <div key={podcast.id} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={podcast.imageUrl || '/placeholder-podcast.jpg'}
                      alt={podcast.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {podcast.title}
                          </h3>
                          <p className="text-sm text-gray-500">{podcast.author}</p>
                          <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {podcast.episodeCount} episodes
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              Updated {new Date(podcast.lastUpdated).toLocaleDateString()}
                            </span>
                            {podcast.websiteUrl && (
                              <a
                                href={podcast.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSubscribe(podcast)}
                          disabled={isSubscribing === podcast.id}
                          className="ml-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isSubscribing === podcast.id ? 'Adding..' : 'Subscribe'}
                        </Button>
                      </div>
                      <p className="mt-4 text-sm text-gray-600">
                        {truncateText(podcast.description, 200)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {podcast.categories.slice(0, 3).map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
