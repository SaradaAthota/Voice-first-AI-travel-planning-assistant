/**
 * Complete test script for PDF generation and email sending
 * Tests the full flow: Backend → n8n → Email
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testFullFlow() {
  console.log('🧪 Testing Complete PDF Generation and Email Flow\n');
  console.log('='.repeat(60));
  
  // Get command line arguments
  const tripId = process.argv[2];
  const email = process.argv[3];
  
  if (!tripId || !email) {
    console.error('❌ Usage: node test-pdf-full.js <tripId> <email>');
    console.error('   Example: node test-pdf-full.js abc-123 test@example.com');
    console.error('\n💡 To get a tripId, check your database or use a recent trip from your testing');
    process.exit(1);
  }
  
  console.log(`📋 Trip ID: ${tripId}`);
  console.log(`📧 Email: ${email}`);
  console.log(`🌐 Backend URL: ${BASE_URL}\n`);
  console.log('='.repeat(60));
  
  // Step 1: Test backend health
  console.log('\n📡 Step 1: Testing Backend Health...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    const data = await response.json();
    console.log('✅ Backend is healthy');
    console.log(`   Status: ${data.status}`);
    console.log(`   Environment: ${data.environment}`);
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    console.error('   Make sure the backend is running: cd backend && npm run dev');
    process.exit(1);
  }
  
  // Step 2: Test itinerary retrieval
  console.log('\n📋 Step 2: Testing Itinerary Retrieval...');
  let itinerary = null;
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/itinerary`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Itinerary retrieval failed: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    itinerary = data.itinerary || data;
    console.log('✅ Itinerary retrieved successfully');
    console.log(`   City: ${itinerary.city}`);
    console.log(`   Duration: ${itinerary.duration} days`);
    console.log(`   Start Date: ${itinerary.startDate}`);
    console.log(`   Pace: ${itinerary.pace}`);
    console.log(`   Total Activities: ${itinerary.totalActivities || 'N/A'}`);
    console.log(`   Days: ${itinerary.days?.length || 0}`);
  } catch (error) {
    console.error('❌ Itinerary retrieval failed:', error.message);
    console.error('   Make sure the tripId exists and has an itinerary');
    console.error('   You can generate an itinerary through the UI first');
    process.exit(1);
  }
  
  // Step 3: Test PDF generation endpoint directly
  console.log('\n📄 Step 3: Testing PDF Generation Endpoint...');
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
      <p>Time: ${new Date().toISOString()}</p>
    </body>
    </html>
  `;
  
  try {
    const response = await fetch(`${BASE_URL}/api/pdf/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ html: testHTML }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${response.status} - ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType !== 'application/pdf') {
      throw new Error(`Expected PDF, got ${contentType}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    console.log('✅ PDF generation successful');
    console.log(`   PDF size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log(`   Content-Type: ${contentType}`);
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.error('   Check if Puppeteer is installed: npm list puppeteer');
    console.error('   Check backend logs for errors');
    process.exit(1);
  }
  
  // Step 4: Test send-pdf endpoint (full flow)
  console.log('\n📧 Step 4: Testing Send PDF Endpoint (Full Flow)...');
  console.log('   This will call n8n webhook → generate PDF → send email');
  try {
    console.log('   Calling /api/itinerary/send-pdf...');
    const response = await fetch(`${BASE_URL}/api/itinerary/send-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId,
        email,
      }),
    });
    
    console.log(`   Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Send PDF failed:', errorText);
      
      // Provide specific error guidance
      if (errorText.includes('N8N webhook URL not configured')) {
        console.error('\n💡 Fix: Add N8N_WEBHOOK_URL to backend/.env file');
        console.error('   Example: N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf');
      } else if (errorText.includes('Itinerary not found')) {
        console.error('\n💡 Fix: Make sure the tripId has an active itinerary');
        console.error('   Generate an itinerary through the UI first');
      } else if (errorText.includes('Failed to trigger PDF generation')) {
        console.error('\n💡 Fix: Check n8n workflow:');
        console.error('   1. Is the workflow ACTIVE? (toggle on)');
        console.error('   2. Is the webhook URL correct?');
        console.error('   3. Check n8n execution logs for errors');
        console.error('   4. Verify HTTP Request node Response Format is "File"');
        console.error('   5. Verify Email node attachment data property is "data"');
      } else if (errorText.includes('timeout')) {
        console.error('\n💡 Fix: n8n workflow took too long');
        console.error('   Check n8n execution logs');
        console.error('   Verify backend PDF endpoint is accessible from n8n');
      }
      
      throw new Error(`Send PDF failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Send PDF request successful');
    console.log('   Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ SUCCESS! PDF should be sent to ' + email);
      console.log('='.repeat(60));
      console.log('\n📬 Next Steps:');
      console.log('   1. Check your email inbox');
      console.log('   2. Check spam/junk folder');
      console.log('   3. Verify PDF attachment is present');
      console.log('   4. Check n8n workflow execution logs for details');
    } else {
      console.log('\n⚠️  Request succeeded but success flag is false');
      console.log('   Check n8n workflow execution logs for details');
    }
  } catch (error) {
    console.error('\n❌ Send PDF failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check backend logs for detailed error messages');
    console.error('   2. Check n8n workflow execution logs');
    console.error('   3. Verify n8n webhook URL is correct');
    console.error('   4. Verify workflow is ACTIVE');
    console.error('   5. Check SMTP credentials in n8n');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

// Run tests
testFullFlow().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

