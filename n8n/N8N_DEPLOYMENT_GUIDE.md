# n8n PDF + Email Workflow Deployment Guide

## Overview

This guide covers deploying the n8n workflow for generating itinerary PDFs and emailing them to users. The workflow is **mandatory** for the graduation project.

## Workflow Architecture

```
Backend (Railway)
    ↓ POST /api/itinerary/send-pdf
    ↓ { tripId, email }
    ↓
n8n Webhook
    ↓ Receives { itinerary, email, citations }
    ↓
Format HTML Node
    ↓ Generates styled HTML
    ↓
Generate PDF Node (HTTP Request to Backend)
    ↓ POST /api/pdf/generate-pdf
    ↓ { html }
    ↓ Returns PDF binary
    ↓
Send Email Node
    ↓ Attaches PDF
    ↓ Sends to user email
    ↓
Respond to Webhook
    ↓ Returns { success: true }
```

## Prerequisites

1. **n8n Instance** (choose one):
   - n8n Cloud (recommended for production)
   - Self-hosted n8n (Docker/Railway/Render)
   - Local n8n (development only)

2. **SMTP Credentials**:
   - Gmail (with App Password)
   - SendGrid
   - AWS SES
   - Any SMTP server

3. **Backend Deployed**:
   - Railway backend URL
   - `N8N_WEBHOOK_URL` configured in backend

## Step 1: Deploy n8n

### Option A: n8n Cloud (Recommended)

1. Go to [n8n.cloud](https://n8n.cloud)
2. Sign up for free account
3. Create a new workflow
4. Copy your n8n instance URL (e.g., `https://your-name.n8n.cloud`)

### Option B: Self-Hosted on Railway

1. Create new Railway project
2. Add service → Deploy from GitHub
3. Use n8n Docker image:
   ```dockerfile
   FROM n8nio/n8n:latest
   ```
4. Set environment variables:
   ```env
   N8N_HOST=0.0.0.0
   N8N_PORT=5678
   WEBHOOK_URL=https://your-n8n-instance.up.railway.app
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=your-secure-password
   ```
5. Deploy and note the URL

### Option C: Self-Hosted with Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your-password \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Access at: `http://localhost:5678`

## Step 2: Import Workflow

1. Open n8n dashboard
2. Go to **Workflows** → **Import from File**
3. Select `n8n/workflow-itinerary-pdf-email.json`
4. The workflow will be imported with all nodes

## Step 3: Configure Environment Variables

### In n8n Settings

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   BACKEND_URL=https://your-backend-url.up.railway.app
   ```
   **⚠️ IMPORTANT**: No trailing slash, no `localhost` fallback

### Verify BACKEND_URL

- ✅ Correct: `https://your-backend.up.railway.app`
- ❌ Wrong: `https://your-backend.up.railway.app/`
- ❌ Wrong: `http://localhost:3000`
- ❌ Wrong: `{{ $env.BACKEND_URL || 'http://localhost:3000' }}`

## Step 4: Configure Webhook

1. Click on **Webhook** node
2. Note the webhook URL:
   - n8n Cloud: `https://your-name.n8n.cloud/webhook/itinerary-pdf`
   - Self-hosted: `https://your-n8n-instance.com/webhook/itinerary-pdf`
3. Copy this URL for backend configuration

## Step 5: Configure SMTP Credentials

### Gmail Setup

1. Go to **Credentials** → **Add Credential**
2. Select **SMTP**
3. Configure:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **User**: Your Gmail address
   - **Password**: [Gmail App Password](https://support.google.com/accounts/answer/185833)
   - **Secure**: Enable (TLS)
4. Save as "SMTP"

### SendGrid Setup

1. Create SendGrid account
2. Generate API key
3. Configure:
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **User**: `apikey`
   - **Password**: Your SendGrid API key
   - **Secure**: Enable

### AWS SES Setup

1. Verify email domain in AWS SES
2. Configure:
   - **Host**: `email-smtp.us-east-1.amazonaws.com` (or your region)
   - **Port**: `587`
   - **User**: Your AWS SES SMTP username
   - **Password**: Your AWS SES SMTP password
   - **Secure**: Enable

## Step 6: Configure Email Node

1. Click on **Send Email** node
2. Select your SMTP credentials
3. Update **From Email**:
   - Use environment variable: `{{ $env.N8N_EMAIL_FROM }}`
   - Or hardcode: `travel-assistant@yourdomain.com`
4. Customize **Subject** (optional):
   ```
   Your Travel Itinerary - {{ $json.itinerary.city }}
   ```
5. Customize **Message** (optional):
   ```html
   <p>Hello,</p>
   <p>Please find your travel itinerary attached.</p>
   <p>Enjoy your trip!</p>
   ```

## Step 7: Activate Workflow

1. Toggle **Active** switch in top-right
2. Workflow is now listening for webhook requests
3. Test with sample request (see Testing section)

## Step 8: Configure Backend

### Add Environment Variable

In your Railway backend, add:
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
```

### Verify Backend Endpoint

The backend endpoint `POST /api/itinerary/send-pdf` should:
1. Fetch itinerary from database
2. Generate citations
3. Call n8n webhook with:
   ```json
   {
     "itinerary": { ... },
     "email": "user@example.com",
     "citations": [ ... ]
   }
   ```

## Testing

### Test Webhook Directly

```bash
curl -X POST https://your-n8n-instance.com/webhook/itinerary-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "itinerary": {
      "city": "Jaipur",
      "duration": 3,
      "startDate": "2024-01-15",
      "pace": "moderate",
      "days": [
        {
          "day": 1,
          "date": "2024-01-15",
          "totalDuration": 480,
          "totalTravelTime": 60,
          "totalActivities": 3,
          "blocks": {
            "morning": {
              "startTime": "09:00",
              "endTime": "12:00",
              "activities": [
                {
                  "poi": {
                    "name": "City Palace",
                    "category": "history",
                    "description": "Historic palace complex"
                  },
                  "startTime": "09:00",
                  "endTime": "11:00",
                  "duration": 120
                }
              ]
            }
          }
        }
      ]
    },
    "email": "test@example.com",
    "citations": [
      {
        "source": "OpenStreetMap",
        "url": "https://www.openstreetmap.org",
        "excerpt": "POI data"
      }
    ]
  }'
```

### Test from Backend

```bash
curl -X POST https://your-backend.up.railway.app/api/itinerary/send-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "your-trip-id",
    "email": "test@example.com"
  }'
```

### Check n8n Execution Logs

1. Go to **Executions** in n8n
2. Find your test execution
3. Check each node for errors
4. Verify PDF was generated
5. Verify email was sent

## Workflow Nodes Explained

### 1. Webhook (Trigger)
- **Type**: Webhook Trigger
- **Method**: POST
- **Path**: `itinerary-pdf`
- **Purpose**: Receives itinerary data from backend

### 2. Format HTML (Code Node)
- **Type**: Code Node (JavaScript)
- **Purpose**: Converts itinerary JSON to styled HTML
- **Features**:
  - Day-wise breakdown
  - Morning/Afternoon/Evening blocks
  - Travel times
  - POI details
  - Sources section (citations)

### 3. Generate PDF (HTTP Request)
- **Type**: HTTP Request Node
- **Method**: POST
- **URL**: `{{ $env.BACKEND_URL }}/api/pdf/generate-pdf`
- **Body**: `{ "html": "{{ $json.html }}" }`
- **Response Format**: File (binary PDF)
- **Purpose**: Calls backend Puppeteer endpoint to generate PDF

### 4. Send Email
- **Type**: Email Send Node
- **To**: `{{ $json.email }}`
- **Subject**: `Your Travel Itinerary - {{ $json.itinerary.city }}`
- **Attachments**: PDF from previous node
- **Purpose**: Emails PDF to user

### 5. Respond to Webhook
- **Type**: Respond to Webhook Node
- **Response**: `{ "success": true, "message": "..." }`
- **Purpose**: Returns success to backend

## Troubleshooting

### Issue: "BACKEND_URL not set"

**Solution**:
1. Go to n8n Settings → Environment Variables
2. Add `BACKEND_URL=https://your-backend-url.up.railway.app`
3. Restart workflow

### Issue: "PDF generation failed"

**Check**:
1. Backend `/api/pdf/generate-pdf` endpoint is accessible
2. Puppeteer is installed in backend
3. Backend has enough memory for Puppeteer
4. Check backend logs for errors

**Solution**:
- Verify `BACKEND_URL` is correct (no trailing slash)
- Test backend endpoint directly:
  ```bash
  curl -X POST https://your-backend.up.railway.app/api/pdf/generate-pdf \
    -H "Content-Type: application/json" \
    -d '{"html": "<html><body>Test</body></html>"}'
  ```

### Issue: "Email not sending"

**Check**:
1. SMTP credentials are correct
2. Email server allows connections
3. Gmail: App Password is set (not regular password)
4. SendGrid: API key is valid

**Solution**:
- Test SMTP connection in n8n
- Check email server logs
- Verify credentials in n8n

### Issue: "Webhook not triggering"

**Check**:
1. Workflow is **Active** (toggle in top-right)
2. Webhook URL is correct
3. Backend is calling correct URL
4. n8n instance is accessible

**Solution**:
- Verify webhook URL in n8n
- Check n8n execution logs
- Test webhook with curl (see Testing section)

### Issue: "Connection refused" or "Service offline"

**Cause**: n8n cannot reach backend

**Solution**:
- Verify `BACKEND_URL` is public (not localhost)
- Check backend is deployed and running
- Test backend health endpoint:
  ```bash
  curl https://your-backend.up.railway.app/health
  ```

## Production Checklist

- [ ] n8n instance deployed (cloud or self-hosted)
- [ ] Workflow imported and activated
- [ ] `BACKEND_URL` environment variable set (no localhost)
- [ ] SMTP credentials configured
- [ ] Email "From" address configured
- [ ] Webhook URL copied to backend `N8N_WEBHOOK_URL`
- [ ] Backend endpoint tested
- [ ] End-to-end test completed (backend → n8n → email)
- [ ] Error handling verified
- [ ] Monitoring/logging set up

## Security Considerations

1. **Webhook Authentication** (Optional):
   - Add webhook authentication in n8n
   - Pass token in backend request
   - Verify token in n8n workflow

2. **SMTP Security**:
   - Use TLS/SSL for SMTP
   - Store credentials securely in n8n
   - Use App Passwords (not regular passwords)

3. **Environment Variables**:
   - Never commit credentials to Git
   - Use n8n's credential system
   - Rotate credentials regularly

4. **Rate Limiting**:
   - Implement rate limiting in backend
   - Monitor n8n execution count
   - Set up alerts for failures

## Monitoring

### n8n Execution Logs

1. Go to **Executions** in n8n
2. Monitor:
   - Success rate
   - Execution time
   - Error messages
   - Failed nodes

### Backend Logs

Monitor backend logs for:
- PDF generation requests
- n8n webhook calls
- Error responses

### Email Delivery

- Check email delivery rate
- Monitor bounce rates
- Verify PDF attachments are received

## Cost Estimation

### n8n Cloud
- **Free Tier**: 1,000 executions/month
- **Paid**: $20/month for 5,000 executions

### Self-Hosted
- **Railway**: ~$5-10/month
- **Docker**: Free (your infrastructure)

### SMTP
- **Gmail**: Free (with App Password)
- **SendGrid**: Free tier (100 emails/day)
- **AWS SES**: $0.10 per 1,000 emails

## Support

For issues:
1. Check n8n execution logs
2. Check backend logs
3. Verify environment variables
4. Test each node individually
5. Review this guide's troubleshooting section

---

**Status**: ✅ Production Ready

**Last Updated**: 2024-01-20

