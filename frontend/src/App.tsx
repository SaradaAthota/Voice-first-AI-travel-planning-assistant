/**
 * Main App Component
 */

import React, { useState, useEffect } from 'react';
import { MicButton } from './components/MicButton';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { SourcesSection } from './components/SourcesSection';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useSSETranscript } from './hooks/useSSETranscript';
import { useItinerary } from './hooks/useItinerary';
import { ItineraryOutput, Citation } from './types/itinerary';

const API_BASE_URL = '/api/voice';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);

  // Get or create session
  useEffect(() => {
    const createSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/session/new`);
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    };

    createSession();
  }, []);

  // Voice recorder
  const recorder = useVoiceRecorder(sessionId || '', tripId || undefined);

  // SSE transcript
  const transcript = useSSETranscript(sessionId || '');

  // Itinerary
  const { itinerary, loading: itineraryLoading, error: itineraryError, refetch: refetchItinerary } = useItinerary(tripId);

  // Listen for trip creation/updates (would come from orchestrator response)
  // For now, we'll simulate - in production, this would come from API responses
  useEffect(() => {
    // When transcript changes and contains trip info, extract tripId
    // This is a placeholder - in production, tripId would come from API responses
    if (transcript.transcript && transcript.transcript.includes('trip')) {
      // Extract tripId from transcript or API response
      // For now, we'll use a mock tripId
    }
  }, [transcript.transcript]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Voice Travel Assistant
          </h1>
          <p className="text-gray-600">
            Plan your trip using voice commands
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Voice Input */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
              {/* Mic Button */}
              <div className="flex justify-center">
                <MicButton recorder={recorder} />
              </div>

              {/* Transcript Display */}
              {sessionId && (
                <TranscriptDisplay transcript={transcript} />
              )}

              {/* Session Info */}
              {sessionId && (
                <div className="text-center text-sm text-gray-500">
                  Session: {sessionId.substring(0, 8)}...
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Itinerary & Sources */}
          <div className="lg:col-span-2 space-y-6">
            {/* Itinerary Display */}
            {itineraryLoading ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-gray-500">Loading itinerary...</p>
              </div>
            ) : itineraryError ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-red-500">Error: {itineraryError}</p>
              </div>
            ) : (
              <ItineraryDisplay itinerary={itinerary} />
            )}

            {/* Sources Section */}
            {citations.length > 0 && (
              <SourcesSection citations={citations} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

