/**
 * Evaluation Examples
 * 
 * Examples of running evaluations.
 */

import {
  runItineraryEvaluations,
  runEditCorrectnessEvaluation,
  runResponseGroundingEvaluation,
  runEvaluation,
  getEvalResults,
} from './eval-runner';
import { EvalType } from './types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { ComposedResponse } from '../orchestration/types';

/**
 * Example 1: Evaluate itinerary feasibility
 */
export async function example1_FeasibilityEval() {
  const itinerary: ItineraryOutput = {
    // ... itinerary data
  } as ItineraryOutput;

  const results = await runItineraryEvaluations(itinerary, {
    tripId: 'test-trip-id',
    itineraryId: 'test-itinerary-id',
  });

  console.log('Feasibility:', results.find(r => r.evalType === EvalType.FEASIBILITY));
  console.log('Grounding:', results.find(r => r.evalType === EvalType.GROUNDING));
}

/**
 * Example 2: Evaluate edit correctness
 */
export async function example2_EditCorrectnessEval() {
  const original: ItineraryOutput = {
    // ... original itinerary
  } as ItineraryOutput;

  const edited: ItineraryOutput = {
    // ... edited itinerary
  } as ItineraryOutput;

  const result = await runEditCorrectnessEvaluation(
    original,
    edited,
    {
      tripId: 'test-trip-id',
      editTarget: {
        day: 2,
        block: 'afternoon',
      },
    }
  );

  console.log('Edit correctness:', result.passed);
  console.log('Violations:', result.details.violations);
}

/**
 * Example 3: Evaluate response grounding
 */
export async function example3_ResponseGroundingEval() {
  const response: ComposedResponse = {
    text: 'City Palace is a historic palace...',
    citations: [
      {
        source: 'Wikivoyage',
        url: 'https://en.wikivoyage.org/wiki/Jaipur',
        confidence: 0.85,
      },
    ],
    state: 'EXPLAINING' as any,
  };

  const result = await runResponseGroundingEvaluation(
    response,
    true, // hasRAGData
    {
      tripId: 'test-trip-id',
    }
  );

  console.log('Grounding:', result.passed);
  console.log('Citations present:', result.details.ragCitationsPresent);
}

/**
 * Example 4: Run specific evaluation
 */
export async function example4_SpecificEval() {
  const itinerary: ItineraryOutput = {
    // ... itinerary data
  } as ItineraryOutput;

  const result = await runEvaluation(
    EvalType.FEASIBILITY,
    { itinerary },
    {
      tripId: 'test-trip-id',
      itineraryId: 'test-itinerary-id',
    }
  );

  console.log('Result:', result);
}

/**
 * Example 5: Get evaluation results
 */
export async function example5_GetEvalResults() {
  const results = await getEvalResults('test-trip-id');

  console.log('All results:', results);
  console.log('Passed:', results.filter(r => r.passed).length);
  console.log('Failed:', results.filter(r => !r.passed).length);

  // Get specific type
  const feasibilityResults = await getEvalResults(
    'test-trip-id',
    EvalType.FEASIBILITY
  );

  console.log('Feasibility results:', feasibilityResults);
}

