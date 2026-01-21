/**
 * PDF Generation Route
 * 
 * Generates PDF from HTML content using Puppeteer.
 */

import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

/**
 * POST /api/pdf/generate-pdf
 * Generate PDF from HTML content
 */
router.post('/generate-pdf', async (req: Request, res: Response) => {
  console.log('=== PDF GENERATION REQUEST ===');
  console.log('Request received, HTML length:', req.body?.html?.length || 0);
  
  try {
    const { html } = req.body;
    
    if (!html) {
      console.error('Missing HTML content in request body');
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    console.log('Launching Puppeteer browser...');
    
    // Determine executable path (for Alpine Linux with installed Chromium)
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    
    // Launch Puppeteer browser
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
    
    console.log('Browser launched successfully');
    
    try {
      console.log('Creating new page...');
      const page = await browser.newPage();
      
      console.log('Setting HTML content...');
      // Set content and wait for it to load
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      
      console.log('Generating PDF...');
      // Generate PDF
      const pdf = await page.pdf({
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
      
      console.log('PDF generated successfully, size:', pdf.length, 'bytes');
      
      // Set response headers
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="itinerary.pdf"');
      
      // Send PDF
      res.send(pdf);
      return;
    } catch (pageError) {
      console.error('PDF generation error (page level):', pageError);
      throw pageError; // Re-throw to be caught by outer catch
    } finally {
      // Always close browser
      try {
        await browser.close();
        console.log('Browser closed');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });
    
    res.status(500).json({ 
      error: 'PDF generation failed',
      message: errorMessage,
      // Include stack trace in development only
      ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
    });
    return;
  }
});

export default router;

