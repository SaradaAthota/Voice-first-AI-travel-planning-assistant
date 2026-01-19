/**
 * Evaluation Routes
 * 
 * Handles evaluation requests.
 */

import { Router, Request, Response } from 'express';
import {
  runEvaluation,
  runItineraryEvaluations,
  runEditCorrectnessEvaluation,
  runResponseGroundingEvaluation,
  getEvalResults,
} from '../evaluations/eval-runner';
import { EvalType, EvalContext } from '../evaluations/types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { ComposedResponse } from '../orchestration/types';

const router = Router();

/**
 * POST /api/evaluations/run
 * Run a specific evaluation
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { evalType, data, context } = req.body;

    if (!evalType || !Object.values(EvalType).includes(evalType)) {
      return res.status(400).json({ error: 'Invalid evalType' });
    }

    if (!context || !context.tripId) {
      return res.status(400).json({ error: 'context.tripId is required' });
    }

    const evalContext: EvalContext = {
      tripId: context.tripId,
      itineraryId: context.itineraryId,
      originalItinerary: context.originalItinerary,
      editedItinerary: context.editedItinerary,
      editTarget: context.editTarget,
    };

    const result = await runEvaluation(
      evalType as EvalType,
      {
        itinerary: data.itinerary as ItineraryOutput | undefined,
        originalItinerary: data.originalItinerary as ItineraryOutput | undefined,
        editedItinerary: data.editedItinerary as ItineraryOutput | undefined,
        response: data.response as ComposedResponse | undefined,
        hasRAGData: data.hasRAGData as boolean | undefined,
      },
      evalContext
    );

    res.json(result);
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evaluations/itinerary
 * Run all evaluations for an itinerary
 */
router.post('/itinerary', async (req: Request, res: Response) => {
  try {
    const { itinerary, tripId, itineraryId } = req.body;

    if (!itinerary) {
      return res.status(400).json({ error: 'itinerary is required' });
    }

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    const context: EvalContext = {
      tripId,
      itineraryId,
    };

    const results = await runItineraryEvaluations(
      itinerary as ItineraryOutput,
      context
    );

    res.json({
      results,
      allPassed: results.every(r => r.passed),
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
      },
    });
  } catch (error) {
    console.error('Itinerary evaluation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evaluations/edit-correctness
 * Run edit correctness evaluation
 */
router.post('/edit-correctness', async (req: Request, res: Response) => {
  try {
    const { original, edited, tripId, itineraryId, editTarget } = req.body;

    if (!original || !edited) {
      return res.status(400).json({
        error: 'original and edited itineraries are required',
      });
    }

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    if (!editTarget || !editTarget.day) {
      return res.status(400).json({
        error: 'editTarget.day is required',
      });
    }

    const context: EvalContext = {
      tripId,
      itineraryId,
      originalItinerary: original,
      editedItinerary: edited,
      editTarget,
    };

    const result = await runEditCorrectnessEvaluation(
      original as ItineraryOutput,
      edited as ItineraryOutput,
      context
    );

    res.json(result);
  } catch (error) {
    console.error('Edit correctness evaluation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evaluations/grounding
 * Run grounding evaluation for a response
 */
router.post('/grounding', async (req: Request, res: Response) => {
  try {
    const { response, hasRAGData, tripId } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'response is required' });
    }

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    const context: EvalContext = {
      tripId,
    };

    const result = await runResponseGroundingEvaluation(
      response as ComposedResponse,
      hasRAGData || false,
      context
    );

    res.json(result);
  } catch (error) {
    console.error('Grounding evaluation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evaluations/:tripId
 * Get evaluation results for a trip
 */
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { evalType } = req.query;

    const results = await getEvalResults(
      tripId,
      evalType ? (evalType as EvalType) : undefined
    );

    res.json({
      tripId,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        byType: {
          feasibility: results.filter(r => r.evalType === EvalType.FEASIBILITY),
          editCorrectness: results.filter(r => r.evalType === EvalType.EDIT_CORRECTNESS),
          grounding: results.filter(r => r.evalType === EvalType.GROUNDING),
        },
      },
    });
  } catch (error) {
    console.error('Get eval results error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

