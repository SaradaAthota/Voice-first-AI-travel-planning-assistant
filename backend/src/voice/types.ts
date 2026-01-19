/**
 * Types for Voice Pipeline
 */

/**
 * Audio chunk upload request
 */
export interface AudioChunkRequest {
  tripId?: string;
  sessionId: string;
  chunkIndex: number;
  isFinal: boolean;
}

/**
 * STT result
 */
export interface STTResult {
  text: string;
  language?: string;
  confidence?: number;
}

/**
 * Transcript update
 */
export interface TranscriptUpdate {
  sessionId: string;
  tripId?: string;
  text: string;
  isFinal: boolean;
  timestamp: string;
  chunkIndex: number;
}

/**
 * SSE message format
 */
export interface SSEMessage {
  type: 'transcript' | 'error' | 'complete';
  data: TranscriptUpdate | { error: string } | { complete: boolean };
}

