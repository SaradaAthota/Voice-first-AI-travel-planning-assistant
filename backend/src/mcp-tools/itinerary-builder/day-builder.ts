/**
 * Day Builder
 * 
 * Builds a single day's itinerary with morning/afternoon/evening blocks.
 * 
 * Rules:
 * - Deterministic logic only (no LLM)
 * - Ensures feasibility by design
 * - Accounts for travel time and buffers
 */

import { POI } from '../poi-search/types';
import {
  Activity,
  DayBlock,
  ItineraryDay,
  TimeBlock,
} from './types';
import { getPaceConfig, getActivityDuration } from './pace-config';
import { estimateTravelTime, optimizeClusterRoute } from './clustering';

/**
 * Build activities for a time block
 */
export function buildBlockActivities(
  pois: POI[],
  block: TimeBlock,
  startTime: string, // ISO time string (HH:MM)
  pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock {
  const config = getPaceConfig(pace);
  const blockConfig = config.blockDurations[block];
  const maxActivities = config.maxActivitiesPerBlock;

  // Optimize route within this block's POIs
  const optimizedPOIs = optimizeClusterRoute(pois.slice(0, maxActivities));

  const activities: Activity[] = [];
  let currentTime = parseTime(startTime);

  for (let i = 0; i < optimizedPOIs.length; i++) {
    const poi = optimizedPOIs[i];

    // Calculate travel time from previous activity
    let travelTime = 0;
    if (i > 0) {
      travelTime = estimateTravelTime(optimizedPOIs[i - 1], poi);
      travelTime += config.travelBuffer; // Add buffer
    }

    // Get activity duration
    const activityDuration = getActivityDuration(poi, pace);

    // Check if we have time for this activity
    const blockEndTime = parseTime(blockConfig.end);
    const activityEndTime = addMinutes(currentTime, travelTime + activityDuration);

    if (activityEndTime > blockEndTime) {
      // Not enough time - skip this activity
      break;
    }

    // Create activity
    const activity: Activity = {
      poi,
      startTime: formatTime(addMinutes(currentTime, travelTime)),
      endTime: formatTime(activityEndTime),
      duration: activityDuration,
      travelTimeFromPrevious: i > 0 ? travelTime : undefined,
      travelDistanceFromPrevious:
        i > 0
          ? calculateDistance(
              optimizedPOIs[i - 1].coordinates.lat,
              optimizedPOIs[i - 1].coordinates.lon,
              poi.coordinates.lat,
              poi.coordinates.lon
            )
          : undefined,
    };

    activities.push(activity);
    currentTime = activityEndTime;
  }

  // Calculate block totals
  const totalDuration = activities.reduce((sum, act) => sum + act.duration, 0);
  const totalTravelTime = activities.reduce(
    (sum, act) => sum + (act.travelTimeFromPrevious || 0),
    0
  );

  const blockEndTime =
    activities.length > 0
      ? activities[activities.length - 1].endTime
      : startTime;

  return {
    block,
    activities,
    startTime,
    endTime: blockEndTime,
    totalDuration,
    travelTime: totalTravelTime,
  };
}

/**
 * Build a complete day's itinerary
 */
export function buildDay(
  dayNumber: number,
  date: string,
  pois: POI[],
  pace: 'relaxed' | 'moderate' | 'fast'
): ItineraryDay {
  const config = getPaceConfig(pace);
  const maxActivitiesPerDay = config.maxActivitiesPerDay;

  // Distribute POIs across blocks
  // Try to balance: morning gets cultural/historic, afternoon gets mixed, evening gets food/entertainment
  const morningPOIs: POI[] = [];
  const afternoonPOIs: POI[] = [];
  const eveningPOIs: POI[] = [];

  for (const poi of pois.slice(0, maxActivitiesPerDay)) {
    // Check if POI has timeBlock tag (from LLM generation)
    const timeBlock = poi.tags?.timeBlock;
    
    if (timeBlock === 'morning') {
      if (morningPOIs.length < config.maxActivitiesPerBlock) {
        morningPOIs.push(poi);
      } else if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
        afternoonPOIs.push(poi);
      }
    } else if (timeBlock === 'evening') {
      if (eveningPOIs.length < config.maxActivitiesPerBlock) {
        eveningPOIs.push(poi);
      } else if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
        afternoonPOIs.push(poi);
      }
    } else if (timeBlock === 'afternoon') {
      if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
        afternoonPOIs.push(poi);
      } else if (morningPOIs.length < config.maxActivitiesPerBlock) {
        morningPOIs.push(poi);
      } else if (eveningPOIs.length < config.maxActivitiesPerBlock) {
        eveningPOIs.push(poi);
      }
    } else {
      // Fallback to category-based distribution for non-LLM POIs
      const category = poi.category.toLowerCase();
      
      if (category === 'history' || category === 'culture' || category === 'museum') {
        if (morningPOIs.length < config.maxActivitiesPerBlock) {
          morningPOIs.push(poi);
        } else if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
          afternoonPOIs.push(poi);
        }
      } else if (category === 'food' || category === 'nightlife' || category === 'entertainment') {
        if (eveningPOIs.length < config.maxActivitiesPerBlock) {
          eveningPOIs.push(poi);
        } else if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
          afternoonPOIs.push(poi);
        }
      } else {
        // Other categories go to afternoon first, then distribute
        if (afternoonPOIs.length < config.maxActivitiesPerBlock) {
          afternoonPOIs.push(poi);
        } else if (morningPOIs.length < config.maxActivitiesPerBlock) {
          morningPOIs.push(poi);
        } else if (eveningPOIs.length < config.maxActivitiesPerBlock) {
          eveningPOIs.push(poi);
        }
      }
    }
  }

  // Build blocks
  const morningBlock = morningPOIs.length > 0
    ? buildBlockActivities(morningPOIs, 'morning', config.blockDurations.morning.start, pace)
    : undefined;

  const afternoonBlock = afternoonPOIs.length > 0
    ? buildBlockActivities(
        afternoonPOIs,
        'afternoon',
        morningBlock
          ? addTimeString(morningBlock.endTime, config.restTime)
          : config.blockDurations.afternoon.start,
        pace
      )
    : undefined;

  const eveningBlock = eveningPOIs.length > 0
    ? buildBlockActivities(
        eveningPOIs,
        'evening',
        afternoonBlock
          ? addTimeString(afternoonBlock.endTime, config.restTime)
          : config.blockDurations.evening.start,
        pace
      )
    : undefined;

  // Calculate day totals
  const allActivities: Activity[] = [
    ...(morningBlock?.activities || []),
    ...(afternoonBlock?.activities || []),
    ...(eveningBlock?.activities || []),
  ];

  const totalTravelTime = allActivities.reduce(
    (sum, act) => sum + (act.travelTimeFromPrevious || 0),
    0
  );

  const totalDuration = allActivities.reduce((sum, act) => sum + act.duration, 0);

  // Check feasibility
  const feasibilityIssues: string[] = [];
  const totalTime = totalDuration + totalTravelTime;
  const maxTime = 12 * 60; // 12 hours max per day

  if (totalTime > maxTime) {
    feasibilityIssues.push(`Total time (${Math.round(totalTime / 60)}h) exceeds maximum (12h)`);
  }

  if (allActivities.length === 0) {
    feasibilityIssues.push('No activities scheduled');
  }

  return {
    day: dayNumber,
    date,
    blocks: {
      morning: morningBlock,
      afternoon: afternoonBlock,
      evening: eveningBlock,
    },
    totalActivities: allActivities.length,
    totalTravelTime,
    totalDuration,
    isFeasible: feasibilityIssues.length === 0,
    feasibilityIssues: feasibilityIssues.length > 0 ? feasibilityIssues : undefined,
  };
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string (HH:MM)
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Add minutes to a time
 */
function addMinutes(time: number, minutes: number): number {
  return time + minutes;
}

/**
 * Add minutes to a time string
 */
function addTimeString(timeStr: string, minutes: number): string {
  const time = parseTime(timeStr);
  return formatTime(time + minutes);
}

/**
 * Calculate distance (imported from clustering)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

