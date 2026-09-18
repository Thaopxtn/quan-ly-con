import React, { useState } from 'react';
import { MapPin, Shield, History } from 'lucide-react';
import { RealtimeGpsScreen } from './RealtimeGpsScreen';
import { SafeZoneScreen } from './SafeZoneScreen';
import { RouteHistoryScreen } from './RouteHistoryScreen';
import { haptics } from '@shared/utils/haptics';

export type TrackingTab = 'live' | 'safezone' | 'history';

interface TrackingHubScreenProps {
  onBack: () => void;
  initialTab?: TrackingTab;
  onNavigate?: (screenKey: string) => void;
}

export const TrackingHubScreen: React.FC<TrackingHubScreenProps> = ({
  onBack,
  initialTab = 'live',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<TrackingTab>(initialTab);

  const tabs: Array<{ id: TrackingTab; label: string; icon: any }> = [
    { id: 'live', label: 'Bản đồ trực tiếp', icon: MapPin },
    { id: 'safezone', label: 'Vùng an toàn', icon: Shield },
    { id: 'history', label: 'Lịch sử di chuyển', icon: History },
  ];

  // Intercept navigation from inside sub-screens
  const handleInternalNavigate = (screenKey: string) => {
    if (screenKey === 'safezone') {
      setActiveTab('safezone');
    } else if (screenKey === 'history') {
      setActiveTab('history');
    } else if (screenKey === 'tracking') {
      setActiveTab('live');
    } else if (onNavigate) {
      onNavigate(screenKey);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden select-none">
      {/* Segmented Top Hub Switcher Bar */}
      <div className="bg-white/95 backdrop-blur-md px-3 py-2 border-b border-slate-200/80 z-20 shrink-0">
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl max-w-md mx-auto border border-slate-200/60 shadow-2xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveTab(tab.id);
                }}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.4 : 2} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'live' && (
          <RealtimeGpsScreen onBack={onBack} onNavigate={handleInternalNavigate} />
        )}
        {activeTab === 'safezone' && (
          <SafeZoneScreen onBack={() => setActiveTab('live')} />
        )}
        {activeTab === 'history' && (
          <RouteHistoryScreen onBack={() => setActiveTab('live')} />
        )}
      </div>
    </div>
  );
};
