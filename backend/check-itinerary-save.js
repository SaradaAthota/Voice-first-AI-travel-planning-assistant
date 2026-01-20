/**
 * Check why itineraries are not being saved
 * This script will check:
 * 1. If trips exist
 * 2. If itineraries table exists and has correct schema
 * 3. If there are any save errors in recent logs
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItinerarySave() {
  console.log('🔍 Checking why itineraries are not being saved...\n');
  console.log('='.repeat(60));
  
  // 1. Check if trips exist
  console.log('\n1. Checking trips table...');
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, city, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (tripsError) {
    console.error('❌ Error querying trips:', tripsError.message);
    console.error('   This might indicate the trips table does not exist or has wrong schema');
    return;
  }
  
  if (!trips || trips.length === 0) {
    console.log('⚠️  No trips found in database');
    console.log('   This is expected if you haven\'t created any trips yet');
  } else {
    console.log(`✅ Found ${trips.length} trip(s)`);
    trips.forEach((trip, i) => {
      console.log(`   ${i + 1}. ${trip.id.substring(0, 8)}... - ${trip.city || 'Unknown'} - ${new Date(trip.created_at).toLocaleString()}`);
    });
  }
  
  // 2. Check if itineraries table exists and structure
  console.log('\n2. Checking itineraries table...');
  const { data: itineraries, error: itinerariesError } = await supabase
    .from('itineraries')
    .select('id, trip_id, version, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (itinerariesError) {
    console.error('❌ Error querying itineraries:', itinerariesError.message);
    console.error('   Code:', itinerariesError.code);
    console.error('   Details:', itinerariesError.details);
    console.error('   Hint:', itinerariesError.hint);
    console.error('\n💡 This might indicate:');
    console.error('   - The itineraries table does not exist');
    console.error('   - The table schema is incorrect');
    console.error('   - RLS (Row Level Security) is blocking access');
    console.error('\n   Fix: Run the migration script in Supabase SQL Editor:');
    console.error('   backend/migrations/001_initial_schema.sql');
    return;
  }
  
  if (!itineraries || itineraries.length === 0) {
    console.log('⚠️  No itineraries found in database');
    console.log('   This is the problem - itineraries are not being saved');
  } else {
    console.log(`✅ Found ${itineraries.length} itinerary/ies`);
    itineraries.forEach((it, i) => {
      console.log(`   ${i + 1}. Trip: ${it.trip_id.substring(0, 8)}... - Version: ${it.version} - Active: ${it.is_active}`);
    });
  }
  
  // 3. Check for trips without itineraries
  console.log('\n3. Checking trips without itineraries...');
  if (trips && trips.length > 0) {
    for (const trip of trips) {
      const { data: tripItineraries } = await supabase
        .from('itineraries')
        .select('id')
        .eq('trip_id', trip.id)
        .limit(1);
      
      if (!tripItineraries || tripItineraries.length === 0) {
        console.log(`   ⚠️  Trip ${trip.id.substring(0, 8)}... (${trip.city || 'Unknown'}) - NO ITINERARY`);
      }
    }
  }
  
  // 4. Check mcp_logs for itinerary_builder calls
  console.log('\n4. Checking MCP logs for itinerary_builder calls...');
  const { data: mcpLogs, error: mcpLogsError } = await supabase
    .from('mcp_logs')
    .select('tool_name, trip_id, success, error, timestamp')
    .eq('tool_name', 'itinerary_builder')
    .order('timestamp', { ascending: false })
    .limit(10);
  
  if (mcpLogsError) {
    console.log('⚠️  Could not check mcp_logs (table might not exist or RLS issue)');
  } else if (!mcpLogs || mcpLogs.length === 0) {
    console.log('⚠️  No itinerary_builder tool calls found in logs');
    console.log('   This means the itinerary_builder tool is not being called');
    console.log('   Possible reasons:');
    console.log('   - ToolOrchestrator is not calling the tool');
    console.log('   - Intent classification is not triggering tool calls');
    console.log('   - Not enough preferences collected (city, duration)');
  } else {
    console.log(`✅ Found ${mcpLogs.length} itinerary_builder call(s)`);
    mcpLogs.forEach((log, i) => {
      console.log(`   ${i + 1}. Trip: ${log.trip_id ? log.trip_id.substring(0, 8) + '...' : 'NO TRIP ID'} - Success: ${log.success} - ${new Date(log.timestamp).toLocaleString()}`);
      if (log.error) {
        console.log(`      Error: ${log.error}`);
      }
      if (!log.trip_id) {
        console.log(`      ⚠️  WARNING: No tripId in tool call - itinerary will NOT be saved!`);
      }
    });
  }
  
  // 5. Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY AND RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (itinerariesError) {
    console.log('\n❌ CRITICAL: itineraries table issue');
    console.log('   → Run migration: backend/migrations/001_initial_schema.sql');
  } else if (!itineraries || itineraries.length === 0) {
    if (mcpLogs && mcpLogs.length > 0) {
      const logsWithoutTripId = mcpLogs.filter(log => !log.trip_id);
      if (logsWithoutTripId.length > 0) {
        console.log('\n❌ PROBLEM FOUND: itinerary_builder is being called WITHOUT tripId');
        console.log('   → The tool needs tripId to save the itinerary');
        console.log('   → Check ToolOrchestrator.ts - ensure tripId is passed in toolInput');
        console.log('   → Check if context.tripId is set before calling itinerary_builder');
      } else {
        console.log('\n⚠️  itinerary_builder is being called with tripId, but save is failing');
        console.log('   → Check backend logs for "Failed to save itinerary" errors');
        console.log('   → Check database permissions and RLS policies');
      }
    } else {
      console.log('\n⚠️  itinerary_builder tool is not being called');
      console.log('   → Ensure you provide city and duration in your voice input');
      console.log('   → Check backend logs for tool call decisions');
    }
  } else {
    console.log('\n✅ Itineraries are being saved correctly!');
  }
  
  console.log('\n');
}

checkItinerarySave().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

