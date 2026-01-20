/**
 * Types for Itinerary Builder MCP Tool
 */

import { POI } from '../poi-search/types';

/**
 * Input to Itinerary Builder tool
 */
export interface ItineraryBuilderInput {
  pois: POI[];                         // Candidate POIs from POI Search
  duration: number;                    // Number of days
  startDate: string;                    // ISO date string
  pace: 'relaxed' | 'moderate' | 'fast';
  city: string;
  tripId?: string;                     // For editing existing itinerary
  editTarget?: {
    day?: number;                      // Which day to edit (1-indexed)
    block?: 'morning' | 'afternoon' | 'evening';
    type?: 'relax' | 'swap' | 'add' | 'remove' | 'reduce_travel';
    poiName?: string;                  // POI name for remove/add operations
  };
}

/**
 * Time block in a day
 */
export type TimeBlock = 'morning' | 'afternoon' | 'evening';

/**
 * Activity in the itinerary
 */
export interface Activity {
  poi: POI;
  startTime: string;                   // ISO time string (HH:MM)
  endTime: string;                     // ISO time string (HH:MM)
  duration: number;                    // Minutes
  travelTimeFromPrevious?: number;      // Minutes to reach this activity
  travelDistanceFromPrevious?: number; // Kilometers
  notes?: string;                      // Optional notes
}

/**
 * Day block (morning/afternoon/evening)
 */
export interface DayBlock {
  block: TimeBlock;
  activities: Activity[];
  startTime: string;                   // ISO time string
  endTime: string;                     // ISO time string
  totalDuration: number;              // Minutes
  travelTime: number;                  // Total travel time in block (minutes)
}

/**
 * Day in the itinerary
 */
export interface ItineraryDay {
  day: number;                         // Day number (1-indexed)
  date: string;                         // ISO date string
  blocks: {
    morning?: DayBlock;
    afternoon?: DayBlock;
    evening?: DayBlock;
  };
  totalActivities: number;
  totalTravelTime: number;             // Minutes
  totalDuration: number;               // Minutes
  isFeasible: boolean;                 // Whether the day is feasible
  feasibilityIssues?: string[];        // Issues if not feasible
}

/**
 * Itinerary output
 */
export interface ItineraryOutput {
  city: string;
  duration: number;                    // Days
  startDate: string;
  pace: 'relaxed' | 'moderate' | 'fast';
  days: ItineraryDay[];
  totalPOIs: number;
  totalActivities: number;
  metadata: {
    createdAt: string;
    version: number;
    isEdit: boolean;
    editTarget?: ItineraryBuilderInput['editTarget'];
  };
}

