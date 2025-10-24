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

    // Fetch audio from podcast host with redirect handling
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EnsembleApp/1.0',
        'Accept': 'audio/mpeg, audio/mp4, audio/*',
        'Range': 'bytes=0-', // Request full range to avoid partial content issues
      },
      redirect: 'follow', // Follow redirects automatically
    })

    console.log('[Audio Proxy] Response:', response.status, response.statusText, 'URL:', response.url)

    if (!response.ok) {
      console.error('[Audio Proxy] Failed:', response.status, response.statusText)
      
      // For 401/403, try without query params (strip tracking/auth)
      if (response.status === 401 || response.status === 403) {
        console.log('[Audio Proxy] Retrying without query parameters...')
        try {
          const urlObj = new URL(url)
          const cleanUrl = `${urlObj.origin}${urlObj.pathname}`
          
          const retryResponse = await fetch(cleanUrl, {
            headers: {
              'User-Agent': 'EnsembleApp/1.0',
              'Accept': 'audio/mpeg, audio/mp4, audio/*',
            },
            redirect: 'follow',
          })
          
          if (retryResponse.ok) {
            console.log('[Audio Proxy] ✅ Success without query params')
            const contentType = retryResponse.headers.get('content-type') || 'audio/mpeg'
            const buffer = await retryResponse.arrayBuffer()
            console.log('[Audio Proxy] Fetched', buffer.byteLength, 'bytes')
            
            return new NextResponse(buffer, {
              headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }
        } catch (retryError) {
          console.error('[Audio Proxy] Retry also failed:', retryError)
        }
      }
      
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

