-- ============================================================================
-- Supabase Database Verification Queries
-- Run these AFTER deploying schema.sql to verify everything is correct
-- ============================================================================

-- ============================================================================
-- 1. Verify All Tables Exist
-- Expected: 5 rows
-- ============================================================================
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'trips' THEN '✅ Main table for trip requests'
        WHEN table_name = 'itineraries' THEN '✅ Stores generated itineraries'
        WHEN table_name = 'transcripts' THEN '✅ Stores conversation messages'
        WHEN table_name = 'eval_results' THEN '✅ Stores evaluation results'
        WHEN table_name = 'mcp_logs' THEN '✅ Stores MCP tool call logs'
        ELSE '❓ Unknown table'
    END AS description
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY table_name;

-- ============================================================================
-- 2. Verify Table Structures
-- ============================================================================

-- trips table structure
SELECT 
    'trips' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trips'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- itineraries table structure
SELECT 
    'itineraries' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'itineraries'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- transcripts table structure
SELECT 
    'transcripts' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transcripts'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- eval_results table structure
SELECT 
    'eval_results' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'eval_results'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- mcp_logs table structure
SELECT 
    'mcp_logs' AS table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mcp_logs'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. Verify Indexes
-- Expected: Multiple indexes per table
-- ============================================================================
SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE 'idx_%_trip_id%' THEN '✅ Trip lookup index'
        WHEN indexname LIKE 'idx_%_timestamp%' OR indexname LIKE 'idx_%_created_at%' THEN '✅ Time-based index'
        WHEN indexname LIKE 'idx_%_active%' THEN '✅ Active record index'
        WHEN indexname LIKE '%_pkey' THEN '✅ Primary key index'
        ELSE '✅ General index'
    END AS index_purpose
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tablename, indexname;

-- ============================================================================
-- 4. Verify Foreign Key Constraints
-- Expected: 5 foreign keys
-- ============================================================================
SELECT
    tc.table_name AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column,
    CASE 
        WHEN tc.table_name = 'itineraries' AND kcu.column_name = 'trip_id' THEN '✅ Itineraries → Trips'
        WHEN tc.table_name = 'transcripts' AND kcu.column_name = 'trip_id' THEN '✅ Transcripts → Trips'
        WHEN tc.table_name = 'eval_results' AND kcu.column_name = 'trip_id' THEN '✅ Eval Results → Trips'
        WHEN tc.table_name = 'eval_results' AND kcu.column_name = 'itinerary_id' THEN '✅ Eval Results → Itineraries'
        WHEN tc.table_name = 'mcp_logs' AND kcu.column_name = 'trip_id' THEN '✅ MCP Logs → Trips'
        ELSE '✅ Foreign key'
    END AS relationship
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

-- ============================================================================
-- 5. Verify Triggers
-- Expected: 2 triggers
-- ============================================================================
SELECT
    trigger_name,
    event_object_table AS table_name,
    action_timing AS timing,
    event_manipulation AS event,
    CASE 
        WHEN trigger_name = 'update_trips_updated_at' THEN '✅ Auto-updates trips.updated_at'
        WHEN trigger_name = 'update_itineraries_updated_at' THEN '✅ Auto-updates itineraries.updated_at'
        ELSE '✅ Trigger'
    END AS purpose
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('trips', 'itineraries')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 6. Verify Constraints
-- ============================================================================

-- Check CHECK constraints (e.g., transcripts.role)
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause,
    CASE 
        WHEN tc.table_name = 'transcripts' AND cc.check_clause LIKE '%role%' THEN '✅ Ensures role is user or assistant'
        ELSE '✅ Check constraint'
    END AS purpose
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tc.table_name;

-- Check UNIQUE constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    CASE 
        WHEN tc.table_name = 'itineraries' AND kcu.column_name = 'trip_id' THEN '✅ Ensures unique trip_id + version'
        ELSE '✅ Unique constraint'
    END AS purpose
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 7. Test Data Insertion (Optional - for testing)
-- ============================================================================

-- Uncomment to test data insertion:
/*
-- Insert a test trip
INSERT INTO trips (city, preferences)
VALUES ('Test City', '{"duration": 2, "pace": "moderate"}'::jsonb)
RETURNING id, city, created_at;

-- Insert a test transcript
INSERT INTO transcripts (trip_id, role, content)
SELECT 
    id,
    'user',
    'Test message'
FROM trips
WHERE city = 'Test City'
LIMIT 1
RETURNING id, trip_id, role, content, timestamp;

-- Clean up test data
DELETE FROM transcripts WHERE trip_id IN (SELECT id FROM trips WHERE city = 'Test City');
DELETE FROM trips WHERE city = 'Test City';
*/

-- ============================================================================
-- 8. Summary Report
-- ============================================================================
SELECT 
    'Database Schema Verification Summary' AS report,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')) AS tables_count,
    (SELECT COUNT(*) FROM pg_indexes 
     WHERE schemaname = 'public' 
     AND tablename IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')) AS indexes_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE constraint_type = 'FOREIGN KEY' 
     AND table_schema = 'public' 
     AND table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')) AS foreign_keys_count,
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE trigger_schema = 'public' 
     AND event_object_table IN ('trips', 'itineraries')) AS triggers_count;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================

