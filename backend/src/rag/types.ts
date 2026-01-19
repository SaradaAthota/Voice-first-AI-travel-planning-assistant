/**
 * Types for RAG ingestion pipeline
 */

/**
 * Source types for RAG data
 */
export type RAGSource = 'wikivoyage' | 'wikipedia';

/**
 * Section types for travel guides
 */
export type TravelSection =
  | 'Safety'
  | 'Eat'
  | 'Get Around'
  | 'Weather'
  | 'Understand'
  | 'See'
  | 'Do'
  | 'Buy'
  | 'Sleep'
  | 'Connect'
  | 'Other';

/**
 * Chunk metadata for ChromaDB
 */
export interface ChunkMetadata {
  city: string;
  source: RAGSource;
  section: TravelSection;
  url: string;
  chunkIndex?: number; // Index within section
  totalChunks?: number; // Total chunks in section
}

/**
 * Document chunk
 */
export interface DocumentChunk {
  text: string;
  metadata: ChunkMetadata;
}

/**
 * Parsed page content
 */
export interface ParsedPage {
  city: string;
  source: RAGSource;
  url: string;
  sections: {
    [section: string]: string; // Section name -> content
  };
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  city: string;
  source: RAGSource;
  url: string;
  sectionsProcessed: number;
  chunksCreated: number;
  success: boolean;
  error?: string;
}

