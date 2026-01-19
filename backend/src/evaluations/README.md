# Evaluations

Evaluation system for the voice-first AI travel planning assistant.

## Overview

Three mandatory evaluations ensure system quality:
1. **Feasibility Eval** - Checks if itinerary is feasible
2. **Edit Correctness Eval** - Verifies edits only modified target section
3. **Grounding Eval** - Ensures responses are properly grounded

## Evaluation Types

### 1. Feasibility Evaluation

**Checks**:
- Daily duration ≤ allowed time (max 12 hours)
- Travel time is reasonable (not > 50% of total time)
- Pace consistency (activities match pace configuration)

**Score**: 0-1 (passing threshold: 0.7)

**Example**:
```typescript
const result = evaluateFeasibility(itinerary);
// result.passed: true/false
// result.score: 0.85
// result.issues: ["Day 2: Travel time is 60% of total time"]
```

### 2. Edit Correctness Evaluation

**Checks**:
- Only target day/block was modified
- All other days remain unchanged
- No unintended changes

**Score**: 0-1 (passing threshold: 0.8)

**Example**:
```typescript
const result = evaluateEditCorrectness(
  originalItinerary,
  editedItinerary,
  targetDay: 2,
  targetBlock: 'afternoon'
);
// result.passed: true/false
// result.details.onlyTargetModified: true
// result.details.violations: []
```

### 3. Grounding Evaluation

**For Itineraries**:
- All POIs have OSM IDs
- All POIs have coordinates
- All POIs have OSM types

**For Responses**:
- RAG citations present (if RAG data used)
- Missing data explicitly stated (if no RAG data)

**Score**: 0-1 (passing threshold: 0.9 for itineraries, 0.8 for responses)

**Example**:
```typescript
// For itinerary
const result = evaluateItineraryGrounding(itinerary);
// result.details.allPOIsMapped: true

// For response
const result = evaluateResponseGrounding(response, hasRAGData);
// result.details.ragCitationsPresent: true
// result.details.missingDataExplicitlyStated: true
```

## Usage

### Run All Evaluations for Itinerary

```typescript
import { runItineraryEvaluations } from './evaluations/eval-runner';

const results = await runItineraryEvaluations(itinerary, {
  tripId: 'uuid',
  itineraryId: 'uuid',
});
```

### Run Specific Evaluation

```typescript
import { runEvaluation, EvalType } from './evaluations/eval-runner';

const result = await runEvaluation(
  EvalType.FEASIBILITY,
  { itinerary },
  { tripId: 'uuid' }
);
```

### Run Edit Correctness Evaluation

```typescript
import { runEditCorrectnessEvaluation } from './evaluations/eval-runner';

const result = await runEditCorrectnessEvaluation(
  originalItinerary,
  editedItinerary,
  {
    tripId: 'uuid',
    editTarget: { day: 2, block: 'afternoon' },
  }
);
```

## API Endpoints

### POST /api/evaluations/run
Run a specific evaluation.

**Request**:
```json
{
  "evalType": "feasibility",
  "data": {
    "itinerary": { ... }
  },
  "context": {
    "tripId": "uuid",
    "itineraryId": "uuid"
  }
}
```

### POST /api/evaluations/itinerary
Run all evaluations for an itinerary.

**Request**:
```json
{
  "itinerary": { ... },
  "tripId": "uuid",
  "itineraryId": "uuid"
}
```

### POST /api/evaluations/edit-correctness
Run edit correctness evaluation.

**Request**:
```json
{
  "original": { ... },
  "edited": { ... },
  "tripId": "uuid",
  "editTarget": {
    "day": 2,
    "block": "afternoon"
  }
}
```

### GET /api/evaluations/:tripId
Get evaluation results for a trip.

**Query params**:
- `evalType` (optional): Filter by evaluation type

## Results Storage

All evaluation results are stored in Supabase `eval_results` table:
- `trip_id`: Trip ID
- `itinerary_id`: Itinerary ID (if applicable)
- `eval_type`: Evaluation type
- `result`: JSONB with full result
- `passed`: Boolean
- `metadata`: Additional metadata

## Integration

Evaluations are automatically run:
- After itinerary generation (feasibility + grounding)
- After edits (edit correctness)
- After explanations (grounding)

Results are stored and can be queried for analysis.

