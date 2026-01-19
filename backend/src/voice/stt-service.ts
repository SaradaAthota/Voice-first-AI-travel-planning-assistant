/**
 * Speech-to-Text Service
 * 
 * Uses OpenAI Whisper API for transcription.
 * 
 * Rules:
 * - Processes audio chunks
 * - Returns transcribed text
 * - Handles errors gracefully
 */

import OpenAI from 'openai';
import { config } from '../config/env';
import { STTResult } from './types';

let openai: OpenAI | null = null;

/**
 * Get OpenAI client for Whisper
 */
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API key is required for Whisper STT');
    }
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

/**
 * Transcribe audio chunk using Whisper
 * 
 * @param audioBuffer Audio data as Buffer
 * @param mimeType MIME type of audio (e.g., 'audio/webm', 'audio/mp4')
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm'
): Promise<STTResult> {
  const client = getOpenAIClient();

  try {
    // Map MIME types to file extensions that OpenAI supports
    const mimeToExtension: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/ogg': 'ogg',
      'audio/oga': 'oga',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mpeg',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/flac': 'flac',
      'audio/x-flac': 'flac',
      'audio/mpga': 'mpga',
    };

    // Extract base MIME type (remove codecs parameter)
    const baseMimeType = mimeType.split(';')[0].toLowerCase().trim();
    // If it's WAV (from conversion), use that; otherwise map to extension
    const extension = baseMimeType === 'audio/wav' ? 'wav' :
                     mimeToExtension[baseMimeType] || mimeToExtension[mimeType.toLowerCase()] || 'wav';
    const filename = `audio.${extension}`;

    // Log for debugging
    console.log('Transcribing audio:', {
      mimeType,
      baseMimeType,
      extension,
      filename,
      bufferSize: audioBuffer.length,
    });

    // Create File object (available in Node.js 18+)
    // OpenAI SDK requires File object with proper extension
    // The filename extension is critical - OpenAI uses it to determine format
    const file = new File([audioBuffer], filename, { 
      type: baseMimeType || 'audio/webm' 
    });

    // Verify file was created correctly
    if (!file || file.size === 0) {
      throw new Error('Failed to create valid File object from audio buffer');
    }

    console.log('File object created:', {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: filename.split('.').pop(),
    });

    // OpenAI SDK accepts File, but we need to ensure the format is correct
    // Try using the File object directly
    const response = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Can be made configurable
      response_format: 'json',
    });

    return {
      text: response.text,
      // language not available in current API response type
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Transcribe audio from base64 string
 */
export async function transcribeAudioFromBase64(
  base64Audio: string,
  mimeType: string = 'audio/webm'
): Promise<STTResult> {
  // Remove data URL prefix if present
  const base64Data = base64Audio.includes(',')
    ? base64Audio.split(',')[1]
    : base64Audio;

  const audioBuffer = Buffer.from(base64Data, 'base64');
  return transcribeAudio(audioBuffer, mimeType);
}

