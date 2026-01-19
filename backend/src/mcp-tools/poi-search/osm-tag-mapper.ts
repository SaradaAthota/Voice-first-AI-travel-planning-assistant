/**
 * OSM Tag Mapper
 * 
 * Maps user interests to OpenStreetMap tags.
 * 
 * Rules:
 * - Deterministic mapping only (no LLM)
 * - Uses OSM tag conventions
 * - Returns structured tag queries
 */

/**
 * Mapping from user interests to OSM tags
 * 
 * This is a deterministic mapping - no LLM involved.
 * Based on OpenStreetMap tagging conventions.
 */
const INTEREST_TO_OSM_TAGS: Record<string, string[]> = {
  // Food & Dining
  food: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food', 'amenity=bar', 'amenity=pub'],
  restaurant: ['amenity=restaurant'],
  cafe: ['amenity=cafe'],
  bar: ['amenity=bar', 'amenity=pub'],
  cuisine: ['amenity=restaurant'], // Will be filtered by cuisine tags

  // Culture & History
  culture: [
    'tourism=museum',
    'tourism=gallery',
    'tourism=artwork',
    'amenity=theatre',
    'amenity=cinema',
    'historic=*',
  ],
  history: ['historic=*', 'tourism=museum'],
  museum: ['tourism=museum'],
  art: ['tourism=gallery', 'tourism=artwork', 'amenity=theatre'],
  architecture: ['historic=*', 'building=*'],

  // Tourism & Attractions
  tourism: ['tourism=*'],
  attraction: ['tourism=attraction', 'tourism=theme_park', 'tourism=zoo'],
  park: ['leisure=park', 'tourism=theme_park'],
  nature: ['leisure=park', 'natural=*'],
  beach: ['natural=beach', 'leisure=beach_resort'],

  // Shopping
  shopping: ['shop=*', 'amenity=marketplace'],
  market: ['amenity=marketplace', 'shop=*'],

  // Entertainment
  entertainment: ['amenity=cinema', 'amenity=theatre', 'leisure=*'],
  nightlife: ['amenity=bar', 'amenity=pub', 'amenity=nightclub'],

  // Religious
  religious: ['amenity=place_of_worship'],
  temple: ['amenity=place_of_worship', 'religion=*'],

  // Sports & Recreation
  sports: ['leisure=sports_centre', 'leisure=stadium'],
  recreation: ['leisure=*'],
};

/**
 * Get OSM tags for given interests
 * 
 * @param interests Array of user interests
 * @returns Array of OSM tag filters
 */
export function getOSMTagsForInterests(interests: string[]): string[] {
  const tags = new Set<string>();

  for (const interest of interests) {
    const lowerInterest = interest.toLowerCase().trim();
    const mappedTags = INTEREST_TO_OSM_TAGS[lowerInterest];

    if (mappedTags) {
      mappedTags.forEach((tag) => tags.add(tag));
    } else {
      // If interest not found, try partial match
      for (const [key, values] of Object.entries(INTEREST_TO_OSM_TAGS)) {
        if (key.includes(lowerInterest) || lowerInterest.includes(key)) {
          values.forEach((tag) => tags.add(tag));
        }
      }
    }
  }

  // If no interests provided, return general tourism tags
  if (tags.size === 0) {
    return ['tourism=*', 'historic=*', 'amenity=restaurant'];
  }

  return Array.from(tags);
}

/**
 * Build Overpass QL query for POI search
 * 
 * @param bbox Bounding box of the city
 * @param tags OSM tags to search for
 * @param limit Maximum number of results
 * @returns Overpass QL query string
 */
export function buildOverpassQuery(
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  tags: string[],
  _limit: number = 50
): string {
  // Overpass QL query structure:
  // [out:json][timeout:25];
  // (
  //   node["tourism"="museum"]({{bbox}});
  //   way["tourism"="museum"]({{bbox}});
  // );
  // out center meta;

  const bboxStr = `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`;

  // Build tag filters
  const tagFilters: string[] = [];
  for (const tag of tags) {
    if (tag.includes('=')) {
      const [key, value] = tag.split('=');
      if (value === '*') {
        // Wildcard - any value
        tagFilters.push(`["${key}"]`);
      } else {
        tagFilters.push(`["${key}"="${value}"]`);
      }
    }
  }

  // Build query for nodes and ways
  const nodeQueries = tagFilters.map((filter) => `node${filter}(${bboxStr});`).join('\n  ');
  const wayQueries = tagFilters.map((filter) => `way${filter}(${bboxStr});`).join('\n  ');

  const query = `[out:json][timeout:25];
(
  ${nodeQueries}
  ${wayQueries}
);
out center meta;`;

  return query;
}

/**
 * Categorize POI based on OSM tags
 * 
 * @param tags OSM tags from the element
 * @returns Category string
 */
export function categorizePOI(tags: Record<string, string>): string {
  if (tags.tourism) {
    if (tags.tourism === 'museum' || tags.tourism === 'gallery') {
      return 'culture';
    }
    return 'tourism';
  }

  if (tags.historic) {
    return 'history';
  }

  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') {
    return 'food';
  }

  if (tags.amenity === 'bar' || tags.amenity === 'pub' || tags.amenity === 'nightclub') {
    return 'nightlife';
  }

  if (tags.leisure) {
    return 'recreation';
  }

  if (tags.shop) {
    return 'shopping';
  }

  if (tags.amenity === 'place_of_worship') {
    return 'religious';
  }

  return 'attraction';
}

