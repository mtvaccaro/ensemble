'use client'

import React from 'react'
import { Scissors, Podcast, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import posthog from 'posthog-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const stats = [
    {
      name: 'Total Clips',
      value: '24',
      icon: Scissors,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Podcasts',
      value: '8',
      icon: Podcast,
      change: '+2',
      changeType: 'positive'
    },
    {
      name: 'Hours Saved',
      value: '12.5',
      icon: Clock,
      change: '+3.2h',
      changeType: 'positive'
    },
    {
      name: 'Engagement',
      value: '89%',
      icon: TrendingUp,
      change: '+5%',
      changeType: 'positive'
    }
  ]

  const recentClips = [
    {
      id: '1',
      title: 'The Future of AI in Healthcare',
      podcast: 'Tech Talk Daily',
      duration: '2:34',
      created: '2 hours ago'
    },
    {
      id: '2',
      title: 'Building Scalable Systems',
      podcast: 'Engineering Insights',
      duration: '1:45',
      created: '1 day ago'
    },
    {
      id: '3',
      title: 'Startup Lessons Learned',
      podcast: 'Founder Stories',
      duration: '3:12',
      created: '2 days ago'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your clips.</p>
        </div>
        <Button onClick={() => posthog.capture('create_new_clip_clicked', { location: 'dashboard_header' })}>
          <Scissors className="mr-2 h-4 w-4" />
          Create New Clip
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
            >
              <dt>
                <div className="absolute rounded-md bg-blue-500 p-3">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                  {stat.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </dd>
            </div>
          )
        })}
      </div>

      {/* Recent Clips */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Recent Clips
          </h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {recentClips.map((clip) => (
                <li key={clip.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {clip.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {clip.podcast} • {clip.duration}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {clip.created}
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => posthog.capture('view_recent_clip_clicked', { clip_id: clip.id, clip_title: clip.title, podcast_name: clip.podcast })}>
                        View
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <Button variant="outline" className="w-full" onClick={() => posthog.capture('view_all_clips_clicked', { location: 'dashboard_recent_clips' })}>
              View all clips
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 
      