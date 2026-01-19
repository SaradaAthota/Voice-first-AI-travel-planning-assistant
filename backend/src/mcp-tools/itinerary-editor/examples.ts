/**
 * Example Usage of Itinerary Editor Tool
 * 
 * These examples demonstrate how to use the Itinerary Editor MCP tool.
 */

import { itineraryEditorTool } from './itinerary-editor-tool';
import { ItineraryEditorInput } from './types';
import { ItineraryOutput } from '../itinerary-builder/types';
import { POI } from '../poi-search/types';

/**
 * Sample itinerary for testing
 */
const sampleItinerary: ItineraryOutput = {
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
                tags: { name: 'City Palace' },
              },
              startTime: '09:00',
              endTime: '10:00',
              duration: 60,
            },
            {
              poi: {
                osmId: 987654321,
                osmType: 'node',
                name: 'Hawa Mahal',
                category: 'history',
                coordinates: { lat: 26.9239, lon: 75.8267 },
                tags: { name: 'Hawa Mahal' },
              },
              startTime: '10:20',
              endTime: '11:20',
              duration: 60,
              travelTimeFromPrevious: 20,
            },
          ],
          startTime: '09:00',
          endTime: '11:20',
          totalDuration: 120,
          travelTime: 20,
        },
      },
      totalActivities: 2,
      totalTravelTime: 20,
      totalDuration: 120,
      isFeasible: true,
    },
  ],
  totalPOIs: 2,
  totalActivities: 2,
  metadata: {
    createdAt: '2024-01-15T10:30:00.000Z',
    version: 1,
    isEdit: false,
  },
};

/**
 * Example 1: Relax a block (reduce activities)
 */
export async function example1_RelaxBlock() {
  const input: ItineraryEditorInput = {
    itinerary: sampleItinerary,
    editType: 'relax',
    targetDay: 1,
    targetBlock: 'morning',
    editParams: {
      reduceActivities: true,
    },
    tripId: 'test-trip-id',
  };

  const result = await itineraryEditorTool.execute(input);
  console.log('Example 1 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 2: Swap an activity
 */
export async function example2_SwapActivity() {
  const newPOI: POI = {
    osmId: 456789123,
    osmType: 'node',
    name: 'Jantar Mantar',
    category: 'history',
    coordinates: { lat: 26.9247, lon: 75.8246 },
    tags: { name: 'Jantar Mantar' },
  };

  const input: ItineraryEditorInput = {
    itinerary: sampleItinerary,
    editType: 'swap',
    targetDay: 1,
    targetBlock: 'morning',
    editParams: {
      newPOI,
      activityIndex: 1, // Swap second activity
    },
    tripId: 'test-trip-id',
  };

  const result = await itineraryEditorTool.execute(input);
  console.log('Example 2 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 3: Add an activity
 */
export async function example3_AddActivity() {
  const newPOI: POI = {
    osmId: 789123456,
    osmType: 'node',
    name: 'Amber Fort',
    category: 'history',
    coordinates: { lat: 26.9855, lon: 75.8513 },
    tags: { name: 'Amber Fort' },
  };

  const input: ItineraryEditorInput = {
    itinerary: sampleItinerary,
    editType: 'add',
    targetDay: 1,
    targetBlock: 'morning',
    editParams: {
      poiToAdd: newPOI,
    },
    tripId: 'test-trip-id',
  };

  const result = await itineraryEditorTool.execute(input);
  console.log('Example 3 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 4: Remove an activity
 */
export async function example4_RemoveActivity() {
  const input: ItineraryEditorInput = {
    itinerary: sampleItinerary,
    editType: 'remove',
    targetDay: 1,
    targetBlock: 'morning',
    editParams: {
      activityIndex: 1, // Remove second activity
    },
    tripId: 'test-trip-id',
  };

  const result = await itineraryEditorTool.execute(input);
  console.log('Example 4 Result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Example 5: Reduce travel time (optimize route)
 */
export async function example5_ReduceTravel() {
  const input: ItineraryEditorInput = {
    itinerary: sampleItinerary,
    editType: 'reduce_travel',
    targetDay: 1,
    targetBlock: 'morning',
    editParams: {
      optimizeRoute: true,
    },
    tripId: 'test-trip-id',
  };

  const result = await itineraryEditorTool.execute(input);
  console.log('Example 5 Result:', JSON.stringify(result, null, 2));
  return result;
}

