import { NextRequest, NextResponse } from 'next/server'

/**
 * Audio Proxy API Route
 * 
 * Proxies audio requests to bypass CORS restrictions.
 * Only used when direct fetch fails (hybrid approach).
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    console.log('[Audio Proxy] Fetching:', url)

    // Fetch audio from podcast host
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EnsembleApp/1.0',
      },
    })

    if (!response.ok) {
      console.error('[Audio Proxy] Failed:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to fetch audio: ${response.statusText}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    const buffer = await response.arrayBuffer()

    console.log('[Audio Proxy] Success:', buffer.byteLength, 'bytes')

    // Return with CORS headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })

  } catch (error) {
    console.error('[Audio Proxy] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

