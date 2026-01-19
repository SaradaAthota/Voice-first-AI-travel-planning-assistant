/**
 * ActivityItem Component
 * 
 * Displays a single activity with POI details.
 */

import React from 'react';
import { Activity } from '../types/itinerary';

interface ActivityItemProps {
  activity: Activity;
  index: number;
  showTravelTime?: boolean;
}

export function ActivityItem({ activity, index, showTravelTime }: ActivityItemProps) {
  const formatTime = (timeStr: string) => {
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
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      {/* Travel Time from Previous */}
      {showTravelTime && activity.travelTimeFromPrevious && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
          Travel: {formatDuration(activity.travelTimeFromPrevious)}
          {activity.travelDistanceFromPrevious && (
            <span className="ml-1">
              ({activity.travelDistanceFromPrevious.toFixed(1)} km)
            </span>
          )}
        </div>
      )}

      {/* Activity Time */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">
          {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
        </div>
        <div className="text-xs text-gray-500">
          {formatDuration(activity.duration)}
        </div>
      </div>

      {/* POI Name */}
      <h4 className="text-lg font-semibold text-gray-800 mb-1">
        {activity.poi.name}
      </h4>

      {/* POI Category */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
          {activity.poi.category}
        </span>
        {activity.poi.rating && (
          <span className="text-xs text-gray-600">
            ⭐ {activity.poi.rating}/5
          </span>
        )}
      </div>

      {/* POI Description */}
      {activity.poi.description && (
        <p className="text-sm text-gray-600 mb-2">{activity.poi.description}</p>
      )}

      {/* Notes */}
      {activity.notes && (
        <p className="text-xs text-gray-500 italic mt-2">{activity.notes}</p>
      )}

      {/* OSM Link */}
      <a
        href={`https://www.openstreetmap.org/${activity.poi.osmType}/${activity.poi.osmId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
      >
        View on OpenStreetMap →
      </a>
    </div>
  );
}

