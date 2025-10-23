import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TranscriptSegment } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface AIClipSuggestion {
  title: string
  reason: string
  hookScore: number
  viralPotential: number
  contentType: 'story' | 'insight' | 'quote' | 'debate' | 'funny'
  topicRelevance: string
  transcriptText: string // FULL clip text (30-120s) - we search for this to find timestamps
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
      "title": "<catchy 5-8 word title>",
      "reason": "<one sentence why this will go viral>",
      "hookScore": <1-10: how attention-grabbing is the opening>,
      "viralPotential": <1-10: overall shareability>,
      "contentType": "<story|insight|quote|debate|funny>",
      "topicRelevance": "<how this clip relates to the episode's main topic>",
      "transcriptText": "<CRITICAL: Copy the COMPLETE clip text word-for-word from the transcript. Include 30-120 seconds worth of text - not just 1-2 sentences! This FULL text is how we locate the clip.>"
    }
  ]
}

CRITICAL REQUIREMENTS FOR transcriptText:
1. **MUST be 30-120 seconds of transcript text** - not a snippet or sample!
2. Copy word-for-word from the transcript timestamps you're providing
3. Include the ENTIRE clip from start to finish
4. This full text is used to search the transcript and find exact boundaries
5. DO NOT summarize or paraphrase - copy verbatim

Example GOOD transcriptText (60+ seconds):
"If you think about what happens during stock market crashes, like in 2008, everyone typically loses money because stocks are going down. But what trend following can do is if stocks are going down, they start betting that stocks will keep going down. So they're actually making money during the crash while everyone else is losing. That's what makes it such a powerful strategy in volatile markets..."

Example BAD transcriptText (too short):
"If you think about what happens during stock market crashes..." ← NOT ENOUGH!

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
      console.log(`\nClip ${i + 1}: "${clip.title}"`)
      console.log(`  🎯 Hook: ${clip.hookScore}/10 | Viral: ${clip.viralPotential}/10 | Type: ${clip.contentType}`)
      console.log(`  💡 Why: ${clip.reason}`)
      console.log(`  🔗 Topic Link: ${clip.topicRelevance}`)
      console.log(`  📝 Text length: ${clip.transcriptText.length} chars (~${Math.round(clip.transcriptText.split(/\s+/).length / 3)} seconds if spoken)`)
      
      // Check if GPT's claimed text looks like an ad
      if (isLikelyAd(clip.transcriptText)) {
        console.log(`  🚨 WARNING: Text contains ad language!`)
      }
    })
    
    // Search for each clip's text in the transcript to find exact timestamps
    const suggestions = result.clips
      .map((clip: AIClipSuggestion) => {
        console.log(`\n🔍 Searching for clip: "${clip.title}"`)
        console.log(`   Text to find: "${clip.transcriptText.substring(0, 100)}..."`)
        
        // Find where this text actually appears in the transcript
        const found = findTextInTranscript(clip.transcriptText, segments)
        
        if (!found) {
          console.log(`   ❌ Could not find this text in transcript - skipping clip`)
          return null
        }
        
        const duration = found.endTime - found.startTime
        console.log(`   ✅ Found at: ${formatTime(found.startTime)} - ${formatTime(found.endTime)} (${duration.toFixed(0)}s)`)
        
        // Validate duration (hard cap at 2 minutes)
        if (duration > 120) {
          console.log(`   ⚠️  Clip is ${duration.toFixed(0)}s - trimming to 2 minutes max`)
          // Trim segments to 2 minutes
          const maxEndTime = found.startTime + 120
          const trimmedSegments = found.segments.filter(s => s.end <= maxEndTime)
          const transcript = trimmedSegments.map((s: TranscriptSegment) => s.text).join(' ')
          
          return {
            startTime: found.startTime,
            endTime: trimmedSegments[trimmedSegments.length - 1].end,
            duration: trimmedSegments[trimmedSegments.length - 1].end - found.startTime,
            title: clip.title,
            reason: clip.reason,
            hookScore: clip.hookScore,
            viralPotential: clip.viralPotential,
            contentType: clip.contentType,
            transcript,
            segments: trimmedSegments
          }
        }
        
        const transcript = found.segments.map((s: TranscriptSegment) => s.text).join(' ')
        
        return {
          startTime: found.startTime,
          endTime: found.endTime,
          duration,
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
  // Clean the search text for comparison (remove extra whitespace but keep structure)
  const cleanSearch = searchText.toLowerCase().replace(/\s+/g, ' ').trim()
  
  // We need at least 100 chars to have a meaningful search
  if (cleanSearch.length < 100) {
    console.log(`   ⚠️  Search text too short (${cleanSearch.length} chars) - need at least 100`)
    return null
  }
  
  // Try to find the text across consecutive segments
  for (let i = 0; i < segments.length; i++) {
    let combinedText = ''
    const matchingSegments: TranscriptSegment[] = []
    
    // Look ahead to combine segments (up to 100 segments = ~5 minutes of speech)
    for (let j = i; j < segments.length && j < i + 100; j++) {
      combinedText += ' ' + segments[j].text
      matchingSegments.push(segments[j])
      
      const cleanCombined = combinedText.toLowerCase().replace(/\s+/g, ' ').trim()
      
      // Check if we've accumulated enough text to contain the search string
      // Use at least 70% of the search text to match (allow some transcription variance)
      const searchPrefix = cleanSearch.substring(0, Math.floor(cleanSearch.length * 0.7))
      
      if (cleanCombined.includes(searchPrefix)) {
        // Found it! Now find where exactly it starts and ends
        const matchIndex = cleanCombined.indexOf(searchPrefix)
        
        // Count how many characters we need to skip to reach the match
        let charCount = 0
        let startSegmentIndex = 0
        
        for (let k = 0; k < matchingSegments.length; k++) {
          const segmentLength = matchingSegments[k].text.length + 1 // +1 for space
          if (charCount + segmentLength > matchIndex) {
            startSegmentIndex = k
            break
          }
          charCount += segmentLength
        }
        
        // Now figure out how many segments we actually need for the full quote
        // Estimate: ~3 words per second, ~5 chars per word = 15 chars/second
        const estimatedDuration = cleanSearch.length / 15
        const estimatedSegments = Math.ceil(estimatedDuration / 2) // ~2 second segments
        const endSegmentIndex = Math.min(
          matchingSegments.length - 1,
          startSegmentIndex + Math.max(estimatedSegments, 10) // At least 10 segments (~20s minimum)
        )
        
        const finalSegments = matchingSegments.slice(startSegmentIndex, endSegmentIndex + 1)
        
        if (finalSegments.length === 0) {
          continue // Skip this match
        }
        
        return {
          startTime: finalSegments[0].start,
          endTime: finalSegments[finalSegments.length - 1].end,
          segments: finalSegments
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

