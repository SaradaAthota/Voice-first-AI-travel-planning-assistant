/**
 * RAG Module
 * 
 * Exports for RAG retrieval at runtime.
 */

// Core retrieval
export * from './retriever';

// Citation formatting
export * from './citation-formatter';

// Guardrails
export * from './guardrails';

// Main service
export * from './rag-service';

// Storage (for querying)
export { querySimilarChunks } from './storage';

// ChromaDB client
export { getChromaClient, getOrCreateCollection } from './chromadb-client';

// Types
export * from './types';

