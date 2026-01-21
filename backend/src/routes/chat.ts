/**
 * Chat Routes
 * 
 * Handles chat/message processing for itinerary generation.
 */

import { Router, Request, Response } from 'express';
import { Orchestrator } from '../orchestration/Orchestrator';
import { OrchestratorInput } from '../orchestration/types';
// import { poiSearchTool } from '../mcp-tools/poi-search'; // POI search disabled
import { itineraryBuilderTool } from '../mcp-tools/itinerary-builder';
import { itineraryEditorTool } from '../mcp-tools/itinerary-editor';
import { getSupabaseClient } from '../db/supabase';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';

const router = Router();

// Create orchestrator instance (singleton pattern)
let orchestratorInstance: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
    
    // Register all MCP tools
    // PHASE 4: Temporarily DISABLE POI search (for sanity - Overpass APIs are flaky)
    // orchestratorInstance.registerTool(poiSearchTool);
    orchestratorInstance.registerTool(itineraryBuilderTool);
    orchestratorInstance.registerTool(itineraryEditorTool);
    
    console.log('Orchestrator initialized with tools:', {
      poiSearch: false, // PHASE 4: Disabled
      itineraryBuilder: !!itineraryBuilderTool,
      itineraryEditor: !!itineraryEditorTool,
    });
  }
  return orchestratorInstance;
}

/**
 * POST /api/chat
 * Process a message and generate/update itinerary
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, tripId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'message is required and must be a non-empty string' });
      return;
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
    
    // Extract itinerary from tool calls (if itinerary_builder or itinerary_editor was called)
    let itinerary: ItineraryOutput | null = null;
    const allCitations: any[] = [];
    
    if (output.toolCalls) {
      // Check for itinerary_editor first (edits), then itinerary_builder (new/rebuild)
      const itineraryEditorCall = output.toolCalls.find(
        (call) => call.toolName === 'itinerary_editor'
      );
      const itineraryBuilderCall = output.toolCalls.find(
        (call) => call.toolName === 'itinerary_builder'
      );
      
      // Prioritize editor result if both exist (edit takes precedence)
      const itineraryToolCall = itineraryEditorCall || itineraryBuilderCall;
      
      console.log('Itinerary tool call check:', {
        hasEditorCall: !!itineraryEditorCall,
        hasBuilderCall: !!itineraryBuilderCall,
        hasToolCall: !!itineraryToolCall,
        toolCallSuccess: itineraryToolCall?.output?.success,
        toolCallData: !!itineraryToolCall?.output?.data,
      });
      
      if (itineraryToolCall && itineraryToolCall.output.success) {
        itinerary = itineraryToolCall.output.data as ItineraryOutput;
        console.log('Itinerary extracted from tool call:', {
          hasItinerary: !!itinerary,
          city: itinerary?.city,
          days: itinerary?.days?.length,
        });
        // Also collect citations from tool
        if (itineraryToolCall.output.citations && Array.isArray(itineraryToolCall.output.citations)) {
          allCitations.push(...itineraryToolCall.output.citations);
        }
      } else if (itineraryToolCall) {
        console.warn('Itinerary tool call failed:', {
          toolName: itineraryToolCall.toolName,
          success: itineraryToolCall.output.success,
          error: itineraryToolCall.output.error,
        });
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
      hasItineraryInResponse: !!itinerary,
      itineraryCity: itinerary?.city,
      itineraryDays: itinerary?.days?.length,
      state: output.context.state,
      toolCallsCount: output.toolCalls?.length || 0,
      citationsCount: uniqueCitations.length,
    });

    // Return response - ALWAYS include itinerary if it exists
    const responseData: any = {
      success: true,
      tripId: outputTripId,
      intent: outputIntent,
      response: output.response.text,
      hasItinerary,
      citations: uniqueCitations,
    };
    
    // Include itinerary if it exists (even if null, to be explicit)
    if (itinerary) {
      responseData.itinerary = itinerary;
      console.log('Including itinerary in response:', {
        city: itinerary.city,
        days: itinerary.days?.length,
      });
    } else {
      console.log('No itinerary to include in response');
    }
    
    res.json(responseData);
    return;
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

export default router;


