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
    // Default: localhost:8000 (for local Docker)
    // Production: Use environment variable
    const chromaUrl = process.env.CHROMADB_URL || 'http://localhost:8000';
    
    chromaClient = new ChromaClient({
      path: chromaUrl,
    });
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
}

/**
 * Close ChromaDB connection
 */
export async function closeChromaConnection(): Promise<void> {
  // ChromaDB client doesn't have explicit close method
  // But we can reset the instance
  chromaClient = null;
}

