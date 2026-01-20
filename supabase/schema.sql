-- ============================================================================
-- Supabase Database Schema
-- Voice-first AI Travel Planning Assistant
-- ============================================================================
-- 
-- This schema creates all required tables for the application.
-- 
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- 6. Verify tables were created (see verification queries below)
--
-- ============================================================================

-- Enable UUID extension (required for UUID primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: trips
-- Purpose: Stores trip requests and conversation state
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(255) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for trips table
CREATE INDEX IF NOT EXISTS idx_trips_city ON trips(city);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_updated_at ON trips(updated_at DESC);

-- ============================================================================
-- Table: itineraries
-- Purpose: Stores generated itineraries with versioning support
-- Note: Days are stored as JSONB in the content field, not in a separate table
-- ============================================================================
CREATE TABLE IF NOT EXISTS itineraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, version)
);

-- Indexes for itineraries table
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_active ON itineraries(trip_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_itineraries_version ON itineraries(trip_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at DESC);

-- ============================================================================
-- Table: transcripts
-- Purpose: Stores conversation transcripts (user and assistant messages)
-- Note: This replaces "messages" table - stores both user and assistant messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for transcripts table
CREATE INDEX IF NOT EXISTS idx_transcripts_trip_id ON transcripts(trip_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(trip_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_role ON transcripts(trip_id, role);
CREATE INDEX IF NOT EXISTS idx_transcripts_trip_role ON transcripts(trip_id, role, timestamp DESC);

-- ============================================================================
-- Table: eval_results
-- Purpose: Stores evaluation results for trips and itineraries
-- ============================================================================
CREATE TABLE IF NOT EXISTS eval_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE SET NULL,
    eval_type VARCHAR(100) NOT NULL,
    result JSONB NOT NULL,
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for eval_results table
CREATE INDEX IF NOT EXISTS idx_eval_results_trip_id ON eval_results(trip_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_itinerary_id ON eval_results(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_type ON eval_results(eval_type);
CREATE INDEX IF NOT EXISTS idx_eval_results_passed ON eval_results(passed);
CREATE INDEX IF NOT EXISTS idx_eval_results_created_at ON eval_results(created_at DESC);

-- ============================================================================
-- Table: mcp_logs
-- Purpose: Stores logs of MCP tool calls for debugging and auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS mcp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_name VARCHAR(255) NOT NULL,
    input JSONB NOT NULL,
    output JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    duration_ms INTEGER,
    error TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Indexes for mcp_logs table
CREATE INDEX IF NOT EXISTS idx_mcp_logs_tool_name ON mcp_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_timestamp ON mcp_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_trip_id ON mcp_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_tool_timestamp ON mcp_logs(tool_name, timestamp DESC);

-- ============================================================================
-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp on row updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers: Auto-update updated_at timestamps
-- ============================================================================
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;
CREATE TRIGGER update_itineraries_updated_at
    BEFORE UPDATE ON itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after deployment to verify tables were created correctly
-- ============================================================================

-- Verify all tables exist
-- Expected: 5 rows (trips, itineraries, transcripts, eval_results, mcp_logs)
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY table_name;

-- Verify table structures
-- Run each query to see column definitions:

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'trips'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'itineraries'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'transcripts'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'eval_results'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'mcp_logs'
-- ORDER BY ordinal_position;

-- Verify indexes
-- Expected: Multiple indexes per table
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tablename, indexname;

-- Verify foreign key constraints
-- Expected: 4 foreign keys (itineraries.trip_id, transcripts.trip_id, eval_results.trip_id, eval_results.itinerary_id, mcp_logs.trip_id)
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tc.table_name, kcu.column_name;

-- Verify triggers
-- Expected: 2 triggers (update_trips_updated_at, update_itineraries_updated_at)
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('trips', 'itineraries')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================



