/**
 * Itinerary Routes
 * 
 * Handles itinerary-related operations including PDF generation.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../db/supabase';
import puppeteer from 'puppeteer';

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

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return res.status(500).json({
        error: 'N8N webhook URL not configured',
      });
    }

    console.log('Generating PDF for itinerary...');

    // Step 1: Generate HTML for itinerary
    const html = generateItineraryHTML(itinerary);

    // Step 2: Generate PDF using Puppeteer
    let pdfBuffer: Buffer;
    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
        ],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        const pdfUint8Array = await page.pdf({
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm',
          },
          printBackground: true,
          preferCSSPageSize: false,
        });

        // Convert Uint8Array to Buffer for FormData
        pdfBuffer = Buffer.from(pdfUint8Array);

        console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      } finally {
        await browser.close();
      }
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return res.status(500).json({
        error: 'Failed to generate PDF',
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error',
      });
    }

    // Step 3: Send PDF to n8n as JSON with base64 PDF
    // n8n webhook parses JSON body reliably, and we can convert base64 to binary in n8n
    console.log('Sending PDF to n8n webhook as JSON with base64 PDF:', n8nWebhookUrl);

    try {
      // Convert PDF buffer to base64
      const pdfBase64 = pdfBuffer.toString('base64');

      // Send as JSON - n8n will parse this correctly
      const payload = {
        email: email,
        city: itinerary.city,
        duration: itinerary.duration,
        startDate: itinerary.startDate || null,
        pdf: {
          data: pdfBase64,
          filename: 'itinerary.pdf',
          contentType: 'application/pdf',
        },
      };

      // Call n8n webhook with JSON
      const webhookResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

/**
 * Generate HTML for itinerary PDF
 */
function generateItineraryHTML(itinerary: any): string {
  const startDate = itinerary.startDate ? new Date(itinerary.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'TBD';

  let daysHTML = '';
  if (itinerary.days && Array.isArray(itinerary.days)) {
    daysHTML = itinerary.days.map((day: any) => {
      const dayDate = day.date ? new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }) : `Day ${day.day}`;

      let blocksHTML = '';
      if (day.blocks) {
        const blocks = ['morning', 'afternoon', 'evening'];
        blocksHTML = blocks.map(blockType => {
          const block = day.blocks[blockType];
          if (!block || !block.activities || block.activities.length === 0) {
            return '';
          }

          const activitiesHTML = block.activities.map((activity: any) => {
            const poi = activity.poi || {};
            const time = activity.startTime || '';
            const duration = activity.duration || 0;
            return `
              <div style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-left: 3px solid #4CAF50;">
                <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                  ${time} - ${poi.name || 'Activity'}
                </div>
                ${poi.description ? `<div style="color: #666; font-size: 0.9em; margin-bottom: 5px;">${poi.description}</div>` : ''}
                <div style="color: #888; font-size: 0.85em;">
                  Duration: ${duration} minutes
                  ${activity.travelTimeFromPrevious ? ` | Travel: ${activity.travelTimeFromPrevious} min` : ''}
                </div>
              </div>
            `;
          }).join('');

          return `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #2196F3; margin-bottom: 10px; text-transform: capitalize;">${blockType}</h3>
              ${activitiesHTML}
            </div>
          `;
        }).join('');
      }

      return `
        <div style="page-break-inside: avoid; margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #1976D2; margin-bottom: 15px;">Day ${day.day}: ${dayDate}</h2>
          ${blocksHTML}
          ${day.totalActivities ? `<p style="color: #666; font-size: 0.9em;">Total Activities: ${day.totalActivities}</p>` : ''}
        </div>
      `;
    }).join('');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Travel Itinerary - ${itinerary.city}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          color: #1976D2;
          border-bottom: 3px solid #1976D2;
          padding-bottom: 10px;
        }
        .header-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 30px;
        }
        .header-info p {
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <h1>Travel Itinerary: ${itinerary.city}</h1>
      <div class="header-info">
        <p><strong>Duration:</strong> ${itinerary.duration} day${itinerary.duration > 1 ? 's' : ''}</p>
        <p><strong>Start Date:</strong> ${startDate}</p>
        <p><strong>Pace:</strong> ${itinerary.pace || 'moderate'}</p>
      </div>
      ${daysHTML}
    </body>
    </html>
  `;
}

export default router;

