/**
 * Orchestrator
 * 
 * Main orchestration class that coordinates all modules.
 * 
 * This is the SINGLE entry point for processing user messages.
 * 
 * Flow:
 * 1. Load/create conversation context
 * 2. Route user intent
 * 3. Decide tool calls (orchestrator, not LLM)
 * 4. Execute tool calls with logging
 * 5. Compose response (LLM for text, not tools)
 * 6. Apply policy guards
 * 7. Update state and persist
 * 
 * Rules:
 * - Exactly ONE LLM agent (used here for intent + response)
 * - LLM never calls tools directly
 * - All tool calls go through ToolOrchestrator
 * - State is always persisted
 */

import {
  OrchestratorInput,
  OrchestratorOutput,
  ConversationContext,
  ConversationState,
  UserIntent,
} from './types';
import { ConversationStateManager } from './ConversationStateManager';
import { IntentRouter } from './IntentRouter';
import { ToolOrchestrator } from './ToolOrchestrator';
import { ResponseComposer } from './ResponseComposer';
import { ExplanationComposer } from './ExplanationComposer';
import { PolicyGuards } from './PolicyGuards';
import { getSupabaseClient } from '../db/supabase';
import { POI } from '../mcp-tools/poi-search/types';
import { ItineraryOutput } from '../mcp-tools/itinerary-builder/types';
import { runItineraryEvaluations } from '../evaluations/eval-runner';
import { EvalContext } from '../evaluations/types';

// PHASE 1: Define REQUIRED trip fields (hard-coded, not in prompt)
// Note: Currently using isTripReady() instead of this constant
// Removed unused constant - REQUIRED_TRIP_FIELDS logic is handled by isTripReady()
const MAX_FOLLOW_UP_QUESTIONS = 6; // Hard limit for follow-up questions

/**
 * 1️⃣ isTripReady() Readiness Evaluator
 * Checks if trip has enough information to generate itinerary
 */
function isTripReady(context: ConversationContext): boolean {
  return Boolean(
    context.preferences.city &&
    context.preferences.duration &&
    context.preferences.startDate &&
    (
      context.preferencesProvided === true ||
      context.userSaidNoPreferences === true
    )
  );
}

/**
 * Detect if user said "no preferences" or "you decide"
 */
function detectNoPreferences(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const noPreferencePhrases = [
    'no preferences',
    'you decide',
    'best ones according to you',
    'whatever you think',
    'your choice',
    'you choose',
    'no specific preferences',
    'any preferences',
    'no particular preferences',
  ];
  return noPreferencePhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Detect force-generate phrases (explicit user request to generate/share itinerary)
 */
function detectForceGenerate(message: string): boolean {
  const forceGeneratePattern = /share.*itinerary|generate.*itinerary|without further delay|without any delay|now please.*itinerary|create.*itinerary.*now/i;
  return forceGeneratePattern.test(message);
}

/**
 * STEP 2: Detect user confirmation intent (lightweight rules-based)
 * This catches explicit requests to generate/share/build the itinerary
 */
function isUserConfirming(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const confirmations = [
    'yes',
    'yes exactly',
    'looks good',
    'proceed',
    'go ahead',
    'get me the itinerary',
    'generate itinerary',
    'please proceed',
    'create itinerary',
    'build itinerary',
    'show itinerary',
    'share itinerary',
    'share the itinerary',
    'please share',
    'please share the itinerary',
    'call the itinerary builder',
    'call the itinerary builder tool',
    'build the itinerary',
    'build the itinerary share it',
    'that\'s right',
    'correct',
    'sounds good',
    'that works',
    'okay',
    'ok',
    'confirm',
    'finalize',
    'without any delay',
    'without further delay',
    'now please',
    'now please generate',
    'now please share',
  ];

  // Check for explicit itinerary generation requests
  const hasItineraryKeywords = 
    lowerMessage.includes('itinerary') || 
    lowerMessage.includes('plan') ||
    lowerMessage.includes('share') ||
    lowerMessage.includes('generate') ||
    lowerMessage.includes('build') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('show') ||
    lowerMessage.includes('get');
  
  const hasActionKeywords = 
    lowerMessage.includes('please') ||
    lowerMessage.includes('now') ||
    lowerMessage.includes('proceed') ||
    lowerMessage.includes('go ahead') ||
    lowerMessage.includes('call') ||
    lowerMessage.includes('tool');

  // If message contains both itinerary keywords AND action keywords, it's a confirmation
  if (hasItineraryKeywords && (hasActionKeywords || confirmations.some(p => lowerMessage.includes(p)))) {
    return true;
  }

  return confirmations.some(p => lowerMessage.includes(p));
}

export class Orchestrator {
  private stateManager: ConversationStateManager;
  private intentRouter: IntentRouter;
  private toolOrchestrator: ToolOrchestrator;
  private responseComposer: ResponseComposer;
  private explanationComposer: ExplanationComposer;
  private policyGuards: PolicyGuards;
  private supabase = getSupabaseClient();

  constructor() {
    this.stateManager = new ConversationStateManager();
    this.intentRouter = new IntentRouter();
    this.toolOrchestrator = new ToolOrchestrator();
    this.responseComposer = new ResponseComposer();
    this.explanationComposer = new ExplanationComposer();
    this.policyGuards = new PolicyGuards();
  }

  /**
   * Process user message through the orchestration pipeline
   * 
   * This is the MAIN method called by the API endpoint.
   */
  async process(input: OrchestratorInput): Promise<OrchestratorOutput> {
    console.log('=== ORCHESTRATOR PROCESS START ===');
    console.log('Input:', input);
    
    // Step 1: Load or create conversation context
    let context: ConversationContext;
    
    // Check if this is a simple greeting - if so, always create new context
    const isSimpleGreeting = /^(hi|hello|hey|how are you|how's it going)[\s!?.,]*$/i.test(input.message.trim());
    
    if (input.tripId && !isSimpleGreeting) {
      console.log('Loading existing context for tripId:', input.tripId);
      const loaded = await this.stateManager.loadContext(input.tripId);
      if (!loaded) {
        console.log('Context not found, creating new one');
        context = await this.stateManager.createContext();
      } else {
        context = loaded;
      }
    } else {
      // New conversation or simple greeting - create fresh context
      if (isSimpleGreeting) {
        console.log('Simple greeting detected, creating fresh context');
      } else {
        console.log('Creating new context...');
      }
      context = await this.stateManager.createContext();
      console.log('Context created. tripId:', context.tripId);
    }

    // Step 2: Route user intent
    // LLM is used HERE for intent classification (single LLM agent)
    console.log('Classifying intent for message:', input.message);
    let intentClassification: any;
    try {
      intentClassification = await this.intentRouter.classifyIntent(
        input.message,
        context
      );
    } catch (error) {
      console.error('CRITICAL: Intent classification failed:', error);
      // Use fallback - treat as CONFIRM if message contains itinerary keywords
      const lowerMessage = input.message.toLowerCase();
      if (lowerMessage.includes('itinerary') || lowerMessage.includes('share') || lowerMessage.includes('generate') || lowerMessage.includes('build')) {
        console.log('Using emergency fallback: CONFIRM intent');
        intentClassification = {
          intent: 'CONFIRM',
          confidence: 0.8,
          entities: {},
          requiresClarification: false,
        };
      } else {
        intentClassification = {
          intent: 'PROVIDE_PREFERENCE',
          confidence: 0.5,
          entities: {},
          requiresClarification: false,
        };
      }
    }
    
    if (!intentClassification || !intentClassification.intent) {
      console.error('CRITICAL: Intent classification returned undefined or invalid result');
      console.error('Classification result:', intentClassification);
      // Emergency fallback
      const lowerMessage = input.message.toLowerCase();
      if (lowerMessage.includes('itinerary') || lowerMessage.includes('share') || lowerMessage.includes('generate') || lowerMessage.includes('build')) {
        intentClassification = {
          intent: 'CONFIRM',
          confidence: 0.8,
          entities: {},
          requiresClarification: false,
        };
      } else {
        intentClassification = {
          intent: 'PROVIDE_PREFERENCE',
          confidence: 0.5,
          entities: {},
          requiresClarification: false,
        };
      }
    }
    
    console.log('Intent classified:', {
      intent: intentClassification.intent,
      confidence: intentClassification.confidence,
      entities: intentClassification.entities,
    });

    // Update context with extracted entities
    if (intentClassification.entities) {
      context = await this.updateContextWithEntities(
        context,
        intentClassification.entities
      );
      console.log('Context after entity update:', {
        state: context.state,
        collectedFields: context.collectedFields,
        missingFields: context.missingFields,
        hasCity: !!context.preferences.city,
        hasDuration: !!context.preferences.duration,
        hasStartDate: !!context.preferences.startDate,
      });
    }

    // STEP 2 & 3: Detect user signals BEFORE state transitions
    const isConfirming = isUserConfirming(input.message);
    const saidNoPreferences = detectNoPreferences(input.message);
    let forceGenerate = detectForceGenerate(input.message);
    
    // Update context with detected signals
    const contextUpdates: Partial<ConversationContext> = {};
    if (isConfirming) {
      console.log('User confirmation detected → userConfirmed = true');
      contextUpdates.userConfirmed = true;
    }
    if (saidNoPreferences) {
      console.log('User said no preferences → userSaidNoPreferences = true');
      contextUpdates.userSaidNoPreferences = true;
      contextUpdates.preferencesProvided = true; // Treat as preferences provided
    }
    
    if (Object.keys(contextUpdates).length > 0) {
      context = await this.stateManager.updateContext(context, contextUpdates);
    }
    
    // Step 3: Handle state transitions BEFORE tool decisions (so tool decisions use correct state)
    const stateBeforeTransition = context.state;
    context = await this.handleStateTransition(context, intentClassification.intent);
    console.log('State transition:', {
      from: stateBeforeTransition,
      to: context.state,
      intent: intentClassification.intent,
      userConfirmed: context.userConfirmed,
      canProceedToConfirmation: this.stateManager.canProceedToConfirmation(context),
    });

    // 6️⃣ Stop follow-up questions after itinerary is ready
    if (context.hasItinerary) {
      console.log('Itinerary already exists - skipping follow-up questions');
      // Continue to handle the current intent (edit, explain, send email, etc.)
    }

    // 4️⃣ Fix Intent Arbitration (Critical Bug)
    // SEND_EMAIL must NEVER run without itinerary
    let resolvedIntent = intentClassification.intent;
    if (resolvedIntent === UserIntent.SEND_EMAIL && !context.hasItinerary) {
      console.log('SEND_EMAIL intent detected but no itinerary exists - converting to PLAN_TRIP');
      resolvedIntent = UserIntent.PLAN_TRIP;
      // Force generate itinerary first
      forceGenerate = true;
    }

    // 3️⃣ Force Itinerary Generation on Explicit User Request
    if (forceGenerate && isTripReady(context)) {
      console.log('Force-generate detected and trip is ready - generating itinerary immediately');
      context = await this.stateManager.updateContext(context, {
        userConfirmed: true,
      });
      context = await this.stateManager.transitionTo(
        context,
        ConversationState.CONFIRMING,
        'User explicitly requested itinerary generation'
      );
    }

    // 2️⃣ Add Follow-up Question Hard Limit (Max 6)
    const followUpCount = (context.followUpCount || 0);
    const shouldIncrementFollowUp = (context.state === ConversationState.INIT || context.state === ConversationState.COLLECTING_PREFS) &&
                                    resolvedIntent !== 'CONFIRM' &&
                                    resolvedIntent !== 'EDIT_ITINERARY' &&
                                    resolvedIntent !== 'EXPLAIN' &&
                                    resolvedIntent !== 'SEND_EMAIL' &&
                                    !context.hasItinerary &&
                                    !context.userConfirmed;
    
    if (shouldIncrementFollowUp) {
      const newFollowUpCount = followUpCount + 1;
      context = await this.stateManager.updateContext(context, {
        followUpCount: newFollowUpCount,
        questionsAsked: (context.questionsAsked || 0) + 1,
      });
      console.log(`Follow-up count: ${newFollowUpCount} of ${MAX_FOLLOW_UP_QUESTIONS}`);
    }

    // Check if trip is ready
    const tripReady = isTripReady(context);
    console.log('Trip readiness check:', {
      tripReady,
      hasCity: !!context.preferences.city,
      hasDuration: !!context.preferences.duration,
      hasStartDate: !!context.preferences.startDate,
      preferencesProvided: context.preferencesProvided,
      userSaidNoPreferences: context.userSaidNoPreferences,
      followUpCount: context.followUpCount || 0,
      hasItinerary: context.hasItinerary,
    });

    // 2️⃣ Force itinerary generation after 6 questions (hard limit)
    const currentFollowUpCount = context.followUpCount || 0;
    if (currentFollowUpCount >= MAX_FOLLOW_UP_QUESTIONS && !context.hasItinerary) {
      console.log(`Maximum ${MAX_FOLLOW_UP_QUESTIONS} follow-up questions reached - forcing itinerary generation`);
      context = await this.stateManager.updateContext(context, {
        userConfirmed: true,
        preferencesProvided: true, // Force as preferences provided
      });
      context = await this.stateManager.transitionTo(
        context,
        ConversationState.CONFIRMING,
        `Maximum ${MAX_FOLLOW_UP_QUESTIONS} questions asked - auto-generating`
      );
    }

    // FIX #1: AUTO-GENERATE ITINERARY WHEN TRIP IS READY
    // If trip is ready and no itinerary exists, automatically generate (BEFORE follow-up questions)
    // This must happen even if user hasn't explicitly confirmed - trip readiness is sufficient
    if (tripReady && !context.hasItinerary) {
      console.log('FIX #1: Trip is ready but no itinerary - auto-generating itinerary (no explicit confirmation needed)');
      context = await this.stateManager.updateContext(context, {
        userConfirmed: true, // Auto-confirm since trip is ready
      });
      context = await this.stateManager.transitionTo(
        context,
        ConversationState.CONFIRMING,
        'Trip is ready - auto-generating itinerary'
      );
      // Continue to tool execution below (don't ask follow-up questions)
    }

    // Check if we should ask a follow-up question
    const shouldAskQuestion = !context.hasItinerary &&
                             (context.state === ConversationState.INIT || context.state === ConversationState.COLLECTING_PREFS) &&
                             resolvedIntent !== 'CONFIRM' &&
                             resolvedIntent !== 'EDIT_ITINERARY' &&
                             resolvedIntent !== 'EXPLAIN' &&
                             resolvedIntent !== 'SEND_EMAIL' &&
                             !context.userConfirmed &&
                             !tripReady &&
                             (context.followUpCount || 0) < MAX_FOLLOW_UP_QUESTIONS;
    
    if (shouldAskQuestion) {
      console.log(`Asking follow-up question ${context.followUpCount || 0} of ${MAX_FOLLOW_UP_QUESTIONS}`);
      
      // Compose and return the follow-up question
      const followUpResponse = await this.responseComposer.composeResponse(
        context,
        [],
        input.message
      );

      return {
        response: followUpResponse,
        context,
        toolCalls: [],
        stateTransition: undefined,
      };
    }

    // STEP 4 & 5: Check if READY TO GENERATE
    const readyToGenerate = tripReady && (context.userConfirmed || (context.followUpCount || 0) >= MAX_FOLLOW_UP_QUESTIONS);
    console.log('READY_TO_GENERATE check:', {
      readyToGenerate,
      hasCity: !!context.preferences.city,
      hasDuration: !!context.preferences.duration,
      userConfirmed: context.userConfirmed,
      questionsAsked: context.questionsAsked || 0,
    });

    // Step 4: Decide tool calls (ORCHESTRATOR decides, not LLM)
    console.log('Deciding tool calls...');
    let toolDecisions: any[];
    
    // GUARD: Check for startDate before generating itinerary
    if (readyToGenerate && !context.preferences.startDate) {
      console.log('Ready to generate but startDate missing - asking for start date');
      const followUpResponse = await this.responseComposer.composeResponse(
        context,
        [],
        input.message
      );
      return {
        response: followUpResponse,
        context,
        toolCalls: [],
        stateTransition: undefined,
      };
    }

    // STEP 5: Force tool execution when ready (MUST run before generic heuristics)
    if (readyToGenerate && context.preferences.startDate) {
      console.log('READY_TO_GENERATE = true → Forcing itinerary_builder tool call');
      // PHASE 4: POI search disabled - use empty POIs array (tool will generate basic itinerary)
      // The tool requires POIs, but we'll pass empty array and let it handle gracefully
      toolDecisions = [{
        shouldCall: true,
        toolName: 'itinerary_builder',
        toolInput: {
          tripId: context.tripId,
          city: context.preferences.city,
          duration: context.preferences.duration,
          startDate: context.preferences.startDate, // NO FALLBACK - must be explicitly provided
          pace: context.preferences.pace || 'moderate',
          pois: [], // PHASE 4: Empty POIs array since POI search is disabled
        },
        reason: 'User confirmed and all required data available - READY_TO_GENERATE',
      }];
    } else {
      // Use generic tool heuristics
      toolDecisions = this.toolOrchestrator.decideToolCalls(
        context,
        intentClassification.intent
      );
    }
    console.log('Tool decisions:', toolDecisions.map(d => ({
      shouldCall: d.shouldCall,
      toolName: d.toolName,
      reason: d.reason,
    })));

    // Validate tool call decisions
    for (const decision of toolDecisions) {
      const check = this.policyGuards.validateToolCallDecision(decision);
      if (!check.allowed) {
        console.warn(`Policy violation: ${check.reason}`);
        // Continue but log warning
      }
    }

    // Step 5: Execute tool calls (if any)
    console.log('Executing tool calls...');
    const orchestrationResult = await this.toolOrchestrator.executeToolCalls(
      toolDecisions,
      context
    );
    console.log('Tool calls executed:', {
      count: orchestrationResult.toolCalls.length,
      toolNames: orchestrationResult.toolCalls.map(c => c.toolName),
      nextState: orchestrationResult.nextState,
    });

    // FIX #2: POI SEARCH FAILURE FALLBACK
    // Check if POI search failed and itinerary generation is needed
    const poiSearchCall = orchestrationResult.toolCalls.find(
      (call) => call.toolName === 'poi_search'
    );
    const poiSearchFailed = poiSearchCall && !poiSearchCall.output.success;
    const itineraryBuilderCall = orchestrationResult.toolCalls.find(
      (call) => call.toolName === 'itinerary_builder'
    );
    const itineraryGenerationNeeded = !itineraryBuilderCall || !itineraryBuilderCall.output.success;
    
    if (poiSearchFailed && itineraryGenerationNeeded && tripReady && !context.hasItinerary) {
      console.log('FIX #2: POI search failed - falling back to LLM-only itinerary generation');
      context = await this.stateManager.updateContext(context, {
        fallbackToLLMItinerary: true,
      });
      
      // Force itinerary generation with empty POIs (fallback mode)
      // Only if startDate is available
      if (!context.preferences.startDate) {
        console.log('POI search failed but startDate missing - cannot generate fallback itinerary');
        // Ask for startDate instead
        const followUpResponse = await this.responseComposer.composeResponse(
          context,
          [],
          input.message
        );
        return {
          response: followUpResponse,
          context,
          toolCalls: orchestrationResult.toolCalls,
        };
      }

      const fallbackToolDecision = {
        shouldCall: true,
        toolName: 'itinerary_builder',
        toolInput: {
          tripId: context.tripId,
          city: context.preferences.city,
          duration: context.preferences.duration,
          startDate: context.preferences.startDate, // NO FALLBACK - must be explicitly provided
          pace: context.preferences.pace || 'moderate',
          pois: [], // Empty POIs - LLM will generate generic itinerary
        },
        reason: 'POI search failed - using LLM-only fallback generation',
      };
      
      const fallbackResult = await this.toolOrchestrator.executeToolCalls(
        [fallbackToolDecision],
        context
      );
      
      // Merge fallback results with existing results
      orchestrationResult.toolCalls.push(...fallbackResult.toolCalls);
      console.log('FIX #2: Fallback itinerary generation completed');
      
      // FIX #2: Ensure hasItinerary is set after fallback generation
      const fallbackItineraryBuilt = fallbackResult.toolCalls.some(
        (call) => call.toolName === 'itinerary_builder' && call.output.success
      );
      if (fallbackItineraryBuilt) {
        // Validate itinerary structure before setting hasItinerary
        const fallbackItinerary = fallbackResult.toolCalls.find(
          (call) => call.toolName === 'itinerary_builder' && call.output.success
        )?.output.data as ItineraryOutput | undefined;
        
        if (fallbackItinerary && this.isValidItineraryStructure(fallbackItinerary)) {
          console.log('FIX #2: Fallback itinerary built successfully → hasItinerary = true');
          context = await this.stateManager.updateContext(context, {
            hasItinerary: true,
          });
          context.state = ConversationState.PLANNED;
        } else {
          console.error('FIX #2: Fallback itinerary structure invalid - NOT setting hasItinerary');
        }
      }
    }

    // 5️⃣ Correct hasItinerary Flag Handling
    const itineraryBuilt = orchestrationResult.toolCalls.some(
      (call) => call.toolName === 'itinerary_builder' && call.output.success
    );
    if (itineraryBuilt) {
      // Validate itinerary structure before setting hasItinerary
      const builtItinerary = orchestrationResult.toolCalls.find(
        (call) => call.toolName === 'itinerary_builder' && call.output.success
      )?.output.data as ItineraryOutput | undefined;
      
      if (builtItinerary && this.isValidItineraryStructure(builtItinerary)) {
        console.log('Itinerary built successfully → hasItinerary = true');
        context = await this.stateManager.updateContext(context, {
          hasItinerary: true,
        });
        // State will be updated to PLANNED by determineNextState in ToolOrchestrator
        context.state = ConversationState.PLANNED;
      } else {
        const builtItineraryAny = builtItinerary as any;
        console.error('Itinerary structure invalid - NOT setting hasItinerary:', {
          hasItinerary: !!builtItinerary,
          hasDays: !!builtItineraryAny?.days,
          daysIsArray: Array.isArray(builtItineraryAny?.days),
        });
      }
    }

    // Step 6: Run evaluations if itinerary was generated
    const itineraryToolCall = orchestrationResult.toolCalls.find(
      (call) => call.toolName === 'itinerary_builder' && call.output.success
    );
    
    if (itineraryToolCall && itineraryToolCall.output.data && context.tripId) {
      try {
        const itinerary = itineraryToolCall.output.data as ItineraryOutput;
        console.log('Running evaluations for generated itinerary...');
        
        // Get itinerary ID from database (the most recent active one for this trip)
        const { data: itineraryData, error: itineraryDataError } = await this.supabase
          .from('itineraries')
          .select('id')
          .eq('trip_id', context.tripId)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to avoid error if not found yet
        
        if (itineraryDataError && itineraryDataError.code !== 'PGRST116') {
          console.error('Error fetching itinerary ID for evaluations:', itineraryDataError);
        }
        
        console.log('Itinerary data for evaluations:', {
          found: !!itineraryData,
          itineraryId: itineraryData?.id,
        });
        
        const evalContext: EvalContext = {
          tripId: context.tripId,
          itineraryId: itineraryData?.id,
        };
        
        await runItineraryEvaluations(itinerary, evalContext);
        console.log('Evaluations completed and saved to database');
      } catch (evalError) {
        console.error('Error running evaluations:', evalError);
        // Don't fail the request if evaluations fail - just log the error
      }
    }

    // Step 7: Update state if tool calls changed it
    if (orchestrationResult.nextState) {
      context = await this.stateManager.transitionTo(
        context,
        orchestrationResult.nextState,
        'Tool orchestration completed'
      );
    }

    // Step 7: Handle special intents (like SEND_EMAIL and EDIT_ITINERARY) before composing response
    // IMPORTANT: Handle EDIT_ITINERARY first if both edit and share are mentioned
    if (intentClassification.intent === UserIntent.EDIT_ITINERARY) {
      console.log('EDIT_ITINERARY intent detected - processing edits first');
      // Edits are handled by tool orchestration above, so we continue to response composition
      // The edited itinerary will be returned in toolCalls
    }
    
    // FIX #3: EMAIL CONFIRMATION GATE
    // 4️⃣ Fix Intent Arbitration: SEND_EMAIL only if itinerary exists
    if (resolvedIntent === UserIntent.SEND_EMAIL) {
      console.log('SEND_EMAIL intent detected');
      
      // CRITICAL: If no itinerary exists, generate it first
      if (!context.hasItinerary) {
        console.log('FIX #3: SEND_EMAIL but no itinerary - generating itinerary first');
        // Force generate itinerary
        if (isTripReady(context)) {
          context = await this.stateManager.updateContext(context, {
            userConfirmed: true,
          });
          // This will trigger itinerary generation in the next cycle
          // For now, return a message asking user to wait
          return {
            response: {
              text: "I'll generate your itinerary first, then send it to your email. Please wait a moment...",
              state: context.state,
              metadata: { tripId: context.tripId },
            },
            context,
            toolCalls: [],
          };
        } else {
          return {
            response: {
              text: "I need to collect a bit more information before I can generate and send your itinerary. Let me ask you a few quick questions first.",
              state: context.state,
              metadata: { tripId: context.tripId },
            },
            context,
            toolCalls: [],
          };
        }
      }
      
      // Extract email from message or entities
      // Try multiple extraction methods
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
      const emailMatch = input.message.match(emailRegex);
      const emailFromMessage = emailMatch ? emailMatch[0] : null;
      const emailFromEntities = intentClassification.entities?.email;
      const email = emailFromMessage || emailFromEntities;
      
      // FIX #3: Store email if provided, but require confirmation
      if (email && !context.emailConfirmed) {
        console.log('FIX #3: Email provided but not confirmed - storing email and asking for confirmation');
        context = await this.stateManager.updateContext(context, {
          emailAddress: email,
          emailConfirmed: false,
        });
        return {
          response: {
            text: `I have your email address: ${email}. Should I send the itinerary PDF to this email? Please confirm with "yes", "send it", or "go ahead".`,
            state: context.state,
            metadata: { tripId: context.tripId },
          },
          context,
          toolCalls: orchestrationResult.toolCalls,
        };
      }
      
      // FIX #3: Check for email confirmation phrases
      const confirmationPhrases = ['yes', 'send it', 'go ahead', 'confirm', 'proceed', 'that\'s right'];
      const lowerMessage = input.message.toLowerCase();
      const isEmailConfirmation = confirmationPhrases.some(phrase => lowerMessage.includes(phrase));
      
      if (isEmailConfirmation && context.emailAddress && !context.emailConfirmed) {
        console.log('FIX #3: Email confirmation detected - setting emailConfirmed = true');
        context = await this.stateManager.updateContext(context, {
          emailConfirmed: true,
        });
        // Continue to email sending below
      }
      
      // FIX #3: Only send email if hasItinerary AND emailConfirmed
      if (!context.hasItinerary || !context.emailConfirmed) {
        console.log('FIX #3: Email sending blocked - hasItinerary:', context.hasItinerary, 'emailConfirmed:', context.emailConfirmed);
        return {
          response: {
            text: context.emailAddress 
              ? "Please confirm sending the itinerary to your email, or wait for the itinerary to be generated first."
              : "I need your email address to send the itinerary. What email should I send it to?",
            state: context.state,
            metadata: { tripId: context.tripId },
          },
          context,
          toolCalls: orchestrationResult.toolCalls,
        };
      }
      
      // Use stored email or extracted email
      const emailToUse = context.emailAddress || email;
      console.log('Extracted email:', { 
        fromMessage: emailFromMessage, 
        fromEntities: emailFromEntities, 
        final: email 
      });
      
      if (!emailToUse && context.tripId) {
        // No email found - ask user for email
        return {
          response: {
            text: "I'd be happy to send you the itinerary via email! What email address should I send it to?",
            state: context.state,
            metadata: { tripId: context.tripId },
          },
          context,
          toolCalls: orchestrationResult.toolCalls,
        };
      }
      
      if (emailToUse && context.tripId) {
        // Call the send-pdf endpoint (use internal call instead of HTTP)
        try {
          // For now, we'll handle this in the response composer
          // The actual email sending will be triggered by the frontend button
          // or we can add a helper function here
          
          // Use internal HTTP call to the send-pdf endpoint
          const { config } = await import('../config/env');
          const baseUrl = process.env.BASE_URL;
          if (!baseUrl) {
            if (config.env === 'production') {
              throw new Error('BASE_URL environment variable is required in production');
            }
            // In development, use localhost fallback
            const fallbackUrl = `http://localhost:${config.port}`;
            console.warn(`BASE_URL not set, using fallback: ${fallbackUrl}`);
            const pdfResponse = await fetch(`${fallbackUrl}/api/itinerary/send-pdf`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tripId: context.tripId, email }),
            });
            if (pdfResponse.ok) {
              await pdfResponse.json();
              return {
                response: {
                  text: `Perfect! I've sent your itinerary PDF to ${emailToUse}. Please check your inbox.`,
                  state: context.state,
                  metadata: { tripId: context.tripId },
                },
                context,
                toolCalls: orchestrationResult.toolCalls,
              };
            } else {
              throw new Error(`PDF send failed: ${pdfResponse.statusText}`);
            }
          }
          const pdfResponse = await fetch(`${baseUrl}/api/itinerary/send-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId: context.tripId, email }),
          });
          
          if (pdfResponse.ok) {
            await pdfResponse.json();
            return {
              response: {
                text: `Perfect! I've sent your itinerary PDF to ${emailToUse}. Please check your inbox.`,
                state: context.state,
                metadata: { tripId: context.tripId },
              },
              context,
              toolCalls: orchestrationResult.toolCalls,
            };
          } else {
            // Get error details from response
            let errorDetails = '';
            try {
              const errorData = await pdfResponse.json() as any;
              errorDetails = (errorData.error || errorData.details || '') as string;
            } catch {
              const errorText = await pdfResponse.text();
              errorDetails = errorText || '';
            }
            
            console.error('PDF send error:', {
              status: pdfResponse.status,
              statusText: pdfResponse.statusText,
              details: errorDetails,
            });
            
            // Provide more specific error message
            let errorMessage = `I encountered an issue sending the email`;
            if (errorDetails.includes('N8N webhook URL not configured')) {
              errorMessage = `Email service is not configured. Please contact support or use the "Send PDF via Email" button.`;
            } else if (errorDetails.includes('Itinerary not found')) {
              errorMessage = `I couldn't find your itinerary. Please generate it first.`;
            } else if (errorDetails.includes('timeout')) {
              errorMessage = `The email service took too long to respond. Please try again later or use the "Send PDF via Email" button.`;
            } else {
              errorMessage = `I encountered an issue sending the email (${pdfResponse.status}). Please try using the "Send PDF via Email" button in the itinerary display.`;
            }
            
            return {
              response: {
                text: errorMessage,
                state: context.state,
                metadata: { tripId: context.tripId },
              },
              context,
              toolCalls: orchestrationResult.toolCalls,
            };
          }
        } catch (error) {
          console.error('Error sending PDF via email:', error);
          return {
            response: {
              text: `I encountered an error while trying to send the email. Please try using the "Send PDF via Email" button in the itinerary display.`,
              state: context.state,
              metadata: { tripId: context.tripId },
            },
            context,
            toolCalls: orchestrationResult.toolCalls,
          };
        }
      }
    }
    
    // Step 7: Compose response
    // LLM is used HERE for response generation (single LLM agent)
    // Tool outputs are provided as context, not generated by LLM
    
    let response;
    
    // Use ExplanationComposer for EXPLAINING state
    if (context.state === ConversationState.EXPLAINING && intentClassification.intent === 'EXPLAIN') {
      // Extract POI from context if available (from itinerary)
      const poi = await this.extractPOIFromContext(context, input.message);
      
      response = await this.explanationComposer.composeExplanation({
        question: input.message,
        context,
        poi,
        constraints: {
          pace: context.preferences.pace,
          // Weather can be added later if available
        },
      });
    } else {
      // Use regular ResponseComposer for other states
      // NOTE: questionsAsked is now incremented earlier in the process (before tool decisions)
      // This ensures it works for both complete and incomplete trips
      
      response = await this.responseComposer.composeResponse(
        context,
        orchestrationResult.toolCalls,
        input.message
      );
    }

    // Step 8: Apply policy guards
    const policyCheck = this.policyGuards.validateResponse(
      response,
      context,
      orchestrationResult.toolCalls
    );

    if (!policyCheck.allowed) {
      console.error(`Policy violation: ${policyCheck.reason}`);
      // Return error response instead
      response.text = `I apologize, but I encountered an issue: ${policyCheck.reason}`;
    }

    // Step 9: Save transcript
    await this.saveTranscript(context.tripId!, 'user', input.message);
    await this.saveTranscript(context.tripId!, 'assistant', response.text);

    // Step 10: Update context with last intent and response
    context.lastIntent = intentClassification.intent;
    context.lastResponse = response.text;
    context = await this.stateManager.updateContext(context, {
      lastIntent: intentClassification.intent,
      lastResponse: response.text,
    });

    // Determine state transition for output
    const stateTransition = orchestrationResult.nextState
      ? {
          from: context.state,
          to: orchestrationResult.nextState,
        }
      : undefined;

    return {
      response,
      context,
      toolCalls: orchestrationResult.toolCalls,
      stateTransition,
    };
  }

  /**
   * Extract POI from context (from itinerary if available)
   */
  private async extractPOIFromContext(
    context: ConversationContext,
    question: string
  ): Promise<POI | undefined> {
    if (!context.tripId) {
      return undefined;
    }

    try {
      // Get active itinerary
      const { data: itinerary } = await this.supabase
        .from('itineraries')
        .select('content')
        .eq('trip_id', context.tripId)
        .eq('is_active', true)
        .single();

      if (!itinerary || !itinerary.content) {
        return undefined;
      }

      const itineraryData = itinerary.content as ItineraryOutput;

      // Try to extract POI name from question
      // Simple extraction - can be improved
      const questionLower = question.toLowerCase();
      
      // Search through all days and activities
      for (const day of itineraryData.days) {
        for (const block of Object.values(day.blocks)) {
          if (block) {
            for (const activity of block.activities) {
              const poiNameLower = activity.poi.name.toLowerCase();
              // Check if POI name appears in question
              if (questionLower.includes(poiNameLower) || poiNameLower.includes(questionLower.split(' ')[0])) {
                return activity.poi;
              }
            }
          }
        }
      }

      // If no match, return first POI from first day
      const firstDay = itineraryData.days[0];
      if (firstDay) {
        const firstBlock = firstDay.blocks.morning || firstDay.blocks.afternoon || firstDay.blocks.evening;
        if (firstBlock && firstBlock.activities.length > 0) {
          return firstBlock.activities[0].poi;
        }
      }
    } catch (error) {
      console.error('Error extracting POI from context:', error);
    }

    return undefined;
  }

  /**
   * Parse relative date strings to ISO date format
   */
  private parseRelativeDate(dateStr: string): string | null {
    const lower = dateStr.toLowerCase().trim();
    const today = new Date();
    
    if (lower.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (lower.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    if (lower.includes('next month')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      return nextMonth.toISOString().split('T')[0];
    }
    
    // Try to parse as ISO date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * PHASE 1: Check if trip is complete (has all required fields)
   * Hard-coded validation - not in prompt
   */
  private isTripComplete(context: ConversationContext): boolean {
    return Boolean(context.preferences.city && context.preferences.duration);
  }

  // Removed unused shouldGenerateItinerary method - logic is handled inline using isTripReady()

  /**
   * Validate itinerary structure - ensures strict contract
   * Backend must NEVER set hasItinerary=true unless this passes
   */
  private isValidItineraryStructure(itinerary: any): itinerary is ItineraryOutput {
    if (!itinerary || typeof itinerary !== 'object') {
      return false;
    }
    
    // Required fields
    if (!itinerary.city || typeof itinerary.city !== 'string') {
      return false;
    }
    
    if (typeof itinerary.duration !== 'number' || itinerary.duration < 1) {
      return false;
    }
    
    if (!itinerary.startDate || typeof itinerary.startDate !== 'string') {
      return false;
    }
    
    // CRITICAL: days must exist and be a non-empty array
    if (!itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return false;
    }
    
    // Validate each day has required structure
    for (const day of itinerary.days) {
      if (!day || typeof day !== 'object') {
        return false;
      }
      if (typeof day.day !== 'number' || day.day < 1) {
        return false;
      }
      if (!day.date || typeof day.date !== 'string') {
        return false;
      }
      if (!day.blocks || typeof day.blocks !== 'object') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Update context with entities extracted from intent classification
   */
  private async updateContextWithEntities(
    context: ConversationContext,
    entities: Record<string, any>
  ): Promise<ConversationContext> {
    const updates: Partial<ConversationContext> = {};

    // Update preferences with extracted entities
    if (entities.city) {
      context.preferences.city = entities.city;
      if (!context.collectedFields.includes('city')) {
        context.collectedFields.push('city');
      }
    }

    if (entities.duration) {
      context.preferences.duration = entities.duration;
      if (!context.collectedFields.includes('duration')) {
        context.collectedFields.push('duration');
      }
    }

    if (entities.startDate) {
      // Parse relative dates like "next week", "tomorrow", etc.
      let parsedDate = this.parseRelativeDate(entities.startDate);
      if (!parsedDate) {
        // Try to parse as ISO date
        parsedDate = entities.startDate;
      }
      context.preferences.startDate = parsedDate || undefined;
      if (!context.collectedFields.includes('startDate')) {
        context.collectedFields.push('startDate');
      }
    }
    // DO NOT auto-set startDate - ask user for it if missing

    if (entities.interests) {
      context.preferences.interests = entities.interests;
      if (!context.preferencesProvided) {
        context.preferencesProvided = true;
        console.log('Preferences provided detected (interests) - marking preferencesProvided = true');
      }
    }

    if (entities.pace) {
      context.preferences.pace = entities.pace;
      if (!context.preferencesProvided) {
        context.preferencesProvided = true;
        console.log('Preferences provided detected (pace) - marking preferencesProvided = true');
      }
    }

    if (entities.budget) {
      context.preferences.budget = entities.budget;
      if (!context.preferencesProvided) {
        context.preferencesProvided = true;
        console.log('Preferences provided detected (budget) - marking preferencesProvided = true');
      }
    }

    if (entities.constraints) {
      context.preferences.constraints = entities.constraints;
      if (!context.preferencesProvided) {
        context.preferencesProvided = true;
        console.log('Preferences provided detected (constraints) - marking preferencesProvided = true');
      }
    }

    // Update edit target if editing
    if (entities.editTarget) {
      updates.editTarget = entities.editTarget;
      console.log('Edit target extracted and set:', JSON.stringify(entities.editTarget, null, 2));
    } else {
      console.log('No editTarget in entities:', Object.keys(entities));
    }

    // Update missing fields - but don't auto-transition to CONFIRMING even if all are collected
    // We still want to ask follow-up questions about interests, pace, etc.
    const required = ['city', 'duration', 'startDate'];
    context.missingFields = required.filter(
      (field) => !context.collectedFields.includes(field)
    );
    
    // Log for debugging
    console.log('Field collection status:', {
      collectedFields: context.collectedFields,
      missingFields: context.missingFields,
      hasAllRequired: context.missingFields.length === 0,
      note: 'Even if all required fields are collected, stay in COLLECTING_PREFS to ask follow-up questions',
    });

    return this.stateManager.updateContext(context, {
      preferences: context.preferences,
      collectedFields: context.collectedFields,
      missingFields: context.missingFields,
      ...updates,
    });
  }

  /**
   * Handle state transitions based on intent
   */
  private async handleStateTransition(
    context: ConversationContext,
    intent: any
  ): Promise<ConversationContext> {
    // State transitions based on intent and current state
    switch (context.state) {
      case ConversationState.INIT:
        if (intent === 'PLAN_TRIP' && context.preferences.city) {
          return this.stateManager.transitionTo(
            context,
            ConversationState.COLLECTING_PREFS,
            'User started trip planning'
          );
        }
        break;

      case ConversationState.COLLECTING_PREFS:
        // Transition to CONFIRMING when:
        // 1. User explicitly confirms (CONFIRM intent) OR
        // 2. User explicitly asks to generate itinerary (PLAN_TRIP with generation keywords) AND trip is complete
        const tripComplete = this.isTripComplete(context);
        const isExplicitConfirmation = intent === 'CONFIRM';
        const isExplicitGenerationRequest = intent === 'PLAN_TRIP' && tripComplete;
        
        if ((isExplicitConfirmation || isExplicitGenerationRequest) && this.stateManager.canProceedToConfirmation(context)) {
          return this.stateManager.transitionTo(
            context,
            ConversationState.CONFIRMING,
            isExplicitConfirmation ? 'User explicitly confirmed' : 'User explicitly requested itinerary generation'
          );
        }
        // Stay in COLLECTING_PREFS to ask follow-up questions
        break;

      case ConversationState.PLANNED:
      case ConversationState.COLLECTING_PREFS:
        // Allow editing even in COLLECTING_PREFS if itinerary exists
        if (intent === 'EDIT_ITINERARY') {
          return this.stateManager.transitionTo(
            context,
            ConversationState.EDITING,
            'User wants to edit itinerary'
          );
        }
        if (intent === 'EXPLAIN') {
          return this.stateManager.transitionTo(
            context,
            ConversationState.EXPLAINING,
            'User asking for explanation'
          );
        }
        break;
      
      case ConversationState.INIT:
        // If EDIT_ITINERARY is detected in INIT state but we have a tripId,
        // it means we need to load the existing context and transition to EDITING
        if (intent === 'EDIT_ITINERARY' && context.tripId) {
          return this.stateManager.transitionTo(
            context,
            ConversationState.EDITING,
            'User wants to edit existing itinerary'
          );
        }
        break;

      case ConversationState.EDITING:
        // Stay in editing or transition back to planned (handled by tool orchestration)
        break;

      case ConversationState.EXPLAINING:
        // Can transition back to planned after explanation
        break;
    }

    return context;
  }

  /**
   * Save transcript to database
   */
  private async saveTranscript(
    tripId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const { error } = await this.supabase.from('transcripts').insert({
      trip_id: tripId,
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save transcript:', error);
    }
  }

  /**
   * Register an MCP tool
   * Tools must be registered before they can be used
   */
  registerTool(tool: any): void {
    this.toolOrchestrator.registerTool(tool);
  }
}
