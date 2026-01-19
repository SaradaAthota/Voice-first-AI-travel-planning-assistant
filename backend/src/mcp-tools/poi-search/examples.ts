/**
 * Example Usage of POI Search Tool
 * 
 * These examples demonstrate how to use the POI Search MCP tool.
 * Note: These are for documentation/testing purposes.
 */

import { poiSearchTool } from './poi-search-tool';
import { POISearchInput } from './types';

/**
 * Example 1: Basic POI search for a city
 */
export async function example1_BasicSearch() {
  const input: POISearchInput = {
    city: 'Jaipur',
    limit: 20,
  };

  const result = await poiSearchTool.execute(input);
  console.log('Example 1 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 2: Search with interests
 */
export async function example2_SearchWithInterests() {
  const input: POISearchInput = {
    city: 'Jaipur',
    interests: ['food', 'culture', 'history'],
    pace: 'moderate',
    limit: 30,
  };

  const result = await poiSearchTool.execute(input);
  console.log('Example 2 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 3: Food-focused search
 */
export async function example3_FoodSearch() {
  const input: POISearchInput = {
    city: 'Jaipur',
    interests: ['food', 'restaurant', 'cafe'],
    limit: 15,
  };

  const result = await poiSearchTool.execute(input);
  console.log('Example 3 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 4: Culture and history search
 */
export async function example4_CultureHistorySearch() {
  const input: POISearchInput = {
    city: 'Jaipur',
    interests: ['culture', 'history', 'museum'],
    pace: 'relaxed',
    limit: 25,
  };

  const result = await poiSearchTool.execute(input);
  console.log('Example 4 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 5: Error handling (invalid city)
 */
export async function example5_ErrorHandling() {
  const input: POISearchInput = {
    city: 'NonExistentCity12345',
    limit: 10,
  };

  const result = await poiSearchTool.execute(input);
  console.log('Example 5 Result (should have error):', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example request/response for documentation
 */
export const EXAMPLE_REQUEST = {
  city: 'Jaipur',
  interests: ['food', 'culture', 'history'],
  pace: 'moderate',
  limit: 30,
};

export const EXAMPLE_RESPONSE = {
  success: true,
  data: {
    pois: [
      {
        osmId: 123456789,
        osmType: 'node',
        name: 'City Palace',
        category: 'history',
        coordinates: {
          lat: 26.9258,
          lon: 75.8236,
        },
        tags: {
          name: 'City Palace',
          tourism: 'attraction',
          historic: 'palace',
          wikidata: 'Q123456',
        },
        description: 'attraction - City Palace',
      },
      {
        osmId: 987654321,
        osmType: 'node',
        name: 'Hawa Mahal',
        category: 'history',
        coordinates: {
          lat: 26.9239,
          lon: 75.8267,
        },
        tags: {
          name: 'Hawa Mahal',
          tourism: 'attraction',
          historic: 'palace',
        },
        description: 'attraction - Hawa Mahal',
      },
    ],
    city: 'Jaipur',
    totalFound: 25,
    categories: ['history', 'culture', 'food'],
    queryMetadata: {
      interests: ['food', 'culture', 'history'],
      osmTagsQueried: [
        'amenity=restaurant',
        'amenity=cafe',
        'tourism=museum',
        'tourism=gallery',
        'historic=*',
      ],
      timestamp: '2024-01-15T10:30:00.000Z',
    },
  },
  citations: [
    {
      source: 'OpenStreetMap',
      url: 'https://www.openstreetmap.org',
      excerpt: 'POI data from OpenStreetMap for Jaipur',
      confidence: 1.0,
    },
  ],
};

