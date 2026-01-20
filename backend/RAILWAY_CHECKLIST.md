# ✅ Railway Backend Deployment Checklist

**Platform:** Railway  
**Service:** Node.js Backend  
**Status:** Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### Prerequisites
- [ ] Railway account created
- [ ] GitHub repository connected to Railway
- [ ] Supabase project created
- [ ] Supabase database schema deployed (see `supabase/README.md`)
- [ ] ChromaDB instance deployed and URL available
- [ ] Frontend URL known (for CORS configuration)
- [ ] All API keys ready (OpenAI, Supabase, etc.)

---

## 🔧 Configuration Checklist

### Railway Service Configuration
- [ ] Root Directory set to `backend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Port: Auto-assigned by Railway (uses `$PORT`)

### Environment Variables (All Required in Production)

#### Application Configuration
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (Railway auto-sets, but good to specify)
- [ ] `BASE_URL=https://your-backend-service.up.railway.app` (update after deployment)

#### Frontend Configuration (for CORS)
- [ ] `FRONTEND_URL=https://your-frontend-url.vercel.app`
- [ ] OR `ALLOWED_ORIGINS=https://frontend1.com,https://frontend2.com` (if multiple)

#### Supabase Configuration
- [ ] `SUPABASE_URL=https://your-project.supabase.co`
- [ ] `SUPABASE_ANON_KEY=your-anon-key`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- [ ] `DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres`

#### External Services
- [ ] `OPENAI_API_KEY=sk-your-openai-key`
- [ ] `CHROMADB_URL=https://your-chromadb-instance.com` (NOT localhost!)
- [ ] `N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf` (optional)

---

## ✅ Code Verification Checklist

### Database Connection
- [x] ✅ No SQLite references (verified - only PostgreSQL)
- [x] ✅ Uses `DATABASE_URL` for PostgreSQL connection
- [x] ✅ Uses `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Supabase client
- [x] ✅ SSL enabled for production database connections

### Environment Variable Validation
- [x] ✅ `DATABASE_URL` validated in production
- [x] ✅ `SUPABASE_URL` validated in production
- [x] ✅ `SUPABASE_ANON_KEY` validated in production
- [x] ✅ `SUPABASE_SERVICE_ROLE_KEY` optional (for admin operations)
- [x] ✅ `BASE_URL` validated in production
- [x] ✅ `FRONTEND_URL` or `ALLOWED_ORIGINS` validated for CORS
- [x] ✅ `CHROMADB_URL` validated in production
- [x] ✅ Fail-fast error messages for missing variables

### Health Endpoint
- [x] ✅ Returns `status: "ok"`
- [x] ✅ Returns `service: "backend"`
- [x] ✅ Returns `environment: "production"`
- [x] ✅ Returns `timestamp` (ISO format)

### CORS Configuration
- [x] ✅ Restricted to `FRONTEND_URL` or `ALLOWED_ORIGINS` in production
- [x] ✅ No default origins in production (must be explicitly set)
- [x] ✅ Credentials enabled
- [x] ✅ Proper methods and headers configured

### No Localhost References
- [x] ✅ No hardcoded localhost in production code paths
- [x] ✅ All URLs use environment variables
- [x] ✅ Development fallbacks only in development mode

---

## 🚀 Deployment Steps

1. [ ] Create Railway project from GitHub
2. [ ] Set root directory to `backend`
3. [ ] Add all environment variables
4. [ ] Deploy (Railway auto-deploys)
5. [ ] Get deployment URL from Railway
6. [ ] Update `BASE_URL` with actual Railway URL
7. [ ] Verify health check endpoint
8. [ ] Test API endpoints
9. [ ] Verify database connection
10. [ ] Verify CORS works from frontend

---

## 🔍 Post-Deployment Verification

### Health Check
```bash
curl https://your-backend-service.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "backend",
  "environment": "production",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### API Endpoint
```bash
curl https://your-backend-service.up.railway.app/api
```

**Expected Response:**
```json
{
  "message": "Voice-first AI Travel Planning Assistant API",
  "version": "1.0.0"
}
```

### Database Connection
- [ ] Check Railway logs for connection errors
- [ ] Verify no "Database URL must be configured" errors
- [ ] Verify no "Supabase URL and anon key must be configured" errors

### CORS
- [ ] Test API call from frontend
- [ ] Verify no CORS errors in browser console
- [ ] Verify backend logs show allowed origins

---

## 🐛 Common Issues & Solutions

### Build Fails
- **Check:** TypeScript compilation errors
- **Check:** Node.js version (requires 18+)
- **Check:** All dependencies in package.json

### Application Crashes
- **Check:** All required environment variables set
- **Check:** No typos in variable names
- **Check:** `NODE_ENV=production` is set

### Database Connection Fails
- **Check:** `DATABASE_URL` format is correct
- **Check:** Supabase database is accessible
- **Check:** SSL settings (production requires SSL)

### CORS Errors
- **Check:** `FRONTEND_URL` matches frontend's actual URL exactly
- **Check:** No trailing slashes mismatch
- **Check:** CORS configuration in `backend/src/index.ts`

---

## 📝 Notes

- Railway automatically sets `PORT` environment variable
- Backend reads from `process.env.PORT` (defaults to 3000)
- Changes to environment variables trigger automatic redeployment
- Logs are available in Railway dashboard
- Custom domains can be added in Settings → Networking

---

**Status:** ✅ **READY FOR DEPLOYMENT**

