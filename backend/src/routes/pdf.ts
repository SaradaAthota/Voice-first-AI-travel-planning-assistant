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
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }
    
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
    
    try {
      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      
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
      
      // Set response headers
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="itinerary.pdf"');
      
      // Send PDF
      res.send(pdf);
    } finally {
      // Always close browser
      await browser.close();
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'PDF generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

