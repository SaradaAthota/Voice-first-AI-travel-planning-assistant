# Voice-First AI Travel Planning Assistant - Backend

Backend API for the voice-first AI travel planning assistant.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: ChromaDB (to be added in later phases)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── db/
│   │   ├── supabase.ts         # Supabase connection utilities
│   │   └── migrate.ts          # Migration runner
│   └── index.ts                # Express app entry point
├── migrations/
│   └── 001_initial_schema.sql  # Database schema
├── package.json
├── tsconfig.json
└── .env.example
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for migrations)
- `DATABASE_URL`: Direct PostgreSQL connection string

### 3. Run Database Migrations

```bash
npm run migrate
```

This will create all required tables in your Supabase database.

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Database Schema

### Tables

1. **trips** - Stores trip requests and preferences
2. **itineraries** - Stores generated itineraries with versioning
3. **transcripts** - Stores conversation transcripts
4. **eval_results** - Stores evaluation results
5. **mcp_logs** - Stores MCP tool call logs

See `migrations/001_initial_schema.sql` for full schema details.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

## Environment Configuration

The app uses environment-based configuration:
- `development` - Local development
- `production` - Production deployment
- `test` - Testing (to be configured)

Configuration is loaded from `src/config/env.ts` and validates required variables on startup.

