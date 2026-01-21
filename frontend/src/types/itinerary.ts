/**
 * Itinerary Types
 * 
 * Matches backend JSON structure
 */

export interface POI {
  osmId: number;
  osmType: 'node' | 'way' | 'relation';
  name: string;
  category: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  tags: Record<string, string>;
  description?: string;
  rating?: number;
}

export interface Activity {
  poi: POI;
  startTime: string;
  endTime: string;
  duration: number;
  travelTimeFromPrevious?: number;
  travelDistanceFromPrevious?: number;
  notes?: string;
}

export interface DayBlock {
  block: 'morning' | 'afternoon' | 'evening';
  activities: Activity[];
  startTime: string;
  endTime: string;
  totalDuration: number;
  travelTime: number;
}

export interface ItineraryDay {
  day: number;
  date: string;
  blocks: {
    morning?: DayBlock;
    afternoon?: DayBlock;
    evening?: DayBlock;
  };
  totalActivities: number;
  totalTravelTime: number;
  totalDuration: number;
  isFeasible: boolean;
  feasibilityIssues?: string[];
}

export interface ItineraryOutput {
  city: string;
  duration: number;
  startDate: string | null; // Can be null if not provided by user
  pace: 'relaxed' | 'moderate' | 'fast';
  days: ItineraryDay[];
  totalPOIs: number;
  totalActivities: number;
  metadata: {
    createdAt: string;
    version: number;
    isEdit: boolean;
  };
}

export interface Citation {
  source: string;
  url?: string;
  excerpt?: string;
  confidence?: number;
}

