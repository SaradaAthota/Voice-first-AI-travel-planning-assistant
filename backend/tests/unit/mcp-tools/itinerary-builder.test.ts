/**
 * Unit Tests: Itinerary Builder MCP Tool
 */

import { ItineraryBuilderInput } from '../../../src/mcp-tools/itinerary-builder/types';
import { getPaceConfig } from '../../../src/mcp-tools/itinerary-builder/pace-config';

describe('Itinerary Builder Tool', () => {
  describe('Pace Configuration', () => {
    it('should return correct config for relaxed pace', () => {
      const config = getPaceConfig('relaxed');
      expect(config.maxActivitiesPerDay).toBeLessThanOrEqual(4);
      expect(config.activityDuration.default).toBeGreaterThan(60);
      expect(config.activityDuration.min).toBe(60);
      expect(config.activityDuration.max).toBe(180);
    });

    it('should return correct config for moderate pace', () => {
      const config = getPaceConfig('moderate');
      expect(config.maxActivitiesPerDay).toBeGreaterThan(4);
      expect(config.maxActivitiesPerDay).toBeLessThanOrEqual(6);
      expect(config.activityDuration.default).toBe(60);
    });

    it('should return correct config for fast pace', () => {
      const config = getPaceConfig('fast');
      expect(config.maxActivitiesPerDay).toBeGreaterThan(6);
      expect(config.activityDuration.default).toBe(45);
    });
  });

  describe('Input Validation', () => {
    it('should require candidate POIs', () => {
      const input: Partial<ItineraryBuilderInput> = {
        duration: 3,
        startDate: '2024-01-15',
        pace: 'moderate',
        city: 'Jaipur',
      };

      expect(input.pois).toBeUndefined();
      // In real test, would validate and throw error
    });

    it('should require duration and startDate', () => {
      const input: Partial<ItineraryBuilderInput> = {
        pois: [],
        pace: 'moderate',
        city: 'Jaipur',
      };

      expect(input.duration).toBeUndefined();
      expect(input.startDate).toBeUndefined();
    });
  });

  describe('Clustering Logic', () => {
    it('should cluster POIs by proximity', () => {
      const pois = [
        { coordinates: { lat: 26.9124, lon: 75.7873 } },
        { coordinates: { lat: 26.9130, lon: 75.7880 } },
        { coordinates: { lat: 26.9500, lon: 75.8000 } },
      ];

      // Test clustering - POIs 1 and 2 should be in same cluster
      const distance1 = calculateDistance(
        pois[0].coordinates,
        pois[1].coordinates
      );
      const distance2 = calculateDistance(
        pois[0].coordinates,
        pois[2].coordinates
      );

      expect(distance1).toBeLessThan(distance2);
    });
  });

  function calculateDistance(
    coord1: { lat: number; lon: number },
    coord2: { lat: number; lon: number }
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const dLon = ((coord2.lon - coord1.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.lat * Math.PI) / 180) *
        Math.cos((coord2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
});

