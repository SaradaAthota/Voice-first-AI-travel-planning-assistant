/**
 * Feasibility Checker
 * 
 * Checks if an edited itinerary is still feasible.
 * 
 * Rules:
 * - Check day-level feasibility
 * - Check block-level constraints
 * - Report issues if not feasible
 */

import { ItineraryDay, DayBlock } from '../itinerary-builder/types';
import { getPaceConfig } from '../itinerary-builder/pace-config';

/**
 * Check feasibility of a day
 */
export function checkDayFeasibility(
  day: ItineraryDay,
  pace: 'relaxed' | 'moderate' | 'fast'
): { isFeasible: boolean; issues: string[] } {
  const issues: string[] = [];
  const config = getPaceConfig(pace);

  // Check total time (max 12 hours per day)
  const maxTimeMinutes = 12 * 60;
  const totalTime = day.totalDuration + day.totalTravelTime;

  if (totalTime > maxTimeMinutes) {
    issues.push(
      `Total time (${Math.round(totalTime / 60)}h) exceeds maximum (12h)`
    );
  }

  // Check activity count
  if (day.totalActivities > config.maxActivitiesPerDay) {
    issues.push(
      `Activity count (${day.totalActivities}) exceeds maximum (${config.maxActivitiesPerDay})`
    );
  }

  // Check each block
  const blockTypes: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  for (const blockType of blockTypes) {
    const block = day.blocks[blockType];
    if (block) {
      const blockIssues = checkBlockFeasibility(block, pace);
      issues.push(...blockIssues.map(issue => `${blockType} block: ${issue}`));
    }
  }

  // Check if day has at least one activity
  if (day.totalActivities === 0) {
    issues.push('Day has no activities');
  }

  return {
    isFeasible: issues.length === 0,
    issues,
  };
}

/**
 * Check feasibility of a block
 */
function checkBlockFeasibility(
  block: DayBlock,
  pace: 'relaxed' | 'moderate' | 'fast'
): string[] {
  const issues: string[] = [];
  const config = getPaceConfig(pace);

  // Check activity count per block
  if (block.activities.length > config.maxActivitiesPerBlock) {
    issues.push(
      `Activity count (${block.activities.length}) exceeds maximum (${config.maxActivitiesPerBlock})`
    );
  }

  // Check block duration
  const blockConfig = config.blockDurations[block.block];
  const blockStart = parseTime(block.startTime);
  const blockEnd = parseTime(block.endTime);
  const blockDuration = blockEnd - blockStart;

  if (blockDuration > blockConfig.maxDuration) {
    issues.push(
      `Block duration (${Math.round(blockDuration / 60)}h) exceeds maximum (${Math.round(blockConfig.maxDuration / 60)}h)`
    );
  }

  // Check if activities fit in time window
  if (block.activities.length > 0) {
    const lastActivity = block.activities[block.activities.length - 1];
    const lastEndTime = parseTime(lastActivity.endTime);
    const blockEndTime = parseTime(blockConfig.end);

    if (lastEndTime > blockEndTime) {
      issues.push('Activities extend beyond block time window');
    }
  }

  return issues;
}

/**
 * Parse time string to minutes
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

