/**
 * Find a trip that has an active itinerary
 */

import { getSupabaseClient } from './src/db/supabase.js';

async function findTripWithItinerary() {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔍 Searching for trips with active itineraries...\n');
    
    // Get all trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, city, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tripsError) {
      throw tripsError;
    }
    
    if (!trips || trips.length === 0) {
      console.log('❌ No trips found in database.');
      console.log('   Generate an itinerary through the UI first.');
      return null;
    }
    
    console.log(`Found ${trips.length} trip(s). Checking for itineraries...\n`);
    
    // Check each trip for active itinerary
    for (const trip of trips) {
      const { data: itineraries, error: itineraryError } = await supabase
        .from('itineraries')
        .select('id, version, is_active, created_at')
        .eq('trip_id', trip.id)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1);
      
      if (itineraryError) {
        console.error(`Error checking trip ${trip.id}:`, itineraryError.message);
        continue;
      }
      
      if (itineraries && itineraries.length > 0) {
        console.log('✅ Found trip with active itinerary!');
        console.log('='.repeat(60));
        console.log(`Trip ID: ${trip.id}`);
        console.log(`City: ${trip.city || 'N/A'}`);
        console.log(`Created: ${new Date(trip.created_at).toLocaleString()}`);
        console.log(`Itinerary Version: ${itineraries[0].version}`);
        console.log('='.repeat(60));
        console.log(`\n📋 Use this tripId for testing:`);
        console.log(`   ${trip.id}\n`);
        return trip.id;
      } else {
        console.log(`⚠️  Trip ${trip.id.substring(0, 8)}... (${trip.city || 'N/A'}) - No active itinerary`);
      }
    }
    
    console.log('\n❌ No trips with active itineraries found.');
    console.log('\n💡 To generate an itinerary:');
    console.log('   1. Open http://localhost:5173 in your browser');
    console.log('   2. Click the microphone button');
    console.log('   3. Say: "Plan a 2-day trip to New Delhi next week"');
    console.log('   4. Wait for itinerary to be generated');
    console.log('   5. Then run this script again');
    
    return null;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

findTripWithItinerary();

