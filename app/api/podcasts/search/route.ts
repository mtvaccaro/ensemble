import { NextRequest, NextResponse } from 'next/server'

interface iTunesSearchResponse {
  resultCount: number
  results: Array<{
    wrapperType: string
    kind: string
    collectionId: number
    trackId: number
    artistName: string
    collectionName: string
    trackName: string
    collectionCensoredName: string
    trackCensoredName: string
    collectionViewUrl: string
    feedUrl: string
    trackViewUrl: string
    artworkUrl30: string
    artworkUrl60: string
    artworkUrl100: string
    collectionPrice: number
    trackPrice: number
    collectionHdPrice: number
    releaseDate: string
    collectionExplicitness: string
    trackExplicitness: string
    trackCount: number
    trackTimeMillis: number
    country: string
    currency: string
    primaryGenreName: string
    contentAdvisoryRating: string
    artworkUrl600: string
    genreIds: string[]
    genres: string[]
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Use iTunes Search API - no authentication required!
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=20`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UnspoolApp/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`iTunes Search API error: ${response.status}`)
    }

    const data: iTunesSearchResponse = await response.json()
    
    const simplifiedResults = data.results.map(result => ({
      id: result.collectionId,
      title: result.collectionName || result.trackName,
      description: `A podcast by ${result.artistName}`, // iTunes doesn't provide descriptions
      author: result.artistName,
      imageUrl: result.artworkUrl600 || result.artworkUrl100,
      feedUrl: result.feedUrl,
      websiteUrl: result.collectionViewUrl,
      language: 'en', // iTunes doesn't provide language in search
      episodeCount: result.trackCount || 0,
      categories: result.genres || [result.primaryGenreName],
      lastUpdated: result.releaseDate
    }))

    return NextResponse.json({
      podcasts: simplifiedResults,
      total: data.resultCount,
      query: query
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search podcasts' },
      { status: 500 }
    )
  }
}

// Mock data function for when API credentials aren't available
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getMockPodcastResults(query: string) {
  const mockPodcasts = [
    {
      id: 1,
      title: `${query} Podcast`,
      description: `A great podcast about ${query} with interesting discussions and expert guests.`,
      author: 'Demo Host',
      imageUrl: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Podcast',
      feedUrl: 'https://feeds.example.com/demo1',
      websiteUrl: 'https://example.com/podcast1',
      language: 'en',
      episodeCount: 150,
      categories: ['Technology', 'Education'],
      lastUpdated: new Date().toISOString()
    },
    {
      id: 2,
      title: `The ${query} Show`,
      description: `Weekly episodes covering the latest in ${query} with industry experts and thought leaders.`,
      author: 'Expert Panel',
      imageUrl: 'https://via.placeholder.com/300x300/7C3AED/FFFFFF?text=Show',
      feedUrl: 'https://feeds.example.com/demo2',
      websiteUrl: 'https://example.com/podcast2',
      language: 'en',
      episodeCount: 89,
      categories: ['Business', 'News'],
      lastUpdated: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      title: `${query} Deep Dive`,
      description: `In-depth analysis and discussions about ${query} trends, challenges, and opportunities.`,
      author: 'Research Team',
      imageUrl: 'https://via.placeholder.com/300x300/059669/FFFFFF?text=Deep+Dive',
      feedUrl: 'https://feeds.example.com/demo3',
      websiteUrl: 'https://example.com/podcast3',
      language: 'en',
      episodeCount: 234,
      categories: ['Science', 'Research'],
      lastUpdated: new Date(Date.now() - 172800000).toISOString()
    }
  ]

  return NextResponse.json({
    podcasts: mockPodcasts,
    total: mockPodcasts.length,
    query: query
  })
}