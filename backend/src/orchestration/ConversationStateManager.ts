/**
 * ConversationStateManager
 * 
 * Manages conversation state using a Finite State Machine (FSM).
 * 
 * Responsibilities:
 * - Track current conversation state
 * - Validate state transitions
 * - Persist state to Supabase
 * - Load state from Supabase
 * 
 * Rules:
 * - State is ALWAYS persisted to database
 * - State transitions must be valid according to FSM rules
 * - Context (preferences, collected fields) is part of state
 */

import { ConversationState, ConversationContext, TripPreferences } from './types';
import { getSupabaseClient } from '../db/supabase';

/**
 * Valid state transitions in the FSM
 * Maps from current state to allowed next states
 */
const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  [ConversationState.INIT]: [
    ConversationState.COLLECTING_PREFS,
    ConversationState.INIT, // Can stay in INIT if request is incomplete
  ],
  [ConversationState.COLLECTING_PREFS]: [
    ConversationState.COLLECTING_PREFS, // Continue collecting
    ConversationState.CONFIRMING,        // Ready to confirm
    ConversationState.INIT,              // Reset if needed
  ],
  [ConversationState.CONFIRMING]: [
    ConversationState.COLLECTING_PREFS,  // Need more info
    ConversationState.PLANNED,           // Confirmed, generate plan
    ConversationState.INIT,              // Cancel
  ],
  [ConversationState.PLANNED]: [
    ConversationState.EDITING,           // User wants to edit
    ConversationState.EXPLAINING,        // User asking questions
    ConversationState.PLANNED,           // Stay in planned (viewing)
  ],
  [ConversationState.EDITING]: [
    ConversationState.PLANNED,           // Edit complete
    ConversationState.EDITING,           // Continue editing
    ConversationState.EXPLAINING,        // Ask for explanation while editing
  ],
  [ConversationState.EXPLAINING]: [
    ConversationState.PLANNED,           // Back to viewing
    ConversationState.EDITING,           // Edit after explanation
    ConversationState.EXPLAINING,         // Continue explaining
  ],
};

export class ConversationStateManager {
  private supabase = getSupabaseClient();

  /**
   * Create a new conversation context
   * Called when user starts a new trip planning session
   */
  async createContext(preferences: Partial<TripPreferences> = {}): Promise<ConversationContext> {
    const context: ConversationContext = {
      state: ConversationState.INIT,
      preferences: {
        city: preferences.city || '',
        ...preferences,
      },
      collectedFields: [],
      missingFields: this.getRequiredFields(),
      questionsAsked: 0,
      userConfirmed: false,
      followUpCount: 0,
      userSaidNoPreferences: false,
      preferencesProvided: false,
      hasItinerary: false,
    };

    // Persist to database
    const { data: trip, error } = await this.supabase
      .from('trips')
      .insert({
        city: context.preferences.city || 'Unknown',
        preferences: context.preferences,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trip: ${error.message}`);
    }

    context.tripId = trip.id;
    return context;
  }

  /**
   * Load conversation context from database
   */
  async loadContext(tripId: string): Promise<ConversationContext | null> {
    const { data: trip, error } = await this.supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error || !trip) {
      return null;
    }

    // Get the latest transcript to infer current state
    // In a real implementation, we might store state explicitly
    // For now, we'll reconstruct from trip data
    const context: ConversationContext = {
      tripId: trip.id,
      state: ConversationState.INIT, // Will be updated by state machine
      preferences: (trip.preferences as TripPreferences) || {
        city: trip.city,
      },
      collectedFields: [],
      missingFields: [],
      questionsAsked: (trip.preferences as any)?.questionsAsked || 0,
      userConfirmed: (trip.preferences as any)?.userConfirmed || false,
      followUpCount: (trip.preferences as any)?.followUpCount || 0,
      userSaidNoPreferences: (trip.preferences as any)?.userSaidNoPreferences || false,
      preferencesProvided: (trip.preferences as any)?.preferencesProvided || false,
      hasItinerary: (trip.preferences as any)?.hasItinerary || false,
    };

    // Check if itinerary exists (means we're in PLANNED state)
    const { data: itinerary } = await this.supabase
      .from('itineraries')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .single();

    if (itinerary) {
      context.state = ConversationState.PLANNED;
    } else if (context.preferences.city) {
      // Have city but no itinerary - likely collecting prefs or confirming
      context.state = ConversationState.COLLECTING_PREFS;
    }

    return context;
  }

  /**
   * Update conversation context and persist to database
   */
  async updateContext(
    context: ConversationContext,
    updates: Partial<ConversationContext>
  ): Promise<ConversationContext> {
    const updated = { ...context, ...updates };

    // Validate state transition if state changed
    if (updates.state && updates.state !== context.state) {
      if (!this.isValidTransition(context.state, updates.state)) {
        throw new Error(
          `Invalid state transition: ${context.state} -> ${updates.state}`
        );
      }
    }

    // Persist preferences to database
    if (updates.preferences && context.tripId) {
      // Update both preferences JSONB and city column if city changed
      const updateData: any = {
        preferences: updated.preferences,
        updated_at: new Date().toISOString(),
      };
      
      // If city preference changed, also update the city column
      if (updated.preferences.city && updated.preferences.city !== 'Unknown' && updated.preferences.city !== '') {
        updateData.city = updated.preferences.city;
      }
      
      const { error } = await this.supabase
        .from('trips')
        .update(updateData)
        .eq('id', context.tripId);

      if (error) {
        throw new Error(`Failed to update trip: ${error.message}`);
      }
    }

    return updated;
  }

  /**
   * Transition to a new state
   * Validates the transition before applying
   */
  async transitionTo(
    context: ConversationContext,
    newState: ConversationState,
    reason?: string
  ): Promise<ConversationContext> {
    if (!this.isValidTransition(context.state, newState)) {
      throw new Error(
        `Invalid state transition: ${context.state} -> ${newState}. ` +
        `Reason: ${reason || 'No reason provided'}`
      );
    }

    return this.updateContext(context, { state: newState });
  }

  /**
   * Check if a state transition is valid
   */
  isValidTransition(from: ConversationState, to: ConversationState): boolean {
    const allowed = VALID_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Get required fields for trip planning
   * These must be collected before generating itinerary
   */
  private getRequiredFields(): string[] {
    return ['city', 'duration', 'startDate'];
  }

  /**
   * Check if we have enough information to proceed to confirmation
   */
  canProceedToConfirmation(context: ConversationContext): boolean {
    const required = this.getRequiredFields();
    const collected = context.collectedFields || [];
    
    // Check if all required fields are collected
    return required.every(field => collected.includes(field));
  }

  /**
   * Get the next state based on current context
   * This is a helper for the orchestrator to decide next state
   */
  getSuggestedNextState(context: ConversationContext): ConversationState {
    switch (context.state) {
      case ConversationState.INIT:
        if (context.preferences.city) {
          return ConversationState.COLLECTING_PREFS;
        }
        return ConversationState.INIT;

      case ConversationState.COLLECTING_PREFS:
        if (this.canProceedToConfirmation(context)) {
          return ConversationState.CONFIRMING;
        }
        return ConversationState.COLLECTING_PREFS;

      case ConversationState.CONFIRMING:
        // Stay in confirming until user confirms
        return ConversationState.CONFIRMING;

      case ConversationState.PLANNED:
        // Default to planned, will change based on user intent
        return ConversationState.PLANNED;

      default:
        return context.state;
    }
  }
}

