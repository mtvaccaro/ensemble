import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TranscriptSegment } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AIClipSuggestion {
  startTime: number
  endTime: number
  title: string
  reason: string
  hookScore: number
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: episodeId } = await params
  
  try {
    const { transcript, segments, maxSuggestions = 3 } = await request.json()

    if (!transcript || !segments) {
      return NextResponse.json(
        { error: 'Transcript and segments required' },
        { status: 400 }
      )
    }

    console.log(`Analyzing episode ${episodeId} for ${maxSuggestions} clip suggestions...`)

    // Build prompt for GPT
    const systemPrompt = `You are an expert podcast clip editor. Analyze this transcript and identify the ${maxSuggestions} BEST moments that would make viral social media clips.

Focus on segments that:
- Have strong hooks or attention-grabbing openings
- Are 30-90 seconds long (ideal for social media)
- Contain complete thoughts that work standalone
- Are emotionally engaging (funny, surprising, insightful)
- Have clear start and end points

Return EXACTLY ${maxSuggestions} clips as a JSON object with this structure:
{
  "clips": [
    {
      "startTime": <seconds>,
      "endTime": <seconds>,
      "title": "<catchy 5-8 word title>",
      "reason": "<one sentence why this is compelling>",
      "hookScore": <1-10 rating>
    }
  ]
}

Base timestamps on the segment timing provided. Be precise with times.`

    const userMessage = `Transcript with segments:\n\n${formatTranscriptWithTimestamps(segments)}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper model, still excellent for this task
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{"clips": []}') as { clips: AIClipSuggestion[] }
    
    // Enrich with actual segments
    const suggestions = result.clips.map((clip: AIClipSuggestion) => {
      const relevantSegments = segments.filter((s: TranscriptSegment) => 
        s.start >= clip.startTime && s.end <= clip.endTime
      )
      
      return {
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        title: clip.title,
        reason: clip.reason,
        hookScore: clip.hookScore,
        transcript: relevantSegments.map((s: TranscriptSegment) => s.text).join(' '),
        segments: relevantSegments
      }
    })

    // Log cost for transparency
    const costInCents = completion.usage ? calculateCost(completion.usage) : 0
    console.log(`✨ AI Clip Analysis completed: ${suggestions.length} clips found. Cost: $${costInCents.toFixed(4)}`)

    return NextResponse.json({
      suggestions,
      usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      costInCents
    })

  } catch (error) {
    console.error('AI clip analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze clips' },
      { status: 500 }
    )
  }
}

// Helper to format transcript with timestamps for better AI analysis
function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  return segments
    .map(s => `[${formatTime(s.start)} - ${formatTime(s.end)}] ${s.text}`)
    .join('\n')
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function calculateCost(usage: { prompt_tokens: number; completion_tokens: number }): number {
  // GPT-4o-mini pricing (Oct 2025)
  const inputCostPer1M = 0.15
  const outputCostPer1M = 0.60
  
  const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPer1M
  const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPer1M
  
  return inputCost + outputCost
}

