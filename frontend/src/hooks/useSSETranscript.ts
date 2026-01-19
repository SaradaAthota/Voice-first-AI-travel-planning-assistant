/**
 * useSSETranscript Hook
 * 
 * Manages SSE connection for live transcript updates.
 */

import { useState, useEffect, useRef } from 'react';
import { SSEMessage, TranscriptUpdate } from '../types';

export interface UseSSETranscriptReturn {
  transcript: string;
  isConnected: boolean;
  error: string | null;
}

export function useSSETranscript(sessionId: string): UseSSETranscriptReturn {
  const [transcript, setTranscript] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    // Create SSE connection
    const eventSource = new EventSource(`/api/voice/transcript/${sessionId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);

        if (message.type === 'transcript') {
          const update = message.data as TranscriptUpdate;
          setTranscript(update.text);
        } else if (message.type === 'error') {
          const errorData = message.data as { error: string };
          setError(errorData.error);
        } else if (message.type === 'complete') {
          eventSource.close();
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
        setError('Failed to parse transcript update');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Connection error');
      setIsConnected(false);
    };

    eventSourceRef.current = eventSource;

    // Cleanup
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  return {
    transcript,
    isConnected,
    error,
  };
}

