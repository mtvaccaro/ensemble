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
  viralPotential: number
  contentType: 'story' | 'insight' | 'quote' | 'debate' | 'funny'
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
    console.log(`📝 Transcript: ${segments.length} segments, ~${Math.round(transcript.length / 4)} tokens`)

    // Build prompt for GPT
    const systemPrompt = `You are an expert podcast clip editor specializing in viral social media content. Analyze this transcript and identify the ${maxSuggestions} BEST moments that would explode on TikTok, Instagram Reels, and YouTube Shorts.

CRITICAL: DISTINGUISH ADS FROM VIRAL CONTENT
Ads are designed to grab attention but DON'T make good clips because:
- They're promotional (selling something), not authentic content
- They mention sponsors, promo codes, discounts, websites
- They break the natural conversation flow
- They often sound scripted/rehearsed vs genuine

RED FLAGS FOR ADS:
- "Brought to you by", "thanks to our sponsor", "use code", "promo", "discount"
- Mentions of websites, URLs, or "link in description"
- Product pitches or service promotions
- Scripted, monotone delivery (not conversational)

INSTEAD, look for GENUINE conversation where:
- Hosts are speaking naturally and passionately
- Ideas flow organically (not selling anything)
- Emotion is authentic (laughter, surprise, vulnerability)
- Insights come from personal experience, not marketing copy

VIRAL CONTENT PATTERNS TO LOOK FOR:
1. **Strong Hooks (First 3 Seconds)**
   - Questions that make you stop scrolling: "What if I told you..."
   - Shocking statements: "This completely changed my mind about..."
   - Pattern interrupts: "Everyone gets this wrong..."
   - Controversial takes: "Unpopular opinion..."

2. **Story Structure**
   - Mini-stories with setup, conflict, payoff
   - "I learned this the hard way..." moments
   - Before/after transformations
   - Unexpected plot twists

3. **Quote-Worthy Moments**
   - One-liners that could be tweet-worthy
   - Memorable analogies or metaphors
   - Wisdom bombs that make you pause
   - Hot takes that spark debate

4. **Emotional Resonance**
   - Vulnerable/authentic moments (not performative)
   - Genuine laughter or surprise
   - Relatable struggles or failures
   - "I thought I was the only one..." feelings

5. **Knowledge Bombs**
   - Counterintuitive insights: "Actually, the opposite is true..."
   - Myth-busting: "Everyone thinks X, but really..."
   - Expert secrets: "Here's what insiders know..."
   - Simplified complex ideas

AVOID THESE RED FLAGS:
❌ Slow burn-in (takes >5 seconds to get interesting)
❌ Requires too much context to understand
❌ Inside jokes or niche references
❌ Meandering tangents without payoff
❌ Low energy or monotone delivery
❌ Generic advice ("work hard, stay focused")
❌ Name-dropping without substance
❌ Mid-sentence starts or awkward cuts

CONTENT QUALITY CHECKLIST:
- Can someone understand this clip WITHOUT hearing the rest of the episode?
- Does it hook you in the first 3 seconds?
- Does it make you feel something (laugh, think, get angry)?
- Would someone share this with a friend?
- Does it have a clear beginning and end?
- Is the idea/story complete in one clip?

EVALUATION CRITERIA (Rate each clip 1-10):
- Hook Strength: First 3 seconds grab attention
- Standalone Value: Makes sense without context
- Shareability: Would someone send this to a friend
- Emotional Impact: Makes you feel something
- Replay Value: Worth watching multiple times

EXAMPLES TO LEARN FROM:

❌ BAD CLIP (Even if attention-grabbing):
"This episode is brought to you by BetterHelp. Mental health is important, and BetterHelp makes therapy accessible. Visit betterhelp.com/podcast for 10% off..."
WHY BAD: It's an ad! Promotional, scripted, selling something. Not authentic content.

✅ GOOD CLIP:
"I lost everything. $2 million gone in 48 hours. And you know what the worst part was? I had to call my wife and tell her we were broke. That conversation... that was when I learned what really matters."
WHY GOOD: Authentic story, emotional, relatable struggle, complete narrative arc.

❌ BAD CLIP (Sounds engaging but isn't):
"Now I want to tell you about this amazing tool we've been using. It's called Notion, and it's completely changed how we organize our work. You can try it free at notion.com..."
WHY BAD: Product pitch disguised as content. Still promotional.

✅ GOOD CLIP:
"Everyone says 'follow your passion.' That's terrible advice. I followed my passion for 5 years and almost went bankrupt. What actually worked? Following the market, THEN developing passion for what pays."
WHY GOOD: Counterintuitive insight, challenges common wisdom, based on experience.

SELECTION STRATEGY:
1. Read the ENTIRE transcript before choosing
2. Prioritize clips with HIGH hook scores (8-10/10) from GENUINE content
3. Choose clips from DIFFERENT parts of episode (temporal diversity)
4. Mix content types (story + insight + quote + debate)
5. Ensure each clip has a different "flavor" (don't pick 3 similar moments)
6. Look throughout the episode - great content can be anywhere
7. Clips should be 30-90 seconds long (ideal for social media)
8. When in doubt: Is this authentic conversation or promotional content?

Return EXACTLY ${maxSuggestions} clips as a JSON object with this structure:
{
  "clips": [
    {
      "startTime": <seconds>,
      "endTime": <seconds>,
      "title": "<catchy 5-8 word title>",
      "reason": "<one sentence why this will go viral>",
      "hookScore": <1-10: how attention-grabbing is the opening>,
      "viralPotential": <1-10: overall shareability>,
      "contentType": "<story|insight|quote|debate|funny>"
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
    
    // Log what AI selected for debugging
    console.log(`\n📊 AI Selection Details:`)
    result.clips.forEach((clip, i) => {
      const mins = Math.floor(clip.startTime / 60)
      const secs = Math.floor(clip.startTime % 60)
      console.log(`\nClip ${i + 1}: "${clip.title}"`)
      console.log(`  ⏱️  Time: ${mins}:${secs.toString().padStart(2, '0')} - ${formatTime(clip.endTime)} (${(clip.endTime - clip.startTime).toFixed(0)}s)`)
      console.log(`  🎯 Hook: ${clip.hookScore}/10 | Viral: ${clip.viralPotential}/10 | Type: ${clip.contentType}`)
      console.log(`  💡 Why: ${clip.reason}`)
    })
    
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
          viralPotential: clip.viralPotential,
          contentType: clip.contentType,
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

