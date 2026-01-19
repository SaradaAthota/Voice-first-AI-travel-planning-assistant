/**
 * Embedding Generator
 * 
 * Generates embeddings for text chunks using OpenAI.
 * 
 * Rules:
 * - Uses OpenAI text-embedding-3-small (1536 dimensions)
 * - Batch processing for efficiency
 * - Handles rate limiting
 */

import OpenAI from 'openai';
import { config } from '../config/env';
import { DocumentChunk } from './types';

let openai: OpenAI | null = null;

/**
 * Get OpenAI client for embeddings
 */
function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API key is required for embeddings');
    }
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

/**
 * Generate embeddings for document chunks
 * 
 * @param chunks Array of document chunks
 * @param batchSize Number of chunks to process at once (default: 100)
 * @returns Array of embeddings (same order as chunks)
 */
export async function generateEmbeddings(
  chunks: DocumentChunk[],
  batchSize: number = 100
): Promise<number[][]> {
  const client = getOpenAIClient();
  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.text);

    try {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // Extract embeddings from response
      const batchEmbeddings = response.data.map(item => item.embedding);
      embeddings.push(...batchEmbeddings);

      // Rate limiting: wait a bit between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    } catch (error) {
      console.error(`Error generating embeddings for batch ${i}-${i + batchSize}:`, error);
      // Continue with next batch
      throw error;
    }
  }

  return embeddings;
}

/**
 * Generate single embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

