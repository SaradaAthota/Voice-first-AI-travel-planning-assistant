/**
 * API Service
 * 
 * Handles API calls to backend.
 */

// Use VITE_API_URL in production, fallback to relative path for dev (Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api';

/**
 * Get active itinerary for a trip
 */
export async function getItinerary(tripId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/itinerary`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // No itinerary yet
    }
    throw new Error(`Failed to fetch itinerary: ${response.statusText}`);
  }

  const data = await response.json();
  return data.itinerary;
}

/**
 * Process voice message
 */
export async function processMessage(
  message: string,
  tripId?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      tripId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to process message: ${response.statusText}`);
  }

  return response.json();
}

