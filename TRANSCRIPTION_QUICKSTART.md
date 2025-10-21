# Transcription Quick Start Guide

Get up and running with OpenAI Whisper transcription in 3 minutes. **No auth, no database, no Supabase!**

## Quick Setup

### 1. Install Dependencies (30 seconds)

```bash
npm install
```

### 2. Add API Key (1 minute)

Your OpenAI API key is already in `.env.local` ✅

### 3. Start Using It! (1 minute)

**That's it!** The transcription API is now ready. Everything works with localStorage - no database setup needed.

## How It Works

1. **Client-side Storage**: Transcripts are saved in your browser's localStorage
2. **OpenAI Whisper**: API call happens on the server, transcript returned to client
3. **No Auth Required**: Anyone can use it - perfect for MVP development

## Add to Your UI

### Option 1: Use the Pre-built Component (Easiest)

```tsx
import { TranscriptionButton } from '@/components/episodes/transcription-button'

<TranscriptionButton
  episodeId={episode.id}
  episodeTitle={episode.title}
  audioUrl={episode.audio_url}
  initialStatus={episode.transcription_status}
  initialTranscript={episode.transcript}
/>
```

### Option 2: Use the Hook

```tsx
import { useTranscription } from '@/lib/use-transcription'

const { status, transcript, startTranscription } = useTranscription(episodeId)

<button onClick={() => startTranscription({ 
  audioUrl: episode.audio_url,
  title: episode.title 
})}>
  Transcribe
</button>
```

### Option 3: Call the API Directly

```tsx
const response = await fetch(`/api/episodes/${episodeId}/transcribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    audioUrl: episode.audio_url,
    title: episode.title 
  })
})
const data = await response.json()
console.log(data.transcript)

// Save to localStorage
import { storage } from '@/lib/localStorage'
storage.setTranscript(episodeId, data.transcript)
```

## localStorage API

Check status and transcripts:

```tsx
import { storage } from '@/lib/localStorage'

// Get transcript
const transcript = storage.getTranscript(episodeId)
console.log(transcript?.status) // 'completed', 'in_progress', etc.
console.log(transcript?.transcript) // Full text

// Update status
storage.setTranscriptStatus(episodeId, 'in_progress')

// Save completed transcript
storage.setTranscript(episodeId, 'Full transcript text...', 'completed')
```

## Common Issues

### ❌ "OpenAI API error"
- Check your API key in `.env.local`
- Verify you have credits at https://platform.openai.com/usage

### ❌ "Audio file is too large"
- Whisper API limit is 25 MB
- Consider compressing or splitting large files

### ❌ Transcription stuck at "in_progress"
Reset it in your browser console:
```js
storage.setTranscriptStatus('episode-id', 'not_started')
```

### ❌ Lost transcripts after browser refresh
- localStorage is per-browser and per-domain
- Transcripts should persist automatically
- Check browser's localStorage in DevTools → Application → Local Storage

## Cost Calculator

At $0.006 per minute:

- 10 minutes = $0.06
- 30 minutes = $0.18
- 60 minutes = $0.36
- 100 episodes (avg 45 min) = $27.00

## What's Different (No Database Mode)

✅ **No auth required** - anyone can transcribe  
✅ **No database setup** - everything in localStorage  
✅ **Instant setup** - just add API key and go  
✅ **Perfect for MVP** - build features fast  

⚠️ **Limitations**:
- Transcripts stored per-browser (not synced)
- ~5-10MB localStorage limit (plenty for text)
- No multi-user support

## Key Files

```
app/api/episodes/[id]/transcribe/route.ts  # API endpoint (no auth!)
components/episodes/transcription-button.tsx  # UI component
lib/use-transcription.ts                   # React hook
lib/localStorage.ts                        # Storage utilities
lib/transcription-utils.ts                 # Helper functions
types/index.ts                             # TranscriptionStatus enum
```

## Testing

Test in your browser:

1. Start your dev server: `npm run dev`
2. Go to a podcast episode page
3. Click "Transcribe Episode"
4. Wait for completion
5. Check localStorage in DevTools

Or test with fetch:

```js
// In browser console
const episodeId = 'your-episode-id'
const audioUrl = 'https://example.com/episode.mp3'

fetch(`/api/episodes/${episodeId}/transcribe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audioUrl, title: 'Test Episode' })
})
  .then(r => r.json())
  .then(data => console.log('Transcript:', data.transcript))
```

## Next Steps

Consider adding:
- [ ] Batch transcription UI
- [ ] Export transcripts (PDF, TXT)
- [ ] Search within transcripts
- [ ] Transcript editing
- [ ] Cost tracking dashboard

## Migration to Production

When ready for production with a database:

1. Set up your backend (Supabase, Firebase, etc.)
2. Replace `storage.setTranscript()` calls with API calls
3. Keep localStorage as fallback for offline mode
4. Done!

The code is designed to make this transition easy.

## Support

- **OpenAI Docs:** https://platform.openai.com/docs/guides/speech-to-text
- **Check logs:** Look in your terminal/console for errors
- **localStorage Debug:** DevTools → Application → Local Storage → http://localhost:3000
