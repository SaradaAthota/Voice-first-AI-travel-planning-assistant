# Vercel GitHub Repository Recognition - Troubleshooting Guide

## Issue: Vercel Not Recognizing GitHub Repository

If Vercel is not recognizing your GitHub repository or showing "Could not access the repository", follow these steps:

## ⚠️ MOST COMMON FIX: GitHub Integration Access

**90% of "Could not access repository" errors are due to GitHub access permissions.**

### Quick Fix:

1. **Go to Vercel Settings → Git**
   - Visit: https://vercel.com/dashboard/settings/git
   - Check if GitHub shows "Connected"

2. **Reconnect GitHub**
   - Click **Disconnect** (if connected)
   - Click **Connect** next to GitHub
   - Authorize Vercel
   - **CRITICAL**: When asked for repository access, select:
     - ✅ **"All repositories"** (recommended), OR
     - ✅ Specifically select your repository

3. **Verify Repository Access in GitHub**
   - Go to: https://github.com/settings/installations
   - Find "Vercel" → Click **Configure**
   - Under "Repository access", ensure your repo is selected

4. **Try Import Again**
   - Go back to Vercel → Add New Project
   - Repository should now appear in the list
   - Or use search: Type `Voice-first-AI` and select from dropdown

## Step 1: Verify GitHub Integration

### Check Vercel GitHub App Installation

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your profile icon (top right)
   - Select **Settings**

2. **Check Git Integration**
   - Go to **Git** section
   - Verify GitHub is connected
   - If not connected, click **Connect** next to GitHub

3. **Authorize Vercel**
   - You'll be redirected to GitHub
   - Authorize Vercel to access your repositories
   - Select the repositories you want to give access to
   - Or select **All repositories** for full access

## Step 2: Check Repository Visibility

### Repository Must Be Accessible

**Option A: Public Repository (Recommended)**
- Repository must be public
- Vercel can access public repositories automatically

**Option B: Private Repository**
- Vercel must have access to the repository
- Check repository permissions in GitHub
- Ensure Vercel GitHub App has access

### Verify Repository Access

1. **In GitHub**:
   - Go to your repository
   - Click **Settings** → **Integrations** → **Installed GitHub Apps**
   - Verify **Vercel** is listed
   - Check permissions are granted

2. **In Vercel**:
   - Go to **Settings** → **Git**
   - Check if repository appears in list
   - If not, click **Refresh** or **Reconnect**

## Step 3: Repository Name Matching

### Common Issues

1. **Repository Name Mismatch**
   - Vercel searches by repository name
   - Ensure exact name matches
   - Check for typos or case sensitivity

2. **Organization vs Personal Account**
   - If repository is in an organization
   - Vercel must have access to the organization
   - Grant access in GitHub organization settings

3. **Repository Not Found**
   - Repository might be in a different GitHub account
   - Check which GitHub account is connected to Vercel
   - Disconnect and reconnect if needed

## Step 4: Manual Repository Import

### If Auto-Detection Fails

1. **Use Import URL**
   - In Vercel, click **Add New Project**
   - Instead of selecting from list, use **Import Git Repository**
   - Enter repository URL: `https://github.com/username/repository-name`
   - Or use SSH: `git@github.com:username/repository-name.git`

2. **Manual Configuration**
   - Framework Preset: **Vite**
   - Root Directory: `frontend` (if monorepo) or `.` (if standalone)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Step 5: Reconnect GitHub Integration

### If Repository Still Not Found

1. **Disconnect GitHub**
   - Go to Vercel **Settings** → **Git**
   - Click **Disconnect** next to GitHub
   - Confirm disconnection

2. **Reconnect GitHub**
   - Click **Connect** next to GitHub
   - Authorize Vercel again
   - Grant repository access
   - Wait for repositories to sync

3. **Refresh Repository List**
   - Click **Refresh** in Vercel
   - Wait a few seconds
   - Check if repository appears

## Step 6: Check Repository Settings

### GitHub Repository Settings

1. **Repository Visibility**
   - Go to repository **Settings** → **General**
   - Check if repository is public or private
   - If private, ensure Vercel has access

2. **Third-Party Access**
   - Go to repository **Settings** → **Integrations**
   - Check **Installed GitHub Apps**
   - Verify Vercel is installed
   - Check permissions granted

3. **Organization Settings** (if applicable)
   - Go to organization **Settings** → **Third-party access**
   - Verify Vercel has access
   - Grant access if needed

## Step 7: Alternative Deployment Methods

### If GitHub Integration Still Fails

**Option A: Deploy via Vercel CLI**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```

5. **Link to Project**
   ```bash
   vercel link
   ```

**Option B: Deploy via Git Push**

1. **Connect Repository After Deployment**
   - Deploy manually first
   - Then connect GitHub repository
   - Future deployments will be automatic

**Option C: Use GitHub Actions**

1. **Create GitHub Actions Workflow**
   - Create `.github/workflows/deploy.yml`
   - Use Vercel GitHub Action
   - Deploy on push to main

## Step 8: Verify Repository URL

### Check Your Repository

Run this command to get your repository URL:
```bash
git remote -v
```

Expected output:
```
origin  https://github.com/username/repository-name.git (fetch)
origin  https://github.com/username/repository-name.git (push)
```

### ⚠️ Common Issue: Typo in Repository Name

**Problem**: Repository URL has a typo (e.g., "Al" instead of "AI")

**Solution**: 
- Double-check the repository name spelling
- Copy the exact URL from `git remote -v`
- Ensure case sensitivity matches exactly

**Example**:
- ❌ Wrong: `Voice-first-Al-travel-planning-assistant` (typo: "Al")
- ✅ Correct: `Voice-first-AI-travel-planning-assistant` (correct: "AI")

### Use Correct URL Format

- **HTTPS**: `https://github.com/username/repository-name.git`
- **SSH**: `git@github.com:username/repository-name.git`
- **Web**: `https://github.com/username/repository-name`

## Common Solutions

### Solution 1: Repository in Organization

**Problem**: Repository is in a GitHub organization that Vercel doesn't have access to.

**Fix**:
1. Go to GitHub organization **Settings** → **Third-party access**
2. Grant access to Vercel
3. Refresh Vercel repository list

### Solution 2: Repository is Private

**Problem**: Private repository requires explicit access.

**Fix**:
1. Ensure Vercel GitHub App is installed
2. Grant access to the repository
3. Check repository **Settings** → **Integrations**

### Solution 3: Wrong GitHub Account

**Problem**: Repository is in a different GitHub account.

**Fix**:
1. Check which GitHub account is connected to Vercel
2. Disconnect and reconnect with correct account
3. Or add the account as collaborator

### Solution 4: Repository Not Synced

**Problem**: Repository exists but Vercel hasn't synced it yet.

**Fix**:
1. Wait a few minutes for sync
2. Click **Refresh** in Vercel
3. Or manually import using repository URL

## Quick Checklist

- [ ] GitHub is connected to Vercel
- [ ] Vercel GitHub App is installed
- [ ] Repository is accessible (public or private with access)
- [ ] Repository name matches exactly
- [ ] Organization access granted (if applicable)
- [ ] Tried manual import with URL
- [ ] Refreshed repository list
- [ ] Checked repository settings in GitHub

## Still Not Working?

### Contact Support

1. **Vercel Support**
   - Go to [vercel.com/support](https://vercel.com/support)
   - Describe the issue
   - Include repository URL

2. **GitHub Support**
   - Check if repository has any restrictions
   - Verify GitHub App permissions

3. **Alternative: Use CLI**
   - Deploy via Vercel CLI (works without GitHub integration)
   - Then connect repository later

## Example: Manual Import

**⚠️ IMPORTANT**: Check for typos in repository name!

If repository is `https://github.com/SaradaAthota/Voice-first-AI-travel-planning-assistant`:

1. In Vercel, click **Add New Project**
2. Click **Import Git Repository**
3. **Enter EXACT repository name** (watch for typos):
   - ✅ Correct: `https://github.com/SaradaAthota/Voice-first-AI-travel-planning-assistant`
   - ❌ Wrong: `https://github.com/SaradaAthota/Voice-first-Al-travel-planning-assistant` (typo: "Al")
4. Or enter short form: `SaradaAthota/Voice-first-AI-travel-planning-assistant`
5. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**

**Tip**: Copy the URL directly from `git remote get-url origin` to avoid typos

---

**Last Updated**: 2024-01-20

