import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: ['duration', 'enclosure', 'itunes:duration', 'content:encoded']
  }
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedUrl = searchParams.get('url')
    
    if (!feedUrl) {
      return NextResponse.json({ error: 'Feed URL is required' }, { status: 400 })
    }

    console.log('Fetching RSS feed:', feedUrl)

    // Fetch and parse the RSS feed
    const feed = await parser.parseURL(feedUrl)
    
    // Extract episodes
    const episodes = feed.items.slice(0, 10).map((item, index) => {
      const audioUrl = item.enclosure?.url || ''
      
      // Parse duration
      let duration = 0
      const durationStr = item['itunes:duration'] || item.duration
      if (durationStr) {
        const parts = String(durationStr).split(':').map(p => parseInt(p))
        if (parts.length === 3) {
          duration = parts[0] * 3600 + parts[1] * 60 + parts[2]
        } else if (parts.length === 2) {
          duration = parts[0] * 60 + parts[1]
        } else {
          duration = parseInt(String(durationStr)) || 2700
        }
      } else {
        duration = 2700 // Default 45 minutes
      }

      return {
        id: `episode-${index}`,
        title: item.title || 'Untitled Episode',
        description: item.contentSnippet || item['content:encoded'] || item.content || '',
        duration,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        audioUrl,
        // @ts-expect-error - RSS feed types don't include itunes namespace
        imageUrl: item.itunes?.image || feed.image?.url || ''
      }
    }).filter(episode => episode.audioUrl) // Only episodes with audio

    console.log(`Successfully parsed ${episodes.length} episodes from feed`)

    return NextResponse.json({
      episodes,
      podcast: {
        title: feed.title,
        description: feed.description,
        image: feed.image?.url || feed.itunes?.image,
        link: feed.link
      }
    })

  } catch (error) {
    console.error('RSS feed error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch RSS feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

