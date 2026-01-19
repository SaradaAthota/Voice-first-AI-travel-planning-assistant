/**
 * Itinerary Routes
 * 
 * Handles itinerary-related operations including PDF generation.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase';
import { config } from '../config/env';

const router = Router();

/**
 * POST /api/itinerary/send-pdf
 * Trigger n8n workflow to generate and email PDF
 */
router.post('/send-pdf', async (req: Request, res: Response) => {
  try {
    const { tripId, email } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const supabase = getSupabaseClient();

    // Get active itinerary
    const { data: itineraryData, error: itineraryError } = await supabase
      .from('itineraries')
      .select('content')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (itineraryError || !itineraryData || !itineraryData.content) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    const itinerary = itineraryData.content;

    // Get citations from recent explanations (optional)
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('content')
      .eq('trip_id', tripId)
      .eq('role', 'assistant')
      .order('timestamp', { ascending: false })
      .limit(10);

    // Extract citations from transcripts (if available)
    const citations: any[] = [];
    // Note: In production, citations would be stored separately or extracted from explanation responses

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return res.status(500).json({
        error: 'N8N webhook URL not configured',
      });
    }

    // Call n8n webhook
    try {
      const webhookResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itinerary,
          email,
          citations,
        }),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('N8N webhook error:', errorText);
        return res.status(500).json({
          error: 'Failed to trigger PDF generation',
          details: errorText,
        });
      }

      const webhookData = await webhookResponse.json();

      res.json({
        success: true,
        message: `Itinerary PDF will be sent to ${email}`,
        webhookResponse: webhookData,
      });
    } catch (webhookError) {
      console.error('Error calling n8n webhook:', webhookError);
      return res.status(500).json({
        error: 'Failed to trigger PDF generation',
        details: webhookError instanceof Error ? webhookError.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Error sending PDF:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/itinerary/:tripId/pdf-status
 * Check if PDF was sent (optional - for status tracking)
 */
router.get('/:tripId/pdf-status', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    // In production, you might store PDF send status in database
    // For now, just return a placeholder
    res.json({
      tripId,
      pdfSent: false, // Would be fetched from database
      sentAt: null,
    });
  } catch (error) {
    console.error('Error checking PDF status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

