/**
 * Explanation Composer
 * 
 * Composes explanations by combining:
 * - POI metadata (OSM)
 * - RAG retrieved text
 * - Constraints (pace, weather if available)
 * 
 * Rules:
 * - If RAG data missing → explicitly say so
 * - Return citations for UI display
 * - No hallucinated facts allowed
 */

import OpenAI from 'openai';
import {
  ConversationContext,
  ComposedResponse,
  Citation,
} from './types';
import { POI } from '../mcp-tools/poi-search/types';
import { retrieveForExplanationRAG, getDataNotAvailableResponse } from '../rag/rag-service';
import { config } from '../config/env';

export interface ExplanationRequest {
  question: string;
  context: ConversationContext;
  poi?: POI; // POI being explained
  constraints?: {
    pace?: 'relaxed' | 'moderate' | 'fast';
    weather?: string; // Weather information if available
  };
}

export interface ExplanationData {
  poiMetadata?: POIMetadata;
  ragContent?: string;
  ragCitations?: Citation[];
  constraints?: {
    pace?: string;
    weather?: string;
  };
  hasRAGData: boolean;
}

export interface POIMetadata {
  name: string;
  category: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  osmId: number;
  osmType: string;
  tags: Record<string, string>;
  description?: string;
}

export class ExplanationComposer {
  private openai: OpenAI;

  constructor() {
    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API key is required for ExplanationComposer');
    }
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  /**
   * Compose explanation by combining all available data sources
   */
  async composeExplanation(request: ExplanationRequest): Promise<ComposedResponse> {
    // Step 1: Extract POI metadata if available
    const poiMetadata = request.poi ? this.extractPOIMetadata(request.poi) : undefined;

    // Step 2: Retrieve RAG data
    const ragResult = await this.retrieveRAGData(request);

    // Step 3: Prepare constraints
    const constraints = this.prepareConstraints(request);

    // Step 4: Build explanation data
    const explanationData: ExplanationData = {
      poiMetadata,
      ragContent: ragResult.chunks.length > 0
        ? ragResult.chunks.map(c => c.text).join('\n\n')
        : undefined,
      ragCitations: ragResult.citations,
      constraints,
      hasRAGData: ragResult.hasData,
    };

    // Step 5: Generate explanation using LLM
    const explanation = await this.generateExplanation(request.question, explanationData);

    // Step 6: Collect all citations
    const citations = this.collectCitations(explanationData);

    return {
      text: explanation,
      citations: citations.length > 0 ? citations : undefined,
      state: request.context.state,
      metadata: {
        tripId: request.context.tripId,
        hasRAGData: explanationData.hasRAGData,
        hasPOIData: !!poiMetadata,
      },
    };
  }

  /**
   * Extract POI metadata
   */
  private extractPOIMetadata(poi: POI): POIMetadata {
    return {
      name: poi.name,
      category: poi.category,
      coordinates: poi.coordinates,
      osmId: poi.osmId,
      osmType: poi.osmType,
      tags: poi.tags,
      description: poi.description,
    };
  }

  /**
   * Retrieve RAG data for explanation
   */
  private async retrieveRAGData(request: ExplanationRequest): Promise<{
    chunks: Array<{ text: string; metadata: any }>;
    citations: Citation[];
    hasData: boolean;
  }> {
    const city = request.context.preferences.city;
    if (!city) {
      return { chunks: [], citations: [], hasData: false };
    }

    // Build query from question and POI context
    let query = request.question;
    if (request.poi) {
      query = `${request.question} about ${request.poi.name} in ${city}`;
    }

    try {
      const ragResult = await retrieveForExplanationRAG(query, city, request.poi?.name);
      return {
        chunks: ragResult.chunks.map(c => ({
          text: c.text,
          metadata: c.metadata,
        })),
        citations: ragResult.citations,
        hasData: ragResult.hasData,
      };
    } catch (error) {
      console.error('RAG retrieval error:', error);
      return { chunks: [], citations: [], hasData: false };
    }
  }

  /**
   * Prepare constraints for explanation
   */
  private prepareConstraints(request: ExplanationRequest): {
    pace?: string;
    weather?: string;
  } {
    const constraints: { pace?: string; weather?: string } = {};

    // Get pace from context or request
    const pace = request.constraints?.pace || request.context.preferences.pace;
    if (pace) {
      constraints.pace = pace;
    }

    // Get weather if available
    if (request.constraints?.weather) {
      constraints.weather = request.constraints.weather;
    }

    return constraints;
  }

  /**
   * Generate explanation using LLM
   */
  private async generateExplanation(
    question: string,
    data: ExplanationData
  ): Promise<string> {
    // If no data available, return explicit message
    if (!data.hasRAGData && !data.poiMetadata) {
      return getDataNotAvailableResponse(question);
    }

    const systemPrompt = this.buildSystemPrompt(data);
    const userPrompt = this.buildUserPrompt(question, data);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
      });

      let explanation = response.choices[0]?.message?.content || 'I cannot provide an explanation at this time.';

      // Ensure missing data is mentioned if applicable
      if (!data.hasRAGData && data.poiMetadata) {
        // Check if explanation mentions missing data
        if (!explanation.toLowerCase().includes('not available') &&
            !explanation.toLowerCase().includes("don't have") &&
            !explanation.toLowerCase().includes('limited information')) {
          explanation += ' Note: I have limited information about this from my knowledge base.';
        }
      }

      return this.optimizeForVoice(explanation);
    } catch (error) {
      console.error('Explanation generation error:', error);
      return this.fallbackExplanation(question, data);
    }
  }

  /**
   * Build system prompt for explanation
   */
  private buildSystemPrompt(data: ExplanationData): string {
    let prompt = `You are explaining travel planning decisions.
Your explanations must be:
- Grounded in the provided data
- Clear and concise for voice
- Honest about data limitations

`;

    if (!data.hasRAGData) {
      prompt += `IMPORTANT: RAG data is NOT available. You must explicitly mention this limitation.
Say something like "I don't have detailed information about this in my knowledge base" or "This information may not be available."\n\n`;
    }

    if (data.poiMetadata) {
      prompt += `You have POI metadata available (from OpenStreetMap).\n`;
    }

    if (data.constraints?.pace) {
      prompt += `User's travel pace: ${data.constraints.pace}\n`;
    }

    if (data.constraints?.weather) {
      prompt += `Weather information: ${data.constraints.weather}\n`;
    }

    prompt += `\nRules:
- Only use information from provided data
- If data is missing, explicitly say so
- Cite sources naturally (e.g., "According to Wikivoyage...")
- Be honest about limitations`;

    return prompt;
  }

  /**
   * Build user prompt with all available data
   */
  private buildUserPrompt(question: string, data: ExplanationData): string {
    let prompt = `User asked: "${question}"\n\n`;

    // Add POI metadata
    if (data.poiMetadata) {
      prompt += `POI Information (from OpenStreetMap):\n`;
      prompt += `Name: ${data.poiMetadata.name}\n`;
      prompt += `Category: ${data.poiMetadata.category}\n`;
      if (data.poiMetadata.description) {
        prompt += `Description: ${data.poiMetadata.description}\n`;
      }
      prompt += `OSM ID: ${data.poiMetadata.osmId}\n`;
      if (Object.keys(data.poiMetadata.tags).length > 0) {
        prompt += `Tags: ${JSON.stringify(data.poiMetadata.tags, null, 2)}\n`;
      }
      prompt += '\n';
    }

    // Add RAG content
    if (data.hasRAGData && data.ragContent) {
      prompt += `Travel Guide Information (from RAG):\n${data.ragContent}\n\n`;
    } else {
      prompt += `Travel Guide Information: NOT AVAILABLE\n\n`;
    }

    // Add constraints
    if (data.constraints) {
      prompt += `Constraints:\n`;
      if (data.constraints.pace) {
        prompt += `- Travel pace: ${data.constraints.pace}\n`;
      }
      if (data.constraints.weather) {
        prompt += `- Weather: ${data.constraints.weather}\n`;
      }
      prompt += '\n';
    }

    prompt += `Compose a clear, grounded explanation that answers the user's question.
If information is missing, explicitly state that.`;

    return prompt;
  }

  /**
   * Collect all citations
   */
  private collectCitations(data: ExplanationData): Citation[] {
    const citations: Citation[] = [];

    // Add RAG citations
    if (data.ragCitations && data.ragCitations.length > 0) {
      citations.push(...data.ragCitations);
    }

    // Add OSM citation if POI metadata available
    if (data.poiMetadata) {
      citations.push({
        source: 'OpenStreetMap',
        url: `https://www.openstreetmap.org/${data.poiMetadata.osmType}/${data.poiMetadata.osmId}`,
        excerpt: `POI data for ${data.poiMetadata.name}`,
        confidence: 1.0,
      });
    }

    return citations;
  }

  /**
   * Optimize text for voice/TTS
   */
  private optimizeForVoice(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
      .trim();
  }

  /**
   * Fallback explanation when LLM fails
   */
  private fallbackExplanation(question: string, data: ExplanationData): string {
    if (data.poiMetadata) {
      return `I can tell you that ${data.poiMetadata.name} is a ${data.poiMetadata.category} location. ` +
        (data.hasRAGData
          ? 'I have some additional information from travel guides.'
          : 'However, I don\'t have detailed information about this in my knowledge base.');
    }

    if (!data.hasRAGData) {
      return getDataNotAvailableResponse(question);
    }

    return 'I apologize, I encountered an error while preparing the explanation.';
  }
}

