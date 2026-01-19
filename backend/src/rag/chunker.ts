/**
 * Content Chunker
 * 
 * Chunks content by semantic sections.
 * 
 * Rules:
 * - Chunks by sections (Safety, Eat, Get Around, Weather)
 * - Splits long sections into smaller chunks
 * - Preserves context within chunks
 */

import { ParsedPage, DocumentChunk, TravelSection } from './types';

/**
 * Chunk size in characters (approximate)
 * OpenAI embeddings work best with ~500-1000 tokens
 * Average ~4 characters per token, so ~2000-4000 characters
 */
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200; // Overlap between chunks for context

/**
 * Chunk parsed page into document chunks
 */
export function chunkPage(page: ParsedPage): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  // Process each section
  for (const [sectionName, content] of Object.entries(page.sections)) {
    const normalizedSection = normalizeSection(sectionName);
    
    // Skip if section is not one we care about
    if (!isTargetSection(normalizedSection)) {
      continue;
    }

    // Split long sections into smaller chunks
    const sectionChunks = splitIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);

    sectionChunks.forEach((chunkText, index) => {
      chunks.push({
        text: chunkText,
        metadata: {
          city: page.city,
          source: page.source,
          section: normalizedSection,
          url: page.url,
          chunkIndex: index,
          totalChunks: sectionChunks.length,
        },
      });
    });
  }

  return chunks;
}

/**
 * Normalize section name to TravelSection type
 */
function normalizeSection(sectionName: string): TravelSection {
  const lower = sectionName.toLowerCase();

  if (lower.includes('safety')) return 'Safety';
  if (lower.includes('eat') || lower.includes('food') || lower.includes('dining')) return 'Eat';
  if (lower.includes('get around') || lower.includes('transport')) return 'Get Around';
  if (lower.includes('weather') || lower.includes('climate')) return 'Weather';
  if (lower.includes('understand')) return 'Understand';
  if (lower.includes('see')) return 'See';
  if (lower.includes('do')) return 'Do';
  if (lower.includes('buy')) return 'Buy';
  if (lower.includes('sleep')) return 'Sleep';
  if (lower.includes('connect')) return 'Connect';

  return 'Other';
}

/**
 * Check if section is a target section
 */
function isTargetSection(section: TravelSection): boolean {
  const targetSections: TravelSection[] = ['Safety', 'Eat', 'Get Around', 'Weather'];
  return targetSections.includes(section);
}

/**
 * Split text into chunks with overlap
 */
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // If not the last chunk, try to break at sentence boundary
    if (end < text.length) {
      // Look for sentence endings within the last 200 characters
      const lookback = Math.min(200, chunkSize / 10);
      const searchStart = Math.max(start, end - lookback);
      const searchText = text.substring(searchStart, end);

      // Find last sentence boundary
      const sentenceMatch = searchText.match(/[.!?]\s+/g);
      if (sentenceMatch && sentenceMatch.length > 0) {
        const lastSentence = sentenceMatch[sentenceMatch.length - 1];
        const sentenceEnd = searchText.lastIndexOf(lastSentence);
        if (sentenceEnd > 0) {
          end = searchStart + sentenceEnd + lastSentence.length;
        }
      } else {
        // Try paragraph boundary
        const paraEnd = searchText.lastIndexOf('\n\n');
        if (paraEnd > 0) {
          end = searchStart + paraEnd + 2;
        }
      }
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

