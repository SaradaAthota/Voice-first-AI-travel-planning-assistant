/**
 * SSE Manager
 * 
 * Manages Server-Sent Events for live transcript streaming.
 * 
 * Rules:
 * - Streams transcript updates in real-time
 * - Supports multiple clients per session
 * - Handles client disconnections
 */

import { Response } from 'express';
import { TranscriptUpdate, SSEMessage } from './types';
import { getSession } from './transcript-manager';

/**
 * SSE client connection
 */
interface SSEClient {
  sessionId: string;
  response: Response;
  lastChunkIndex: number;
}

// Map of sessionId -> Set of SSE clients
const sseClients = new Map<string, Set<SSEClient>>();

/**
 * Setup SSE connection for a client
 */
export function setupSSEConnection(
  response: Response,
  sessionId: string
): void {
  // Set SSE headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Create client
  const client: SSEClient = {
    sessionId,
    response,
    lastChunkIndex: -1,
  };

  // Add to clients set
  if (!sseClients.has(sessionId)) {
    sseClients.set(sessionId, new Set());
  }
  sseClients.get(sessionId)!.add(client);

  // Send initial connection message
  sendSSEMessage(client, {
    type: 'transcript',
    data: {
      sessionId,
      text: '',
      isFinal: false,
      timestamp: new Date().toISOString(),
      chunkIndex: -1,
    },
  });

  // Handle client disconnect
  response.on('close', () => {
    removeSSEClient(sessionId, client);
  });
}

/**
 * Broadcast transcript update to all clients in session
 */
export function broadcastTranscriptUpdate(update: TranscriptUpdate): void {
  const clients = sseClients.get(update.sessionId);
  if (!clients) {
    return; // No clients connected
  }

  for (const client of clients) {
    try {
      sendSSEMessage(client, {
        type: 'transcript',
        data: update,
      });
      client.lastChunkIndex = update.chunkIndex;
    } catch (error) {
      console.error('Error sending SSE message:', error);
      // Remove failed client
      removeSSEClient(update.sessionId, client);
    }
  }
}

/**
 * Send SSE message to client
 */
function sendSSEMessage(client: SSEClient, message: SSEMessage): void {
  try {
    const data = JSON.stringify(message);
    client.response.write(`data: ${data}\n\n`);
  } catch (error) {
    console.error('Error writing SSE message:', error);
    throw error;
  }
}

/**
 * Remove SSE client
 */
function removeSSEClient(sessionId: string, client: SSEClient): void {
  const clients = sseClients.get(sessionId);
  if (clients) {
    clients.delete(client);
    if (clients.size === 0) {
      sseClients.delete(sessionId);
    }
  }
}

/**
 * Send completion message to all clients in session
 */
export function sendCompletionMessage(sessionId: string): void {
  const clients = sseClients.get(sessionId);
  if (!clients) {
    return;
  }

  for (const client of clients) {
    try {
      sendSSEMessage(client, {
        type: 'complete',
        data: { complete: true },
      });
      client.response.end();
    } catch (error) {
      console.error('Error sending completion message:', error);
    }
    removeSSEClient(sessionId, client);
  }
}

/**
 * Send error message to client
 */
export function sendErrorMessage(sessionId: string, error: string): void {
  const clients = sseClients.get(sessionId);
  if (!clients) {
    return;
  }

  for (const client of clients) {
    try {
      sendSSEMessage(client, {
        type: 'error',
        data: { error },
      });
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
}

