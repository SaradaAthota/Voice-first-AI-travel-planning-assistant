/**
 * Explanation Routes
 * 
 * Handles explanation requests.
 */

import { Router, Request, Response } from 'express';
import { Orchestrator } from '../orchestration/Orchestrator';
import { ExplanationRequestInput, ExplanationResponse } from '../orchestration/explanation-types';
import { ExplanationComposer } from '../orchestration/ExplanationComposer';
import { ConversationStateManager } from '../orchestration/ConversationStateManager';
import { POI } from '../mcp-tools/poi-search/types';

const router = Router();

// Create orchestrator instance (singleton pattern)
let orchestratorInstance: Orchestrator | null = null;

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
    // Register tools here when available
  }
  return orchestratorInstance;
}

/**
 * POST /api/explanations
 * Get explanation for a question
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: ExplanationRequestInput = req.body;

    if (!input.question) {
      return res.status(400).json({ error: 'question is required' });
    }

    // Load context if tripId provided
    const stateManager = new ConversationStateManager();
    let context;
    
    if (input.tripId) {
      context = await stateManager.loadContext(input.tripId);
      if (!context) {
        return res.status(404).json({ error: 'Trip not found' });
      }
    } else {
      return res.status(400).json({ error: 'tripId is required for explanations' });
    }

    // Extract POI if poiId provided
    let poi: POI | undefined;
    if (input.poiId) {
      // In a real implementation, you'd fetch POI from database or POI search
      // For now, we'll extract from itinerary
      poi = undefined; // Will be extracted by ExplanationComposer from context
    }

    // Create explanation composer
    const explanationComposer = new ExplanationComposer();

    // Compose explanation
    const response = await explanationComposer.composeExplanation({
      question: input.question,
      context,
      poi,
      constraints: input.constraints,
    });

    // Build explanation response
    const explanationResponse: ExplanationResponse = {
      explanation: response.text,
      citations: response.citations || [],
      dataSources: {
        hasPOIData: !!poi || !!response.metadata?.hasPOIData,
        hasRAGData: response.metadata?.hasRAGData || false,
        hasConstraints: !!input.constraints,
      },
      poiMetadata: poi ? {
        name: poi.name,
        category: poi.category,
        coordinates: poi.coordinates,
        osmId: poi.osmId,
        osmType: poi.osmType,
        tags: poi.tags,
        description: poi.description,
      } : undefined,
      constraints: input.constraints,
      metadata: {
        tripId: input.tripId,
        timestamp: new Date().toISOString(),
        question: input.question,
      },
    };

    res.json(explanationResponse);
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

