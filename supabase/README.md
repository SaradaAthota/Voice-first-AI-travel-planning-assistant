# Supabase Database Deployment Guide

This guide explains how to deploy the PostgreSQL schema to your Supabase project.

---

## 📋 Prerequisites

- ✅ Supabase project created
- ✅ Access to Supabase SQL Editor
- ✅ Project admin permissions

---

## 🚀 Deployment Steps

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### Step 2: Copy Schema File

1. Open `supabase/schema.sql` in this repository
2. **Copy the ENTIRE contents** of the file (Ctrl+A, Ctrl+C / Cmd+A, Cmd+C)
3. **Do NOT copy the verification queries** - those are for after deployment

### Step 3: Paste and Run

1. Paste the SQL into the Supabase SQL Editor
2. Review the SQL to ensure it was pasted completely
3. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
4. Wait for execution to complete (should take 1-2 seconds)

### Step 4: Verify Deployment

1. Go to **"Table Editor"** in the left sidebar
2. Verify these tables exist:
   - ✅ `trips`
   - ✅ `itineraries`
   - ✅ `transcripts`
   - ✅ `eval_results`
   - ✅ `mcp_logs`

3. **Optional:** Run verification queries (see below)

---

## ✅ Verification Queries

After deployment, run these queries in the SQL Editor to verify everything is correct:

### 1. Check All Tables Exist

```sql
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY table_name;
```

**Expected Result:** 5 rows (one for each table)

---

### 2. Check Table Structures

Run these queries to verify column definitions:

#### trips table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trips'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `city` (varchar, NOT NULL)
- `preferences` (jsonb, NOT NULL)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

#### itineraries table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'itineraries'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `trip_id` (uuid, NOT NULL, foreign key to trips.id)
- `version` (integer, NOT NULL)
- `content` (jsonb, NOT NULL)
- `is_active` (boolean, NOT NULL)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

#### transcripts table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transcripts'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `trip_id` (uuid, NOT NULL, foreign key to trips.id)
- `role` (varchar, NOT NULL, CHECK constraint: 'user' or 'assistant')
- `content` (text, NOT NULL)
- `timestamp` (timestamp with time zone)
- `metadata` (jsonb)

#### eval_results table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'eval_results'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `trip_id` (uuid, NOT NULL, foreign key to trips.id)
- `itinerary_id` (uuid, foreign key to itineraries.id)
- `eval_type` (varchar, NOT NULL)
- `result` (jsonb, NOT NULL)
- `passed` (boolean, NOT NULL)
- `created_at` (timestamp with time zone)
- `metadata` (jsonb)

#### mcp_logs table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mcp_logs'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid, NOT NULL)
- `tool_name` (varchar, NOT NULL)
- `input` (jsonb, NOT NULL)
- `output` (jsonb, NOT NULL)
- `timestamp` (timestamp with time zone)
- `trip_id` (uuid, foreign key to trips.id)
- `duration_ms` (integer)
- `error` (text)
- `metadata` (jsonb)

---

### 3. Check Indexes

```sql
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('trips', 'itineraries', 'transcripts', 'eval_results', 'mcp_logs')
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes per table (at least 2-3 per table)

---

### 4. Check Foreign Keys

```sql
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
```

**Expected Foreign Keys:**
- `itineraries.trip_id` → `trips.id`
- `transcripts.trip_id` → `trips.id`
- `eval_results.trip_id` → `trips.id`
- `eval_results.itinerary_id` → `itineraries.id`
- `mcp_logs.trip_id` → `trips.id`

---

### 5. Check Triggers

```sql
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN ('trips', 'itineraries')
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- `update_trips_updated_at` on `trips` table
- `update_itineraries_updated_at` on `itineraries` table

---

## 📊 Database Schema Overview

### Table Relationships

```
trips (1) ──< (many) itineraries
  │
  ├──< (many) transcripts
  │
  ├──< (many) eval_results
  │
  └──< (many) mcp_logs

itineraries (1) ──< (many) eval_results
```

### Key Design Decisions

1. **No Separate `itinerary_days` Table:**
   - Days are stored as JSONB in `itineraries.content`
   - This simplifies queries and maintains data integrity
   - The `content` field contains the full itinerary structure

2. **No Separate `messages` Table:**
   - The `transcripts` table stores both user and assistant messages
   - Distinguished by the `role` column ('user' or 'assistant')
   - This matches the backend code usage

3. **No Separate `conversation_state` Table:**
   - Conversation state is stored in `trips.preferences` JSONB field
   - This includes state, collected fields, and preferences
   - Managed by `ConversationStateManager` in the backend

4. **Versioning Support:**
   - `itineraries` table has `version` column
   - Only one `is_active = true` per trip
   - Allows for itinerary history and rollback

---

## 🔍 Common Issues & Troubleshooting

### Issue 1: "relation already exists"

**Error:** `ERROR: relation "trips" already exists`

**Solution:**
- Tables already exist - this is OK if you're re-running
- The `CREATE TABLE IF NOT EXISTS` prevents errors
- If you need to recreate, drop tables first (see below)

### Issue 2: "extension uuid-ossp does not exist"

**Error:** `ERROR: extension "uuid-ossp" does not exist`

**Solution:**
- Supabase should have this enabled by default
- If not, contact Supabase support or enable it manually:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

### Issue 3: Foreign Key Constraint Errors

**Error:** `ERROR: insert or update on table violates foreign key constraint`

**Solution:**
- Ensure parent records exist before inserting child records
- Check that `trip_id` values reference existing trips

### Issue 4: Verification Queries Return Empty

**Possible Causes:**
- Tables weren't created (check for errors in SQL Editor)
- Wrong schema (ensure you're querying `public` schema)
- Permissions issue (check your Supabase role)

---

## 🗑️ Dropping Tables (If Needed)

⚠️ **WARNING:** This will delete ALL data! Only use if you need to start fresh.

```sql
-- Drop in reverse order of dependencies
DROP TABLE IF EXISTS mcp_logs CASCADE;
DROP TABLE IF EXISTS eval_results CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS itineraries CASCADE;
DROP TABLE IF EXISTS trips CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## 📝 Notes

- **UUID Primary Keys:** All tables use UUID for primary keys (better for distributed systems)
- **JSONB Fields:** Used for flexible data structures (preferences, content, metadata)
- **Timestamps:** All tables have `created_at`, some have `updated_at` with auto-update triggers
- **Cascade Deletes:** Child records are automatically deleted when parent is deleted
- **Indexes:** Optimized for common query patterns (trip_id lookups, timestamp sorting)

---

## ✅ Post-Deployment Checklist

- [ ] All 5 tables created successfully
- [ ] All indexes created
- [ ] Foreign key constraints working
- [ ] Triggers created and working
- [ ] Can insert test data (optional)
- [ ] Backend can connect and query tables

---

## 🔗 Related Files

- `backend/migrations/001_initial_schema.sql` - Original migration file (same content)
- `backend/src/db/supabase.ts` - Database connection code
- `backend/src/orchestration/ConversationStateManager.ts` - Uses `trips` table
- `backend/src/mcp-tools/itinerary-builder/itinerary-builder-tool.ts` - Uses `itineraries` table

---

**Last Updated:** 2024-01-15  
**Schema Version:** 1.0.0

