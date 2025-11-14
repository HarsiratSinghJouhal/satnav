export interface EventLocation {
  id: string;
  name: string;
  capacity: number;
  details: string;
  popularity: number; // A score from 0 to 1 indicating event popularity
  date: string; // The original display string e.g., "13-16 November"
  days: string[]; // Parsed days for filtering e.g., ["13 Nov", "14 Nov"]
  venue: string;
  category: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface CrowdData {
  [locationId: string]: number;
}