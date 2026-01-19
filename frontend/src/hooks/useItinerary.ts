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
    } catch (err) {
      console.error('Error fetching itinerary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch itinerary');
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
