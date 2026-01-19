/**
 * Explanation Response Types
 * 
 * JSON structure for explanation responses.
 */

import { Citation } from './types';
import { POIMetadata } from './ExplanationComposer';

/**
 * Explanation response structure
 */
export interface ExplanationResponse {
  explanation: string; // Text explanation (for voice/TTS)
  citations: Citation[]; // Citations for UI display
  dataSources: {
    hasPOIData: boolean;
    hasRAGData: boolean;
    hasConstraints: boolean;
  };
  poiMetadata?: POIMetadata;
  constraints?: {
    pace?: string;
    weather?: string;
  };
  metadata: {
    tripId?: string;
    timestamp: string;
    question: string;
  };
}

/**
 * Explanation request structure
 */
export interface ExplanationRequestInput {
  question: string;
  tripId?: string;
  poiId?: number; // OSM ID of POI
  poiName?: string;
  constraints?: {
    pace?: 'relaxed' | 'moderate' | 'fast';
    weather?: string;
  };
}

