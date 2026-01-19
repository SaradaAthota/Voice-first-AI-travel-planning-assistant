/**
 * useSSETranscript Hook
 * 
 * Manages SSE connection for live transcript updates.
 */

import { useState, useEffect, useRef } from 'react';
import { SSEMessage, TranscriptUpdate } from '../types';

export interface UseSSETranscriptReturn {
  transcript: string;
  isFinal: boolean;
  isConnected: boolean;
  error: string | null;
}

export function useSSETranscript(sessionId: string): UseSSETranscriptReturn {
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const finalTranscriptRef = useRef<string>(''); // Track final transcript to prevent overwriting

  useEffect(() => {
    if (!sessionId) {
      console.log('useSSETranscript: No sessionId, skipping SSE connection');
      return;
    }

    // Reset final transcript when session changes
    finalTranscriptRef.current = '';
    setIsFinal(false);
    setTranscript('');

    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('Closing existing SSE connection before creating new one');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('useSSETranscript: Creating SSE connection for session:', sessionId);
    // Create SSE connection
    const eventSource = new EventSource(`/api/voice/transcript/${sessionId}`);

    eventSource.onopen = () => {
      console.log('SSE connection opened for session:', sessionId);
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('SSE message received:', event.data);
        const message: SSEMessage = JSON.parse(event.data);
        console.log('Parsed SSE message:', message);

        if (message.type === 'transcript') {
          const update = message.data as TranscriptUpdate;
          console.log('SSE transcript update:', {
            text: update.text.substring(0, 50),
            isFinal: update.isFinal,
            chunkIndex: update.chunkIndex,
            currentIsFinal: isFinal,
            hasFinalTranscript: !!finalTranscriptRef.current,
          });
          
          // If this is a final update, store it and mark as final
          if (update.isFinal) {
            finalTranscriptRef.current = update.text;
            setTranscript(update.text);
            setIsFinal(true);
            setError(null);
            console.log('Final transcript set:', update.text.substring(0, 50));
          } else if (!finalTranscriptRef.current) {
            // Only update with non-final transcript if we don't have a final one yet
            setTranscript(update.text);
            setIsFinal(false);
            setError(null);
          } else {
            console.log('Skipping non-final update - already have final transcript');
          }
        } else if (message.type === 'error') {
          const errorData = message.data as { error: string };
          console.error('SSE error message:', errorData.error);
          setError(errorData.error);
        } else if (message.type === 'complete') {
          console.log('SSE connection completed message received');
          // Don't close the connection - keep it open for potential retries
          // The backend will handle closing
          // setIsConnected(false);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err, 'Raw data:', event.data);
        setError('Failed to parse transcript update');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      // Don't set error immediately - might be a temporary connection issue
      // Only set error if connection is actually closed
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('Connection closed');
        setIsConnected(false);
      }
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
    isFinal,
    isConnected,
    error,
  };
}

