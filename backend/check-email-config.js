/**
 * Check email/PDF configuration
 */

require('dotenv').config({ path: '.env' });

console.log('🔍 Checking Email/PDF Configuration...\n');
console.log('='.repeat(60));

// Check N8N_WEBHOOK_URL
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
if (!n8nWebhookUrl) {
  console.log('❌ N8N_WEBHOOK_URL is NOT configured');
  console.log('   Add to backend/.env:');
  console.log('   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf');
} else {
  console.log('✅ N8N_WEBHOOK_URL is configured');
  console.log(`   URL: ${n8nWebhookUrl}`);
  
  // Test if URL is accessible
  console.log('\n📡 Testing n8n webhook connectivity...');
  const fetch = require('node-fetch');
  
  fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true }),
    timeout: 10000,
  })
    .then(response => {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      if (response.ok) {
        console.log('   ✅ Webhook is accessible');
      } else {
        console.log('   ⚠️  Webhook returned error status');
        console.log('   Check n8n workflow is ACTIVE');
      }
    })
    .catch(error => {
      console.log('   ❌ Cannot connect to webhook');
      console.log(`   Error: ${error.message}`);
      console.log('   Possible issues:');
      console.log('   - n8n instance is down');
      console.log('   - Webhook URL is incorrect');
      console.log('   - Network/firewall blocking connection');
    });
}

console.log('\n' + '='.repeat(60));
console.log('📋 Summary');
console.log('='.repeat(60));
console.log('\nTo fix email sending:');
console.log('1. Ensure N8N_WEBHOOK_URL is set in backend/.env');
console.log('2. Ensure n8n workflow is ACTIVE (toggle on)');
console.log('3. Verify webhook URL is correct');
console.log('4. Check n8n workflow execution logs for errors');
console.log('5. Verify SMTP credentials are configured in n8n\n');

