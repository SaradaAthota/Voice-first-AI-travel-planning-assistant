# Itinerary Builder MCP Tool

Builds day-wise itineraries from candidate POIs with morning/afternoon/evening blocks.

## Overview

This MCP tool implements deterministic itinerary building with no LLM usage. It:
- Clusters POIs by proximity to minimize travel
- Allocates activities based on user pace (relaxed/moderate/fast)
- Creates day-wise structure with morning/afternoon/evening blocks
- Inserts travel buffers and ensures feasibility
- Outputs structured JSON itinerary

## Architecture

```
ItineraryBuilderTool
    ↓
1. Validate Input
    ↓
2. Cluster POIs by Proximity
    ↓
3. Distribute Clusters Across Days
    ↓
4. Build Each Day's Itinerary
    ├── Morning Block (cultural/historic)
    ├── Afternoon Block (mixed)
    └── Evening Block (food/entertainment)
    ↓
5. Calculate Travel Times & Buffers
    ↓
6. Check Feasibility
    ↓
7. Save to Database (if tripId provided)
    ↓
8. Return Structured Output
```

## Input

```typescript
{
  pois: POI[];                    // Required: Candidate POIs from POI Search
  duration: number;               // Required: Number of days
  startDate: string;             // Required: ISO date string (YYYY-MM-DD)
  pace: 'relaxed' | 'moderate' | 'fast';  // Required: User pace
  city: string;                   // Required: City name
  tripId?: string;               // Optional: For saving to database
  editTarget?: {                 // Optional: For editing existing itinerary
    day?: number;
    block?: 'morning' | 'afternoon' | 'evening';
    type?: 'relax' | 'swap' | 'add' | 'remove' | 'reduce_travel';
  };
}
```

## Output

```typescript
{
  success: boolean;
  data?: {
    city: string;
    duration: number;
    startDate: string;
    pace: 'relaxed' | 'moderate' | 'fast';
    days: ItineraryDay[];
    totalPOIs: number;
    totalActivities: number;
    metadata: {
      createdAt: string;
      version: number;
      isEdit: boolean;
      editTarget?: {...};
    };
  };
  error?: string;
  citations?: Citation[];
}
```

## Itinerary Structure

### Day Structure

```typescript
{
  day: number;                    // Day number (1-indexed)
  date: string;                    // ISO date (YYYY-MM-DD)
  blocks: {
    morning?: DayBlock;
    afternoon?: DayBlock;
    evening?: DayBlock;
  };
  totalActivities: number;
  totalTravelTime: number;        // Minutes
  totalDuration: number;          // Minutes
  isFeasible: boolean;
  feasibilityIssues?: string[];
}
```

### Block Structure

```typescript
{
  block: 'morning' | 'afternoon' | 'evening';
  activities: Activity[];
  startTime: string;              // HH:MM
  endTime: string;                // HH:MM
  totalDuration: number;          // Minutes
  travelTime: number;             // Minutes
}
```

### Activity Structure

```typescript
{
  poi: POI;                       // POI data
  startTime: string;              // HH:MM
  endTime: string;                // HH:MM
  duration: number;                // Minutes
  travelTimeFromPrevious?: number; // Minutes
  travelDistanceFromPrevious?: number; // Kilometers
  notes?: string;
}
```

## Pace Configuration

### Relaxed Pace
- Max 4 activities per day
- Max 2 activities per block
- 60-180 min per activity (default: 90 min)
- 30 min travel buffer
- 1 hour rest between blocks

### Moderate Pace
- Max 6 activities per day
- Max 3 activities per block
- 45-120 min per activity (default: 60 min)
- 20 min travel buffer
- 30 min rest between blocks

### Fast Pace
- Max 8 activities per day
- Max 4 activities per block
- 30-90 min per activity (default: 45 min)
- 15 min travel buffer
- 15 min rest between blocks

## Clustering Algorithm

POIs are clustered by proximity using a greedy algorithm:
1. Start with first POI as cluster center
2. Add nearby POIs (within 5km) to cluster
3. When cluster is full or no nearby POIs, start new cluster
4. Optimize route within cluster (nearest neighbor)

## Time Allocation

### Block Distribution
- **Morning**: Cultural/historic POIs (museums, palaces, monuments)
- **Afternoon**: Mixed categories
- **Evening**: Food, nightlife, entertainment

### Activity Duration
Based on POI category:
- Museums: 1.5x base duration
- Historic sites: 1.3x base duration
- Food places: 0.8x base duration
- Cafes: 0.6x base duration

## Travel Time Calculation

Uses Haversine formula for distance, then estimates:
- **Walking**: ~5 km/h
- **City driving**: ~30 km/h average (accounts for traffic, stops, lights)

Travel buffers are added based on pace.

## Feasibility Checks

The tool ensures feasibility by:
- Limiting total time per day (max 12 hours)
- Checking block durations don't exceed limits
- Ensuring travel times are accounted for
- Validating activity counts per pace

If not feasible, `feasibilityIssues` array contains reasons.

## Example Usage

```typescript
import { itineraryBuilderTool } from './mcp-tools/itinerary-builder';

const result = await itineraryBuilderTool.execute({
  pois: [...], // From POI Search tool
  duration: 3,
  startDate: '2024-02-15',
  pace: 'moderate',
  city: 'Jaipur',
  tripId: 'uuid-here', // Optional
});

if (result.success) {
  console.log(`Built ${result.data.days.length} day itinerary`);
  result.data.days.forEach(day => {
    console.log(`Day ${day.day}: ${day.totalActivities} activities`);
  });
}
```

## Integration with Orchestrator

The tool is registered with the orchestrator:

```typescript
import { Orchestrator } from './orchestration';
import { itineraryBuilderTool } from './mcp-tools/itinerary-builder';

const orchestrator = new Orchestrator();
orchestrator.registerTool(itineraryBuilderTool);
```

The `ToolOrchestrator` will call this tool when:
- State is `CONFIRMING` and intent is `CONFIRM`
- After POI Search tool returns results
- State is `EDITING` and intent is `EDIT_ITINERARY`

## Database Integration

If `tripId` is provided, the itinerary is saved to the `itineraries` table:
- Previous versions are deactivated
- New version is created
- Content stored as JSONB

## Policy Compliance

✅ **No LLM Usage** - All logic is deterministic  
✅ **Structured Output** - JSON format with TypeScript interfaces  
✅ **Feasible by Design** - Built-in feasibility checks  
✅ **Travel Buffers** - Accounted for in time allocation  
✅ **Day-wise Structure** - Morning/afternoon/evening blocks  

## Notes

- POIs are distributed across days using round-robin
- Clusters are kept together (POIs in same cluster go to same day)
- Route optimization within blocks minimizes travel
- Activity duration varies by category
- All times are in local timezone (no timezone conversion)

