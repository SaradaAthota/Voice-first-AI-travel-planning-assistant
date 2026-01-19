/**
 * MicButton Component
 * 
 * Microphone button for voice recording.
 */

import React from 'react';
import { UseVoiceRecorderReturn } from '../hooks/useVoiceRecorder';

interface MicButtonProps {
  recorder: UseVoiceRecorderReturn;
  className?: string;
}

export function MicButton({ recorder, className = '' }: MicButtonProps) {
  const { isRecording, isPaused, startRecording, stopRecording, pauseRecording, resumeRecording, error } = recorder;

  const handleClick = () => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      startRecording();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopRecording();
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        <button
          data-testid="mic-button"
          onClick={handleClick}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isRecording
              ? isPaused
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
            }
            text-white shadow-lg
            focus:outline-none focus:ring-4 focus:ring-opacity-50
            ${isRecording ? 'focus:ring-red-300' : 'focus:ring-blue-300'}
          `}
          aria-label={isRecording ? (isPaused ? 'Resume recording' : 'Pause recording') : 'Start recording'}
        >
          {isRecording ? (
            isPaused ? (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )
          ) : (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        {isRecording && (
          <button
            onClick={handleStop}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white text-xs"
            aria-label="Stop recording"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      <p className="text-sm text-gray-600">
        {isRecording ? (isPaused ? 'Paused' : 'Recording...') : 'Click to record'}
      </p>
    </div>
  );
}

