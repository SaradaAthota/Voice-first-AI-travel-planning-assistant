/**
 * Audio Converter
 * 
 * Converts audio formats using FFmpeg for Whisper API compatibility.
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Set FFmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Convert audio buffer to WAV format
 * @param inputBuffer Audio buffer (WebM, OGG, etc.)
 * @param inputMimeType MIME type of input audio
 * @returns WAV buffer
 */
export async function convertToWav(
  inputBuffer: Buffer,
  inputMimeType: string = 'audio/webm'
): Promise<Buffer> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const inputExt = inputMimeType.includes('webm') ? 'webm' :
                   inputMimeType.includes('ogg') ? 'ogg' :
                   inputMimeType.includes('mp4') ? 'm4a' : 'webm';
  
  const inputPath = path.join(tempDir, `input_${Date.now()}.${inputExt}`);
  const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);

  try {
    // Write input buffer to temp file
    fs.writeFileSync(inputPath, inputBuffer);

    // Convert to WAV using FFmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec('pcm_s16le')
        .toFormat('wav')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });

    // Read converted WAV file
    const wavBuffer = fs.readFileSync(outputPath);

    // Clean up temp files
    try {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
    }

    return wavBuffer;
  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw new Error(
      `FFmpeg conversion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


