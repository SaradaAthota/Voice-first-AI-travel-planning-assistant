/**
 * Citation Formatter
 * 
 * Formats citations for display in UI and responses.
 * 
 * Rules:
 * - Every answer must include citations
 * - Citations must be formatted consistently
 * - URLs must be valid and accessible
 */

import { Citation } from '../orchestration/types';
import { RetrievedChunk } from './retriever';

/**
 * Format citations for UI display
 */
export function formatCitationsForUI(citations: Citation[]): string {
  if (citations.length === 0) {
    return '';
  }

  const formatted = citations.map((citation, index) => {
    const sourceName = citation.source || 'Source';
    const url = citation.url || '#';
    
    return `${index + 1}. ${sourceName}${citation.url ? ` - ${url}` : ''}`;
  });

  return formatted.join('\n');
}

/**
 * Format citations for voice response
 * 
 * Shorter format suitable for TTS
 */
export function formatCitationsForVoice(citations: Citation[]): string {
  if (citations.length === 0) {
    return '';
  }

  const sources = citations.map(c => c.source || 'Source');
  const uniqueSources = [...new Set(sources)];

  if (uniqueSources.length === 1) {
    return `According to ${uniqueSources[0]}`;
  } else if (uniqueSources.length === 2) {
    return `According to ${uniqueSources[0]} and ${uniqueSources[1]}`;
  } else {
    return `According to ${uniqueSources[0]} and other sources`;
  }
}

/**
 * Format citations as markdown
 */
export function formatCitationsAsMarkdown(citations: Citation[]): string {
  if (citations.length === 0) {
    return '';
  }

  const formatted = citations.map((citation, index) => {
    const sourceName = citation.source || 'Source';
    const url = citation.url || '#';
    
    return `[${index + 1}] ${sourceName} - [${url}](${url})`;
  });

  return '\n\n**Sources:**\n' + formatted.join('\n');
}

/**
 * Extract citations from retrieved chunks
 */
export function extractCitationsFromChunks(chunks: RetrievedChunk[]): Citation[] {
  const citationMap = new Map<string, Citation>();

  for (const chunk of chunks) {
    const { source, url } = chunk.metadata;
    const citationKey = `${source}_${url}`;

    if (!citationMap.has(citationKey)) {
      citationMap.set(citationKey, {
        source: source === 'wikivoyage' ? 'Wikivoyage' : 'Wikipedia',
        url,
        excerpt: chunk.text.substring(0, 100) + '...', // First 100 chars as excerpt
        confidence: chunk.similarity,
      });
    }
  }

  return Array.from(citationMap.values());
}

/**
 * Validate citations
 * 
 * Ensures all citations have required fields
 */
export function validateCitations(citations: Citation[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];

    if (!citation.source) {
      errors.push(`Citation ${i + 1}: Missing source`);
    }

    if (!citation.url) {
      errors.push(`Citation ${i + 1}: Missing URL`);
    } else if (!isValidUrl(citation.url)) {
      errors.push(`Citation ${i + 1}: Invalid URL: ${citation.url}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if URL is valid
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

