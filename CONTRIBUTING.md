# Contributing to Unspool Studio

Thank you for contributing to Unspool Studio! This guide will help you work safely with our production codebase.

## 🚨 Important: We Have Active Users

Unspool Studio is a **production application** with real users. Every merge to `main` goes live immediately on [unspoolstud.io](https://unspoolstud.io). Follow these guidelines carefully.

---

## 🌿 Branch Strategy

### Branch Overview
| Branch | Purpose | Auto-Deploy |
|--------|---------|-------------|
| `main` | Production - stable code only | ✅ unspoolstud.io |
| `staging` | Final QA before production | ✅ staging URL |
| `feature/*` | Development & testing | ✅ Vercel preview |

### Rules
- ❌ **NEVER push directly to `main`**
- ✅ **ALWAYS use feature branches**
- ✅ **Test on Vercel preview first**
- ✅ **Use PR template checklist**

---

## 🚀 Development Workflow

### 1. Starting a New Feature

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit often
git add .
git commit -m "feat: add your feature"

# Push to GitHub
git push origin feature/your-feature-name
```

### 2. Testing Your Changes

1. **Local Testing** (`localhost:3000`)
   ```bash
   npm run dev
   ```
   Test basic functionality

2. **Vercel Preview** (auto-created when you push)
   - Vercel creates: `unspool-xyz-feature-your-feature-name.vercel.app`
   - Test thoroughly on this URL
   - Share with team for feedback

3. **Run Build Check**
   ```bash
   npm run build
   ```
   Ensure no TypeScript/lint errors

### 3. Opening a Pull Request

1. Go to GitHub
2. Open PR from `feature/your-feature-name` → `main`
3. PR template auto-fills
4. **Complete ALL checklist items**
5. Add Vercel preview URL
6. Add screenshots/demo if UI changed

### 4. Merging to Production

- ✅ All PR checks pass
- ✅ Tested on Vercel preview
- ✅ Code reviewed
- ✅ Ready for users

Merge → Auto-deploys to production!

---

## 🔥 Hotfix Workflow (Urgent Bugs)

For critical production bugs only:

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-bug-name

# Fix the issue
git commit -m "hotfix: fix critical bug description"

# Push for quick preview test
git push origin hotfix/critical-bug-name

# Open PR → Fast-track merge to main

# Sync back to staging
git checkout staging
git merge main
git push origin staging
```

---

## 📝 Branch Naming Conventions

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New features | `feature/audio-waveform` |
| `fix/` | Bug fixes | `fix/transcript-search` |
| `hotfix/` | Urgent production fixes | `hotfix/export-crash` |
| `refactor/` | Code refactoring | `refactor/video-export` |
| `docs/` | Documentation | `docs/update-readme` |
| `style/` | UI/styling only | `style/button-spacing` |

---

## 🧪 Testing Checklist

Before merging ANY PR to `main`:

### Functional Tests
- [ ] Feature works as expected
- [ ] No console errors/warnings
- [ ] Core features still work:
  - [ ] Podcast search & subscribe
  - [ ] Episode transcription
  - [ ] Clip creation (word-level selection)
  - [ ] Clip export with waveform
  - [ ] Reel creation and export
  - [ ] File upload & transcription

### Code Quality
- [ ] `npm run build` passes with no errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No unused imports/variables

### UI/UX (if applicable)
- [ ] Responsive on mobile
- [ ] Accessible (keyboard nav, WCAG colors)
- [ ] Loading states work
- [ ] Error states handled gracefully

### Performance
- [ ] No new performance regressions
- [ ] Canvas dragging is smooth
- [ ] Audio playback responsive

---

## 🆘 Rollback Process

If something breaks in production:

### Method 1: Git Revert
```bash
git checkout main
git revert HEAD  # or specific commit SHA
git push origin main
```

### Method 2: Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Deployments**
3. Find the last working deployment
4. Click **"Promote to Production"**

This is the fastest way to restore service!

---

## 📊 Monitoring & Debugging

### PostHog Analytics
We use PostHog to track:
- User behavior
- Error rates
- Feature usage
- Performance metrics

Check PostHog after deploying major features.

### Vercel Logs
- Real-time logs in Vercel Dashboard
- Check for errors after deployment
- Monitor build times

### Environment Variables
Required for production:
- `ASSEMBLYAI_API_KEY` - Transcription
- `OPENAI_API_KEY` - AI clip suggestions

⚠️ If adding new env vars, update in Vercel for all environments!

---

## 🔒 Security & API Keys

- **NEVER commit API keys to code**
- Always use `.env.local` (gitignored)
- Store in Vercel environment variables
- Use separate keys for dev/staging/prod (when possible)

---

## 💬 Communication

### Before Starting Major Work
- Discuss architecture with the team
- Check if someone else is working on it
- Break into smaller PRs when possible

### PR Best Practices
- Write clear descriptions
- Link to related issues
- Add screenshots/videos for UI changes
- Respond to review feedback promptly
- Keep PRs focused and small

---

## 🎯 Code Standards

### TypeScript
- Use proper types (avoid `any`)
- Define interfaces for data structures
- Use `const` over `let` when possible

### React
- Use functional components + hooks
- Memoize expensive calculations (`useMemo`)
- Clean up effects properly
- Keep components focused and small

### PostHog Events
- Use enum for event names (don't hardcode strings)
- Use enum for custom properties
- Check with team before adding new events
- Maintain naming consistency

### Feature Flags
- Use minimal number of flag checks
- Centralize flag names in enum
- Gate on valid expected values
- Document flag purpose

---

## 📚 Helpful Resources

- **Project Docs**: See `CLAUDE.md` for architecture
- **Setup**: See `SETUP_INSTRUCTIONS.md`
- **Transcription**: See `TRANSCRIPTION_QUICKSTART.md`
- **Video Export**: See `VIDEO_EXPORT.md`

---

## ❓ Questions?

If you're unsure about anything:
1. Check existing code for patterns
2. Review this guide and `CLAUDE.md`
3. Ask the team before proceeding
4. When in doubt, use a feature branch and get feedback!

---

**Remember: Production stability is our #1 priority. When in doubt, test more! 🚀**

