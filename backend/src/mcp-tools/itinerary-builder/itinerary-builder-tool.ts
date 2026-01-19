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

export class ItineraryBuilderTool implements MCPTool {
  name = 'itinerary_builder';
  description = 'Build day-wise itinerary from candidate POIs with morning/afternoon/evening blocks';

  private supabase = getSupabaseClient();

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

      // Step 1: Cluster POIs by proximity
      const clusters = clusterPOIsByProximity(
        builderInput.pois,
        this.getMaxClusterSize(builderInput.pace),
        5 // 5km max distance within cluster
      );

      // Step 2: Distribute clusters across days
      const poisPerDay = this.distributePOIsAcrossDays(
        clusters,
        builderInput.duration
      );

      // Step 3: Build each day's itinerary
      const days: ItineraryDay[] = [];
      const startDate = new Date(builderInput.startDate);

      for (let dayNum = 1; dayNum <= builderInput.duration; dayNum++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(startDate.getDate() + dayNum - 1);

        const dayPOIs = poisPerDay[dayNum - 1] || [];
        const day = buildDay(
          dayNum,
          dayDate.toISOString().split('T')[0],
          dayPOIs,
          builderInput.pace
        );

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
        await this.saveItinerary(builderInput.tripId, output);
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
    if (!input.pois || !Array.isArray(input.pois) || input.pois.length === 0) {
      throw new Error('POIs array is required and must not be empty');
    }

    if (!input.duration || typeof input.duration !== 'number' || input.duration < 1) {
      throw new Error('Duration must be a positive number');
    }

    if (!input.startDate || typeof input.startDate !== 'string') {
      throw new Error('Start date is required and must be a string (ISO format)');
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
      // Get current version
      const { data: existing } = await this.supabase
        .from('itineraries')
        .select('version')
        .eq('trip_id', tripId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = existing ? (existing.version as number) + 1 : 1;

      // Deactivate previous versions
      await this.supabase
        .from('itineraries')
        .update({ is_active: false })
        .eq('trip_id', tripId);

      // Insert new itinerary
      const { error } = await this.supabase.from('itineraries').insert({
        trip_id: tripId,
        version: nextVersion,
        content: itinerary,
        is_active: true,
      });

      if (error) {
        console.error('Failed to save itinerary:', error);
        // Don't throw - itinerary building succeeded, just saving failed
      }
    } catch (error) {
      console.error('Error saving itinerary:', error);
      // Don't throw - itinerary building succeeded
    }
  }
}

/**
 * Create and export the tool instance
 */
export const itineraryBuilderTool = new ItineraryBuilderTool();

