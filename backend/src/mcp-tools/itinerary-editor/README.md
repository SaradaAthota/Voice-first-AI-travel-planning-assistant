# Itinerary Editor MCP Tool

Edits existing itineraries by modifying only targeted sections while preserving all other days exactly.

## Overview

This MCP tool implements deterministic itinerary editing with no LLM usage. It:
- Modifies ONLY the targeted section (day/block)
- Preserves all other days exactly
- Increments itinerary version
- Triggers feasibility evaluation automatically
- Verifies changes using diff checking

## Architecture

```
ItineraryEditorTool
    ↓
1. Validate Input
    ↓
2. Create Deep Copy of Itinerary
    ↓
3. Find Target Day/Block
    ↓
4. Apply Edit Operation
    ├── relax: Reduce activities or increase duration
    ├── swap: Swap activity with new POI
    ├── add: Add new activity
    ├── remove: Remove activity
    └── reduce_travel: Optimize route
    ↓
5. Recalculate Day Totals
    ↓
6. Check Feasibility (automatic)
    ↓
7. Verify Diff (only target changed)
    ↓
8. Increment Version
    ↓
9. Save to Database
    ↓
10. Return Updated Itinerary
```

## Input

```typescript
{
  itinerary: ItineraryOutput;          // Existing itinerary
  editType: 'relax' | 'swap' | 'add' | 'remove' | 'reduce_travel';
  targetDay: number;                   // Day to edit (1-indexed)
  targetBlock?: 'morning' | 'afternoon' | 'evening';  // Optional
  editParams?: {
    // For 'swap': new POI to swap in
    newPOI?: POI;
    // For 'add': POI to add
    poiToAdd?: POI;
    // For 'remove': activity index or POI ID
    activityIndex?: number;
    poiIdToRemove?: number;
    // For 'relax': reduce activities or increase duration
    reduceActivities?: boolean;
    increaseDuration?: number;          // Minutes
    // For 'reduce_travel': optimize route
    optimizeRoute?: boolean;
  };
  tripId: string;                      // Required for versioning
}
```

## Output

```typescript
{
  success: boolean;
  data?: {
    editedItinerary: ItineraryOutput;
    changes: EditChanges;
    feasibilityCheck: {
      passed: boolean;
      issues?: string[];
    };
    diffCheck: DiffCheckResult;
  };
  error?: string;
  citations?: Citation[];
}
```

## Edit Operations

### 1. Relax (`relax`)
Reduces activities or increases duration to make a block more relaxed.

**Parameters**:
- `reduceActivities`: Remove last activity
- `increaseDuration`: Add minutes to last activity

**Example**: "Make Day 2 more relaxed"

### 2. Swap (`swap`)
Swaps an activity with a new POI.

**Parameters**:
- `newPOI`: POI to swap in
- `activityIndex`: Index of activity to swap (default: last)

**Example**: "Swap the Day 1 evening plan to something indoors"

### 3. Add (`add`)
Adds a new activity to a block.

**Parameters**:
- `poiToAdd`: POI to add

**Example**: "Add one famous local food place to Day 2"

### 4. Remove (`remove`)
Removes an activity from a block.

**Parameters**:
- `activityIndex`: Index of activity to remove
- `poiIdToRemove`: OSM ID of POI to remove

**Example**: "Remove the last activity from Day 1"

### 5. Reduce Travel (`reduce_travel`)
Optimizes route to reduce travel time.

**Parameters**:
- `optimizeRoute`: Use nearest neighbor optimization

**Example**: "Reduce travel time on Day 2"

## Diff Checking

The tool verifies that only the target section was modified:

- **Unchanged Days**: All days except target day must be exactly the same
- **Unchanged Blocks**: If target block specified, other blocks in target day must be unchanged
- **Deep Equality**: Compares all properties including activities, times, durations

If violations are found, they are logged but the edit continues.

## Feasibility Evaluation

After each edit, feasibility is automatically checked:

- **Day-level**: Total time, activity count
- **Block-level**: Activity count per block, time windows
- **Issues Reported**: If not feasible, issues are listed

## Version Management

- Previous versions are deactivated
- New version is created with incremented version number
- Version history is preserved in database

## Example Usage

```typescript
import { itineraryEditorTool } from './mcp-tools/itinerary-editor';

const result = await itineraryEditorTool.execute({
  itinerary: existingItinerary,
  editType: 'relax',
  targetDay: 2,
  targetBlock: 'afternoon',
  editParams: {
    reduceActivities: true,
  },
  tripId: 'trip-uuid',
});

if (result.success) {
  console.log('Edit successful');
  console.log('Feasibility:', result.data.feasibilityCheck.passed);
  console.log('Diff check:', result.data.diffCheck.isValid);
}
```

## Integration with Orchestrator

The tool is registered with the orchestrator:

```typescript
import { Orchestrator } from './orchestration';
import { itineraryEditorTool } from './mcp-tools/itinerary-editor';

const orchestrator = new Orchestrator();
orchestrator.registerTool(itineraryEditorTool);
```

The `ToolOrchestrator` will call this tool when:
- State is `EDITING` and intent is `EDIT_ITINERARY`
- User wants to modify existing itinerary

## Policy Compliance

✅ **No LLM Usage** - All logic is deterministic  
✅ **Targeted Edits** - Only target section modified  
✅ **Preservation** - All other days preserved exactly  
✅ **Version Increment** - Automatic versioning  
✅ **Feasibility Check** - Automatic evaluation  
✅ **Diff Verification** - Ensures only target changed  

## Notes

- Edits are applied to a deep copy of the itinerary
- Day totals are recalculated after edit
- Travel times are recalculated for affected activities
- If edit makes itinerary infeasible, it's still saved but flagged
- Diff violations are logged but don't prevent edit

