/**
 * Types for frontend
 */

export interface TranscriptUpdate {
  sessionId: string;
  tripId?: string;
  text: string;
  isFinal: boolean;
  timestamp: string;
  chunkIndex: number;
}

export interface SSEMessage {
  type: 'transcript' | 'error' | 'complete';
  data: TranscriptUpdate | { error: string } | { complete: boolean };
}

