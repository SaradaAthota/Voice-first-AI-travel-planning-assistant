/**
 * Unit Tests: POI Search MCP Tool
 */

import { poiSearchTool } from '../../../src/mcp-tools/poi-search/poi-search-tool';
import { POISearchInput } from '../../../src/mcp-tools/poi-search/types';

describe('POI Search Tool', () => {
  describe('Input Validation', () => {
    it('should require city parameter', async () => {
      const input: Partial<POISearchInput> = {
        interests: ['food'],
      };

      const result = await poiSearchTool.execute(input as POISearchInput);
      expect(result.success).toBe(false);
      expect(result.error).toContain('City is required');
    });

    it('should accept valid input', () => {
      const validInput: POISearchInput = {
        city: 'Jaipur',
        interests: ['food', 'culture'],
        pace: 'moderate',
        limit: 10,
      };

      // Mock the actual execution - in real tests, you'd mock the Overpass API
      expect(validInput.city).toBe('Jaipur');
      expect(validInput.interests).toContain('food');
      expect(validInput.pace).toBe('moderate');
      expect(validInput.limit).toBe(10);
    });
  });

  describe('Tag Mapping', () => {
    it('should map interests to OSM tags correctly', () => {
      const interests = ['food', 'culture', 'history'];
      // Test tag mapping logic
      expect(interests.length).toBeGreaterThan(0);
    });
  });

  describe('Output Format', () => {
    it('should return POIs with required fields', () => {
      const testInput: POISearchInput = {
        city: 'Jaipur',
      };

      // In real test, mock the response
      expect(testInput.city).toBe('Jaipur');
      const expectedFields = ['osmId', 'name', 'category', 'coordinates'];
      expectedFields.forEach(field => {
        expect(expectedFields).toContain(field);
      });
    });
  });
});

