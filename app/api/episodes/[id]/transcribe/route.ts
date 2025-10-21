import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TranscriptionStatus } from '@/types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Maximum file size for Whisper API (25 MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: episodeId } = await params
  
  try {
    // Get episode data from request body (sent from client with localStorage data)
    const body = await request.json()
    const { audioUrl, title } = body

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 })
    }

    console.log('Starting transcription for episode:', episodeId, title)

    try {
      // Download the audio file
      console.log('Downloading audio file:', audioUrl)
      const audioResponse = await fetch(audioUrl)
      
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio file: ${audioResponse.statusText}`)
      }

      const contentLength = audioResponse.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
        throw new Error('Audio file is too large (max 25MB for Whisper API)')
      }

      const audioBuffer = await audioResponse.arrayBuffer()
      const audioBlob = new Blob([audioBuffer])
      
      // Get file extension from URL or default to mp3
      const urlParts = audioUrl.split('.')
      const extension = urlParts[urlParts.length - 1].split('?')[0] || 'mp3'
      const fileName = `episode_${episodeId}.${extension}`
      
      // Create a File object for OpenAI
      const audioFile = new File([audioBlob], fileName, {
        type: `audio/${extension}`,
      })

      console.log('Sending to OpenAI Whisper API...', {
        fileSize: audioBlob.size,
        fileName
      })
      
      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You can make this configurable or auto-detect
        response_format: 'text',
      })

      console.log('Transcription completed successfully, length:', transcription.length)

      return NextResponse.json({
        message: 'Transcription completed successfully',
        transcript: transcription,
        status: TranscriptionStatus.COMPLETED,
      })

    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError)
      
      const errorMessage = transcriptionError instanceof Error 
        ? transcriptionError.message 
        : 'Unknown error during transcription'

      return NextResponse.json(
        {
          error: 'Transcription failed',
          details: errorMessage,
          status: TranscriptionStatus.FAILED,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Transcribe endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check transcription status
// In localStorage mode, status is checked on the client side
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: episodeId } = await params
  
  // In localStorage mode, the client handles status checking
  // This endpoint is here for API compatibility but doesn't do much
  return NextResponse.json({
    message: 'In localStorage mode, check status on the client side',
    episodeId,
    info: 'Use storage.getTranscript(episodeId) in your client code'
  })
}
