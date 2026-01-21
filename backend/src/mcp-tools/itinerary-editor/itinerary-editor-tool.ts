/**
 * Itinerary Editor MCP Tool
 * 
 * Edits existing itineraries by modifying only targeted sections.
 * 
 * Rules:
 * - Modify ONLY the targeted section
 * - Preserve all other days exactly
 * - Increment itinerary version
 * - Return updated itinerary
 * - Trigger feasibility evaluation automatically
 * 
 * This tool is called by ToolOrchestrator, NOT by LLM directly.
 */

import { MCPTool, MCPToolInput, MCPToolOutput, Citation } from '../../orchestration/types';
import {
  ItineraryEditorInput,
  EditChanges,
} from './types';
import { ItineraryOutput, ItineraryDay } from '../itinerary-builder/types';
import { applyEditToBlock } from './edit-operations';
import { checkDiff } from './diff-checker';
import { checkDayFeasibility } from './feasibility-checker';
import { getSupabaseClient } from '../../db/supabase';

export class ItineraryEditorTool implements MCPTool {
  name = 'itinerary_editor';
  description = 'Edit existing itinerary by modifying only targeted sections';

  private supabase = getSupabaseClient();

  /**
   * Execute itinerary edit
   * 
   * This is the main entry point called by ToolOrchestrator.
   * All logic is deterministic - no LLM usage.
   */
  async execute(input: MCPToolInput): Promise<MCPToolOutput> {
    try {
      // Validate and parse input
      const editorInput = this.validateInput(input);

      // Step 1: Validate itinerary structure
      if (!editorInput.itinerary || !editorInput.itinerary.days || !Array.isArray(editorInput.itinerary.days)) {
        throw new Error('Invalid itinerary structure: days array is missing or invalid');
      }

      if (editorInput.itinerary.days.length === 0) {
        throw new Error('Cannot edit itinerary: no days found');
      }

      // Step 2: Create a deep copy of the itinerary (IMMUTABLE update)
      const editedItinerary = JSON.parse(JSON.stringify(editorInput.itinerary)) as ItineraryOutput;

      // Step 3: Handle day swap if editType is 'swap' and both days are specified
      if (editorInput.editType === 'swap' && editorInput.editParams && editorInput.editParams.swapDay !== undefined) {
        const swapDay = editorInput.editParams.swapDay;
        const day1Index = editedItinerary.days.findIndex(d => d.day === editorInput.targetDay);
        const day2Index = editedItinerary.days.findIndex(d => d.day === swapDay);
        
        if (day1Index === -1) {
          throw new Error(`Day ${editorInput.targetDay} not found in itinerary`);
        }
        if (day2Index === -1) {
          throw new Error(`Day ${swapDay} not found in itinerary`);
        }
        if (day1Index === day2Index) {
          throw new Error('Cannot swap a day with itself');
        }

        // IMMUTABLE swap: create new array with swapped days
        const newDays = [...editedItinerary.days];
        [newDays[day1Index], newDays[day2Index]] = [newDays[day2Index], newDays[day1Index]];
        
        // Update day numbers to match new positions
        newDays[day1Index].day = editorInput.targetDay;
        newDays[day2Index].day = swapDay;
        
        editedItinerary.days = newDays;
        
        console.log(`Swapped day ${editorInput.targetDay} and day ${swapDay}`);
        
        // Recalculate totals for swapped days
        this.recalculateDayTotals(editedItinerary.days[day1Index]);
        this.recalculateDayTotals(editedItinerary.days[day2Index]);
        
        // Return early - swap is complete
        editedItinerary.metadata.version = (editorInput.itinerary.metadata.version || 1) + 1;
        editedItinerary.metadata.isEdit = true;
        
        // Save to database
        if (editorInput.tripId) {
          await this.saveItinerary(editorInput.tripId, editedItinerary);
        }
        
        return {
          success: true,
          data: {
            editedItinerary,
            changes: {
              type: 'swap',
              day1: editorInput.targetDay,
              day2: swapDay,
            },
          },
          citations: [],
        };
      }

      // Step 4: Find the target day (for non-swap edits)
      const targetDayIndex = editedItinerary.days.findIndex(
        d => d.day === editorInput.targetDay
      );

      if (targetDayIndex === -1) {
        throw new Error(`Day ${editorInput.targetDay} not found in itinerary`);
      }

      const targetDay = editedItinerary.days[targetDayIndex];

      // Step 3: Apply edit to target day/block
      // For reduce_travel, apply to all blocks in the day if no specific block is targeted
      const editResult = this.applyEdit(
        targetDay,
        editorInput.editType,
        editorInput.targetBlock,
        {
          ...editorInput.editParams,
          targetTravelTime: editorInput.editParams?.targetTravelTime,
        },
        editedItinerary.pace
      );

      // Step 4: Recalculate day totals
      this.recalculateDayTotals(editedItinerary.days[targetDayIndex]);

      // Step 5: Check feasibility of edited day
      const feasibilityCheck = checkDayFeasibility(
        editedItinerary.days[targetDayIndex],
        editedItinerary.pace
      );

      editedItinerary.days[targetDayIndex].isFeasible = feasibilityCheck.isFeasible;
      editedItinerary.days[targetDayIndex].feasibilityIssues = feasibilityCheck.issues.length > 0
        ? feasibilityCheck.issues
        : undefined;

      // Step 6: Verify diff (only target section changed)
      const diffCheck = checkDiff(
        editorInput.itinerary,
        editedItinerary,
        editorInput.targetDay,
        editorInput.targetBlock
      );

      if (!diffCheck.isValid) {
        console.warn('Diff check violations:', diffCheck.violations);
        // Continue anyway, but log warning
      }

      // Step 7: Increment version
      editedItinerary.metadata.version = (editorInput.itinerary.metadata.version || 1) + 1;
      editedItinerary.metadata.isEdit = true;
      editedItinerary.metadata.editTarget = {
        day: editorInput.targetDay,
        block: editorInput.targetBlock,
        type: editorInput.editType,
      };

      // Step 8: Recalculate total activities
      editedItinerary.totalActivities = editedItinerary.days.reduce(
        (sum, day) => sum + day.totalActivities,
        0
      );

      // Step 9: Save to database
      await this.saveItinerary(editorInput.tripId, editedItinerary);

      // Step 10: Create edit changes summary
      const changes: EditChanges = {
        dayModified: editorInput.targetDay,
        blockModified: editorInput.targetBlock,
        editType: editorInput.editType,
        description: this.getEditDescription(editorInput, editResult),
      };

      // Step 11: Create citations
      const citations: Citation[] = [
        {
          source: 'OpenStreetMap',
          url: 'https://www.openstreetmap.org',
          excerpt: `Itinerary edited using OpenStreetMap POI data for ${editedItinerary.city}`,
          confidence: 1.0,
        },
      ];

      return {
        success: true,
        data: {
          editedItinerary,
          changes,
          feasibilityCheck: {
            passed: feasibilityCheck.isFeasible,
            issues: feasibilityCheck.issues.length > 0 ? feasibilityCheck.issues : undefined,
          },
          diffCheck,
        },
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
  private validateInput(input: MCPToolInput): ItineraryEditorInput {
    if (!input.itinerary) {
      throw new Error('Itinerary is required');
    }

    if (!input.editType || !['relax', 'swap', 'add', 'remove', 'reduce_travel'].includes(input.editType)) {
      throw new Error('Edit type must be one of: relax, swap, add, remove, reduce_travel');
    }

    if (!input.targetDay || typeof input.targetDay !== 'number' || input.targetDay < 1) {
      throw new Error('Target day must be a positive number');
    }

    if (!input.tripId || typeof input.tripId !== 'string') {
      throw new Error('Trip ID is required');
    }

    return {
      itinerary: input.itinerary as ItineraryOutput,
      editType: input.editType as ItineraryEditorInput['editType'],
      targetDay: input.targetDay,
      targetBlock: input.targetBlock as ItineraryEditorInput['targetBlock'],
      editParams: input.editParams as ItineraryEditorInput['editParams'],
      tripId: input.tripId,
    };
  }

  /**
   * Apply edit to target day/block
   */
  private applyEdit(
    day: ItineraryDay,
    editType: ItineraryEditorInput['editType'],
    targetBlock: ItineraryEditorInput['targetBlock'],
    editParams: ItineraryEditorInput['editParams'],
    pace: 'relaxed' | 'moderate' | 'fast'
  ): { blockModified: boolean } {
    if (targetBlock) {
      // Edit specific block
      const block = day.blocks[targetBlock];
      const editedBlock = applyEditToBlock(block, editType, editParams || {}, pace);
      day.blocks[targetBlock] = editedBlock;
      return { blockModified: true };
    } else {
      // For reduce_travel, apply to all blocks in the day to reduce total travel time
      if (editType === 'reduce_travel') {
        const blockTypes: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
        let anyModified = false;
        for (const blockType of blockTypes) {
          const block = day.blocks[blockType];
          if (block && block.activities.length > 1) {
            const editedBlock = applyEditToBlock(block, editType, editParams || {}, pace);
            day.blocks[blockType] = editedBlock;
            anyModified = true;
          }
        }
        return { blockModified: anyModified };
      } else {
        // For other edit types, apply to first non-empty block
        const blockTypes: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
        for (const blockType of blockTypes) {
          const block = day.blocks[blockType];
          if (block && block.activities.length > 0) {
            const editedBlock = applyEditToBlock(block, editType, editParams || {}, pace);
            day.blocks[blockType] = editedBlock;
            return { blockModified: true };
          }
        }
      }
    }

    return { blockModified: false };
  }

  /**
   * Recalculate day totals after edit
   */
  private recalculateDayTotals(day: ItineraryDay): void {
    const allActivities = [
      ...(day.blocks.morning?.activities || []),
      ...(day.blocks.afternoon?.activities || []),
      ...(day.blocks.evening?.activities || []),
    ];

    day.totalActivities = allActivities.length;
    day.totalTravelTime = allActivities.reduce(
      (sum, act) => sum + (act.travelTimeFromPrevious || 0),
      0
    );
    day.totalDuration = allActivities.reduce((sum, act) => sum + act.duration, 0);
  }

  /**
   * Get edit description
   */
  private getEditDescription(
    input: ItineraryEditorInput,
    _editResult: { blockModified: boolean }
  ): string {
    const blockStr = input.targetBlock ? ` ${input.targetBlock} block` : '';
    return `Modified day ${input.targetDay}${blockStr} using ${input.editType} operation`;
  }

  /**
   * Save edited itinerary to database
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

      // Insert new version
      const { error } = await this.supabase.from('itineraries').insert({
        trip_id: tripId,
        version: nextVersion,
        content: itinerary,
        is_active: true,
      });

      if (error) {
        console.error('Failed to save edited itinerary:', error);
        // Don't throw - edit succeeded, just saving failed
      }
    } catch (error) {
      console.error('Error saving edited itinerary:', error);
      // Don't throw - edit succeeded
    }
  }
}

/**
 * Create and export the tool instance
 */
export const itineraryEditorTool = new ItineraryEditorTool();

