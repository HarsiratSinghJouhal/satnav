import { EventLocation } from './types';

// Haversine formula for more accurate distance calculation.
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radius of the Earth in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

export type MapEntity = {
  isGroup: boolean;
  locations: EventLocation[];
  id: string; // A unique ID for the entity (either single location or group)
  coordinates: { latitude: number; longitude: number };
};

// Groups locations that are within a specified distance threshold of each other.
export function groupCloseLocations(locations: EventLocation[], thresholdMeters: number): MapEntity[] {
  const clusters: EventLocation[][] = [];
  const visited = new Set<string>();

  locations.forEach(location => {
    if (visited.has(location.id)) {
      return;
    }

    const currentCluster: EventLocation[] = [location];
    visited.add(location.id);
    
    // Iteratively find all locations belonging to the current cluster
    let addedToCluster: boolean;
    do {
        addedToCluster = false;
        locations.forEach(potentialMember => {
            if (!visited.has(potentialMember.id)) {
                // Check if the potential member is close to any existing member of the cluster
                const isCloseToCluster = currentCluster.some(member => 
                    calculateDistance(
                        member.coordinates.latitude, member.coordinates.longitude,
                        potentialMember.coordinates.latitude, potentialMember.coordinates.longitude
                    ) < thresholdMeters
                );

                if (isCloseToCluster) {
                    currentCluster.push(potentialMember);
                    visited.add(potentialMember.id);
                    addedToCluster = true;
                }
            }
        });
    } while (addedToCluster);

    clusters.push(currentCluster);
  });
  
  // Transform clusters into the MapEntity format for the map component
  return clusters.map(cluster => {
    if (cluster.length > 1) {
      // For groups, calculate average coordinates for the marker position
      const avgLat = cluster.reduce((sum, loc) => sum + loc.coordinates.latitude, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, loc) => sum + loc.coordinates.longitude, 0) / cluster.length;
      return {
        isGroup: true,
        locations: cluster,
        id: cluster.map(l => l.id).sort().join('-'), // Create a stable ID from member IDs
        coordinates: { latitude: avgLat, longitude: avgLon }
      };
    } else {
      // For single locations, just use its own data
      return {
        isGroup: false,
        locations: cluster,
        id: cluster[0].id,
        coordinates: cluster[0].coordinates
      };
    }
  });
}
