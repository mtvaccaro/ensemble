// Client-side video generation using Mediabunny
// Runs entirely in the browser - no server needed!

import { 
  Output, 
  Mp4OutputFormat, 
  BufferTarget,
  CanvasSource,
  AudioBufferSource
} from 'mediabunny'

export interface ClipExportData {
  title: string
  audioUrl: string
  imageUrl?: string
  startTime: number
  endTime: number
  duration: number
}

export interface VideoExportOptions {
  width?: number
  height?: number
  frameRate?: number
  videoBitrate?: number
}

const DEFAULT_OPTIONS: Required<VideoExportOptions> = {
  width: 1080,
  height: 1080,
  frameRate: 30,
  videoBitrate: 5000000 // 5 Mbps - high quality for 1080x1080
}

/**
 * Export a single clip as MP4 video
 */
export async function exportClipToVideo(
  clip: ClipExportData,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS }
  
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
    
    // Add video frames (static image for each frame)
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameDuration
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
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS }
  
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
    
    // Add video frames
    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameDuration
      await videoSource.add(timestamp, frameDuration)
      if (i % 10 === 0) {
        const progress = 0.6 + (0.35 * (i / totalFrames))
        onProgress?.(progress)
      }
    }
    
    await output.finalize()
    
    onProgress?.(1.0)
    
    const buffer = (output.target as BufferTarget).buffer
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

