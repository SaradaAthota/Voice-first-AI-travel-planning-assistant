# Voice + SSE Production Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: SSE Connection Not Establishing

**Symptoms:**
- `isConnected: false` in frontend
- No transcript updates received
- Console shows "SSE connection closed"

**Diagnosis:**
```bash
# Check backend logs
# Look for: "SSE client connected for session: {sessionId}"

# Check frontend console
# Look for: "SSE connection opened for session: {sessionId}"
```

**Solutions:**

1. **Verify SSE Endpoint is Accessible**
   ```bash
   curl -N https://your-backend-url/api/voice/transcript/test-session-id
   ```
   Expected: Stream of SSE messages

2. **Check CORS Configuration**
   - Verify `FRONTEND_URL` is set correctly in backend
   - Check browser console for CORS errors
   - Ensure `credentials: true` in CORS config

3. **Verify Network/Proxy Settings**
   - Railway: SSE works out of the box
   - Nginx/Proxy: Ensure `X-Accel-Buffering: no` header is set
   - Check for proxy timeouts (should be > 30 seconds)

4. **Check Browser Compatibility**
   - EventSource is supported in all modern browsers
   - IE11 not supported (use polyfill if needed)

**Fix:**
```typescript
// Frontend: Ensure absolute URL in production
const apiBaseUrl = import.meta.env.VITE_API_URL || '';
const eventSource = new EventSource(`${apiBaseUrl}/api/voice/transcript/${sessionId}`);
```

---

### Issue 2: Audio Upload Fails

**Symptoms:**
- "Upload failed: Internal Server Error"
- No transcription received
- Error in browser console

**Diagnosis:**
```bash
# Check backend logs
# Look for: "=== UPLOAD ENDPOINT CALLED ==="
# Check for: "Transcription result:" or error messages
```

**Solutions:**

1. **Verify Audio Format**
   - Check `req.file.mimetype` in logs
   - Should be `audio/webm` or `audio/webm;codecs=opus`
   - If different, MediaRecorder may not support opus

2. **Check File Size**
   - Max size: 10MB (configured in multer)
   - Large files may timeout
   - Consider chunking for very long recordings

3. **Verify OpenAI API Key**
   - Check `OPENAI_API_KEY` is set
   - Verify key is valid and has credits
   - Check API key format: `sk-...`

4. **Check Whisper API Status**
   - Verify OpenAI API is operational
   - Check rate limits (may need to wait)
   - Review API error responses in logs

**Fix:**
```typescript
// Backend: Enhanced error logging
console.error('Voice upload error:', {
  error: transcriptionError.message,
  code: (transcriptionError as any)?.code,
  status: (transcriptionError as any)?.status,
  apiKeyLength: config.openai?.apiKey?.length,
});
```

---

### Issue 3: Transcription Timeout

**Symptoms:**
- Upload succeeds but no transcription
- "Connection timeout" error
- Long delay before error

**Diagnosis:**
```bash
# Check backend logs for:
# "Transcription attempt 1/3..."
# "Transcription failed (attempt X/3), retrying..."
```

**Solutions:**

1. **Increase Timeout (if needed)**
   ```typescript
   // Backend: stt-service.ts
   openai = new OpenAI({ 
     apiKey: config.openai.apiKey,
     timeout: 60000, // Increase to 60 seconds if needed
     maxRetries: 0,
   });
   ```

2. **Check Network Latency**
   - Test OpenAI API directly
   - Verify network path to OpenAI
   - Consider regional API endpoints

3. **Optimize Audio File**
   - Ensure audio is not corrupted
   - Check file size (very large files may timeout)
   - Verify MIME type is correct

4. **Retry Logic**
   - Already implemented: 3 attempts with exponential backoff
   - Check logs to see retry attempts
   - If all retries fail, error is returned

**Fix:**
- Current implementation handles timeouts automatically
- If persistent, check OpenAI API status page
- Consider implementing request queuing for high load

---

### Issue 4: Transcript Not Updating in UI

**Symptoms:**
- SSE connection established
- Backend logs show broadcast
- Frontend transcript state not updating

**Diagnosis:**
```bash
# Check frontend console:
# "SSE message received: {data}"
# "Parsed SSE message: {message}"
# "SSE transcript update: {...}"
```

**Solutions:**

1. **Verify SSE Message Format**
   - Check message structure matches expected format
   - Verify JSON parsing succeeds
   - Check for malformed messages in logs

2. **Check State Updates**
   - Verify `setTranscript()` is called
   - Check React DevTools for state changes
   - Ensure component is re-rendering

3. **Verify Final Transcript Logic**
   - Check `finalTranscriptRef.current` value
   - Ensure non-final updates aren't blocked
   - Verify `isFinal` flag is correct

4. **Check for Race Conditions**
   - Ensure transcript updates are sequential
   - Verify `chunkIndex` ordering
   - Check for duplicate updates

**Fix:**
```typescript
// Frontend: Enhanced logging
console.log('SSE transcript update:', {
  text: update.text.substring(0, 50),
  isFinal: update.isFinal,
  chunkIndex: update.chunkIndex,
  currentIsFinal: isFinal,
  hasFinalTranscript: !!finalTranscriptRef.current,
});
```

---

### Issue 5: SSE Reconnection Fails

**Symptoms:**
- Connection lost message
- Multiple reconnection attempts
- Eventually fails with "Connection failed after multiple attempts"

**Diagnosis:**
```bash
# Check frontend console:
# "SSE connection closed. Reconnecting in Xms (attempt Y/5)..."
# Check backend logs for connection attempts
```

**Solutions:**

1. **Verify Backend is Running**
   ```bash
   curl https://your-backend-url/health
   ```
   Expected: `{"status":"ok","service":"backend"}`

2. **Check Network Stability**
   - Test connection from different networks
   - Verify no firewall blocking SSE
   - Check for intermittent connectivity issues

3. **Verify Session Still Valid**
   - Check session hasn't expired
   - Verify sessionId is correct
   - Check backend session cleanup logic

4. **Increase Reconnection Attempts (if needed)**
   ```typescript
   // Frontend: useSSETranscript.ts
   const maxReconnectAttempts = 10; // Increase if needed
   ```

**Fix:**
- Current implementation: 5 attempts with exponential backoff
- If persistent, check backend availability
- Consider implementing connection health checks

---

### Issue 6: Audio Format Not Supported

**Symptoms:**
- "Failed to create valid File object"
- "Unsupported audio format"
- MediaRecorder fails to start

**Diagnosis:**
```bash
# Check browser console:
# "MediaRecorder started. State: recording, MIME type: audio/webm;codecs=opus"
# Check MediaRecorder.isTypeSupported()
```

**Solutions:**

1. **Verify Browser Support**
   ```javascript
   // Check if codec is supported
   const mimeType = 'audio/webm;codecs=opus';
   if (!MediaRecorder.isTypeSupported(mimeType)) {
     // Fallback to basic webm
     const fallback = 'audio/webm';
     if (MediaRecorder.isTypeSupported(fallback)) {
       mimeType = fallback;
     }
   }
   ```

2. **Check MediaRecorder Options**
   - Ensure `mimeType` is set correctly
   - Verify browser supports the codec
   - Fallback to `audio/webm` if opus not supported

3. **Backend Format Handling**
   - Backend accepts multiple formats
   - Whisper API supports: webm, mp3, wav, m4a, flac
   - Check MIME type mapping in `stt-service.ts`

**Fix:**
```typescript
// Frontend: useVoiceRecorder.ts
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : MediaRecorder.isTypeSupported('audio/webm')
  ? 'audio/webm'
  : ''; // Browser will choose default
```

---

### Issue 7: Multiple Transcript Updates (Duplicates)

**Symptoms:**
- Same transcript appears multiple times
- UI flickers with updates
- Final transcript overwritten

**Solutions:**

1. **Verify Final Transcript Protection**
   ```typescript
   // Frontend: Already implemented
   if (update.isFinal) {
     finalTranscriptRef.current = update.text;
     setTranscript(update.text);
     setIsFinal(true);
   } else if (!finalTranscriptRef.current) {
     // Only update if no final transcript yet
     setTranscript(update.text);
   }
   ```

2. **Check Backend Broadcast Logic**
   - Ensure single broadcast per update
   - Verify `chunkIndex` is unique
   - Check for duplicate uploads

3. **Verify SSE Message Deduplication**
   - Check message IDs if implemented
   - Verify `chunkIndex` ordering
   - Check for race conditions

**Fix:**
- Current implementation prevents overwriting final transcripts
- Non-final updates are only shown if no final transcript exists
- This is expected behavior

---

### Issue 8: Session Not Found

**Symptoms:**
- "No SSE clients connected for session: {sessionId}"
- Transcript updates not received
- Session appears invalid

**Solutions:**

1. **Verify Session Creation**
   ```bash
   # Test session creation
   curl https://your-backend-url/api/voice/session/new
   ```
   Expected: `{"sessionId":"uuid-v4"}`

2. **Check Session Lifecycle**
   - Verify session is created before SSE connection
   - Check session cleanup (1 hour timeout)
   - Ensure sessionId is passed correctly

3. **Verify SSE Connection Timing**
   - SSE should connect after session creation
   - Check for race conditions
   - Verify sessionId matches between requests

**Fix:**
```typescript
// Frontend: Ensure session created before SSE
useEffect(() => {
  const createSession = async () => {
    const response = await fetch(`${API_BASE_URL}/session/new`);
    const data = await response.json();
    setSessionId(data.sessionId); // This triggers SSE connection
  };
  createSession();
}, []);
```

---

## Production Checklist

### Backend (Railway)
- [ ] `CHROMADB_URL` set (if using RAG)
- [ ] `OPENAI_API_KEY` set and valid
- [ ] `BASE_URL` set to Railway URL
- [ ] `FRONTEND_URL` set to Vercel URL
- [ ] CORS configured correctly
- [ ] Health endpoint responding
- [ ] SSE endpoint accessible

### Frontend (Vercel)
- [ ] `VITE_API_URL` set to backend URL
- [ ] SSE connection establishes
- [ ] Audio recording works
- [ ] Transcript updates appear
- [ ] Error handling displays messages

### Testing
- [ ] Record audio → transcription appears
- [ ] Stop recording → final transcript confirmed
- [ ] Network interruption → reconnection works
- [ ] Long recording → no timeout
- [ ] Multiple sessions → no conflicts

---

## Debugging Commands

### Backend Health Check
```bash
curl https://your-backend-url/health
```

### Test SSE Endpoint
```bash
curl -N https://your-backend-url/api/voice/transcript/test-session-id
```

### Test Session Creation
```bash
curl https://your-backend-url/api/voice/session/new
```

### Test Audio Upload (with file)
```bash
curl -X POST https://your-backend-url/api/voice/upload \
  -F "audio=@test-audio.webm" \
  -F "sessionId=test-session-id" \
  -F "chunkIndex=0" \
  -F "isFinal=true"
```

---

## Monitoring

### Key Metrics to Monitor

1. **SSE Connection Rate**
   - Successful connections per minute
   - Failed connection attempts
   - Average connection duration

2. **Transcription Success Rate**
   - Successful transcriptions / Total uploads
   - Average transcription time
   - Error rate by error type

3. **Audio Upload Performance**
   - Average upload time
   - File size distribution
   - Upload success rate

4. **Whisper API Metrics**
   - API call success rate
   - Average response time
   - Retry frequency
   - Rate limit hits

### Log Patterns to Watch

**Success Pattern:**
```
SSE client connected for session: {id}
Audio upload received: {size}
Transcription successful on attempt 1
Broadcasting transcript update
```

**Error Pattern:**
```
SSE error: {error}
Transcription failed (attempt X/3)
Upload failed: {error}
Connection closed
```

---

## Best Practices

1. **Always use absolute URLs in production**
   - `VITE_API_URL` must be set
   - SSE URLs must be absolute

2. **Handle reconnections gracefully**
   - Automatic reconnection implemented
   - User-friendly error messages
   - Don't lose final transcripts

3. **Validate audio before upload**
   - Check file size
   - Verify MIME type
   - Ensure MediaRecorder support

4. **Monitor Whisper API usage**
   - Track API calls
   - Monitor rate limits
   - Implement queuing if needed

5. **Test error scenarios**
   - Network interruptions
   - API failures
   - Invalid audio formats
   - Session expiration

---

**Status**: ✅ Production Ready

**Last Updated**: 2024-01-20

