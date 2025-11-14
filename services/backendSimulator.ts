import { EVENT_LOCATIONS } from '../constants';
import { CrowdData, EventLocation } from '../types';
import { calculateDistance } from '../utils';

class BackendSimulator {
  private crowdData: CrowdData = {};
  private simulationInterval: number | null = null;
  private lastUserLocation: GeolocationCoordinates | null = null;
  private lastLocationId: string | null = null;

  constructor() {
    this.initializeCrowdData();
  }

  /**
   * Determines the target crowd percentage based on event popularity.
   * - Less popular events (popularity < 0.6) target 10-40% capacity.
   * - More popular events (popularity >= 0.6) target 75-85% capacity.
   */
  private getTargetCrowdPercentage(popularity: number): number {
    const POPULARITY_THRESHOLD = 0.6; // Events with popularity >= 6/10 are "popular"
    const LOW_POP_MIN = 0.10; // 10%
    const LOW_POP_MAX = 0.40; // 40%
    const HIGH_POP_MIN = 0.75; // 75%
    const HIGH_POP_MAX = 0.85; // 85%

    if (popularity < POPULARITY_THRESHOLD) {
      // Scale popularity within the low range [0, 0.6) -> [10%, 40%]
      const normalizedPop = popularity / POPULARITY_THRESHOLD;
      return LOW_POP_MIN + normalizedPop * (LOW_POP_MAX - LOW_POP_MIN);
    } else {
      // Scale popularity within the high range [0.6, 1.0] -> [75%, 85%]
      const normalizedPop = (popularity - POPULARITY_THRESHOLD) / (1 - POPULARITY_THRESHOLD);
      return HIGH_POP_MIN + normalizedPop * (HIGH_POP_MAX - HIGH_POP_MIN);
    }
  }

  private initializeCrowdData() {
    EVENT_LOCATIONS.forEach(location => {
      const targetPercentage = this.getTargetCrowdPercentage(location.popularity);
      // Initialize with a slight random variation (+/- 2.5%) around the target
      const initialPercentage = targetPercentage + (Math.random() * 0.05 - 0.025);
      this.crowdData[location.id] = Math.floor(location.capacity * Math.max(0, initialPercentage));
    });
  }

  public getCrowdData(): CrowdData {
    // Return a copy to prevent direct mutation of the state
    return { ...this.crowdData };
  }
  
  public findLocation(locationId: string): EventLocation | undefined {
    return EVENT_LOCATIONS.find(loc => loc.id === locationId);
  }

  public startSimulation() {
    if (this.simulationInterval) return;
    this.simulationInterval = window.setInterval(() => {
      this.simulateCrowdMovement();
    }, 2000); // Update every 2 seconds
  }

  public stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private simulateCrowdMovement() {
    EVENT_LOCATIONS.forEach(location => {
      const currentCount = this.crowdData[location.id] || 0;
      const targetPercentage = this.getTargetCrowdPercentage(location.popularity);
      const targetCount = location.capacity * targetPercentage;

      // Calculate the difference between current and target count
      const diff = targetCount - currentCount;

      // 1. A "pull" towards the target: move a fraction of the distance to the target each tick.
      // This creates a smooth drift towards the target population.
      const correctionFactor = 0.1;
      const correctionChange = diff * correctionFactor;
      
      // 2. A small random fluctuation to simulate natural crowd movement.
      // This is a much smaller percentage than before to prevent jumps.
      const noisePercentage = 0.015; // +/- 1.5% of capacity
      const randomNoise = (Math.random() * 2 - 1) * location.capacity * noisePercentage;

      // Combine the pull and the noise
      let delta = correctionChange + randomNoise;

      // 3. Cap the maximum change per tick to ensure smoothness.
      // This prevents any single update from being too drastic.
      const maxChangePerTick = location.capacity * 0.025; // Max 2.5% change per 2 seconds
      delta = Math.max(-maxChangePerTick, Math.min(maxChangePerTick, delta));

      let newCount = currentCount + delta;

      // Ensure count is within bounds (0 to capacity) and is an integer
      newCount = Math.floor(Math.max(0, Math.min(location.capacity, newCount)));
      
      this.crowdData[location.id] = newCount;
    });
  }

  public updateUserLocation(coords: GeolocationCoordinates) {
    if (!coords) return;

    let closestLocation: EventLocation | null = null;
    let minDistance = Infinity;

    EVENT_LOCATIONS.forEach(location => {
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        location.coordinates.latitude,
        location.coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    });

    // Check if user is within a 50m radius to be considered "at" a location
    if (closestLocation && minDistance < 50) {
      const newLocationId = closestLocation.id;
      // If user moved from one event to another
      if (this.lastLocationId && this.lastLocationId !== newLocationId) {
        this.decrement(this.lastLocationId); // "Check out" from old location
      }
      // If user is at a new location (or first time reporting)
      if (this.lastLocationId !== newLocationId) {
        this.increment(newLocationId); // "Check in" to new location
        this.lastLocationId = newLocationId;
      }
    } else {
      // User is not near any event, "check out" from the last one
      if (this.lastLocationId) {
        this.decrement(this.lastLocationId);
        this.lastLocationId = null;
      }
    }
    this.lastUserLocation = coords;
  }
  
  public increment(locationId: string) {
    const location = EVENT_LOCATIONS.find(loc => loc.id === locationId);
    if (location && this.crowdData[locationId] < location.capacity) {
      this.crowdData[locationId]++;
    }
  }

  public decrement(locationId: string) {
    if (this.crowdData[locationId] > 0) {
      this.crowdData[locationId]--;
    }
  }
}

// Export a singleton instance of the simulator
export const backendSimulator = new BackendSimulator();