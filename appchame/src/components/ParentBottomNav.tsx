import React from 'react';
import { Home, MapPin, BarChart3, Bell, Settings } from 'lucide-react';
import { haptics } from '@shared/utils/haptics';

export type ParentTab = 'dashboard' | 'tracking' | 'reports' | 'alerts' | 'settings';

interface ParentBottomNavProps {
  activeTab: ParentTab;
  onTabChange: (tab: ParentTab) => void;
  unreadAlertCount?: number;
}

export const ParentBottomNav: React.FC<ParentBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadAlertCount = 2,
}) => {
  const tabs = [
    { id: 'dashboard' as ParentTab, label: 'Trang chủ', icon: Home },
    { id: 'tracking' as ParentTab, label: 'Định vị', icon: MapPin },
    { id: 'reports' as ParentTab, label: 'Báo cáo', icon: BarChart3 },
    { id: 'alerts' as ParentTab, label: 'Thông báo', icon: Bell, badge: unreadAlertCount },
    { id: 'settings' as ParentTab, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none bg-gradient-to-t from-slate-100/90 via-slate-100/30 to-transparent">
      <nav className="pointer-events-auto max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_12px_35px_-5px_rgba(15,23,42,0.18)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptics.light();
                onTabChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-blue-600 bg-blue-50/80 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-subtle-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-all duration-200 ${
                  isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
