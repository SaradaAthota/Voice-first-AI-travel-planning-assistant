/**
 * ItineraryDisplay Component
 * 
 * Displays the complete itinerary with all days.
 */

import React from 'react';
import { ItineraryOutput } from '../types/itinerary';
import { ItineraryDay } from './ItineraryDay';

interface ItineraryDisplayProps {
  itinerary: ItineraryOutput | null;
  className?: string;
}

export function ItineraryDisplay({ itinerary, className = '' }: ItineraryDisplayProps) {
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

