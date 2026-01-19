# Integration Example: POI Search Tool with Orchestrator

This document shows how to integrate the POI Search MCP tool with the orchestrator.

## Basic Integration

```typescript
import { Orchestrator } from '../orchestration';
import { poiSearchTool } from './poi-search';

// Create orchestrator instance
const orchestrator = new Orchestrator();

// Register the POI Search tool
orchestrator.registerTool(poiSearchTool);

// Now the orchestrator can use the tool
// It will be called automatically when:
// - State is CONFIRMING
// - Intent is CONFIRM
// - User has confirmed preferences
```

## How It Works

1. **User confirms preferences** → State transitions to `CONFIRMING`
2. **IntentRouter classifies** → Intent is `CONFIRM`
3. **ToolOrchestrator decides** → Should call `poi_search` tool
4. **ToolOrchestrator executes** → Calls `poiSearchTool.execute()`
5. **Tool executes** → Queries OSM, returns POIs
6. **ToolOrchestrator logs** → Logs to `mcp_logs` table
7. **ResponseComposer uses** → Incorporates POIs into response

## Tool Call Flow

```
User: "Yes, that's correct"
    ↓
IntentRouter → Intent: CONFIRM
    ↓
ToolOrchestrator.decideToolCalls()
    → Decision: Call poi_search
    → Input: { city, interests, constraints }
    ↓
ToolOrchestrator.executeToolCalls()
    → Calls poiSearchTool.execute(input)
    → Logs to mcp_logs table
    ↓
POI Search Tool
    → Queries OSM Overpass API
    → Returns POIs with OSM IDs
    ↓
ResponseComposer
    → Uses POI data to compose response
    → Includes citations (OSM)
```

## Example: Full Conversation Flow

```typescript
// Step 1: User starts planning
const result1 = await orchestrator.process({
  message: "Plan a 3-day trip to Jaipur next weekend. I like food and culture.",
});

// Step 2: System collects preferences
// (State: COLLECTING_PREFS)

// Step 3: System confirms
const result2 = await orchestrator.process({
  message: "Yes, that's correct",
  tripId: result1.context.tripId,
});

// At this point:
// - State: CONFIRMING → PLANNED
// - ToolOrchestrator calls poi_search
// - POIs are retrieved from OSM
// - Response includes POI information
```

## Direct Tool Usage (Testing)

You can also test the tool directly:

```typescript
import { poiSearchTool } from './mcp-tools/poi-search';

const result = await poiSearchTool.execute({
  city: 'Jaipur',
  interests: ['food', 'culture', 'history'],
  pace: 'moderate',
  limit: 30,
});

if (result.success) {
  console.log(`Found ${result.data.totalFound} POIs`);
  result.data.pois.forEach(poi => {
    console.log(`${poi.name} (OSM ID: ${poi.osmId})`);
  });
}
```

## Tool Registration in Express App

```typescript
// src/index.ts or src/app.ts
import { Orchestrator } from './orchestration';
import { poiSearchTool } from './mcp-tools/poi-search';

// Create orchestrator instance (singleton)
let orchestratorInstance: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
    
    // Register all MCP tools
    orchestratorInstance.registerTool(poiSearchTool);
    // ... register other tools when implemented
  }
  
  return orchestratorInstance;
}

// Use in API route
app.post('/api/chat', async (req, res) => {
  const orchestrator = getOrchestrator();
  const result = await orchestrator.process({
    message: req.body.message,
    tripId: req.body.tripId,
  });
  
  res.json(result);
});
```

## Logging

All tool calls are automatically logged by `ToolOrchestrator` to the `mcp_logs` table:

```sql
SELECT * FROM mcp_logs 
WHERE tool_name = 'poi_search' 
ORDER BY timestamp DESC 
LIMIT 10;
```

Logs include:
- Tool name
- Input parameters
- Output data
- Duration (ms)
- Errors (if any)
- Trip ID (if available)

## Error Handling

The tool handles errors gracefully:

```typescript
const result = await poiSearchTool.execute({
  city: 'InvalidCity123',
});

if (!result.success) {
  console.error('Tool error:', result.error);
  // Error: "City 'InvalidCity123' not found"
}
```

The orchestrator will handle tool errors and compose an appropriate response.

