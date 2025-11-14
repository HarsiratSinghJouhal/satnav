import React from 'react';
import { EventLocation } from '../types';

interface DensityCardProps {
  location: EventLocation | null;
  count: number;
  onBack?: () => void;
}

export const DensityCard: React.FC<DensityCardProps> = ({ location, count, onBack }) => {
  if (!location) {
    return null;
  }

  const percentage = Math.round((count / location.capacity) * 100);
  
  let statusText = '😌 LOW';
  let statusColor = 'text-green-400';
  let bgColor = 'bg-green-500';

  if (percentage > 85) {
    statusText = '🔥 VERY HIGH';
    statusColor = 'text-red-400';
    bgColor = 'bg-red-500';
  } else if (percentage > 60) {
    statusText = '🥵 HIGH';
    statusColor = 'text-orange-400';
    bgColor = 'bg-orange-500';
  } else if (percentage > 30) {
    statusText = '🤔 MODERATE';
    statusColor = 'text-yellow-400';
    bgColor = 'bg-yellow-400';
  }

  return (
    <div
      className="absolute bg-gray-900 bg-opacity-80 backdrop-blur-md border border-gray-700 rounded-2xl p-5 z-[1000] shadow-lg pointer-events-auto animate-card-enter
                 bottom-4 left-4 right-4 w-auto 
                 sm:top-4 sm:right-auto sm:bottom-auto sm:left-auto sm:w-80"
    >
      <div className="flex flex-col">
        <div className="flex items-center mb-1">
          {onBack && (
            <button 
              onClick={onBack}
              className="mr-2 -ml-2 p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Back to event list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h3 className="font-bold text-xl text-orange-300 truncate">{location.name}</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-4 text-xs text-gray-300 mb-3">
            <div className="flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-orange-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002 2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{location.date}</span>
            </div>
            <div className="flex items-center mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-orange-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{location.venue}</span>
            </div>
            <div className="flex items-center mt-1 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span className="truncate">ID: {location.id}</span>
            </div>
        </div>

        <p className={`text-xs text-gray-400 mb-4 ${location.details.length > 500 ? 'max-h-48 overflow-y-auto' : ''}`}>{location.details}</p>

        <div className="mt-auto">
          <div className="flex justify-between items-end text-sm mb-1">
            <span className="font-semibold text-gray-200">Live Capacity</span>
            <span className={`font-bold text-lg ${statusColor}`}>{statusText}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`${bgColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-xs mt-1 text-gray-400">
            <span>{count} / {location.capacity}</span>
            <span className="font-semibold">{percentage}% Full</span>
          </div>
        </div>
      </div>
    </div>
  );
};
