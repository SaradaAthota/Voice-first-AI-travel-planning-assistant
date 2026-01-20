/**
 * ChromaDB Client
 * 
 * Manages connection to ChromaDB for vector storage.
 * 
 * Rules:
 * - ChromaDB is used ONLY for vector storage (embeddings)
 * - Metadata is stored with each document for citations
 * - Collection schema supports city, source, section, url
 */

import { ChromaClient } from 'chromadb';
// import { config } from '../config/env'; // Not used currently

let chromaClient: ChromaClient | null = null;

/**
 * Get ChromaDB client instance (singleton)
 */
export function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    // ChromaDB connection URL
    // Production: Must be set via CHROMADB_URL environment variable
    // Development: Defaults to localhost:8000 for local Docker
    const chromaUrl = process.env.CHROMADB_URL;
    
    if (!chromaUrl) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        throw new Error('CHROMADB_URL environment variable is required in production. RAG is mandatory for this project.');
      }
      // Development fallback
      const fallbackUrl = 'http://localhost:8000';
      console.warn(`CHROMADB_URL not set, using development fallback: ${fallbackUrl}`);
      chromaClient = new ChromaClient({
        path: fallbackUrl,
      });
    } else {
      chromaClient = new ChromaClient({
        path: chromaUrl,
      });
    }
  }
  return chromaClient;
}

/**
 * Get or create collection for travel data
 * 
 * Collection schema:
 * - id: auto-generated
 * - embedding: vector (1536 dimensions for OpenAI text-embedding-3-small)
 * - metadata: { city, source, section, url }
 * - document: text content
 */
export async function getOrCreateCollection(collectionName: string = 'travel_guides') {
  try {
    const client = getChromaClient();
    
    try {
      // Try to get existing collection
      // Note: In newer ChromaDB versions, embeddingFunction may be required
      // For now, we'll catch the error and create if needed
      const collection = await client.getCollection({
        name: collectionName,
      } as any); // Type assertion to bypass strict typing for now
      return collection;
    } catch (error) {
      // Collection doesn't exist, create it
      const collection = await client.createCollection({
        name: collectionName,
        metadata: {
          description: 'Travel guides from Wikivoyage and Wikipedia',
        },
      });
      return collection;
    }
  } catch (error) {
    // Handle ChromaDB connection errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('ChromaDB connection failed:', errorMessage);
    
    // Re-throw with more context, but let the caller handle it gracefully
    throw new Error(`ChromaDB connection failed: ${errorMessage}. Make sure ChromaDB is running and CHROMADB_URL is set correctly.`);
  }
}

/**
 * Close ChromaDB connection
 */
export async function closeChromaConnection(): Promise<void> {
  // ChromaDB client doesn't have explicit close method
  // But we can reset the instance
  chromaClient = null;
}

