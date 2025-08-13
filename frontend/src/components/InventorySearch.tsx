import React from "react";
import { Search, Filter, Calendar, RotateCcw } from "lucide-react";

interface SearchFilters {
  searchTerm: string;
  expiryRange: string;
  startDate: string;
  endDate: string;
}

interface InventorySearchProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

export const InventorySearch: React.FC<InventorySearchProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleReset = () => {
    onFilterChange({
      searchTerm: "",
      expiryRange: "",
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <input
            type="text"
            placeholder="Search batches by number or product..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filters.searchTerm}
            onChange={(e) =>
              onFilterChange({ ...filters, searchTerm: e.target.value })
            }
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Expiry Range Filter */}
        <div className="lg:col-span-2 relative">
          <select
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            value={filters.expiryRange}
            onChange={(e) =>
              onFilterChange({ ...filters, expiryRange: e.target.value })
            }
            title="Filter by expiry range"
          >
            <option value="">All</option>
            <option value="expired">Expired</option>
            <option value="this_month">Expires This Month</option>
            <option value="next_month">Expires Next Month</option>
            <option value="future">Future Expiry</option>
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Date Range */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.startDate}
              onChange={(e) =>
                onFilterChange({ ...filters, startDate: e.target.value })
              }
              title="Expiry date from"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="relative">
            <input
              type="date"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.endDate}
              onChange={(e) =>
                onFilterChange({ ...filters, endDate: e.target.value })
              }
              title="Expiry date to"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="lg:col-span-1 flex items-center">
          <button
            onClick={handleReset}
            className="w-full h-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center justify-center"
            title="Reset filters"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
