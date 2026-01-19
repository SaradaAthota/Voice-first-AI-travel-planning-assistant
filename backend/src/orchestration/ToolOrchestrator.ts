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
        if (intent === UserIntent.CONFIRM) {
          // User confirmed - call POI Search and Itinerary Builder
          decisions.push({
            shouldCall: true,
            toolName: 'poi_search',
            toolInput: {
              city: context.preferences.city,
              interests: context.preferences.interests || [],
              constraints: context.preferences.constraints || [],
            },
            reason: 'User confirmed preferences, need to search for POIs',
          });

          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              city: context.preferences.city,
              duration: context.preferences.duration,
              startDate: context.preferences.startDate,
              pace: context.preferences.pace || 'moderate',
            },
            reason: 'After POI search, build itinerary',
          });
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
        // In planned state, only editing or explaining trigger tools
        if (intent === UserIntent.EDIT_ITINERARY) {
          decisions.push({
            shouldCall: true,
            toolName: 'itinerary_builder',
            toolInput: {
              tripId: context.tripId,
              editTarget: context.editTarget,
            },
            reason: 'Editing planned itinerary',
          });
        }
        break;

      default:
        // INIT and COLLECTING_PREFS don't need tools yet
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

    for (const decision of decisions) {
      if (!decision.shouldCall || !decision.toolName) {
        continue;
      }

      const tool = this.tools.get(decision.toolName);
      if (!tool) {
        console.warn(`Tool ${decision.toolName} not found`);
        continue;
      }

      // Execute tool with logging
      const result = await this.executeWithLogging(
        tool,
        decision.toolInput || {},
        context.tripId
      );

      toolCalls.push(result);
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

