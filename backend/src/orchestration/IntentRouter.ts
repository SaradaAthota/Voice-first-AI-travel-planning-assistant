/**
 * IntentRouter
 * 
 * Routes user messages to appropriate intents.
 * 
 * Responsibilities:
 * - Classify user intent from natural language
 * - Extract entities (city, duration, preferences, etc.)
 * - Determine if clarification is needed
 * - Provide clarification questions when needed
 * 
 * Rules:
 * - Uses LLM for intent classification (single LLM agent)
 * - Returns structured intent classification
 * - Handles ambiguous inputs gracefully
 */

import OpenAI from 'openai';
import { UserIntent, IntentClassification, ConversationContext } from './types';
import { config } from '../config/env';

export class IntentRouter {
  private openai: OpenAI;

  constructor() {
    if (!config.openai?.apiKey) {
      throw new Error('OpenAI API key is required for IntentRouter');
    }
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  /**
   * Classify user intent from message
   * 
   * This is the ONLY place where LLM is used for classification.
   * The orchestrator uses this result to decide tool calls.
   */
  async classifyIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentClassification> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildUserPrompt(message, context);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent classification
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const classification = JSON.parse(content) as IntentClassification;
      
      // Validate and normalize the classification
      return this.validateClassification(classification);
    } catch (error) {
      console.error('Intent classification error:', error);
      
      // Fallback to simple keyword-based classification
      return this.fallbackClassification(message, context);
    }
  }

  /**
   * Build system prompt for intent classification
   */
  private buildSystemPrompt(context: ConversationContext): string {
    return `You are an intent classifier for a voice-first travel planning assistant.

Your job is to classify user messages into one of these intents:
- PLAN_TRIP: User wants to plan a new trip (e.g., "Plan a 3-day trip to Jaipur")
- PROVIDE_PREFERENCE: User providing preference information (e.g., "I like food and culture")
- CONFIRM: User confirming constraints or preferences (e.g., "Yes, that's correct")
- EDIT_ITINERARY: User wants to edit the itinerary (e.g., "Make Day 2 more relaxed")
- EXPLAIN: User asking for explanation (e.g., "Why did you pick this place?")
- CLARIFY: User asking for clarification (e.g., "What do you mean?")

Current conversation state: ${context.state}
Current preferences: ${JSON.stringify(context.preferences, null, 2)}

Extract entities from the message:
- city: City name
- duration: Number of days
- startDate: Date or relative date (e.g., "next weekend")
- interests: Array of interests (food, culture, history, etc.)
- pace: relaxed, moderate, or fast
- editTarget: For edits, which day/block is being edited

Return JSON with:
{
  "intent": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "entities": { ... },
  "requiresClarification": true/false,
  "clarificationQuestion": "question if needed"
}`;
  }

  /**
   * Build user prompt with message and context
   */
  private buildUserPrompt(message: string, _context: ConversationContext): string {
    return `User message: "${message}"

Classify the intent and extract entities.`;
  }

  /**
   * Validate and normalize classification result
   */
  private validateClassification(
    classification: any
  ): IntentClassification {
    // Ensure intent is valid
    const intent = Object.values(UserIntent).includes(classification.intent)
      ? classification.intent
      : UserIntent.CLARIFY;

    // Ensure confidence is between 0 and 1
    const confidence = Math.max(0, Math.min(1, classification.confidence || 0.5));

    // Ensure entities is an object
    const entities = classification.entities || {};

    // Ensure requiresClarification is boolean
    const requiresClarification = Boolean(classification.requiresClarification);

    return {
      intent,
      confidence,
      entities,
      requiresClarification,
      clarificationQuestion: classification.clarificationQuestion,
    };
  }

  /**
   * Fallback classification using simple keyword matching
   * Used when LLM call fails
   */
  private fallbackClassification(
    message: string,
    _context: ConversationContext
  ): IntentClassification {
    const lowerMessage = message.toLowerCase();

    // Simple keyword-based classification
    if (lowerMessage.includes('plan') || lowerMessage.includes('trip')) {
      return {
        intent: UserIntent.PLAN_TRIP,
        confidence: 0.7,
        entities: {},
        requiresClarification: false,
      };
    }

    if (
      lowerMessage.includes('edit') ||
      lowerMessage.includes('change') ||
      lowerMessage.includes('swap') ||
      lowerMessage.includes('modify')
    ) {
      return {
        intent: UserIntent.EDIT_ITINERARY,
        confidence: 0.7,
        entities: {},
        requiresClarification: false,
      };
    }

    if (
      lowerMessage.includes('why') ||
      lowerMessage.includes('explain') ||
      lowerMessage.includes('reason')
    ) {
      return {
        intent: UserIntent.EXPLAIN,
        confidence: 0.7,
        entities: {},
        requiresClarification: false,
      };
    }

    if (
      lowerMessage.includes('yes') ||
      lowerMessage.includes('correct') ||
      lowerMessage.includes('confirm')
    ) {
      return {
        intent: UserIntent.CONFIRM,
        confidence: 0.7,
        entities: {},
        requiresClarification: false,
      };
    }

    // Default to collecting preferences
    return {
      intent: UserIntent.PROVIDE_PREFERENCE,
      confidence: 0.5,
      entities: {},
      requiresClarification: false,
    };
  }

  /**
   * Extract city from message
   * Helper method for entity extraction
   */
  extractCity(message: string): string | null {
    // Simple extraction - in production, use NER or LLM
    const cityPatterns = [
      /(?:to|in|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:trip|visit|travel)/,
    ];

    for (const pattern of cityPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract duration from message
   */
  extractDuration(message: string): number | null {
    const durationPattern = /(\d+)\s*(?:day|days)/i;
    const match = message.match(durationPattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }
}

