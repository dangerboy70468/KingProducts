import React from "react";
import { Search, Filter, Calendar, RotateCcw } from "lucide-react";

interface SearchFilters {
  searchTerm: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface OrderSearchProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

export const OrderSearch: React.FC<OrderSearchProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleReset = () => {
    onFilterChange({
      searchTerm: "",
      status: "",
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <input
            type="text"
            placeholder="Search orders..."
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

        {/* Status Filter */}
        <div className="lg:col-span-2 relative">
          <select
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value })
            }
            title="Filter by status"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
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
              title="Required date from"
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
              title="Required date to"
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
            className="h-[38px] w-[38px] border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Reset filters"
          >
            <RotateCcw className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
