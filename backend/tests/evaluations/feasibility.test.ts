/**
 * Evaluation Test Cases: Feasibility
 */

import { evaluateFeasibility } from '../../src/evaluations/feasibility-eval';
import { ItineraryOutput } from '../../src/mcp-tools/itinerary-builder/types';

describe('Feasibility Evaluation', () => {
  describe('Daily Duration Check', () => {
    it('should pass when daily duration is within 12 hours', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'moderate',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 3,
            totalTravelTime: 60,
            totalDuration: 600, // 10 hours
            isFeasible: true,
          },
        ],
        totalPOIs: 3,
        totalActivities: 3,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.passed).toBe(true);
      expect(result.details.dailyDuration).toBeLessThanOrEqual(720); // 12 hours
    });

    it('should fail when daily duration exceeds 12 hours', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'moderate',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 10,
            totalTravelTime: 120,
            totalDuration: 900, // 15 hours
            isFeasible: false,
            feasibilityIssues: ['Exceeds time limit'],
          },
        ],
        totalPOIs: 10,
        totalActivities: 10,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Travel Time Check', () => {
    it('should pass when travel time is reasonable', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'moderate',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 3,
            totalTravelTime: 60, // 1 hour
            totalDuration: 600, // 10 hours total
            isFeasible: true,
          },
        ],
        totalPOIs: 3,
        totalActivities: 3,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.details.travelTimeReasonable).toBe(true);
    });

    it('should fail when travel time exceeds 50% of total', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'moderate',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 3,
            totalTravelTime: 400, // 6.67 hours
            totalDuration: 300, // 5 hours activity time, total = 700 minutes (57% travel time)
            isFeasible: false,
            feasibilityIssues: ['Excessive travel time'],
          },
        ],
        totalPOIs: 3,
        totalActivities: 3,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.details.travelTimeReasonable).toBe(false);
    });
  });

  describe('Pace Consistency', () => {
    it('should pass when activities match pace', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'moderate',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 5, // Moderate pace allows 4-6
            totalTravelTime: 60,
            totalDuration: 600,
            isFeasible: true,
          },
        ],
        totalPOIs: 5,
        totalActivities: 5,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.details.paceConsistency.consistent).toBe(true);
    });

    it('should fail when activities exceed pace limit', () => {
      const itinerary: ItineraryOutput = {
        city: 'Jaipur',
        duration: 1,
        startDate: '2024-01-15',
        pace: 'relaxed',
        days: [
          {
            day: 1,
            date: '2024-01-15',
            blocks: {},
            totalActivities: 8, // Relaxed pace allows max 4
            totalTravelTime: 60,
            totalDuration: 600,
            isFeasible: false,
          },
        ],
        totalPOIs: 8,
        totalActivities: 8,
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: false,
        },
      };

      const result = evaluateFeasibility(itinerary);
      expect(result.details.paceConsistency.consistent).toBe(false);
    });
  });
});

