import { CrowdData } from '../types';
import { backendSimulator } from './backendSimulator';

class MockCrowdService {
  public async getCrowdData(): Promise<CrowdData> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return backendSimulator.getCrowdData();
  }

  public reportUserLocation(coords: GeolocationCoordinates): void {
    backendSimulator.updateUserLocation(coords);
  }
  
  public async reportQrScan(qrData: string): Promise<{ success: boolean, message: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      // A simple mock QR data format: {"eventId": "street-fest", "action": "entry" | "exit"}
      const parsedData = JSON.parse(qrData);
      const { eventId, action } = parsedData;

      const location = backendSimulator.findLocation(eventId);
      if (!location) {
         return { success: false, message: `Event '${eventId}' not found.` };
      }

      if (!eventId || !action) {
        return { success: false, message: 'Invalid QR code.' };
      }

      if (action === 'entry') {
        backendSimulator.increment(eventId);
        return { success: true, message: `Checked into ${location.name}!` };
      } else if (action === 'exit') {
        backendSimulator.decrement(eventId);
        return { success: true, message: `Checked out of ${location.name}!` };
      } else {
        return { success: false, message: 'Invalid action in QR code.' };
      }
    } catch (e) {
      return { success: false, message: 'Could not parse QR code data.' };
    }
  }

  public startSimulation(): void {
    backendSimulator.startSimulation();
  }

  public stopSimulation(): void {
    backendSimulator.stopSimulation();
  }
}

export const mockCrowdService = new MockCrowdService();
