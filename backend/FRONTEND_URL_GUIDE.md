# 🌐 Frontend URL Guide (FRONTEND_URL)

**Question:** "What is my frontend_url?"

---

## 🎯 Quick Answer

**Your `FRONTEND_URL` depends on where you deploy your frontend.**

Common platforms:
- **Vercel:** `https://your-app-name.vercel.app`
- **Netlify:** `https://your-app-name.netlify.app`
- **Railway:** `https://your-frontend-service.up.railway.app`
- **Custom Domain:** `https://yourdomain.com`

**You won't know the exact URL until you deploy the frontend.**

---

## 📍 What is FRONTEND_URL Used For?

`FRONTEND_URL` is used by your **backend** for:

1. **CORS (Cross-Origin Resource Sharing):**
   - Allows your frontend to make API calls to the backend
   - Backend only accepts requests from this URL
   - Security feature to prevent unauthorized access

2. **Backend Configuration:**
   - Backend uses this to configure CORS headers
   - Without it, frontend requests will be blocked

**From your backend code:**
```typescript
// backend/src/index.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL]  // ← Uses FRONTEND_URL for CORS
    : config.env === 'production' 
      ? [] // No default in production
      : ['http://localhost:5173']; // Development default
```

---

## 🚀 Where Will You Deploy Frontend?

### Option 1: Vercel (Recommended - Easiest)

**URL Format:**
```
https://your-app-name.vercel.app
```

**How to Deploy:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Deploy
6. Vercel will give you a URL like: `https://voice-travel-assistant.vercel.app`

**Your FRONTEND_URL:**
```env
FRONTEND_URL=https://voice-travel-assistant.vercel.app
```

---

### Option 2: Netlify

**URL Format:**
```
https://your-app-name.netlify.app
```

**How to Deploy:**
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Set **Base directory** to `frontend`
5. Build command: `npm run build`
6. Publish directory: `frontend/dist`
7. Deploy
8. Netlify will give you a URL like: `https://voice-travel-assistant.netlify.app`

**Your FRONTEND_URL:**
```env
FRONTEND_URL=https://voice-travel-assistant.netlify.app
```

---

### Option 3: Railway

**URL Format:**
```
https://your-frontend-service.up.railway.app
```

**How to Deploy:**
1. In Railway, add a new service
2. Deploy from GitHub
3. Set **Root Directory** to `frontend`
4. Railway will generate a URL like: `https://voice-travel-frontend-production-abc123.up.railway.app`

**Your FRONTEND_URL:**
```env
FRONTEND_URL=https://voice-travel-frontend-production-abc123.up.railway.app
```

---

### Option 4: Custom Domain

**URL Format:**
```
https://yourdomain.com
https://www.yourdomain.com
```

**Your FRONTEND_URL:**
```env
FRONTEND_URL=https://yourdomain.com
# OR
FRONTEND_URL=https://www.yourdomain.com
```

---

## 🔄 Two-Step Process

### Step 1: Deploy Frontend First

1. **Deploy your frontend** to Vercel/Netlify/Railway
2. **Wait for deployment** to complete
3. **Get the URL** from the deployment platform

### Step 2: Set FRONTEND_URL in Backend

1. **Go to Railway** (where your backend is deployed)
2. **Go to Variables tab**
3. **Add FRONTEND_URL:**
   ```env
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```
4. **Save** - Railway will auto-redeploy

---

## 📝 Complete Example

### Scenario: Deploying to Vercel

**1. Deploy Frontend to Vercel:**
- Repository: `Voice-first-AI-travel-planning-assistant`
- Root Directory: `frontend`
- Vercel gives you: `https://voice-travel-assistant.vercel.app`

**2. Set FRONTEND_URL in Backend (Railway):**
```env
FRONTEND_URL=https://voice-travel-assistant.vercel.app
```

**3. Backend CORS Configuration:**
- Backend now accepts requests from `https://voice-travel-assistant.vercel.app`
- Frontend can make API calls successfully ✅

---

## 🎯 For Development (Local Testing)

**If testing locally:**

```env
# Backend running on: http://localhost:3000
# Frontend running on: http://localhost:5173

FRONTEND_URL=http://localhost:5173
```

**Note:** In development, backend allows `localhost:5173` by default, but it's good to set it explicitly.

---

## ⚠️ Important Notes

### 1. Exact URL Match Required

**Wrong:**
```env
FRONTEND_URL=https://voice-travel-assistant.vercel.app/  # Trailing slash
FRONTEND_URL=http://voice-travel-assistant.vercel.app    # Wrong protocol
FRONTEND_URL=voice-travel-assistant.vercel.app           # Missing protocol
```

**Right:**
```env
FRONTEND_URL=https://voice-travel-assistant.vercel.app
```

### 2. Multiple Frontend Domains

If you have multiple frontend domains (e.g., `www` and non-`www`), use `ALLOWED_ORIGINS` instead:

```env
# Instead of FRONTEND_URL, use:
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3. Custom Domain

If you add a custom domain to Vercel/Netlify:

```env
# Use your custom domain
FRONTEND_URL=https://yourdomain.com
```

---

## 🔍 How to Find Your Frontend URL

### After Deploying to Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. You'll see the URL at the top:
   ```
   voice-travel-assistant
   https://voice-travel-assistant.vercel.app  ← This is your FRONTEND_URL
   ```

### After Deploying to Netlify:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click on your site
3. You'll see the URL:
   ```
   Site name: voice-travel-assistant
   URL: https://voice-travel-assistant.netlify.app  ← This is your FRONTEND_URL
   ```

### After Deploying to Railway:

1. Go to Railway dashboard
2. Click on your frontend service
3. You'll see the URL at the top:
   ```
   [Service Name]
   https://voice-travel-frontend-production-abc123.up.railway.app  ← This is your FRONTEND_URL
   ```

---

## ✅ Checklist

- [ ] Frontend deployed to Vercel/Netlify/Railway
- [ ] Got the frontend URL from deployment platform
- [ ] Copied the exact URL (with `https://`, no trailing slash)
- [ ] Added `FRONTEND_URL` to backend environment variables
- [ ] Backend redeployed with new FRONTEND_URL
- [ ] Tested API call from frontend (should work without CORS errors)

---

## 🐛 Troubleshooting

### Issue: CORS Errors

**Symptoms:**
- Frontend gets CORS errors when calling backend API
- Browser console shows: "Access to fetch at '...' has been blocked by CORS policy"

**Solutions:**
1. **Verify FRONTEND_URL is set correctly:**
   - Check for typos
   - Ensure it matches frontend's exact URL
   - No trailing slash

2. **Check backend logs:**
   - Look for "CORS: Blocked request from origin" messages
   - Verify allowed origins include your frontend URL

3. **Test with curl:**
   ```bash
   curl -H "Origin: https://your-frontend.vercel.app" \
        https://your-backend.up.railway.app/api
   ```

---

## 📋 Summary

**Your FRONTEND_URL:**
- Depends on where you deploy (Vercel, Netlify, Railway, etc.)
- Format: `https://your-app-name.[platform].app`
- Get it from your deployment platform after deploying
- Set it in backend environment variables for CORS

**Common Examples:**
- Vercel: `https://voice-travel-assistant.vercel.app`
- Netlify: `https://voice-travel-assistant.netlify.app`
- Railway: `https://voice-travel-frontend-production-abc123.up.railway.app`

**Next Steps:**
1. Deploy frontend to your chosen platform
2. Get the URL from the platform
3. Set `FRONTEND_URL` in backend environment variables
4. Backend will automatically allow requests from that URL

---

**Last Updated:** 2024-01-15  
**Related:** See `README.md` for frontend deployment guide

