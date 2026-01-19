-- Migration: Initial Schema
-- Description: Creates all required tables for the voice-first AI travel planning assistant
-- Database: Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: trips
-- Stores trip requests and preferences
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(255) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trips_city ON trips(city);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);

-- Table: itineraries
-- Stores generated itineraries with versioning support
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

-- Indexes for itineraries
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_id ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_trip_active ON itineraries(trip_id, is_active);
CREATE INDEX IF NOT EXISTS idx_itineraries_version ON itineraries(trip_id, version DESC);

-- Table: transcripts
-- Stores conversation transcripts (user and assistant messages)
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_trip_id ON transcripts(trip_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON transcripts(trip_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transcripts_role ON transcripts(trip_id, role);

-- Table: eval_results
-- Stores evaluation results for trips and itineraries
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

-- Indexes for eval_results
CREATE INDEX IF NOT EXISTS idx_eval_results_trip_id ON eval_results(trip_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_itinerary_id ON eval_results(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_type ON eval_results(eval_type);
CREATE INDEX IF NOT EXISTS idx_eval_results_passed ON eval_results(passed);

-- Table: mcp_logs
-- Stores logs of MCP tool calls for debugging and auditing
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

-- Indexes for mcp_logs
CREATE INDEX IF NOT EXISTS idx_mcp_logs_tool_name ON mcp_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_timestamp ON mcp_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_trip_id ON mcp_logs(trip_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at
    BEFORE UPDATE ON itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

