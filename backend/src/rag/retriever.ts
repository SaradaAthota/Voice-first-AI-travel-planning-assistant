/**
 * RAG Retriever
 * 
 * Retrieves relevant chunks from ChromaDB at runtime.
 * 
 * Rules:
 * - Embeds user question
 * - Retrieves top-k chunks from ChromaDB
 * - Applies similarity threshold
 * - Returns chunks with metadata for citations
 */

import { generateEmbedding } from './embeddings';
import { querySimilarChunks } from './storage';
import { Citation } from '../orchestration/types';

/**
 * Similarity threshold (cosine distance)
 * Chunks with distance above this threshold are filtered out
 * Lower distance = higher similarity
 * Typical threshold: 0.3-0.5 for cosine distance
 */
const SIMILARITY_THRESHOLD = 0.4;

/**
 * Default number of chunks to retrieve
 */
const DEFAULT_TOP_K = 5;

/**
 * Retrieved chunk with similarity score
 */
export interface RetrievedChunk {
  text: string;
  metadata: {
    city: string;
    source: 'wikivoyage' | 'wikipedia';
    section: string;
    url: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
  similarity: number; // 1 - distance (higher = more similar)
  distance: number;   // Cosine distance (lower = more similar)
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  citations: Citation[];
  hasData: boolean;
  query: string;
  city?: string;
  section?: string;
}

/**
 * Retrieve relevant chunks for a query
 * 
 * @param query User question
 * @param city Optional: filter by city
 * @param section Optional: filter by section
 * @param topK Number of chunks to retrieve (default: 5)
 * @param similarityThreshold Similarity threshold (default: 0.4)
 * @returns Retrieval result with chunks and citations
 */
export async function retrieveChunks(
  query: string,
  city?: string,
  section?: string,
  topK: number = DEFAULT_TOP_K,
  similarityThreshold: number = SIMILARITY_THRESHOLD
): Promise<RetrievalResult> {
  try {
    // Step 1: Embed the query
    const queryEmbedding = await generateEmbedding(query);

    // Step 2: Query ChromaDB
    const rawResults = await querySimilarChunks(
      queryEmbedding,
      city,
      section,
      topK * 2 // Retrieve more to filter by threshold
    );

    // Step 3: Convert distance to similarity and filter by threshold
    const chunks: RetrievedChunk[] = rawResults
      .map(result => ({
        text: result.text,
        metadata: result.metadata,
        similarity: 1 - result.distance, // Convert distance to similarity
        distance: result.distance,
      }))
      .filter(chunk => chunk.distance <= similarityThreshold) // Filter by threshold
      .slice(0, topK); // Take top-k after filtering

    // Step 4: Generate citations from metadata
    const citations = generateCitations(chunks);

    // Step 5: Return result
    return {
      chunks,
      citations,
      hasData: chunks.length > 0,
      query,
      city,
      section,
    };
  } catch (error) {
    // Handle ChromaDB connection errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('ChromaDB retrieval failed, continuing without RAG data:', errorMessage);
    
    // Return empty result - don't fail the entire request
    return {
      chunks: [],
      citations: [],
      hasData: false,
      query,
      city,
      section,
    };
  }
}

/**
 * Generate citations from retrieved chunks
 */
function generateCitations(chunks: RetrievedChunk[]): Citation[] {
  const citationMap = new Map<string, Citation>();

  for (const chunk of chunks) {
    const { source, url, section, city } = chunk.metadata;
    const citationKey = `${source}_${url}`;

    if (!citationMap.has(citationKey)) {
      citationMap.set(citationKey, {
        source: source === 'wikivoyage' ? 'Wikivoyage' : 'Wikipedia',
        url,
        excerpt: `Information about ${section} in ${city}`,
        confidence: chunk.similarity,
      });
    }
  }

  return Array.from(citationMap.values());
}

/**
 * Retrieve chunks for explanation
 * 
 * Specialized retrieval for explanation queries
 */
export async function retrieveForExplanation(
  question: string,
  city: string,
  context?: string // Additional context (e.g., POI name)
): Promise<RetrievalResult> {
  // Enhance query with context if provided
  const enhancedQuery = context
    ? `${question} about ${context} in ${city}`
    : `${question} about ${city}`;

  return retrieveChunks(enhancedQuery, city, undefined, 5, 0.4);
}

