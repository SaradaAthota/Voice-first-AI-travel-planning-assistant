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
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connectSSE = () => {
    if (!sessionId) {
      console.log('useSSETranscript: No sessionId, skipping SSE connection');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      console.log('Closing existing SSE connection before creating new one');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log('useSSETranscript: Creating SSE connection for session:', sessionId, `(attempt ${reconnectAttemptsRef.current + 1})`);
    // Create SSE connection - use VITE_API_URL in production, fallback to relative path for dev
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    const eventSource = new EventSource(`${apiBaseUrl}/api/voice/transcript/${sessionId}`);

    eventSource.onopen = () => {
      console.log('SSE connection opened for session:', sessionId);
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0; // Reset on successful connection
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
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err, 'Raw data:', event.data);
        setError('Failed to parse transcript update');
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err, 'ReadyState:', eventSource.readyState);
      
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        
        // Only attempt reconnection if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts && !finalTranscriptRef.current) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
          reconnectAttemptsRef.current++;
          
          console.log(`SSE connection closed. Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectSSE();
          }, delay);
        } else {
          if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            setError('Connection failed after multiple attempts. Please refresh the page.');
          } else {
            setError('Connection closed');
          }
        }
      }
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    if (!sessionId) {
      console.log('useSSETranscript: No sessionId, skipping SSE connection');
      return;
    }

    // Reset final transcript when session changes
    finalTranscriptRef.current = '';
    setIsFinal(false);
    setTranscript('');
    reconnectAttemptsRef.current = 0;

    // Connect SSE
    connectSSE();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId]);

  return {
    transcript,
    isFinal,
    isConnected,
    error,
  };
}

