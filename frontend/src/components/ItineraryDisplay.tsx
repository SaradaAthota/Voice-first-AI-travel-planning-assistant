/**
 * ItineraryDisplay Component
 * 
 * Displays the complete itinerary with all days.
 */

import React, { useState } from 'react';
import { ItineraryOutput } from '../types/itinerary';
import { ItineraryDay } from './ItineraryDay';

interface ItineraryDisplayProps {
  itinerary: ItineraryOutput | null;
  tripId?: string | null;
  className?: string;
}

export function ItineraryDisplay({ itinerary, tripId, className = '' }: ItineraryDisplayProps) {
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendPDF = async () => {
    if (!tripId) {
      setMessage({ type: 'error', text: 'Trip ID not available' });
      return;
    }

    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/itinerary/send-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send PDF');
      }

      setMessage({ type: 'success', text: `PDF will be sent to ${email}` });
      setEmail('');
      setShowEmailInput(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send PDF',
      });
    } finally {
      setSending(false);
    }
  };

  if (!itinerary) {
    return (
      <div data-testid="itinerary-empty" className={`bg-white rounded-lg shadow-md p-8 text-center ${className}`}>
        <p className="text-gray-500">No itinerary available yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Start planning your trip to see the itinerary here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="itinerary" className={`space-y-6 ${className}`}>
      {/* Itinerary Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{itinerary.city}</h1>
            <p className="text-gray-600 mt-1">
              {itinerary.duration} day{itinerary.duration !== 1 ? 's' : ''} • {itinerary.pace} pace
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Starting {new Date(itinerary.startDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {itinerary.totalActivities}
            </div>
            <div className="text-sm text-gray-500">Activities</div>
          </div>
        </div>
        
        {/* Send PDF Button */}
        {tripId && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {!showEmailInput ? (
              <button
                onClick={() => setShowEmailInput(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send PDF via Email
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSendPDF}
                    disabled={sending || !email}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailInput(false);
                      setEmail('');
                      setMessage(null);
                    }}
                    disabled={sending}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Days */}
      <div>
        {itinerary.days.map((day) => (
          <ItineraryDay key={day.day} day={day} />
        ))}
      </div>
    </div>
  );
}

