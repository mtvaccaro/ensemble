# Ensemble Development Progress

## Project Overview
Podcast clip generation web tool - Transform podcasts into viral clips with AI transcription.

## Current Architecture: localStorage Mode (No Backend!)

**We're building an MVP using browser localStorage - NO auth, NO database, NO Supabase required!**

This allows rapid feature development without backend complexity. When ready for production, we'll migrate localStorage calls to API calls.

## Current Status: Step 4 - Transcription ✅ (IN PROGRESS)

### ✅ Completed (Steps 1-3)
- **Project Setup**: Next.js 15 + TypeScript + Tailwind
- **localStorage Utility**: Full data persistence in browser
- **Podcast Search & Subscribe**: Complete UI with iTunes API + localStorage
- **Episode Management**: RSS parsing, playback UI
- **Deployment**: Working at localhost with full UI functionality

### 🎯 Step 3 Implementation Details (COMPLETED)
- ✅ API routes: `/api/podcasts/*` (search, subscribe, unsubscribe)
- ✅ Podcast search interface with tabbed navigation
- ✅ RSS parsing and episode counting
- ✅ Subscription management (add/remove podcasts)
- ✅ Demo mode with mock data (while waiting for Podcast Index API approval)
- ✅ Dual route structure: `/podcasts` (demo) + `/dashboard/podcasts` (authenticated)
- ✅ Fixed all authentication context errors and route conflicts

### ⏸️ WAITING FOR: Podcast Index API Read/Write Credentials
- User has requested API access but waiting for approval
- Demo mode fully functional with mock podcast data
- Ready to swap in real API once credentials arrive

### 🔄 Current Phase: Ready for Step 4 - Episode Management & Transcription
**Next Cursor Prompt #4:**
```
Implement episode listing, audio playback, OpenAI Whisper transcription, and episode management features
```

### 📋 Remaining Steps (4-5)
4. Episode Management & Transcription (OpenAI Whisper API)
5. Clip Generation & Video Export (FFmpeg + Canvas)

## Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Storage**: Browser localStorage (no backend for MVP!)
- **Podcast Data**: iTunes API + RSS parsing
- **AI**: OpenAI Whisper (transcription)
- **Deployment**: Vercel / localhost
- **Budget**: Pay-as-you-go (OpenAI Whisper only)

## Key Architecture Decisions
- Using Podcast Index API (free) + RSS parsing instead of paid podcast APIs
- Batch transcription to minimize costs
- Static waveform animations (not real-time)
- Freemium model with premium AI features

## Directory Structure (FIXED!)
- Clean single directory: `/Users/mattvaccaro/Documents/clipper/`
- No more nested clipper/clipper/ confusion

## Development Workflow & Git Best Practices

### Version Control Rules
1. **NEVER push directly to `main`**
2. **ALWAYS create a dev branch** for new features:
   ```bash
   git checkout -b feature/feature-name
   ```
3. **Work on the branch** until feature is complete and tested
4. **Open a PR** and review before merging to main
5. **Keep main stable** - only merge working, tested code

### Feature Branch Naming
- `feature/transcription` - New features
- `fix/audio-playback` - Bug fixes
- `refactor/remove-supabase` - Code refactoring
- `docs/update-readme` - Documentation

### Workflow Example
```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/transcription

# Work on feature, commit often
git add .
git commit -m "Add OpenAI Whisper integration"

# Push and open PR when ready
git push origin feature/transcription
# Then open PR on GitHub/GitLab
```

### Development Tools
- Claude (planning/architecture) + Cursor (implementation)
- Test locally at localhost:3000
- No deployment needed for localStorage mode