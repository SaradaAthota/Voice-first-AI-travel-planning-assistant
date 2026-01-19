/**
 * Overpass API Client
 * 
 * Handles queries to OpenStreetMap Overpass API.
 * 
 * Rules:
 * - Deterministic logic only (no LLM)
 * - Uses Overpass QL for queries
 * - Handles rate limiting and errors
 */

/**
 * Overpass API endpoint
 * Using the public instance - in production, consider using a dedicated instance
 */
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Alternative endpoints (for fallback)
 */
const OVERPASS_ALTERNATIVES = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  center?: {
    lat: number;
    lon: number;
  };
}

/**
 * Execute Overpass QL query
 * 
 * @param query Overpass QL query string
 * @returns Parsed response from Overpass API
 */
export async function executeOverpassQuery(
  query: string
): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  // Try primary endpoint first, then alternatives
  const endpoints = [OVERPASS_API_URL, ...OVERPASS_ALTERNATIVES];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        // Timeout after 30 seconds
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response structure
      const responseData = data as { elements?: any[] };
      if (!responseData.elements || !Array.isArray(responseData.elements)) {
        throw new Error('Invalid Overpass API response structure');
      }

      return data as OverpassResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Overpass endpoint ${endpoint} failed, trying next...`, lastError.message);
      continue;
    }
  }

  // All endpoints failed
  throw new Error(
    `All Overpass API endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Get city bounding box using Nominatim (OpenStreetMap geocoding)
 * 
 * This is used to find the area to search for POIs
 */
export async function getCityBoundingBox(cityName: string): Promise<{
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}> {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`;

  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'VoiceTravelAssistant/1.0', // Required by Nominatim
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json() as any[];

    if (!data || data.length === 0) {
      throw new Error(`City "${cityName}" not found`);
    }

    const result = data[0];
    const boundingBox = result.boundingbox;

    if (!boundingBox || boundingBox.length !== 4) {
      throw new Error(`Invalid bounding box for city "${cityName}"`);
    }

    return {
      minLat: parseFloat(boundingBox[0]),
      maxLat: parseFloat(boundingBox[1]),
      minLon: parseFloat(boundingBox[2]),
      maxLon: parseFloat(boundingBox[3]),
    };
  } catch (error) {
    throw new Error(
      `Failed to get bounding box for city "${cityName}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

