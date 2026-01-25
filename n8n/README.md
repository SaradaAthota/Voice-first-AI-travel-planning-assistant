# n8n Workflow: Itinerary PDF Email

This workflow receives a pre-generated PDF from the backend and emails it to the user.

## Workflow Overview

1. **Webhook Trigger** - Receives JSON payload with email, city, and base64 PDF
2. **Extract & Convert PDF** - Extracts email/city and converts base64 PDF to binary Buffer
3. **Send Email** - Emails PDF attachment to user
4. **Respond to Webhook** - Returns success response

## Architecture

```
Backend (Puppeteer)
    ↓ (Generates PDF)
    ↓ (Converts to base64)
    ↓ (Sends JSON)
n8n Webhook
    ↓ (Receives JSON with base64 PDF)
Extract & Convert PDF (Code Node)
    ↓ (Converts base64 → Buffer)
    ↓ (Extracts email, city)
Send Email
    ↓ (Attaches PDF)
    ↓ (Sends email)
Respond to Webhook
    ↓ (Returns success)
```

**Key Change**: The backend now generates the PDF using Puppeteer and sends it as base64 in JSON. n8n no longer generates the PDF.

## Setup Instructions

### 1. Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `workflow-itinerary-pdf-email-simplified.json`
4. The workflow will be imported with all nodes

### 2. Configure Webhook

1. Click on the **Webhook** node
2. Note the webhook URL (e.g., `https://your-n8n-instance.com/webhook/itinerary-pdf`)
3. Copy this URL for use in your backend `.env` file as `N8N_WEBHOOK_URL`

### 3. Configure SMTP Credentials

1. Go to **Credentials** → **Add Credential**
2. Select **SMTP**
3. Enter your SMTP settings:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`)
   - **Port**: SMTP port (e.g., `587` for TLS, `465` for SSL)
   - **User**: Your email address
   - **Password**: Your email password or app password (for Gmail, use App Password)
   - **Secure**: 
     - Port 587: SSL/TLS should be **OFF** (STARTTLS is used)
     - Port 465: SSL/TLS should be **ON**
4. Save as "SMTP"

### 4. Configure Email Settings

1. Click on the **Send Email** node
2. Select your SMTP credentials
3. Update the "From Email" field (e.g., `travel-assistant@example.com`)
4. The "To Email" field uses expression: `={{ $json.email }}`
5. The "Subject" field uses expression: `Your Travel Itinerary - {{ $json.city }}`
6. Customize the HTML message if needed

### 5. Configure Attachments

**Important**: The attachment must be configured correctly:

1. In the **Send Email** node, go to **Options** → **Attachments**
2. Click the `fx` button to enable expression mode
3. Enter this exact JSON:

```json
[{"name":"itinerary.pdf","dataPropertyName":"itinerary.pdf"}]
```

**Note**: The `dataPropertyName` must match the binary field name from the "Extract & Convert PDF" node output (`itinerary.pdf`).

## API Usage

### Request Format

The backend sends a POST request to the webhook URL with JSON payload:

```json
{
  "email": "user@example.com",
  "city": "Mumbai",
  "duration": 3,
  "startDate": "2024-01-15",
  "pdf": {
    "data": "base64-encoded-pdf-string...",
    "filename": "itinerary.pdf",
    "contentType": "application/pdf"
  }
}
```

### Response Format

```json
{
  "success": true,
  "message": "Itinerary PDF sent successfully"
}
```

## Workflow Nodes

### 1. Webhook

- **Type**: Webhook Trigger
- **Method**: POST
- **Path**: `itinerary-pdf`
- **Response Mode**: Using Respond to Webhook Node
- **Purpose**: Receives JSON payload with email, city, and base64 PDF

**Input Structure**:
```json
{
  "body": {
    "email": "user@example.com",
    "city": "Mumbai",
    "duration": 3,
    "startDate": "2024-01-15",
    "pdf": {
      "data": "base64-string...",
      "filename": "itinerary.pdf",
      "contentType": "application/pdf"
    }
  }
}
```

### 2. Extract & Convert PDF

- **Type**: Code Node (JavaScript)
- **Purpose**: 
  - Extracts email, city, duration, startDate from JSON
  - Converts base64 PDF to Buffer for n8n binary format
- **Input**: Webhook JSON payload
- **Output**: 
  - JSON: `{ email, city, duration, startDate }`
  - Binary: `{ 'itinerary.pdf': { data: Buffer, mimeType, fileName } }`

**Code Logic**:
1. Reads `input.body` or `input` (handles both formats)
2. Extracts email, city, duration, startDate
3. Gets base64 PDF from `input.pdf.data`
4. Converts base64 to Buffer: `Buffer.from(pdfBase64, 'base64')`
5. Returns JSON + binary data

### 3. Send Email

- **Type**: Email Send Node
- **Purpose**: Emails PDF attachment to user
- **Configuration**:
  - **From Email**: `travel-assistant@example.com` (or your email)
  - **To Email**: `={{ $json.email }}` (from Code node output)
  - **Subject**: `Your Travel Itinerary - {{ $json.city }}`
  - **Email Format**: HTML
  - **Message**: HTML email body
  - **Attachments**: 
    - Name: `itinerary.pdf`
    - Binary Property: `itinerary.pdf` (must match Code node output)

### 4. Respond to Webhook

- **Type**: Respond to Webhook Node
- **Purpose**: Returns success response to backend
- **Response Body**: 
```json
{{ { "success": true, "message": "Itinerary PDF sent successfully" } }}
```

## Backend Integration

The backend generates the PDF and sends it to n8n. See `backend/src/routes/itinerary.ts`:

```typescript
// POST /api/itinerary/send-pdf
router.post('/send-pdf', async (req, res) => {
  const { tripId, email } = req.body;
  
  // 1. Fetch itinerary from database
  const itinerary = await getItinerary(tripId);
  
  // 2. Generate PDF using Puppeteer
  const pdfBuffer = await generatePDF(itinerary);
  
  // 3. Convert to base64
  const pdfBase64 = pdfBuffer.toString('base64');
  
  // 4. Send to n8n webhook
  await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      city: itinerary.city,
      duration: itinerary.duration,
      startDate: itinerary.startDate,
      pdf: {
        data: pdfBase64,
        filename: 'itinerary.pdf',
        contentType: 'application/pdf',
      },
    }),
  });
  
  res.json({ success: true });
});
```

## Environment Variables

Set these in your backend `.env` file:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
```

## Error Handling

The workflow includes error handling:

- **Missing PDF data**: Code node throws error with input structure details
- **Missing email**: Code node throws error
- **Email send failure**: Error logged in n8n execution logs
- **Invalid binary format**: Check Code node output format

## Testing

### 1. Test from Backend

1. Use the frontend to request PDF email
2. Check backend logs for webhook call
3. Check n8n execution logs
4. Verify email received with PDF attachment

### 2. Test Webhook Directly

Use curl or Postman to test the webhook:

```bash
curl -X POST https://your-n8n-instance.com/webhook/itinerary-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "city": "Mumbai",
    "duration": 3,
    "startDate": "2024-01-15",
    "pdf": {
      "data": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmV5ZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9NZXRhZGF0YQovU3VidHlwZSAvWE1MCj4+CnN0cmVhbQo8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL1RSLzIwMDEvUkVDLVNWRy0yMDAxMTIwMzEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiB3aWR0aD0iNjEyIiBoZWlnaHQ9Ijc5MiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxnPgo8L2c+Cjwvc3ZnPgoKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1NCAwMDAwMDAgbiAKMDAwMDAwMDEwMyAwMDAwMDAgbiAKMDAwMDAwMDE1OCAwMDAwMDAgbiAKMDAwMDAwMDIxNSAwMDAwMDAgbiAKMDAwMDAwMDI3NCAwMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgozODMKJSVFT0YK",
      "filename": "itinerary.pdf",
      "contentType": "application/pdf"
    }
  }'
```

**Note**: The base64 string above is a minimal test PDF. In production, the backend generates a full itinerary PDF.

## Troubleshooting

### Issue 1: "PDF data not found in input"

**Error**: Code node throws "PDF data not found in input"

**Solution**:
- Check webhook input structure in n8n execution logs
- Verify backend is sending `pdf.data` field
- Check if payload is in `input.body` or `input` (Code node handles both)

### Issue 2: "The item has no binary field 'itinerary.pdf'"

**Error**: Send Email node can't find binary attachment

**Solution**:
1. Check "Extract & Convert PDF" node OUTPUT → Binary tab
2. Verify binary field name is exactly `itinerary.pdf`
3. In Send Email node, ensure attachment uses:
   - `dataPropertyName: "itinerary.pdf"` (not "Name: itinerary.pdf")
4. Use expression editor (`fx` button) with:
   ```json
   [{"name":"itinerary.pdf","dataPropertyName":"itinerary.pdf"}]
   ```

### Issue 3: Email Not Sending

**Error**: Email node fails or no email received

**Solution**:
- Verify SMTP credentials are correct
- For Gmail: Use App Password (not regular password)
- Check SSL/TLS settings:
  - Port 587: SSL/TLS should be **OFF**
  - Port 465: SSL/TLS should be **ON**
- Verify recipient email is valid
- Check n8n execution logs for detailed error

### Issue 4: Invalid JSON in Response Body

**Error**: "Invalid JSON in 'Response Body' field"

**Solution**:
- In "Respond to Webhook" node, use:
  ```json
  {{ { "success": true, "message": "Itinerary PDF sent successfully" } }}
  ```
- Don't use nested `{{ }}` expressions
- Don't reference `$json.email` (it's not available from Send Email output)

### Issue 5: Webhook Not Triggering

**Error**: Backend gets timeout or connection error

**Solution**:
- Verify webhook URL is correct in backend `.env`
- Check n8n workflow is **ACTIVE** (toggled on)
- Verify webhook path matches: `itinerary-pdf`
- Check n8n instance is accessible from backend
- For Railway deployment: Ensure n8n webhook URL is public

## Workflow Verification Checklist

- [ ] Webhook node configured with correct path
- [ ] Webhook URL copied to backend `.env` as `N8N_WEBHOOK_URL`
- [ ] SMTP credentials configured and tested
- [ ] "Extract & Convert PDF" Code node has correct JavaScript
- [ ] "Send Email" node attachment configured correctly
- [ ] "Respond to Webhook" node response body is valid JSON
- [ ] Workflow is **ACTIVE** (toggled on)
- [ ] Test execution successful
- [ ] Email received with PDF attachment

## Security Considerations

- Validate email addresses in backend before sending
- Use HTTPS for webhook URL
- Rate limit webhook requests (optional)
- Authenticate webhook requests (optional, using webhook authentication)
- Sanitize email content (already handled by backend PDF generation)

## Differences from Previous Workflow

**Old Workflow** (removed):
- Webhook → Format HTML → Generate PDF → Send Email → Respond

**New Workflow** (current):
- Webhook → Extract & Convert PDF → Send Email → Respond

**Key Changes**:
1. Backend now generates PDF (using Puppeteer)
2. PDF sent as base64 in JSON (not multipart/form-data)
3. n8n only extracts data and sends email (no PDF generation)
4. Simpler workflow with fewer nodes

---

**Last Updated**: 2024-01-21  
**Workflow Version**: 2.0 (Simplified)
