# Deployment Guide

Complete deployment guide for the Voice-first AI Travel Planning Assistant.

## Architecture Overview

```
Frontend (Vercel)
    ↓
Backend (Render)
    ↓
┌─────────────────┬─────────────────┬──────────────┐
│ Supabase        │ ChromaDB        │ n8n          │
│ (PostgreSQL)    │ (Docker)        │ (Railway)    │
└─────────────────┴─────────────────┴──────────────┘
```

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] All tests passing
- [ ] API endpoints tested
- [ ] Frontend builds successfully
- [ ] Docker Compose works locally

### Supabase (PostgreSQL)

- [ ] Create Supabase project
- [ ] Run migrations: `npm run migrate`
- [ ] Verify tables created
- [ ] Set up Row Level Security (RLS) policies
- [ ] Configure connection pooling
- [ ] Test database connections

**Environment Variables**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

### ChromaDB (Docker Service)

- [ ] Deploy ChromaDB container
- [ ] Configure persistent storage
- [ ] Set up health checks
- [ ] Run RAG ingestion: `npm run ingest`
- [ ] Verify embeddings stored
- [ ] Test retrieval

**Environment Variables**:
- `CHROMADB_URL`

### Backend (Render)

1. **Create Web Service**:
   - Connect GitHub repository
   - Select `backend` directory
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment: Node.js

2. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   DATABASE_URL=...
   OPENAI_API_KEY=...
   CHROMADB_URL=...
   N8N_WEBHOOK_URL=...
   ```

3. **Health Check**:
   - Path: `/health`
   - Expected: `{"status":"ok"}`

4. **Auto-Deploy**:
   - Enable auto-deploy on push to `main`
   - Set up deployment notifications

### Frontend (Vercel)

1. **Import Project**:
   - Connect GitHub repository
   - Select `frontend` directory
   - Framework: Vite

2. **Build Settings**:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

3. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

4. **Custom Domain** (optional):
   - Add custom domain in Vercel settings
   - Configure DNS records

### n8n (Railway)

1. **Deploy n8n**:
   - Create new project in Railway
   - Add n8n service
   - Use official n8n Docker image

2. **Environment Variables**:
   ```
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=...
   N8N_HOST=0.0.0.0
   N8N_PORT=5678
   WEBHOOK_URL=https://your-n8n.railway.app
   ```

3. **Import Workflow**:
   - Import `n8n/workflow-itinerary-pdf-email.json`
   - Configure SMTP credentials
   - Test webhook

4. **Get Webhook URL**:
   - Copy webhook URL
   - Add to backend: `N8N_WEBHOOK_URL`

## Post-Deployment

### Verification Steps

1. **Health Checks**:
   ```bash
   # Backend
   curl https://your-backend.onrender.com/health
   
   # Frontend
   curl https://your-frontend.vercel.app
   ```

2. **Database**:
   - Verify tables exist
   - Test insert/query operations
   - Check connection pooling

3. **ChromaDB**:
   - Test RAG retrieval
   - Verify embeddings exist

4. **API Endpoints**:
   - Test voice upload
   - Test itinerary generation
   - Test PDF generation

5. **Frontend**:
   - Test voice recording
   - Test itinerary display
   - Test transcript streaming

### Monitoring

- **Backend Logs**: Render dashboard
- **Frontend Logs**: Vercel dashboard
- **Database**: Supabase dashboard
- **ChromaDB**: Container logs
- **n8n**: Railway logs

### Common Issues

See `TROUBLESHOOTING.md` for detailed fixes.

## Environment Variables Summary

### Backend
```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
CHROMADB_URL=http://chromadb:8000
N8N_WEBHOOK_URL=https://...
```

### Frontend
```bash
VITE_API_URL=https://your-backend.onrender.com
```

### n8n
```bash
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=...
WEBHOOK_URL=https://...
```

## Rollback Procedure

1. **Backend**: Revert to previous deployment in Render
2. **Frontend**: Revert to previous deployment in Vercel
3. **Database**: Restore from backup (if needed)
4. **ChromaDB**: Restore volume backup (if needed)

## Backup Strategy

- **Database**: Supabase automatic backups
- **ChromaDB**: Volume snapshots
- **Code**: GitHub repository
- **Environment**: Document all variables

## Security Checklist

- [ ] All API keys secured
- [ ] HTTPS enabled everywhere
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication/authorization

