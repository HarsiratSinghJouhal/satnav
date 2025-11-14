import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventLocation, CrowdData } from '../types';
import { groupCloseLocations, MapEntity } from '../utils';

// Declare Leaflet global object
declare const L: any;

interface CrowdHeatmapProps {
  locations: EventLocation[];
  crowdData: CrowdData;
  userLocation: GeolocationCoordinates | null;
  selectedLocation: EventLocation | null;
  onLocationSelect: (location: EventLocation | null) => void;
  selectedGroup: EventLocation[] | null;
  onGroupSelect: (group: EventLocation[] | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

// Helper to get heatmap properties - NOW ZOOM-AWARE
const getHeatProperties = (location: EventLocation, count: number, zoom: number) => {
    const percentage = count / location.capacity;
    
    // New color gradient: Blue -> Green -> Amber -> Red for better visual distinction
    let color = 'rgba(59, 130, 246, 0.55)';   // Blue (low)
    let pulseClass = 'pulse-slow';
    let radius = 10 + percentage * 25; 

    if (percentage > 0.75) {
      color = 'rgba(239, 68, 68, 0.7)';     // Red (very high)
      pulseClass = 'pulse-very-fast';
    } else if (percentage > 0.5) {
      color = 'rgba(245, 158, 11, 0.65)';     // Amber (high)
      pulseClass = 'pulse-fast';
    } else if (percentage > 0.25) {
      color = 'rgba(16, 185, 129, 0.6)';   // Emerald/Green (medium)
      pulseClass = 'pulse-medium';
    }
    
    const zoomScale: { [key: number]: number } = {
        16: 1.5,
        17: 1.2,
        18: 1.0,
    };
    
    radius *= (zoomScale[zoom] || 1.0);

    return { color, radius, pulseClass };
};

export const CrowdHeatmap: React.FC<CrowdHeatmapProps> = ({ 
  locations, crowdData, userLocation, selectedLocation, onLocationSelect, 
  selectedGroup, onGroupSelect, zoom, onZoomChange 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any | null>(null);
  const layersRef = useRef<any>({ heat: [], markers: [] });
  const userMarkerRef = useRef<any | null>(null);
  const centeredOnUserRef = useRef(false);

  // Group locations that are closer than 10 meters apart
  const mapEntities = useMemo(() => groupCloseLocations(locations, 10), [locations]);
  const selectedGroupId = useMemo(() => selectedGroup?.map(l => l.id).sort().join('-') || null, [selectedGroup]);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !map) {
      const initialZoom = 17;
      const leafletMap = L.map(mapContainerRef.current, {
        center: [30.355, 76.365], // Thapar Institute center
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
        minZoom: 16,
        maxZoom: 18,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
      }).addTo(leafletMap);
      
      leafletMap.on('click', () => {
        onLocationSelect(null);
        onGroupSelect(null);
      });
      
      leafletMap.on('zoomend', () => {
        onZoomChange(leafletMap.getZoom());
      });

      onZoomChange(initialZoom);
      setMap(leafletMap);
    }
  }, [mapContainerRef, map, onLocationSelect, onGroupSelect, onZoomChange]);

  // Center on user location on first load
  useEffect(() => {
    if (map && userLocation && !centeredOnUserRef.current) {
        map.setView([userLocation.latitude, userLocation.longitude], 18);
        centeredOnUserRef.current = true;
    }
  }, [map, userLocation]);

  // Update user marker on map
  useEffect(() => {
    if (map && userLocation) {
      const { latitude, longitude } = userLocation;
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([latitude, longitude]);
      } else {
        const userMarkerHTML = `
          <div class="relative flex justify-center items-center" style="filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.8));">
            <div class="absolute w-8 h-8 bg-violet-500 rounded-full opacity-75" style="animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;"></div>
            <div class="relative w-4 h-4 bg-violet-400 rounded-full border-2 border-white" style="animation: pulse-dot 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) -.4s infinite;"></div>
          </div>
        `;

        userMarkerRef.current = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: userMarkerHTML,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).addTo(map);
      }
    }
  }, [map, userLocation]);

  // Update heatmap and location markers
  useEffect(() => {
    if (!map) return;

    layersRef.current.heat.forEach((layer: any) => map.removeLayer(layer));
    layersRef.current.markers.forEach((layer: any) => map.removeLayer(layer));
    layersRef.current = { heat: [], markers: [] };

    mapEntities.forEach((entity: MapEntity) => {
      const { latitude, longitude } = entity.coordinates;
      
      // Add heatmap circles for each location within the entity
      entity.locations.forEach(location => {
          const count = crowdData[location.id] || 0;
          if (count > 5) {
            const { color, radius, pulseClass } = getHeatProperties(location, count, zoom);
            const circle = L.circle([location.coordinates.latitude, location.coordinates.longitude], {
              radius: radius, color: 'transparent', fillColor: color, fillOpacity: 1, className: `heatmap-pulse ${pulseClass}`
            }).addTo(map);
            layersRef.current.heat.push(circle);
          }
      });
      
      let markerIcon;

      if (entity.isGroup) {
        const isSelected = selectedGroupId === entity.id;
        const pinHTML = isSelected 
          ? `
            <div class="relative flex justify-center items-center" style="filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.9));">
                <svg viewBox="0 0 384 512" class="w-9 h-12 text-violet-500">
                    <path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0z"/>
                    <circle cx="192" cy="192" r="72" fill="white"/>
                </svg>
                <span class="absolute font-bold text-violet-800 pointer-events-none" style="top: 15px; font-size: 13px;">${entity.locations.length}</span>
            </div>`
          : `
            <div class="relative flex justify-center items-center transform hover:scale-110 transition-transform duration-200 cursor-pointer">
                <svg viewBox="0 0 384 512" class="w-7 h-10 text-orange-700 drop-shadow-lg">
                    <path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0z"/>
                    <circle cx="192" cy="192" r="72" fill="white"/>
                </svg>
                <span class="absolute font-bold text-orange-900 pointer-events-none" style="top: 12px; font-size: 11px;">${entity.locations.length}</span>
            </div>`;

        markerIcon = L.divIcon({
          className: 'location-group-pin',
          html: pinHTML,
          iconSize: isSelected ? [36, 48] : [28, 40],
          iconAnchor: isSelected ? [18, 48] : [14, 40],
        });

      } else { // Single location
          const location = entity.locations[0];
          const isSelected = selectedLocation?.id === location.id;
          const pinHTML = isSelected 
          ? `<div class="relative flex justify-center items-center" style="filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.9));">
               <svg viewBox="0 0 384 512" class="w-9 h-12 text-violet-500">
                  <path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0z"/>
                  <circle cx="192" cy="192" r="64" fill="white"/>
              </svg>
             </div>`
          : `<div class="relative flex justify-center items-center group cursor-pointer">
              <div class="absolute bottom-full mb-2 bg-gray-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap left-1/2 -translate-x-1/2">
                 ${location.name}
              </div>
              <svg viewBox="0 0 384 512" class="w-6 h-8 text-orange-400 drop-shadow-lg">
                  <path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 01-35.464 0z"/>
                  <circle cx="192" cy="192" r="64" fill="white"/>
              </svg>
            </div>`;
        markerIcon = L.divIcon({
          className: 'location-pin',
          html: pinHTML,
          iconSize: isSelected ? [36, 48] : [24, 32],
          iconAnchor: isSelected ? [18, 48] : [12, 32],
        });
      }

      const isEntitySelected = (entity.isGroup && selectedGroupId === entity.id) || (!entity.isGroup && selectedLocation?.id === entity.id);

      const marker = L.marker([latitude, longitude], { icon: markerIcon, zIndexOffset: isEntitySelected ? 1000 : 0 })
        .addTo(map)
        .on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          if (entity.isGroup) {
            onGroupSelect(entity.locations);
          } else {
            onLocationSelect(entity.locations[0]);
          }
        });

      layersRef.current.markers.push(marker);
    });

  }, [map, mapEntities, crowdData, selectedLocation, selectedGroupId, onLocationSelect, onGroupSelect, zoom]);
  
  const centerOnUser = () => {
    if (map && userLocation) {
        map.setView([userLocation.latitude, userLocation.longitude], map.getZoom() < 17 ? 18 : map.getZoom());
    }
  }

  return (
    <div className="w-full h-full absolute top-0 left-0 rounded-lg bg-gray-700 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-70 p-3 rounded-lg text-xs text-gray-300 z-[1000] backdrop-blur-sm border border-gray-700 pointer-events-auto">
          <h4 className="font-bold mb-2 text-white">Heatmap Legend</h4>
          <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2 opacity-70"></div>Low</div>
          <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 opacity-70"></div>Medium</div>
          <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2 opacity-70"></div>High</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2 opacity-70"></div>Very High</div>
        </div>

        <button
          onClick={centerOnUser}
          className="absolute bottom-4 right-4 bg-gray-900 bg-opacity-70 p-3 rounded-full text-white z-[1000] backdrop-blur-sm border border-gray-700 hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 pointer-events-auto"
          aria-label="Center on my location"
          title="Center on my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <circle cx="12" cy="12" r="8"></circle>
              <line x1="12" y1="2" x2="12" y2="4"></line>
              <line x1="12" y1="20" x2="12" y2="22"></line>
              <line x1="2" y1="12" x2="4" y2="12"></line>
              <line x1="20" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
    </div>
  );
};