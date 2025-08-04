import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

interface PodcastIndexResponse {
  feeds: Array<{
    id: number
    title: string
    url: string
    originalUrl: string
    link: string
    description: string
    author: string
    ownerName: string
    image: string
    artwork: string
    lastUpdateTime: number
    lastCrawlTime: number
    lastParseTime: number
    lastGoodHttpStatusTime: number
    lastHttpStatus: number
    contentType: string
    itunesId?: number
    language: string
    explicit: boolean
    type: number
    medium: string
    dead: number
    chash: string
    episodeCount: number
    crawlErrors: number
    parseErrors: number
    categories: Record<string, string>
    locked: number
    imageUrlHash: number
  }>
  count: number
  query: string
  description: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const apiKey = process.env.PODCAST_INDEX_API_KEY
    const apiSecret = process.env.PODCAST_INDEX_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Podcast Index API credentials not configured' }, { status: 500 })
    }

    const epochTime = Math.floor(Date.now() / 1000)
    const data4Hash = apiKey + apiSecret + epochTime
    const hash = crypto.createHash('sha1').update(data4Hash).digest('hex')

    const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}&max=20&clean=1`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Date': epochTime.toString(),
        'X-Auth-Key': apiKey,
        'Authorization': hash,
        'User-Agent': 'ClipperApp/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Podcast Index API error: ${response.status}`)
    }

    const data: PodcastIndexResponse = await response.json()
    
    const simplifiedResults = data.feeds.map(feed => ({
      id: feed.id,
      title: feed.title,
      description: feed.description,
      author: feed.author || feed.ownerName,
      imageUrl: feed.image || feed.artwork,
      feedUrl: feed.url,
      websiteUrl: feed.link,
      language: feed.language,
      episodeCount: feed.episodeCount,
      categories: Object.values(feed.categories || {}),
      lastUpdated: new Date(feed.lastUpdateTime * 1000).toISOString()
    }))

    return NextResponse.json({
      podcasts: simplifiedResults,
      total: data.count,
      query: data.query
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search podcasts' },
      { status: 500 }
    )
  }
}