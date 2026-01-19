/**
 * RAG Guardrails
 * 
 * Ensures LLM only uses retrieved chunks and prevents hallucinations.
 * 
 * Rules:
 * - LLM may ONLY use retrieved chunks
 * - Every answer must include citations
 * - No hallucinated facts allowed
 * - If no chunks found, must say "data not available"
 */

import { RetrievedChunk, RetrievalResult } from './retriever';
// import { Citation } from '../orchestration/types'; // Not used currently

/**
 * Guardrail check result
 */
export interface GuardrailCheck {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Check if retrieval result meets guardrail requirements
 */
export function checkGuardrails(result: RetrievalResult): GuardrailCheck {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Must have data or explicitly state data not available
  if (!result.hasData) {
    // This is okay if we return "data not available" message
    warnings.push('No chunks retrieved - response must state data not available');
  }

  // Rule 2: Must have citations if data is available
  if (result.hasData && result.citations.length === 0) {
    violations.push('Data retrieved but no citations provided');
  }

  // Rule 3: Citations must be valid
  if (result.citations.length > 0) {
    for (let i = 0; i < result.citations.length; i++) {
      const citation = result.citations[i];
      if (!citation.source) {
        violations.push(`Citation ${i + 1}: Missing source`);
      }
      if (!citation.url) {
        violations.push(`Citation ${i + 1}: Missing URL`);
      }
    }
  }

  // Rule 4: Chunks must have sufficient similarity
  if (result.hasData) {
    const lowSimilarityChunks = result.chunks.filter(c => c.similarity < 0.5);
    if (lowSimilarityChunks.length > 0) {
      warnings.push(`${lowSimilarityChunks.length} chunks have low similarity (< 0.5)`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Validate LLM response against retrieved chunks
 * 
 * Checks if response is grounded in retrieved data
 */
export function validateResponseGrounded(
  response: string,
  chunks: RetrievedChunk[]
): GuardrailCheck {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (chunks.length === 0) {
    // If no chunks, response must say data not available
    const dataNotAvailablePatterns = [
      /don'?t have/i,
      /no data/i,
      /not available/i,
      /unable to find/i,
      /cannot provide/i,
    ];

    const hasDataNotAvailable = dataNotAvailablePatterns.some(pattern =>
      pattern.test(response)
    );

    if (!hasDataNotAvailable) {
      violations.push(
        'No data retrieved but response does not state data not available'
      );
    }
  } else {
    // Check if response mentions facts that might not be in chunks
    // This is a simple heuristic - in production, use more sophisticated checking
    // const responseLower = response.toLowerCase(); // Not used currently
    const chunkTexts = chunks.map(c => c.text.toLowerCase()).join(' ');

    // Check for specific factual claims (numbers, dates, names)
    const factualPatterns = [
      /\d+\s*(?:km|miles|hours|days|years)/i, // Distances, times
      /\d{4}/, // Years
      /(?:cost|price|fee)\s+(?:is|are|of)\s+\$?\d+/i, // Prices
    ];

    for (const pattern of factualPatterns) {
      const matches = response.match(pattern);
      if (matches) {
        // Check if this fact appears in chunks
        const factInChunks = matches.some(match => chunkTexts.includes(match.toLowerCase()));
        if (!factInChunks) {
          warnings.push(`Response contains fact "${matches[0]}" that may not be in retrieved chunks`);
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Enforce guardrails on response
 * 
 * Modifies response to ensure compliance
 */
export function enforceGuardrails(
  response: string,
  result: RetrievalResult
): string {
  // If no data, ensure response states it
  if (!result.hasData) {
    if (!response.toLowerCase().includes('not available') &&
        !response.toLowerCase().includes("don't have") &&
        !response.toLowerCase().includes('unable to find')) {
      return "I don't have specific information about that. The data may not be available in my knowledge base.";
    }
  }

  // Ensure citations are mentioned if data is available
  if (result.hasData && result.citations.length > 0) {
    const hasCitationMention = result.citations.some(citation =>
      response.toLowerCase().includes(citation.source.toLowerCase())
    );

    if (!hasCitationMention && !response.includes('[') && !response.includes('Source')) {
      // Add citation mention if not present
      const sourceNames = result.citations.map(c => c.source).join(' and ');
      return `${response}\n\n(Source: ${sourceNames})`;
    }
  }

  return response;
}

/**
 * Create guardrail prompt for LLM
 * 
 * Instructions for LLM to follow guardrails
 */
export function createGuardrailPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `IMPORTANT: You do not have any data about this topic. 
You MUST respond by saying that you don't have this information available.
Do NOT make up or guess any information.`;
  }

  const chunkTexts = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.text}`).join('\n\n');

  return `IMPORTANT RULES:
1. You may ONLY use information from the provided chunks below.
2. Do NOT make up, guess, or hallucinate any facts.
3. If the chunks don't contain the answer, say "I don't have specific information about that."
4. You MUST cite your sources when providing information.
5. Every factual claim must be supported by the chunks.

Provided chunks:
${chunkTexts}

Remember: Only use information from the chunks above. No hallucinations allowed.`;
}

