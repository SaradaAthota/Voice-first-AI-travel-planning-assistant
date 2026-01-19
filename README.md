# Voice-First AI Travel Planning Assistant

An intelligent travel planning assistant that uses voice input to create personalized travel itineraries with real-time transcription, AI-powered recommendations, and automated PDF generation with email delivery.

## 🚀 Features

- **Voice-First Interface**: Record your travel preferences using natural speech
- **Real-Time Transcription**: Live transcript display with Server-Sent Events (SSE)
- **AI-Powered Itinerary Generation**: Creates day-by-day itineraries based on your preferences
- **RAG-Enhanced Recommendations**: Retrieves relevant travel information from knowledge base
- **POI Discovery**: Finds Points of Interest using OpenStreetMap data
- **Automatic Evaluations**: Validates feasibility, edit correctness, and grounding
- **PDF Generation**: Automatically generates and emails beautiful PDF itineraries
- **Responsive UI**: Clean, modern interface with day-wise itinerary display

## 📋 Tech Stack

### Frontend
- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **MediaRecorder API** for voice recording
- **Server-Sent Events (SSE)** for real-time updates

### Backend
- **Node.js** + **TypeScript** + **Express.js**
- **OpenAI API** for LLM and embeddings
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

Run database migrations:

```bash
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

Start ChromaDB using Docker Compose:

```bash
docker-compose up -d chromadb
```

ChromaDB will be available at `http://localhost:8000`

### 5. n8n Workflow Setup (Optional)

1. Import the workflow from `n8n/workflow-itinerary-pdf-email.json`
2. Configure SMTP credentials for email sending
3. Update the workflow to use the backend PDF endpoint (see `n8n/README.md`)
4. Copy the webhook URL and add it to `backend/.env` as `N8N_WEBHOOK_URL`

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

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173` in your browser
4. Click the microphone button to start recording
5. Speak your travel preferences (e.g., "I want to visit Jaipur for 3 days")
6. View the generated itinerary
7. Test PDF generation and email delivery

## 📚 API Endpoints

### Voice
- `POST /api/voice/upload` - Upload audio chunk
- `GET /api/voice/transcript/:sessionId` - SSE stream for transcript
- `POST /api/voice/complete` - Complete voice session
- `GET /api/voice/session/new` - Create new session

### Trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip

### Itinerary
- `GET /api/itinerary/:tripId` - Get itinerary for trip
- `POST /api/itinerary/generate` - Generate itinerary
- `POST /api/itinerary/edit` - Edit itinerary

### Explanations
- `POST /api/explanations` - Get explanation for POI or activity

### Evaluations
- `POST /api/evaluations/feasibility` - Run feasibility evaluation
- `POST /api/evaluations/edit-correctness` - Run edit correctness evaluation
- `POST /api/evaluations/grounding` - Run grounding evaluation

### PDF
- `POST /api/pdf/generate-pdf` - Generate PDF from HTML

## 🔧 Configuration

### Environment Variables

See `backend/.env.example` for all required environment variables.

### Supabase Setup

1. Create a new Supabase project
2. Get your project URL and API keys from Settings → API
3. Get your database connection string from Settings → Database
4. Run migrations: `cd backend && npm run migrate`

### OpenAI Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com)
2. Add it to `backend/.env` as `OPENAI_API_KEY`

### n8n Setup

See `n8n/README.md` for detailed n8n workflow setup instructions.

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
- **Deployment**: See `DEPLOYMENT.md`
- **Troubleshooting**: See `TROUBLESHOOTING.md`

## 🚢 Deployment

### Backend (Render)

1. Connect GitHub repository
2. Select `backend` directory
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add all environment variables

### Frontend (Vercel)

1. Import project from GitHub
2. Select `frontend` directory
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add `VITE_API_URL` environment variable

### ChromaDB

Deploy ChromaDB container with persistent storage.

### n8n (Railway)

1. Create new Railway project
2. Add n8n service
3. Import workflow
4. Configure SMTP credentials
5. Get webhook URL

See `DEPLOYMENT.md` for detailed deployment instructions.

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
- **Troubleshooting**: See `TROUBLESHOOTING.md`
- **Issues**: Open an issue on GitHub

## 🎯 Project Phases

This project was developed in phases:

- **Phase 1-3**: Foundation and database setup
- **Phase 4-6**: MCP tools and orchestration
- **Phase 7-8**: RAG integration and itinerary generation
- **Phase 9**: Explanation handling
- **Phase 10**: Evaluation system
- **Phase 11**: Companion UI
- **Phase 12**: PDF generation and email
- **Phase 13**: Testing and deployment

## 🔐 Security

- All API keys stored in environment variables
- HTTPS required for production
- CORS configured for frontend origin
- Input validation on all endpoints
- SQL injection prevention via parameterized queries

---

Built with ❤️ for intelligent travel planning

