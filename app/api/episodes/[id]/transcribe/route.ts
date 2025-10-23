import { NextRequest, NextResponse } from 'next/server'
import { AssemblyAI } from 'assemblyai'
import { TranscriptionStatus } from '@/types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Initialize AssemblyAI client
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: episodeId } = await params
  
  try {
    const contentType = request.headers.get('content-type')
    let audioUrl: string | undefined
    let audioFile: File | undefined
    let episodeTitle: string | undefined

    // Handle both JSON (URL) and FormData (file upload)
    if (contentType?.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData()
      audioFile = formData.get('audio') as File
      episodeTitle = formData.get('title') as string

      if (!audioFile) {
        return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
      }
      console.log('🎙️  Starting AssemblyAI transcription for uploaded file:', episodeTitle)
      console.log('📁 File:', audioFile.name, `(${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`)
    } else {
      // URL from podcast episode
      const body = await request.json()
      audioUrl = body.audioUrl
      episodeTitle = body.episodeTitle

      if (!audioUrl) {
        return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 })
      }
      console.log('🎙️  Starting AssemblyAI transcription for episode:', episodeId, episodeTitle)
      console.log('🎵 Audio URL:', audioUrl)
    }

    try {
      const startTime = Date.now()

      // Submit transcription to AssemblyAI
      console.log('🚀 Submitting to AssemblyAI...')
      
      let transcript
      if (audioFile) {
        // Upload file directly to AssemblyAI
        transcript = await client.transcripts.transcribe({
          audio: audioFile,
          language_code: 'en',
        })
      } else {
        // Use URL for podcast episodes
        transcript = await client.transcripts.transcribe({
          audio_url: audioUrl!,
          language_code: 'en',
        })
      }

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`✅ Transcription completed in ${processingTime}s`)
      console.log('📝 Words:', transcript.words?.length || 0)
      console.log('📄 Full text length:', transcript.text?.length || 0, 'characters')
      console.log('⏱️  Audio duration:', transcript.audio_duration, 'seconds')

      // Convert AssemblyAI words to segments format (similar to Whisper)
      // Group words into ~5-second segments for compatibility with existing UI
      const segments = []
      if (transcript.words && transcript.words.length > 0) {
        let currentSegment: { id: number; start: number; end: number; text: string } = {
          id: 0,
          start: transcript.words[0].start / 1000, // Convert ms to seconds
          end: transcript.words[0].end / 1000,
          text: ''
        }
        
        for (let i = 0; i < transcript.words.length; i++) {
          const word = transcript.words[i]
          const wordStart = word.start / 1000
          const wordEnd = word.end / 1000
          
          // Start new segment if we've exceeded 5 seconds or have 50 words
          if ((wordStart - currentSegment.start > 5) || (currentSegment.text.split(' ').length >= 50)) {
            segments.push({ ...currentSegment })
            currentSegment = {
              id: segments.length,
              start: wordStart,
              end: wordEnd,
              text: word.text
            }
          } else {
            currentSegment.text += (currentSegment.text ? ' ' : '') + word.text
            currentSegment.end = wordEnd
          }
        }
        
        // Push final segment
        if (currentSegment.text) {
          segments.push(currentSegment)
        }
      }

      console.log('📦 Created', segments.length, 'segments from', transcript.words?.length || 0, 'words')

      return NextResponse.json({
        message: 'Transcription completed successfully',
        transcript: transcript.text,
        segments: segments,
        duration: transcript.audio_duration || 0,
        language: 'en',
        status: TranscriptionStatus.COMPLETED,
        processingTime: processingTime,
      })

    } catch (transcriptionError) {
      console.error('❌ Transcription error:', transcriptionError)
      
      const errorMessage = transcriptionError instanceof Error 
        ? transcriptionError.message 
        : 'Unknown error during transcription'
      
      // Log the full error for debugging
      if (transcriptionError instanceof Error && transcriptionError.stack) {
        console.error('Stack trace:', transcriptionError.stack)
      }

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
    console.error('❌ Transcribe endpoint error:', error)
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
