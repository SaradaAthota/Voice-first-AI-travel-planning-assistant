/**
 * Example Usage of Itinerary Builder Tool
 * 
 * These examples demonstrate how to use the Itinerary Builder MCP tool.
 */

import { itineraryBuilderTool } from './itinerary-builder-tool';
import { ItineraryBuilderInput } from './types';
import { POI } from '../poi-search/types';

/**
 * Sample POIs for testing
 */
const samplePOIs: POI[] = [
  {
    osmId: 123456789,
    osmType: 'node',
    name: 'City Palace',
    category: 'history',
    coordinates: { lat: 26.9258, lon: 75.8236 },
    tags: { name: 'City Palace', tourism: 'attraction', historic: 'palace' },
    description: 'Historic palace complex',
  },
  {
    osmId: 987654321,
    osmType: 'node',
    name: 'Hawa Mahal',
    category: 'history',
    coordinates: { lat: 26.9239, lon: 75.8267 },
    tags: { name: 'Hawa Mahal', tourism: 'attraction', historic: 'palace' },
    description: 'Palace of Winds',
  },
  {
    osmId: 456789123,
    osmType: 'node',
    name: 'Jantar Mantar',
    category: 'history',
    coordinates: { lat: 26.9247, lon: 75.8246 },
    tags: { name: 'Jantar Mantar', tourism: 'attraction', historic: 'observatory' },
    description: 'Astronomical observatory',
  },
  {
    osmId: 789123456,
    osmType: 'node',
    name: 'Amber Fort',
    category: 'history',
    coordinates: { lat: 26.9855, lon: 75.8513 },
    tags: { name: 'Amber Fort', tourism: 'attraction', historic: 'fort' },
    description: 'Historic fort',
  },
  {
    osmId: 321654987,
    osmType: 'node',
    name: 'Laxmi Mishthan Bhandar',
    category: 'food',
    coordinates: { lat: 26.9124, lon: 75.7873 },
    tags: { name: 'Laxmi Mishthan Bhandar', amenity: 'restaurant', cuisine: 'indian' },
    description: 'Famous sweet shop',
  },
  {
    osmId: 654987321,
    osmType: 'node',
    name: 'Chokhi Dhani',
    category: 'culture',
    coordinates: { lat: 26.8500, lon: 75.8000 },
    tags: { name: 'Chokhi Dhani', tourism: 'attraction', amenity: 'restaurant' },
    description: 'Cultural village',
  },
];

/**
 * Example 1: Basic 3-day itinerary with moderate pace
 */
export async function example1_BasicItinerary() {
  const input: ItineraryBuilderInput = {
    pois: samplePOIs,
    duration: 3,
    startDate: '2024-02-15',
    pace: 'moderate',
    city: 'Jaipur',
  };

  const result = await itineraryBuilderTool.execute(input);
  console.log('Example 1 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 2: Relaxed pace itinerary
 */
export async function example2_RelaxedPace() {
  const input: ItineraryBuilderInput = {
    pois: samplePOIs,
    duration: 2,
    startDate: '2024-02-15',
    pace: 'relaxed',
    city: 'Jaipur',
  };

  const result = await itineraryBuilderTool.execute(input);
  console.log('Example 2 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 3: Fast pace itinerary
 */
export async function example3_FastPace() {
  const input: ItineraryBuilderInput = {
    pois: samplePOIs,
    duration: 2,
    startDate: '2024-02-15',
    pace: 'fast',
    city: 'Jaipur',
  };

  const result = await itineraryBuilderTool.execute(input);
  console.log('Example 3 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example request/response for documentation
 */
export const EXAMPLE_REQUEST = {
  pois: samplePOIs,
  duration: 3,
  startDate: '2024-02-15',
  pace: 'moderate',
  city: 'Jaipur',
};

export const EXAMPLE_RESPONSE = {
  success: true,
  data: {
    city: 'Jaipur',
    duration: 3,
    startDate: '2024-02-15',
    pace: 'moderate',
    days: [
      {
        day: 1,
        date: '2024-02-15',
        blocks: {
          morning: {
            block: 'morning',
            activities: [
              {
                poi: {
                  osmId: 123456789,
                  osmType: 'node',
                  name: 'City Palace',
                  category: 'history',
                  coordinates: { lat: 26.9258, lon: 75.8236 },
                  tags: { name: 'City Palace', tourism: 'attraction', historic: 'palace' },
                  description: 'Historic palace complex',
                },
                startTime: '09:00',
                endTime: '10:00',
                duration: 60,
                travelTimeFromPrevious: undefined,
                travelDistanceFromPrevious: undefined,
              },
              {
                poi: {
                  osmId: 987654321,
                  osmType: 'node',
                  name: 'Hawa Mahal',
                  category: 'history',
                  coordinates: { lat: 26.9239, lon: 75.8267 },
                  tags: { name: 'Hawa Mahal', tourism: 'attraction', historic: 'palace' },
                  description: 'Palace of Winds',
                },
                startTime: '10:20',
                endTime: '11:20',
                duration: 60,
                travelTimeFromPrevious: 20,
                travelDistanceFromPrevious: 0.2,
              },
            ],
            startTime: '09:00',
            endTime: '11:20',
            totalDuration: 120,
            travelTime: 20,
          },
          afternoon: {
            block: 'afternoon',
            activities: [
              {
                poi: {
                  osmId: 456789123,
                  osmType: 'node',
                  name: 'Jantar Mantar',
                  category: 'history',
                  coordinates: { lat: 26.9247, lon: 75.8246 },
                  tags: { name: 'Jantar Mantar', tourism: 'attraction', historic: 'observatory' },
                  description: 'Astronomical observatory',
                },
                startTime: '14:00',
                endTime: '15:00',
                duration: 60,
                travelTimeFromPrevious: undefined,
                travelDistanceFromPrevious: undefined,
              },
            ],
            startTime: '14:00',
            endTime: '15:00',
            totalDuration: 60,
            travelTime: 0,
          },
          evening: {
            block: 'evening',
            activities: [
              {
                poi: {
                  osmId: 321654987,
                  osmType: 'node',
                  name: 'Laxmi Mishthan Bhandar',
                  category: 'food',
                  coordinates: { lat: 26.9124, lon: 75.7873 },
                  tags: { name: 'Laxmi Mishthan Bhandar', amenity: 'restaurant', cuisine: 'indian' },
                  description: 'Famous sweet shop',
                },
                startTime: '19:00',
                endTime: '20:00',
                duration: 60,
                travelTimeFromPrevious: undefined,
                travelDistanceFromPrevious: undefined,
              },
            ],
            startTime: '19:00',
            endTime: '20:00',
            totalDuration: 60,
            travelTime: 0,
          },
        },
        totalActivities: 4,
        totalTravelTime: 20,
        totalDuration: 240,
        isFeasible: true,
        feasibilityIssues: undefined,
      },
      {
        day: 2,
        date: '2024-02-16',
        blocks: {
          morning: {
            block: 'morning',
            activities: [
              {
                poi: {
                  osmId: 789123456,
                  osmType: 'node',
                  name: 'Amber Fort',
                  category: 'history',
                  coordinates: { lat: 26.9855, lon: 75.8513 },
                  tags: { name: 'Amber Fort', tourism: 'attraction', historic: 'fort' },
                  description: 'Historic fort',
                },
                startTime: '09:00',
                endTime: '11:00',
                duration: 120,
                travelTimeFromPrevious: undefined,
                travelDistanceFromPrevious: undefined,
              },
            ],
            startTime: '09:00',
            endTime: '11:00',
            totalDuration: 120,
            travelTime: 0,
          },
        },
        totalActivities: 1,
        totalTravelTime: 0,
        totalDuration: 120,
        isFeasible: true,
        feasibilityIssues: undefined,
      },
      {
        day: 3,
        date: '2024-02-17',
        blocks: {
          morning: {
            block: 'morning',
            activities: [
              {
                poi: {
                  osmId: 654987321,
                  osmType: 'node',
                  name: 'Chokhi Dhani',
                  category: 'culture',
                  coordinates: { lat: 26.8500, lon: 75.8000 },
                  tags: { name: 'Chokhi Dhani', tourism: 'attraction', amenity: 'restaurant' },
                  description: 'Cultural village',
                },
                startTime: '09:00',
                endTime: '12:00',
                duration: 180,
                travelTimeFromPrevious: undefined,
                travelDistanceFromPrevious: undefined,
              },
            ],
            startTime: '09:00',
            endTime: '12:00',
            totalDuration: 180,
            travelTime: 0,
          },
        },
        totalActivities: 1,
        totalTravelTime: 0,
        totalDuration: 180,
        isFeasible: true,
        feasibilityIssues: undefined,
      },
    ],
    totalPOIs: 6,
    totalActivities: 6,
    metadata: {
      createdAt: '2024-01-15T10:30:00.000Z',
      version: 1,
      isEdit: false,
      editTarget: undefined,
    },
  },
  citations: [
    {
      source: 'OpenStreetMap',
      url: 'https://www.openstreetmap.org',
      excerpt: 'Itinerary built from OpenStreetMap POI data for Jaipur',
      confidence: 1.0,
    },
  ],
};

