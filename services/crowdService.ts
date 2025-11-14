// This is a new file: services/crowdService.ts
// It replaces the old mockCrowdService.ts

import { CrowdData, EventLocation } from '../types';
import { EVENT_LOCATIONS } from '../constants';
import { calculateDistance } from '../utils';

// The global `io` function is available from the socket.io script added to index.html
declare const io: any;

const SERVER_URL = 'https://susanne-rockiest-tensibly.ngrok-free.dev';
// With an update interval of 2 seconds, there are 30 ticks per minute.
// 350 requests/min / 30 ticks/min = ~11.6 requests per tick. We'll use 11 to be safe.
const SIMULATION_BATCH_SIZE = 11; 

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
type CrowdUpdateCallback = (data: CrowdData) => void;
type ConnectionStatusCallback = (status: ConnectionStatus) => void;

/**
 * Manages real-time communication with the backend server for crowd data.
 */
class CrowdService {
  private socket: any | null = null;
  private crowdData: CrowdData = {};
  
  // Callbacks to notify the UI of state changes
  private crowdUpdateCallback: CrowdUpdateCallback | null = null;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;

  private fallbackInterval: number | null = null;
  
  // --- Client-Side Simulation State ---
  private simulationInterval: number | null = null;
  private simulationUpdateQueue: string[] = [];
  private simulationQueueIndex: number = 0;

  // State for GPS-based check-in/out
  private lastCheckedInLocationId: string | null = null;
  private isProcessingLocation: boolean = false; // Prevents race conditions from rapid location updates

  constructor() {
    this.connect();
  }

  // --- Public Subscription Methods ---

  public onCrowdDataUpdate(callback: CrowdUpdateCallback) {
    this.crowdUpdateCallback = callback;
  }

  public onConnectionStatusUpdate(callback: ConnectionStatusCallback) {
    this.connectionStatusCallback = callback;
  }

  // --- Connection Management ---

  private connect() {
    this.connectionStatusCallback?.('connecting');
    this.socket = io(SERVER_URL, {
      transports: ['websocket'] // Prefer WebSocket for performance
    });

    this.socket.on('connect', () => {
      console.log('Connected to real-time server.');
      this.connectionStatusCallback?.('connected');
      this.socket.emit('subscribe_all'); // Subscribe to all event updates
      this.stopFallbackPolling();
    });

    this.socket.on('disconnect', () => {
      console.warn('Disconnected from real-time server. Starting fallback polling.');
      this.connectionStatusCallback?.('disconnected');
      this.startFallbackPolling();
    });

    // --- Data Event Handlers ---

    // For receiving the complete crowd data state (e.g., on initial connect)
    this.socket.on('snapshot', (msg: { counts: CrowdData }) => {
      if (msg && msg.counts) {
        console.log('Received crowd data snapshot:', msg.counts);
        this.crowdData = msg.counts;
        this.crowdUpdateCallback?.(this.crowdData);
      }
    });

    // For receiving incremental, real-time updates for a single location
    this.socket.on('live_count_update', (update: { event_id: string, livecount: number }) => {
      if (update && update.event_id) {
        this.crowdData[update.event_id] = update.livecount;
        // Return a copy to ensure React detects the state change
        this.crowdUpdateCallback?.({ ...this.crowdData });
      }
    });
  }
  
  // --- Fallback Polling for when WebSocket disconnects ---

  private async fetchAllCounts() {
    // The server example doesn't show a bulk fetch endpoint,
    // so we rely on the websocket snapshot upon reconnection.
    console.log("Attempting to reconnect to fetch data...");
  }

  private startFallbackPolling() {
    if (this.fallbackInterval) return; // Avoid multiple intervals
    this.fallbackInterval = window.setInterval(() => this.fetchAllCounts(), 10000); // Poll every 10 seconds
  }
  
  private stopFallbackPolling() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  // --- Helper for Idempotency ---
  private newId(): string {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id_' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * Sends an increment or decrement request to the server for a given event.
   * This is used for single-event actions like QR scans and GPS check-ins.
   */
  private async pushDelta(eventId: string, delta: number) {
    if (delta === 0) return;

    const action = delta > 0 ? 'incr' : 'decr';
    try {
      const idemp = this.newId();
      const url = `${SERVER_URL}/v1/counter/${action}`;
      const payload = { event_id: eventId, delta: Math.abs(delta), idempotency_key: idemp };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.statusText}`);
      }
      
      // Reconcile local state with server response for immediate feedback
      this.crowdData[eventId] = result.livecount;
      this.crowdUpdateCallback?.({ ...this.crowdData });

    } catch (error) {
      console.error(`Failed to push delta (${action}) for ${eventId}:`, error);
    }
  }

  /**
   * Sends a batch of increment/decrement updates to the server in a single request.
   * This is used by the client-side simulation.
   */
  private async pushBatchDeltas(updates: { eventId: string; delta: number }[]) {
    if (updates.length === 0) return;

    try {
      const url = `${SERVER_URL}/v1/counters/batch`;
      const payload = updates.map(update => ({
        event_id: update.eventId,
        delta: update.delta,
        idempotency_key: this.newId(),
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Batch update failed: ${response.statusText}`);
      }

      // Reconcile local state with the server's response from the batch update
      if (result.results && Array.isArray(result.results)) {
        result.results.forEach((item: { event_id: string; livecount: number }) => {
          if (item.event_id) {
            this.crowdData[item.event_id] = item.livecount;
          }
        });
        this.crowdUpdateCallback?.({ ...this.crowdData });
      }

    } catch (error) {
      console.error('Failed to push batch deltas:', error);
    }
  }

  /**
   * Analyzes user location to automatically check them in/out of events.
   */
  public reportUserLocation(coords: GeolocationCoordinates) {
    if (!coords || this.isProcessingLocation) return;

    this.isProcessingLocation = true;

    let closestLocation: EventLocation | null = null;
    let minDistance = Infinity;

    EVENT_LOCATIONS.forEach(location => {
      const distance = calculateDistance(
        coords.latitude, coords.longitude,
        location.coordinates.latitude, location.coordinates.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    });

    const CHECK_IN_RADIUS_METERS = 50;
    let newLocationId: string | null = null;

    if (closestLocation && minDistance < CHECK_IN_RADIUS_METERS) {
      newLocationId = closestLocation.id;
    }

    if (this.lastCheckedInLocationId !== newLocationId) {
      console.log(`Location change detected. Old: ${this.lastCheckedInLocationId}, New: ${newLocationId}`);
      const lastId = this.lastCheckedInLocationId;
      this.lastCheckedInLocationId = newLocationId;

      const promises = [];
      if (lastId) {
        promises.push(this.pushDelta(lastId, -1)); // Check out from old location
      }
      if (newLocationId) {
        promises.push(this.pushDelta(newLocationId, 1)); // Check in to new location
      }

      Promise.all(promises).finally(() => {
        this.isProcessingLocation = false;
      });
    } else {
      this.isProcessingLocation = false;
    }
  }

  public async reportQrScan(qrData: string): Promise<{ success: boolean, message: string }> {
    try {
      let eventId: string;
      // Accommodate QR codes that are either simple strings (event_id) or JSON
      try {
        const parsedData = JSON.parse(qrData);
        eventId = parsedData.eventId;
      } catch (e) {
        eventId = qrData;
      }

      if (!eventId) {
        return { success: false, message: 'Invalid QR Code: Event ID missing.' };
      }

      const idemp = this.newId();
      // Per the user request, a scan is a check-in (increment)
      const url = `${SERVER_URL}/v1/counter/incr`;
      const payload = { event_id: eventId, delta: 1, idempotency_key: idemp };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.statusText}`);
      }

      const event = EVENT_LOCATIONS.find(loc => loc.id === eventId);
      const eventName = event ? event.name : `event ${eventId}`;

      // Reconcile local state with server response
      this.crowdData[eventId] = result.livecount;
      this.crowdUpdateCallback?.({ ...this.crowdData });

      return { success: true, message: `Successfully checked into ${eventName}!` };

    } catch (error: any) {
      console.error('QR scan reporting failed:', error);
      return { success: false, message: error.message || 'QR scan failed.' };
    }
  }

  // --- Client-Side Simulation ---

  private getTargetCrowdPercentage(popularity: number): number {
    const POPULARITY_THRESHOLD = 0.6;
    const LOW_POP_MIN = 0.10, LOW_POP_MAX = 0.40;
    const HIGH_POP_MIN = 0.75, HIGH_POP_MAX = 0.85;

    if (popularity < POPULARITY_THRESHOLD) {
      const normalizedPop = popularity / POPULARITY_THRESHOLD;
      return LOW_POP_MIN + normalizedPop * (LOW_POP_MAX - LOW_POP_MIN);
    } else {
      const normalizedPop = (popularity - POPULARITY_THRESHOLD) / (1 - POPULARITY_THRESHOLD);
      return HIGH_POP_MIN + normalizedPop * (HIGH_POP_MAX - HIGH_POP_MIN);
    }
  }

  /**
   * Calculates crowd changes and sends them as a single batch update.
   */
  private simulateCrowdMovement() {
    if (this.simulationUpdateQueue.length === 0) return;

    const batchUpdates: { eventId: string; delta: number }[] = [];
    
    // Determine which events to update in this tick's batch
    const batchOfEventIds: string[] = [];
    for (let i = 0; i < SIMULATION_BATCH_SIZE; i++) {
        if (this.simulationQueueIndex >= this.simulationUpdateQueue.length) {
            // Reached the end of the queue, reshuffle and start over
            this.simulationQueueIndex = 0;
            this.simulationUpdateQueue.sort(() => Math.random() - 0.5);
        }
        batchOfEventIds.push(this.simulationUpdateQueue[this.simulationQueueIndex]);
        this.simulationQueueIndex++;
    }

    // Calculate the deltas for the batch
    batchOfEventIds.forEach(eventId => {
      const location = EVENT_LOCATIONS.find(loc => loc.id === eventId);
      if (!location) return;

      const currentCount = this.crowdData[location.id] || 0;
      const targetPercentage = this.getTargetCrowdPercentage(location.popularity);
      const targetCount = location.capacity * targetPercentage;
      const diff = targetCount - currentCount;
      const correctionChange = diff * 0.1;
      const randomNoise = (Math.random() * 2 - 1) * location.capacity * 0.015;
      let change = correctionChange + randomNoise;
      const maxChangePerTick = location.capacity * 0.025;
      change = Math.max(-maxChangePerTick, Math.min(maxChangePerTick, change));
      let newCount = currentCount + change;
      newCount = Math.max(0, Math.min(location.capacity, newCount));
      const finalDelta = Math.round(newCount) - currentCount;

      if (finalDelta !== 0) {
        batchUpdates.push({ eventId: location.id, delta: finalDelta });
      }
    });

    // Send the entire batch in a single API call
    if (batchUpdates.length > 0) {
      this.pushBatchDeltas(batchUpdates).catch(err => {
        console.error("Error during simulation batch push:", err);
      });
    }
  }

  public startSimulation() {
    console.log(`Starting client-side simulation (batch size: ${SIMULATION_BATCH_SIZE})...`);
    if (this.simulationInterval) return;

    // Initialize and shuffle the queue of events to update
    this.simulationUpdateQueue = EVENT_LOCATIONS.map(loc => loc.id).sort(() => Math.random() - 0.5);
    this.simulationQueueIndex = 0;

    this.simulationInterval = window.setInterval(() => {
      this.simulateCrowdMovement();
    }, 2000);
  }

  public stopSimulation() {
    console.log('Stopping client-side simulation...');
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    // Clear the simulation state
    this.simulationUpdateQueue = [];
    this.simulationQueueIndex = 0;
  }
}

// Export a singleton instance of the service
export const crowdService = new CrowdService();