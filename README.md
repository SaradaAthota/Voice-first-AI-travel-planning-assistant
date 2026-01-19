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

## 🚢 Deployment

### Backend (Render)

1. Connect GitHub repository
2. Select `backend` directory
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add all environment variables from `backend/.env`

### Frontend (Vercel)

1. Import project from GitHub
2. Select `frontend` directory
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add `VITE_API_URL` environment variable

### ChromaDB

Deploy ChromaDB container with persistent storage (Docker, Railway, or similar).

### n8n (Railway)

1. Create new Railway project
2. Add n8n service
3. Import workflow from `n8n/workflow-itinerary-pdf-email.json`
4. Configure SMTP credentials
5. Get webhook URL and add to backend environment variables

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
