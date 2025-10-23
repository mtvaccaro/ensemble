# MP4 Video Export with Mediabunny

## Overview
The video export feature generates MP4 videos from podcast clips entirely in the browser using [Mediabunny](https://github.com/Vanilagy/mediabunny), a pure TypeScript media toolkit. Videos are optimized for LinkedIn posts (1080x1080 square format).

## Why Mediabunny?

### ✅ Advantages Over FFmpeg
- **100% Client-Side**: No server infrastructure needed - aligns perfectly with localStorage MVP approach
- **Zero Deployment Complexity**: No FFmpeg binary installation required on servers
- **No Server Costs**: All processing happens in the user's browser
- **Fast & Private**: No upload/download round trips, data stays local
- **Hardware Accelerated**: Uses WebCodecs API for fast encoding
- **Tree-Shakable**: Only ~5 kB gzipped when properly bundled

### Browser Support
Requires **WebCodecs API** support:
- ✅ Chrome 94+ (September 2021)
- ✅ Edge 94+ (September 2021)
- ✅ Safari 16.4+ (March 2023)
- ✅ Opera 80+ (October 2021)
- ❌ Firefox (not yet supported, but planned)

The export UI automatically detects browser support and shows a warning if WebCodecs is unavailable.

## Features

✅ **MP4 Export** - Exports clips as video files  
✅ **LinkedIn Optimized** - 1080x1080 square format  
✅ **Podcast Artwork** - Uses podcast image as video background  
✅ **Individual or Reel** - Export single clips or concatenate multiple  
✅ **Audio Trimming** - Precise start/end time trimming  
✅ **Progress Tracking** - Real-time progress indicators  
✅ **Browser Detection** - Warns users if WebCodecs not supported  

## Video Specifications

- **Format**: MP4 (H.264 video codec, AAC audio codec)
- **Dimensions**: 1080x1080 pixels (square)
- **Frame Rate**: 30 fps
- **Audio Bitrate**: 192 kbps
- **Video Codec**: AVC (H.264)
- **Compatibility**: Works on all major platforms (LinkedIn, Instagram, Twitter, etc.)

## Implementation

### Core Files

1. **lib/video-export.ts** - Client-side video generation utilities
   - `exportClipToVideo()` - Export single clip
   - `exportReelToVideo()` - Export concatenated reel
   - `isWebCodecsSupported()` - Browser capability detection

2. **components/canvas/export-panel-content.tsx** - Export UI in right panel
3. **components/canvas/export-modal.tsx** - Export modal dialog

### How It Works

#### Individual Clip Export
1. Load podcast artwork into canvas
2. Fetch and trim audio from episode URL
3. Create MP4 output with Mediabunny
4. Add video track (static image as frames)
5. Add audio track (trimmed segment)
6. Generate video and trigger download

#### Reel Export
1. Use first clip's artwork for entire reel
2. Fetch and trim audio for all clips
3. Concatenate audio buffers
4. Create MP4 with combined audio
5. Generate appropriate number of frames
6. Download final video

### Technical Details

```typescript
// Example usage
import { exportClipToVideo } from '@/lib/video-export'

const clip = {
  title: "My Clip",
  audioUrl: "https://...",
  imageUrl: "https://...",
  startTime: 60.5,
  endTime: 120.3,
  duration: 59.8
}

const videoBlob = await exportClipToVideo(clip, (progress) => {
  console.log(`Export progress: ${progress * 100}%`)
})

// Download the video
const url = URL.createObjectURL(videoBlob)
const a = document.createElement('a')
a.href = url
a.download = 'my-clip.mp4'
a.click()
```

## Usage

1. Create clips from transcribed episodes in the canvas
2. Select clips to export
3. Click "Export" in the right panel or modal
4. Choose "Individual" or "Reel" export type
5. Click "Export as MP4"
6. Video generates in browser and downloads automatically

## Performance Considerations

### Memory Usage
- Each clip's audio is loaded into memory
- Large clips (>10 minutes) may use significant RAM
- Reels concatenate all audio - watch total duration

### Processing Time
- **Individual clip (1 min)**: ~5-15 seconds
- **Reel (5 mins)**: ~30-60 seconds
- Depends on user's device hardware
- Uses hardware acceleration when available

### Recommended Limits
- **Individual clips**: Up to 10 minutes
- **Reels**: Up to 15 minutes total
- **Number of clips in reel**: Up to 10 clips

## Troubleshooting

### Browser Not Supported
**Error**: "Browser Not Supported" warning appears

**Solution**: Use a modern browser:
- Update Chrome/Edge to version 94+
- Update Safari to version 16.4+
- Firefox not yet supported - use Chrome/Edge instead

### Audio Download Fails
**Error**: "Failed to fetch audio segment"

**Possible causes**:
- CORS restrictions on podcast audio URL
- Network connectivity issues
- Invalid audio URL

**Solutions**:
- Check browser console for CORS errors
- Verify audio URL is accessible
- Try a different podcast/episode

### Image Not Loading
**Error**: "Failed to load image"

**Solutions**:
- Image URL must be accessible
- CORS must allow cross-origin access
- Falls back to black square if unavailable

### Export Takes Too Long
**Issue**: Video generation is slow

**Solutions**:
- Keep clips under 5 minutes for individual export
- Limit reels to 10 minutes total
- Close other browser tabs to free RAM
- Use a faster device with hardware acceleration
- Check if browser is throttling due to battery saver

### Out of Memory
**Error**: Page crashes or freezes during export

**Solutions**:
- Reduce clip duration
- Export clips individually instead of as reel
- Close other tabs/applications
- Increase browser memory limit (in browser settings)

## Comparison: Mediabunny vs FFmpeg

| Feature | Mediabunny (Client) | FFmpeg (Server) |
|---------|-------------------|-----------------|
| Infrastructure | None needed | Requires server + FFmpeg binary |
| Deployment | Simple - just deploy frontend | Complex - manage FFmpeg installation |
| Costs | $0 (uses user's device) | Server compute costs |
| Processing Speed | Depends on user's device | Consistent (server hardware) |
| File Size Limits | Browser memory (~2GB) | Server disk space |
| Privacy | 100% local, no upload | Files sent to server |
| Browser Support | Modern browsers only | Works everywhere |
| MVP Philosophy | ✅ Perfect fit | ❌ Adds complexity |

## Future Enhancements

- [ ] Multiple format options (vertical, horizontal, 16:9)
- [ ] Custom dimensions for different platforms (Instagram Stories, TikTok)
- [ ] Batch export all clips simultaneously
- [ ] Custom backgrounds and branding overlays
- [ ] Text overlays from transcripts (subtitles)
- [ ] Animated waveforms
- [ ] Quality presets (low/medium/high)
- [ ] Resume interrupted exports
- [ ] Background export with service workers
- [ ] Progressive download for large files
- [ ] Export queue management

## LinkedIn Best Practices

LinkedIn video recommendations:
- ✅ **Square format (1080x1080)** - We use this!
- Max file size: 5GB (plenty of headroom)
- Max duration: 10 minutes
- Recommended duration: 30-60 seconds for best engagement
- Add captions for accessibility (use transcript in description)
- Include hooks in first 3 seconds
- Post natively to LinkedIn (don't just share links)

## Testing

To test the export feature:

1. Start the dev server: `npm run dev`
2. Subscribe to a podcast
3. Open an episode and transcribe it (requires OpenAI API key)
4. Create one or more clips from the transcript
5. Click "Export" in the right panel
6. Try both individual and reel exports
7. Verify MP4 files download and play correctly

## Development

The video export system is modular and extensible:

```typescript
// lib/video-export.ts - Core export logic
export async function exportClipToVideo(
  clip: ClipExportData,
  onProgress?: (progress: number) => void
): Promise<Blob>

export async function exportReelToVideo(
  clips: ClipExportData[],
  onProgress?: (progress: number) => void
): Promise<Blob>

// Helper functions
function createCanvasWithImage()
function fetchAudioSegment()
function concatenateAudioBuffers()
```

To add new export formats or features, extend the `lib/video-export.ts` module.

## Fallback Strategy (Future)

If needed, you could implement a hybrid approach:

```typescript
if (isWebCodecsSupported()) {
  // Use Mediabunny (client-side)
  await exportClipToVideo(clip)
} else {
  // Fall back to server-side FFmpeg API
  await fetch('/api/clips/export', { ... })
}
```

This would provide the best user experience (client-side) for 95% of users while still supporting older browsers through a server-side fallback.

## Resources

- [Mediabunny GitHub](https://github.com/Vanilagy/mediabunny)
- [Mediabunny Documentation](https://mediabunny.dev/)
- [WebCodecs API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Can I Use WebCodecs](https://caniuse.com/webcodecs)

---

**Need Help?** Check the troubleshooting section above or open an issue with details about your browser, clip duration, and any error messages.

