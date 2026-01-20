# Vercel GitHub Setup - Correct Steps

## Issue: 404 on Git Settings Page

If you're getting a 404 error on the Git settings page, use these correct steps:

## Method 1: Access Git Settings (Correct Path)

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Make sure you're logged in

### Step 2: Access Settings
1. Click on your **profile icon** (top right corner)
2. Select **Settings** from the dropdown menu
3. In the left sidebar, click **Git** (or **Git Integration**)

**Correct URL**: https://vercel.com/account/git

## Method 2: Connect GitHub During Project Import

### If Git Settings Page Doesn't Work

1. **Go to Add New Project**
   - Visit: https://vercel.com/dashboard
   - Click **Add New...** → **Project**

2. **Connect GitHub**
   - If GitHub is not connected, you'll see a button to **Connect GitHub**
   - Click it and authorize Vercel
   - This will connect GitHub automatically

3. **Select Repository**
   - After connecting, repositories will appear
   - Search for: `Voice-first-AI-travel-planning-assistant`
   - Select it from the list

## Method 3: Connect GitHub via Repository Import

### Direct Repository Import

1. **Go to**: https://vercel.com/new
2. **Click**: "Import Git Repository"
3. **If GitHub not connected**:
   - You'll see "Connect GitHub" button
   - Click it and authorize
4. **Search for repository**:
   - Type: `Voice-first-AI` or `SaradaAthota`
   - Select from dropdown

## Method 4: Use Vercel CLI (No Dashboard Needed)

### Deploy Without GitHub Integration

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name: voice-travel-frontend
# - Directory: ./
# - Override settings? No
```

After deployment, you can connect GitHub later.

## Method 5: Check GitHub App Installation

### Verify Vercel Has Access

1. **Go to GitHub**: https://github.com/settings/installations
2. **Find "Vercel"** in the list
3. **Click "Configure"**
4. **Check "Repository access"**:
   - Should show "All repositories" or your specific repo
   - If not, grant access

## Quick Fix: Start from Dashboard

1. **Go to**: https://vercel.com/dashboard
2. **Click**: **Add New...** → **Project**
3. **If you see "Connect GitHub"**: Click it
4. **Authorize Vercel** in the popup
5. **Select repositories** you want to give access to
6. **Search for your repository** in the list

## Alternative: Direct Repository URL

If the search doesn't work:

1. In Vercel, click **Add New Project**
2. Look for **"Import Git Repository"** or **"Import"** button
3. Enter: `SaradaAthota/Voice-first-AI-travel-planning-assistant`
4. Or enter full URL: `https://github.com/SaradaAthota/Voice-first-AI-travel-planning-assistant`

## Troubleshooting

### If Git Settings Page Shows 404:

1. **Try accessing via profile menu**:
   - Click profile icon → Settings → Git

2. **Try direct URL**:
   - https://vercel.com/account/git

3. **Connect during project import**:
   - This is often easier than going to settings first

4. **Use CLI**:
   - Bypasses dashboard issues entirely

## Recommended Approach

**Easiest Method**: Start from "Add New Project"

1. Go to: https://vercel.com/dashboard
2. Click **Add New...** → **Project**
3. If GitHub not connected, click **Connect GitHub**
4. Authorize and grant access
5. Search for your repository
6. Select and configure

This method connects GitHub automatically and avoids the settings page entirely.

---

**Last Updated**: 2024-01-20

