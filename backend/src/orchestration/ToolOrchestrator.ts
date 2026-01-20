/**
 * ToolOrchestrator
 * 
 * Orchestrates MCP tool calls based on conversation state and intent.
 * 
 * Responsibilities:
 * - Decide WHEN to call MCP tools (not the LLM)
 * - Prepare tool inputs based on context
 * - Execute tool calls
 * - Log ALL tool calls to database
 * - Handle tool errors gracefully
 * 
 * Rules:
 * - LLM CANNOT call tools directly - only orchestrator can
 * - Every tool call MUST be logged to mcp_logs table
 * - Tools are deterministic functions, not LLM calls
 * - Tool outputs are used by ResponseComposer, not sent directly to user
 */

import {
  ConversationContext,
  ConversationState,
  UserIntent,
  MCPTool,
  MCPToolInput,
  MCPToolOutput,
  ToolCallDecision,
  ToolOrchestrationResult,
  ToolCallResult,
} from './types';
import { getSupabaseClient } from '../db/supabase';

export class ToolOrchestrator {
  private tools: Map<string, MCPTool> = new Map();
  private supabase = getSupabaseClient();

  /**
   * Register an MCP tool
   * Tools must be registered before they can be called
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Decide which tools to call based on state and intent
   * 
   * This is the CORE decision logic:
   * - Orchestrator decides, NOT the LLM
   * - Decisions are deterministic based on state + intent
   * - Returns decision with reasoning
   */
  decideToolCalls(
    context: ConversationContext,
    intent: UserIntent
  ): ToolCallDecision[] {
    const decisions: ToolCallDecision[] = [];

    // Decision logic based on state and intent
    switch (context.state) {
      case ConversationState.CONFIRMING:
        // Handle both CONFIRM and PLAN_TRIP intents in CONFIRMING state
        if (intent === UserIntent.CONFIRM || intent === UserIntent.PLAN_TRIP) {
          const hasCityAndDuration = context.preferences.city && context.preferences.duration;
          if (hasCityAndDuration) {
            // User confirmed or wants to plan - call POI Search and Itinerary Builder
            decisions.push({
              shouldCall: true,
              toolName: 'poi_search',
              toolInput: {
                city: context.preferences.city,
                interests: context.preferences.interests || [],
                constraints: context.preferences.constraints || [],
              },
              reason: 'User confirmed/wants to plan, need to search for POIs',
            });

            decisions.push({
              shouldCall: true,
              toolName: 'itinerary_builder',
              toolInput: {
                tripId: context.tripId, // Added tripId - required for saving itinerary
                city: context.preferences.city,
                duration: context.preferences.duration,
                startDate: context.preferences.startDate || new Date().toISOString().split('T')[0],
                pace: context.preferences.pace || 'moderate',
              },
              reason: 'After POI search, build itinerary',
            });
          } else {
            decisions.push({
              shouldCall: false,
              reason: 'CONFIRMING state but missing city or duration',
            });
          }
        }
        break;

      case ConversationState.EDITING:
        if (intent === UserIntent.EDIT_ITINERARY) {
          // Editing requires itinerary builder with edit instructions
          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              tripId: context.tripId,
              editTarget: context.editTarget,
              editInstruction: intent, // Will be refined by intent router
            },
            reason: 'User wants to edit itinerary, need to rebuild affected sections',
          });
        }
        break;

      case ConversationState.EXPLAINING:
        if (intent === UserIntent.EXPLAIN) {
          // Explanation requires RAG retrieval (handled separately)
          // No MCP tools needed for explanation - use RAG directly
          decisions.push({
            shouldCall: false,
            reason: 'Explanation uses RAG, not MCP tools',
          });
        }
        break;

      case ConversationState.PLANNED:
      case ConversationState.COLLECTING_PREFS:
        // In planned/collecting state, editing triggers itinerary rebuild
        if (intent === UserIntent.EDIT_ITINERARY && context.tripId && context.preferences.city) {
          // For edits, we need to:
          // 1. Load existing itinerary to get POIs and preferences
          // 2. Apply edit instructions
          // 3. Rebuild itinerary
          decisions.push({
            shouldCall: true,
            toolName: 'poi_search', // Re-search POIs for the city
            toolInput: {
              city: context.preferences.city,
              interests: context.preferences.interests || [],
              constraints: context.preferences.constraints || [],
              limit: 50,
            },
            reason: 'Re-searching POIs for itinerary edit',
          });
          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              tripId: context.tripId,
              city: context.preferences.city,
              duration: context.preferences.duration || 2,
              startDate: context.preferences.startDate || new Date().toISOString().split('T')[0],
              pace: context.preferences.pace || 'moderate',
              editTarget: context.editTarget,
              // Will be populated with POIs from poi_search
            },
            reason: 'Rebuilding itinerary with edits',
          });
        }
        break;

      case ConversationState.INIT:
      case ConversationState.COLLECTING_PREFS:
        const hasCityAndDuration = context.preferences.city && context.preferences.duration;

        // If user confirms/finalizes and we have enough info, generate itinerary
        if (intent === UserIntent.CONFIRM && hasCityAndDuration) {
          // User wants to finalize - generate itinerary immediately
          decisions.push({
            shouldCall: true,
            toolName: 'poi_search',
            toolInput: {
              city: context.preferences.city,
              interests: context.preferences.interests || [],
              constraints: context.preferences.constraints || [],
            },
            reason: 'User wants to finalize, need to search for POIs',
          });

          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              tripId: context.tripId, // Added tripId - required for saving itinerary
              city: context.preferences.city,
              duration: context.preferences.duration,
              startDate: context.preferences.startDate || new Date().toISOString().split('T')[0],
              pace: context.preferences.pace || 'moderate',
            },
            reason: 'User wants to finalize, build itinerary',
          });
        } else if (
          (hasCityAndDuration && (context.state === ConversationState.INIT || context.state === ConversationState.COLLECTING_PREFS)) ||
          intent === UserIntent.PLAN_TRIP
        ) {
          // If we have enough info (city + duration) and intent is PLAN_TRIP, generate itinerary directly
          // Call POI Search first
          decisions.push({
            shouldCall: true,
            toolName: 'poi_search',
            toolInput: {
              city: context.preferences.city,
              interests: context.preferences.interests || [],
              constraints: context.preferences.constraints || [],
            },
            reason: 'Have city and duration, searching for POIs',
          });

          // Then call Itinerary Builder (will be executed after POI search completes)
          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              tripId: context.tripId,
              city: context.preferences.city,
              duration: context.preferences.duration,
              startDate: context.preferences.startDate || new Date().toISOString().split('T')[0],
              pace: context.preferences.pace || 'moderate',
            },
            reason: 'After POI search, build itinerary with available preferences',
          });
        } else {
          // Not enough info yet, continue collecting
          decisions.push({
            shouldCall: false,
            reason: `State ${context.state} - need more information (city: ${context.preferences.city}, duration: ${context.preferences.duration})`,
          });
        }
        break;

      default:
        // Other states don't need tools
        decisions.push({
          shouldCall: false,
          reason: `State ${context.state} does not require tool calls`,
        });
    }

    return decisions;
  }

  /**
   * Execute tool calls based on decisions
   * 
   * This is where tools are ACTUALLY called.
   * All calls are logged to database.
   */
  async executeToolCalls(
    decisions: ToolCallDecision[],
    context: ConversationContext
  ): Promise<ToolOrchestrationResult> {
    const toolCalls: ToolCallResult[] = [];
    let poiSearchResults: any = null;

    for (const decision of decisions) {
      if (!decision.shouldCall || !decision.toolName) {
        continue;
      }

      const tool = this.tools.get(decision.toolName);
      if (!tool) {
        console.warn(`Tool ${decision.toolName} not found`);
        continue;
      }

      // Prepare tool input - if itinerary_builder, add POIs from previous POI search
      let toolInput = decision.toolInput || {};
      if (decision.toolName === 'itinerary_builder' && poiSearchResults) {
        // POI search returns { pois: [...], city: ..., totalFound: ... }
        // Extract the pois array from the result
        const poisArray = poiSearchResults.pois || (Array.isArray(poiSearchResults) ? poiSearchResults : []);
        console.log('Injecting POIs into itinerary_builder:', {
          poiSearchResultType: typeof poiSearchResults,
          hasPoisProperty: 'pois' in poiSearchResults,
          poisCount: Array.isArray(poisArray) ? poisArray.length : 0,
        });
        toolInput = {
          ...toolInput,
          pois: poisArray,
        };
      }

      // Execute tool with logging
      const result = await this.executeWithLogging(
        tool,
        toolInput,
        context.tripId
      );

      toolCalls.push(result);

      // Store POI search results for itinerary builder
      if (decision.toolName === 'poi_search' && result.output.success && result.output.data) {
        poiSearchResults = result.output.data;
        console.log('POI search results stored:', {
          hasPois: 'pois' in poiSearchResults,
          poisCount: poiSearchResults.pois ? poiSearchResults.pois.length : 0,
          city: poiSearchResults.city,
          totalFound: poiSearchResults.totalFound,
        });
      }
    }

    // Determine if LLM processing is needed after tool calls
    const requiresLLM = this.requiresLLMProcessing(context, toolCalls);

    // Determine next state based on tool results
    const nextState = this.determineNextState(context, toolCalls);

    return {
      toolCalls,
      nextState,
      requiresLLM,
    };
  }

  /**
   * Execute a tool call with full logging
   * 
   * Every tool call is logged to mcp_logs table.
   * This is required for auditing and debugging.
   */
  private async executeWithLogging(
    tool: MCPTool,
    input: MCPToolInput,
    tripId?: string
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    let output: MCPToolOutput;
    let error: string | undefined;

    try {
      // Execute the tool
      output = await tool.execute(input);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      output = {
        success: false,
        error,
      };
    }

    const duration = Date.now() - startTime;

    // Log to database
    try {
      const { error: logError } = await this.supabase.from('mcp_logs').insert({
        tool_name: tool.name,
        input: input,
        output: output,
        trip_id: tripId,
        duration_ms: duration,
        error: error || null,
        timestamp: new Date().toISOString(),
      });

      if (logError) {
        console.error('Failed to log MCP call:', logError);
      }
    } catch (logErr) {
      console.error('Error logging MCP call:', logErr);
    }

    return {
      toolName: tool.name,
      input,
      output,
      duration,
      timestamp: new Date(),
    };
  }

  /**
   * Determine if LLM processing is needed after tool calls
   * 
   * LLM is used for:
   * - Composing natural language responses
   * - Generating explanations from RAG data
   * - NOT for calling tools (that's orchestrator's job)
   */
  private requiresLLMProcessing(
    context: ConversationContext,
    toolCalls: ToolCallResult[]
  ): boolean {
    // Always need LLM to compose response
    if (toolCalls.length > 0) {
      return true;
    }

    // Need LLM for explanations
    if (context.state === ConversationState.EXPLAINING) {
      return true;
    }

    // Need LLM for natural conversation
    if (
      context.state === ConversationState.COLLECTING_PREFS ||
      context.state === ConversationState.INIT
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determine next state based on tool call results
   */
  private determineNextState(
    context: ConversationContext,
    toolCalls: ToolCallResult[]
  ): ConversationState | undefined {
    // If itinerary was built, move to PLANNED state
    const itineraryBuilt = toolCalls.some(
      (call) => call.toolName === 'itinerary_builder' && call.output.success
    );

    if (itineraryBuilt && context.state === ConversationState.CONFIRMING) {
      return ConversationState.PLANNED;
    }

    // If editing, stay in EDITING or move to PLANNED if edit complete
    if (context.state === ConversationState.EDITING) {
      const editComplete = toolCalls.some(
        (call) => call.toolName === 'itinerary_builder' && call.output.success
      );
      return editComplete ? ConversationState.PLANNED : ConversationState.EDITING;
    }

    // Otherwise, state doesn't change from tool calls
    return undefined;
  }

  /**
   * Get list of registered tools
   */
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

