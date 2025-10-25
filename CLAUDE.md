# Unspool Studio Development Progress

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

⚠️ **PRODUCTION APP WITH ACTIVE USERS** - Follow these workflows strictly!

### Branch Structure
- **`main`** → Production (unspoolstud.io) - STABLE ONLY
- **`staging`** → Staging environment for final testing before production
- **`feature/*`** → Feature branches with Vercel preview deployments

### Version Control Rules
1. **NEVER push directly to `main`** - Users depend on it!
2. **ALWAYS create a feature branch** for any changes
3. **Test on Vercel preview** before merging
4. **Merge to `staging`** first for final QA (optional)
5. **Merge to `main`** only when fully tested

### Feature Branch Naming
- `feature/new-feature-name` - New features
- `fix/bug-description` - Bug fixes
- `hotfix/critical-issue` - Urgent production fixes
- `refactor/what-changed` - Code refactoring
- `docs/update-name` - Documentation

### Standard Feature Workflow
```bash
# 1. Start new feature from main
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 2. Work on feature, commit often
git add .
git commit -m "feat: add new feature"

# 3. Push to GitHub
git push origin feature/new-feature

# 4. Vercel auto-creates preview: unspool-abc123-feature-new-feature.vercel.app
# 5. Test thoroughly on preview URL
# 6. Open PR using the template (checks all boxes)
# 7. Review PR, verify tests pass
# 8. Merge to main → auto-deploys to production
```

### Staging Environment Workflow (for major changes)
```bash
# 1. Create feature branch as usual
git checkout -b feature/major-change

# 2. Test on Vercel preview
# 3. Merge to staging first
git checkout staging
git merge feature/major-change
git push origin staging

# 4. Test on staging deployment
# 5. If stable, merge staging → main
git checkout main
git merge staging
git push origin main
```

### Hotfix Workflow (urgent production bugs)
⚠️ **CRITICAL: Even "urgent" hotfixes MUST be tested on preview before merging to main!**

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# 2. Fix the issue
git commit -m "hotfix: fix critical bug"

# 3. Push to GitHub (Vercel auto-creates preview)
git push origin hotfix/critical-bug

# 4. ⚠️ TEST ON PREVIEW URL FIRST - DO NOT SKIP THIS!
#    Wait for preview deployment: unspool-git-hotfix-critical-bug-...vercel.app
#    Verify the fix works and doesn't break anything

# 5. ONLY AFTER TESTING: Merge to main
git checkout main
git merge hotfix/critical-bug --no-ff -m "Merge hotfix: ..."
git push origin main

# 6. Merge back to staging to keep in sync
git checkout staging
git merge main
git push origin staging
```

**NO EXCEPTIONS:** All code changes require preview testing, even hotfixes!

### Testing Checklist (Required before merging to main)
- ✅ Tested on Vercel preview URL
- ✅ No console errors/warnings
- ✅ Core features work (search, transcribe, clip, export)
- ✅ No TypeScript/lint errors (`npm run build`)
- ✅ Mobile responsive (if UI changes)
- ✅ PR template checklist completed

### Rollback Plan (if production breaks)
```bash
# Option 1: Git revert
git revert HEAD
git push origin main

# Option 2: Vercel Dashboard
# Deployments → Find last working deployment → "Promote to Production"
```

### Development Tools
- **Local**: `localhost:3000` - Initial development
- **Preview**: Vercel auto-preview - Feature testing
- **Staging**: `staging` branch - Final QA (optional)
- **Production**: `main` branch → unspoolstud.io - Live users