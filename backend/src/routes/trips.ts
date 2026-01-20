/**
 * Trip Routes
 * 
 * Handles trip and itinerary retrieval.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase';

const router = Router();

/**
 * GET /api/trips/:tripId/itinerary
 * Get active itinerary for a trip
 */
router.get('/:tripId/itinerary', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const supabase = getSupabaseClient();

    // Get active itinerary
    const { data: itinerary, error } = await supabase
      .from('itineraries')
      .select('content')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return res.status(404).json({ error: 'No itinerary found for this trip' });
      }
      throw error;
    }

    if (!itinerary || !itinerary.content) {
      return res.status(404).json({ error: 'Itinerary content not found' });
    }

    res.json({
      itinerary: itinerary.content,
    });
    return;
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

/**
 * GET /api/trips/:tripId
 * Get trip details
 */
router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const supabase = getSupabaseClient();

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Trip not found' });
      }
      throw error;
    }

    res.json({ trip });
    return;
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

export default router;

