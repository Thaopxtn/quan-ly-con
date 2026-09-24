import React, { useState } from 'react';
import { BarChart3, BookOpen, HeartPulse } from 'lucide-react';
import { AnalyticsReportScreen } from './AnalyticsReportScreen';
import { LearningScreen } from '../learning/LearningScreen';
import { HealthScreen } from '../health/HealthScreen';
import { UsageAccessPermissionAlert } from '../../components/UsageAccessPermissionAlert';
import { haptics } from '@shared/utils/haptics';

export type ReportsTab = 'overview' | 'learning' | 'health';

interface ReportsHubScreenProps {
  onBack: () => void;
  initialTab?: ReportsTab;
  onNavigate?: (screenKey: string) => void;
}

export const ReportsHubScreen: React.FC<ReportsHubScreenProps> = ({
  onBack,
  initialTab = 'overview',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<ReportsTab>(initialTab);

  const tabs: Array<{ id: ReportsTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Báo cáo dùng máy', icon: BarChart3 },
    { id: 'learning', label: 'Học tập & Bài tập', icon: BookOpen },
    { id: 'health', label: 'Sức khỏe & Vận động', icon: HeartPulse },
  ];

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
        {activeTab === 'overview' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <UsageAccessPermissionAlert className="m-3" />
            <AnalyticsReportScreen onBack={onBack} />
          </div>
        )}
        {activeTab === 'learning' && (
          <LearningScreen onBack={() => setActiveTab('overview')} />
        )}
        {activeTab === 'health' && (
          <HealthScreen onBack={() => setActiveTab('overview')} />
        )}
      </div>
    </div>
  );
};
