# Clipper Setup Instructions

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Supabase (for full functionality):**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project or use existing one
   - Go to Settings → API
   - Copy your Project URL and anon key
   - Update `.env.local` with your credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
     ```

3. **Set up the database:**
   - In Supabase Dashboard, go to SQL Editor
   - Copy and paste the contents of `database/schema.sql`
   - Click "Run" to create tables and policies

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Test the workflow:**
   - Visit `http://localhost:3000`
   - Sign up for an account
   - Search for podcasts
   - Subscribe to a podcast
   - Click "View Episodes" to see the episode list
   - Test audio playback

## Demo Mode

If you don't configure Supabase credentials, the app will run in demo mode:
- Access `/podcasts` without authentication
- See mock podcast data
- Test UI functionality
- Dashboard redirects to public podcasts page

## Features Implemented

✅ **Podcast Search** - iTunes API integration
✅ **Podcast Subscription** - Add/remove podcasts
✅ **Episode Listing** - View episodes from RSS feeds
✅ **Audio Player** - Play/pause episodes
✅ **Authentication** - Supabase Auth integration
✅ **Database** - PostgreSQL with RLS policies

## Next Steps

The app is ready for Step 4 of the development plan:
- Episode transcription (OpenAI Whisper)
- Clip generation and editing
- Video export functionality
