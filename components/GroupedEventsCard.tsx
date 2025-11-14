import React from 'react';
import { EventLocation, CrowdData } from '../types';

interface GroupedEventsCardProps {
  group: EventLocation[];
  crowdData: CrowdData;
  onEventSelect: (location: EventLocation) => void;
  onClose: () => void;
}

const getCrowdStatus = (count: number, capacity: number) => {
    const percentage = capacity > 0 ? Math.round((count / capacity) * 100) : 0;
    
    let statusText = 'Low';
    let statusColor = 'text-green-400';
    let bgColor = 'bg-green-500';

    if (percentage > 85) {
        statusText = 'Very High';
        statusColor = 'text-red-400';
        bgColor = 'bg-red-500';
    } else if (percentage > 60) {
        statusText = 'High';
        statusColor = 'text-orange-400';
        bgColor = 'bg-orange-500';
    } else if (percentage > 30) {
        statusText = 'Moderate';
        statusColor = 'text-yellow-400';
        bgColor = 'bg-yellow-400';
    }
    return { percentage, statusText, statusColor, bgColor };
};


export const GroupedEventsCard: React.FC<GroupedEventsCardProps> = ({ group, crowdData, onEventSelect, onClose }) => {
  const getCardTitle = (): string => {
    if (!group || group.length === 0) {
      return `Events Here (0)`;
    }

    // Find the most common venue name in the group
    const venueCounts = group.reduce((acc, event) => {
      acc[event.venue] = (acc[event.venue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonVenue = Object.keys(venueCounts).reduce((a, b) => venueCounts[a] > venueCounts[b] ? a : b);

    // A venue is "common" if at least half the events in the group share it.
    // This prevents showing a misleading venue if events are very diverse.
    if (venueCounts[commonVenue] >= group.length / 2) {
      return `${group.length} Events @ ${commonVenue}`;
    }
    
    return `Events Here (${group.length})`;
  };

  return (
    <div
      className="absolute bg-gray-900 bg-opacity-80 backdrop-blur-md border border-gray-700 rounded-2xl p-5 z-[1000] shadow-lg pointer-events-auto animate-card-enter
                 bottom-4 left-4 right-4 w-auto 
                 sm:top-4 sm:right-auto sm:bottom-auto sm:left-auto sm:w-80"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-xl text-orange-300 truncate">{getCardTitle()}</h3>
        <button 
          onClick={onClose} 
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto pr-2">
        <ul className="space-y-2">
          {group.sort((a,b) => a.name.localeCompare(b.name)).map(location => {
            const { percentage, statusText, statusColor, bgColor } = getCrowdStatus(
              crowdData[location.id] || 0,
              location.capacity
            );

            return (
              <li key={location.id}>
                <button 
                  onClick={() => onEventSelect(location)} 
                  className="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-orange-500 transition-all duration-200"
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-gray-100 truncate pr-2">{location.name}</p>
                    <span className={`text-xs font-bold ${statusColor} flex-shrink-0`}>{statusText}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{location.category} &middot; {location.date}</p>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`${bgColor} h-1.5 rounded-full transition-all duration-300 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
