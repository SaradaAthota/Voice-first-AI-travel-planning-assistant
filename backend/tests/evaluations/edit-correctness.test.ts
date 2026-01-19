/**
 * Evaluation Test Cases: Edit Correctness
 */

import { evaluateEditCorrectness } from '../../src/evaluations/edit-correctness-eval';
import { ItineraryOutput } from '../../src/mcp-tools/itinerary-builder/types';

describe('Edit Correctness Evaluation', () => {
  const createBaseItinerary = (): ItineraryOutput => ({
    city: 'Jaipur',
    duration: 3,
    startDate: '2024-01-15',
    pace: 'moderate',
    days: [
      {
        day: 1,
        date: '2024-01-15',
        blocks: {
          morning: {
            block: 'morning',
            startTime: '09:00',
            endTime: '12:00',
            activities: [
              {
                poi: { osmId: 1, osmType: 'node', name: 'POI 1', category: 'tourism', coordinates: { lat: 0, lon: 0 }, tags: {} },
                startTime: '09:00',
                endTime: '11:00',
                duration: 120,
              },
            ],
            totalDuration: 120,
            travelTime: 0,
          },
        },
        totalActivities: 1,
        totalTravelTime: 0,
        totalDuration: 120,
        isFeasible: true,
      },
      {
        day: 2,
        date: '2024-01-16',
        blocks: {},
        totalActivities: 0,
        totalTravelTime: 0,
        totalDuration: 0,
        isFeasible: true,
      },
      {
        day: 3,
        date: '2024-01-17',
        blocks: {},
        totalActivities: 0,
        totalTravelTime: 0,
        totalDuration: 0,
        isFeasible: true,
      },
    ],
    totalPOIs: 1,
    totalActivities: 1,
    metadata: {
      createdAt: new Date().toISOString(),
      version: 1,
      isEdit: false,
    },
  });

  it('should pass when only target day is modified', () => {
    const original = createBaseItinerary();
    const edited = JSON.parse(JSON.stringify(original));
    
    // Modify only day 1
    edited.days[0].blocks.morning!.activities.push({
      poi: { osmId: 2, osmType: 'node', name: 'POI 2', category: 'tourism', coordinates: { lat: 0, lon: 0 }, tags: {} },
      startTime: '11:00',
      endTime: '12:00',
      duration: 60,
    });
    edited.metadata.version = 2;

    const result = evaluateEditCorrectness(original, edited, 1);
    expect(result.passed).toBe(true);
    expect(result.details.onlyTargetModified).toBe(true);
  });

  it('should fail when non-target days are modified', () => {
    const original = createBaseItinerary();
    const edited = JSON.parse(JSON.stringify(original));
    
    // Modify day 1 (target) and day 2 (should not be modified)
    edited.days[0].blocks.morning!.activities.push({
      poi: { osmId: 2, osmType: 'node', name: 'POI 2', category: 'tourism', coordinates: { lat: 0, lon: 0 }, tags: {} },
      startTime: '11:00',
      endTime: '12:00',
      duration: 60,
    });
    edited.days[1].blocks.morning = {
      block: 'morning',
      startTime: '09:00',
      endTime: '12:00',
      activities: [],
      totalDuration: 0,
      travelTime: 0,
    };
    edited.metadata.version = 2;

    const result = evaluateEditCorrectness(original, edited, 1);
    expect(result.passed).toBe(false);
    expect(result.details.changedDays).toContain(2);
  });

  it('should pass when only target block is modified', () => {
    const original = createBaseItinerary();
    const edited = JSON.parse(JSON.stringify(original));
    
    // Modify only morning block of day 1
    edited.days[0].blocks.morning!.activities[0].poi.name = 'Modified POI';
    edited.metadata.version = 2;

    const result = evaluateEditCorrectness(original, edited, 1, 'morning');
    expect(result.passed).toBe(true);
  });
});

