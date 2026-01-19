# Troubleshooting Guide

Common issues and fixes for the Voice-first AI Travel Planning Assistant.

## Backend Issues

### Database Connection Errors

**Error**: `Connection refused` or `ECONNREFUSED`

**Fixes**:
1. Verify `DATABASE_URL` is correct
2. Check Supabase connection pooling settings
3. Ensure database is accessible (not paused)
4. Verify network connectivity

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### ChromaDB Connection Errors

**Error**: `Failed to connect to ChromaDB`

**Fixes**:
1. Verify ChromaDB is running: `docker ps`
2. Check `CHROMADB_URL` environment variable
3. Ensure ChromaDB container is healthy
4. Check network connectivity

```bash
# Test ChromaDB
curl http://localhost:8000/api/v1/heartbeat
```

### OpenAI API Errors

**Error**: `Invalid API key` or `Rate limit exceeded`

**Fixes**:
1. Verify `OPENAI_API_KEY` is set correctly
2. Check API key has sufficient credits
3. Implement rate limiting/retry logic
4. Check API usage limits

### MCP Tool Execution Errors

**Error**: `Tool execution failed`

**Fixes**:
1. Check tool input validation
2. Verify external API availability (Overpass API)
3. Check tool logs in `mcp_logs` table
4. Verify network connectivity

## Frontend Issues

### Voice Recording Not Working

**Error**: `Microphone access denied` or `MediaRecorder not supported`

**Fixes**:
1. Check browser permissions for microphone
2. Use HTTPS (required for MediaRecorder)
3. Verify browser compatibility
4. Check MediaRecorder API support

```javascript
// Check support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('MediaRecorder not supported');
}
```

### SSE Connection Errors

**Error**: `EventSource failed` or `Connection closed`

**Fixes**:
1. Verify backend URL is correct
2. Check CORS configuration
3. Ensure SSE endpoint is accessible
4. Check network connectivity

```bash
# Test SSE endpoint
curl -N http://localhost:3000/api/voice/transcript/test-session-id
```

### Itinerary Not Loading

**Error**: `Failed to fetch itinerary` or `404 Not Found`

**Fixes**:
1. Verify `tripId` is valid
2. Check backend API endpoint
3. Verify CORS configuration
4. Check network requests in browser console

## Orchestration Issues

### State Transition Errors

**Error**: `Invalid state transition`

**Fixes**:
1. Check state machine rules
2. Verify state persistence
3. Check database state
4. Review state transition logic

### Intent Classification Errors

**Error**: `Failed to classify intent`

**Fixes**:
1. Check OpenAI API key
2. Verify LLM model availability
3. Check input message format
4. Review intent router logs

### Tool Orchestration Errors

**Error**: `Tool call failed` or `Tool not found`

**Fixes**:
1. Verify tool is registered
2. Check tool input format
3. Review tool execution logs
4. Verify tool dependencies

## Evaluation Issues

### Feasibility Eval Failing

**Error**: `Feasibility check failed`

**Fixes**:
1. Check itinerary duration calculations
2. Verify pace configuration
3. Review travel time calculations
4. Check day structure

### Edit Correctness Eval Failing

**Error**: `Edit correctness check failed`

**Fixes**:
1. Verify diff checker logic
2. Check edit target specification
3. Review unchanged days
4. Check version tracking

### Grounding Eval Failing

**Error**: `Grounding check failed`

**Fixes**:
1. Verify POI OSM IDs exist
2. Check citation format
3. Review RAG retrieval
4. Check missing data handling

## RAG Issues

### Embedding Generation Errors

**Error**: `Failed to generate embeddings`

**Fixes**:
1. Check OpenAI API key
2. Verify embedding model availability
3. Check input text format
4. Review API rate limits

### ChromaDB Retrieval Errors

**Error**: `Failed to retrieve from ChromaDB`

**Fixes**:
1. Verify ChromaDB connection
2. Check collection exists
3. Verify embeddings are stored
4. Check similarity threshold

### Missing RAG Data

**Error**: `No RAG data available`

**Fixes**:
1. Run ingestion script: `npm run ingest`
2. Verify city pages exist
3. Check chunking logic
4. Review embedding storage

## n8n Workflow Issues

### Webhook Not Triggering

**Error**: `Webhook not received`

**Fixes**:
1. Verify webhook URL is correct
2. Check n8n workflow is active
3. Verify POST request format
4. Check n8n logs

### PDF Generation Failing

**Error**: `PDF generation failed`

**Fixes**:
1. Check HTML formatting
2. Verify PDF node is installed
3. Check node memory limits
4. Review HTML template

### Email Not Sending

**Error**: `Email send failed`

**Fixes**:
1. Verify SMTP credentials
2. Check email server settings
3. Verify recipient email
4. Check email service limits

## Deployment Issues

### Build Failures

**Error**: `Build failed` or `TypeScript errors`

**Fixes**:
1. Check TypeScript configuration
2. Verify all dependencies installed
3. Check for type errors
4. Review build logs

```bash
# Local build test
npm run build
```

### Environment Variable Issues

**Error**: `Missing environment variable`

**Fixes**:
1. Verify all required variables set
2. Check variable names (case-sensitive)
3. Verify variable values
4. Review environment setup

### CORS Errors

**Error**: `CORS policy blocked`

**Fixes**:
1. Configure CORS in backend
2. Add frontend URL to allowed origins
3. Check preflight requests
4. Verify CORS headers

```typescript
// Backend CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Performance Issues

### Slow API Responses

**Fixes**:
1. Check database query performance
2. Review LLM API calls
3. Implement caching
4. Check network latency
5. Review tool execution time

### High Memory Usage

**Fixes**:
1. Check for memory leaks
2. Review large data structures
3. Implement pagination
4. Check ChromaDB memory usage
5. Review Docker container limits

### Slow Frontend Loading

**Fixes**:
1. Check bundle size
2. Implement code splitting
3. Review image optimization
4. Check API response times
5. Review network requests

## Database Issues

### Migration Errors

**Error**: `Migration failed`

**Fixes**:
1. Check migration SQL syntax
2. Verify database permissions
3. Check for existing tables
4. Review migration order

```bash
# Run migrations
npm run migrate
```

### Query Timeouts

**Error**: `Query timeout`

**Fixes**:
1. Add database indexes
2. Optimize queries
3. Check connection pooling
4. Review query complexity

### Connection Pool Exhausted

**Error**: `Too many connections`

**Fixes**:
1. Increase connection pool size
2. Close unused connections
3. Check for connection leaks
4. Review connection pooling config

## Quick Fixes

### Restart Services

```bash
# Backend
pm2 restart backend

# ChromaDB
docker restart chromadb

# Frontend (Vercel auto-restarts)
```

### Clear Caches

```bash
# Node modules
rm -rf node_modules package-lock.json
npm install

# Docker
docker system prune -a
```

### Check Logs

```bash
# Backend logs
tail -f logs/app.log

# Docker logs
docker logs chromadb

# n8n logs (Railway)
railway logs
```

## Getting Help

1. Check logs for error messages
2. Review error stack traces
3. Check environment variables
4. Verify service health
5. Review documentation
6. Check GitHub issues

## Common Error Codes

- `ECONNREFUSED`: Connection refused (service not running)
- `ETIMEDOUT`: Connection timeout (network/firewall)
- `ENOTFOUND`: DNS resolution failed (wrong URL)
- `401`: Unauthorized (API key invalid)
- `403`: Forbidden (permissions issue)
- `404`: Not found (wrong endpoint)
- `500`: Internal server error (check logs)
- `503`: Service unavailable (service down)

