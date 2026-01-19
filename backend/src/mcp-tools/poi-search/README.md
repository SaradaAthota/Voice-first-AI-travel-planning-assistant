# POI Search MCP Tool

Searches for Points of Interest (POIs) using OpenStreetMap Overpass API.

## Overview

This MCP tool implements deterministic POI search with no LLM usage. It:
- Queries OpenStreetMap via Overpass API
- Maps user interests to OSM tags
- Returns structured JSON with OSM IDs, coordinates, and tags
- Ensures all POIs map to OSM records (required by policy)

## Architecture

```
POISearchTool
    ↓
1. Validate Input
    ↓
2. Get City Bounding Box (Nominatim)
    ↓
3. Map Interests → OSM Tags
    ↓
4. Build Overpass QL Query
    ↓
5. Execute Overpass Query
    ↓
6. Transform OSM Elements → POI Format
    ↓
7. Filter & Rank POIs
    ↓
8. Return Structured Output
```

## Input

```typescript
{
  city: string;              // Required: City name
  interests?: string[];      // Optional: e.g., ['food', 'culture', 'history']
  constraints?: string[];    // Optional: Special requirements
  pace?: 'relaxed' | 'moderate' | 'fast';  // Optional: Travel pace
  limit?: number;            // Optional: Max POIs (default: 50, max: 100)
}
```

## Output

```typescript
{
  success: boolean;
  data?: {
    pois: POI[];
    city: string;
    totalFound: number;
    categories: string[];
    queryMetadata: {
      interests: string[];
      osmTagsQueried: string[];
      timestamp: string;
    };
  };
  error?: string;
  citations?: Citation[];  // OSM citation
}
```

## POI Structure

```typescript
{
  osmId: number;             // OSM node/way/relation ID (required)
  osmType: 'node' | 'way' | 'relation';
  name: string;
  category: string;         // e.g., 'tourism', 'historic', 'food'
  coordinates: {
    lat: number;
    lon: number;
  };
  tags: Record<string, string>;  // All OSM tags
  description?: string;
  rating?: number;
}
```

## Interest Mapping

User interests are mapped to OSM tags deterministically:

- `food` → `amenity=restaurant`, `amenity=cafe`, `amenity=bar`
- `culture` → `tourism=museum`, `tourism=gallery`, `amenity=theatre`
- `history` → `historic=*`, `tourism=museum`
- `tourism` → `tourism=*`
- `shopping` → `shop=*`, `amenity=marketplace`
- etc.

See `osm-tag-mapper.ts` for complete mapping.

## Example Request

```typescript
const input = {
  city: 'Jaipur',
  interests: ['food', 'culture', 'history'],
  pace: 'moderate',
  limit: 30
};

const result = await poiSearchTool.execute(input);
```

## Example Response

```json
{
  "success": true,
  "data": {
    "pois": [
      {
        "osmId": 123456789,
        "osmType": "node",
        "name": "City Palace",
        "category": "history",
        "coordinates": {
          "lat": 26.9258,
          "lon": 75.8236
        },
        "tags": {
          "name": "City Palace",
          "tourism": "attraction",
          "historic": "palace",
          "wikidata": "Q123456"
        },
        "description": "attraction - City Palace",
        "rating": undefined
      }
    ],
    "city": "Jaipur",
    "totalFound": 25,
    "categories": ["history", "culture", "food"],
    "queryMetadata": {
      "interests": ["food", "culture", "history"],
      "osmTagsQueried": [
        "amenity=restaurant",
        "tourism=museum",
        "historic=*"
      ],
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  },
  "citations": [
    {
      "source": "OpenStreetMap",
      "url": "https://www.openstreetmap.org",
      "excerpt": "POI data from OpenStreetMap for Jaipur",
      "confidence": 1.0
    }
  ]
}
```

## Error Handling

The tool handles:
- Invalid city names (throws error)
- Overpass API failures (tries alternative endpoints)
- Missing POI data (filters out invalid entries)
- Rate limiting (uses timeout)

## Policy Compliance

✅ **Deterministic Logic** - No LLM usage  
✅ **OSM Mapping** - All POIs have OSM IDs  
✅ **Structured Output** - JSON format  
✅ **Logging** - Handled by ToolOrchestrator (logs to mcp_logs table)  

## Dependencies

- OpenStreetMap Overpass API (public instance)
- Nominatim API (for geocoding city names)

No external npm packages required (uses native fetch).

## Notes

- Uses public Overpass API instances (may have rate limits)
- For production, consider using a dedicated Overpass instance
- POI ranking is simple - can be enhanced with external data (ratings, reviews)
- All POIs must have names (filtered out if missing)

