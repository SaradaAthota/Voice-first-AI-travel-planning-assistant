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
        console.error('Intent classification: No response from LLM');
        throw new Error('No response from LLM');
      }

      console.log('Intent classification LLM response:', content);
      
      let classification: IntentClassification;
      try {
        classification = JSON.parse(content) as IntentClassification;
      } catch (parseError) {
        console.error('Intent classification: Failed to parse JSON:', parseError);
        console.error('Raw LLM response:', content);
        throw new Error('Failed to parse LLM response as JSON');
      }
      
      // Validate and normalize the classification
      const validated = this.validateClassification(classification);
      console.log('Intent classification validated:', validated);
      return validated;
    } catch (error) {
      console.error('Intent classification error:', error);
      console.log('Falling back to keyword-based classification for message:', message);
      
      // Fallback to simple keyword-based classification
      const fallback = this.fallbackClassification(message, context);
      console.log('Fallback classification result:', fallback);
      return fallback;
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
- EDIT_ITINERARY: User wants to edit the itinerary (e.g., "Make Day 2 more relaxed", "Exchange day 1 and day 2", "Remove X from day Y", "Swap day 1 and day 2"). IMPORTANT: If message contains edit keywords (remove, swap, change, modify) AND itinerary exists, classify as EDIT_ITINERARY even if it also mentions "share" or "send".
- EXPLAIN: User asking for explanation (e.g., "Why did you pick this place?")
- CLARIFY: User asking for clarification (e.g., "What do you mean?")
- SEND_EMAIL: User wants to send itinerary via email (e.g., "Send me the itinerary via email", "Email me the PDF", "Send PDF to my email", "share it to me", "share the itinerary", "send it to my email", "mail it to me"). IMPORTANT: Only classify as SEND_EMAIL if NO edit keywords are present.

Current conversation state: ${context.state}
Current preferences: ${JSON.stringify(context.preferences, null, 2)}

Extract entities from the message:
- city: City name
- duration: Number of days
- startDate: Date or relative date (e.g., "next weekend")
- interests: Array of interests (food, culture, history, etc.)
- pace: relaxed, moderate, or fast
- editTarget: For edits, extract as object with:
  * day: Day number (1, 2, etc.) if mentioned (e.g., "day 1", "day one", "first day" = 1, "day 2", "day two", "second day" = 2)
  * block: "morning", "afternoon", or "evening" if mentioned
  * type: "remove" if "remove" or "delete" mentioned, "swap" if "swap" or "exchange" mentioned, "add" if "add" mentioned, "relax" if "relax" mentioned, "reduce_travel" if "reduce travel" or "travel time" mentioned
  * poiName: Name of POI to remove/add if mentioned (e.g., "ambassador visit", "Chandragiri fort")
  * targetTravelTime: Number in minutes if mentioned (e.g., "45 minutes", "1 hour" = 60)
  
IMPORTANT: If message contains "remove X from day Y", extract:
  - type: "remove"
  - day: Y (the day number)
  - poiName: X (the POI name)
  
If message contains "swap day X and day Y", extract:
  - type: "swap"
  - day: X (the first day to swap)
- email: Email address (for SEND_EMAIL intent, extract if mentioned in message, e.g., "send to john@example.com" or "email me at test@gmail.com")

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

    // Check for EDIT_ITINERARY FIRST (highest priority) - if edits are mentioned, prioritize edits
    const hasEditKeywords = lowerMessage.includes('remove') || 
                           lowerMessage.includes('swap') || 
                           lowerMessage.includes('change') || 
                           lowerMessage.includes('modify') ||
                           lowerMessage.includes('edit');
    
    if (hasEditKeywords) {
      return {
        intent: UserIntent.EDIT_ITINERARY,
        confidence: 0.9,
        entities: {},
        requiresClarification: false,
      };
    }

    // Check for SEND_EMAIL (before PLAN_TRIP) - but only if no edit keywords
    if (
      (lowerMessage.includes('share') && (lowerMessage.includes('itinerary') || lowerMessage.includes('it') || lowerMessage.includes('to me'))) ||
      (lowerMessage.includes('send') && (lowerMessage.includes('itinerary') || lowerMessage.includes('email') || lowerMessage.includes('mail'))) ||
      (lowerMessage.includes('email') && lowerMessage.includes('itinerary')) ||
      lowerMessage.includes('share it to me') ||
      lowerMessage.includes('share the itinerary')
    ) {
      return {
        intent: UserIntent.SEND_EMAIL,
        confidence: 0.9,
        entities: {},
        requiresClarification: false,
      };
    }

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

    // Check for CONFIRM intent - includes explicit itinerary generation requests
    // This MUST catch all variations of "share itinerary", "generate itinerary", "build itinerary", etc.
    const confirmKeywords = [
      'yes', 'correct', 'confirm', 'finalize', 'finalise', 'go ahead',
      'that works', 'sounds good', 'proceed', 'okay', 'ok'
    ];
    
    const itineraryActionKeywords = [
      'generate', 'get', 'create', 'build', 'show', 'share', 'call'
    ];
    
    const itineraryKeywords = [
      'itinerary', 'plan', 'trip'
    ];
    
    // Check for simple confirmations
    if (confirmKeywords.some(k => lowerMessage.includes(k))) {
      return {
        intent: UserIntent.CONFIRM,
        confidence: 0.9,
        entities: {},
        requiresClarification: false,
      };
    }
    
    // Check for explicit itinerary generation requests
    // Examples: "generate itinerary", "share the itinerary", "call the itinerary builder tool"
    const hasItineraryAction = itineraryActionKeywords.some(action => 
      lowerMessage.includes(action) && 
      (itineraryKeywords.some(it => lowerMessage.includes(it)) || 
       lowerMessage.includes('builder') ||
       lowerMessage.includes('tool'))
    );
    
    // Also check for phrases like "please share", "now please generate", "without delay"
    const hasUrgentRequest = (
      (lowerMessage.includes('please') || lowerMessage.includes('now')) &&
      (lowerMessage.includes('share') || lowerMessage.includes('generate') || lowerMessage.includes('build'))
    ) || lowerMessage.includes('without') && (lowerMessage.includes('delay') || lowerMessage.includes('further'));
    
    if (hasItineraryAction || hasUrgentRequest || 
        lowerMessage.includes('get me the itinerary') ||
        lowerMessage.includes('generate the itinerary') ||
        lowerMessage.includes('create the itinerary') ||
        lowerMessage.includes('share the itinerary') ||
        lowerMessage.includes('call the itinerary builder') ||
        lowerMessage.includes('build the itinerary share it')) {
      return {
        intent: UserIntent.CONFIRM,
        confidence: 0.95, // High confidence for explicit requests
        entities: {},
        requiresClarification: false,
      };
    }

    // Check for SEND_EMAIL intent - catch phrases like "share it to me", "send it via email", etc.
    if (
      (lowerMessage.includes('send') && (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('pdf'))) ||
      (lowerMessage.includes('email') && (lowerMessage.includes('itinerary') || lowerMessage.includes('pdf') || lowerMessage.includes('plan'))) ||
      (lowerMessage.includes('share') && (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('pdf') || lowerMessage.includes('it to me') || lowerMessage.includes('itinerary') || lowerMessage.includes('it'))) ||
      (lowerMessage.includes('mail') && (lowerMessage.includes('itinerary') || lowerMessage.includes('pdf') || lowerMessage.includes('it'))) ||
      (lowerMessage.includes('pdf') && (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('send'))) ||
      lowerMessage === 'share it to me' ||
      lowerMessage === 'share it' ||
      lowerMessage.startsWith('share it') ||
      (lowerMessage.includes('share') && lowerMessage.includes('it'))
    ) {
      return {
        intent: UserIntent.SEND_EMAIL,
        confidence: 0.8,
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

