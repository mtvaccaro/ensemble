# Transcription Setup with OpenAI Whisper

This document explains how to use the OpenAI Whisper API integration for podcast episode transcription.

## Prerequisites

1. An OpenAI API account with access to the Whisper API
2. Node.js and npm installed
3. Supabase database set up

## Setup Instructions

### 1. Install Dependencies

Run the following command to install the OpenAI SDK:

```bash
npm install
```

The `openai` package has been added to your `package.json`.

### 2. Configure Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist) and add your OpenAI API key:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Your existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important:** Never commit your `.env.local` file to version control. It should already be in your `.gitignore`.

### 3. Update Database Schema

#### For New Databases

If you're setting up a fresh database, run the main schema file:

```bash
# In Supabase SQL Editor, run:
database/schema.sql
```

This will create all tables including the new `transcription_status` and `transcription_error` columns.

#### For Existing Databases

If you already have a database with episodes, run the migration:

```bash
# In Supabase SQL Editor, run:
database/migrations/add_transcription_status.sql
```

This will add the transcription columns without losing existing data.

## Usage

### API Endpoints

#### Start Transcription

```
POST /api/episodes/{episode_id}/transcribe
```

Initiates transcription for an episode. Returns the transcript when complete.

**Response:**
```json
{
  "message": "Transcription completed successfully",
  "transcript": "Full transcript text...",
  "status": "completed"
}
```

#### Check Transcription Status

```
GET /api/episodes/{episode_id}/transcribe
```

Checks the current transcription status for an episode.

**Response:**
```json
{
  "status": "in_progress",
  "hasTranscript": false,
  "error": null
}
```

### Using in Your Frontend

#### Option 1: Using the React Hook

```typescript
import { useTranscription } from '@/lib/use-transcription'

function MyComponent({ episodeId }) {
  const { status, transcript, startTranscription, isLoading } = useTranscription(episodeId)

  return (
    <div>
      <button onClick={startTranscription} disabled={isLoading}>
        {isLoading ? 'Transcribing...' : 'Start Transcription'}
      </button>
      {transcript && <p>{transcript}</p>}
    </div>
  )
}
```

#### Option 2: Using the Transcription Button Component

```typescript
import { TranscriptionButton } from '@/components/episodes/transcription-button'

function EpisodePage({ episode }) {
  return (
    <div>
      <h1>{episode.title}</h1>
      <TranscriptionButton
        episodeId={episode.id}
        episodeTitle={episode.title}
        initialStatus={episode.transcription_status}
        initialTranscript={episode.transcript}
        onTranscriptionComplete={(transcript) => {
          console.log('Transcription complete!', transcript)
        }}
      />
    </div>
  )
}
```

## Transcription Status Values

The `transcription_status` field can have the following values:

- `not_started` - Transcription has not been initiated
- `in_progress` - Transcription is currently being processed
- `completed` - Transcription completed successfully
- `failed` - Transcription failed (check `transcription_error` for details)

## Limitations

### OpenAI Whisper API Constraints

- **File Size:** Maximum 25 MB per file
- **Format:** Supports mp3, mp4, mpeg, mpga, m4a, wav, and webm
- **Language:** Currently set to English ('en') but can be configured

### Handling Large Files

For files larger than 25 MB, you'll need to:

1. Split the audio file into smaller chunks
2. Transcribe each chunk separately
3. Combine the results

Consider implementing a chunking strategy or using a background job queue for very large files.

## Cost Considerations

OpenAI Whisper API pricing (as of 2025):
- $0.006 per minute of audio

**Example costs:**
- 30-minute episode = $0.18
- 60-minute episode = $0.36
- 100 episodes (60 min avg) = $36.00

Always monitor your OpenAI usage dashboard.

## Error Handling

Common errors and solutions:

1. **"Audio file is too large"**
   - The file exceeds 25 MB
   - Solution: Implement audio chunking or compression

2. **"Failed to download audio file"**
   - The audio_url might be invalid or inaccessible
   - Check that the URL is publicly accessible

3. **"OpenAI API error"**
   - Check your API key is valid
   - Verify you have credits/quota available
   - Check OpenAI status page for outages

## Monitoring

Monitor transcription status in your database:

```sql
-- Check transcription progress
SELECT 
  transcription_status,
  COUNT(*) as count
FROM episodes
GROUP BY transcription_status;

-- Find failed transcriptions
SELECT id, title, transcription_error
FROM episodes
WHERE transcription_status = 'failed';
```

## Advanced Configuration

### Customizing Language

Edit `app/api/episodes/[id]/transcribe/route.ts`:

```typescript
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'es', // Change to Spanish, for example
  response_format: 'text',
})
```

### Getting Timestamps

Change `response_format` to `'verbose_json'` for word-level timestamps:

```typescript
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'verbose_json', // Returns detailed timing
})
```

## Troubleshooting

### Transcription stuck at "in_progress"

If a transcription gets stuck:

1. Check your server logs for errors
2. Manually reset the status in the database:

```sql
UPDATE episodes
SET transcription_status = 'not_started',
    transcription_error = NULL
WHERE id = 'episode-id-here';
```

### Testing the API

Test with cURL:

```bash
# Start transcription
curl -X POST http://localhost:3000/api/episodes/{episode-id}/transcribe \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie"

# Check status
curl http://localhost:3000/api/episodes/{episode-id}/transcribe \
  -H "Cookie: your-auth-cookie"
```

## Next Steps

Consider implementing:

1. **Batch Transcription:** Transcribe multiple episodes at once
2. **Background Jobs:** Use a queue system for long-running transcriptions
3. **Caching:** Cache transcripts in a CDN for faster access
4. **Search:** Index transcripts for full-text search across episodes
5. **AI Features:** Use transcripts for summarization, chapter detection, etc.

## Support

For issues related to:
- **OpenAI API:** Check [OpenAI documentation](https://platform.openai.com/docs)
- **Whisper specifics:** See [Whisper API guide](https://platform.openai.com/docs/guides/speech-to-text)
- **This implementation:** Check the code comments in `app/api/episodes/[id]/transcribe/route.ts`

