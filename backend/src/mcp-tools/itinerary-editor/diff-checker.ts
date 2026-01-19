/**
 * Diff Checker
 * 
 * Verifies that only the targeted section was modified.
 * 
 * Rules:
 * - All other days must remain exactly the same
 * - Only the target day/block should change
 * - Deep equality check for unchanged sections
 */

import { ItineraryOutput, ItineraryDay, DayBlock, Activity } from '../itinerary-builder/types';
import { DiffCheckResult } from './types';

/**
 * Check if two itineraries differ only in the target section
 */
export function checkDiff(
  original: ItineraryOutput,
  edited: ItineraryOutput,
  targetDay: number,
  targetBlock?: 'morning' | 'afternoon' | 'evening'
): DiffCheckResult {
  const violations: string[] = [];
  const changedDays: number[] = [];
  const unchangedDays: number[] = [];

  // Check metadata (should only change version and edit info)
  if (original.city !== edited.city) {
    violations.push('City changed');
  }
  if (original.duration !== edited.duration) {
    violations.push('Duration changed');
  }
  if (original.startDate !== edited.startDate) {
    violations.push('Start date changed');
  }
  if (original.pace !== edited.pace) {
    violations.push('Pace changed');
  }

  // Check each day
  for (let dayNum = 1; dayNum <= original.duration; dayNum++) {
    const originalDay = original.days.find(d => d.day === dayNum);
    const editedDay = edited.days.find(d => d.day === dayNum);

    if (!originalDay || !editedDay) {
      violations.push(`Day ${dayNum} missing in one of the itineraries`);
      continue;
    }

    if (dayNum === targetDay) {
      // Target day - check if only target block changed
      const blockCheck = checkDayBlockDiff(originalDay, editedDay, targetBlock);
      if (!blockCheck.isValid) {
        violations.push(...blockCheck.violations.map(v => `Day ${dayNum}: ${v}`));
        changedDays.push(dayNum);
      } else {
        changedDays.push(dayNum); // Expected change
      }
    } else {
      // Other days - must be exactly the same
      if (!areDaysEqual(originalDay, editedDay)) {
        violations.push(`Day ${dayNum} was modified but should remain unchanged`);
        changedDays.push(dayNum);
      } else {
        unchangedDays.push(dayNum);
      }
    }
  }

  return {
    isValid: violations.length === 0,
    unchangedDays,
    changedDays,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check if only the target block changed in a day
 */
function checkDayBlockDiff(
  original: ItineraryDay,
  edited: ItineraryDay,
  targetBlock?: 'morning' | 'afternoon' | 'evening'
): { isValid: boolean; violations: string[] } {
  const violations: string[] = [];

  // If no target block specified, any block can change
  if (!targetBlock) {
    // Just check that day structure is valid
    return { isValid: true, violations: [] };
  }

  // Check blocks that should NOT change
  const blocksToCheck: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  const otherBlocks = blocksToCheck.filter(b => b !== targetBlock);

  for (const blockType of otherBlocks) {
    const originalBlock = original.blocks[blockType];
    const editedBlock = edited.blocks[blockType];

    if (!areBlocksEqual(originalBlock, editedBlock)) {
      violations.push(`${blockType} block was modified but should remain unchanged`);
    }
  }

  // Check day-level properties (should be recalculated but structure should match)
  // Allow totalActivities, totalTravelTime, totalDuration to change if target block changed
  // But day, date should remain same
  if (original.day !== edited.day) {
    violations.push('Day number changed');
  }
  if (original.date !== edited.date) {
    violations.push('Date changed');
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Check if two days are exactly equal
 */
function areDaysEqual(day1: ItineraryDay, day2: ItineraryDay): boolean {
  // Check basic properties
  if (
    day1.day !== day2.day ||
    day1.date !== day2.date ||
    day1.totalActivities !== day2.totalActivities ||
    day1.totalTravelTime !== day2.totalTravelTime ||
    day1.totalDuration !== day2.totalDuration ||
    day1.isFeasible !== day2.isFeasible
  ) {
    return false;
  }

  // Check blocks
  const blockTypes: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  for (const blockType of blockTypes) {
    if (!areBlocksEqual(day1.blocks[blockType], day2.blocks[blockType])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two blocks are exactly equal
 */
function areBlocksEqual(block1?: DayBlock, block2?: DayBlock): boolean {
  // Both undefined or null
  if (!block1 && !block2) {
    return true;
  }

  // One is undefined
  if (!block1 || !block2) {
    return false;
  }

  // Check block properties
  if (
    block1.block !== block2.block ||
    block1.startTime !== block2.startTime ||
    block1.endTime !== block2.endTime ||
    block1.totalDuration !== block2.totalDuration ||
    block1.travelTime !== block2.travelTime ||
    block1.activities.length !== block2.activities.length
  ) {
    return false;
  }

  // Check activities
  for (let i = 0; i < block1.activities.length; i++) {
    if (!areActivitiesEqual(block1.activities[i], block2.activities[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two activities are exactly equal
 */
function areActivitiesEqual(act1: Activity, act2: Activity): boolean {
  return (
    act1.poi.osmId === act2.poi.osmId &&
    act1.startTime === act2.startTime &&
    act1.endTime === act2.endTime &&
    act1.duration === act2.duration &&
    act1.travelTimeFromPrevious === act2.travelTimeFromPrevious &&
    act1.travelDistanceFromPrevious === act2.travelDistanceFromPrevious
  );
}

