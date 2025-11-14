import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EVENT_LOCATIONS } from './constants';
import { CrowdData, EventLocation } from './types';
import { CrowdHeatmap } from './components/CrowdHeatmap';
import { DensityCard } from './components/DensityCard';
import { crowdService } from './services/crowdService';
import { QRScanner } from './components/QRScanner';
import { Notification } from './components/Notification';
import { EventFilter } from './components/EventFilter';
import { GroupedEventsCard } from './components/GroupedEventsCard';

const ConnectionStatus: React.FC<{
  gpsStatus: 'requesting' | 'active' | 'error';
  gpsMessage?: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}> = ({ gpsStatus, gpsMessage, connectionStatus }) => {
  // GPS Status Logic
  let gpsStatusColor = 'text-yellow-400';
  let gpsStatusText = 'Requesting Location...';
  if (gpsStatus === 'active') {
    gpsStatusColor = 'text-green-400';
    gpsStatusText = '● Live GPS';
  } else if (gpsStatus === 'error') {
    gpsStatusColor = 'text-red-500';
    gpsStatusText = 'GPS Error';
  }
  
  // Connection Status Logic
  let connStatusColor = 'text-yellow-400';
  let connStatusText = 'Connecting to server...';
  if (connectionStatus === 'connected') {
    connStatusColor = 'text-green-400';
    connStatusText = '● Live Connection';
  } else if (connectionStatus === 'disconnected') {
    connStatusColor = 'text-red-500';
    connStatusText = 'Server Disconnected';
  }

  return (
    <div className="text-center mb-4">
      <div className="flex justify-center items-center space-x-4">
        <p className={`font-semibold ${gpsStatusColor}`}>{gpsStatusText}</p>
        <div className="h-4 w-px bg-gray-600"></div> {/* Separator */}
        <p className={`font-semibold ${connStatusColor}`}>{connStatusText}</p>
      </div>
      {gpsMessage && <p className="text-sm text-gray-400 mt-1">{gpsMessage}</p>}
    </div>
  );
};


const App: React.FC = () => {
  const [crowdData, setCrowdData] = useState<CrowdData>({});
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [gpsStatus, setGpsStatus] = useState<{ status: 'requesting' | 'active' | 'error'; message?: string }>({ status: 'requesting' });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<EventLocation[] | null>(null);
  const [groupContextForSelectedLocation, setGroupContextForSelectedLocation] = useState<EventLocation[] | null>(null);
  const [zoomLevel, setZoomLevel] = useState(17);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isReporting, setIsReporting] = useState(false); // Used for retry button feedback
  const watchIdRef = useRef<number | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<string[]>([]);
  const [activeDateFilters, setActiveDateFilters] = useState<string[]>([]);

  // Memoize unique categories and dates to prevent re-calculation on every render
  const allCategories = useMemo(() => [...new Set(EVENT_LOCATIONS.map(loc => loc.category))], []);
  const allDates = useMemo(() => {
      const datesSet = new Set<string>();
      EVENT_LOCATIONS.forEach(loc => {
          loc.days.forEach(day => datesSet.add(day));
      });
      // Sort dates chronologically
      return Array.from(datesSet).sort((a, b) => parseInt(a.split(' ')[0]) - parseInt(b.split(' ')[0]));
  }, []);

  // Filter locations based on search term and active filters
  const filteredLocations = useMemo(() => {
    return EVENT_LOCATIONS.filter(location => {
      const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategoryFilters.length === 0 || activeCategoryFilters.includes(location.category);
      const matchesDate = activeDateFilters.length === 0 || location.days.some(day => activeDateFilters.includes(day));
      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [searchTerm, activeCategoryFilters, activeDateFilters]);

  useEffect(() => {
    // When filters change, if the currently selected location is no longer in the filtered list, deselect it.
    if (selectedLocation && !filteredLocations.find(loc => loc.id === selectedLocation.id)) {
      setSelectedLocation(null);
    }
    // Also deselect group if its members are filtered out
    if (selectedGroup && !selectedGroup.every(loc => filteredLocations.includes(loc))) {
      setSelectedGroup(null);
    }
  }, [filteredLocations, selectedLocation, selectedGroup]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); // Notifications last for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const startGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setGpsStatus({ status: 'requesting' });
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation(position.coords);
        setGpsStatus({ status: 'active' });
      },
      (error) => {
        let message = "Could not retrieve location. Please enable permissions.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable it in your browser settings to use the live map.";
        }
        setGpsStatus({ status: 'error', message });
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Effect for GPS tracking and real-time data subscription
  useEffect(() => {
    // Subscribe to updates from the real-time service
    crowdService.onCrowdDataUpdate(setCrowdData);
    crowdService.onConnectionStatusUpdate(setConnectionStatus);
    
    // Start GPS tracking
    startGpsTracking();

    return () => {
      // Clean up geolocation watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startGpsTracking]);

  // Effect for reporting user location to the backend
  useEffect(() => {
    if (userLocation) {
      crowdService.reportUserLocation(userLocation);
    }
  }, [userLocation]);
  
  const handleLocationSelect = (location: EventLocation | null, fromGroup: EventLocation[] | null = null) => {
    setSelectedLocation(location);
    setSelectedGroup(null);
    setGroupContextForSelectedLocation(fromGroup);
  };
  
  const handleGroupSelect = (group: EventLocation[] | null) => {
    setSelectedGroup(group);
    setSelectedLocation(null);
    setGroupContextForSelectedLocation(null);
  };

  const handleBackToGroup = () => {
    if (groupContextForSelectedLocation) {
      setSelectedGroup(groupContextForSelectedLocation);
      setSelectedLocation(null);
      setGroupContextForSelectedLocation(null);
    }
  };

  const toggleSimulation = () => {
    if (isSimulationRunning) {
      crowdService.stopSimulation();
    } else {
      crowdService.startSimulation();
    }
    setIsSimulationRunning(!isSimulationRunning);
  };

  const handleManualReport = () => {
    setIsReporting(true);
    startGpsTracking();
    setTimeout(() => setIsReporting(false), 2500);
  };

  const handleQrScan = async (data: string | null) => {
    setIsScannerOpen(false);
    if (data) {
      const result = await crowdService.reportQrScan(data);
      setNotification({
        message: result.message,
        type: result.success ? 'success' : 'error',
      });
    } else {
      console.log("QR scan cancelled or failed.");
    }
  };

  const handleCategoryFilterChange = (category: string) => {
    setActiveCategoryFilters(prevFilters =>
      prevFilters.includes(category)
        ? prevFilters.filter(c => c !== category)
        : [...prevFilters, category]
    );
  };
  
  const handleDateFilterChange = (date: string) => {
    setActiveDateFilters(prevFilters =>
      prevFilters.includes(date)
        ? prevFilters.filter(d => d !== date)
        : [...prevFilters, date]
    );
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActiveCategoryFilters([]);
    setActiveDateFilters([]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Notification
        notification={notification}
        onDismiss={() => setNotification(null)}
      />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8">
            <header className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-violet-600">
                SatNav: Live Crowd Map
              </h1>
              <p className="mt-2 text-lg text-gray-300">Real-time GPS Heatmap for Saturnalia '25</p>
            </header>
            
            <div className="mt-4 sm:mt-0 self-center sm:self-auto z-10 flex space-x-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                title="Scan Event QR Code"
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold py-2 px-5 rounded-lg flex items-center shadow-lg shadow-orange-500/30 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1H5zm7-7a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zm2 7a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zM6 9a1 1 0 01-1-1V6a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H6zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V9a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                Scan QR
              </button>
              <button
                onClick={toggleSimulation}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 border border-gray-600 rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 flex-shrink-0"
              >
                {isSimulationRunning ? '■ Stop Simulation' : '▶ Start Simulation'}
              </button>
            </div>
        </div>

        <main>
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-2 text-orange-300 border-b-2 border-orange-500 pb-2 text-center">Live Crowd Heatmap</h2>
            <ConnectionStatus 
              gpsStatus={gpsStatus.status} 
              gpsMessage={gpsStatus.message} 
              connectionStatus={connectionStatus}
            />
            
            {gpsStatus.status === 'active' && userLocation && (
              <div className="flex flex-col items-center mb-4 -mt-2">
                <p className="text-center text-sm text-gray-400 mb-3">
                  Lat: {userLocation.latitude.toFixed(5)}, Lon: {userLocation.longitude.toFixed(5)}, Zoom: {zoomLevel}
                </p>
              </div>
            )}
            
            {gpsStatus.status === 'error' && (
               <div className="flex flex-col items-center mb-4 -mt-2">
                <button
                  onClick={handleManualReport}
                  disabled={isReporting}
                  className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  {isReporting ? 'Retrying...' : 'Retry Location'}
                </button>
              </div>
            )}

            <EventFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              activeCategoryFilters={activeCategoryFilters}
              onCategoryFilterChange={handleCategoryFilterChange}
              allCategories={allCategories}
              activeDateFilters={activeDateFilters}
              onDateFilterChange={handleDateFilterChange}
              allDates={allDates}
              onClearFilters={handleClearFilters}
            />
            
            <div className="relative min-h-[400px] lg:min-h-[65vh]">
               <CrowdHeatmap
                 locations={filteredLocations}
                 crowdData={crowdData}
                 userLocation={userLocation}
                 selectedLocation={selectedLocation}
                 onLocationSelect={handleLocationSelect}
                 selectedGroup={selectedGroup}
                 onGroupSelect={handleGroupSelect}
                 zoom={zoomLevel}
                 onZoomChange={setZoomLevel}
               />
               {selectedGroup ? (
                 <GroupedEventsCard 
                   group={selectedGroup}
                   crowdData={crowdData}
                   onEventSelect={(location) => handleLocationSelect(location, selectedGroup)}
                   onClose={() => handleGroupSelect(null)}
                 />
               ) : (
                 <DensityCard
                   location={selectedLocation}
                   count={selectedLocation ? crowdData[selectedLocation.id] || 0 : 0}
                   onBack={groupContextForSelectedLocation ? handleBackToGroup : undefined}
                 />
               )}
            </div>
          </div>
        </main>
      </div>
      {isScannerOpen && <QRScanner onScan={handleQrScan} />}
    </div>
  );
};

export default App;