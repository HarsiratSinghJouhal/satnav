import React, { useState, useRef, useEffect } from 'react';

interface EventFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeCategoryFilters: string[];
  onCategoryFilterChange: (category: string) => void;
  allCategories: string[];
  activeDateFilters: string[];
  onDateFilterChange: (date: string) => void;
  allDates: string[];
  onClearFilters: () => void;
}

export const EventFilter: React.FC<EventFilterProps> = ({
  searchTerm,
  onSearchChange,
  activeCategoryFilters,
  onCategoryFilterChange,
  allCategories,
  activeDateFilters,
  onDateFilterChange,
  allDates,
  onClearFilters
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<'date' | 'category' | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Reset sub-menu when main dropdown is closed
  useEffect(() => {
    if (!isFilterOpen) {
      setOpenSubMenu(null);
    }
  }, [isFilterOpen]);

  const totalFilters = activeCategoryFilters.length + activeDateFilters.length;

  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-2">
      {/* Search Bar */}
      <div className="relative flex-grow">
        <input
          type="text"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Filter Button and Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full sm:w-auto flex items-center justify-center bg-gray-700 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-600 hover:bg-gray-600 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            Filter
            {totalFilters > 0 && (
              <span className="ml-2 bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalFilters}
              </span>
            )}
          </button>

          {isFilterOpen && (
            <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-[1100] overflow-hidden">
              {/* Main Menu */}
              {openSubMenu === null && (
                <div>
                  <div className="flex justify-between items-center p-3 border-b border-gray-700">
                    <h3 className="font-semibold text-gray-200">Filter By</h3>
                    {totalFilters > 0 && (
                      <button
                        onClick={() => {
                          onClearFilters();
                          setIsFilterOpen(false); // Close menu after clearing
                        }}
                        className="text-sm text-orange-400 hover:text-orange-300 font-semibold focus:outline-none"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                  <ul>
                    <li onClick={() => setOpenSubMenu('date')} className="flex justify-between items-center p-3 hover:bg-gray-700 cursor-pointer">
                      <span className="text-gray-200">Date</span>
                      <div className="flex items-center space-x-2">
                        {activeDateFilters.length > 0 && (
                          <span className="bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeDateFilters.length}</span>
                        )}
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    </li>
                    <li onClick={() => setOpenSubMenu('category')} className="flex justify-between items-center p-3 hover:bg-gray-700 cursor-pointer">
                      <span className="text-gray-200">Category</span>
                      <div className="flex items-center space-x-2">
                        {activeCategoryFilters.length > 0 && (
                          <span className="bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeCategoryFilters.length}</span>
                        )}
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    </li>
                  </ul>
                </div>
              )}
              
              {/* Date Sub-Menu */}
              {openSubMenu === 'date' && (
                <div>
                  <div className="flex items-center p-3 border-b border-gray-700">
                    <button onClick={() => setOpenSubMenu(null)} className="p-1 -ml-1 mr-2 rounded-full hover:bg-gray-700">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <h3 className="font-semibold text-gray-200">Select Date</h3>
                  </div>
                  <div className="p-1 max-h-60 overflow-y-auto">
                    {allDates.map(date => (
                      <label key={date} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" checked={activeDateFilters.includes(date)} onChange={() => onDateFilterChange(date)} className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-orange-600 focus:ring-orange-500"/>
                        <span className="text-gray-200 text-sm">{date}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Category Sub-Menu */}
              {openSubMenu === 'category' && (
                <div>
                  <div className="flex items-center p-3 border-b border-gray-700">
                    <button onClick={() => setOpenSubMenu(null)} className="p-1 -ml-1 mr-2 rounded-full hover:bg-gray-700">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                    <h3 className="font-semibold text-gray-200">Select Category</h3>
                  </div>
                  <div className="p-1 max-h-60 overflow-y-auto">
                    {allCategories.map(category => (
                      <label key={category} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                        <input type="checkbox" checked={activeCategoryFilters.includes(category)} onChange={() => onCategoryFilterChange(category)} className="h-4 w-4 rounded bg-gray-700 border-gray-500 text-orange-600 focus:ring-orange-500" />
                        <span className="text-gray-200 text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};