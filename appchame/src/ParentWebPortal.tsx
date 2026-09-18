import React, { useState, useEffect } from 'react';
import { ParentApp, ScreenId } from './ParentApp';
import { useAppState, getActiveParentId } from '@shared/store';
import { getCurrentParentAccount, logoutParentAccount } from '@shared/firebase/firebaseService';
import { haptics } from '@shared/utils/haptics';
import {
  LayoutDashboard,
  MapPin,
  Clock,
  BarChart3,
  Users,
  Radio,
  Bell,
  Sparkles,
  Settings,
  Shield,
  ShieldAlert,
  BatteryCharging,
  Smartphone,
  Lock,
  Volume2,
  LogOut,
  ChevronDown,
  Layers,
  CheckCircle2,
  ExternalLink,
  Wifi
} from 'lucide-react';

export const ParentWebPortal: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);

  const { state, switchChild, lockChildDeviceNow, buzzKidPhone } = useAppState();
  const { children, selectedChildId, child, alerts, activeSOS } = state;
  const currentParent = getCurrentParentAccount();
  const currentChild = children.find((c) => c.id === selectedChildId) || children[0] || child;

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerFeedback = (msg: string) => {
    setQuickActionFeedback(msg);
    setTimeout(() => setQuickActionFeedback(null), 3000);
  };

  const handleQuickLock = () => {
    haptics.medium();
    if (!currentChild) return;
    lockChildDeviceNow(currentChild.id);
    triggerFeedback(`Đã gửi lệnh khóa màn hình tức thì tới máy bé ${currentChild.name}!`);
  };

  const handleQuickBuzz = () => {
    haptics.medium();
    if (!currentChild) return;
    buzzKidPhone(currentChild.id);
    triggerFeedback(`Đang phát chuông tìm máy bé ${currentChild.name}...`);
  };

  const handleLogout = () => {
    logoutParentAccount();
    window.location.reload();
  };

  const navItems: Array<{
    id: ScreenId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Tổng quan bảng điều khiển', icon: LayoutDashboard },
    { id: 'tracking', label: 'Định vị GPS thời gian thực', icon: MapPin },
    { id: 'screentime', label: 'Thời gian dùng & Ứng dụng', icon: Clock },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: BarChart3 },
    { id: 'family', label: 'Gia đình & Thiết bị của con', icon: Users },
    { id: 'remote', label: 'Trung tâm điều khiển từ xa', icon: Radio },
    { id: 'alerts', label: 'Cảnh báo an toàn', icon: Bell, badge: unreadAlertCount },
    { id: 'ai', label: 'Trợ lý AI Phụ Huynh', icon: Sparkles },
    { id: 'settings', label: 'Cài đặt & Tiết kiệm pin', icon: Settings },
  ];

  // Mobile layout (< 1024px): Seamlessly render full-screen ParentApp
  if (!isDesktop) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col">
        <ParentApp
          initialScreen={activeScreen}
          activeScreenExternal={activeScreen}
          onScreenChangeExternal={(s) => setActiveScreen(s)}
          isDesktopWeb={false}
        />
      </div>
    );
  }

  // Desktop layout (>= 1024px): Modern Full-Width Web Dashboard with Left Sidebar
  return (
    <div className="flex h-screen w-full bg-slate-100/80 overflow-hidden font-sans text-slate-800 antialiased select-none">
      {/* Toast Feedback Notification */}
      {quickActionFeedback && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{quickActionFeedback}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-xs z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield size={22} className="stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-black text-slate-900 tracking-tight">ParentPro Web</h1>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">
                Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">Quản lý con cái từ xa</p>
          </div>
        </div>

        {/* Selected Child Card & Quick Switcher */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Thiết bị con đang quản lý:</span>
            <span className="text-blue-600 font-bold">{children.length} bé</span>
          </div>

          <div className="relative group">
            <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={currentChild?.avatar || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150'}
                    alt={currentChild?.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/80"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      currentChild?.status === 'online'
                        ? 'bg-emerald-500'
                        : currentChild?.status === 'moving'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {currentChild?.name || 'Bé yêu'}
                    </span>
                    <span className="text-[10px] text-slate-400">({currentChild?.age || 10}t)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10.5px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-0.5 text-emerald-600 font-bold">
                      <BatteryCharging size={12} />
                      <span>{currentChild?.battery ?? 85}%</span>
                    </span>
                    <span>•</span>
                    <span className="truncate">{currentChild?.grade || 'Lớp 5'}</span>
                  </div>
                </div>
              </div>

              {children.length > 1 && (
                <div className="shrink-0 text-slate-400">
                  <ChevronDown size={16} />
                </div>
              )}
            </div>

            {/* Switcher Dropdown for multiple children */}
            {children.length > 1 && (
              <div className="pt-1 space-y-1">
                {children
                  .filter((c) => c.id !== currentChild?.id)
                  .map((kid) => (
                    <button
                      key={kid.id}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        switchChild(kid.id);
                      }}
                      className="w-full p-2 bg-white/70 hover:bg-white rounded-xl border border-slate-200/60 flex items-center justify-between transition cursor-pointer text-left"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <img
                          src={kid.avatar}
                          alt={kid.name}
                          className="w-6 h-6 rounded-lg object-cover"
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">{kid.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{kid.battery}% Pin</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptics.light();
                  setActiveScreen(item.id);
                }}
                className={`w-full px-3 py-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    size={17}
                    className={isActive ? 'text-white' : 'text-slate-400'}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && item.badge > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Parent User Profile & Switcher */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                {currentParent?.displayName ? currentParent.displayName.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {currentParent?.displayName || 'Phụ Huynh'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {currentParent?.email || 'phuhuynh@gmail.com'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Switch to Dev Simulator Link */}
          <a
            href="?simulator=true"
            className="w-full py-1.5 px-2 bg-slate-200/80 hover:bg-slate-300 text-slate-600 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1.5 transition"
            title="Mở trình giả lập 2 máy (Dual Simulator) cho nhà phát triển"
          >
            <Layers size={13} />
            <span>Mở Trình Giả Lập Song Song (Dev)</span>
          </a>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP WORKSPACE BAR */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-black text-slate-900">
              {navItems.find((n) => n.id === activeScreen)?.label || 'Bảng điều khiển'}
            </h2>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">
              Đang quản lý: <strong>{currentChild?.name || 'Con'}</strong>
            </span>
          </div>

          {/* Center/Right Status & Quick Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Cloud Realtime Status Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cloud Realtime Online</span>
            </div>

            {/* Quick Lock Button */}
            <button
              type="button"
              onClick={handleQuickLock}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Khóa màn hình máy con ngay lập tức"
            >
              <Lock size={14} className="text-rose-600" />
              <span>Khóa Máy</span>
            </button>

            {/* Quick Buzz Button */}
            <button
              type="button"
              onClick={handleQuickBuzz}
              className="px-3 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Rung chuông tìm điện thoại của con"
            >
              <Volume2 size={14} className="text-amber-600" />
              <span>Tìm Máy</span>
            </button>

            {/* SOS Indicator (if active) */}
            {activeSOS && (
              <button
                type="button"
                onClick={() => setActiveScreen('sos')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 animate-bounce shadow-md shadow-rose-500/30 cursor-pointer"
              >
                <ShieldAlert size={14} />
                <span>CẢNH BÁO SOS!</span>
              </button>
            )}
          </div>
        </header>

        {/* EMBEDDED PARENT APPLICATION VIEWPORT */}
        <main className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative">
          <ParentApp
            initialScreen={activeScreen}
            activeScreenExternal={activeScreen}
            onScreenChangeExternal={(s) => setActiveScreen(s)}
            isDesktopWeb={true}
          />
        </main>
      </div>
    </div>
  );
};
