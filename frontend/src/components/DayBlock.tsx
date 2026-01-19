/**
 * DayBlock Component
 * 
 * Displays a time block (morning/afternoon/evening) with activities.
 */

import React from 'react';
import { DayBlock as DayBlockType } from '../types/itinerary';
import { ActivityItem } from './ActivityItem';

interface DayBlockProps {
  block: DayBlockType;
}

const blockLabels = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌙 Evening',
};

const blockColors = {
  morning: 'bg-blue-50 border-blue-200',
  afternoon: 'bg-yellow-50 border-yellow-200',
  evening: 'bg-purple-50 border-purple-200',
};

export function DayBlock({ block }: DayBlockProps) {
  const formatTime = (timeStr: string) => {
    // timeStr is in HH:MM format
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${blockColors[block.block]}`}>
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          {blockLabels[block.block]}
        </h3>
        <div className="text-sm text-gray-600">
          {formatTime(block.startTime)} - {formatTime(block.endTime)}
        </div>
      </div>

      {/* Block Summary */}
      <div className="flex gap-4 mb-3 text-sm text-gray-600">
        <span>Duration: {formatDuration(block.totalDuration)}</span>
        {block.travelTime > 0 && (
          <span>Travel: {formatDuration(block.travelTime)}</span>
        )}
      </div>

      {/* Activities */}
      <div className="space-y-3">
        {block.activities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No activities scheduled</p>
        ) : (
          block.activities.map((activity, index) => (
            <ActivityItem
              key={index}
              activity={activity}
              index={index}
              showTravelTime={index > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

