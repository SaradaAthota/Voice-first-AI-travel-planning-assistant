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
    // OpenAI SDK accepts File, Blob, or Buffer
    // In Node.js, we can pass the Buffer directly or create a File
    // File is available in Node.js 18+ as a global
    let file: File | Buffer;
    
    if (typeof File !== 'undefined') {
      file = new File([audioBuffer], 'audio.webm', { type: mimeType });
    } else {
      // Fallback: pass Buffer directly (OpenAI SDK should handle it)
      file = audioBuffer;
    }

    const response = await client.audio.transcriptions.create({
      file: file as any,
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

