/**
 * Pace Configuration
 * 
 * Defines time constraints and activity limits based on user pace.
 * 
 * Rules:
 * - Deterministic configuration (no LLM)
 * - Ensures feasibility by design
 * - Accounts for travel time and breaks
 */

export interface PaceConfig {
  maxActivitiesPerDay: number;
  maxActivitiesPerBlock: number;
  activityDuration: {
    min: number;                       // Minimum minutes per activity
    max: number;                       // Maximum minutes per activity
    default: number;                   // Default minutes per activity
  };
  travelBuffer: number;                 // Minutes buffer between activities
  blockDurations: {
    morning: { start: string; end: string; maxDuration: number };    // Minutes
    afternoon: { start: string; end: string; maxDuration: number };
    evening: { start: string; end: string; maxDuration: number };
  };
  restTime: number;                    // Minutes of rest between blocks
}

/**
 * Get pace configuration
 */
export function getPaceConfig(pace: 'relaxed' | 'moderate' | 'fast'): PaceConfig {
  switch (pace) {
    case 'relaxed':
      return {
        maxActivitiesPerDay: 4,
        maxActivitiesPerBlock: 2,
        activityDuration: {
          min: 60,      // 1 hour minimum
          max: 180,     // 3 hours maximum
          default: 90,  // 1.5 hours default
        },
        travelBuffer: 30,  // 30 minutes between activities
        blockDurations: {
          morning: { start: '09:00', end: '12:00', maxDuration: 180 },    // 3 hours
          afternoon: { start: '13:00', end: '17:00', maxDuration: 240 },  // 4 hours
          evening: { start: '18:00', end: '21:00', maxDuration: 180 },      // 3 hours
        },
        restTime: 60,  // 1 hour rest between blocks
      };

    case 'moderate':
      return {
        maxActivitiesPerDay: 6,
        maxActivitiesPerBlock: 3,
        activityDuration: {
          min: 45,      // 45 minutes minimum
          max: 120,     // 2 hours maximum
          default: 60,  // 1 hour default
        },
        travelBuffer: 20,  // 20 minutes between activities
        blockDurations: {
          morning: { start: '09:00', end: '12:30', maxDuration: 210 },    // 3.5 hours
          afternoon: { start: '13:30', end: '17:30', maxDuration: 240 },  // 4 hours
          evening: { start: '18:30', end: '21:30', maxDuration: 180 },    // 3 hours
        },
        restTime: 30,  // 30 minutes rest between blocks
      };

    case 'fast':
      return {
        maxActivitiesPerDay: 8,
        maxActivitiesPerBlock: 4,
        activityDuration: {
          min: 30,      // 30 minutes minimum
          max: 90,      // 1.5 hours maximum
          default: 45,  // 45 minutes default
        },
        travelBuffer: 15,  // 15 minutes between activities
        blockDurations: {
          morning: { start: '08:00', end: '12:00', maxDuration: 240 },    // 4 hours
          afternoon: { start: '13:00', end: '18:00', maxDuration: 300 },  // 5 hours
          evening: { start: '19:00', end: '22:00', maxDuration: 180 },    // 3 hours
        },
        restTime: 15,  // 15 minutes rest between blocks
      };

    default:
      // Default to moderate
      return getPaceConfig('moderate');
  }
}

/**
 * Get activity duration based on POI category
 * 
 * Different categories may need different time allocations.
 */
export function getActivityDuration(
  poi: { category: string },
  pace: 'relaxed' | 'moderate' | 'fast'
): number {
  const config = getPaceConfig(pace);
  const baseDuration = config.activityDuration.default;

  // Adjust based on category
  const categoryMultipliers: Record<string, number> = {
    museum: 1.5,        // Museums need more time
    gallery: 1.2,
    historic: 1.3,
    food: 0.8,          // Food places are quicker
    cafe: 0.6,
    shopping: 0.7,
    park: 1.0,
    recreation: 1.1,
  };

  const multiplier = categoryMultipliers[poi.category.toLowerCase()] || 1.0;
  const duration = Math.round(baseDuration * multiplier);

  // Clamp to min/max
  return Math.max(
    config.activityDuration.min,
    Math.min(config.activityDuration.max, duration)
  );
}

