# 🛠️ Deployment Fixes Checklist

**Quick reference for fixing deployment blockers**

---

## 🔴 Critical Fixes (Must Do Before Deployment)

### ✅ Fix #1: Frontend Environment Variables
**Files:** 
- `frontend/src/App.tsx` (line 15)
- `frontend/src/services/api.ts` (line 7)
- `frontend/src/hooks/useVoiceRecorder.ts` (line 9)
- `frontend/src/hooks/useSSETranscript.ts` (line 45)

**Change:**
```typescript
// FROM:
const API_BASE_URL = '/api/voice';

// TO:
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/voice` 
  : '/api/voice';
```

---

### ✅ Fix #2: Backend CORS Configuration
**Files:**
- `backend/src/index.ts` (line 16)
- `backend/.env.example` (add new vars)

**Change:**
```typescript
// FROM:
app.use(cors());

// TO:
app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Add to `.env.example`:**
```
FRONTEND_URL=https://your-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,https://your-alt-domain.com
```

---

### ✅ Fix #3: Orchestrator BASE_URL
**Files:**
- `backend/src/orchestration/Orchestrator.ts` (line 243)

**Change:**
```typescript
// FROM:
const baseUrl = process.env.BASE_URL || `http://localhost:${config.port}`;

// TO:
const baseUrl = process.env.BASE_URL;
if (!baseUrl) {
  throw new Error('BASE_URL environment variable is required in production');
}
```

---

### ✅ Fix #4: ChromaDB Configuration
**Files:**
- `backend/src/config/env.ts` (lines 62-65, add validation)
- `backend/src/rag/chromadb-client.ts` (line 25)

**Change in `env.ts`:**
```typescript
// FROM:
chromadb: {
  url: process.env.CHROMADB_URL || 'http://localhost:8000',
},

// TO:
chromadb: {
  url: process.env.CHROMADB_URL || (config.env === 'production' ? undefined : 'http://localhost:8000'),
},

// Add after config definition:
if (config.env === 'production' && !config.chromadb.url) {
  throw new Error('CHROMADB_URL is required in production');
}
```

**Change in `chromadb-client.ts`:**
```typescript
// FROM:
const chromaUrl = process.env.CHROMADB_URL || 'http://localhost:8000';

// TO:
const chromaUrl = process.env.CHROMADB_URL;
if (!chromaUrl) {
  throw new Error('CHROMADB_URL environment variable is required');
}
```

---

### ✅ Fix #5: n8n Workflow
**Files:**
- `n8n/workflow-itinerary-pdf-email.json` (line 31)
- `README.md` (add n8n env var section)

**Change in workflow JSON:**
```json
// FROM:
"url": "={{ $env.BACKEND_URL || 'http://localhost:3000' }}/api/pdf/generate-pdf"

// TO:
"url": "={{ $env.BACKEND_URL }}/api/pdf/generate-pdf"
```

**Add to README.md (Step 4, n8n configuration):**
```markdown
5. **Environment Variables in n8n**
   - Go to n8n Settings → Environment Variables
   - Add `BACKEND_URL` with your backend URL: `https://your-backend-url.onrender.com`
   - **IMPORTANT:** This is REQUIRED - workflow will fail without it
```

---

### ✅ Fix #6: SSE Connection
**Files:**
- `frontend/src/hooks/useSSETranscript.ts` (line 45)

**Change:**
```typescript
// FROM:
const eventSource = new EventSource(`/api/voice/transcript/${sessionId}`);

// TO:
const apiBaseUrl = import.meta.env.VITE_API_URL || '';
const eventSource = new EventSource(`${apiBaseUrl}/api/voice/transcript/${sessionId}`);
```

---

### ✅ Fix #7: Health Check Log
**Files:**
- `backend/src/index.ts` (line 79)

**Change:**
```typescript
// FROM:
console.log(`Health check: http://localhost:${config.port}/health`);

// TO:
const healthUrl = process.env.BASE_URL 
  ? `${process.env.BASE_URL}/health` 
  : `http://localhost:${config.port}/health`;
console.log(`Health check: ${healthUrl}`);
```

---

### ✅ Fix #8: Update .env.example
**Files:**
- `backend/.env.example`

**Add:**
```env
# Application URLs
BASE_URL=https://your-backend-url.onrender.com
FRONTEND_URL=https://your-frontend-url.vercel.app
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
```

---

### ✅ Fix #9: Update README
**Files:**
- `README.md`

**Add/Update:**
1. **Before Step 1 (Deploy Backend)**, add:
   ```markdown
   ### Step 0: Supabase Database Setup (REQUIRED)
   
   ⚠️ **IMPORTANT:** You MUST set up the database BEFORE deploying the backend!
   
   1. Go to your Supabase project dashboard
   2. Navigate to **SQL Editor**
   3. Create new query
   4. Copy contents from `backend/migrations/001_initial_schema.sql`
   5. Click **"Run"** to execute
   6. Verify tables exist in **Table Editor**:
      - `trips`
      - `itineraries`
      - `transcripts`
      - `eval_results`
      - `mcp_logs`
   
   **Without this step, the backend will fail with "table not found" errors!**
   ```

2. **In Step 3 (Environment Variables)**, emphasize:
   ```markdown
   ⚠️ **REQUIRED in Production:**
   - `BASE_URL` - Your backend's public URL (e.g., `https://voice-travel-backend.onrender.com`)
   - `FRONTEND_URL` - Your frontend's public URL (for CORS)
   - `CHROMADB_URL` - Your ChromaDB instance URL (NOT localhost)
   ```

3. **In Step 4 (n8n)**, add:
   ```markdown
   **Environment Variables in n8n:**
   - Go to n8n Settings → Environment Variables
   - Add `BACKEND_URL` = `https://your-backend-url.onrender.com`
   - This is REQUIRED - workflow will fail without it
   ```

---

## ✅ Verification Steps

After making all fixes:

1. **Test Locally with Production-Like Config:**
   ```bash
   # Backend
   export NODE_ENV=production
   export BASE_URL=http://localhost:3000
   export FRONTEND_URL=http://localhost:5173
   export CHROMADB_URL=http://localhost:8000
   npm run dev
   
   # Frontend
   export VITE_API_URL=http://localhost:3000
   npm run dev
   ```

2. **Verify:**
   - [ ] Frontend can connect to backend
   - [ ] SSE connection works
   - [ ] Voice recording works
   - [ ] API calls use correct URLs
   - [ ] No localhost references in production code paths
   - [ ] CORS allows frontend origin
   - [ ] Health check shows correct URL

3. **Check Logs:**
   - [ ] No "localhost" in production logs
   - [ ] No CORS errors
   - [ ] No "missing environment variable" errors

---

## 📋 Pre-Deployment Checklist

- [ ] All 9 fixes applied
- [ ] Code tested locally with production-like config
- [ ] Environment variables documented
- [ ] README updated
- [ ] Database migration run on Supabase
- [ ] All environment variables set in deployment platform
- [ ] n8n workflow configured with BACKEND_URL
- [ ] ChromaDB deployed and URL configured
- [ ] CORS allows frontend origin
- [ ] Health check endpoint works

---

**Status:** Ready to deploy after all fixes are applied ✅

