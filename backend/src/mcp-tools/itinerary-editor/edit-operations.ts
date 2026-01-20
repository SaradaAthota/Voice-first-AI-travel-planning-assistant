/**
 * Edit Operations
 * 
 * Implements different edit operations on itinerary.
 * 
 * Rules:
 * - Modify ONLY the targeted section
 * - Preserve all other days exactly
 * - All operations are deterministic (no LLM)
 */

import {
  DayBlock,
  TimeBlock,
  Activity,
} from '../itinerary-builder/types';
import { POI } from '../poi-search/types';
import { EditType, EditParams } from './types';
import { getPaceConfig, getActivityDuration } from '../itinerary-builder/pace-config';
import { estimateTravelTime, calculateDistance } from '../itinerary-builder/clustering';

/**
 * Apply edit to a day block
 */
export function applyEditToBlock(
  block: DayBlock | undefined,
  editType: EditType,
  editParams: EditParams,
  pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock | undefined {
  if (!block) {
    // If block doesn't exist and we're adding, create it
    if (editType === 'add' && editParams.poiToAdd) {
      const blockType = (block as DayBlock | undefined)?.block || 'afternoon';
      return createNewBlock(blockType, [editParams.poiToAdd], pace);
    }
    return undefined;
  }

  switch (editType) {
    case 'relax':
      return relaxBlock(block, editParams, pace);
    case 'swap':
      return swapActivityInBlock(block, editParams, pace);
    case 'add':
      return addActivityToBlock(block, editParams, pace);
    case 'remove':
      return removeActivityFromBlock(block, editParams);
    case 'reduce_travel':
      return reduceTravelInBlock(block, pace, editParams.targetTravelTime);
    default:
      return block; // No change
  }
}

/**
 * Relax a block (reduce activities or increase duration)
 */
function relaxBlock(
  block: DayBlock,
  editParams: EditParams,
  _pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock {
  let activities = [...block.activities];

  // If reducing activities, remove the last one
  if (editParams.reduceActivities && activities.length > 1) {
    activities = activities.slice(0, -1);
  }

  // If increasing duration, extend last activity
  if (editParams.increaseDuration && activities.length > 0) {
    const lastActivity = activities[activities.length - 1];
    lastActivity.duration += editParams.increaseDuration;
    lastActivity.endTime = addMinutesToTime(lastActivity.startTime, lastActivity.duration);
  }

  // Recalculate block times
  return recalculateBlockTimes(block.block, activities, block.startTime);
}

/**
 * Swap an activity in a block
 */
function swapActivityInBlock(
  block: DayBlock,
  editParams: EditParams,
  pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock {
  if (!editParams.newPOI) {
    return block; // No POI to swap with
  }

  const activities = [...block.activities];
  
  // Swap the last activity (or specified index)
  const indexToSwap = editParams.activityIndex !== undefined
    ? editParams.activityIndex
    : activities.length - 1;

  if (indexToSwap >= 0 && indexToSwap < activities.length) {
    const oldActivity = activities[indexToSwap];
    const duration = getActivityDuration(editParams.newPOI, pace);
    
    // Calculate travel time from previous activity
    let travelTime = 0;
    if (indexToSwap > 0) {
      travelTime = estimateTravelTime(activities[indexToSwap - 1].poi, editParams.newPOI);
    }

    // Create new activity
    const newActivity: Activity = {
      poi: editParams.newPOI,
      startTime: oldActivity.startTime,
      endTime: addMinutesToTime(oldActivity.startTime, duration),
      duration,
      travelTimeFromPrevious: indexToSwap > 0 ? travelTime : undefined,
      travelDistanceFromPrevious: indexToSwap > 0
        ? calculateDistance(
            activities[indexToSwap - 1].poi.coordinates.lat,
            activities[indexToSwap - 1].poi.coordinates.lon,
            editParams.newPOI.coordinates.lat,
            editParams.newPOI.coordinates.lon
          )
        : undefined,
    };

    activities[indexToSwap] = newActivity;

    // Recalculate subsequent activities
    return recalculateBlockTimes(block.block, activities, block.startTime);
  }

  return block;
}

/**
 * Add activity to a block
 */
function addActivityToBlock(
  block: DayBlock,
  editParams: EditParams,
  pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock {
  if (!editParams.poiToAdd) {
    return block;
  }

  const config = getPaceConfig(pace);
  const activities = [...block.activities];

  // Check if we can add more activities
  if (activities.length >= config.maxActivitiesPerBlock) {
    return block; // Can't add more
  }

  // Calculate start time (after last activity)
  let startTime: string;
  if (activities.length > 0) {
    const lastActivity = activities[activities.length - 1];
    const travelTime = estimateTravelTime(lastActivity.poi, editParams.poiToAdd);
    startTime = addMinutesToTime(lastActivity.endTime, travelTime + config.travelBuffer);
  } else {
    startTime = block.startTime;
  }

  // Create new activity
  const duration = getActivityDuration(editParams.poiToAdd, pace);
  const newActivity: Activity = {
    poi: editParams.poiToAdd,
    startTime,
    endTime: addMinutesToTime(startTime, duration),
    duration,
    travelTimeFromPrevious: activities.length > 0
      ? estimateTravelTime(activities[activities.length - 1].poi, editParams.poiToAdd) + config.travelBuffer
      : undefined,
    travelDistanceFromPrevious: activities.length > 0
      ? calculateDistance(
          activities[activities.length - 1].poi.coordinates.lat,
          activities[activities.length - 1].poi.coordinates.lon,
          editParams.poiToAdd.coordinates.lat,
          editParams.poiToAdd.coordinates.lon
        )
      : undefined,
  };

  activities.push(newActivity);

  // Recalculate block times
  return recalculateBlockTimes(block.block, activities, block.startTime);
}

/**
 * Remove activity from a block
 */
function removeActivityFromBlock(
  block: DayBlock,
  editParams: EditParams
): DayBlock {
  const activities = [...block.activities];

  let indexToRemove: number;

  if (editParams.activityIndex !== undefined) {
    indexToRemove = editParams.activityIndex;
  } else if (editParams.poiIdToRemove !== undefined) {
    indexToRemove = activities.findIndex(act => act.poi.osmId === editParams.poiIdToRemove);
  } else {
    // Remove last activity by default
    indexToRemove = activities.length - 1;
  }

  if (indexToRemove >= 0 && indexToRemove < activities.length) {
    activities.splice(indexToRemove, 1);

    // Recalculate block times
    return recalculateBlockTimes(block.block, activities, block.startTime);
  }

  return block;
}

/**
 * Reduce travel time in a block (optimize route)
 */
function reduceTravelInBlock(
  block: DayBlock,
  pace: 'relaxed' | 'moderate' | 'fast',
  targetTravelTime?: number
): DayBlock {
  if (block.activities.length <= 1) {
    return block; // Can't optimize single activity
  }

  // Reorder activities using nearest neighbor (simple optimization)
  let pois = block.activities.map(act => act.poi);
  let optimizedPOIs = optimizeRoute(pois);

  // If targetTravelTime is specified, keep removing activities until we meet the target
  if (targetTravelTime !== undefined && targetTravelTime > 0) {
    let currentTravelTime = Infinity;
    let attempts = 0;
    const maxAttempts = pois.length - 1; // Don't remove all activities
    
    while (currentTravelTime > targetTravelTime && attempts < maxAttempts && optimizedPOIs.length > 1) {
      // Calculate current travel time
      const config = getPaceConfig(pace);
      let totalTravel = 0;
      for (let i = 1; i < optimizedPOIs.length; i++) {
        totalTravel += estimateTravelTime(optimizedPOIs[i - 1], optimizedPOIs[i]) + config.travelBuffer;
      }
      currentTravelTime = totalTravel;
      
      // If still over target, remove the last activity (furthest from others)
      if (currentTravelTime > targetTravelTime && optimizedPOIs.length > 1) {
        optimizedPOIs.pop();
        attempts++;
      } else {
        break;
      }
    }
  }

  // Rebuild activities with optimized order
  const config = getPaceConfig(pace);
  const activities: Activity[] = [];

  for (let i = 0; i < optimizedPOIs.length; i++) {
    const poi = optimizedPOIs[i];
    const duration = getActivityDuration(poi, pace);

    let startTime: string;
    if (i === 0) {
      startTime = block.startTime;
    } else {
      const travelTime = estimateTravelTime(optimizedPOIs[i - 1], poi);
      startTime = addMinutesToTime(activities[i - 1].endTime, travelTime + config.travelBuffer);
    }

    activities.push({
      poi,
      startTime,
      endTime: addMinutesToTime(startTime, duration),
      duration,
      travelTimeFromPrevious: i > 0
        ? estimateTravelTime(optimizedPOIs[i - 1], poi) + config.travelBuffer
        : undefined,
      travelDistanceFromPrevious: i > 0
        ? calculateDistance(
            optimizedPOIs[i - 1].coordinates.lat,
            optimizedPOIs[i - 1].coordinates.lon,
            poi.coordinates.lat,
            poi.coordinates.lon
          )
        : undefined,
    });
  }

  return recalculateBlockTimes(block.block, activities, block.startTime);
}

/**
 * Recalculate block times after edits
 */
function recalculateBlockTimes(
  blockType: TimeBlock,
  activities: Activity[],
  startTime: string
): DayBlock {
  if (activities.length === 0) {
    return {
      block: blockType,
      activities: [],
      startTime,
      endTime: startTime,
      totalDuration: 0,
      travelTime: 0,
    };
  }

  const totalDuration = activities.reduce((sum, act) => sum + act.duration, 0);
  const totalTravelTime = activities.reduce(
    (sum, act) => sum + (act.travelTimeFromPrevious || 0),
    0
  );

  const endTime = activities[activities.length - 1].endTime;

  return {
    block: blockType,
    activities,
    startTime,
    endTime,
    totalDuration,
    travelTime: totalTravelTime,
  };
}

/**
 * Create a new block with activities
 */
function createNewBlock(
  blockType: TimeBlock,
  pois: POI[],
  pace: 'relaxed' | 'moderate' | 'fast'
): DayBlock {
  const config = getPaceConfig(pace);
  const blockConfig = config.blockDurations[blockType];
  const activities: Activity[] = [];

  let currentTime = parseTime(blockConfig.start);

  for (const poi of pois) {
    const duration = getActivityDuration(poi, pace);
    const travelTime = activities.length > 0
      ? estimateTravelTime(activities[activities.length - 1].poi, poi) + config.travelBuffer
      : 0;

    const startTime = formatTime(currentTime + travelTime);
    const endTime = formatTime(currentTime + travelTime + duration);

    activities.push({
      poi,
      startTime,
      endTime,
      duration,
      travelTimeFromPrevious: activities.length > 0 ? travelTime : undefined,
      travelDistanceFromPrevious: activities.length > 0
        ? calculateDistance(
            activities[activities.length - 1].poi.coordinates.lat,
            activities[activities.length - 1].poi.coordinates.lon,
            poi.coordinates.lat,
            poi.coordinates.lon
          )
        : undefined,
    });

    currentTime = parseTime(endTime);
  }

  return recalculateBlockTimes(blockType, activities, blockConfig.start);
}

/**
 * Optimize route using nearest neighbor
 */
function optimizeRoute(pois: POI[]): POI[] {
  if (pois.length <= 1) {
    return pois;
  }

  const route: POI[] = [];
  const remaining = [...pois];

  // Start with first POI
  let current = remaining.shift()!;
  route.push(current);

  // Greedily add nearest remaining POI
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.coordinates.lat,
        current.coordinates.lon,
        remaining[i].coordinates.lat,
        remaining[i].coordinates.lon
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    route.push(current);
  }

  return route;
}

// ============================================================================
// Time Utilities
// ============================================================================

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const time = parseTime(timeStr);
  return formatTime(time + minutes);
}

