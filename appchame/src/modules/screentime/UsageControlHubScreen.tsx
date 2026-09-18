import React, { useState } from 'react';
import { Clock, LayoutGrid, Shield } from 'lucide-react';
import { ScreenTimeScreen } from './ScreenTimeScreen';
import { AppManagementScreen } from './AppManagementScreen';
import { ContentFilterScreen } from '../content/ContentFilterScreen';
import { haptics } from '@shared/utils/haptics';

export type UsageControlTab = 'screentime' | 'apps' | 'content';

interface UsageControlHubScreenProps {
  onBack: () => void;
  initialTab?: UsageControlTab;
  onNavigate?: (screenKey: string) => void;
}

export const UsageControlHubScreen: React.FC<UsageControlHubScreenProps> = ({
  onBack,
  initialTab = 'screentime',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<UsageControlTab>(initialTab);

  const tabs: Array<{ id: UsageControlTab; label: string; icon: any }> = [
    { id: 'screentime', label: 'Thời gian dùng', icon: Clock },
    { id: 'apps', label: 'Quản lý app', icon: LayoutGrid },
    { id: 'content', label: 'Lọc nội dung', icon: Shield },
  ];

  // Intercept navigation from inside sub-screens
  const handleInternalNavigate = (screenKey: string) => {
    if (screenKey === 'apps') {
      setActiveTab('apps');
    } else if (screenKey === 'content') {
      setActiveTab('content');
    } else if (screenKey === 'screentime') {
      setActiveTab('screentime');
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
        {activeTab === 'screentime' && (
          <ScreenTimeScreen onBack={onBack} onNavigate={handleInternalNavigate} />
        )}
        {activeTab === 'apps' && (
          <AppManagementScreen onBack={() => setActiveTab('screentime')} />
        )}
        {activeTab === 'content' && (
          <ContentFilterScreen onBack={() => setActiveTab('screentime')} />
        )}
      </div>
    </div>
  );
};
