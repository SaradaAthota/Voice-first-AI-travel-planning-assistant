/**
 * Feasibility Evaluation
 * 
 * Evaluates if an itinerary is feasible.
 * 
 * Checks:
 * - Daily duration <= allowed time (max 12 hours)
 * - Travel time is reasonable
 * - Pace consistency (activities match pace)
 */

import { EvalResult, EvalType, FeasibilityDetails } from './types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { getPaceConfig } from '../mcp-tools/itinerary-builder/pace-config';

/**
 * Evaluate feasibility of an itinerary
 */
export function evaluateFeasibility(
  itinerary: ItineraryOutput
): EvalResult {
  const issues: string[] = [];
  const details: FeasibilityDetails = {
    dailyDuration: 0,
    allowedTime: 12 * 60, // 12 hours in minutes
    travelTime: 0,
    travelTimeReasonable: true,
    paceConsistency: {
      expected: 0,
      actual: 0,
      consistent: true,
    },
    issues: [],
  };

  // Get pace configuration
  const paceConfig = getPaceConfig(itinerary.pace);
  const expectedActivitiesPerDay = paceConfig.maxActivitiesPerDay;

  // Evaluate each day
  for (const day of itinerary.days) {
    // Check daily duration
    const totalTime = day.totalDuration + day.totalTravelTime;
    details.dailyDuration = Math.max(details.dailyDuration, totalTime);

    if (totalTime > details.allowedTime) {
      issues.push(
        `Day ${day.day}: Total time (${Math.round(totalTime / 60)}h) exceeds maximum (12h)`
      );
      details.issues.push(
        `Day ${day.day} exceeds time limit: ${Math.round(totalTime / 60)}h > 12h`
      );
    }

    // Check travel time (should be reasonable - not more than 50% of total time)
    const travelTimeRatio = day.totalTravelTime / (day.totalDuration + day.totalTravelTime || 1);
    if (travelTimeRatio > 0.5) {
      issues.push(
        `Day ${day.day}: Travel time (${Math.round(day.totalTravelTime / 60)}h) is more than 50% of total time`
      );
      details.travelTimeReasonable = false;
      details.issues.push(
        `Day ${day.day} has excessive travel time: ${Math.round(travelTimeRatio * 100)}%`
      );
    }

    details.travelTime += day.totalTravelTime;

    // Check pace consistency
    const activitiesPerDay = day.totalActivities;
    details.paceConsistency.actual = Math.max(details.paceConsistency.actual, activitiesPerDay);

    if (activitiesPerDay > expectedActivitiesPerDay) {
      issues.push(
        `Day ${day.day}: Activity count (${activitiesPerDay}) exceeds pace limit (${expectedActivitiesPerDay} for ${itinerary.pace} pace)`
      );
      details.paceConsistency.consistent = false;
      details.issues.push(
        `Day ${day.day} has ${activitiesPerDay} activities, but ${itinerary.pace} pace allows max ${expectedActivitiesPerDay}`
      );
    }

    // Check if day is marked as feasible
    if (!day.isFeasible && day.feasibilityIssues) {
      issues.push(...day.feasibilityIssues.map(issue => `Day ${day.day}: ${issue}`));
      details.issues.push(...day.feasibilityIssues);
    }
  }

  // Set expected activities
  details.paceConsistency.expected = expectedActivitiesPerDay;

  // Calculate score (0-1)
  let score = 1.0;
  if (details.dailyDuration > details.allowedTime) {
    score -= 0.3;
  }
  if (!details.travelTimeReasonable) {
    score -= 0.2;
  }
  if (!details.paceConsistency.consistent) {
    score -= 0.2;
  }
  if (issues.length > 0) {
    score -= Math.min(0.3, issues.length * 0.1);
  }
  score = Math.max(0, score);

  const passed = issues.length === 0 && score >= 0.7;

  return {
    evalType: EvalType.FEASIBILITY,
    passed,
    score,
    details,
    issues,
    metadata: {
      itineraryPace: itinerary.pace,
      totalDays: itinerary.duration,
      totalActivities: itinerary.totalActivities,
    },
  };
}

