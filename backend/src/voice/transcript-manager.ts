/**
 * Transcript Manager
 * 
 * Manages transcript storage and retrieval.
 * 
 * Rules:
 * - Transcripts persist in Supabase
 * - Supports appending chunks
 * - Tracks session state
 */

import { getSupabaseClient } from '../db/supabase';
import { TranscriptUpdate } from './types';

/**
 * Session state for transcript
 */
interface TranscriptSession {
  sessionId: string;
  tripId?: string;
  fullText: string;
  chunkCount: number;
  lastUpdate: Date;
}

// In-memory session storage (for SSE streaming)
const sessions = new Map<string, TranscriptSession>();

/**
 * Append transcript chunk to session and database
 */
export async function appendTranscript(
  update: TranscriptUpdate
): Promise<void> {
  const supabase = getSupabaseClient();

  // Update in-memory session
  let session = sessions.get(update.sessionId);
  if (!session) {
    session = {
      sessionId: update.sessionId,
      tripId: update.tripId,
      fullText: '',
      chunkCount: 0,
      lastUpdate: new Date(),
    };
    sessions.set(update.sessionId, session);
  }

  // Append text
  if (update.isFinal) {
    // Final chunk - append with space
    session.fullText += (session.fullText ? ' ' : '') + update.text;
  } else {
    // Partial chunk - append directly (will be replaced)
    session.fullText = update.text;
  }

  session.chunkCount = update.chunkIndex + 1;
  session.lastUpdate = new Date();

  // Persist to database if tripId provided
  if (update.tripId) {
    try {
      const { error } = await supabase.from('transcripts').insert({
        trip_id: update.tripId,
        role: 'user',
        content: update.text,
        timestamp: update.timestamp,
        metadata: {
          sessionId: update.sessionId,
          chunkIndex: update.chunkIndex,
          isFinal: update.isFinal,
        },
      });

      if (error) {
        console.error('Failed to save transcript:', error);
        // Don't throw - continue with in-memory storage
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  }
}

/**
 * Get full transcript for session
 */
export function getSessionTranscript(sessionId: string): string | null {
  const session = sessions.get(sessionId);
  return session?.fullText || null;
}

/**
 * Get session state
 */
export function getSession(sessionId: string): TranscriptSession | null {
  return sessions.get(sessionId) || null;
}

/**
 * Clear session (after completion)
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Clean up old sessions (older than 1 hour)
 */
export function cleanupOldSessions(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastUpdate < oneHourAgo) {
      sessions.delete(sessionId);
    }
  }
}

// Clean up old sessions every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);

