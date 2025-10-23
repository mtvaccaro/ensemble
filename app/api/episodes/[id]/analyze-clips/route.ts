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
  topicRelevance: string
  transcriptText: string // EXACT text GPT claims is at this timestamp - validates it actually read the content
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: episodeId } = await params
  
  try {
    const { transcript, segments, maxSuggestions = 3, episodeTitle, episodeDescription } = await request.json()

    if (!transcript || !segments) {
      return NextResponse.json(
        { error: 'Transcript and segments required' },
        { status: 400 }
      )
    }

    console.log(`Analyzing episode ${episodeId} for ${maxSuggestions} clip suggestions...`)
    console.log(`📝 Transcript: ${segments.length} segments, ~${Math.round(transcript.length / 4)} tokens`)
    if (episodeTitle) console.log(`📌 Title: "${episodeTitle}"`)
    if (episodeDescription) console.log(`📄 Description: "${episodeDescription.substring(0, 100)}${episodeDescription.length > 100 ? '...' : ''}"`)
    
    // Log samples of transcript for debugging
    console.log(`\n🔍 Transcript Samples:`)
    console.log(`  First 30s: "${segments.filter((s: TranscriptSegment) => s.start < 30).map((s: TranscriptSegment) => s.text).join(' ').substring(0, 150)}..."`)
    const midPoint = segments[Math.floor(segments.length / 2)]
    console.log(`  Middle (~${Math.floor(midPoint.start / 60)}m): "${segments.filter((s: TranscriptSegment) => Math.abs(s.start - midPoint.start) < 15).map((s: TranscriptSegment) => s.text).join(' ').substring(0, 150)}..."`)
    const lastSegments = segments.slice(-5)
    console.log(`  Last 30s: "${lastSegments.map((s: TranscriptSegment) => s.text).join(' ').substring(0, 150)}..."`)

    // Build prompt for GPT
    const systemPrompt = `You are an expert podcast clip editor specializing in viral social media content. Analyze this transcript and identify the ${maxSuggestions} BEST moments that would explode on TikTok, Instagram Reels, and YouTube Shorts.

CRITICAL TWO-STEP PROCESS:

STEP 1: IDENTIFY THE CORE TOPIC
You will be given:
- Episode Title: Clear indication of the topic
- Episode Description: Summary of what the episode covers
- Full Transcript: The actual conversation

Use ALL THREE to determine:
- What is this episode actually about? (the main theme/topic)
- What are the hosts genuinely discussing and passionate about?
- What insights, stories, or debates form the core content?
- The title/description are your ANCHOR - clips must relate to these themes

STEP 2: SELECT ON-TOPIC CLIPS ONLY
Then, ONLY consider clips that are:
- Directly related to the episode's main topic
- Part of the authentic conversation about that topic
- Contributing to the episode's core narrative or insights

WHY THIS MATTERS - FILTERING ADS AUTOMATICALLY:
Ads are almost always OFF-TOPIC from the episode's main theme:
- Episode about investing? Ad for BetterHelp (mental health) = OFF-TOPIC
- Episode about AI? Ad for Athletic Greens (nutrition) = OFF-TOPIC
- Episode about marketing? Ad for Squarespace (web hosting) = OFF-TOPIC

Even if ads sound engaging, they're promoting products/services UNRELATED to what the episode is actually about.

AUTHENTIC CONTENT is ON-TOPIC:
- Episode about investing → Clips about market strategies, personal losses, investment insights
- Episode about AI → Clips about AI breakthroughs, ethical concerns, future predictions
- Episode about business → Clips about entrepreneurship, failures, growth strategies

The topic creates a natural filter: ads talk about DIFFERENT things than the episode's core content.

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

EXAMPLES - TOPIC-BASED FILTERING:

SCENARIO: Financial podcast episode about market crashes
❌ BAD CLIP (OFF-TOPIC):
"This episode is brought to you by BetterHelp. Taking care of your mental health is just as important as your financial health..."
WHY BAD: This is about therapy/mental health, NOT about market crashes. It's OFF-TOPIC = likely an ad.

✅ GOOD CLIP (ON-TOPIC):
"I lost $2 million in the 2008 crash. And you know what I learned? When everyone's panicking and selling, that's exactly when you should be buying. The opposite of what your gut tells you."
WHY GOOD: Directly about market crashes (the episode topic). Personal story + investment insight.

SCENARIO: Tech podcast about AI
❌ BAD CLIP (OFF-TOPIC):
"Before we continue, let me tell you about Shopify. Building an online store has never been easier. You can launch your business today at shopify.com/tech..."
WHY BAD: This is about e-commerce platforms, NOT about AI. It's OFF-TOPIC = likely an ad.

✅ GOOD CLIP (ON-TOPIC):
"GPT-4 is scary not because it's smart, but because it's convincingly wrong. It'll give you confident, well-written answers that are completely false. That's the real danger."
WHY GOOD: Directly about AI (the episode topic). Counterintuitive insight about AI risks.

THE PATTERN: If it's not about the episode's core topic, it's probably an ad. Skip it.

SELECTION STRATEGY:
1. **First**: Read ENTIRE transcript and identify the episode's core topic/theme
2. **Then**: Only consider clips that are deeply connected to that topic
3. Prioritize clips with HIGH hook scores (8-10/10) that are ON-TOPIC
4. Choose clips from DIFFERENT parts of episode (temporal diversity)
5. Mix content types (story + insight + quote + debate) - all about the SAME topic
6. Ensure each clip has a different "flavor" but stays on-theme
7. Clips should be 30-90 seconds long (ideal for social media)
8. **Key filter**: If it's not about the episode's main topic, skip it (probably an ad)

Return a JSON object with the episode topic and ${maxSuggestions} ON-TOPIC clips:
{
  "episodeTopic": "<what is this episode actually about? 1-2 sentences>",
  "clips": [
    {
      "startTime": <seconds - where clip begins>,
      "endTime": <seconds - where clip ends, MUST be 30-90 seconds AFTER startTime>,
      "title": "<catchy 5-8 word title>",
      "reason": "<one sentence why this will go viral>",
      "hookScore": <1-10: how attention-grabbing is the opening>,
      "viralPotential": <1-10: overall shareability>,
      "contentType": "<story|insight|quote|debate|funny>",
      "topicRelevance": "<how this clip relates to the episode's main topic>",
      "transcriptText": "<MUST INCLUDE: Copy the EXACT transcript text from startTime to endTime, word-for-word from the transcript provided.>"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Each clip MUST be 30-90 seconds long (endTime minus startTime = 30-90)
2. You MUST include "transcriptText" with the EXACT words between startTime and endTime
3. Copy the transcript text verbatim - proves you read the actual content
4. DO NOT return clips with startTime = endTime (0 second clips are invalid)

Base timestamps on the segment timing provided. Be precise with times.`

    // Build user message with metadata context
    let userMessage = `EPISODE METADATA:\n`
    if (episodeTitle) {
      userMessage += `Title: "${episodeTitle}"\n`
    }
    if (episodeDescription) {
      userMessage += `Description: ${episodeDescription}\n`
    }
    userMessage += `\nFULL TRANSCRIPT WITH TIMESTAMPS:\n\n${formatTranscriptWithTimestamps(segments)}\n\n`
    userMessage += `Remember: Pick clips that are DIRECTLY related to the topics mentioned in the title/description above. If a segment talks about something completely different, it's likely an ad.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper model, still excellent for this task
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{"clips": []}') as { episodeTopic?: string; clips: AIClipSuggestion[] }
    
    // Log what AI selected for debugging
    console.log(`\n📊 AI Analysis:`)
    if (result.episodeTopic) {
      console.log(`🎯 Identified Topic: "${result.episodeTopic}"`)
    }
    console.log(`\n📹 Clip Selections:`)
    result.clips.forEach((clip, i) => {
      const mins = Math.floor(clip.startTime / 60)
      const secs = Math.floor(clip.startTime % 60)
      const duration = clip.endTime - clip.startTime
      
      // Validate clip duration
      if (duration <= 0) {
        console.log(`\n❌ INVALID Clip ${i + 1}: "${clip.title}"`)
        console.log(`  🚨 ERROR: startTime (${clip.startTime}s) and endTime (${clip.endTime}s) are the same or invalid!`)
        console.log(`  🤖 GPT claimed this text: "${clip.transcriptText.substring(0, 150)}..."`)
        console.log(`  ⚠️  This clip will be SKIPPED - GPT needs to return proper time ranges`)
        return
      }
      
      // Get the actual transcript text for this clip
      const clipSegments = segments.filter((s: TranscriptSegment) => 
        s.start >= clip.startTime && s.end <= clip.endTime
      )
      const actualText = clipSegments.map((s: TranscriptSegment) => s.text).join(' ')
      
      console.log(`\nClip ${i + 1}: "${clip.title}"`)
      console.log(`  ⏱️  Time: ${mins}:${secs.toString().padStart(2, '0')} - ${formatTime(clip.endTime)} (${duration.toFixed(0)}s)`)
      console.log(`  🎯 Hook: ${clip.hookScore}/10 | Viral: ${clip.viralPotential}/10 | Type: ${clip.contentType}`)
      console.log(`  💡 Why: ${clip.reason}`)
      console.log(`  🔗 Topic Link: ${clip.topicRelevance}`)
      console.log(`  🤖 GPT CLAIMS TEXT IS: "${clip.transcriptText.substring(0, 150)}${clip.transcriptText.length > 150 ? '...' : ''}"`)
      console.log(`  📝 ACTUAL TEXT IS: "${actualText.substring(0, 150)}${actualText.length > 150 ? '...' : ''}"`)
      
      if (!actualText || actualText.trim().length === 0) {
        console.log(`  ⚠️  WARNING: No transcript found at these timestamps! GPT may have wrong times.`)
      } else if (actualText.toLowerCase().trim() !== clip.transcriptText.toLowerCase().trim()) {
        console.log(`  ⚠️  WARNING: GPT's text doesn't match actual transcript! GPT may be hallucinating.`)
      }
      
      // Check if GPT's own claimed text looks like an ad
      if (isLikelyAd(clip.transcriptText)) {
        console.log(`  🚨 GPT's CLAIMED TEXT contains ad language!`)
      }
    })
    
    // Enrich with actual segments - search for GPT's claimed text instead of trusting timestamps
    const suggestions = result.clips
      .map((clip: AIClipSuggestion) => {
        console.log(`\n🔍 Searching for clip: "${clip.title}"`)
        console.log(`   GPT claimed timestamps: ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`)
        console.log(`   Searching for text: "${clip.transcriptText.substring(0, 100)}..."`)
        
        // Try to find where GPT's claimed text actually appears in the transcript
        const found = findTextInTranscript(clip.transcriptText, segments)
        
        if (!found) {
          console.log(`   ❌ Could not find this text in transcript - skipping clip`)
          return null
        }
        
        console.log(`   ✅ Found at: ${formatTime(found.startTime)} - ${formatTime(found.endTime)}`)
        
        if (Math.abs(found.startTime - clip.startTime) > 30) {
          console.log(`   ⚠️  Corrected GPT's timestamps by ${Math.abs(found.startTime - clip.startTime).toFixed(0)}s!`)
        }
        
        const transcript = found.segments.map((s: TranscriptSegment) => s.text).join(' ')
        
        return {
          startTime: found.startTime,
          endTime: found.endTime,
          duration: found.endTime - found.startTime,
          title: clip.title,
          reason: clip.reason,
          hookScore: clip.hookScore,
          viralPotential: clip.viralPotential,
          contentType: clip.contentType,
          transcript,
          segments: found.segments
        }
      })
      .filter((clip): clip is NonNullable<typeof clip> => clip !== null)
      // Safety filter: Remove any clips that still contain ad keywords
      .filter(suggestion => {
        const isAd = isLikelyAd(suggestion.transcript)
        if (isAd) {
          console.log(`\n🚫 FILTERED AS AD: "${suggestion.title}"`)
          console.log(`   Text: "${suggestion.transcript.substring(0, 150)}..."`)
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

// Search for GPT's claimed text in the actual transcript and return correct timestamps
function findTextInTranscript(searchText: string, segments: TranscriptSegment[]): { startTime: number; endTime: number; segments: TranscriptSegment[] } | null {
  // Clean the search text for comparison
  const cleanSearch = searchText.toLowerCase().trim()
  
  // Try to find the text across consecutive segments
  for (let i = 0; i < segments.length; i++) {
    let combinedText = ''
    const matchingSegments: TranscriptSegment[] = []
    
    // Look ahead to combine segments
    for (let j = i; j < segments.length && j < i + 50; j++) {
      combinedText += ' ' + segments[j].text
      matchingSegments.push(segments[j])
      
      const cleanCombined = combinedText.toLowerCase().trim()
      
      // Check if we found the text (allow some flexibility with partial matches)
      if (cleanCombined.includes(cleanSearch.substring(0, Math.min(50, cleanSearch.length)))) {
        // Found it! Return the time range
        return {
          startTime: matchingSegments[0].start,
          endTime: matchingSegments[matchingSegments.length - 1].end,
          segments: matchingSegments
        }
      }
    }
  }
  
  return null
}

// Safety filter to detect obvious ads (generic patterns only)
function isLikelyAd(text: string): boolean {
  const lowerText = text.toLowerCase()
  
  // Strong ad indicators (single match = ad)
  const strongIndicators = [
    'promo code',
    'discount code', 
    'use code',
    'enter code',
    'brought to you by',
    'thanks to our sponsor',
    'this episode is sponsored'
  ]
  
  if (strongIndicators.some(phrase => lowerText.includes(phrase))) {
    return true
  }
  
  // Weaker indicators (need 2+ to confirm)
  const weakIndicators = [
    'sponsor',
    'discount',
    'coupon',
    'special offer',
    'percent off',
    'free trial',
    '.com/',
    'www.',
  ]
  
  const matchCount = weakIndicators.filter(keyword => lowerText.includes(keyword)).length
  
  return matchCount >= 2
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

