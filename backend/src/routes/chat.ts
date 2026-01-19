/**
 * Chat Routes
 * 
 * Handles chat/message processing for itinerary generation.
 */

import { Router, Request, Response } from 'express';
import { Orchestrator } from '../orchestration/Orchestrator';
import { OrchestratorInput } from '../orchestration/types';

const router = Router();

// Create orchestrator instance (singleton pattern)
let orchestratorInstance: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
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
    let itinerary = null;
    const allCitations: any[] = [];
    
    if (output.toolCalls) {
      const itineraryToolCall = output.toolCalls.find(
        (call) => call.toolName === 'itinerary_builder'
      );
      if (itineraryToolCall && itineraryToolCall.output.success) {
        itinerary = itineraryToolCall.output.data;
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
      hasItinerary: !!itinerary,
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
      hasItinerary: !!itinerary,
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


