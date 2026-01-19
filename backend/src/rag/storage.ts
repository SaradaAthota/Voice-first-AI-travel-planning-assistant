/**
 * ChromaDB Storage
 * 
 * Stores document chunks with embeddings in ChromaDB.
 * 
 * Rules:
 * - Metadata must support citations (city, source, section, url)
 * - Each chunk is stored as a separate document
 * - Embeddings are stored as vectors
 */

// import { Collection } from 'chromadb'; // Not used currently
import { DocumentChunk } from './types';
import { getOrCreateCollection } from './chromadb-client';

/**
 * Store chunks in ChromaDB
 */
export async function storeChunks(
  chunks: DocumentChunk[],
  embeddings: number[][],
  collectionName: string = 'travel_guides'
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error('Chunks and embeddings arrays must have the same length');
  }

  const collection = await getOrCreateCollection(collectionName);

  // Prepare data for ChromaDB
  const ids: string[] = [];
  const documents: string[] = [];
  const metadatas: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const id = generateChunkId(chunk);
    
    ids.push(id);
    documents.push(chunk.text);
    metadatas.push({
      city: chunk.metadata.city,
      source: chunk.metadata.source,
      section: chunk.metadata.section,
      url: chunk.metadata.url,
      chunkIndex: chunk.metadata.chunkIndex || 0,
      totalChunks: chunk.metadata.totalChunks || 1,
    });
  }

  // Add to collection
  await collection.add({
    ids,
    embeddings,
    documents,
    metadatas,
  });

  console.log(`Stored ${chunks.length} chunks in ChromaDB collection "${collectionName}"`);
}

/**
 * Generate unique ID for chunk
 */
function generateChunkId(chunk: DocumentChunk): string {
  const { city, source, section, chunkIndex } = chunk.metadata;
  return `${city}_${source}_${section}_${chunkIndex || 0}_${Date.now()}`;
}

/**
 * Query similar chunks from ChromaDB
 * 
 * Used for RAG retrieval (not part of ingestion, but useful for later)
 */
export async function querySimilarChunks(
  queryEmbedding: number[],
  city?: string,
  section?: string,
  limit: number = 5,
  collectionName: string = 'travel_guides'
): Promise<Array<{ text: string; metadata: any; distance: number }>> {
  const collection = await getOrCreateCollection(collectionName);

  const where: any = {};
  if (city) {
    where.city = city;
  }
  if (section) {
    where.section = section;
  }

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit,
    where: where,
  });

  if (!results.documents || results.documents.length === 0) {
    return [];
  }

  const documents = results.documents[0];
  const metadatas = results.metadatas?.[0] || [];
  const distances = results.distances?.[0] || [];

  return documents.map((doc, index) => ({
    text: doc || '',
    metadata: metadatas[index] || {},
    distance: distances[index] || 0,
  }));
}

