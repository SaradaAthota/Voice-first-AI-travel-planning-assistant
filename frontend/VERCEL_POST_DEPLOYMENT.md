# Vercel Post-Deployment Checklist

## ✅ Essential Steps After Deployment

### 1. Set Environment Variable (REQUIRED)

**Without this, your frontend won't be able to call the backend API.**

1. **Go to Project Settings**
   - In Vercel dashboard, click on your project
   - Go to **Settings** → **Environment Variables**

2. **Add VITE_API_URL**
   - Click **Add New**
   - Name: `VITE_API_URL`
   - Value: `https://your-backend.up.railway.app` (your Railway backend URL)
   - **⚠️ IMPORTANT**: No trailing slash
   - Select: **Production**, **Preview**, and **Development**

3. **Redeploy**
   - Go to **Deployments** tab
   - Click **...** (three dots) on latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger redeploy

### 2. Get Your Frontend URL

1. **Copy Deployment URL**
   - In Vercel dashboard, your project shows the URL
   - Example: `https://voice-travel-frontend.vercel.app`
   - Copy this URL

2. **Note the URL Format**
   - Production: `https://your-project.vercel.app`
   - Preview: `https://your-project-git-branch.vercel.app`

### 3. Update Backend CORS (REQUIRED)

**Your backend needs to allow requests from your frontend.**

1. **Go to Railway Backend**
   - Open your Railway project
   - Go to **Variables** tab

2. **Add/Update FRONTEND_URL**
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
   - Replace with your actual Vercel URL
   - No trailing slash

3. **Or Use ALLOWED_ORIGINS** (if multiple domains)
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
   ```

4. **Redeploy Backend**
   - Railway auto-redeploys when env vars change
   - Or manually redeploy if needed

### 4. Test Your Frontend

1. **Visit Your Vercel URL**
   - Open: `https://your-app.vercel.app`
   - Check if page loads

2. **Test Features**
   - ✅ Mic button works
   - ✅ Live transcript appears
   - ✅ Itinerary displays
   - ✅ Sources panel shows citations

3. **Check Browser Console**
   - Open DevTools (F12)
   - Check Console for errors
   - Verify API calls use correct URL

4. **Test API Connection**
   - Try recording voice
   - Check if transcript appears
   - Verify backend responds

## ⚠️ Common Issues After Deployment

### Issue: "API calls failing"

**Check**:
1. `VITE_API_URL` is set in Vercel
2. Backend URL is correct (no trailing slash)
3. Backend is running and accessible
4. CORS is configured in backend

**Fix**:
- Verify environment variable is set
- Test backend URL directly: `curl https://your-backend.up.railway.app/health`
- Check backend CORS configuration

### Issue: "CORS error"

**Check**:
1. `FRONTEND_URL` is set in backend
2. Frontend URL matches exactly (no trailing slash)
3. Backend has been redeployed after adding `FRONTEND_URL`

**Fix**:
- Update `FRONTEND_URL` in Railway
- Ensure exact match (case-sensitive)
- Redeploy backend

### Issue: "SSE connection not working"

**Check**:
1. `VITE_API_URL` is set correctly
2. SSE endpoint is accessible
3. Backend SSE is working

**Fix**:
- Verify environment variable
- Test SSE endpoint: `curl -N https://your-backend.up.railway.app/api/voice/transcript/test-session-id`
- Check backend logs

## 📋 Post-Deployment Checklist

- [ ] `VITE_API_URL` environment variable set in Vercel
- [ ] Frontend redeployed after setting environment variable
- [ ] Frontend URL copied
- [ ] `FRONTEND_URL` set in Railway backend
- [ ] Backend redeployed after setting `FRONTEND_URL`
- [ ] Frontend loads correctly
- [ ] Mic button works
- [ ] Live transcript works
- [ ] Itinerary displays
- [ ] Sources panel works
- [ ] No CORS errors
- [ ] No console errors

## 🎯 Next Steps (Optional)

### Instant Previews
- ✅ Already enabled
- Automatically creates preview URLs for branches
- No action needed

### Add Domain
- Optional: Add custom domain later
- Can skip for now
- Useful for production branding

### Enable Speed Insights
- Optional: Performance monitoring
- Can skip for now
- Useful for optimization later

## 🚀 You're Done!

Once you've completed the essential steps:
1. ✅ Environment variable set
2. ✅ Backend CORS configured
3. ✅ Frontend tested

Your application is live and ready to use!

---

**Last Updated**: 2024-01-20

