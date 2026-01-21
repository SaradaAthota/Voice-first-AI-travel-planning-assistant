/**
 * Types for Itinerary Editor MCP Tool
 */

import { ItineraryOutput } from '../itinerary-builder/types';
import { POI } from '../poi-search/types';

/**
 * Edit instruction types
 */
export type EditType = 'relax' | 'swap' | 'add' | 'remove' | 'reduce_travel';

/**
 * Edit parameters
 */
export interface EditParams {
  // For 'swap': new POI to swap in (for activity swap)
  newPOI?: POI;
  // For 'swap': day number to swap with (for day swap)
  swapDay?: number;
  // For 'add': POI to add
  poiToAdd?: POI;
  // For 'remove': activity index or POI ID
  activityIndex?: number;
  poiIdToRemove?: number;
  // For 'relax': reduce activities or increase duration
  reduceActivities?: boolean;
  increaseDuration?: number;          // Minutes
  // For 'reduce_travel': optimize route
  optimizeRoute?: boolean;
  // For 'reduce_travel': target travel time in minutes
  targetTravelTime?: number;
}

/**
 * Input to Itinerary Editor tool
 */
export interface ItineraryEditorInput {
  itinerary: ItineraryOutput;          // Existing itinerary
  editType: EditType;                   // Type of edit
  targetDay: number;                    // Day to edit (1-indexed)
  targetBlock?: 'morning' | 'afternoon' | 'evening';  // Optional: specific block
  editParams?: EditParams;
  tripId: string;                        // Required for versioning
}

/**
 * Edit result
 */
export interface EditResult {
  success: boolean;
  editedItinerary?: ItineraryOutput;
  changes?: EditChanges;
  error?: string;
  feasibilityCheck?: {
    passed: boolean;
    issues?: string[];
  };
}

/**
 * Changes made by edit
 */
export interface EditChanges {
  dayModified: number;
  blockModified?: 'morning' | 'afternoon' | 'evening';
  editType: EditType;
  activitiesAdded?: number;
  activitiesRemoved?: number;
  activitiesModified?: number;
  travelTimeReduced?: number;           // Minutes
  description: string;
}

/**
 * Diff check result
 */
export interface DiffCheckResult {
  isValid: boolean;
  unchangedDays: number[];              // Days that should be unchanged
  changedDays: number[];                // Days that were changed
  violations?: string[];                 // If isValid is false
}

