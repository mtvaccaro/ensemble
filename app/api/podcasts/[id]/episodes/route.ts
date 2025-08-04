import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Parser from 'rss-parser'

interface RouteParams {
  params: {
    id: string
  }
}

const parser = new Parser({
  customFields: {
    item: ['duration', 'enclosure', 'content:encoded']
  }
})

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (podcastError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    try {
      const feed = await parser.parseURL(podcast.feed_url)
      
      const episodes = feed.items.map(item => {
        const audioUrl = item.enclosure?.url || ''
        const duration = parseDuration(item.duration)
        
        return {
          title: item.title || 'Untitled Episode',
          description: item.contentSnippet || item.content || item.description || '',
          audioUrl,
          duration,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          imageUrl: item.itunes?.image || podcast.image_url
        }
      }).filter(episode => episode.audioUrl)

      const { data: existingEpisodes, error: episodesError } = await supabase
        .from('episodes')
        .select('audio_url')
        .eq('podcast_id', params.id)

      if (episodesError) {
        throw episodesError
      }

      const existingUrls = new Set(existingEpisodes.map(ep => ep.audio_url))
      const newEpisodes = episodes.filter(ep => !existingUrls.has(ep.audioUrl))

      if (newEpisodes.length > 0) {
        const episodesToInsert = newEpisodes.map(episode => ({
          podcast_id: params.id,
          title: episode.title,
          description: episode.description,
          audio_url: episode.audioUrl,
          duration: episode.duration,
          published_at: episode.publishedAt,
          image_url: episode.imageUrl
        }))

        const { error: insertError } = await supabase
          .from('episodes')
          .insert(episodesToInsert)

        if (insertError) {
          throw insertError
        }

        const { error: updateError } = await supabase
          .from('podcasts')
          .update({ 
            episode_count: episodes.length,
            last_updated: new Date().toISOString()
          })
          .eq('id', params.id)

        if (updateError) {
          console.warn('Failed to update podcast episode count:', updateError)
        }
      }

      const { data: allEpisodes, error: fetchError } = await supabase
        .from('episodes')
        .select('*')
        .eq('podcast_id', params.id)
        .order('published_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      return NextResponse.json({ episodes: allEpisodes })

    } catch (rssError) {
      console.error('RSS parsing error:', rssError)
      return NextResponse.json(
        { error: 'Failed to fetch episodes from RSS feed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Get episodes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    )
  }
}

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0
  
  const parts = durationStr.split(':').map(p => parseInt(p, 10))
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 1) {
    return parts[0]
  }
  
  return 0
}