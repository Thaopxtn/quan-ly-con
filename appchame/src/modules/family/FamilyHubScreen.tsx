import React, { useState } from 'react';
import { Users, Watch } from 'lucide-react';
import { FamilyDevicesScreen } from './FamilyDevicesScreen';
import { SmartDevicesScreen } from '../devices/SmartDevicesScreen';
import { haptics } from '@shared/utils/haptics';

export type FamilyTab = 'members' | 'devices';

interface FamilyHubScreenProps {
  onBack: () => void;
  initialTab?: FamilyTab;
  onNavigate?: (screenKey: string) => void;
}

export const FamilyHubScreen: React.FC<FamilyHubScreenProps> = ({
  onBack,
  initialTab = 'members',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<FamilyTab>(initialTab);

  const tabs: Array<{ id: FamilyTab; label: string; icon: any }> = [
    { id: 'members', label: 'Thành viên & Chia sẻ', icon: Users },
    { id: 'devices', label: 'Thiết bị thông minh', icon: Watch },
  ];

  const handleInternalNavigate = (screenKey: string) => {
    if (screenKey === 'devices') {
      setActiveTab('devices');
    } else if (screenKey === 'family' || screenKey === 'members') {
      setActiveTab('members');
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
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
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
        {activeTab === 'members' && (
          <FamilyDevicesScreen onBack={onBack} onNavigate={handleInternalNavigate} />
        )}
        {activeTab === 'devices' && (
          <SmartDevicesScreen onBack={() => setActiveTab('members')} />
        )}
      </div>
    </div>
  );
};
