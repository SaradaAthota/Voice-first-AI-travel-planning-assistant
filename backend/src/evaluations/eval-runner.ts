/**
 * Evaluation Runner
 * 
 * Runs evaluations and stores results in Supabase.
 * 
 * Rules:
 * - Evals must be runnable
 * - Results stored in Supabase
 */

import { getSupabaseClient } from '../db/supabase';
import { EvalResult, EvalType, EvalContext } from './types';
import { evaluateFeasibility } from './feasibility-eval';
import { evaluateEditCorrectness } from './edit-correctness-eval';
import {
  evaluateItineraryGrounding,
  evaluateResponseGrounding,
} from './grounding-eval';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { ComposedResponse } from '../orchestration/types';

/**
 * Run all evaluations for an itinerary
 */
export async function runItineraryEvaluations(
  itinerary: ItineraryOutput,
  context: EvalContext
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  // 1. Feasibility evaluation
  const feasibilityResult = evaluateFeasibility(itinerary);
  results.push(feasibilityResult);
  await storeEvalResult(feasibilityResult, context);

  // 2. Grounding evaluation (for itinerary)
  const groundingResult = evaluateItineraryGrounding(itinerary);
  results.push(groundingResult);
  await storeEvalResult(groundingResult, context);

  return results;
}

/**
 * Run edit correctness evaluation
 */
export async function runEditCorrectnessEvaluation(
  original: ItineraryOutput,
  edited: ItineraryOutput,
  context: EvalContext
): Promise<EvalResult> {
  if (!context.editTarget || !context.editTarget.day) {
    throw new Error('Edit target (day) is required for edit correctness evaluation');
  }

  const result = evaluateEditCorrectness(
    original,
    edited,
    context.editTarget.day,
    context.editTarget.block as 'morning' | 'afternoon' | 'evening' | undefined
  );

  await storeEvalResult(result, context);

  return result;
}

/**
 * Run grounding evaluation for a response
 */
export async function runResponseGroundingEvaluation(
  response: ComposedResponse,
  hasRAGData: boolean,
  context: EvalContext
): Promise<EvalResult> {
  const result = evaluateResponseGrounding(response, hasRAGData);

  await storeEvalResult(result, context);

  return result;
}

/**
 * Run a specific evaluation type
 */
export async function runEvaluation(
  evalType: EvalType,
  data: {
    itinerary?: ItineraryOutput;
    originalItinerary?: ItineraryOutput;
    editedItinerary?: ItineraryOutput;
    response?: ComposedResponse;
    hasRAGData?: boolean;
  },
  context: EvalContext
): Promise<EvalResult> {
  let result: EvalResult;

  switch (evalType) {
    case EvalType.FEASIBILITY:
      if (!data.itinerary) {
        throw new Error('Itinerary is required for feasibility evaluation');
      }
      result = evaluateFeasibility(data.itinerary);
      break;

    case EvalType.EDIT_CORRECTNESS:
      if (!data.originalItinerary || !data.editedItinerary) {
        throw new Error('Original and edited itineraries are required for edit correctness evaluation');
      }
      if (!context.editTarget || !context.editTarget.day) {
        throw new Error('Edit target is required for edit correctness evaluation');
      }
      result = evaluateEditCorrectness(
        data.originalItinerary,
        data.editedItinerary,
        context.editTarget.day,
        context.editTarget.block as 'morning' | 'afternoon' | 'evening' | undefined
      );
      break;

    case EvalType.GROUNDING:
      if (data.itinerary) {
        result = evaluateItineraryGrounding(data.itinerary);
      } else if (data.response !== undefined) {
        result = evaluateResponseGrounding(
          data.response,
          data.hasRAGData || false
        );
      } else {
        throw new Error('Itinerary or response is required for grounding evaluation');
      }
      break;

    default:
      throw new Error(`Unknown evaluation type: ${evalType}`);
  }

  await storeEvalResult(result, context);

  return result;
}

/**
 * Store evaluation result in Supabase
 */
async function storeEvalResult(
  result: EvalResult,
  context: EvalContext
): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.from('eval_results').insert({
      trip_id: context.tripId,
      itinerary_id: context.itineraryId || null,
      eval_type: result.evalType,
      result: {
        passed: result.passed,
        score: result.score,
        details: result.details,
        issues: result.issues,
      },
      passed: result.passed,
      metadata: {
        ...result.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error('Failed to store eval result:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error storing eval result:', error);
    throw error;
  }
}

/**
 * Get evaluation results for a trip
 */
export async function getEvalResults(
  tripId: string,
  evalType?: EvalType
): Promise<EvalResult[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('eval_results')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (evalType) {
    query = query.eq('eval_type', evalType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get eval results: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map(row => ({
    evalType: row.eval_type as EvalType,
    passed: row.passed as boolean,
    score: (row.result as any)?.score,
    details: (row.result as any)?.details || {},
    issues: (row.result as any)?.issues || [],
    metadata: row.metadata || {},
  }));
}

