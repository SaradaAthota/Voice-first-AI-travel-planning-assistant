/**
 * Types for POI Search MCP Tool
 */

/**
 * Input to POI Search tool
 */
export interface POISearchInput {
  city: string;
  interests?: string[];              // e.g., ['food', 'culture', 'history']
  constraints?: string[];             // Special requirements
  pace?: 'relaxed' | 'moderate' | 'fast';
  limit?: number;                     // Max number of POIs to return (default: 50)
}

/**
 * POI data structure returned from OSM
 */
export interface POI {
  osmId: number;                      // OSM node/way/relation ID
  osmType: 'node' | 'way' | 'relation';
  name: string;
  category: string;                   // e.g., 'tourism', 'historic', 'food'
  coordinates: {
    lat: number;
    lon: number;
  };
  tags: Record<string, string>;        // OSM tags
  description?: string;                // Extracted from tags
  rating?: number;                     // If available from tags
}

/**
 * POI Search output
 */
export interface POISearchOutput {
  pois: POI[];
  city: string;
  totalFound: number;
  categories: string[];               // Categories found
  queryMetadata: {
    interests: string[];
    osmTagsQueried: string[];
    timestamp: string;
  };
}

