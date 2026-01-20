/**
 * useVoiceRecorder Hook
 * 
 * Manages audio recording and chunk upload.
 */

import { useState, useRef, useCallback } from 'react';

// Use VITE_API_URL in production, fallback to relative path for dev (Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/voice` 
  : '/api/voice';
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
        // Use the actual blob type to determine filename extension
        const blobType = audioBlob.type || 'audio/webm';
        const extension = blobType.includes('webm') ? 'webm' : 
                         blobType.includes('ogg') ? 'ogg' :
                         blobType.includes('mp4') ? 'm4a' :
                         blobType.includes('wav') ? 'wav' : 'webm';
        formData.append('audio', audioBlob, `audio.${extension}`);
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
   * Collect chunks but DO NOT upload until recording stops
   */
  const handleDataAvailable = useCallback(
    (event: BlobEvent) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
        // DO NOT upload chunks - wait for final blob
      }
    },
    []
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

      // Create MediaRecorder - MUST use audio/webm;codecs=opus
      const mimeType = 'audio/webm;codecs=opus';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      mediaRecorder.ondataavailable = handleDataAvailable;

      mediaRecorder.onstop = async () => {
        console.log('=== MediaRecorder onstop event fired ===');
        console.log('Chunks collected:', chunksRef.current.length);
        console.log('Chunk sizes:', chunksRef.current.map(c => c.size));
        
        // Request any remaining data
        if (mediaRecorder.state === 'inactive') {
          console.log('MediaRecorder is inactive, processing chunks...');
        }
        
        // Upload FINALIZED blob (all chunks combined)
        if (chunksRef.current.length > 0) {
          const finalBlob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          console.log('Final blob created:', {
            size: finalBlob.size,
            type: finalBlob.type,
            chunks: chunksRef.current.length,
          });
          
          // Send finalized blob with correct filename
          const formData = new FormData();
          formData.append('audio', finalBlob, 'recording.webm');
          formData.append('sessionId', sessionId);
          if (tripId) {
            formData.append('tripId', tripId);
          }
          formData.append('chunkIndex', '0');
          formData.append('isFinal', 'true');

          console.log('Uploading audio to:', `${API_BASE_URL}/upload`);
          try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
              method: 'POST',
              body: formData,
            });

            console.log('Upload response status:', response.status, response.statusText);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Upload failed:', errorText);
              throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Upload result:', result);
            
            if (onChunkTranscribed && result.text) {
              console.log('Calling onChunkTranscribed with:', result.text);
              onChunkTranscribed(result.text, true);
            }

            // Mark session as complete AFTER upload succeeds
            console.log('Marking session as complete...');
            fetch(`${API_BASE_URL}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            }).catch(err => console.error('Error completing session:', err));
          } catch (err) {
            console.error('Error uploading final audio:', err);
            setError(err instanceof Error ? err.message : 'Upload failed');
          }
        } else {
          console.warn('No chunks to upload!');
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      console.log('MediaRecorder started. State:', mediaRecorder.state, 'MIME type:', mimeType);

      // Set up interval to request data every CHUNK_INTERVAL
      // NOTE: We're collecting chunks but NOT uploading them individually
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
    console.log('stopRecording called. MediaRecorder state:', mediaRecorderRef.current?.state);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping MediaRecorder...');
      
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('Cleared interval');
      }

      // Request final data before stopping
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('Requesting final data...');
        mediaRecorderRef.current.requestData();
      }

      // Stop the recorder - this will trigger onstop event
      mediaRecorderRef.current.stop();
      console.log('MediaRecorder.stop() called. New state:', mediaRecorderRef.current.state);
      
      setIsRecording(false);
      setIsPaused(false);

      // DON'T call /complete here - wait for upload to finish
      // The /complete will be called after upload succeeds in onstop handler
    } else {
      console.warn('Cannot stop: MediaRecorder is', mediaRecorderRef.current?.state || 'null');
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

