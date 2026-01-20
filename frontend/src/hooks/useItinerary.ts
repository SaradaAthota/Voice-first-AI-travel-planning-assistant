/**
 * useItinerary Hook
 * 
 * Fetches and manages itinerary data.
 */

import { useState, useEffect } from 'react';
import { ItineraryOutput } from '../types/itinerary';
import { getItinerary } from '../services/api';

export interface UseItineraryReturn {
  itinerary: ItineraryOutput | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useItinerary(tripId: string | null): UseItineraryReturn {
  const [itinerary, setItinerary] = useState<ItineraryOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItinerary = async () => {
    if (!tripId) {
      setItinerary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const itineraryData = await getItinerary(tripId);
      setItinerary(itineraryData);
      // Clear error if we successfully got null (no itinerary yet is expected)
      if (itineraryData === null) {
        setError(null);
      }
    } catch (err) {
      // Only log actual errors, not 404s (which are expected)
      if (err instanceof Error && !err.message.includes('404')) {
        console.error('Error fetching itinerary:', err);
        setError(err.message);
      } else {
        // 404 is expected when no itinerary exists yet
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, [tripId]);

  return {
    itinerary,
    loading,
    error,
    refetch: fetchItinerary,
  };
}
