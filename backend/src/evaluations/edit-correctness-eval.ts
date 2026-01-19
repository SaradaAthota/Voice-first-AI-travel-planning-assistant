/**
 * Edit Correctness Evaluation
 * 
 * Evaluates if edits only modified the target section.
 * 
 * Checks:
 * - Only target day/block was modified
 * - All other days remain unchanged
 * - No unintended changes
 */

import { EvalResult, EvalType, EditCorrectnessDetails } from './types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { checkDiff } from '../mcp-tools/itinerary-editor/diff-checker';

/**
 * Evaluate edit correctness
 */
export function evaluateEditCorrectness(
  original: ItineraryOutput,
  edited: ItineraryOutput,
  targetDay: number,
  targetBlock?: 'morning' | 'afternoon' | 'evening'
): EvalResult {
  const issues: string[] = [];

  // Use diff checker to verify only target changed
  const diffCheck = checkDiff(original, edited, targetDay, targetBlock);

  const details: EditCorrectnessDetails = {
    targetDay,
    targetBlock,
    unchangedDays: diffCheck.unchangedDays,
    changedDays: diffCheck.changedDays,
    violations: diffCheck.violations || [],
    onlyTargetModified: diffCheck.isValid,
  };

  // Check if only target day was changed
  const expectedChangedDays = [targetDay];
  const unexpectedChangedDays = diffCheck.changedDays.filter(
    day => !expectedChangedDays.includes(day)
  );

  if (unexpectedChangedDays.length > 0) {
    issues.push(
      `Unexpected days were modified: ${unexpectedChangedDays.join(', ')}`
    );
  }

  // Check for violations
  if (diffCheck.violations && diffCheck.violations.length > 0) {
    issues.push(...diffCheck.violations);
  }

  // Check if unchanged days are actually unchanged
  const expectedUnchangedDays = original.days
    .map(d => d.day)
    .filter(d => d !== targetDay);

  const missingUnchanged = expectedUnchangedDays.filter(
    day => !diffCheck.unchangedDays.includes(day)
  );

  if (missingUnchanged.length > 0) {
    issues.push(
      `Days that should be unchanged were modified: ${missingUnchanged.join(', ')}`
    );
  }

  // Calculate score (0-1)
  let score = 1.0;
  if (unexpectedChangedDays.length > 0) {
    score -= 0.4;
  }
  if (diffCheck.violations && diffCheck.violations.length > 0) {
    score -= Math.min(0.4, diffCheck.violations.length * 0.1);
  }
  if (missingUnchanged.length > 0) {
    score -= 0.2;
  }
  score = Math.max(0, score);

  const passed = diffCheck.isValid && issues.length === 0 && score >= 0.8;

  return {
    evalType: EvalType.EDIT_CORRECTNESS,
    passed,
    score,
    details,
    issues,
    metadata: {
      originalVersion: original.metadata.version,
      editedVersion: edited.metadata.version,
      targetDay,
      targetBlock,
    },
  };
}

