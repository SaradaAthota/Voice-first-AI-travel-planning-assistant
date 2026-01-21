/**
 * Main App Component
 */

import { useState, useEffect, useRef } from 'react';
import { MicButton } from './components/MicButton';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { SourcesSection } from './components/SourcesSection';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { useSSETranscript } from './hooks/useSSETranscript';
import { useItinerary } from './hooks/useItinerary';
import { ItineraryOutput, Citation } from './types/itinerary';

// Use VITE_API_URL in production, fallback to relative path for dev (Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/voice` 
  : '/api/voice';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [itineraryFromResponse, setItineraryFromResponse] = useState<ItineraryOutput | null>(null);
  const [processedTranscript, setProcessedTranscript] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedTimestampRef = useRef<number>(0);

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
  const transcriptText = transcript.transcript;
  const transcriptIsFinal = transcript.isFinal;

  // Itinerary - use from response first, fallback to hook
  const { itinerary: itineraryFromHook, loading: itineraryLoading, error: itineraryError, refetch: refetchItinerary } = useItinerary(tripId);
  const itinerary = itineraryFromResponse || itineraryFromHook;

  // Process transcript when it's finalized and contains meaningful content
  useEffect(() => {
    console.log('Transcript effect triggered:', {
      transcript: transcriptText,
      transcriptLength: transcriptText?.trim().length,
      isFinal: transcriptIsFinal,
      tripId,
      sessionId,
      hasTranscript: !!transcriptText,
      processedTranscript,
      isProcessing,
    });
    
    // Only process if:
    // 1. Transcript is finalized (isFinal: true)
    // 2. Transcript is substantial (at least 3 characters to avoid processing empty/single words)
    // 3. We have a session ID
    // 4. We haven't processed this exact transcript before
    // 5. We're not already processing another request
    if (
      transcriptIsFinal &&
      transcriptText && 
      transcriptText.trim().length >= 3 && 
      sessionId &&
      transcriptText !== processedTranscript &&
      !isProcessing
    ) {
      console.log('Processing FINALIZED transcript:', transcriptText);
      
      // Call the chat API to process the message
      const processTranscript = async () => {
        // Double-check we're not already processing
        if (isProcessing) {
          console.log('Already processing, skipping...');
          return;
        }
        
        // Clear previous response before processing new one
        // BUT: Don't clear itinerary if we're editing (tripId exists)
        // This prevents itinerary from disappearing during edits
        setAssistantResponse(null);
        if (!tripId) {
          // Only clear itinerary if this is a new trip
          setItineraryFromResponse(null);
        }
        
        // Track this request with a timestamp
        const requestTimestamp = Date.now();
        lastProcessedTimestampRef.current = requestTimestamp;
        setIsProcessing(true);
        
        console.log('=== CALLING CHAT API ===');
        console.log('Message:', transcriptText);
        console.log('Request timestamp:', requestTimestamp);
        
        // Use VITE_API_URL in production, fallback to relative path for dev (Vite proxy)
        const chatApiUrl = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL}/api/chat` 
          : '/api/chat';
        
        try {
          const response = await fetch(chatApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: transcriptText,
              tripId: tripId || undefined, // Pass tripId so edits work on existing itinerary
            }),
          });

          console.log('Chat API response status:', response.status, response.statusText);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Chat API error response:', errorText);
            throw new Error(`Failed to process message: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Chat API response data:', data);
          console.log('Response timestamp:', requestTimestamp, 'Last processed:', lastProcessedTimestampRef.current);

          // Only update state if this is still the latest request
          if (requestTimestamp < lastProcessedTimestampRef.current) {
            console.log('Ignoring stale response - newer request in progress');
            return;
          }

          // Mark transcript as processed FIRST to prevent duplicate processing
          setProcessedTranscript(transcriptText);

          // Store citations FIRST (before other state updates)
          // Citations should include both RAG (city guidance) and OSM (POI) citations
          if (data.citations && Array.isArray(data.citations) && data.citations.length > 0) {
            console.log('Setting citations:', data.citations.length, 'citations');
            console.log('Citation sources:', data.citations.map((c: any) => c.source));
            setCitations(data.citations);
          } else {
            console.log('No citations in response or empty array');
            // Don't clear existing citations - they might still be relevant
            // Only clear if explicitly told to or when starting a new recording
          }

          if (data.success && data.tripId) {
            console.log('Setting tripId:', data.tripId);
            setTripId(data.tripId);
            
            // Handle itinerary - prioritize itinerary over assistant response
            if (data.itinerary) {
              console.log('Itinerary received in response, setting directly');
              setItineraryFromResponse(data.itinerary);
              // Clear assistant response when itinerary is available
              setAssistantResponse(null);
            } else {
              // DON'T clear existing itinerary on edit - preserve it until new one arrives
              // Only clear if this is a new trip (no tripId) or if hasItinerary is false
              if (!data.tripId || !data.hasItinerary) {
                setItineraryFromResponse(null);
              }
              // Otherwise, keep existing itinerary visible
              
              // Only show assistant response if no itinerary
              if (data.response) {
                setAssistantResponse(data.response);
              }
              
              // Only fetch from /api/trips/:id/itinerary if:
              // 1. hasItinerary is true AND
              // 2. itinerary not in response (it might be saved but not returned)
              if (data.hasItinerary && !data.itinerary) {
                console.log('hasItinerary is true but itinerary not in response, fetching...');
                setTimeout(() => {
                  refetchItinerary();
                }, 1000);
              } else if (!data.hasItinerary) {
                console.log('hasItinerary is false - itinerary not ready yet');
                // This is expected - assistant will ask follow-up questions
                // Show assistant response for follow-up questions
              }
            }
          } else {
            console.warn('Chat API returned success but no tripId:', data);
            // Still show response even if no tripId
            if (data.response) {
              setAssistantResponse(data.response);
            }
            // Citations should already be set above
          }
        } catch (error) {
          console.error('Error processing transcript:', error);
          // Don't set error state here - let the assistant response handle it
        } finally {
          setIsProcessing(false);
        }
      };

      // Process immediately since transcript is already finalized
      processTranscript();
    }
  }, [transcriptIsFinal, transcriptText, tripId, sessionId, processedTranscript, isProcessing, refetchItinerary]);

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
            {/* Itinerary Display - Priority: Show itinerary if available, then assistant response, then empty state */}
            {itineraryLoading && !itinerary ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-gray-500">Loading itinerary...</p>
              </div>
            ) : itineraryError ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <p className="text-red-500">Error: {itineraryError}</p>
              </div>
            ) : itinerary ? (
              <ItineraryDisplay itinerary={itinerary} tripId={tripId} />
            ) : assistantResponse ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">AI</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap">{assistantResponse}</p>
                    {itineraryLoading && (
                      <p className="text-sm text-gray-500 mt-2">Generating itinerary...</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

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

