/**
 * TranscriptDisplay Component
 * 
 * Displays live transcript from SSE.
 */

import React from 'react';
import { UseSSETranscriptReturn } from '../hooks/useSSETranscript';

interface TranscriptDisplayProps {
  transcript: UseSSETranscriptReturn;
  className?: string;
}

export function TranscriptDisplay({ transcript, className = '' }: TranscriptDisplayProps) {
  const { transcript: text, isConnected, error } = transcript;

  return (
    <div data-testid="transcript" className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Live Transcript</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
      <div className="min-h-[100px] p-3 bg-gray-50 rounded border border-gray-200">
        {error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : text ? (
          <p className="text-gray-800 whitespace-pre-wrap">{text}</p>
        ) : (
          <p className="text-gray-400 italic">Start recording to see transcript...</p>
        )}
      </div>
    </div>
  );
}

