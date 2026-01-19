/**
 * Grounding Evaluation
 * 
 * Evaluates if responses are properly grounded.
 * 
 * Checks:
 * - POIs map to OSM IDs
 * - RAG citations present (when RAG data used)
 * - Missing data explicitly stated
 */

import { EvalResult, EvalType, GroundingDetails } from './types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { ComposedResponse } from '../orchestration/types';
// import { POI } from '../mcp-tools/poi-search/types'; // Not used currently

/**
 * Evaluate grounding of an itinerary
 */
export function evaluateItineraryGrounding(
  itinerary: ItineraryOutput
): EvalResult {
  const issues: string[] = [];
  let poisChecked = 0;
  let poisWithOSMIds = 0;

  // Check all POIs in itinerary
  for (const day of itinerary.days) {
    for (const block of Object.values(day.blocks)) {
      if (block) {
        for (const activity of block.activities) {
          poisChecked++;
          const poi = activity.poi;

          // Check if POI has OSM ID
          if (!poi.osmId) {
            issues.push(`POI "${poi.name}" missing OSM ID`);
          } else {
            poisWithOSMIds++;
          }

          // Check if POI has OSM type
          if (!poi.osmType) {
            issues.push(`POI "${poi.name}" missing OSM type`);
          }

          // Check if coordinates are present
          if (!poi.coordinates || !poi.coordinates.lat || !poi.coordinates.lon) {
            issues.push(`POI "${poi.name}" missing coordinates`);
          }
        }
      }
    }
  }

  const details: GroundingDetails = {
    poisChecked,
    poisWithOSMIds,
    allPOIsMapped: poisChecked === poisWithOSMIds && poisChecked > 0,
    ragCitationsPresent: false, // Not applicable for itinerary
    ragCitationsCount: 0,
    missingDataExplicitlyStated: true, // Not applicable for itinerary
    issues,
  };

  // Calculate score
  let score = 1.0;
  if (poisChecked === 0) {
    score = 0; // No POIs to check
  } else {
    const unmappedRatio = (poisChecked - poisWithOSMIds) / poisChecked;
    score = 1.0 - unmappedRatio;
  }

  if (issues.length > 0) {
    score -= Math.min(0.3, issues.length * 0.05);
  }
  score = Math.max(0, score);

  const passed = details.allPOIsMapped && issues.length === 0 && score >= 0.9;

  return {
    evalType: EvalType.GROUNDING,
    passed,
    score,
    details,
    issues,
    metadata: {
      totalPOIs: poisChecked,
      mappedPOIs: poisWithOSMIds,
    },
  };
}

/**
 * Evaluate grounding of a response
 */
export function evaluateResponseGrounding(
  response: ComposedResponse,
  hasRAGData: boolean
): EvalResult {
  const issues: string[] = [];

  const details: GroundingDetails = {
    poisChecked: 0,
    poisWithOSMIds: 0,
    allPOIsMapped: true, // Not applicable for response
    ragCitationsPresent: false,
    ragCitationsCount: 0,
    missingDataExplicitlyStated: false,
    issues: [],
  };

  // Check RAG citations
  if (hasRAGData) {
    if (!response.citations || response.citations.length === 0) {
      issues.push('RAG data used but no citations provided');
      details.ragCitationsPresent = false;
    } else {
      details.ragCitationsPresent = true;
      details.ragCitationsCount = response.citations.length;

      // Validate citations
      for (const citation of response.citations) {
        if (!citation.source) {
          issues.push('Citation missing source');
        }
        if (!citation.url) {
          issues.push('Citation missing URL');
        }
      }
    }
  } else {
    // If no RAG data, check if missing data is explicitly stated
    const missingDataPatterns = [
      /don'?t have/i,
      /no data/i,
      /not available/i,
      /unable to find/i,
      /cannot provide/i,
      /limited information/i,
    ];

    const hasMissingDataMention = missingDataPatterns.some(pattern =>
      pattern.test(response.text)
    );

    if (!hasMissingDataMention) {
      issues.push('No RAG data available but response does not explicitly state this');
      details.missingDataExplicitlyStated = false;
    } else {
      details.missingDataExplicitlyStated = true;
    }
  }

  details.issues = issues;

  // Calculate score
  let score = 1.0;
  if (hasRAGData && !details.ragCitationsPresent) {
    score -= 0.5;
  }
  if (!hasRAGData && !details.missingDataExplicitlyStated) {
    score -= 0.3;
  }
  if (issues.length > 0) {
    score -= Math.min(0.2, issues.length * 0.05);
  }
  score = Math.max(0, score);

  const passed = issues.length === 0 && score >= 0.8;

  return {
    evalType: EvalType.GROUNDING,
    passed,
    score,
    details,
    issues,
    metadata: {
      hasRAGData,
      citationCount: details.ragCitationsCount,
    },
  };
}

