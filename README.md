# Voice-First AI Travel Planning Assistant

An intelligent travel planning assistant that uses voice input to create personalized travel itineraries with real-time transcription, AI-powered recommendations, RAG-enhanced explanations, and automated PDF generation with email delivery.

## 🚀 Features

- **Voice-First Interface**: Record your travel preferences using natural speech
- **Real-Time Transcription**: Live transcript display with Server-Sent Events (SSE)
- **AI-Powered Itinerary Generation**: Creates day-by-day itineraries based on your preferences
- **RAG-Enhanced Recommendations**: Retrieves relevant travel information from knowledge base for city guidance, safety tips, and explanations
- **POI Discovery**: Finds Points of Interest using OpenStreetMap data
- **Grounded Explanations**: Answers "why" questions with citations from RAG and OSM sources
- **Automatic Evaluations**: Validates feasibility, edit correctness, and grounding
- **PDF Generation**: Automatically generates and emails beautiful PDF itineraries
- **Responsive UI**: Clean, modern interface with day-wise itinerary display and citations

## 📋 Tech Stack

### Frontend
- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **MediaRecorder API** for voice recording
- **Server-Sent Events (SSE)** for real-time updates
- **Playwright** for E2E testing

### Backend
- **Node.js** + **TypeScript** + **Express.js**
- **OpenAI API** for LLM and embeddings (Whisper for STT)
- **Supabase** (PostgreSQL) for data storage
- **ChromaDB** for vector storage and RAG
- **Puppeteer** for PDF generation
- **MCP Tools** for POI discovery and itinerary generation

### Infrastructure
- **Supabase**: Database and authentication
- **ChromaDB**: Vector database for RAG
- **n8n**: Workflow automation for PDF and email
- **Docker Compose**: Local development environment

## 🏗️ Project Structure

```
.
├── frontend/          # React frontend application
├── backend/           # Express.js backend API
├── n8n/              # n8n workflow definitions
├── docker-compose.yml # Local development setup
└── README.md         # This file
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for ChromaDB)
- Supabase account
- OpenAI API key
- n8n instance (optional, for PDF/email)

### 1. Clone Repository

```bash
git clone <repository-url>
cd Voice-first-AI-travel-planning-assistant
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory:

```env
NODE_ENV=development
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# ChromaDB Configuration
CHROMADB_URL=http://localhost:8000

# n8n Configuration (optional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
```

#### Database Setup

**Option 1: Using Supabase SQL Editor (Recommended)**

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New query"**
5. Copy and paste the SQL from `backend/migrations/001_initial_schema.sql`
6. Click **"Run"** (or press `Ctrl+Enter`)
7. Verify tables were created in **"Table Editor"**

**Option 2: Using Migration Script**

```bash
cd backend
npm run migrate
```

Start development server:

```bash
npm run dev
```

Backend will be available at `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start development server:

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 4. ChromaDB Setup (Local Development)

**⚠️ IMPORTANT: Ensure Docker Desktop is running!**

Start ChromaDB using Docker Compose:

```bash
docker-compose up -d chromadb
```

Verify it's running:

```bash
curl http://localhost:8000/api/v1/heartbeat
```

Expected: `{"nanosecond heartbeat": <timestamp>}`

ChromaDB will be available at `http://localhost:8000`

### 5. n8n Workflow Setup (Optional)

1. Import the workflow from `n8n/workflow-itinerary-pdf-email.json`
2. Configure SMTP credentials for email sending:
   - For Gmail: Use App Password (not regular password)
   - Port 587: SSL/TLS should be OFF (STARTTLS is used)
   - Port 465: SSL/TLS should be ON
3. Update the workflow to use the backend PDF endpoint (`/api/pdf/generate-pdf`)
4. Copy the webhook URL and add it to `backend/.env` as `N8N_WEBHOOK_URL`
5. Ensure the workflow is **ACTIVE** (toggled on)

See `n8n/README.md` for detailed setup instructions.

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### Frontend E2E Tests

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui
```

### Manual Testing

1. **Start Services**:
   ```bash
   # Terminal 1: ChromaDB
   docker-compose up -d chromadb
   
   # Terminal 2: Backend
   cd backend && npm run dev
   
   # Terminal 3: Frontend
   cd frontend && npm run dev
   ```

2. **Open Application**: Navigate to `http://localhost:5173` in your browser

3. **Test Voice Input**:
   - Click the microphone button to start recording
   - Speak your travel preferences (e.g., "I want to visit New Delhi for 2 days next week")
   - Wait for transcription and itinerary generation

4. **Test Itinerary Display**:
   - Verify day-wise itinerary is displayed
   - Check morning/afternoon/evening blocks
   - Verify duration and travel time are shown
   - Check that citations appear in "Sources & References" section

5. **Test Explanations**:
   - Ask "Why did you pick this place?"
   - Verify explanation includes citations
   - Check that RAG data is used for city guidance

6. **Test PDF Generation**:
   - After itinerary is generated, say "share it to me" or "send it via email"
   - Provide your email address when prompted
   - Check your inbox for the PDF

## 📚 API Endpoints

### Voice
- `POST /api/voice/upload` - Upload audio chunk
- `GET /api/voice/transcript/:sessionId` - SSE stream for transcript
- `POST /api/voice/complete` - Complete voice session
- `GET /api/voice/session/new` - Create new session

### Chat
- `POST /api/chat` - Process message and generate/update itinerary

### Trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `GET /api/trips/:id/itinerary` - Get itinerary for trip

### Itinerary
- `POST /api/itinerary/send-pdf` - Send itinerary PDF via email
- `POST /api/itinerary/generate` - Generate itinerary
- `POST /api/itinerary/edit` - Edit itinerary

### PDF
- `POST /api/pdf/generate-pdf` - Generate PDF from HTML

## 🔧 Configuration

### Environment Variables

See `backend/.env.example` for all required environment variables.

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Get your project URL and API keys from **Settings → API**
3. Get your database connection string from **Settings → Database**
4. Run migrations using SQL Editor (see Database Setup above)

### OpenAI Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com)
2. Add it to `backend/.env` as `OPENAI_API_KEY`

### n8n Setup

1. Deploy n8n instance (Railway, self-hosted, or cloud)
2. Import workflow from `n8n/workflow-itinerary-pdf-email.json`
3. Configure SMTP credentials (Gmail App Password recommended)
4. Set up HTTP Request node to call backend PDF endpoint
5. Get webhook URL and add to `backend/.env`

## 🐳 Docker Compose

Run all services locally:

```bash
docker-compose up
```

This will start:
- ChromaDB on port 8000
- Backend on port 3000
- Frontend on port 5173

## 📖 Documentation

- **Backend**: See `backend/README.md`
- **Frontend**: See `frontend/README.md`
- **n8n Workflow**: See `n8n/README.md`
- **Component Documentation**: See README files in respective directories

## 🚢 Deployment Guide

This section provides step-by-step instructions for deploying the Voice-First AI Travel Planning Assistant to production.

### Prerequisites

Before deploying, ensure you have:
- ✅ GitHub repository with your code
- ✅ Supabase project created and configured
- ✅ OpenAI API key
- ✅ n8n instance (cloud or self-hosted)
- ✅ Accounts on deployment platforms (Render, Vercel, Railway, etc.)

---

### Step 1: Deploy Backend (Render/Railway)

#### Option A: Render (Recommended)

1. **Create New Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository

2. **Configure Service**
   - **Name**: `voice-travel-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Environment Variables**
   Add all variables from `backend/.env`:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
   OPENAI_API_KEY=sk-your-openai-key
   CHROMADB_URL=https://your-chromadb-instance.com
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
   BASE_URL=https://your-backend-url.onrender.com
   ```

4. **Deploy**
   - Click **"Create Web Service"**
   - Wait for build to complete
   - Note your backend URL (e.g., `https://voice-travel-backend.onrender.com`)

#### Option B: Railway

1. **Create New Project**
   - Go to [Railway Dashboard](https://railway.app)
   - Click **"New Project"** → **"Deploy from GitHub repo"**
   - Select your repository

2. **Configure Service**
   - Railway will auto-detect Node.js
   - Set **Root Directory** to `backend`
   - Add environment variables (same as Render above)

3. **Deploy**
   - Railway will automatically deploy
   - Get your backend URL from the service settings

---

### Step 2: Deploy Frontend (Vercel/Netlify)

#### Option A: Vercel (Recommended)

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **"Add New..."** → **"Project"**
   - Import from GitHub repository

2. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```
   (Replace with your actual backend URL from Step 1)

4. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete
   - Note your frontend URL (e.g., `https://voice-travel.vercel.app`)

#### Option B: Netlify

1. **Create New Site**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click **"Add new site"** → **"Import an existing project"**
   - Connect GitHub repository

2. **Configure Build**
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

3. **Environment Variables**
   - Go to **Site settings** → **Environment variables**
   - Add `VITE_API_URL` with your backend URL

4. **Deploy**
   - Click **"Deploy site"**
   - Wait for build to complete

---

### Step 3: Deploy ChromaDB

#### Option A: Railway (Recommended)

1. **Create New Service**
   - In your Railway project, click **"+ New"** → **"Database"** → **"Add ChromaDB"**
   - Or use **"Deploy from GitHub"** and select a ChromaDB Docker image

2. **Configure**
   - Railway will automatically provision ChromaDB
   - Note the service URL (e.g., `https://chromadb-production.up.railway.app`)

3. **Update Backend Environment**
   - Update `CHROMADB_URL` in your backend environment variables
   - Use the Railway-provided URL

#### Option B: Docker Container (Self-Hosted)

1. **Deploy to VPS/Cloud**
   ```bash
   docker run -d \
     --name chromadb \
     -p 8000:8000 \
     -v chromadb_data:/chroma/chroma \
     chromadb/chroma:latest
   ```

2. **Update Backend Environment**
   - Set `CHROMADB_URL` to your server's public IP/domain

#### Option C: ChromaDB Cloud (Paid)

1. **Sign Up**
   - Go to [ChromaDB Cloud](https://www.trychroma.com)
   - Create account and instance

2. **Get Connection URL**
   - Copy the connection URL from dashboard
   - Update `CHROMADB_URL` in backend environment

---

### Step 4: Deploy n8n Workflow

#### Option A: n8n Cloud (Easiest)

1. **Create Account**
   - Go to [n8n Cloud](https://www.n8n.io/cloud)
   - Sign up for an account

2. **Import Workflow**
   - Go to **Workflows** → **Import from File**
   - Upload `n8n/workflow-itinerary-pdf-email.json`

3. **Configure Nodes**
   - **Webhook Node**: Note the webhook URL
   - **HTTP Request Node**: Update URL to your backend's PDF endpoint:
     ```
     https://your-backend-url.onrender.com/api/pdf/generate-pdf
     ```
   - **Send Email Node**: Configure SMTP credentials:
     - **Host**: `smtp.gmail.com` (for Gmail)
     - **Port**: `587`
     - **User**: Your Gmail address
     - **Password**: Gmail App Password (not regular password)
     - **SSL/TLS**: OFF (for port 587)

4. **Activate Workflow**
   - Toggle workflow to **ACTIVE**
   - Copy webhook URL

5. **Update Backend Environment**
   - Add `N8N_WEBHOOK_URL` to backend environment variables
   - Use the webhook URL from step 4

#### Option B: Railway (Self-Hosted)

1. **Deploy n8n**
   - Create new Railway service
   - Use n8n Docker image: `n8nio/n8n`
   - Add environment variables:
     ```
     N8N_BASIC_AUTH_ACTIVE=true
     N8N_BASIC_AUTH_USER=admin
     N8N_BASIC_AUTH_PASSWORD=your-secure-password
     ```

2. **Import Workflow**
   - Access n8n at your Railway URL
   - Import workflow and configure as above

---

### Step 5: Database Migration

1. **Run Migration**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Create new query
   - Copy contents from `backend/migrations/001_initial_schema.sql`
   - Click **"Run"** to execute

2. **Verify Tables**
   - Go to **Table Editor**
   - Verify these tables exist:
     - `trips`
     - `itineraries`
     - `transcripts`
     - `eval_results`
     - `mcp_logs`

---

### Step 6: Environment Variables Summary

#### Backend Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://your-backend-url.onrender.com

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# ChromaDB
CHROMADB_URL=https://your-chromadb-instance.com

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/itinerary-pdf
```

#### Frontend Environment Variables

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

---

### Step 7: Post-Deployment Verification

1. **Test Backend Health**
   ```bash
   curl https://your-backend-url.onrender.com/health
   ```
   Expected: `{"status":"ok"}`

2. **Test Frontend**
   - Open your frontend URL in browser
   - Verify UI loads correctly
   - Check browser console for errors

3. **Test Voice Recording**
   - Click microphone button
   - Record a test message
   - Verify transcription appears

4. **Test Itinerary Generation**
   - Say: "I want to visit Mumbai for 2 days"
   - Verify itinerary is generated and displayed

5. **Test PDF Email**
   - After itinerary is generated, say: "share it to me"
   - Provide email address
   - Check inbox for PDF

6. **Check Logs**
   - Backend: Check Render/Railway logs for errors
   - Frontend: Check browser console
   - n8n: Check workflow execution logs

---

### Step 8: Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] ChromaDB deployed and connected
- [ ] n8n workflow imported and active
- [ ] Database migrations run successfully
- [ ] All environment variables configured
- [ ] Backend health check passing
- [ ] Frontend can connect to backend
- [ ] Voice recording works
- [ ] Transcription works
- [ ] Itinerary generation works
- [ ] PDF generation works
- [ ] Email sending works
- [ ] Citations display correctly
- [ ] Error handling works

---

### Troubleshooting Deployment

#### Backend Issues

**Build Fails**:
- Check Node.js version (requires 18+)
- Verify all dependencies in `package.json`
- Check build logs for specific errors

**Runtime Errors**:
- Verify all environment variables are set
- Check database connection
- Verify ChromaDB URL is accessible
- Check OpenAI API key is valid

#### Frontend Issues

**Build Fails**:
- Check Node.js version
- Verify Vite configuration
- Check for TypeScript errors

**API Connection Errors**:
- Verify `VITE_API_URL` is set correctly
- Check CORS settings on backend
- Verify backend is accessible from frontend domain

#### n8n Issues

**Workflow Not Triggering**:
- Verify workflow is ACTIVE
- Check webhook URL is correct
- Verify backend can reach n8n webhook

**Email Not Sending**:
- Verify SMTP credentials
- For Gmail: Use App Password (not regular password)
- Check SSL/TLS settings (OFF for port 587)

---

### Deployment Architecture

```
┌─────────────────┐
│   Frontend      │  (Vercel/Netlify)
│   (Vite/React)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Backend       │  (Render/Railway)
│   (Express.js)  │
└─────┬───────┬───┘
      │       │
      │       ├──► Supabase (Database)
      │       │
      │       ├──► ChromaDB (Vector DB)
      │       │
      │       └──► OpenAI API
      │
      ▼
┌─────────────────┐
│   n8n Workflow  │  (n8n Cloud/Railway)
│   (PDF/Email)   │
└─────────────────┘
```

---

### Cost Estimation

**Free Tier Options**:
- **Render**: Free tier available (spins down after inactivity)
- **Vercel**: Free tier for frontend
- **Supabase**: Free tier (500MB database)
- **n8n Cloud**: Free tier (limited executions)
- **ChromaDB**: Self-hosted (free) or Railway free tier

**Paid Options** (for production):
- **Render**: $7/month (always-on backend)
- **Vercel**: Pro plan for production
- **Supabase**: Pro plan for larger database
- **n8n Cloud**: Paid plans for more executions
- **ChromaDB Cloud**: Paid plans available

---

### Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to Git
   - Use platform secrets management
   - Rotate API keys regularly

2. **API Keys**
   - Use service role keys only in backend
   - Never expose in frontend code
   - Use environment variables

3. **CORS**
   - Configure CORS to allow only your frontend domain
   - Remove wildcard CORS in production

4. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Protect against abuse

5. **HTTPS**
   - Always use HTTPS in production
   - Configure SSL certificates

---

### Monitoring & Maintenance

1. **Logs**
   - Monitor backend logs for errors
   - Check n8n execution logs
   - Monitor frontend error tracking

2. **Health Checks**
   - Set up health check endpoints
   - Configure uptime monitoring
   - Set up alerts for downtime

3. **Database**
   - Monitor database size
   - Set up backups
   - Monitor query performance

4. **API Usage**
   - Monitor OpenAI API usage
   - Set up usage alerts
   - Track costs

---

### Next Steps After Deployment

1. **Domain Setup** (Optional)
   - Configure custom domain for frontend
   - Configure custom domain for backend
   - Update CORS settings

2. **Analytics** (Optional)
   - Add analytics tracking
   - Monitor user behavior
   - Track conversion metrics

3. **Performance Optimization**
   - Enable CDN for static assets
   - Optimize images
   - Implement caching

4. **Scaling**
   - Monitor resource usage
   - Scale up as needed
   - Optimize database queries

## 🐛 Troubleshooting

### Backend Issues

**Port Already in Use (EADDRINUSE)**:
```bash
# Windows PowerShell
cd backend
npm run kill-port

# Or manually find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Database Connection Errors**:
- Verify `DATABASE_URL` is correct
- Check Supabase connection pooling settings
- Ensure database is accessible (not paused)
- Run migrations if tables don't exist

**ChromaDB Connection Errors**:
```bash
# Verify ChromaDB is running
docker ps
curl http://localhost:8000/api/v1/heartbeat
```

**OpenAI API Errors**:
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Check API usage limits

### Frontend Issues

**ECONNREFUSED to Backend**:
- Ensure backend is running on `http://localhost:3000`
- Check Vite proxy configuration in `frontend/vite.config.ts`

**Transcription Not Showing**:
- Check browser console for SSE connection errors
- Verify backend SSE endpoint is working
- Check that audio is being uploaded successfully

### n8n Issues

**Email Not Sending**:
- Verify SMTP credentials are correct
- For Gmail: Use App Password (not regular password)
- Check SSL/TLS settings (OFF for port 587, ON for port 465)
- Verify workflow is ACTIVE

**PDF Generation Fails**:
- Check backend PDF endpoint is accessible
- Verify HTTP Request node uses "File" response format (not "Binary")
- Check n8n workflow execution logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📝 License

MIT License

## 🆘 Support

- **Documentation**: See individual README files in each directory
- **Issues**: Open an issue on GitHub

## 🎯 Key Features Implementation

### RAG Integration
- **City Guidance**: RAG retrieves practical information about safety, etiquette, areas to visit
- **Explanations**: All "why" questions are answered using RAG data with citations
- **Citations**: All factual tips have citations from RAG (Wikivoyage/Wikipedia) and OSM sources

### Voice Interface
- **Real-Time Transcription**: Uses OpenAI Whisper API for speech-to-text
- **SSE Streaming**: Live transcript updates via Server-Sent Events
- **Audio Processing**: WebM format support with automatic conversion

### Itinerary Generation
- **Day-Wise Structure**: Morning/Afternoon/Evening blocks
- **POI Discovery**: OpenStreetMap integration for finding points of interest
- **Feasibility**: Automatic validation of travel time and duration
- **Citations**: OSM citations for all POIs included in itinerary

### PDF & Email
- **PDF Generation**: Puppeteer-based HTML to PDF conversion
- **Email Delivery**: n8n workflow for automated email sending
- **Voice Commands**: "Share it to me" or "Send via email" triggers PDF generation

---

Built with ❤️ for intelligent travel planning
