# PDF Email Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "N8N webhook URL not configured"

**Error Message**: `N8N_WEBHOOK_URL not configured`

**Solution**:
1. Add `N8N_WEBHOOK_URL` to your backend environment variables (Railway/Render)
2. Get the webhook URL from n8n:
   - Go to n8n workflow
   - Click on the Webhook node
   - Copy the "Production URL" (e.g., `https://your-workspace.n8n.cloud/webhook/itinerary-pdf`)
3. Set in Railway/Render:
   ```
   N8N_WEBHOOK_URL=https://your-workspace.n8n.cloud/webhook/itinerary-pdf
   ```
4. Redeploy backend

### Issue 2: "Itinerary not found"

**Error Message**: `Itinerary not found`

**Solution**:
1. Ensure you have generated an itinerary first
2. Check that the `tripId` is correct
3. Verify itinerary exists in Supabase:
   ```sql
   SELECT * FROM itineraries WHERE trip_id = 'your-trip-id' AND is_active = true;
   ```

### Issue 3: "Failed to trigger PDF generation"

**Error Message**: `Failed to trigger PDF generation` or HTTP 500/404

**Possible Causes**:
1. **n8n workflow is not active**
   - Go to n8n dashboard
   - Find your workflow
   - Toggle "Active" switch ON (top-right)

2. **Webhook URL is incorrect**
   - Verify webhook URL in n8n matches `N8N_WEBHOOK_URL` in backend
   - Check for trailing slashes (should NOT have one)
   - Ensure using production URL, not test URL

3. **n8n instance is not accessible**
   - Test webhook URL directly:
     ```bash
     curl -X POST https://your-workspace.n8n.cloud/webhook/itinerary-pdf \
       -H "Content-Type: application/json" \
       -d '{"itinerary": {"city": "Test"}, "email": "test@example.com", "citations": []}'
     ```

4. **Backend cannot reach n8n**
   - Check backend logs for connection errors
   - Verify n8n instance is publicly accessible
   - Check firewall/network settings

### Issue 4: "PDF generation timeout"

**Error Message**: `PDF generation timeout` or HTTP 504

**Solution**:
1. Check n8n execution logs:
   - Go to n8n → Executions
   - Find the failed execution
   - Check which node is taking too long

2. Verify backend PDF endpoint is accessible:
   ```bash
   curl -X POST https://your-backend.up.railway.app/api/pdf/generate-pdf \
     -H "Content-Type: application/json" \
     -d '{"html": "<html><body>Test</body></html>"}'
   ```

3. Check backend has enough memory for Puppeteer
4. Increase timeout in `backend/src/routes/itinerary.ts` (currently 60 seconds)

### Issue 5: "Email not sending"

**Symptoms**: Backend returns success, but email never arrives

**Check**:
1. **SMTP credentials in n8n**
   - Go to n8n → Credentials
   - Verify SMTP credentials are correct
   - For Gmail: Use App Password (not regular password)
   - For SendGrid: Verify API key is valid

2. **Email node configuration**
   - Check "To" field: `{{ $json.email }}`
   - Check "From" field: Should be a valid email
   - Check "Attachments" field: Should reference PDF from previous node

3. **Check spam folder**
   - Email might be in spam/junk folder

4. **Check n8n execution logs**
   - Go to n8n → Executions
   - Find the execution
   - Check "Send Email" node for errors
   - Look for SMTP connection errors

### Issue 6: Email extraction from voice command not working

**Symptoms**: User says "send it to my email" but system asks for email again

**Solution**:
1. **Check email extraction in IntentRouter**
   - The system extracts email using regex: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/`
   - If email is not in the message, system will ask for it

2. **User should provide email explicitly**:
   - "Send it to john@example.com"
   - "Email me at test@gmail.com"
   - Or use the "Send PDF via Email" button in UI

3. **Check backend logs**:
   - Look for "Extracted email:" in logs
   - Verify email is being extracted correctly

## Testing Checklist

### Step 1: Verify Backend Configuration
- [ ] `N8N_WEBHOOK_URL` is set in backend environment
- [ ] Backend is deployed and accessible
- [ ] `/api/itinerary/send-pdf` endpoint exists

### Step 2: Verify n8n Configuration
- [ ] n8n workflow is **ACTIVE** (toggle ON)
- [ ] Webhook URL matches `N8N_WEBHOOK_URL` in backend
- [ ] `BACKEND_URL` environment variable is set in n8n
- [ ] SMTP credentials are configured in n8n
- [ ] Email "From" address is configured

### Step 3: Test Backend Endpoint
```bash
curl -X POST https://your-backend.up.railway.app/api/itinerary/send-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "your-trip-id",
    "email": "test@example.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Itinerary PDF will be sent to test@example.com"
}
```

### Step 4: Check n8n Execution
1. Go to n8n → Executions
2. Find the latest execution
3. Verify each node executed successfully:
   - ✅ Webhook (received data)
   - ✅ Format HTML (generated HTML)
   - ✅ Generate PDF (HTTP Request to backend)
   - ✅ Send Email (email sent)
   - ✅ Respond to Webhook (response sent)

### Step 5: Verify Email
- [ ] Check inbox
- [ ] Check spam/junk folder
- [ ] Verify PDF attachment is present
- [ ] Verify email content is correct

## Debug Commands

### Check Backend Environment Variables
```bash
# In Railway/Render, check environment variables
# Should have:
N8N_WEBHOOK_URL=https://your-workspace.n8n.cloud/webhook/itinerary-pdf
```

### Test n8n Webhook Directly
```bash
curl -X POST https://your-workspace.n8n.cloud/webhook/itinerary-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "itinerary": {
      "city": "Test City",
      "duration": 2,
      "days": [{
        "day": 1,
        "blocks": {
          "morning": {
            "activities": [{
              "poi": {"name": "Test POI"}
            }]
          }
        }
      }]
    },
    "email": "test@example.com",
    "citations": []
  }'
```

### Check Backend Logs
Look for these log messages:
- `=== PDF EMAIL REQUEST ===`
- `Calling n8n webhook: ...`
- `N8N webhook success: ...`
- `N8N webhook error response: ...`

### Check n8n Logs
1. Go to n8n → Executions
2. Click on execution
3. Check each node for:
   - Input data
   - Output data
   - Errors (red nodes)

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `N8N_WEBHOOK_URL not configured` | Missing env var | Add to backend environment |
| `Itinerary not found` | No itinerary for tripId | Generate itinerary first |
| `Failed to trigger PDF generation` | n8n workflow issue | Check workflow is active |
| `PDF generation timeout` | Backend PDF endpoint slow | Check backend logs |
| `Email not sending` | SMTP issue | Check n8n SMTP credentials |
| `Connection refused` | n8n can't reach backend | Verify BACKEND_URL is public |

## Still Not Working?

1. **Check backend logs** (Railway/Render):
   - Look for error messages
   - Check request/response details

2. **Check n8n execution logs**:
   - Go to Executions
   - Find failed execution
   - Check each node for errors

3. **Test each component separately**:
   - Test backend `/api/itinerary/send-pdf` endpoint
   - Test n8n webhook directly
   - Test backend `/api/pdf/generate-pdf` endpoint
   - Test SMTP connection in n8n

4. **Verify environment variables**:
   - Backend: `N8N_WEBHOOK_URL`
   - n8n: `BACKEND_URL`

5. **Check network connectivity**:
   - Backend → n8n (webhook call)
   - n8n → Backend (PDF generation)
   - n8n → SMTP server (email sending)

