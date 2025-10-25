'use client'

import React, { useState } from 'react'
import { Trash2, RefreshCw, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import posthog from 'posthog-js'

interface Podcast {
  id: string
  title: string
  description: string
  feed_url: string
  image_url: string
  author: string
  language: string
  categories: string[]
  episode_count: number
  last_updated: string
  created_at: string
}

interface SubscriptionManagerProps {
  podcasts: Podcast[]
  onRefresh: () => void
  onUnsubscribe?: (podcastId: string) => void
}

export default function SubscriptionManager({ 
  podcasts, 
  onRefresh, 
  onUnsubscribe 
}: SubscriptionManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const handleRefreshPodcast = async (podcastId: string) => {
    setRefreshingId(podcastId)
    try {
      const response = await fetch(`/api/podcasts/${podcastId}/episodes`)
      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to refresh podcast:', error)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRefreshAll = async () => {
    posthog.capture('podcast_subscriptions_refreshed_all', { podcast_count: podcasts.length })
    setIsRefreshing(true)
    try {
      await Promise.all(
        podcasts.map(podcast => 
          fetch(`/api/podcasts/${podcast.id}/episodes`)
        )
      )
      onRefresh()
    } catch (error) {
      console.error('Failed to refresh podcasts:', error)
    } finally {
      setIsRefreshing(false)
    }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          My Subscriptions ({podcasts.length})
        </h2>
        <Button
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          variant="secondary"
          size="small"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </div>

      {podcasts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No podcast subscriptions yet.</p>
          <p className="text-sm text-gray-400 mt-1">Search for podcasts to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {podcasts.map((podcast) => (
            <div
              key={podcast.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                <img
                  src={podcast.image_url || '/placeholder-podcast.jpg'}
                  alt={podcast.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-900 truncate">
                        {podcast.title}
                      </h3>
                      <p className="text-sm text-gray-500">{podcast.author}</p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {truncateText(podcast.description, 120)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        onClick={() => handleRefreshPodcast(podcast.id)}
                        disabled={refreshingId === podcast.id}
                        variant="secondary"
                        size="small"
                      >
                        <RefreshCw 
                          className={`h-4 w-4 ${refreshingId === podcast.id ? 'animate-spin' : ''}`} 
                        />
                      </Button>
                      {onUnsubscribe && (
                        <Button
                          onClick={() => {
                            posthog.capture('podcast_unsubscribed', { podcast_id: podcast.id, podcast_title: podcast.title })
                            onUnsubscribe(podcast.id)
                          }}
                          variant="secondary"
                          size="small"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {podcast.episode_count} episodes
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Updated {formatDate(podcast.last_updated)}
                      </span>
                    </div>
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
