/**
 * useVoiceRecorder Hook
 * 
 * Manages audio recording and chunk upload.
 */

import { useState, useRef, useCallback } from 'react';

const API_BASE_URL = '/api/voice';
const CHUNK_INTERVAL = 2000; // 2 seconds

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  error: string | null;
}

export function useVoiceRecorder(
  sessionId: string,
  tripId?: string,
  onChunkTranscribed?: (text: string, isFinal: boolean) => void
): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  /**
   * Upload audio chunk to backend
   */
  const uploadChunk = useCallback(
    async (audioBlob: Blob, chunkIndex: number, isFinal: boolean) => {
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('sessionId', sessionId);
        if (tripId) {
          formData.append('tripId', tripId);
        }
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('isFinal', isFinal.toString());

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (onChunkTranscribed && result.text) {
          onChunkTranscribed(result.text, isFinal);
        }
      } catch (err) {
        console.error('Error uploading chunk:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [sessionId, tripId, onChunkTranscribed]
  );

  /**
   * Handle data available event
   */
  const handleDataAvailable = useCallback(
    (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        uploadChunk(event.data, chunkIndexRef.current, false);
        chunkIndexRef.current++;
      }
    },
    [uploadChunk]
  );

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      chunkIndexRef.current = 0;

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = handleDataAvailable;

      mediaRecorder.onstop = async () => {
        // Upload final chunk if any remaining data
        if (chunksRef.current.length > 0) {
          const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await uploadChunk(finalBlob, chunkIndexRef.current, true);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Set up interval to request data every CHUNK_INTERVAL
      intervalRef.current = window.setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
        }
      }, CHUNK_INTERVAL);

      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [handleDataAvailable, uploadChunk]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Mark session as complete
      fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(err => console.error('Error completing session:', err));
    }
  }, [sessionId]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Restart interval
      intervalRef.current = window.setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      }, CHUNK_INTERVAL);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error,
  };
}

