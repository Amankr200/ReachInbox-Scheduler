import React from 'react';
import { Search, SlidersHorizontal, RotateCw, ExternalLink } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-6 bg-white border-b border-gray-100">
      {/* Search Input Bar (Matching Figma) */}
      <div className="flex-1 max-w-xl relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Search emails by recipient, subject, or status..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[#F4F5F7] border border-transparent focus:border-emerald-500 focus:bg-white text-sm rounded-full outline-none transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          title="Refresh emails"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          title="Filter"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Quick Link to BullBoard Queue Dashboard */}
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-full transition-colors ml-2"
        >
          <span>BullMQ Dashboard</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
