# 📝 Supabase Database Deployment - Corrections & Clarifications

## ❌ Corrections to Original Plan

### 1. Table Names - CORRECTED

**Original Plan (INCORRECT):**
- ❌ `itinerary_days` - **This table does NOT exist**
- ❌ `messages` - **This table does NOT exist**
- ❌ `conversation_state` - **This table does NOT exist**

**Actual Tables (CORRECT):**
- ✅ `trips` - Stores trip requests and conversation state
- ✅ `itineraries` - Stores generated itineraries (days are in JSONB `content` field)
- ✅ `transcripts` - Stores conversation messages (both user and assistant)
- ✅ `eval_results` - Stores evaluation results
- ✅ `mcp_logs` - Stores MCP tool call logs

### 2. Data Storage Strategy

**Why No `itinerary_days` Table?**
- Days are stored as **JSONB** in `itineraries.content` field
- This maintains data integrity (days can't exist without itinerary)
- Simplifies queries (single table lookup)
- Matches backend code structure (`ItineraryOutput` type)

**Why No `messages` Table?**
- The `transcripts` table serves this purpose
- Uses `role` column to distinguish 'user' vs 'assistant'
- Matches backend code usage (`transcripts` table)

**Why No `conversation_state` Table?**
- Conversation state is stored in `trips.preferences` JSONB field
- Includes: state, collected fields, preferences, edit targets
- Managed by `ConversationStateManager` class
- No separate table needed

---

## ✅ Verified Table Usage in Backend Code

### `trips` Table
**Used in:**
- `backend/src/orchestration/ConversationStateManager.ts`
  - `createContext()` - Creates new trip
  - `loadContext()` - Loads trip by ID
  - `updateContext()` - Updates trip preferences

**Columns Used:**
- `id` (UUID) - Primary key
- `city` (VARCHAR) - City name
- `preferences` (JSONB) - Full conversation context
- `created_at`, `updated_at` - Timestamps

---

### `itineraries` Table
**Used in:**
- `backend/src/mcp-tools/itinerary-builder/itinerary-builder-tool.ts`
  - `saveItinerary()` - Saves itinerary
  - `loadExistingItinerary()` - Loads for edits
- `backend/src/routes/itinerary.ts`
  - Fetches active itinerary for PDF generation
- `backend/src/routes/chat.ts`
  - Checks for existing itinerary
- `backend/src/orchestration/Orchestrator.ts`
  - Fetches itinerary ID for evaluations

**Columns Used:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `version` (INTEGER) - Version number
- `content` (JSONB) - Full itinerary structure (includes days)
- `is_active` (BOOLEAN) - Active flag
- `created_at`, `updated_at` - Timestamps

**Note:** Days are stored in `content` JSONB field, not a separate table.

---

### `transcripts` Table
**Used in:**
- `backend/src/orchestration/Orchestrator.ts`
  - `saveTranscript()` - Saves user and assistant messages
- `backend/src/routes/itinerary.ts`
  - Fetches recent transcripts for citations

**Columns Used:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `role` (VARCHAR) - 'user' or 'assistant'
- `content` (TEXT) - Message text
- `timestamp` (TIMESTAMP) - When message was sent
- `metadata` (JSONB) - Additional metadata (citations, etc.)

---

### `eval_results` Table
**Used in:**
- `backend/src/evaluations/eval-runner.ts`
  - Saves evaluation results after itinerary generation

**Columns Used:**
- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `itinerary_id` (UUID) - Foreign key to itineraries
- `eval_type` (VARCHAR) - Type of evaluation
- `result` (JSONB) - Evaluation results
- `passed` (BOOLEAN) - Whether evaluation passed
- `created_at` (TIMESTAMP) - When evaluation ran
- `metadata` (JSONB) - Additional metadata

---

### `mcp_logs` Table
**Used in:**
- `backend/src/orchestration/ToolOrchestrator.ts`
  - Logs every MCP tool call for debugging

**Columns Used:**
- `id` (UUID) - Primary key
- `tool_name` (VARCHAR) - Name of tool called
- `input` (JSONB) - Tool input parameters
- `output` (JSONB) - Tool output
- `timestamp` (TIMESTAMP) - When tool was called
- `trip_id` (UUID) - Optional foreign key to trips
- `duration_ms` (INTEGER) - Execution time
- `error` (TEXT) - Error message if failed
- `metadata` (JSONB) - Additional metadata

---

## 📊 Schema Design Rationale

### Why JSONB for Flexible Data?

1. **`trips.preferences` (JSONB):**
   - Stores conversation context (state, collected fields, preferences)
   - Flexible structure allows schema evolution
   - Backend code uses TypeScript interfaces for type safety

2. **`itineraries.content` (JSONB):**
   - Stores full itinerary structure (city, duration, days, activities)
   - Days are nested arrays within the JSONB
   - Matches `ItineraryOutput` TypeScript type exactly

3. **`transcripts.metadata` (JSONB):**
   - Stores citations, additional context
   - Flexible for future enhancements

4. **`eval_results.result` (JSONB):**
   - Stores evaluation-specific results
   - Different evaluation types have different structures

5. **`mcp_logs.input/output` (JSONB):**
   - Tool inputs/outputs vary by tool
   - JSONB allows flexible logging

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] All 5 tables exist (not 3 or 6)
- [ ] `itineraries.content` is JSONB (not a separate days table)
- [ ] `transcripts.role` has CHECK constraint ('user' or 'assistant')
- [ ] Foreign keys are correct (5 total)
- [ ] Triggers work (auto-update `updated_at`)
- [ ] Indexes are created (for performance)
- [ ] UUID extension is enabled

---

## 📚 Related Documentation

- **Backend Code:** See `backend/src/orchestration/ConversationStateManager.ts` for state management
- **Migration File:** `backend/migrations/001_initial_schema.sql` (same as `supabase/schema.sql`)
- **Database Connection:** `backend/src/db/supabase.ts`

---

**Last Updated:** 2024-01-15  
**Verified Against:** Backend codebase (commit: latest)



