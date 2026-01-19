/**
 * POI Clustering
 * 
 * Clusters POIs by proximity to minimize travel time.
 * 
 * Rules:
 * - Deterministic clustering algorithm
 * - Groups nearby POIs together
 * - Uses Haversine formula for distance calculation
 */

import { POI } from '../poi-search/types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Cluster POIs by proximity
 * 
 * Uses a simple greedy clustering algorithm:
 * 1. Start with first POI as cluster center
 * 2. Add nearby POIs to cluster (within threshold)
 * 3. When cluster is full or no nearby POIs, start new cluster
 * 
 * @param pois Array of POIs to cluster
 * @param maxClusterSize Maximum POIs per cluster
 * @param maxDistance Maximum distance (km) for POIs in same cluster
 * @returns Array of POI clusters
 */
export function clusterPOIsByProximity(
  pois: POI[],
  maxClusterSize: number = 5,
  maxDistance: number = 5 // 5km radius
): POI[][] {
  if (pois.length === 0) {
    return [];
  }

  const clusters: POI[][] = [];
  const used = new Set<number>(); // Track used POI indices

  // Create a copy to avoid mutating original
  const remaining = pois.map((poi, index) => ({ poi, index }));

  while (remaining.length > 0) {
    const cluster: POI[] = [];
    
    // Start with first remaining POI as cluster center
    const center = remaining.shift()!;
    cluster.push(center.poi);
    used.add(center.index);

    // Find nearby POIs
    const nearby: typeof remaining = [];
    for (const item of remaining) {
      const distance = calculateDistance(
        center.poi.coordinates.lat,
        center.poi.coordinates.lon,
        item.poi.coordinates.lat,
        item.poi.coordinates.lon
      );

      if (distance <= maxDistance) {
        nearby.push(item);
      }
    }

    // Sort nearby POIs by distance (closest first)
    nearby.sort((a, b) => {
      const distA = calculateDistance(
        center.poi.coordinates.lat,
        center.poi.coordinates.lon,
        a.poi.coordinates.lat,
        a.poi.coordinates.lon
      );
      const distB = calculateDistance(
        center.poi.coordinates.lat,
        center.poi.coordinates.lon,
        b.poi.coordinates.lat,
        b.poi.coordinates.lon
      );
      return distA - distB;
    });

    // Add nearby POIs to cluster (up to maxClusterSize)
    while (cluster.length < maxClusterSize && nearby.length > 0) {
      const item = nearby.shift()!;
      cluster.push(item.poi);
      used.add(item.index);
    }

    // Remove used POIs from remaining
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (used.has(remaining[i].index)) {
        remaining.splice(i, 1);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Estimate travel time between two POIs
 * 
 * Uses simple distance-based estimation:
 * - Walking: ~5 km/h
 * - City travel: ~30 km/h average (accounting for traffic, stops)
 * 
 * @returns Travel time in minutes
 */
export function estimateTravelTime(
  from: POI,
  to: POI,
  mode: 'walking' | 'driving' = 'driving'
): number {
  const distance = calculateDistance(
    from.coordinates.lat,
    from.coordinates.lon,
    to.coordinates.lat,
    to.coordinates.lon
  );

  if (mode === 'walking') {
    // Walking speed: ~5 km/h = 0.083 km/min
    return Math.ceil(distance / 0.083);
  } else {
    // City driving: ~30 km/h average (accounting for traffic, stops, lights)
    // This is conservative - actual may vary
    return Math.ceil((distance / 30) * 60);
  }
}

/**
 * Sort POIs within a cluster for optimal route
 * 
 * Uses nearest neighbor algorithm (greedy TSP approximation)
 */
export function optimizeClusterRoute(cluster: POI[]): POI[] {
  if (cluster.length <= 1) {
    return cluster;
  }

  const route: POI[] = [];
  const remaining = [...cluster];

  // Start with first POI
  let current = remaining.shift()!;
  route.push(current);

  // Greedily add nearest remaining POI
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.coordinates.lat,
        current.coordinates.lon,
        remaining[i].coordinates.lat,
        remaining[i].coordinates.lon
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    current = remaining.splice(nearestIndex, 1)[0];
    route.push(current);
  }

  return route;
}

