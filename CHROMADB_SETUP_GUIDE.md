# ChromaDB Setup Guide for Railway

## Quick Setup Steps

### Step 1: Deploy ChromaDB on Railway

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Open your project (the one with your backend)

2. **Create New Service**
   - Click **"+ New"** → **"Empty Service"**
   - Name it: `chromadb` (or `voice-travel-chromadb`)

3. **Deploy ChromaDB**
   
   **Option A: Using Docker Image (Easiest)**
   - Click on the new service
   - Go to **Settings** → **Deploy**
   - Under **"Deploy Command"**, select **"Docker"**
   - In **"Docker Image"**, enter: `chromadb/chroma:latest`
   - Click **"Deploy"**

   **Option B: Using Dockerfile**
   - In the service, go to **Settings** → **Source**
   - Connect to your GitHub repo (if not already connected)
   - Set **Root Directory** to: `.` (root)
   - Railway will detect the Dockerfile automatically
   - Or create a simple Dockerfile in your repo root:
     ```dockerfile
     FROM chromadb/chroma:latest
     EXPOSE 8000
     ```

4. **Set Environment Variables**
   - Go to **Variables** tab in the ChromaDB service
   - Add:
     ```
     IS_PERSISTENT=TRUE
     ANONYMIZED_TELEMETRY=FALSE
     ```

5. **Get the Service URL**
   - After deployment, Railway will assign a domain
   - Go to **Settings** → **Networking**
   - Click **"Generate Domain"** if not already generated
   - Note the domain (e.g., `chromadb-production.up.railway.app`)
   - **Important**: Railway uses HTTPS, so the URL will be: `https://chromadb-production.up.railway.app`

### Step 2: Verify ChromaDB is Running

Test the health endpoint:

```bash
curl https://chromadb-production.up.railway.app/api/v1/heartbeat
```

Expected response:
```json
{"nanosecond heartbeat": 1234567890}
```

If you get a response, ChromaDB is running! ✅

### Step 3: Set CHROMADB_URL in Backend

1. **Go to Your Backend Service in Railway**
   - Open your backend service in the same Railway project

2. **Add Environment Variable**
   - Go to **Variables** tab
   - Click **"+ New Variable"**
   - **Name**: `CHROMADB_URL`
   - **Value**: `https://chromadb-production.up.railway.app` (use your actual ChromaDB domain)
   - Click **"Add"**

3. **Redeploy Backend** (if needed)
   - Railway will automatically redeploy when you add environment variables
   - Or manually trigger: **Settings** → **Deploy** → **"Redeploy"**

### Step 4: Verify Connection

1. **Check Backend Logs**
   - Go to your backend service → **Deployments** → **View Logs**
   - Look for any ChromaDB connection errors
   - Should see successful connection messages

2. **Test RAG Endpoint** (if you have one)
   - Or test by using the application and checking if RAG features work

## Troubleshooting

### Issue: ChromaDB URL not accessible

**Check:**
1. Is ChromaDB service running? (Check **Deployments** tab)
2. Is the domain generated? (Check **Settings** → **Networking**)
3. Try accessing: `https://your-chromadb-domain/api/v1/heartbeat`

**Solution:**
- Make sure ChromaDB service is deployed and running
- Verify the domain is correct
- Check Railway logs for ChromaDB service errors

### Issue: Backend can't connect to ChromaDB

**Check:**
1. Is `CHROMADB_URL` set correctly in backend environment variables?
2. Is the URL using `https://` (not `http://`)?
3. Does the URL include the port? (Railway handles this automatically, so usually no port needed)

**Solution:**
- Verify `CHROMADB_URL` format: `https://chromadb-production.up.railway.app`
- Check backend logs for connection errors
- Test ChromaDB health endpoint directly

### Issue: CORS errors

**Note:** ChromaDB on Railway should handle CORS automatically. If you see CORS errors:
- Make sure you're using the HTTPS URL
- Check ChromaDB service logs

## Alternative: Using Railway's Database Template

Railway might have a ChromaDB template:

1. Click **"+ New"** → **"Database"**
2. Look for **"ChromaDB"** in the list
3. If available, click it and Railway will set it up automatically
4. Get the connection URL from the service settings

## Next Steps

After ChromaDB is set up:

1. **Ingest Data** (One-time setup)
   - Run the ingestion script to populate ChromaDB with travel data
   - See: `backend/src/rag/ingest.ts`

2. **Verify RAG Works**
   - Test the application
   - Try asking for city guidance or explanations
   - Check that citations appear in the UI

## Quick Reference

- **ChromaDB Image**: `chromadb/chroma:latest`
- **Port**: 8000 (handled by Railway)
- **Health Endpoint**: `/api/v1/heartbeat`
- **Environment Variables**:
  - `IS_PERSISTENT=TRUE`
  - `ANONYMIZED_TELEMETRY=FALSE`
- **CHROMADB_URL Format**: `https://your-chromadb-domain.up.railway.app`

