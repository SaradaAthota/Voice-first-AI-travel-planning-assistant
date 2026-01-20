# Voice Upload Flow Diagram

## Complete Voice Transcription Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                          │
│  User clicks "Start Recording" button                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              SESSION CREATION                                │
│  GET /api/voice/session/new                                  │
│  → Returns: { sessionId: "uuid-v4" }                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              SSE CONNECTION ESTABLISHED                      │
│  GET /api/voice/transcript/:sessionId                        │
│  → Server-Sent Events stream opened                          │
│  → Headers: Content-Type: text/event-stream                  │
│  → Connection: keep-alive                                    │
│  → X-Accel-Buffering: no (for nginx/proxy)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MEDIA RECORDER SETUP                             │
│  navigator.mediaDevices.getUserMedia({                       │
│    audio: {                                                  │
│      echoCancellation: true,                                 │
│      noiseSuppression: true,                                 │
│      autoGainControl: true                                   │
│    }                                                          │
│  })                                                           │
│  → MediaRecorder created with:                               │
│    mimeType: 'audio/webm;codecs=opus'                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              RECORDING STARTED                                │
│  MediaRecorder.start()                                       │
│  → Interval timer: requestData() every 2 seconds             │
│  → Chunks collected in memory (NOT uploaded yet)            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              USER STOPS RECORDING                            │
│  User clicks "Stop Recording"                                │
│  → MediaRecorder.stop()                                      │
│  → onstop event fires                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              FINAL BLOB CREATION                              │
│  Combine all chunks:                                         │
│  new Blob(chunks, { type: 'audio/webm;codecs=opus' })       │
│  → Single audio file ready for upload                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              AUDIO UPLOAD                                    │
│  POST /api/voice/upload                                      │
│  FormData:                                                   │
│    - audio: Blob (recording.webm)                            │
│    - sessionId: string                                       │
│    - tripId?: string                                         │
│    - chunkIndex: "0"                                         │
│    - isFinal: "true"                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              WHISPER API TRANSCRIPTION                       │
│  OpenAI Whisper API:                                         │
│    - Model: whisper-1                                        │
│    - File: audio.webm (audio/webm;codecs=opus)              │
│    - Language: en                                            │
│    - Retry Logic: 3 attempts with exponential backoff        │
│    - Timeout: 30 seconds (client-level)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              TRANSCRIPTION RESULT                            │
│  {                                                           │
│    text: "I want to visit Jaipur for 2 days next week",     │
│    language: "en"                                            │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              TRANSCRIPT UPDATE CREATED                       │
│  {                                                           │
│    sessionId: "uuid",                                        │
│    tripId?: "uuid",                                          │
│    text: "I want to visit...",                               │
│    isFinal: true,                                            │
│    timestamp: "2024-01-20T...",                              │
│    chunkIndex: 0                                             │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              STORAGE & BROADCAST                             │
│  1. Append to in-memory session                              │
│  2. Persist to Supabase (if tripId provided)                │
│  3. Broadcast via SSE to all connected clients               │
│     → SSE Message: {                                         │
│         type: 'transcript',                                  │
│         data: TranscriptUpdate                               │
│       }                                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              SSE CLIENT RECEIVES UPDATE                      │
│  Frontend EventSource.onmessage                              │
│  → Parse JSON message                                        │
│  → Update transcript state                                   │
│  → Mark as final if isFinal: true                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              SESSION COMPLETION                               │
│  POST /api/voice/complete                                    │
│  { sessionId: "uuid" }                                       │
│  → Send completion message via SSE                           │
│  → Close SSE connection after delay                          │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                            │
└─────────────────────────────────────────────────────────────┘

Scenario 1: Whisper API Failure
┌─────────────────────────────────────────────────────────────┐
│  Error: Network timeout / API error                          │
│  → Retry Logic:                                              │
│    1. Attempt 1: Immediate                                   │
│    2. Attempt 2: After 1s (exponential backoff)             │
│    3. Attempt 3: After 2s                                    │
│  → If all retries fail:                                      │
│    → Send error via SSE: { type: 'error', data: {...} }     │
│    → Return 500 to upload endpoint                           │
│    → Frontend displays error message                         │
└─────────────────────────────────────────────────────────────┘

Scenario 2: SSE Connection Lost
┌─────────────────────────────────────────────────────────────┐
│  EventSource.readyState === CLOSED                           │
│  → Automatic Reconnection:                                   │
│    1. Attempt 1: After 1s                                    │
│    2. Attempt 2: After 2s (exponential backoff)             │
│    3. Attempt 3: After 4s                                    │
│    4. Attempt 4: After 8s                                    │
│    5. Attempt 5: After 16s                                   │
│  → If max attempts exceeded:                                 │
│    → Display error: "Connection failed. Please refresh."    │
│  → If reconnection succeeds:                                 │
│    → Resume receiving transcript updates                     │
└─────────────────────────────────────────────────────────────┘

Scenario 3: Audio Upload Failure
┌─────────────────────────────────────────────────────────────┐
│  Network error / Server error                                │
│  → Frontend:                                                 │
│    → Display error message                                   │
│    → Allow user to retry                                     │
│  → Backend:                                                  │
│    → Log error                                               │
│    → Return 500 with error details                           │
└─────────────────────────────────────────────────────────────┘

Scenario 4: Invalid Audio Format
┌─────────────────────────────────────────────────────────────┐
│  Unsupported MIME type                                       │
│  → Backend validation:                                       │
│    → Check file.mimetype.startsWith('audio/')                │
│    → Return 400 if invalid                                  │
│  → Frontend:                                                 │
│    → Use 'audio/webm;codecs=opus' (browser-supported)       │
│    → Fallback handling if MediaRecorder fails                │
└─────────────────────────────────────────────────────────────┘
```

## SSE Message Types

### 1. Transcript Update
```json
{
  "type": "transcript",
  "data": {
    "sessionId": "uuid",
    "tripId": "uuid",
    "text": "I want to visit Jaipur...",
    "isFinal": true,
    "timestamp": "2024-01-20T10:00:00.000Z",
    "chunkIndex": 0
  }
}
```

### 2. Error Message
```json
{
  "type": "error",
  "data": {
    "error": "Transcription failed: Connection timeout"
  }
}
```

### 3. Completion Message
```json
{
  "type": "complete",
  "data": {
    "complete": true
  }
}
```

## Production Considerations

### Railway Deployment
- ✅ SSE works with Railway's HTTP/2 support
- ✅ No special configuration needed
- ✅ Connection keep-alive handled automatically

### Vercel Deployment (Frontend)
- ✅ EventSource API supported in all modern browsers
- ✅ Works with Vercel's edge network
- ✅ No WebSocket required (SSE only)

### Network Resilience
- ✅ Automatic reconnection on connection loss
- ✅ Exponential backoff prevents server overload
- ✅ Graceful degradation if SSE unavailable

### Performance
- ✅ Non-blocking: All operations async/await
- ✅ Chunk collection in memory (efficient)
- ✅ Single upload at end (reduces network calls)
- ✅ SSE keeps connection open (low overhead)

---

**Status**: ✅ Production Ready

**Last Updated**: 2024-01-20

