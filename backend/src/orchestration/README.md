# Orchestration Layer

The orchestration layer is the **core logic** of the voice-first AI travel planning assistant. It coordinates conversation flow, tool calls, and response generation.

## Architecture

```
User Message
    ↓
Orchestrator (main entry point)
    ↓
┌─────────────────────────────────────┐
│ 1. ConversationStateManager (FSM)   │ → Load/create context, manage state
│ 2. IntentRouter                      │ → Classify user intent (LLM)
│ 3. ToolOrchestrator                 │ → Decide & execute tool calls
│ 4. ResponseComposer                  │ → Generate response (LLM)
│ 5. PolicyGuards                      │ → Enforce system rules
└─────────────────────────────────────┘
    ↓
Response + Updated Context
```

## Key Principles

### 1. Single LLM Agent
- **Exactly ONE LLM agent** is used throughout
- LLM is used for:
  - Intent classification (IntentRouter)
  - Response generation (ResponseComposer)
- LLM is **NOT** used for:
  - Tool calling (ToolOrchestrator handles this)
  - Itinerary generation (MCP tools handle this)

### 2. Orchestrator Controls Tools
- **LLM cannot call MCP tools directly**
- Only `ToolOrchestrator` can call tools
- Tool calls are **deterministic** based on state + intent
- All tool calls are **logged** to `mcp_logs` table

### 3. State Management
- Conversation state is managed by FSM (ConversationStateManager)
- State is **always persisted** to Supabase
- Valid state transitions are enforced

### 4. Policy Enforcement
- PolicyGuards enforce critical rules:
  - Itineraries must come from MCP tools
  - Travel tips must come from RAG
  - POIs must map to OpenStreetMap

## Modules

### ConversationStateManager
**File**: `ConversationStateManager.ts`

Manages conversation state using a Finite State Machine.

**States**:
- `INIT` - Initial state, waiting for trip request
- `COLLECTING_PREFS` - Gathering user preferences
- `CONFIRMING` - Confirming constraints before planning
- `PLANNED` - Itinerary has been generated
- `EDITING` - User is editing the itinerary
- `EXPLAINING` - Explaining decisions/reasoning

**Responsibilities**:
- Track current conversation state
- Validate state transitions
- Persist state to Supabase
- Load state from Supabase

### IntentRouter
**File**: `IntentRouter.ts`

Routes user messages to appropriate intents.

**Intents**:
- `PLAN_TRIP` - User wants to plan a new trip
- `PROVIDE_PREFERENCE` - User providing preference info
- `CONFIRM` - User confirming constraints
- `EDIT_ITINERARY` - User wants to edit itinerary
- `EXPLAIN` - User asking for explanation
- `CLARIFY` - User asking for clarification

**Responsibilities**:
- Classify user intent from natural language (uses LLM)
- Extract entities (city, duration, preferences, etc.)
- Determine if clarification is needed

### ToolOrchestrator
**File**: `ToolOrchestrator.ts`

Orchestrates MCP tool calls.

**Responsibilities**:
- Decide WHEN to call MCP tools (not the LLM)
- Prepare tool inputs based on context
- Execute tool calls
- Log ALL tool calls to database
- Handle tool errors gracefully

**Key Methods**:
- `decideToolCalls()` - Determines which tools to call
- `executeToolCalls()` - Executes tools with logging
- `registerTool()` - Register MCP tools

### ResponseComposer
**File**: `ResponseComposer.ts`

Composes natural language responses.

**Responsibilities**:
- Generate user-facing responses using LLM
- Incorporate tool outputs into responses
- Include citations from RAG sources
- Maintain conversational tone

**Key Methods**:
- `composeResponse()` - Main response composition
- `composeExplanation()` - Explanation with RAG citations
- `optimizeForVoice()` - Optimize text for TTS

### PolicyGuards
**File**: `PolicyGuards.ts`

Enforces system rules and policies.

**Rules Enforced**:
- LLM cannot call MCP tools directly
- Itineraries must come from MCP tools, not LLM generation
- Travel tips must come from RAG, not LLM knowledge
- POIs must map to OpenStreetMap records

**Key Methods**:
- `validateItinerarySource()` - Ensures itinerary from MCP tool
- `validateRAGGrounded()` - Ensures RAG citations
- `validatePOIMapping()` - Ensures OSM mapping
- `validateResponse()` - Comprehensive validation

### Orchestrator
**File**: `Orchestrator.ts`

Main orchestration class that coordinates all modules.

**Flow**:
1. Load/create conversation context
2. Route user intent
3. Decide tool calls (orchestrator, not LLM)
4. Execute tool calls with logging
5. Compose response (LLM for text, not tools)
6. Apply policy guards
7. Update state and persist

**Key Method**:
- `process()` - Main entry point for processing user messages

## Usage Example

```typescript
import { Orchestrator } from './orchestration';

const orchestrator = new Orchestrator();

// Register MCP tools (to be implemented in later phases)
// orchestrator.registerTool(poiSearchTool);
// orchestrator.registerTool(itineraryBuilderTool);

// Process user message
const result = await orchestrator.process({
  message: "Plan a 3-day trip to Jaipur next weekend. I like food and culture.",
});

console.log(result.response.text);
console.log(result.context.state);
console.log(result.toolCalls);
```

## Data Flow

1. **User Message** → Orchestrator.process()
2. **Load Context** → ConversationStateManager
3. **Classify Intent** → IntentRouter (LLM)
4. **Decide Tools** → ToolOrchestrator (deterministic)
5. **Execute Tools** → ToolOrchestrator (with logging)
6. **Compose Response** → ResponseComposer (LLM)
7. **Validate** → PolicyGuards
8. **Update State** → ConversationStateManager
9. **Save Transcript** → Supabase
10. **Return Response** → User

## State Transitions

```
INIT
  ↓ (user starts planning)
COLLECTING_PREFS
  ↓ (all fields collected)
CONFIRMING
  ↓ (user confirms)
PLANNED
  ↓ (user edits)
EDITING → PLANNED
  ↓ (user asks question)
EXPLAINING → PLANNED
```

## Important Notes

1. **LLM Usage**: LLM is used ONLY for intent classification and response generation. It never calls tools directly.

2. **Tool Calls**: All tool calls are made by `ToolOrchestrator` based on deterministic logic (state + intent).

3. **State Persistence**: State is always persisted to Supabase. No in-memory-only state.

4. **Logging**: Every MCP tool call is logged to `mcp_logs` table with input, output, duration, and errors.

5. **Policy Enforcement**: PolicyGuards validate responses before returning to user, ensuring rules are followed.

