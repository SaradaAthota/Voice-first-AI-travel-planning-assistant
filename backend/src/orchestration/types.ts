/**
 * TypeScript interfaces for the orchestration layer
 * Defines all data structures used across orchestration modules
 */

// ============================================================================
// Conversation State Types
// ============================================================================

/**
 * Conversation states in the FSM
 * Each state represents a phase in the trip planning conversation
 */
export enum ConversationState {
  INIT = 'INIT',                    // Initial state, waiting for trip request
  COLLECTING_PREFS = 'COLLECTING_PREFS',  // Gathering user preferences
  CONFIRMING = 'CONFIRMING',        // Confirming constraints before planning
  PLANNED = 'PLANNED',              // Itinerary has been generated
  EDITING = 'EDITING',              // User is editing the itinerary
  EXPLAINING = 'EXPLAINING'         // Explaining decisions/reasoning
}

/**
 * User intent types that the IntentRouter can identify
 */
export enum UserIntent {
  PLAN_TRIP = 'PLAN_TRIP',          // User wants to plan a new trip
  PROVIDE_PREFERENCE = 'PROVIDE_PREFERENCE',  // User providing preference info
  CONFIRM = 'CONFIRM',               // User confirming constraints
  EDIT_ITINERARY = 'EDIT_ITINERARY', // User wants to edit itinerary
  EXPLAIN = 'EXPLAIN',               // User asking for explanation
  CLARIFY = 'CLARIFY',               // User asking for clarification
  SEND_EMAIL = 'SEND_EMAIL'         // User wants to send itinerary via email
}

/**
 * Trip preferences extracted from conversation
 */
export interface TripPreferences {
  city: string;
  duration?: number;                 // Number of days
  startDate?: string;                // ISO date string
  interests?: string[];              // e.g., ['food', 'culture', 'history']
  pace?: 'relaxed' | 'moderate' | 'fast';
  budget?: 'low' | 'medium' | 'high';
  constraints?: string[];            // Special requirements
  [key: string]: any;               // Allow additional fields
}

/**
 * Conversation context maintained throughout the session
 */
export interface ConversationContext {
  tripId?: string;                  // UUID of the trip record
  state: ConversationState;
  preferences: TripPreferences;
  collectedFields: string[];         // Fields we've collected so far
  missingFields: string[];          // Fields still needed
  lastIntent?: UserIntent;
  lastResponse?: string;
  editTarget?: EditTarget;           // What part of itinerary is being edited
}

/**
 * Target of an edit operation
 */
export interface EditTarget {
  day?: number;                      // Which day (1-indexed)
  block?: 'morning' | 'afternoon' | 'evening';
  type?: 'relax' | 'swap' | 'add' | 'remove' | 'reduce_travel';
}

// ============================================================================
// MCP Tool Types
// ============================================================================

/**
 * MCP tool definition
 * Tools are called by the orchestrator, NOT by the LLM directly
 */
export interface MCPTool {
  name: string;
  description: string;
  execute: (input: MCPToolInput) => Promise<MCPToolOutput>;
}

/**
 * Input to an MCP tool
 */
export interface MCPToolInput {
  [key: string]: any;
}

/**
 * Output from an MCP tool
 */
export interface MCPToolOutput {
  success: boolean;
  data?: any;
  error?: string;
  citations?: Citation[];           // Sources for RAG-grounded data
}

/**
 * Citation for RAG-grounded information
 */
export interface Citation {
  source: string;                    // e.g., 'Wikivoyage', 'Wikipedia'
  url?: string;
  excerpt?: string;
  confidence?: number;
}

// ============================================================================
// Intent Routing Types
// ============================================================================

/**
 * Result of intent classification
 */
export interface IntentClassification {
  intent: UserIntent;
  confidence: number;
  entities: Record<string, any>;     // Extracted entities (city, duration, etc.)
  requiresClarification: boolean;
  clarificationQuestion?: string;
}

// ============================================================================
// Tool Orchestration Types
// ============================================================================

/**
 * Tool call decision made by the orchestrator
 */
export interface ToolCallDecision {
  shouldCall: boolean;
  toolName?: string;
  toolInput?: MCPToolInput;
  reason: string;                    // Why this decision was made
}

/**
 * Result of tool orchestration
 */
export interface ToolOrchestrationResult {
  toolCalls: ToolCallResult[];
  nextState?: ConversationState;
  requiresLLM: boolean;              // Whether LLM processing is needed
}

/**
 * Result of a single tool call
 */
export interface ToolCallResult {
  toolName: string;
  input: MCPToolInput;
  output: MCPToolOutput;
  duration: number;                  // Milliseconds
  timestamp: Date;
}

// ============================================================================
// Response Composition Types
// ============================================================================

/**
 * Response to send to the user
 */
export interface ComposedResponse {
  text: string;                      // Text response for voice/TTS
  citations?: Citation[];             // Sources to show in UI
  state: ConversationState;
  metadata?: {
    tripId?: string;
    itineraryVersion?: number;
    [key: string]: any;
  };
}

// ============================================================================
// Policy Guard Types
// ============================================================================

/**
 * Policy check result
 */
export interface PolicyCheck {
  allowed: boolean;
  reason?: string;
  alternative?: string;               // Suggested alternative action
}

// ============================================================================
// Orchestrator Types
// ============================================================================

/**
 * Main orchestrator input (user message)
 */
export interface OrchestratorInput {
  message: string;
  tripId?: string;                   // If continuing existing trip
  userId?: string;                   // For future auth
}

/**
 * Main orchestrator output
 */
export interface OrchestratorOutput {
  response: ComposedResponse;
  context: ConversationContext;
  toolCalls?: ToolCallResult[];
  stateTransition?: {
    from: ConversationState;
    to: ConversationState;
  };
}

