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
    
    // Log API key status (without exposing the key)
    const apiKeyLength = config.openai.apiKey.length;
    const apiKeyPrefix = config.openai.apiKey.substring(0, 7);
    console.log('Initializing OpenAI client:', {
      hasApiKey: !!config.openai.apiKey,
      apiKeyLength,
      apiKeyPrefix: `${apiKeyPrefix}...`,
      startsWithSk: config.openai.apiKey.startsWith('sk-'),
    });
    
    openai = new OpenAI({ 
      apiKey: config.openai.apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 0, // We handle retries ourselves
    });
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

  // Retry logic for transient connection errors
  const maxRetries = 3;
  const retryDelay = 1000; // Start with 1 second
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Transcription attempt ${attempt}/${maxRetries}...`);
      
      // OpenAI SDK accepts File, but we need to ensure the format is correct
      // Try using the File object directly
      const response = await client.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en', // Can be made configurable
        response_format: 'json',
        timeout: 30000, // 30 second timeout
      });

      console.log(`Transcription successful on attempt ${attempt}`);
      return {
        text: response.text,
        // language not available in current API response type
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log full error details for debugging
      const errorDetails = {
        message: lastError.message,
        name: lastError.name,
        stack: lastError.stack,
        // OpenAI SDK error properties
        code: (error as any)?.code,
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        type: (error as any)?.type,
        errno: (error as any)?.errno,
        cause: (error as any)?.cause,
        // Check for OpenAI API error structure
        response: (error as any)?.response ? {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: (error as any).response.data,
        } : undefined,
      };
      
      console.error(`Full error details (attempt ${attempt}/${maxRetries}):`, JSON.stringify(errorDetails, null, 2));
      
      // Check if it's a retryable error
      const errorMessage = lastError.message.toLowerCase();
      const errorCode = (error as any)?.code;
      const errorStatus = (error as any)?.status;
      const errorType = (error as any)?.type;
      
      const isRetryable = 
        errorCode === 'ECONNRESET' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ECONNREFUSED' ||
        errorCode === 'ENOTFOUND' ||
        errorType === 'system' ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('etimedout') ||
        errorStatus === 429 || // Rate limit
        errorStatus === 500 || // Server error
        errorStatus === 502 || // Bad gateway
        errorStatus === 503 || // Service unavailable
        errorStatus === 504;   // Gateway timeout

      console.error(`Whisper transcription error (attempt ${attempt}/${maxRetries}):`, {
        error: lastError.message,
        code: errorCode,
        status: errorStatus,
        type: errorType,
        errno: (error as any)?.errno,
        retryable: isRetryable,
      });

      if (!isRetryable || attempt === maxRetries) {
        // Not retryable or last attempt - throw error
        throw new Error(
          `Failed to transcribe audio: ${lastError.message}${attempt < maxRetries ? ` (after ${attempt} attempts)` : ''}`
        );
      }

      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.warn(`Transcription failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, {
        error: lastError.message,
        code: errorCode,
        status: errorStatus,
        type: errorType,
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error(`Failed to transcribe audio after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
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

