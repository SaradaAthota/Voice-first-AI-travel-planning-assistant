# n8n Workflow: Itinerary PDF Email

This workflow generates a PDF from an itinerary and emails it to the user.

## Workflow Overview

1. **Webhook Trigger** - Receives itinerary data via POST request
2. **Format HTML** - Converts itinerary JSON to styled HTML
3. **Generate PDF** - Converts HTML to PDF
4. **Send Email** - Emails PDF to user
5. **Respond to Webhook** - Returns success response

## Setup Instructions

### 1. Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `workflow-itinerary-pdf-email.json`
4. The workflow will be imported with all nodes

### 2. Configure Webhook

1. Click on the **Webhook** node
2. Note the webhook URL (e.g., `https://your-n8n-instance.com/webhook/itinerary-pdf`)
3. Copy this URL for use in your backend

### 3. Configure SMTP Credentials

1. Go to **Credentials** → **Add Credential**
2. Select **SMTP**
3. Enter your SMTP settings:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`)
   - **Port**: SMTP port (e.g., `587` for TLS)
   - **User**: Your email address
   - **Password**: Your email password or app password
   - **Secure**: Enable if using TLS/SSL
4. Save as "SMTP"

### 4. Configure Email Settings

1. Click on the **Send Email** node
2. Select your SMTP credentials
3. Update the "From Email" field (or set `N8N_EMAIL_FROM` environment variable)
4. Customize the email subject and message if needed

### 5. Install PDF Generation Node

The workflow uses `@n8n/n8n-nodes-langchain` for PDF generation. If not available:

1. Install via n8n Community Nodes:
   - Go to **Settings** → **Community Nodes**
   - Search for `htmlToPdf` or use `puppeteer` node
2. Alternative: Use a different PDF generation service

## API Usage

### Request Format

Send a POST request to the webhook URL:

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
          "blocks": {
            "morning": {
              "block": "morning",
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
          },
          "totalDuration": 480,
          "totalTravelTime": 60,
          "totalActivities": 3
        }
      ]
    },
    "email": "user@example.com",
    "citations": [
      {
        "source": "Wikivoyage",
        "url": "https://en.wikivoyage.org/wiki/Jaipur",
        "excerpt": "Travel guide information"
      }
    ]
  }'
```

### Response Format

```json
{
  "success": true,
  "message": "Itinerary PDF sent to user@example.com"
}
```

## Workflow Nodes

### 1. Webhook
- **Type**: Webhook Trigger
- **Method**: POST
- **Path**: `itinerary-pdf`
- **Purpose**: Receives itinerary data

### 2. Format HTML
- **Type**: Code Node
- **Purpose**: Converts itinerary JSON to HTML
- **Features**:
  - Styled HTML with CSS
  - Day-wise itinerary display
  - Morning/Afternoon/Evening blocks
  - Activity details
  - Sources section

### 3. Generate PDF
- **Type**: HTML to PDF Node
- **Purpose**: Converts HTML to PDF
- **Settings**:
  - Format: A4
  - Margins: 20mm all sides
  - Print background: true

### 4. Send Email
- **Type**: Email Send Node
- **Purpose**: Emails PDF to user
- **Attachments**: PDF file
- **Subject**: "Your Travel Itinerary - {city}"

### 5. Respond to Webhook
- **Type**: Respond to Webhook Node
- **Purpose**: Returns success response

## HTML Template Features

- **Header**: City name, duration, pace, start date
- **Days**: Each day with:
  - Day number and date
  - Summary (duration, travel time, activities)
  - Morning/Afternoon/Evening blocks
  - Activities with POI details
- **Sources**: Citations with links
- **Footer**: Generation timestamp

## Environment Variables

Set these in your n8n instance:

- `N8N_EMAIL_FROM`: Default "from" email address

## Error Handling

The workflow includes error handling:
- Missing itinerary data → Error response
- Missing email → Error response
- PDF generation failure → Error logged
- Email send failure → Error logged

## Testing

1. Use the webhook URL in Postman or curl
2. Send a test request with sample itinerary data
3. Check email inbox for PDF
4. Verify PDF includes all days and sources

## Troubleshooting

### PDF Not Generating
- Check if PDF generation node is installed
- Verify HTML is valid
- Check n8n logs for errors

### Email Not Sending
- Verify SMTP credentials
- Check email server settings
- Verify recipient email is valid

### Webhook Not Triggering
- Check webhook URL is correct
- Verify POST request format
- Check n8n webhook settings

## Integration with Backend

Add this endpoint to your backend:

```typescript
// POST /api/itinerary/send-pdf
router.post('/send-pdf', async (req, res) => {
  const { tripId, email } = req.body;
  
  // Get itinerary from database
  const itinerary = await getItinerary(tripId);
  const citations = await getCitations(tripId);
  
  // Call n8n webhook
  await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itinerary,
      email,
      citations
    })
  });
  
  res.json({ success: true });
});
```

## Security Considerations

- Validate email addresses
- Sanitize HTML content
- Rate limit webhook requests
- Use HTTPS for webhook URL
- Authenticate webhook requests (optional)

