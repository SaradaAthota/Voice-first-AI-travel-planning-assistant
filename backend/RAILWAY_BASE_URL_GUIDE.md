# 🔗 Finding Your Railway Service URL (BASE_URL)

**Question:** "BASE_URL=https://your-backend-service.up.railway.app - How to know about this URL? What is the exact value?"

---

## 🎯 Quick Answer

**You won't know the exact URL until AFTER Railway deploys your service.**

The URL is generated automatically by Railway and looks like:
```
https://[service-name]-[random-id].up.railway.app
```

**Example:**
```
https://voice-travel-backend-production-abc123.up.railway.app
```

---

## 📍 Where to Find Your Railway URL

### Method 1: After First Deployment (Easiest)

1. **Deploy your service** (even without BASE_URL set initially)
2. **Wait for deployment to complete** (2-3 minutes)
3. **Go to your service page** in Railway dashboard
4. **Look at the top of the page** - you'll see:
   ```
   [Service Name]
   https://your-service-name-abc123.up.railway.app  ← This is your URL!
   ```
5. **Copy this URL** - this is your `BASE_URL`

### Method 2: In Service Settings

1. **Click on your service**
2. **Click "Settings" tab**
3. **Look for "Domains" or "Networking" section**
4. **You'll see:**
   ```
   Railway Domain:
   https://your-service-name-abc123.up.railway.app
   ```

### Method 3: In Service Overview

1. **Click on your service**
2. **Look at the service card/header**
3. **You'll see a URL** next to the service name
4. **Click the copy icon** or copy the URL

---

## 🔄 Two-Step Process

### Step 1: Deploy First (Without BASE_URL)

**Initial Deployment:**
```env
# Don't set BASE_URL yet - deploy first!
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
SUPABASE_URL=https://your-project.supabase.co
# ... other variables
# BASE_URL - Leave this out for now
```

**Why?**
- Railway needs to deploy first to generate the URL
- You can't know the URL until Railway creates it
- The service will start (but some features might not work until BASE_URL is set)

### Step 2: Get URL and Update BASE_URL

**After Deployment:**
1. **Find your Railway URL** (see methods above)
2. **Copy the URL** (e.g., `https://voice-travel-backend-abc123.up.railway.app`)
3. **Go to Variables tab** in Railway
4. **Add or update BASE_URL:**
   ```env
   BASE_URL=https://voice-travel-backend-abc123.up.railway.app
   ```
5. **Save** - Railway will automatically redeploy

---

## 📝 Railway URL Format

### Standard Format

```
https://[service-name]-[random-id].up.railway.app
```

### Examples

**Example 1:**
```
Service Name: voice-travel-backend
Railway URL: https://voice-travel-backend-production-abc123.up.railway.app
BASE_URL: https://voice-travel-backend-production-abc123.up.railway.app
```

**Example 2:**
```
Service Name: backend
Railway URL: https://backend-production-xyz789.up.railway.app
BASE_URL: https://backend-production-xyz789.up.railway.app
```

**Example 3:**
```
Service Name: api
Railway URL: https://api-production-def456.up.railway.app
BASE_URL: https://api-production-def456.up.railway.app
```

### URL Components

- **Protocol:** `https://` (always HTTPS)
- **Service Name:** Based on your service name (or repo name)
- **Random ID:** Railway generates this (e.g., `abc123`, `xyz789`)
- **Domain:** `.up.railway.app` (Railway's domain)

---

## ✅ Complete Example

### Step-by-Step Process

**1. Initial Deployment (Without BASE_URL):**
```env
NODE_ENV=production
FRONTEND_URL=https://my-frontend.vercel.app
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:pass@db.abc123.supabase.co:5432/postgres
OPENAI_API_KEY=sk-...
CHROMADB_URL=https://chromadb.up.railway.app
# BASE_URL - Not set yet
```

**2. Deploy and Wait:**
- Railway builds and deploys
- Takes 2-3 minutes
- Service starts (may have some warnings about BASE_URL)

**3. Find Your URL:**
- Go to service page
- See URL: `https://voice-travel-backend-production-abc123.up.railway.app`
- Copy this URL

**4. Update BASE_URL:**
```env
# Add this to Variables
BASE_URL=https://voice-travel-backend-production-abc123.up.railway.app
```

**5. Railway Auto-Redeploys:**
- Railway detects env var change
- Automatically redeploys
- Now BASE_URL is set correctly

---

## 🎯 What BASE_URL Is Used For

Your backend uses `BASE_URL` for:

1. **Internal API Calls:**
   - When backend needs to call itself (e.g., PDF generation endpoint)
   - Internal service-to-service communication

2. **Health Check Logging:**
   - Shows the full URL in health check response
   - Useful for debugging

3. **Email/PDF Generation:**
   - If using n8n, it needs to know backend URL
   - For generating PDFs and sending emails

**Example from your code:**
```typescript
// backend/src/orchestration/Orchestrator.ts
const baseUrl = config.baseUrl; // Uses BASE_URL env var
const pdfResponse = await fetch(`${baseUrl}/api/itinerary/send-pdf`, {
  // ...
});
```

---

## 🔍 How to Verify BASE_URL Is Correct

### Test 1: Health Check

```bash
curl https://your-service-name-abc123.up.railway.app/health
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

### Test 2: Check Logs

In Railway logs, you should see:
```
Server running on port 3000
Environment: production
Health check: https://your-service-name-abc123.up.railway.app/health
```

If you see `localhost` in logs, BASE_URL is not set correctly.

---

## ⚠️ Common Mistakes

### Mistake 1: Setting BASE_URL Before Deployment

**Wrong:**
```env
# Setting this before knowing the URL
BASE_URL=https://your-backend-service.up.railway.app
```

**Right:**
```env
# Deploy first, then set BASE_URL
# (Leave it out initially, or use placeholder)
```

### Mistake 2: Using Wrong URL Format

**Wrong:**
```env
BASE_URL=http://your-service.up.railway.app  # Missing https://
BASE_URL=https://your-service.up.railway.app/  # Trailing slash
BASE_URL=your-service.up.railway.app  # Missing protocol
```

**Right:**
```env
BASE_URL=https://your-service-name-abc123.up.railway.app
```

### Mistake 3: Not Updating After Deployment

**Problem:**
- Deployed service
- Forgot to set BASE_URL
- Some features don't work (PDF generation, internal API calls)

**Solution:**
- Always update BASE_URL after first deployment
- Railway will auto-redeploy when you add it

---

## 📋 Checklist

- [ ] Deploy service first (without BASE_URL)
- [ ] Wait for deployment to complete
- [ ] Find Railway URL in service page
- [ ] Copy the exact URL
- [ ] Add BASE_URL to environment variables
- [ ] Verify URL format (https://, no trailing slash)
- [ ] Railway auto-redeploys
- [ ] Test health check endpoint
- [ ] Verify logs show correct BASE_URL

---

## 🎯 Summary

**The Exact Value:**
- You won't know it until Railway generates it
- Format: `https://[service-name]-[random-id].up.railway.app`
- Find it in Railway dashboard after deployment

**The Process:**
1. Deploy first (BASE_URL can be missing initially)
2. Get URL from Railway dashboard
3. Add BASE_URL to environment variables
4. Railway auto-redeploys

**Example:**
```
Initial: BASE_URL not set
After deployment: https://voice-travel-backend-production-abc123.up.railway.app
Set: BASE_URL=https://voice-travel-backend-production-abc123.up.railway.app
```

---

**Last Updated:** 2024-01-15  
**Related:** See `backend/RAILWAY_DEPLOYMENT.md` for full deployment guide

