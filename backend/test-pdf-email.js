/**
 * Test script for PDF generation and email sending
 * 
 * Usage: node test-pdf-email.js <tripId> <email>
 * Example: node test-pdf-email.js abc123 test@example.com
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation and Email Flow\n');
  
  // Get command line arguments
  const tripId = process.argv[2];
  const email = process.argv[3];
  
  if (!tripId || !email) {
    console.error('❌ Usage: node test-pdf-email.js <tripId> <email>');
    console.error('   Example: node test-pdf-email.js abc-123 test@example.com');
    process.exit(1);
  }
  
  console.log(`📋 Trip ID: ${tripId}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🌐 Backend URL: ${BASE_URL}\n`);
  
  // Step 1: Test backend health
  console.log('Step 1: Testing backend health...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    console.log('✅ Backend is healthy:', healthData);
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    console.error('   Make sure the backend is running: cd backend && npm run dev');
    process.exit(1);
  }
  
  // Step 2: Test itinerary retrieval
  console.log('\nStep 2: Testing itinerary retrieval...');
  try {
    const itineraryResponse = await fetch(`${BASE_URL}/api/trips/${tripId}/itinerary`);
    if (!itineraryResponse.ok) {
      const errorText = await itineraryResponse.text();
      throw new Error(`Itinerary retrieval failed: ${itineraryResponse.status} - ${errorText}`);
    }
    const itinerary = await itineraryResponse.json();
    console.log('✅ Itinerary retrieved successfully');
    console.log(`   City: ${itinerary.city}`);
    console.log(`   Duration: ${itinerary.duration} days`);
    console.log(`   Total Activities: ${itinerary.totalActivities || 'N/A'}`);
  } catch (error) {
    console.error('❌ Itinerary retrieval failed:', error.message);
    console.error('   Make sure the tripId exists and has an itinerary');
    process.exit(1);
  }
  
  // Step 3: Test PDF generation endpoint
  console.log('\nStep 3: Testing PDF generation endpoint...');
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test PDF</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>Test PDF Generation</h1>
      <p>This is a test PDF to verify the endpoint is working.</p>
      <p>Trip ID: ${tripId}</p>
      <p>Email: ${email}</p>
    </body>
    </html>
  `;
  
  try {
    const pdfResponse = await fetch(`${BASE_URL}/api/pdf/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: testHTML }),
    });
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`PDF generation failed: ${pdfResponse.status} - ${errorText}`);
    }
    
    const contentType = pdfResponse.headers.get('content-type');
    if (contentType !== 'application/pdf') {
      throw new Error(`Expected PDF, got ${contentType}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('✅ PDF generation successful');
    console.log(`   PDF size: ${pdfBuffer.byteLength} bytes`);
    console.log(`   Content-Type: ${contentType}`);
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.error('   Check if Puppeteer is installed and working');
    process.exit(1);
  }
  
  // Step 4: Test send-pdf endpoint
  console.log('\nStep 4: Testing send-pdf endpoint...');
  try {
    const sendPdfResponse = await fetch(`${BASE_URL}/api/itinerary/send-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId,
        email,
      }),
    });
    
    if (!sendPdfResponse.ok) {
      const errorText = await sendPdfResponse.text();
      throw new Error(`Send PDF failed: ${sendPdfResponse.status} - ${errorText}`);
    }
    
    const sendPdfData = await sendPdfResponse.json();
    console.log('✅ Send PDF request successful');
    console.log('   Response:', JSON.stringify(sendPdfData, null, 2));
    
    if (sendPdfData.success) {
      console.log(`\n✅ SUCCESS! PDF should be sent to ${email}`);
      console.log('   Check your inbox (and spam folder) for the email.');
    } else {
      console.log('\n⚠️  Request succeeded but success flag is false');
      console.log('   Check n8n workflow logs for details');
    }
  } catch (error) {
    console.error('❌ Send PDF failed:', error.message);
    
    if (error.message.includes('N8N webhook URL not configured')) {
      console.error('\n💡 Fix: Add N8N_WEBHOOK_URL to backend/.env file');
      console.error('   Example: N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf');
    } else if (error.message.includes('Itinerary not found')) {
      console.error('\n💡 Fix: Make sure the tripId has an active itinerary');
    } else if (error.message.includes('Failed to trigger PDF generation')) {
      console.error('\n💡 Fix: Check n8n workflow:');
      console.error('   1. Is the workflow ACTIVE?');
      console.error('   2. Is the webhook URL correct?');
      console.error('   3. Check n8n execution logs for errors');
    }
    
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed!');
}

// Run tests
testPDFGeneration().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

