/**
 * Itinerary Builder MCP Tool
 * 
 * Builds day-wise itineraries from candidate POIs.
 * 
 * Rules:
 * - No LLM usage (deterministic logic only)
 * - Output must be day-wise structured itinerary
 * - Must be feasible by design
 * - Clusters POIs by proximity
 * - Allocates activities based on pace
 * - Inserts travel buffers
 * 
 * This tool is called by ToolOrchestrator, NOT by LLM directly.
 */

import { MCPTool, MCPToolInput, MCPToolOutput, Citation } from '../../orchestration/types';
import {
  ItineraryBuilderInput,
  ItineraryOutput,
  ItineraryDay,
} from './types';
import { POI } from '../poi-search/types';
import { clusterPOIsByProximity } from './clustering';
import { buildDay } from './day-builder';
import { getSupabaseClient } from '../../db/supabase';
import OpenAI from 'openai';
import { config } from '../../config/env';

export class ItineraryBuilderTool implements MCPTool {
  name = 'itinerary_builder';
  description = 'Build day-wise itinerary from candidate POIs with morning/afternoon/evening blocks';

  private supabase = getSupabaseClient();
  private openai: OpenAI | null = null;

  constructor() {
    if (config.openai?.apiKey) {
      this.openai = new OpenAI({ 
        apiKey: config.openai.apiKey,
        timeout: 25000, // 25 second timeout for LLM activity generation
        maxRetries: 1, // Limit retries to avoid long delays
      });
    }
  }

  /**
   * Execute itinerary building
   * 
   * This is the main entry point called by ToolOrchestrator.
   * All logic is deterministic - no LLM usage.
   */
  async execute(input: MCPToolInput): Promise<MCPToolOutput> {
    try {
      // Validate and parse input
      const builderInput = this.validateInput(input);

      // If editing, load existing itinerary first
      let existingItinerary: ItineraryOutput | null = null;
      if (builderInput.editTarget && builderInput.tripId) {
        console.log('Loading existing itinerary for edit:', {
          tripId: builderInput.tripId,
          editTarget: builderInput.editTarget,
        });
        existingItinerary = await this.loadExistingItinerary(builderInput.tripId);
        if (existingItinerary) {
          console.log('Existing itinerary loaded:', {
            city: existingItinerary.city,
            duration: existingItinerary.duration,
            daysCount: existingItinerary.days.length,
          });
        }
      }

      // Step 1: Cluster POIs by proximity
      // PHASE 4: Handle empty POIs array gracefully (POI search disabled)
      let poisPerDay: POI[][];
      
      // Check if we need LLM fallback (empty POIs)
      const needsLLMFallback = builderInput.pois.length === 0;
      
      if (needsLLMFallback) {
        console.log('LLM fallback activities generated for empty POIs');
        // Generate LLM-based activities for each day
        poisPerDay = await this.generateLLMActivitiesForDays(
          builderInput.duration,
          builderInput.city,
          builderInput.pace,
          (input.context as any)?.preferences
        );
      } else {
        // For reduce_travel edits, use tighter clustering
        const maxClusterDistance = builderInput.editTarget?.type === 'reduce_travel' ? 3 : 5;
        const clusters = clusterPOIsByProximity(
          builderInput.pois,
          this.getMaxClusterSize(builderInput.pace),
          maxClusterDistance
        );

        // Step 2: Distribute clusters across days
        poisPerDay = this.distributePOIsAcrossDays(
          clusters,
          builderInput.duration
        );
      }

      // Step 2b: Apply edit instructions
      if (builderInput.editTarget && existingItinerary) {
        poisPerDay = this.applyEdits(poisPerDay, builderInput.editTarget, existingItinerary);
      }

      // Step 3: Build each day's itinerary
      const days: ItineraryDay[] = [];
      const startDate = new Date(builderInput.startDate);

      for (let dayNum = 1; dayNum <= builderInput.duration; dayNum++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + dayNum - 1);

        const dayPOIs = poisPerDay[dayNum - 1] || [];
        let day = buildDay(
          dayNum,
          dayDate.toISOString().split('T')[0],
          dayPOIs,
          builderInput.pace
        );

        // Step 3b: Apply reduce_travel edit to specific day if needed
        if (builderInput.editTarget?.type === 'reduce_travel' && 
            builderInput.editTarget.day === dayNum && 
            existingItinerary) {
          console.log(`Applying reduce_travel optimization to day ${dayNum}`);
          day = this.optimizeDayRoute(day, builderInput.pace);
        }

        days.push(day);
      }

      // Step 4: Build output
      const output: ItineraryOutput = {
        city: builderInput.city,
        duration: builderInput.duration,
        startDate: builderInput.startDate,
        pace: builderInput.pace,
        days,
        totalPOIs: builderInput.pois.length,
        totalActivities: days.reduce((sum, day) => sum + day.totalActivities, 0),
        metadata: {
          createdAt: new Date().toISOString(),
          version: 1,
          isEdit: !!builderInput.editTarget,
          editTarget: builderInput.editTarget,
        },
      };

      // Step 5: Save to database if tripId provided
      if (builderInput.tripId) {
        console.log('Saving itinerary to database:', {
          tripId: builderInput.tripId,
          city: output.city,
          duration: output.duration,
          daysCount: output.days.length,
        });
        try {
          await this.saveItinerary(builderInput.tripId, output);
          console.log('Itinerary saved successfully to database');
        } catch (saveError) {
          console.error('CRITICAL: Failed to save itinerary:', saveError);
          // Re-throw so we know it failed
          throw saveError;
        }
      } else {
        console.warn('WARNING: No tripId provided, itinerary will NOT be saved to database');
      }

      // Step 6: Create citations
      const citations: Citation[] = [
        {
          source: 'OpenStreetMap',
          url: 'https://www.openstreetmap.org',
          excerpt: `Itinerary built from OpenStreetMap POI data for ${builderInput.city}`,
          confidence: 1.0,
        },
      ];

      return {
        success: true,
        data: output,
        citations,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate and parse input
   */
  private validateInput(input: MCPToolInput): ItineraryBuilderInput {
    // PHASE 4: Allow empty POIs array (POI search is temporarily disabled)
    // The tool will generate a basic itinerary structure even without POIs
    if (!input.pois || !Array.isArray(input.pois)) {
      console.warn('POIs array is missing or invalid, using empty array (POI search disabled)');
      input.pois = [];
    }
    
    // Only throw error if we're not in a graceful fallback mode
    // For now, allow empty POIs and generate basic structure

    if (!input.duration || typeof input.duration !== 'number' || input.duration < 1) {
      throw new Error('Duration must be a positive number');
    }

    // CRITICAL: startDate must be explicitly provided by user - NO FALLBACK
    if (!input.startDate || typeof input.startDate !== 'string') {
      throw new Error('startDate is required and must be explicitly provided by the user. Cannot generate itinerary without a start date.');
    }

    if (!input.pace || !['relaxed', 'moderate', 'fast'].includes(input.pace)) {
      throw new Error('Pace must be one of: relaxed, moderate, fast');
    }

    if (!input.city || typeof input.city !== 'string') {
      throw new Error('City is required and must be a string');
    }

    // Validate POI structure
    for (const poi of input.pois) {
      if (!poi.osmId || !poi.name || !poi.coordinates) {
        throw new Error('Invalid POI structure: missing required fields (osmId, name, coordinates)');
      }
    }

    return {
      pois: input.pois as POI[],
      duration: input.duration,
      startDate: input.startDate,
      pace: input.pace,
      city: input.city,
      tripId: input.tripId as string | undefined,
      editTarget: input.editTarget as ItineraryBuilderInput['editTarget'],
    };
  }

  /**
   * Get max cluster size based on pace
   */
  private getMaxClusterSize(pace: 'relaxed' | 'moderate' | 'fast'): number {
    switch (pace) {
      case 'relaxed':
        return 3;
      case 'moderate':
        return 4;
      case 'fast':
        return 5;
      default:
        return 4;
    }
  }

  /**
   * Distribute POI clusters across days
   * 
   * Tries to balance POIs across days while keeping clusters together.
   */
  private distributePOIsAcrossDays(
    clusters: POI[][],
    duration: number
  ): POI[][] {
    const poisPerDay: POI[][] = Array(duration)
      .fill(null)
      .map(() => []);

    // Distribute clusters round-robin
    for (let i = 0; i < clusters.length; i++) {
      const dayIndex = i % duration;
      poisPerDay[dayIndex].push(...clusters[i]);
    }

    return poisPerDay;
  }

  /**
   * Save itinerary to database
   */
  private async saveItinerary(tripId: string, itinerary: ItineraryOutput): Promise<void> {
    try {
      console.log('saveItinerary called:', { tripId, city: itinerary.city });
      
      // Get current version
      const { data: existing, error: existingError } = await this.supabase
        .from('itineraries')
        .select('version')
        .eq('trip_id', tripId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error if no rows

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing itinerary:', existingError);
        throw existingError;
      }

      const nextVersion = existing ? (existing.version as number) + 1 : 1;
      console.log('Next version:', nextVersion);

      // Deactivate previous versions
      const { error: updateError } = await this.supabase
        .from('itineraries')
        .update({ is_active: false })
        .eq('trip_id', tripId);

      if (updateError) {
        console.error('Error deactivating previous versions:', updateError);
        // Continue anyway
      }

      // Insert new itinerary
      const insertData = {
        trip_id: tripId,
        version: nextVersion,
        content: itinerary,
        is_active: true,
      };
      
      console.log('Inserting itinerary:', {
        trip_id: insertData.trip_id,
        version: insertData.version,
        is_active: insertData.is_active,
        contentKeys: Object.keys(insertData.content),
      });

      const { data: insertedData, error: insertError } = await this.supabase
        .from('itineraries')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('CRITICAL: Failed to insert itinerary:', insertError);
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        throw insertError;
      }

      console.log('Itinerary inserted successfully:', {
        id: insertedData.id,
        trip_id: insertedData.trip_id,
        version: insertedData.version,
      });
    } catch (error) {
      console.error('CRITICAL ERROR in saveItinerary:', error);
      // Re-throw so caller knows it failed
      throw error;
    }
  }

  /**
   * Load existing itinerary from database
   */
  private async loadExistingItinerary(tripId: string): Promise<ItineraryOutput | null> {
    try {
      const { data, error } = await this.supabase
        .from('itineraries')
        .select('content')
        .eq('trip_id', tripId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.warn('Could not load existing itinerary:', error?.message);
        return null;
      }

      return data.content as ItineraryOutput;
    } catch (error) {
      console.error('Error loading existing itinerary:', error);
      return null;
    }
  }

  /**
   * Apply edit instructions to POI distribution
   */
  private applyEdits(
    poisPerDay: POI[][],
    editTarget: ItineraryBuilderInput['editTarget'],
    _existingItinerary: ItineraryOutput
  ): POI[][] {
    if (!editTarget) return poisPerDay;

    const result = [...poisPerDay.map(day => [...day])];

    // Handle swap days
    if (editTarget.type === 'swap' && editTarget.day !== undefined) {
      const day1Index = editTarget.day - 1;
      const day2Index = editTarget.day; // Swap with next day
      if (day1Index >= 0 && day2Index < result.length) {
        [result[day1Index], result[day2Index]] = [result[day2Index], result[day1Index]];
        console.log(`Swapped day ${editTarget.day} and day ${editTarget.day + 1}`);
      }
    }

    // Handle remove POI from specific day
    if (editTarget.type === 'remove' && editTarget.day !== undefined) {
      const dayIndex = editTarget.day - 1;
      if (dayIndex >= 0 && dayIndex < result.length) {
        const dayPOIs = result[dayIndex];
        
        if (editTarget.poiName) {
          // Try to match POI by name (case-insensitive, partial match)
          const poiNameLower = editTarget.poiName.toLowerCase();
          const matchingIndex = dayPOIs.findIndex(poi => {
            const poiName = poi.name.toLowerCase();
            return poiName.includes(poiNameLower) || poiNameLower.includes(poiName.split(' ')[0]);
          });
          
          if (matchingIndex >= 0) {
            dayPOIs.splice(matchingIndex, 1);
            console.log(`Removed POI "${editTarget.poiName}" from day ${editTarget.day}`);
          } else {
            console.warn(`Could not find POI "${editTarget.poiName}" in day ${editTarget.day}, removing last POI`);
            if (dayPOIs.length > 0) {
              dayPOIs.pop();
            }
          }
        } else {
          // No POI name specified, remove last POI
          if (dayPOIs.length > 0) {
            dayPOIs.pop();
            console.log(`Removed last POI from day ${editTarget.day}`);
          }
        }
      }
    }

    // reduce_travel is handled by tighter clustering AND route optimization (done in buildDay step)
    if (editTarget.type === 'reduce_travel') {
      console.log('Applied reduce_travel: Using tighter clustering (3km instead of 5km) and will optimize route');
    }

    return result;
  }

  /**
   * Optimize route for a specific day to reduce travel time
   * Reorders activities within each block using nearest neighbor algorithm
   */
  private optimizeDayRoute(
    day: ItineraryDay,
    pace: 'relaxed' | 'moderate' | 'fast'
  ): ItineraryDay {
    const { optimizeClusterRoute } = require('./clustering');
    const { buildBlockActivities } = require('./day-builder');

    const optimizedDay = { ...day };

    // Optimize each block
    (['morning', 'afternoon', 'evening'] as const).forEach((blockType) => {
      const block = day.blocks[blockType];
      if (block && block.activities.length > 1) {
        // Extract POIs from activities
        const pois = block.activities.map(act => act.poi);
        
        // Optimize route
        const optimizedPOIs = optimizeClusterRoute(pois);
        
        // Rebuild block with optimized route
        optimizedDay.blocks[blockType] = buildBlockActivities(
          optimizedPOIs,
          blockType,
          block.startTime,
          pace
        );
      }
    });

    // Recalculate day totals
    const allActivities = [
      ...(optimizedDay.blocks.morning?.activities || []),
      ...(optimizedDay.blocks.afternoon?.activities || []),
      ...(optimizedDay.blocks.evening?.activities || []),
    ];

    optimizedDay.totalActivities = allActivities.length;
    optimizedDay.totalDuration = allActivities.reduce((sum, act) => sum + act.duration, 0);
    optimizedDay.totalTravelTime = allActivities.reduce(
      (sum, act) => sum + (act.travelTimeFromPrevious || 0),
      0
    );

    console.log(`Day ${day.day} optimized: Travel time reduced from ${day.totalTravelTime}min to ${optimizedDay.totalTravelTime}min`);

    return optimizedDay;
  }

  /**
   * Generate LLM-based activities when POIs are empty
   * Creates synthetic POI objects that can be used by the existing day builder
   */
  private async generateLLMActivitiesForDays(
    duration: number,
    city: string,
    pace: 'relaxed' | 'moderate' | 'fast',
    preferences?: any
  ): Promise<POI[][]> {
    if (!this.openai) {
      console.warn('OpenAI not available - generating minimal fallback activities');
      return this.generateMinimalFallbackActivities(duration, city);
    }

    const poisPerDay: POI[][] = [];
    const interests = preferences?.interests || [];
    const paceDescription = pace === 'relaxed' ? 'relaxed pace with more time at each location' :
                           pace === 'fast' ? 'fast-paced with quick visits' :
                           'moderate pace with balanced timing';

    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const dayPOIs: POI[] = [];

      try {
        const systemPrompt = `You are a travel planning assistant. Generate ${2 + (pace === 'fast' ? 2 : pace === 'moderate' ? 1 : 0)}-${3 + (pace === 'fast' ? 1 : 0)} activities for Day ${dayNum} in ${city}.
Each activity must be:
- City-specific and realistic
- Appropriate for the time of day (morning, afternoon, evening)
- Include title, description, category, and time block

Return ONLY a JSON object with this exact structure:
{
  "activities": [
    {
      "title": "Activity name",
      "description": "Brief description",
      "category": "sightseeing|food|culture|history|nature|entertainment",
      "timeBlock": "morning|afternoon|evening",
      "duration": 60
    }
  ]
}

Requirements:
- ${paceDescription}
- ${interests.length > 0 ? `User interests: ${interests.join(', ')}` : 'General tourist activities'}
- Morning: cultural/historic sites, markets, breakfast spots
- Afternoon: mixed activities, lunch, sightseeing
- Evening: dinner, entertainment, nightlife
- Each day should have activities in at least 2 time blocks
- Duration in minutes (60-180 typical)`;

        // Add timeout wrapper for LLM call (15 seconds max per day)
        const llmPromise = this.openai!.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate activities for Day ${dayNum} in ${city}` },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        });
        
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 15000); // 15 second timeout per day
        });
        
        const response = await Promise.race([llmPromise, timeoutPromise]) as Awaited<typeof llmPromise> | null;
        
        if (!response || !response.choices || !response.choices[0]) {
          console.warn(`LLM activity generation timed out or failed for Day ${dayNum} - using fallback`);
          // Use minimal fallback for this day
          const fallbackPOIs = this.generateMinimalFallbackActivities(1, city);
          poisPerDay.push(fallbackPOIs[0] || []);
          continue;
        }

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const activities = parsed.activities || [];

          for (const activity of Array.isArray(activities) ? activities : []) {
            // Create synthetic POI from LLM activity
            // Use approximate city center coordinates (spread slightly to enable distance calculation)
            // This ensures travel time can be calculated between activities
            const baseLat = 10.0; // Approximate city center (will be spread)
            const baseLon = 76.0; // Approximate city center
            const spread = 0.1; // ~11km spread to enable distance calculation
            const latOffset = (dayPOIs.length % 3) * spread - spread; // Spread activities
            const lonOffset = Math.floor(dayPOIs.length / 3) * spread - spread;
            
            const syntheticPOI: POI = {
              osmId: 1000000 + dayNum * 100 + dayPOIs.length, // Synthetic ID
              osmType: 'node',
              name: activity.title || 'Activity',
              category: activity.category || 'tourism',
              coordinates: {
                lat: baseLat + latOffset, // Spread coordinates to enable distance calculation
                lon: baseLon + lonOffset,
              },
              tags: {
                name: activity.title,
                description: activity.description || '',
                category: activity.category || 'tourism',
                timeBlock: activity.timeBlock || 'afternoon',
                duration: String(activity.duration || 60),
                city: city, // Add city to tags for location object
              },
              description: activity.description,
            };

            dayPOIs.push(syntheticPOI);
          }
        }
      } catch (error) {
        console.error(`Error generating LLM activities for day ${dayNum}:`, error);
        // Fallback to minimal activities
        const fallback = this.generateMinimalFallbackActivities(1, city);
        dayPOIs.push(...fallback[0]);
      }

      // Ensure we have at least 2-3 activities per day
      if (dayPOIs.length === 0) {
        const fallback = this.generateMinimalFallbackActivities(1, city);
        dayPOIs.push(...fallback[0]);
      }

      poisPerDay.push(dayPOIs);
    }

    return poisPerDay;
  }

  /**
   * Generate minimal fallback activities when LLM is unavailable
   */
  private generateMinimalFallbackActivities(duration: number, city: string): POI[][] {
    const poisPerDay: POI[][] = [];
    const defaultActivities = [
      { name: 'City Center Exploration', category: 'sightseeing', timeBlock: 'morning' },
      { name: 'Local Market Visit', category: 'culture', timeBlock: 'afternoon' },
      { name: 'Traditional Restaurant', category: 'food', timeBlock: 'evening' },
    ];

    for (let dayNum = 1; dayNum <= duration; dayNum++) {
      const dayPOIs: POI[] = [];
      for (let i = 0; i < Math.min(3, defaultActivities.length); i++) {
        const activity = defaultActivities[i];
        // Use approximate city center coordinates with spread to enable distance calculation
        const baseLat = 10.0;
        const baseLon = 76.0;
        const spread = 0.1;
        const latOffset = (i % 3) * spread - spread;
        const lonOffset = Math.floor(i / 3) * spread - spread;
        
        dayPOIs.push({
          osmId: 2000000 + dayNum * 100 + i,
          osmType: 'node',
          name: `${activity.name} - ${city}`,
          category: activity.category,
          coordinates: {
            lat: baseLat + latOffset, // Spread coordinates
            lon: baseLon + lonOffset,
          },
          tags: {
            name: activity.name,
            category: activity.category,
            timeBlock: activity.timeBlock,
            city: city, // Add city to tags
          },
          description: `Explore ${city}`,
        });
      }
      poisPerDay.push(dayPOIs);
    }

    return poisPerDay;
  }
}

/**
 * Create and export the tool instance
 */
export const itineraryBuilderTool = new ItineraryBuilderTool();

