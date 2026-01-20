# 🚂 Railway Service Configuration - Detailed Explanation

**Section:** Step 2: Configure Service (lines 28-40)  
**Purpose:** Understanding how to configure Railway to deploy your Node.js backend

---

## 📋 Overview

When you deploy to Railway, you need to tell Railway:
1. **Where** your code is located (Root Directory)
2. **How** to build your application (Build Command)
3. **How** to start your application (Start Command)
4. **What port** to use (Port Configuration)

Railway can auto-detect many settings, but for a monorepo (frontend + backend in one repo), you need to specify the root directory.

---

## 🔍 Detailed Explanation

### 1. Service Name: `voice-travel-backend`

**What it is:**
- A friendly name for your service in Railway dashboard
- Used for identification and organization
- Can be anything you prefer (e.g., `travel-backend`, `api-server`, etc.)

**Why it matters:**
- Helps you identify the service in Railway dashboard
- Used in logs and monitoring
- Doesn't affect functionality, just organization

**Example:**
```
Service Name: voice-travel-backend
```

**In Railway Dashboard:**
```
Your Project
  ├── voice-travel-backend (your service)
  ├── chromadb (if you add ChromaDB)
  └── n8n (if you add n8n)
```

---

### 2. Root Directory: `backend`

**What it is:**
- The folder path where Railway should look for your code
- Since your repo has both `frontend/` and `backend/` folders, Railway needs to know which one to deploy

**Why it's critical:**
```
Your Repository Structure:
├── frontend/          ← Frontend code (React/Vite)
│   ├── src/
│   ├── package.json
│   └── ...
├── backend/          ← Backend code (Node.js/Express) ← Railway needs this!
│   ├── src/
│   ├── package.json
│   └── ...
├── supabase/
├── n8n/
└── README.md
```

**Without Root Directory:**
- Railway would look in the root folder
- Wouldn't find `package.json` in root (it's in `backend/`)
- Build would fail ❌

**With Root Directory = `backend`:**
- Railway looks in `backend/` folder
- Finds `backend/package.json`
- Build succeeds ✅

**How to set in Railway:**
1. Go to your service settings
2. Find "Root Directory" or "Working Directory"
3. Enter: `backend`
4. Save

---

### 3. Build Command: `npm install && npm run build`

**What it does:**
This command runs in two steps:

#### Step 1: `npm install`
- Installs all dependencies from `package.json`
- Downloads packages from npm registry
- Creates `node_modules/` folder
- Takes 1-2 minutes

**What gets installed:**
```json
// From backend/package.json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "openai": "^4.20.1",
    // ... all other dependencies
  }
}
```

#### Step 2: `npm run build`
- Compiles TypeScript to JavaScript
- Runs `tsc` (TypeScript compiler)
- Creates `dist/` folder with compiled JavaScript
- Takes 10-30 seconds

**What happens:**
```
backend/src/index.ts (TypeScript)
         ↓
    npm run build
         ↓
backend/dist/index.js (JavaScript) ← This is what runs in production
```

**Why both commands:**
- `npm install` must run first (needs dependencies to build)
- `npm run build` must run second (needs dependencies installed)
- `&&` means "run second command only if first succeeds"

**In Railway:**
- Railway runs this during the "Build" phase
- Happens before the service starts
- If build fails, deployment stops

**Build Output Example:**
```
> voice-travel-assistant-backend@1.0.0 build
> tsc

✅ Build successful
📦 Created dist/ folder with:
   - dist/index.js
   - dist/config/env.js
   - dist/routes/chat.js
   - ... (all compiled files)
```

---

### 4. Start Command: `npm start`

**What it does:**
- Runs the `start` script from `package.json`
- Starts your Node.js application

**From package.json:**
```json
{
  "scripts": {
    "start": "node dist/index.js"  ← This is what runs
  }
}
```

**What happens:**
1. Railway runs `npm start`
2. Which executes `node dist/index.js`
3. Node.js loads the compiled JavaScript
4. Your Express server starts listening on the port

**Why `dist/index.js`:**
- Production uses compiled JavaScript (not TypeScript)
- `dist/` folder contains all compiled files
- `index.js` is the entry point (from `package.json` main field)

**Startup Sequence:**
```
npm start
  ↓
node dist/index.js
  ↓
Loads backend/src/index.ts (compiled)
  ↓
Express app starts
  ↓
Server listens on PORT
  ↓
✅ Service is running!
```

**In Railway:**
- Runs after successful build
- Keeps running (Railway monitors it)
- If it crashes, Railway restarts it automatically

---

### 5. Port: Railway Auto-Assigns (usually `$PORT`)

**What it means:**
- Railway automatically assigns a port number
- Sets it as `PORT` environment variable
- Your app reads from `process.env.PORT`

**Why Railway assigns ports:**
- Railway runs multiple services on same infrastructure
- Each service needs a unique port
- Railway manages port allocation automatically

**How your app uses it:**
```typescript
// backend/src/config/env.ts
export const config: Config = {
  port: getEnvNumber('PORT', 3000),  // Reads from process.env.PORT, defaults to 3000
  // ...
};

// backend/src/index.ts
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

**Port Flow:**
```
Railway assigns: PORT=54321 (example)
         ↓
Your app reads: process.env.PORT = "54321"
         ↓
Config sets: config.port = 54321
         ↓
Server listens: app.listen(54321)
         ↓
✅ Service accessible on Railway's URL
```

**Important Notes:**
- You don't manually set the port
- Railway handles it automatically
- Your app must read from `process.env.PORT`
- Default fallback (3000) is fine, but Railway's port takes precedence

**In Railway Dashboard:**
- You'll see the port in service settings
- Usually something like `54321` or `3000`
- Railway also provides a public URL (e.g., `https://your-service.up.railway.app`)

---

## 🔗 How It All Works Together

### Deployment Flow:

```
1. Railway detects: "This is a Node.js project"
   ↓
2. Railway checks: Root Directory = "backend"
   ↓
3. Railway runs: Build Command = "npm install && npm run build"
   ├── npm install → Installs dependencies
   └── npm run build → Compiles TypeScript
   ↓
4. Railway sets: PORT environment variable (e.g., PORT=54321)
   ↓
5. Railway runs: Start Command = "npm start"
   ├── npm start → Runs "node dist/index.js"
   └── Server starts on PORT
   ↓
6. Railway exposes: Public URL (e.g., https://your-service.up.railway.app)
   ↓
✅ Your backend is live!
```

---

## 📝 Configuration Summary

| Setting | Value | Why |
|---------|-------|-----|
| **Service Name** | `voice-travel-backend` | Organization/identification |
| **Root Directory** | `backend` | Tells Railway where your code is |
| **Build Command** | `npm install && npm run build` | Installs deps + compiles TypeScript |
| **Start Command** | `npm start` | Runs compiled JavaScript |
| **Port** | Auto-assigned | Railway manages this automatically |

---

## ✅ Verification

After configuration, Railway will:

1. **Build Phase:**
   - ✅ Install dependencies
   - ✅ Compile TypeScript
   - ✅ Create `dist/` folder

2. **Start Phase:**
   - ✅ Run `npm start`
   - ✅ Server starts on assigned port
   - ✅ Health check passes

3. **Monitoring:**
   - ✅ Service shows as "Active"
   - ✅ Logs show "Server running on port X"
   - ✅ Public URL is accessible

---

## 🐛 Common Issues

### Issue 1: "Cannot find package.json"
**Cause:** Root Directory not set to `backend`  
**Fix:** Set Root Directory to `backend`

### Issue 2: "Build failed"
**Cause:** TypeScript compilation errors  
**Fix:** Check build logs, fix TypeScript errors

### Issue 3: "Port already in use"
**Cause:** Shouldn't happen (Railway manages ports)  
**Fix:** Railway handles this automatically

### Issue 4: "Service crashes on start"
**Cause:** Missing environment variables  
**Fix:** Add all required env vars (see Step 3)

---

## 📚 Related Files

- **package.json:** Defines `start` script
- **tsconfig.json:** TypeScript compilation config
- **src/index.ts:** Application entry point
- **config/env.ts:** Reads `PORT` from environment

---

**Last Updated:** 2024-01-15  
**Related:** See `backend/RAILWAY_DEPLOYMENT.md` for full deployment guide

