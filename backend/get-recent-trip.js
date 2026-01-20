/**
 * Get recent trip IDs from database for testing
 */

import { getSupabaseClient } from './src/db/supabase.js';

async function getRecentTrips() {
  try {
    const supabase = getSupabaseClient();
    
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, city, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    if (!trips || trips.length === 0) {
      console.log('No trips found in database.');
      console.log('Generate an itinerary through the UI first.');
      return;
    }
    
    console.log('Recent trips:');
    console.log('='.repeat(60));
    trips.forEach((trip, index) => {
      console.log(`${index + 1}. Trip ID: ${trip.id}`);
      console.log(`   City: ${trip.city || 'N/A'}`);
      console.log(`   Created: ${new Date(trip.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Check for itineraries
    console.log('Checking for itineraries...');
    for (const trip of trips) {
      const { data: itinerary } = await supabase
        .from('itineraries')
        .select('id, version, is_active')
        .eq('trip_id', trip.id)
        .eq('is_active', true)
        .limit(1);
      
      if (itinerary && itinerary.length > 0) {
        console.log(`✅ Trip ${trip.id} has an active itinerary`);
        console.log(`   Use this tripId for testing: ${trip.id}`);
        return trip.id;
      }
    }
    
    console.log('⚠️  No trips with active itineraries found.');
    console.log('   Generate an itinerary through the UI first.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getRecentTrips();

