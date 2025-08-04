import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Parser from 'rss-parser'

interface SubscribeRequest {
  feedUrl: string
  title: string
  description: string
  author: string
  imageUrl?: string
  language?: string
  categories?: string[]
}

const parser = new Parser({
  customFields: {
    feed: ['image', 'language'],
    item: ['duration', 'enclosure']
  }
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SubscribeRequest = await request.json()
    const { feedUrl, title, description, author, imageUrl, language = 'en', categories = [] } = body

    if (!feedUrl || !title || !description || !author) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: existingPodcast, error: findError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('feed_url', feedUrl)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    let podcastId: string

    if (existingPodcast) {
      podcastId = existingPodcast.id
    } else {
      let episodeCount = 0
      
      try {
        const feed = await parser.parseURL(feedUrl)
        episodeCount = feed.items?.length || 0
      } catch (rssError) {
        console.warn('Failed to parse RSS feed for episode count:', rssError)
      }

      const { data: newPodcast, error: insertError } = await supabase
        .from('podcasts')
        .insert({
          title,
          description,
          feed_url: feedUrl,
          image_url: imageUrl,
          author,
          language,
          categories,
          episode_count: episodeCount
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      podcastId = newPodcast.id
    }

    return NextResponse.json({
      success: true,
      podcastId,
      message: existingPodcast ? 'Already subscribed to this podcast' : 'Successfully subscribed to podcast'
    })

  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to podcast' },
      { status: 500 }
    )
  }
}