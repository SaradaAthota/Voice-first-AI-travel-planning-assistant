# 🚂 Railway Backend Deployment Guide

**Platform:** Railway  
**Service Type:** Web Service (Node.js)  
**Database:** Supabase PostgreSQL

---

## 📋 Prerequisites

- ✅ Railway account created
- ✅ GitHub repository connected to Railway
- ✅ Supabase project created and database schema deployed
- ✅ All environment variables ready

---

## 🚀 Deployment Steps

### Step 1: Create New Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `Voice-first-AI-travel-planning-assistant`
5. Click **"Deploy Now"**

Railway will automatically create a service for you. The service name will be auto-generated (usually based on your repo name).

### Step 2: Configure Service

Railway will auto-detect Node.js. Configure the service:

1. **Click on your service** (the card showing your deployed service)
2. **Click "Settings" tab** (top navigation bar)
3. **Configure the following:**

   - **Service Name (Optional):** `voice-travel-backend` (or your preferred name)
     - *Note: This is optional. Railway auto-generates a name. You can find/edit it in Settings → Service Name*
   - **Root Directory (REQUIRED):** Set to `backend`
     - *This tells Railway where your backend code is located*
   - **Build Command:** `npm install && npm run build` (usually auto-detected)
   - **Start Command:** `npm start` (usually auto-detected)
   - **Port:** Railway will auto-assign (usually `$PORT` env var)

**Note:** Railway automatically sets `PORT` environment variable. The backend reads this from `process.env.PORT`.

**💡 Can't find Service Name?** It's optional! Railway auto-generates one. Focus on setting **Root Directory** to `backend` - that's what matters most.

### Step 3: Configure Environment Variables

Go to **Variables** tab and add ALL required variables:

#### Required Variables (Production)

```env
# Application
NODE_ENV=production
PORT=3000

# Application URLs (REQUIRED)
# ⚠️ IMPORTANT: BASE_URL will be available AFTER first deployment
#   1. Deploy first (leave BASE_URL empty or use placeholder)
#   2. After deployment, Railway will show your service URL
#   3. Copy that URL and add it as BASE_URL
#   4. Railway will auto-redeploy
BASE_URL=https://your-backend-service.up.railway.app  # ← Get this from Railway after deployment
FRONTEND_URL=https://your-frontend-url.vercel.app

# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-your-openai-key

# ChromaDB Configuration (REQUIRED)
CHROMADB_URL=https://your-chromadb-instance.com

# n8n Configuration (Optional - only if using PDF/Email)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
```

**Important Notes:**
- `BASE_URL`: Will be available after first deployment. Update it after deployment.
- `FRONTEND_URL`: Your frontend's public URL (for CORS)
- `DATABASE_URL`: Get from Supabase → Settings → Database → Connection string
- `CHROMADB_URL`: Your deployed ChromaDB instance URL (NOT localhost)

### Step 4: Deploy

1. Railway will automatically start building
2. Monitor build logs in Railway dashboard
3. Wait for deployment to complete (usually 2-3 minutes)

### Step 5: Get Deployment URL

1. After deployment, Railway will provide a public URL
2. Format: `https://your-service-name.up.railway.app`
3. **Update `BASE_URL` environment variable** with this URL
4. Redeploy (Railway will auto-redeploy when env vars change)

### Step 6: Verify Deployment

1. **Health Check:**
   ```bash
   curl https://your-backend-service.up.railway.app/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "backend",
     "environment": "production",
     "timestamp": "2024-01-15T10:00:00.000Z"
   }
   ```

2. **API Check:**
   ```bash
   curl https://your-backend-service.up.railway.app/api
   ```
   
   Expected response:
   ```json
   {
     "message": "Voice-first AI Travel Planning Assistant API",
     "version": "1.0.0"
   }
   ```

---

## ✅ Railway Deployment Checklist

### Pre-Deployment
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] Supabase database schema deployed (see `supabase/README.md`)
- [ ] All environment variables documented
- [ ] ChromaDB instance deployed and URL available
- [ ] Frontend URL known (for CORS)

### Deployment Configuration
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] All required environment variables set
- [ ] `NODE_ENV=production` set

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `BASE_URL` (update after first deployment)
- [ ] `FRONTEND_URL` (your frontend URL)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `OPENAI_API_KEY`
- [ ] `CHROMADB_URL` (NOT localhost)
- [ ] `N8N_WEBHOOK_URL` (optional)

### Post-Deployment
- [ ] Health check endpoint returns 200
- [ ] Health check response includes `service: "backend"`
- [ ] API endpoint accessible
- [ ] Backend can connect to Supabase
- [ ] Backend can connect to ChromaDB
- [ ] CORS allows frontend origin
- [ ] No errors in Railway logs
- [ ] `BASE_URL` updated with actual Railway URL

---

## 🔍 Verification Steps

### 1. Health Check

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

### 2. Database Connection

Check Railway logs for:
- ✅ "Server running on port 3000"
- ✅ "Environment: production"
- ❌ No "Database URL must be configured" errors
- ❌ No "Supabase URL and anon key must be configured" errors

### 3. CORS Configuration

Test from frontend:
- ✅ Frontend can make API calls
- ❌ No CORS errors in browser console
- ❌ No "Not allowed by CORS" errors

### 4. API Endpoints

Test key endpoints:
```bash
# Health check
curl https://your-backend-service.up.railway.app/health

# API info
curl https://your-backend-service.up.railway.app/api

# Voice session (should return session ID)
curl -X POST https://your-backend-service.up.railway.app/api/voice/session/new
```

---

## 🐛 Troubleshooting

### Issue 1: Build Fails

**Symptoms:**
- Build logs show TypeScript errors
- Build fails with exit code 1

**Solutions:**
- Check TypeScript compilation errors
- Verify all dependencies are in `package.json`
- Check Node.js version (requires 18+)
- Review build logs for specific errors

---

### Issue 2: Application Crashes on Start

**Symptoms:**
- Service starts then immediately crashes
- Logs show "Missing required environment variable"

**Solutions:**
- Verify ALL required environment variables are set
- Check for typos in variable names
- Ensure `NODE_ENV=production` is set
- Review error message for missing variable name

**Required Variables Checklist:**
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `DATABASE_URL`
- ✅ `OPENAI_API_KEY`
- ✅ `CHROMADB_URL`
- ✅ `BASE_URL`
- ✅ `FRONTEND_URL` or `ALLOWED_ORIGINS`

---

### Issue 3: Database Connection Fails

**Symptoms:**
- Logs show "Database URL must be configured"
- Connection timeout errors

**Solutions:**
- Verify `DATABASE_URL` is correct
- Check Supabase connection string format
- Ensure Supabase database is accessible
- Verify SSL settings (production requires SSL)

**DATABASE_URL Format:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

### Issue 4: CORS Errors

**Symptoms:**
- Frontend gets CORS errors
- "Not allowed by CORS" in logs

**Solutions:**
- Verify `FRONTEND_URL` matches your frontend's actual URL
- Check for trailing slashes (should match exactly)
- If using multiple origins, use `ALLOWED_ORIGINS` instead
- Verify CORS configuration in `backend/src/index.ts`

---

### Issue 5: ChromaDB Connection Fails

**Symptoms:**
- Logs show "CHROMADB_URL is required in production"
- RAG functionality not working

**Solutions:**
- Verify `CHROMADB_URL` is set (NOT localhost)
- Ensure ChromaDB instance is deployed and accessible
- Check ChromaDB instance URL is correct
- Verify network connectivity from Railway to ChromaDB

---

### Issue 6: Health Check Returns Wrong Format

**Symptoms:**
- Health check doesn't include `service: "backend"`

**Solution:**
- Verify `backend/src/index.ts` health endpoint returns correct format
- Should include: `status`, `service`, `environment`, `timestamp`

---

## 📝 Railway-Specific Notes

### Port Configuration
- Railway automatically sets `PORT` environment variable
- Backend reads from `process.env.PORT` (defaults to 3000)
- No manual port configuration needed

### Build Process
- Railway uses Nixpacks to detect Node.js
- Builds in `backend/` directory (set Root Directory)
- Runs `npm install && npm run build`
- Starts with `npm start` (runs `node dist/index.js`)

### Environment Variables
- Set in Railway dashboard → Variables tab
- Changes trigger automatic redeployment
- Secrets are encrypted at rest
- Can reference other services' variables

### Logs
- View logs in Railway dashboard
- Real-time log streaming available
- Logs persist for debugging

### Custom Domain
- Railway provides default domain: `*.up.railway.app`
- Can add custom domain in Settings → Networking
- Update `BASE_URL` after adding custom domain

---

## 🔗 Related Documentation

- **Supabase Setup:** See `supabase/README.md`
- **Environment Variables:** See `backend/.env.example` (if exists)
- **Health Check:** See `backend/src/index.ts` (line 50)
- **Database Connection:** See `backend/src/db/supabase.ts`

---

## ✅ Post-Deployment Verification

After deployment, verify:

1. **Health Check:**
   ```bash
   curl https://your-backend-service.up.railway.app/health
   ```
   Should return: `{"status":"ok","service":"backend","environment":"production",...}`

2. **Database Connection:**
   - Check Railway logs for connection errors
   - Verify Supabase tables are accessible

3. **CORS:**
   - Test API call from frontend
   - Verify no CORS errors

4. **Environment Variables:**
   - All required vars set
   - `BASE_URL` updated with actual Railway URL

5. **Service Status:**
   - Service shows "Active" in Railway dashboard
   - No crash loops
   - Logs show successful startup

---

**Last Updated:** 2024-01-15  
**Railway Documentation:** https://docs.railway.app

