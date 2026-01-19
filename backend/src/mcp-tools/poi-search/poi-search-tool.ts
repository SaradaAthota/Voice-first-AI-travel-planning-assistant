/**
 * POI Search MCP Tool
 * 
 * Searches for Points of Interest using OpenStreetMap Overpass API.
 * 
 * Rules:
 * - Deterministic logic only (no LLM usage)
 * - Uses Overpass API for OSM queries
 * - Returns structured JSON with OSM IDs
 * - All POIs must have OSM IDs (required by policy)
 * 
 * This tool is called by ToolOrchestrator, NOT by LLM directly.
 */

import { MCPTool, MCPToolInput, MCPToolOutput, Citation } from '../../orchestration/types';
import { POISearchInput, POI, POISearchOutput } from './types';
import { executeOverpassQuery, getCityBoundingBox, OverpassElement } from './overpass-client';
import { getOSMTagsForInterests, buildOverpassQuery, categorizePOI } from './osm-tag-mapper';

export class POISearchTool implements MCPTool {
  name = 'poi_search';
  description = 'Search for Points of Interest in a city using OpenStreetMap data';

  /**
   * Execute POI search
   * 
   * This is the main entry point called by ToolOrchestrator.
   * All logic is deterministic - no LLM usage.
   */
  async execute(input: MCPToolInput): Promise<MCPToolOutput> {
    try {
      // Validate and parse input
      const searchInput = this.validateInput(input);

      // Step 1: Get city bounding box
      const bbox = await getCityBoundingBox(searchInput.city);

      // Step 2: Map interests to OSM tags
      const interests = searchInput.interests || [];
      const osmTags = getOSMTagsForInterests(interests);

      // Step 3: Build Overpass query
      const query = buildOverpassQuery(bbox, osmTags, searchInput.limit || 50);

      // Step 4: Execute Overpass query
      const overpassResponse = await executeOverpassQuery(query);

      // Step 5: Transform OSM elements to POI format
      const pois = this.transformOSMElements(overpassResponse.elements, searchInput);

      // Step 6: Filter and rank POIs based on constraints
      const filteredPOIs = this.filterAndRankPOIs(pois, searchInput);

      // Step 7: Build output
      const output: POISearchOutput = {
        pois: filteredPOIs,
        city: searchInput.city,
        totalFound: filteredPOIs.length,
        categories: [...new Set(filteredPOIs.map((poi) => poi.category))],
        queryMetadata: {
          interests: interests,
          osmTagsQueried: osmTags,
          timestamp: new Date().toISOString(),
        },
      };

      // Step 8: Create citations (OSM is the source)
      const citations: Citation[] = [
        {
          source: 'OpenStreetMap',
          url: 'https://www.openstreetmap.org',
          excerpt: `POI data from OpenStreetMap for ${searchInput.city}`,
          confidence: 1.0,
        },
      ];

      return {
        success: true,
        data: output,
        citations,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate and parse input
   */
  private validateInput(input: MCPToolInput): POISearchInput {
    if (!input.city || typeof input.city !== 'string') {
      throw new Error('City is required and must be a string');
    }

    return {
      city: input.city.trim(),
      interests: Array.isArray(input.interests) ? input.interests : [],
      constraints: Array.isArray(input.constraints) ? input.constraints : [],
      pace: input.pace || 'moderate',
      limit: input.limit ? Math.min(Math.max(1, input.limit), 100) : 50, // Clamp between 1-100
    };
  }

  /**
   * Transform OSM elements to POI format
   * 
   * Ensures all POIs have OSM IDs (required by policy).
   */
  private transformOSMElements(
    elements: OverpassElement[],
    _input: POISearchInput
  ): POI[] {
    const pois: POI[] = [];

    for (const element of elements) {
      // Skip if no tags (not a valid POI)
      if (!element.tags || Object.keys(element.tags).length === 0) {
        continue;
      }

      // Skip if no name (hard to reference)
      if (!element.tags.name) {
        continue;
      }

      // Get coordinates
      let lat: number;
      let lon: number;

      if (element.type === 'node') {
        if (!element.lat || !element.lon) {
          continue; // Node must have coordinates
        }
        lat = element.lat;
        lon = element.lon;
      } else if (element.type === 'way' || element.type === 'relation') {
        if (!element.center) {
          continue; // Ways/relations need center
        }
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        continue; // Unknown type
      }

      // Categorize POI
      const category = categorizePOI(element.tags);

      // Extract description from tags
      const description = this.extractDescription(element.tags);

      // Extract rating if available
      const rating = this.extractRating(element.tags);

      const poi: POI = {
        osmId: element.id,
        osmType: element.type,
        name: element.tags.name,
        category,
        coordinates: {
          lat,
          lon,
        },
        tags: element.tags,
        description,
        rating,
      };

      pois.push(poi);
    }

    return pois;
  }

  /**
   * Extract description from OSM tags
   */
  private extractDescription(tags: Record<string, string>): string | undefined {
    // Try various description fields
    const descriptionFields = [
      'description',
      'wikipedia',
      'wikidata',
      'tourism',
      'historic',
      'amenity',
    ];

    for (const field of descriptionFields) {
      if (tags[field]) {
        return tags[field];
      }
    }

    // Build description from category and name
    if (tags.tourism) {
      return `${tags.tourism} - ${tags.name}`;
    }

    return undefined;
  }

  /**
   * Extract rating from OSM tags
   */
  private extractRating(tags: Record<string, string>): number | undefined {
    // OSM doesn't have standard ratings, but some tags might indicate quality
    // This is a placeholder - in production, you might use external APIs
    if (tags.stars) {
      const stars = parseInt(tags.stars, 10);
      if (!isNaN(stars) && stars >= 1 && stars <= 5) {
        return stars;
      }
    }

    return undefined;
  }

  /**
   * Filter and rank POIs based on constraints
   * 
   * Deterministic ranking - no LLM.
   */
  private filterAndRankPOIs(pois: POI[], input: POISearchInput): POI[] {
    let filtered = [...pois];

    // Filter by interests (if specified)
    if (input.interests && input.interests.length > 0) {
      const interestCategories = input.interests.map((i) => i.toLowerCase());
      filtered = filtered.filter((poi) => {
        const poiCategory = poi.category.toLowerCase();
        return interestCategories.some((ic) => poiCategory.includes(ic) || ic.includes(poiCategory));
      });
    }

    // Rank by relevance (simple scoring)
    // Priority: has name, has description, has rating, matches interests
    filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Name is required (already filtered)
      scoreA += 10;
      scoreB += 10;

      // Description bonus
      if (a.description) scoreA += 5;
      if (b.description) scoreB += 5;

      // Rating bonus
      if (a.rating) scoreA += a.rating * 2;
      if (b.rating) scoreB += b.rating * 2;

      // Tourism/historic tags are more relevant
      if (a.tags.tourism || a.tags.historic) scoreA += 3;
      if (b.tags.tourism || b.tags.historic) scoreB += 3;

      return scoreB - scoreA; // Descending order
    });

    // Apply limit
    const limit = input.limit || 50;
    return filtered.slice(0, limit);
  }
}

/**
 * Create and export the tool instance
 */
export const poiSearchTool = new POISearchTool();

