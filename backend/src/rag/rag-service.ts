/**
 * RAG Service
 * 
 * Main service for RAG retrieval at runtime.
 * 
 * Coordinates:
 * - Retrieval
 * - Citation formatting
 * - Guardrail enforcement
 * 
 * Rules:
 * - LLM may ONLY use retrieved chunks
 * - Every answer must include citations
 * - No hallucinated facts allowed
 */

import { retrieveChunks, retrieveForExplanation, RetrievalResult } from './retriever';
import {
  formatCitationsForUI,
  formatCitationsForVoice,
  extractCitationsFromChunks,
  validateCitations,
} from './citation-formatter';
import {
  checkGuardrails,
  validateResponseGrounded,
  enforceGuardrails,
  createGuardrailPrompt,
} from './guardrails';
import { Citation } from '../orchestration/types';

/**
 * RAG service result
 */
export interface RAGServiceResult {
  chunks: RetrievalResult['chunks'];
  citations: Citation[];
  hasData: boolean;
  guardrailPrompt: string;
  formattedCitations: {
    ui: string;
    voice: string;
  };
  guardrailCheck: {
    passed: boolean;
    violations: string[];
    warnings: string[];
  };
}

/**
 * Retrieve and prepare RAG data for LLM
 * 
 * Main entry point for RAG retrieval
 */
export async function retrieveRAGData(
  query: string,
  city?: string,
  section?: string
): Promise<RAGServiceResult> {
  // Step 1: Retrieve chunks
  const retrievalResult = await retrieveChunks(query, city, section);

  // Step 2: Extract and validate citations
  const citations = retrievalResult.citations.length > 0
    ? retrievalResult.citations
    : extractCitationsFromChunks(retrievalResult.chunks);

  const citationValidation = validateCitations(citations);
  if (!citationValidation.valid) {
    console.warn('Citation validation errors:', citationValidation.errors);
  }

  // Step 3: Check guardrails
  const guardrailCheck = checkGuardrails(retrievalResult);

  // Step 4: Create guardrail prompt for LLM
  const guardrailPrompt = createGuardrailPrompt(retrievalResult.chunks);

  // Step 5: Format citations
  const formattedCitations = {
    ui: formatCitationsForUI(citations),
    voice: formatCitationsForVoice(citations),
  };

  return {
    chunks: retrievalResult.chunks,
    citations,
    hasData: retrievalResult.hasData,
    guardrailPrompt,
    formattedCitations,
    guardrailCheck,
  };
}

/**
 * Retrieve RAG data for explanation
 * 
 * Specialized retrieval for explanation queries
 */
export async function retrieveForExplanationRAG(
  question: string,
  city: string,
  context?: string
): Promise<RAGServiceResult> {
  // Retrieve using specialized function
  const retrievalResult = await retrieveForExplanation(question, city, context);

  // Extract citations
  const citations = retrievalResult.citations.length > 0
    ? retrievalResult.citations
    : extractCitationsFromChunks(retrievalResult.chunks);

  // Check guardrails
  const guardrailCheck = checkGuardrails(retrievalResult);

  // Create guardrail prompt
  const guardrailPrompt = createGuardrailPrompt(retrievalResult.chunks);

  // Format citations
  const formattedCitations = {
    ui: formatCitationsForUI(citations),
    voice: formatCitationsForVoice(citations),
  };

  return {
    chunks: retrievalResult.chunks,
    citations,
    hasData: retrievalResult.hasData,
    guardrailPrompt,
    formattedCitations,
    guardrailCheck,
  };
}

/**
 * Validate LLM response against RAG data
 * 
 * Ensures response is grounded in retrieved chunks
 */
export function validateRAGResponse(
  response: string,
  ragResult: RAGServiceResult
): {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  enforcedResponse?: string;
} {
  // Validate response is grounded
  const groundedCheck = validateResponseGrounded(response, ragResult.chunks);

  // Enforce guardrails
  const enforcedResponse = enforceGuardrails(response, {
    chunks: ragResult.chunks,
    citations: ragResult.citations,
    hasData: ragResult.hasData,
    query: '',
  });

  return {
    isValid: groundedCheck.passed && ragResult.guardrailCheck.passed,
    violations: [...groundedCheck.violations, ...ragResult.guardrailCheck.violations],
    warnings: [...groundedCheck.warnings, ...ragResult.guardrailCheck.warnings],
    enforcedResponse: enforcedResponse !== response ? enforcedResponse : undefined,
  };
}

/**
 * Get "data not available" response
 * 
 * Standardized response when no data is found
 */
export function getDataNotAvailableResponse(query: string, city?: string): string {
  if (city) {
    return `I don't have specific information about "${query}" for ${city}. This information may not be available in my knowledge base.`;
  }
  return `I don't have specific information about "${query}". This information may not be available in my knowledge base.`;
}

