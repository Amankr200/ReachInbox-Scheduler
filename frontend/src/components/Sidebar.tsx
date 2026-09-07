import React from 'react';
import { User } from '../types';
import { Clock, Send, ChevronDown, LogOut } from 'lucide-react';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'sent';
  onSelectTab: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenCompose,
  onLogout,
  scheduledCount,
  sentCount,
}) => {
  const userName = user?.name || 'Oliver Brown';
  const userEmail = user?.email || 'oliver.brown@domain.io';
  const userAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return (
    <div className="w-64 bg-white min-h-screen border-r border-gray-200 p-5 flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 px-1">
          <span className="text-2xl font-black tracking-tighter text-gray-900 font-mono">OMG</span>
        </div>

        {/* User Profile Badge */}
        <div className="bg-[#F8F9FA] rounded-2xl p-2.5 flex items-center justify-between border border-gray-100 mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-gray-900 truncate">{userName}</span>
              <span className="text-[11px] text-gray-400 truncate">{userEmail}</span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
        </div>

        {/* Compose Button (Matching Figma) */}
        <button
          onClick={onOpenCompose}
          className="w-full py-2 px-4 border border-[#00A859] text-[#00A859] hover:bg-[#E8F5E9] font-medium text-sm rounded-full transition-colors flex items-center justify-center gap-1.5 mb-6 cursor-pointer"
        >
          Compose
        </button>

        {/* Navigation */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
            CORE
          </span>

          {/* Scheduled Nav */}
          <button
            onClick={() => onSelectTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'scheduled'
                ? 'bg-[#E8F5E9] text-[#00A859]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Scheduled</span>
            </div>
            <span className="text-xs font-normal text-gray-400">{scheduledCount}</span>
          </button>

          {/* Sent Nav */}
          <button
            onClick={() => onSelectTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-[#E8F5E9] text-[#00A859]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
            <span className="text-xs font-normal text-gray-400">{sentCount}</span>
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-red-500 px-3 py-2 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );
};
