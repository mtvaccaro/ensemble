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

CRITICAL: IGNORE ALL ADS AND SPONSORSHIPS
- Skip any segments mentioning sponsors, promo codes, discounts, websites to visit
- Avoid segments that say "brought to you by", "thanks to our sponsor", "use code", etc.
- Skip monotone read advertisement scripts
- Ignore segments promoting products/services unless it's the main topic

Focus ONLY on segments that:
- Have strong hooks or attention-grabbing openings
- Are 30-90 seconds long (ideal for social media)
- Contain complete thoughts that work standalone
- Are emotionally engaging (funny, surprising, insightful, controversial)
- Feature genuine conversation, storytelling, or insights
- Have clear start and end points
- Are substantive content (not filler or transitions)

STRATEGY:
1. Skip the first 2-3 minutes (usually ads/intros)
2. Look for conversational back-and-forth or passionate storytelling
3. Prefer segments with emotion, laughter, or "aha" moments
4. Avoid obvious ad keywords: sponsor, promo, discount, code, visit, check out, link in description
5. Choose clips from different parts of the episode (not all from one section)

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
    
    // Enrich with actual segments and filter out ads
    const suggestions = result.clips
      .map((clip: AIClipSuggestion) => {
        const relevantSegments = segments.filter((s: TranscriptSegment) => 
          s.start >= clip.startTime && s.end <= clip.endTime
        )
        
        const transcript = relevantSegments.map((s: TranscriptSegment) => s.text).join(' ')
        
        return {
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.endTime - clip.startTime,
          title: clip.title,
          reason: clip.reason,
          hookScore: clip.hookScore,
          transcript,
          segments: relevantSegments
        }
      })
      // Safety filter: Remove any clips that still contain ad keywords
      .filter(suggestion => {
        const isAd = isLikelyAd(suggestion.transcript)
        if (isAd) {
          console.log(`🚫 Filtered out ad clip: "${suggestion.title}"`)
        }
        return !isAd
      })

    // Log cost for transparency
    const costInCents = completion.usage ? calculateCost(completion.usage) : 0
    console.log(`✨ AI Clip Analysis completed: ${suggestions.length} clips found (${result.clips.length} total, ${result.clips.length - suggestions.length} filtered as ads). Cost: $${costInCents.toFixed(4)}`)

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

// Safety filter to detect ads that AI might have missed
function isLikelyAd(text: string): boolean {
  const adKeywords = [
    // Direct sponsorship mentions
    'sponsor', 'brought to you by', 'thanks to our sponsor',
    'today\'s episode is brought', 'this episode is sponsored',
    
    // Promo codes and offers
    'promo code', 'discount', 'use code', 'enter code', 'promocode',
    'coupon', 'special offer', 'limited time', 'save 10%', 'save 20%',
    'get 10%', 'get 20%', 'get 30%', 'percent off',
    
    // Call to action
    'visit', 'check out', 'go to', 'head over to', 'head to',
    'link in description', 'link in the show notes',
    'sign up', 'free trial', 'try it free', 'start your free',
    
    // URLs and websites
    'www.', '.com/', '.io/', '.co/',
    'slash', 'forward slash' // as in "visit example.com/podcast"
  ]
  
  const lowerText = text.toLowerCase()
  
  // Check for multiple ad indicators (stronger signal)
  const matchCount = adKeywords.filter(keyword => lowerText.includes(keyword)).length
  
  // If 2+ ad keywords appear, it's definitely an ad
  if (matchCount >= 2) return true
  
  // Single strong keywords
  const strongAdKeywords = ['promo code', 'sponsor', 'brought to you by', 'use code', 'discount']
  if (strongAdKeywords.some(keyword => lowerText.includes(keyword))) return true
  
  return false
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

