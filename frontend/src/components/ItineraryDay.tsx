/**
 * ItineraryDay Component
 * 
 * Displays a single day's itinerary with morning/afternoon/evening blocks.
 */

import React from 'react';
import { ItineraryDay as ItineraryDayType } from '../types/itinerary';
import { DayBlock } from './DayBlock';

interface ItineraryDayProps {
  day: ItineraryDayType;
}

export function ItineraryDay({ day }: ItineraryDayProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Day {day.day}</h2>
          <p className="text-sm text-gray-500 mt-1">{formatDate(day.date)}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            {day.isFeasible ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✓ Feasible
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                ⚠ Issues
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {day.totalActivities} activities
          </div>
        </div>
      </div>

      {/* Day Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Total Duration</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatTime(day.totalDuration)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Travel Time</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatTime(day.totalTravelTime)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Activities</p>
          <p className="text-lg font-semibold text-gray-800">
            {day.totalActivities}
          </p>
        </div>
      </div>

      {/* Feasibility Issues */}
      {day.feasibilityIssues && day.feasibilityIssues.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-1">Issues:</p>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {day.feasibilityIssues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-4">
        {day.blocks.morning && (
          <DayBlock block={day.blocks.morning} />
        )}
        {day.blocks.afternoon && (
          <DayBlock block={day.blocks.afternoon} />
        )}
        {day.blocks.evening && (
          <DayBlock block={day.blocks.evening} />
        )}
      </div>
    </div>
  );
}

