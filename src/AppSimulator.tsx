import React, { useState, useEffect } from 'react';
import { MobileFrame } from '@shared/components/MobileFrame';
import { ParentApp, ScreenId } from '@appchame/ParentApp';
import { KidApp } from '@appconchau/KidApp';
import { useAppState } from '@shared/store';
import { Capacitor } from '@capacitor/core';
import {
  Smartphone,
  Layers,
  Sparkles,
  ShieldAlert,
  Sliders,
  Laptop,
  ArrowRight,
  Info,
  CheckCircle2,
  RefreshCw,
  HeartHandshake,
  Maximize2,
  ChevronDown,
  UserCheck,
  Shield,
  Clock,
  Compass,
  Award,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

const SCREENS: { id: ScreenId; title: string; num: string }[] = [
  { id: 'welcome', title: 'Màn hình chào mừng', num: '1' },
  { id: 'dashboard', title: 'Trang chủ (Dashboard)', num: '2' },
  { id: 'tracking', title: 'Định vị & Theo dõi thời gian thực', num: '3' },
  { id: 'screentime', title: 'Giới hạn & Kiểm soát ứng dụng / Web', num: '4' },
  { id: 'reports', title: 'Báo cáo chi tiết', num: '5' },
  { id: 'alerts', title: 'Thông báo & Cảnh báo an toàn', num: '6' },
  { id: 'family', title: 'Quản lý gia đình & Thiết bị', num: '7' },
  { id: 'ai', title: 'Trợ lý AI thông minh', num: '8' },
  { id: 'sos', title: 'Cảnh báo SOS khẩn cấp', num: '9' },
  { id: 'remote', title: 'Trung tâm Điều khiển Từ xa & Live Monitor', num: '10' },
  { id: 'premium', title: 'Nâng cấp tài khoản Premium', num: '11' },
  { id: 'settings', title: 'Cài đặt hệ thống', num: '12' },
];

export type AppViewMode = 'dual' | 'parent' | 'child' | 'standalone-kid' | 'standalone-parent' | 'role-chooser';

export const AppSimulator: React.FC = () => {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  const [viewMode, setViewMode] = useState<AppViewMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'kid') return 'standalone-kid';
      if (m === 'parent') return 'standalone-parent';
      if (m === 'chooser') return 'role-chooser';
      
      const savedRole = localStorage.getItem('parent_pro_active_role');
      if (savedRole === 'parent') return 'standalone-parent';
      if (savedRole === 'kid') return 'standalone-kid';

      if (isNative) {
        // First time on Android: show Role Chooser
        return 'role-chooser';
      }

      if (window.innerWidth < 768) return 'standalone-parent';
    }
    return 'dual';
  });

  const [parentScreen, setParentScreen] = useState<ScreenId>('dashboard');
  const [manualChildId, setManualChildId] = useState<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(true);
  const { state } = useAppState();

  const activeChildId = manualChildId || state.selectedChildId;

  const selectRole = (role: 'parent' | 'kid') => {
    if (rememberChoice && typeof window !== 'undefined') {
      localStorage.setItem('parent_pro_active_role', role);
    }
    setViewMode(role === 'parent' ? 'standalone-parent' : 'standalone-kid');
  };

  const resetRoleChoice = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parent_pro_active_role');
    }
    setViewMode('role-chooser');
    setShowDevMenu(false);
  };

  // 1. ROLE CHOOSER WELCOME SCREEN (Especially for Android Studio launch & first time setup)
  if (viewMode === 'role-chooser') {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-y-auto">
        {/* Top Header */}
        <div className="w-full max-w-md pt-4 text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/20 border border-white/20">
            <HeartHandshake size={34} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            ParentPro & KidCare
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Hệ thống Quản lý và Bảo vệ Trẻ em Toàn diện • Sẵn sàng chạy trên Android Studio
          </p>
        </div>

        {/* Center: 2 Role Cards */}
        <div className="w-full max-w-md my-auto py-6 space-y-4">
          <div className="text-center mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-400/30">
              Chọn vai trò thiết bị này:
            </span>
          </div>

          {/* Card 1: Parent App */}
          <button
            onClick={() => selectRole('parent')}
            className="w-full text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border-2 border-blue-500/50 hover:border-blue-400 shadow-xl shadow-blue-950/50 transition transform active:scale-[0.98] group cursor-pointer"
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition shrink-0">
                <Smartphone size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>Ứng Dụng Cha Mẹ</span>
                    <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-mono">
                      ParentPro
                    </span>
                  </h3>
                  <ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition" />
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                  Giám sát con từ xa, định vị GPS vệ tinh, nhận báo động SOS khẩn cấp, khóa ứng dụng và đặt giờ dùng máy.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/30">
                    📍 GPS thời gian thực
                  </span>
                  <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/30">
                    🚨 Còi hú SOS
                  </span>
                  <span className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/30">
                    🔒 Khóa máy từ xa
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Card 2: Kid App */}
          <button
            onClick={() => selectRole('kid')}
            className="w-full text-left p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-2 border-emerald-500/50 hover:border-emerald-400 shadow-xl shadow-emerald-950/50 transition transform active:scale-[0.98] group cursor-pointer"
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <span>Ứng Dụng Con Cái</span>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                      KidCare
                    </span>
                  </h3>
                  <ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                  Thiết bị của con: nút SOS khẩn cấp, tích sao đổi quà, quản trị viên chống gỡ app và giám sát mở ứng dụng.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    🛡️ MDM Bảo vệ
                  </span>
                  <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    ⭐ Đổi quà thưởng
                  </span>
                  <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    🚨 Nút SOS 1 chạm
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Bottom Options */}
        <div className="w-full max-w-md space-y-3 pb-2 text-center">
          <label className="flex items-center justify-center space-x-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Ghi nhớ lựa chọn trên thiết bị này (có thể đổi lại sau)</span>
          </label>

          {!isNative && (
            <button
              onClick={() => setViewMode('dual')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline transition cursor-pointer"
            >
              Hoặc mở chế độ Simulator Song song (Dual Desktop)
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. STANDALONE KID MODE (Native Android APK or ?mode=kid on Web)
  if (viewMode === 'standalone-kid') {
    return (
      <div className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col relative">
        <KidApp />

        {/* Discreet Floating Role Switcher - Available on both Web & Android Studio */}
        <div className="fixed bottom-3 right-3 z-50">
          <button
            onClick={() => setShowDevMenu(!showDevMenu)}
            className="px-3 py-1.5 bg-black/75 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold rounded-full shadow-xl flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span>👦 Máy Con</span>
            <ChevronDown size={12} className={`transition ${showDevMenu ? 'rotate-180' : ''}`} />
          </button>

          {showDevMenu && (
            <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 w-52 animate-in fade-in slide-in-from-bottom-2 text-white">
              <button
                onClick={() => {
                  setViewMode('standalone-parent');
                  setShowDevMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
              >
                <Smartphone size={15} className="text-blue-400" />
                <span>Mở Máy Cha Mẹ (ParentPro)</span>
              </button>
              <button
                onClick={resetRoleChoice}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
              >
                <RotateCcw size={15} className="text-amber-400" />
                <span>Màn hình Chọn Vai Trò</span>
              </button>
              {!isNative && (
                <button
                  onClick={() => {
                    setViewMode('dual');
                    setShowDevMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
                >
                  <Layers size={15} className="text-emerald-400" />
                  <span>Mở Simulator Song song</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. STANDALONE PARENT MODE (?mode=parent on Web or mobile screen)
  if (viewMode === 'standalone-parent') {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col relative">
        <ParentApp initialScreen={parentScreen} onScreenChangeExternal={setParentScreen} />

        {/* Discreet Floating Role Switcher */}
        <div className="fixed bottom-16 right-3 z-50">
          <button
            onClick={() => setShowDevMenu(!showDevMenu)}
            className="px-3 py-1.5 bg-black/75 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold rounded-full shadow-xl flex items-center space-x-1.5 transition cursor-pointer"
          >
            <span>👨‍👩‍👧 Máy Bố Mẹ</span>
            <ChevronDown size={12} className={`transition ${showDevMenu ? 'rotate-180' : ''}`} />
          </button>

          {showDevMenu && (
            <div className="absolute bottom-10 right-0 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 w-52 animate-in fade-in slide-in-from-bottom-2 text-white">
              <button
                onClick={() => {
                  setViewMode('standalone-kid');
                  setShowDevMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles size={15} className="text-emerald-400" />
                <span>Mở Máy Con Cái (KidCare)</span>
              </button>
              <button
                onClick={resetRoleChoice}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
              >
                <RotateCcw size={15} className="text-amber-400" />
                <span>Màn hình Chọn Vai Trò</span>
              </button>
              {!isNative && (
                <button
                  onClick={() => {
                    setViewMode('dual');
                    setShowDevMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center space-x-2 cursor-pointer"
                >
                  <Layers size={15} className="text-blue-400" />
                  <span>Mở Simulator Song song</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. DESKTOP DUAL SIMULATOR (Default for PC / Laptop testing)
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <HeartHandshake size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>ParentPro & KidCare</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                19 Màn hình Chuẩn Mẫu
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hệ thống Quản lý Con cái Toàn diện • Kiến trúc Mô-đun Pluggable • Đồng bộ Real-time
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setViewMode('dual')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
              viewMode === 'dual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>Song song (Dual Live)</span>
          </button>
          <button
            onClick={() => setViewMode('parent')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
              viewMode === 'parent' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone size={14} />
            <span>App Cha Mẹ</span>
          </button>
          <button
            onClick={() => setViewMode('child')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
              viewMode === 'child' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} />
            <span>App Con Cái</span>
          </button>
          <button
            onClick={() => setViewMode('role-chooser')}
            title="Màn hình chọn vai trò thiết bị"
            className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition flex items-center space-x-1 cursor-pointer"
          >
            <UserCheck size={14} />
            <span className="hidden md:inline">Chọn Vai Trò</span>
          </button>
          <a
            href="/"
            title="Vào giao diện Web Quản Trị Phụ Huynh"
            className="px-2.5 py-1.5 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600/40 transition flex items-center space-x-1 cursor-pointer ml-1"
          >
            <Shield size={14} />
            <span className="hidden md:inline">Vào Parent Web</span>
          </a>
        </div>
      </header>

      {/* 19-Screens Fast Switcher Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto select-none">
        <div className="flex items-center space-x-2 min-w-max">
          <span className="text-[11px] font-bold text-slate-400 pr-2 uppercase tracking-wider flex items-center gap-1">
            <Sliders size={13} />
            Chọn nhanh 19 màn hình:
          </span>
          {SCREENS.map((sc) => {
            const isActive = parentScreen === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => {
                  setParentScreen(sc.id);
                  if (viewMode === 'child') setViewMode('dual');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-bold">
                  {sc.num}
                </span>
                <span>{sc.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Synchronization Hint Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 border-b border-blue-800/30 px-4 py-2 text-center text-xs text-blue-200 font-medium flex items-center justify-center gap-2">
        <Info size={14} className="text-blue-400 shrink-0" />
        <span>
          <strong>Thử nghiệm tương tác 2 chiều:</strong> Bấm <em>Chặn ứng dụng</em> hoặc <em>Chế độ học tập</em> trên máy Cha Mẹ ➔ Điện thoại Con lập tức bị khóa; Bấm <em>SOS khẩn cấp</em> trên máy Con ➔ Điện thoại Cha Mẹ phát còi hú cảnh báo toàn màn hình!
        </span>
      </div>

      {/* Main Showcase Stage */}
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center overflow-x-auto">
        {viewMode === 'dual' ? (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 max-w-6xl w-full">
            {/* Phone 1: Parent App */}
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Ứng dụng Cha Mẹ (ParentPro) • Màn hình {SCREENS.find((s) => s.id === parentScreen)?.num}: {SCREENS.find((s) => s.id === parentScreen)?.title}</span>
              </div>
              <MobileFrame theme={state.theme} deviceRole="parent">
                <ParentApp
                  initialScreen={parentScreen}
                  onScreenChangeExternal={(s) => setParentScreen(s)}
                />
              </MobileFrame>
            </div>

            {/* Sync Flow Indicator */}
            <div className="hidden lg:flex flex-col items-center space-y-2 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-md">
                <RefreshCw size={20} className="animate-spin-slow" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Đồng bộ Real-time
              </span>
            </div>

            {/* Phone 2: Child App */}
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Ứng dụng Con Cái (KidCare) • Thiết bị:</span>
                <select
                  value={activeChildId}
                  onChange={(e) => setManualChildId(e.target.value)}
                  className="bg-slate-800 text-emerald-300 font-black text-[11px] px-2 py-0.5 rounded-md border border-emerald-500/40 ml-1 focus:outline-none cursor-pointer"
                >
                  {state.children?.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.age}t - {c.grade})
                    </option>
                  ))}
                </select>
              </div>
              <MobileFrame theme={state.theme} deviceRole="child">
                <KidApp simulatedChildId={activeChildId} />
              </MobileFrame>
            </div>
          </div>
        ) : viewMode === 'parent' ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold">
              <span>Ứng dụng Cha Mẹ (ParentPro) • Màn hình {SCREENS.find((s) => s.id === parentScreen)?.num}: {SCREENS.find((s) => s.id === parentScreen)?.title}</span>
            </div>
            <MobileFrame theme={state.theme} deviceRole="parent">
              <ParentApp
                initialScreen={parentScreen}
                onScreenChangeExternal={(s) => setParentScreen(s)}
              />
            </MobileFrame>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
              <span>Ứng dụng Con Cái (KidCare) • Thiết bị:</span>
              <select
                value={activeChildId}
                onChange={(e) => setManualChildId(e.target.value)}
                className="bg-slate-800 text-emerald-300 font-black text-[11px] px-2 py-0.5 rounded-md border border-emerald-500/40 ml-1 focus:outline-none cursor-pointer"
              >
                {state.children?.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} ({c.age}t - {c.grade})
                  </option>
                ))}
              </select>
            </div>
            <MobileFrame theme={state.theme} deviceRole="child">
              <KidApp simulatedChildId={activeChildId} />
            </MobileFrame>
          </div>
        )}
      </main>

      {/* Footer System Status */}
      <footer className="bg-slate-950 border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <span>Sẵn sàng mở trong Android Studio • Chạy cả App Cha Mẹ & Con Cái</span>
        </div>
        <div className="text-[11px]">
          ParentPro & KidCare © 2026 • Đồng hành an toàn cùng con trên mọi hành trình
        </div>
      </footer>
    </div>
  );
};
