// Client-side video generation using Mediabunny
// Runs entirely in the browser - no server needed!

import { 
  Output, 
  Mp4OutputFormat, 
  BufferTarget,
  CanvasSource,
  AudioBufferSource
} from 'mediabunny'

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
}

export interface ClipExportData {
  title: string
  audioUrl: string
  imageUrl?: string
  startTime: number
  endTime: number
  duration: number
  segments?: TranscriptSegment[]
}

export interface VideoExportOptions {
  width?: number
  height?: number
  frameRate?: number
  videoBitrate?: number
  includeCaptions?: boolean
  includeWaveform?: boolean
}

const DEFAULT_OPTIONS: Required<VideoExportOptions> = {
  width: 1080,
  height: 1080,
  frameRate: 30,
  videoBitrate: 5000000, // 5 Mbps - high quality for 1080x1080
  includeCaptions: false,
  includeWaveform: true
}

/**
 * Export a single clip as MP4 video
 */
export async function exportClipToVideo(
  clip: ClipExportData,
  onProgress?: (progress: number) => void,
  exportOptions?: Partial<VideoExportOptions>
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS, ...exportOptions }
  
  onProgress?.(0.1) // Starting

  try {
    // Load and prepare the image
    const imageUrl = clip.imageUrl || await createDefaultImage()
    const canvas = await createCanvasWithImage(imageUrl, options.width, options.height)
    
    onProgress?.(0.3) // Image loaded
    
    // Load audio
    const audioBuffer = await fetchAudioSegment(clip.audioUrl, clip.startTime, clip.endTime)
    
    onProgress?.(0.5) // Audio loaded
    
    // Create output
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    })
    
    // Add video track (static image)
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc', // H.264
      bitrate: options.videoBitrate,
    })
    output.addVideoTrack(videoSource)
    
    // Add audio track and keep reference
    let audioSource: AudioBufferSource | null = null
    if (audioBuffer) {
      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: 192000 // 192 kbps
      })
      output.addAudioTrack(audioSource)
    }
    
    onProgress?.(0.7) // Tracks configured
    
    // Generate video
    await output.start()
    
    // Add audio buffer to source
    if (audioBuffer && audioSource) {
      await audioSource.add(audioBuffer)
    }
    
    // Calculate number of frames needed
    const durationSeconds = clip.duration
    const totalFrames = Math.ceil(durationSeconds * options.frameRate)
    const frameDuration = 1 / options.frameRate
    
    // Prepare caption segments relative to clip start time
    const captionSegments = options.includeCaptions && clip.segments
      ? clip.segments.map(seg => ({
          ...seg,
          start: seg.start - clip.startTime,
          end: seg.end - clip.startTime
        })).filter(seg => seg.start < durationSeconds && seg.end > 0)
      : []
    
    // Store original canvas image data for redrawing
    const ctx = canvas.getContext('2d')
    const originalImageData = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null
    
    // Extract waveform data if enabled
    const waveformData = options.includeWaveform && audioBuffer 
      ? extractWaveformData(audioBuffer)
      : null
    
    // Add video frames with captions and waveform
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameDuration
      
      // Restore original image (to clear previous frame's captions/waveform)
      if ((options.includeCaptions || options.includeWaveform) && ctx && originalImageData) {
        ctx.putImageData(originalImageData, 0, 0)
        
        // Draw waveform bars
        if (options.includeWaveform && waveformData) {
          drawWaveformBars(ctx, waveformData, timestamp, durationSeconds, options.width, options.height)
        }
        
        // Find active caption for this timestamp
        if (options.includeCaptions) {
          const activeSegment = captionSegments.find(seg => 
            timestamp >= seg.start && timestamp < seg.end
          )
          
          if (activeSegment) {
            drawCaptionOnCanvas(ctx, activeSegment.text, options.width, options.height)
          }
        }
      }
      
      await videoSource.add(timestamp, frameDuration)
      
      if (i % 10 === 0) {
        const progress = 0.7 + (0.25 * (i / totalFrames))
        onProgress?.(progress)
      }
    }
    
    await output.finalize()
    
    onProgress?.(1.0) // Complete
    
    // Get the final video buffer
    const buffer = (output.target as BufferTarget).buffer
    if (!buffer) {
      throw new Error('Failed to generate video buffer')
    }
    return new Blob([buffer], { type: 'video/mp4' })
    
  } catch (error) {
    console.error('Video export error:', error)
    throw new Error(`Failed to export video: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Export multiple clips as a single concatenated reel
 */
export async function exportReelToVideo(
  clips: ClipExportData[],
  onProgress?: (progress: number) => void,
  exportOptions?: Partial<VideoExportOptions>
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS, ...exportOptions }
  
  if (clips.length === 0) {
    throw new Error('No clips provided')
  }
  
  onProgress?.(0.05)
  
  try {
    // Use first clip's image for the entire reel
    const imageUrl = clips[0].imageUrl || await createDefaultImage()
    const canvas = await createCanvasWithImage(imageUrl, options.width, options.height)
    
    onProgress?.(0.15)
    
    // Load all audio segments
    const audioBuffers: AudioBuffer[] = []
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i]
      const buffer = await fetchAudioSegment(clip.audioUrl, clip.startTime, clip.endTime)
      if (buffer) {
        audioBuffers.push(buffer)
      }
      const progress = 0.15 + (0.3 * ((i + 1) / clips.length))
      onProgress?.(progress)
    }
    
    // Concatenate audio buffers
    const concatenatedAudio = concatenateAudioBuffers(audioBuffers)
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
    
    onProgress?.(0.5)
    
    // Create output
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    })
    
    // Add video track
    const videoSource = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: options.videoBitrate,
    })
    output.addVideoTrack(videoSource)
    
    // Add concatenated audio and keep reference
    let audioSource: AudioBufferSource | null = null
    if (concatenatedAudio) {
      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: 192000
      })
      output.addAudioTrack(audioSource)
    }
    
    onProgress?.(0.6)
    
    await output.start()
    
    // Add audio buffer to source
    if (concatenatedAudio && audioSource) {
      await audioSource.add(concatenatedAudio)
    }
    
    // Calculate total frames needed
    const totalFrames = Math.ceil(totalDuration * options.frameRate)
    const frameDuration = 1 / options.frameRate
    
    // Build concatenated caption timeline if enabled
    const captionSegments: Array<{ start: number; end: number; text: string }> = []
    if (options.includeCaptions) {
      let timeOffset = 0
      for (const clip of clips) {
        if (clip.segments) {
          const clipSegments = clip.segments.map(seg => ({
            start: (seg.start - clip.startTime) + timeOffset,
            end: (seg.end - clip.startTime) + timeOffset,
            text: seg.text
          })).filter(seg => seg.start >= 0 && seg.end <= timeOffset + clip.duration)
          
          captionSegments.push(...clipSegments)
        }
        timeOffset += clip.duration
      }
    }
    
    // Store original canvas image data for redrawing
    const ctx = canvas.getContext('2d')
    const originalImageData = ctx ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null
    
    // Extract waveform data if enabled
    const waveformData = options.includeWaveform && concatenatedAudio 
      ? extractWaveformData(concatenatedAudio)
      : null
    
    // Add video frames with captions and waveform
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameDuration
      
      // Restore original image (to clear previous frame's captions/waveform)
      if ((options.includeCaptions || options.includeWaveform) && ctx && originalImageData) {
        ctx.putImageData(originalImageData, 0, 0)
        
        // Draw waveform bars
        if (options.includeWaveform && waveformData) {
          drawWaveformBars(ctx, waveformData, timestamp, totalDuration, options.width, options.height)
        }
        
        // Find active caption for this timestamp
        if (options.includeCaptions) {
          const activeSegment = captionSegments.find(seg => 
            timestamp >= seg.start && timestamp < seg.end
          )
          
          if (activeSegment) {
            drawCaptionOnCanvas(ctx, activeSegment.text, options.width, options.height)
          }
        }
      }
      
      await videoSource.add(timestamp, frameDuration)
      if (i % 10 === 0) {
        const progress = 0.6 + (0.35 * (i / totalFrames))
        onProgress?.(progress)
      }
    }
    
    await output.finalize()
    
    onProgress?.(1.0)
    
    const buffer = (output.target as BufferTarget).buffer
    if (!buffer) {
      throw new Error('Failed to generate video buffer')
    }
    return new Blob([buffer], { type: 'video/mp4' })
    
  } catch (error) {
    console.error('Reel export error:', error)
    throw new Error(`Failed to export reel: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a canvas with the image drawn on it
 */
async function createCanvasWithImage(
  imageUrl: string, 
  width: number, 
  height: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  try {
    // Proxy image through our API to bypass CORS restrictions
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    const response = await fetch(proxyUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    
    // Load image from object URL
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to decode image'))
      image.src = objectUrl
    })
    
    // Clean up object URL
    URL.revokeObjectURL(objectUrl)
    
    // Draw image centered and scaled to fit
    const scale = Math.min(width / img.width, height / img.height)
    const x = (width - img.width * scale) / 2
    const y = (height - img.height * scale) / 2
    
    // Fill background with black
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
    
    // Draw scaled image
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
    
    return canvas
  } catch (error) {
    console.warn('Failed to load image, using default:', error)
    // Fall back to black background if image fails
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
    
    // Add some text to indicate it's a placeholder
    ctx.fillStyle = '#333333'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎙️', width / 2, height / 2)
    
    return canvas
  }
}

/**
 * Fetch audio segment from URL and trim to specified time range
 */
async function fetchAudioSegment(
  audioUrl: string,
  startTime: number,
  endTime: number
): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new AudioContext()
    const fullAudioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Calculate sample positions
    const sampleRate = fullAudioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const duration = endSample - startSample
    
    // Create trimmed buffer
    const trimmedBuffer = audioContext.createBuffer(
      fullAudioBuffer.numberOfChannels,
      duration,
      sampleRate
    )
    
    // Copy trimmed audio data
    for (let channel = 0; channel < fullAudioBuffer.numberOfChannels; channel++) {
      const sourceData = fullAudioBuffer.getChannelData(channel)
      const trimmedData = trimmedBuffer.getChannelData(channel)
      
      for (let i = 0; i < duration; i++) {
        trimmedData[i] = sourceData[startSample + i]
      }
    }
    
    await audioContext.close()
    return trimmedBuffer
    
  } catch (error) {
    console.error('Error fetching/trimming audio:', error)
    return null
  }
}

/**
 * Concatenate multiple audio buffers into one
 */
function concatenateAudioBuffers(buffers: AudioBuffer[]): AudioBuffer | null {
  if (buffers.length === 0) return null
  if (buffers.length === 1) return buffers[0]
  
  const sampleRate = buffers[0].sampleRate
  const numberOfChannels = buffers[0].numberOfChannels
  
  // Calculate total length
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0)
  
  // Create new buffer
  const audioContext = new AudioContext({ sampleRate })
  const concatenated = audioContext.createBuffer(
    numberOfChannels,
    totalLength,
    sampleRate
  )
  
  // Copy all buffers
  let offset = 0
  for (const buffer of buffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel)
      const destData = concatenated.getChannelData(channel)
      destData.set(sourceData, offset)
    }
    offset += buffer.length
  }
  
  return concatenated
}

/**
 * Create a default black square image as data URL
 */
async function createDefaultImage(): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 1080, 1080)
  }
  
  return canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * Extract amplitude data from audio buffer for waveform visualization
 * Returns an array of amplitude values normalized to 0-1
 */
function extractWaveformData(audioBuffer: AudioBuffer, numBars: number = 32): number[] {
  const channelData = audioBuffer.getChannelData(0) // Use first channel (mono or left channel)
  const samples = channelData.length
  const samplesPerBar = Math.floor(samples / numBars)
  const amplitudes: number[] = []
  
  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar
    const end = start + samplesPerBar
    let sum = 0
    
    // Calculate RMS (Root Mean Square) for this segment
    for (let j = start; j < end && j < samples; j++) {
      sum += channelData[j] * channelData[j]
    }
    
    const rms = Math.sqrt(sum / samplesPerBar)
    // Normalize and apply some gain for better visibility
    const normalized = Math.min(1, rms * 5)
    amplitudes.push(normalized)
  }
  
  return amplitudes
}

/**
 * Draw reactive waveform bars on canvas
 */
function drawWaveformBars(
  ctx: CanvasRenderingContext2D,
  waveformData: number[],
  timestamp: number,
  duration: number,
  width: number,
  height: number
): void {
  ctx.save()
  
  const numBars = waveformData.length
  const barWidth = Math.floor(width / numBars * 0.7) // 70% width with gaps
  const gap = Math.floor(width / numBars * 0.3) // 30% gap
  const maxBarHeight = height * 0.25 // Bars can take up 25% of height
  const baseY = height - (height * 0.08) // Position near bottom
  const minBarHeight = 4 // Minimum visible height
  
  // Calculate which bars should be active based on playback progress
  const progress = timestamp / duration
  const activeBarIndex = Math.floor(progress * numBars)
  
  for (let i = 0; i < numBars; i++) {
    const amplitude = waveformData[i]
    const x = i * (barWidth + gap) + gap / 2
    
    // Smooth animation: bars ahead of playhead are dimmed
    let barHeight: number
    let opacity: number
    
    if (i <= activeBarIndex) {
      // Active bar - full height based on amplitude
      barHeight = Math.max(minBarHeight, amplitude * maxBarHeight)
      opacity = 0.9
    } else if (i === activeBarIndex + 1) {
      // Next bar - slight preview
      barHeight = Math.max(minBarHeight, amplitude * maxBarHeight * 0.3)
      opacity = 0.3
    } else {
      // Future bars - minimal height
      barHeight = minBarHeight
      opacity = 0.2
    }
    
    // Add some bounce effect for active bars
    if (i === activeBarIndex) {
      const bounce = 1 + Math.sin(timestamp * 8) * 0.1 // Subtle pulse
      barHeight *= bounce
    }
    
    // Draw bar with gradient
    const gradient = ctx.createLinearGradient(x, baseY, x, baseY - barHeight)
    gradient.addColorStop(0, `rgba(249, 115, 22, ${opacity})`) // Orange base
    gradient.addColorStop(1, `rgba(251, 146, 60, ${opacity})`) // Lighter orange top
    
    ctx.fillStyle = gradient
    ctx.fillRect(
      x,
      baseY - barHeight,
      barWidth,
      barHeight
    )
    
    // Add subtle glow for active bars
    if (i <= activeBarIndex) {
      ctx.shadowColor = 'rgba(249, 115, 22, 0.5)'
      ctx.shadowBlur = 8
      ctx.fillRect(x, baseY - barHeight, barWidth, barHeight)
      ctx.shadowBlur = 0
    }
  }
  
  ctx.restore()
}

/**
 * Draw caption text on canvas with subtitle styling
 */
function drawCaptionOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number
): void {
  // Save current state
  ctx.save()
  
  // Caption styling
  const fontSize = Math.floor(width * 0.045) // ~48px for 1080x1080
  const padding = Math.floor(width * 0.04) // ~43px for 1080x1080
  const lineHeight = fontSize * 1.3
  const maxWidth = width - (padding * 2)
  const bottomMargin = Math.floor(height * 0.12) // ~130px for 1080x1080
  
  // Set font
  ctx.font = `bold ${fontSize}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  
  // Word wrap
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]
  
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i]
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth) {
      lines.push(currentLine)
      currentLine = words[i]
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine)
  
  // Limit to 2 lines max
  const displayLines = lines.slice(-2)
  
  // Draw each line from bottom up
  let y = height - bottomMargin
  
  for (let i = displayLines.length - 1; i >= 0; i--) {
    const line = displayLines[i]
    const x = width / 2
    
    // Draw background/shadow for readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.lineWidth = Math.floor(fontSize * 0.25)
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.strokeText(line, x, y)
    
    // Draw text
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(line, x, y)
    
    y -= lineHeight
  }
  
  // Restore state
  ctx.restore()
}

/**
 * Check if browser supports WebCodecs (required for Mediabunny)
 */
export function isWebCodecsSupported(): boolean {
  return 'VideoEncoder' in window && 'VideoDecoder' in window
}

/**
 * Sanitize filename for download
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .substring(0, 50)
}

