/**
 * Chat Routes
 * 
 * Handles chat/message processing for itinerary generation.
 */

import { Router, Request, Response } from 'express';
import { Orchestrator } from '../orchestration/Orchestrator';
import { OrchestratorInput } from '../orchestration/types';
import { poiSearchTool } from '../mcp-tools/poi-search';
import { itineraryBuilderTool } from '../mcp-tools/itinerary-builder';
import { getSupabaseClient } from '../db/supabase';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';

const router = Router();

// Create orchestrator instance (singleton pattern)
let orchestratorInstance: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
    
    // Register all MCP tools
    orchestratorInstance.registerTool(poiSearchTool);
    orchestratorInstance.registerTool(itineraryBuilderTool);
    
    console.log('Orchestrator initialized with tools:', {
      poiSearch: !!poiSearchTool,
      itineraryBuilder: !!itineraryBuilderTool,
    });
  }
  return orchestratorInstance;
}

/**
 * POST /api/chat
 * Process a message and generate/update itinerary
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, tripId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required and must be a non-empty string' });
    }

    console.log('Processing message:', { message: message.substring(0, 100), tripId });

    // Get orchestrator instance
    const orchestrator = getOrchestrator();

    // Prepare input
    const input: OrchestratorInput = {
      message: message.trim(),
      tripId: tripId || undefined,
    };

    // Process message through orchestrator
    const output = await orchestrator.process(input);

    // Extract tripId from context (use outputTripId to avoid shadowing)
    const outputTripId = output.context.tripId;
    
    // Extract intent from context
    const outputIntent = output.context.lastIntent;
    
    // Extract itinerary from tool calls (if itinerary_builder was called)
    let itinerary: ItineraryOutput | null = null;
    const allCitations: any[] = [];
    
    if (output.toolCalls) {
      const itineraryToolCall = output.toolCalls.find(
        (call) => call.toolName === 'itinerary_builder'
      );
      if (itineraryToolCall && itineraryToolCall.output.success) {
        itinerary = itineraryToolCall.output.data as ItineraryOutput;
        // Also collect citations from itinerary builder
        if (itineraryToolCall.output.citations && Array.isArray(itineraryToolCall.output.citations)) {
          allCitations.push(...itineraryToolCall.output.citations);
        }
      }
      
      // Collect citations from all tool calls
      for (const call of output.toolCalls) {
        if (call.output.citations && Array.isArray(call.output.citations)) {
          allCitations.push(...call.output.citations);
        }
      }
    }
    
    // If no itinerary from tool calls, check database
    let hasItinerary = !!itinerary;
    if (!itinerary && outputTripId) {
      try {
        const supabase = getSupabaseClient();
        const { data: itineraryData } = await supabase
          .from('itineraries')
          .select('content')
          .eq('trip_id', outputTripId)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (itineraryData && itineraryData.content) {
          itinerary = itineraryData.content as ItineraryOutput;
          hasItinerary = true;
          console.log('Found existing itinerary in database for tripId:', outputTripId);
        }
      } catch (error) {
        console.error('Error checking for existing itinerary:', error);
      }
    }
    
    // Extract citations from response (merge with tool citations)
    const responseCitations = output.response.citations || [];
    const citations = [...allCitations, ...responseCitations];
    
    // Remove duplicates based on URL
    const uniqueCitations = citations.filter((citation, index, self) =>
      index === self.findIndex((c) => c.url === citation.url)
    );

    console.log('Orchestrator output:', {
      tripId: outputTripId,
      intent: outputIntent,
      hasItinerary,
      state: output.context.state,
      toolCallsCount: output.toolCalls?.length || 0,
      citationsCount: uniqueCitations.length,
    });

    // Return response
    res.json({
      success: true,
      tripId: outputTripId,
      intent: outputIntent,
      response: output.response.text,
      itinerary,
      hasItinerary,
      citations: uniqueCitations,
    });
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;


