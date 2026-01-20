/**
 * Itinerary Routes
 * 
 * Handles itinerary-related operations including PDF generation.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase';

const router = Router();

/**
 * POST /api/itinerary/send-pdf
 * Trigger n8n workflow to generate and email PDF
 */
router.post('/send-pdf', async (req: Request, res: Response) => {
  console.log('=== PDF EMAIL REQUEST ===');
  console.log('Request body:', { tripId: req.body.tripId, email: req.body.email });
  
  try {
    const { tripId, email } = req.body;

    if (!tripId) {
      console.error('Missing tripId');
      return res.status(400).json({ error: 'tripId is required' });
    }

    if (!email) {
      console.error('Missing email');
      return res.status(400).json({ error: 'email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const supabase = getSupabaseClient();
    console.log('Fetching itinerary for tripId:', tripId);

    // Get active itinerary
    const { data: itineraryData, error: itineraryError } = await supabase
      .from('itineraries')
      .select('content')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (itineraryError) {
      console.error('Error fetching itinerary:', itineraryError);
      return res.status(404).json({ 
        error: 'Itinerary not found',
        details: itineraryError.message 
      });
    }
    
    if (!itineraryData || !itineraryData.content) {
      console.error('Itinerary data is empty');
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    const itinerary = itineraryData.content;
    console.log('Itinerary found:', { city: itinerary.city, duration: itinerary.duration });

    // Get citations - generate basic citations from itinerary
    const citations: any[] = [
      {
        source: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org',
        excerpt: `Itinerary built from OpenStreetMap POI data for ${itinerary.city}`,
      },
    ];
    
    // Add city-specific citations if available (can be enhanced to fetch from RAG)
    if (itinerary.city) {
      citations.push({
        source: 'Wikivoyage',
        url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(itinerary.city)}`,
        excerpt: `Travel guide information for ${itinerary.city}`,
      });
    }

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return res.status(500).json({
        error: 'N8N webhook URL not configured',
      });
    }
    
    console.log('Calling n8n webhook:', n8nWebhookUrl);
    
    // Call n8n webhook
    try {
      console.log('Payload:', { 
        itinerary: { city: itinerary.city, duration: itinerary.duration, days: itinerary.days?.length },
        email,
        citationsCount: citations.length 
      });

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
        // Add timeout
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('N8N webhook error response:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          body: errorText,
        });
        return res.status(500).json({
          error: 'Failed to trigger PDF generation',
          details: errorText || `HTTP ${webhookResponse.status}: ${webhookResponse.statusText}`,
          status: webhookResponse.status,
          hint: 'Check n8n workflow is active and webhook URL is correct',
        });
      }

      // Try to parse JSON response, but handle empty or non-JSON responses gracefully
      let webhookData;
      const contentType = webhookResponse.headers.get('content-type');
      const responseText = await webhookResponse.text();
      
      if (!responseText || responseText.trim() === '') {
        // Empty response - n8n workflow succeeded but returned no body
        console.log('N8N webhook returned empty response (this is OK - workflow executed successfully)');
        webhookData = { success: true, message: 'PDF generation triggered successfully' };
      } else if (contentType && contentType.includes('application/json')) {
        try {
          webhookData = JSON.parse(responseText);
        } catch (parseError) {
          console.warn('Failed to parse JSON response, treating as text:', parseError);
          webhookData = { message: responseText };
        }
      } else {
        // Non-JSON response - treat as text
        webhookData = { message: responseText };
      }

      console.log('N8N webhook success:', webhookData);
      console.log('⚠️  IMPORTANT: Check n8n workflow execution logs to verify email was actually sent.');
      console.log('   - Go to n8n dashboard → Executions → Check latest execution');
      console.log('   - Verify "Send Email" node executed successfully');
      console.log('   - Check SMTP credentials are correct');
      console.log('   - Verify recipient email address is correct');

      res.json({
        success: true,
        message: `Itinerary PDF will be sent to ${email}`,
        webhookResponse: webhookData,
      });
      return;
    } catch (webhookError) {
      console.error('Error calling n8n webhook:', webhookError);
      
      // Handle timeout errors
      if (webhookError instanceof Error && webhookError.name === 'AbortError') {
        return res.status(504).json({
          error: 'PDF generation timeout',
          details: 'The n8n workflow took too long to respond. Please check the workflow execution logs.',
        });
      }
      
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
    return;
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
    return;
  } catch (error) {
    console.error('Error checking PDF status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

export default router;

