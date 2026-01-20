# Frontend Deployment Guide - Vercel

## Overview

This guide covers deploying the Voice-first AI Travel Planning Assistant frontend to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Frontend code in GitHub
3. **Backend Deployed**: Railway backend URL available
4. **Node.js**: v18+ (Vercel auto-detects)

## Step 1: Prepare Frontend for Production

### Verify Environment Variables

All API calls use `VITE_API_URL`:
- ✅ `App.tsx` - Voice API and Chat API
- ✅ `useVoiceRecorder.ts` - Audio upload
- ✅ `useSSETranscript.ts` - SSE connection
- ✅ `api.ts` - Itinerary API
- ✅ `ItineraryDisplay.tsx` - PDF email

**No hardcoded URLs** - All use `import.meta.env.VITE_API_URL`

### Verify Components

All required components are implemented:
- ✅ `MicButton` - Voice recording button
- ✅ `TranscriptDisplay` - Live transcript display
- ✅ `ItineraryDisplay` - Day-wise itinerary UI
- ✅ `SourcesSection` - Citations panel

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **Add New Project**

2. **Import Repository**
   - Select your GitHub repository
   - Choose the repository containing the frontend
   - Vercel will auto-detect it's a Vite project

3. **Configure Project**
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `frontend` (if monorepo) or `.` (if standalone)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default for Vite)
   - **Install Command**: `npm install` (default)

4. **Set Environment Variables**
   - Click **Environment Variables**
   - Add:
     ```
     VITE_API_URL=https://your-backend.up.railway.app
     ```
   - **⚠️ IMPORTANT**: No trailing slash
   - Select **Production**, **Preview**, and **Development**

5. **Deploy**
   - Click **Deploy**
   - Wait for build to complete
   - Note your deployment URL (e.g., `https://your-app.vercel.app`)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```

5. **Set Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   # Enter: https://your-backend.up.railway.app
   # Select: Production, Preview, Development
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL (Railway) | `https://your-backend.up.railway.app` |

### Setting in Vercel Dashboard

1. Go to **Project Settings** → **Environment Variables**
2. Add `VITE_API_URL`
3. Value: Your Railway backend URL (no trailing slash)
4. Select all environments: **Production**, **Preview**, **Development**
5. Click **Save**

### Setting via CLI

```bash
vercel env add VITE_API_URL production
# Enter: https://your-backend.up.railway.app
```

## Step 4: Verify Deployment

### Check Build Logs

1. Go to **Deployments** in Vercel
2. Click on latest deployment
3. Check **Build Logs** for errors
4. Verify build completed successfully

### Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test features:
   - ✅ Mic button works
   - ✅ Live transcript appears
   - ✅ Itinerary displays day-wise
   - ✅ Sources panel shows citations
   - ✅ PDF email sends

### Check Browser Console

1. Open browser DevTools (F12)
2. Check Console for errors
3. Verify API calls use correct URL:
   ```
   GET https://your-backend.up.railway.app/api/voice/session/new
   ```

## Step 5: Update Backend CORS

### Add Frontend URL to Backend

In your Railway backend, update `FRONTEND_URL`:
```env
FRONTEND_URL=https://your-app.vercel.app
```

Or use `ALLOWED_ORIGINS` for multiple domains:
```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
```

### Verify CORS

1. Test API call from frontend
2. Check Network tab in DevTools
3. Verify no CORS errors
4. Response should include CORS headers

## Step 6: Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` in backend if needed

## Production Build Validation

### Build Command

Vercel runs:
```bash
npm run build
```

This executes:
1. `tsc` - TypeScript compilation
2. `vite build` - Production build

### Build Output

- **Location**: `dist/`
- **Files**: 
  - `index.html`
  - `assets/*.js` (bundled JavaScript)
  - `assets/*.css` (bundled CSS)

### Build Validation Checklist

- [ ] TypeScript compiles without errors
- [ ] Vite build completes successfully
- [ ] No hardcoded URLs (all use `VITE_API_URL`)
- [ ] Environment variables are set
- [ ] Build output is generated in `dist/`
- [ ] No console errors in production build

## Troubleshooting

### Issue: "VITE_API_URL is not defined"

**Solution**:
1. Check environment variable is set in Vercel
2. Verify variable name is `VITE_API_URL` (not `API_URL`)
3. Redeploy after setting environment variable
4. Check build logs for errors

### Issue: "CORS error"

**Solution**:
1. Verify `FRONTEND_URL` is set in backend
2. Check backend CORS configuration
3. Verify frontend URL matches exactly (no trailing slash)
4. Check Network tab for CORS headers

### Issue: "API calls failing"

**Solution**:
1. Verify `VITE_API_URL` is correct (no trailing slash)
2. Check backend is running and accessible
3. Test backend URL directly in browser
4. Check Network tab for request/response

### Issue: "SSE connection not working"

**Solution**:
1. Verify SSE endpoint is accessible
2. Check `VITE_API_URL` is set correctly
3. Verify backend SSE endpoint is working
4. Check browser console for errors

### Issue: "Build fails"

**Solution**:
1. Check build logs in Vercel
2. Verify TypeScript errors
3. Check for missing dependencies
4. Ensure `package.json` is correct
5. Try building locally: `npm run build`

## Architecture

```
Frontend (Vercel)
    ↓ Uses VITE_API_URL
    ↓
Backend API (Railway)
    ├── /api/voice/* (Voice recording, SSE)
    ├── /api/chat (Chat processing)
    ├── /api/trips/* (Itinerary management)
    └── /api/itinerary/* (PDF email)
```

## Environment Variables Summary

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend.up.railway.app
```

### Backend (Railway)
```env
FRONTEND_URL=https://your-app.vercel.app
# OR
ALLOWED_ORIGINS=https://your-app.vercel.app
```

## Monitoring

### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. Monitor:
   - Page views
   - Performance metrics
   - Error rates
   - API response times

### Error Tracking

1. Check Vercel deployment logs
2. Monitor browser console errors
3. Set up error tracking (Sentry, etc.)
4. Monitor API call failures

## Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Vercel environment variables
   - Set for all environments (Production, Preview, Development)

2. **Build Optimization**
   - Enable Vercel's automatic optimizations
   - Use code splitting
   - Optimize images

3. **Security**
   - Use HTTPS (automatic on Vercel)
   - Validate API responses
   - Sanitize user input

4. **Performance**
   - Enable Vercel Edge Network
   - Use CDN for static assets
   - Optimize bundle size

## Production Checklist

- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` environment variable set
- [ ] Build completes successfully
- [ ] No hardcoded URLs
- [ ] All components working (Mic, Transcript, Itinerary, Sources)
- [ ] Backend CORS configured with frontend URL
- [ ] API calls working
- [ ] SSE connection working
- [ ] PDF email working
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring set up

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console
3. Verify environment variables
4. Test backend API directly
5. Review this guide's troubleshooting section

---

**Status**: ✅ Production Ready

**Last Updated**: 2024-01-20

