/**
 * Evaluation Types
 */

/**
 * Evaluation types
 */
export enum EvalType {
  FEASIBILITY = 'feasibility',
  EDIT_CORRECTNESS = 'edit_correctness',
  GROUNDING = 'grounding',
}

/**
 * Evaluation result
 */
export interface EvalResult {
  evalType: EvalType;
  passed: boolean;
  score?: number; // 0-1 score
  details: Record<string, any>;
  issues: string[];
  metadata?: Record<string, any>;
}

/**
 * Feasibility evaluation details
 */
export interface FeasibilityDetails {
  dailyDuration: number; // Minutes
  allowedTime: number; // Minutes (max 12 hours = 720 minutes)
  travelTime: number; // Minutes
  travelTimeReasonable: boolean;
  paceConsistency: {
    expected: number; // Expected activities per day based on pace
    actual: number; // Actual activities per day
    consistent: boolean;
  };
  issues: string[];
}

/**
 * Edit correctness evaluation details
 */
export interface EditCorrectnessDetails {
  targetDay: number;
  targetBlock?: string;
  unchangedDays: number[];
  changedDays: number[];
  violations: string[];
  onlyTargetModified: boolean;
}

/**
 * Grounding evaluation details
 */
export interface GroundingDetails {
  poisChecked: number;
  poisWithOSMIds: number;
  allPOIsMapped: boolean;
  ragCitationsPresent: boolean;
  ragCitationsCount: number;
  missingDataExplicitlyStated: boolean;
  issues: string[];
}

/**
 * Evaluation context
 */
export interface EvalContext {
  tripId: string;
  itineraryId?: string;
  originalItinerary?: any; // For edit correctness
  editedItinerary?: any; // For edit correctness
  editTarget?: {
    day?: number;
    block?: string;
  };
}

