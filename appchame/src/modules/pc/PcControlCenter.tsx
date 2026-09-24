import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Laptop,
  Power,
  Lock,
  Unlock,
  BookOpen,
  Volume2,
  VolumeX,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Plus,
  Trash2,
  Send,
  RotateCcw,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Tv,
  Gamepad2,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Settings2,
  Cpu,
  Layers,
  HelpCircle,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { useAppState, DEFAULT_PC_CONFIG, DEFAULT_PC_APPS } from '@shared/store';
import { ChildPcAppRule, ChildPcControlConfig, ChildPcTelemetry } from '@shared/types';
import { haptics } from '@shared/utils/haptics';

interface PcControlCenterProps {
  onBack: () => void;
}

type TabType = 'overview' | 'apps' | 'web_curfew' | 'pairing';

export const PcControlCenter: React.FC<PcControlCenterProps> = ({ onBack }) => {
  const {
    state,
    switchChild,
    lockChildPcNow,
    unlockChildPcNow,
    shutdownChildPc,
    restartChildPc,
    sleepChildPc,
    toggleChildPcStudyMode,
    updateChildPcConfig,
    sendPcBroadcastMessage,
  } = useAppState();

  const { children, selectedChildId, childSettings } = state;
  const activeChild = children?.find((c) => c.id === selectedChildId) || children?.[0];
  const activeChildId = activeChild?.id || 'child_1';

  const currentSettings = childSettings?.[activeChildId];
  const rawConfig = currentSettings?.pcConfig || DEFAULT_PC_CONFIG;
  const pcConfig: ChildPcControlConfig = {
    ...DEFAULT_PC_CONFIG,
    ...rawConfig,
    blockedApps: (rawConfig.blockedApps && rawConfig.blockedApps.length > 0) ? rawConfig.blockedApps : DEFAULT_PC_APPS,
    whitelistedWebsites: (rawConfig.whitelistedWebsites && rawConfig.whitelistedWebsites.length > 0) ? rawConfig.whitelistedWebsites : (DEFAULT_PC_CONFIG.whitelistedWebsites || []),
    blacklistedWebsites: (rawConfig.blacklistedWebsites && rawConfig.blacklistedWebsites.length > 0) ? rawConfig.blacklistedWebsites : (DEFAULT_PC_CONFIG.blacklistedWebsites || []),
  };

  const telemetry: ChildPcTelemetry | undefined = currentSettings?.pcTelemetry;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockReasonInput, setLockReasonInput] = useState('');
  const [shutdownModalOpen, setShutdownModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastSticker, setBroadcastSticker] = useState('📢');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New App Rule Modal
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppProcess, setNewAppProcess] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<'game' | 'social' | 'browser' | 'study' | 'other'>('game');

  // Web Rule Inputs
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('');
  const [newBlacklistDomain, setNewBlacklistDomain] = useState('');

  // Pairing PIN copy state
  const [copiedPin, setCopiedPin] = useState(false);
  const pairingPin = '868' + (activeChildId === 'child_2' ? '246' : activeChildId === 'child_3' ? '789' : '123');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleLockNow = () => {
    haptics.impact();
    const reason = lockReasonInput.trim() || 'Bố mẹ đã tạm khóa máy tính. Con hãy nghỉ ngơi một chút nhé!';
    lockChildPcNow(activeChildId, reason);
    setLockModalOpen(false);
    setLockReasonInput('');
    showToast('🔒 Đã gửi lệnh khóa máy tính ngay lập tức!');
  };

  const handleUnlockNow = () => {
    haptics.impact();
    unlockChildPcNow(activeChildId);
    showToast('🔓 Đã mở khóa máy tính cho con!');
  };

  const handleToggleStudyMode = () => {
    haptics.impact();
    const nextState = !pcConfig.isStudyMode;
    toggleChildPcStudyMode(activeChildId, nextState);
    showToast(nextState ? '📚 Đã BẬT Góc Học Tập: Đã chặn toàn bộ game và mạng xã hội trên PC!' : '✅ Đã TẮT Góc Học Tập.');
  };

  const handleShutdownOption = (delaySeconds: number) => {
    haptics.impact();
    shutdownChildPc(activeChildId, delaySeconds);
    setShutdownModalOpen(false);
    if (delaySeconds === 0) {
      showToast('⚡ Đã gửi lệnh tắt máy tính ngay!');
    } else {
      showToast(`⏳ Máy tính con sẽ tự động tắt sau ${Math.round(delaySeconds / 60)} phút!`);
    }
  };

  const handleSendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    haptics.impact();
    sendPcBroadcastMessage(activeChildId, broadcastMsg.trim(), broadcastSticker);
    setBroadcastModalOpen(false);
    setBroadcastMsg('');
    showToast('📢 Đã bắn lời dặn nổi to lên toàn màn hình PC của con!');
  };

  const handleUpdateAppStatus = (appId: string, status: 'allowed' | 'blocked' | 'time_limited', limitMinutes?: number) => {
    haptics.impact();
    const updatedApps = (pcConfig.blockedApps || []).map((app) => {
      if (app.id === appId) {
        return {
          ...app,
          status,
          dailyLimitMinutes: limitMinutes !== undefined ? limitMinutes : app.dailyLimitMinutes,
        };
      }
      return app;
    });
    updateChildPcConfig(activeChildId, { blockedApps: updatedApps });
    showToast(`Đã cập nhật quy tắc cho ứng dụng!`);
  };

  const handleAddNewApp = () => {
    if (!newAppName.trim() || !newAppProcess.trim()) return;
    haptics.impact();
    const cleanProcess = newAppProcess.trim().toLowerCase().endsWith('.exe')
      ? newAppProcess.trim()
      : `${newAppProcess.trim()}.exe`;

    const newApp: ChildPcAppRule = {
      id: 'app_' + Date.now(),
      name: newAppName.trim(),
      processName: cleanProcess,
      category: newAppCategory,
      status: 'blocked',
      icon: newAppCategory === 'game' ? '🎮' : newAppCategory === 'social' ? '💬' : '💻',
    };

    const updatedApps = [...(pcConfig.blockedApps || []), newApp];
    updateChildPcConfig(activeChildId, { blockedApps: updatedApps });
    setShowAddAppModal(false);
    setNewAppName('');
    setNewAppProcess('');
    showToast(`Đã thêm ứng dụng ${newApp.name} vào danh sách kiểm soát!`);
  };

  const handleDeleteApp = (appId: string) => {
    haptics.impact();
    const updatedApps = (pcConfig.blockedApps || []).filter((a) => a.id !== appId);
    updateChildPcConfig(activeChildId, { blockedApps: updatedApps });
    showToast('Đã xóa ứng dụng khỏi danh sách!');
  };

  const handleAddWhitelist = () => {
    if (!newWhitelistDomain.trim()) return;
    const clean = newWhitelistDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const currentList = pcConfig.whitelistedWebsites || [];
    if (!currentList.includes(clean)) {
      updateChildPcConfig(activeChildId, { whitelistedWebsites: [...currentList, clean] });
    }
    setNewWhitelistDomain('');
    showToast(`Đã thêm ${clean} vào danh sách web được phép!`);
  };

  const handleRemoveWhitelist = (domain: string) => {
    const currentList = pcConfig.whitelistedWebsites || [];
    updateChildPcConfig(activeChildId, { whitelistedWebsites: currentList.filter((d) => d !== domain) });
  };

  const handleAddBlacklist = () => {
    if (!newBlacklistDomain.trim()) return;
    const clean = newBlacklistDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const currentList = pcConfig.blacklistedWebsites || [];
    if (!currentList.includes(clean)) {
      updateChildPcConfig(activeChildId, { blacklistedWebsites: [...currentList, clean] });
    }
    setNewBlacklistDomain('');
    showToast(`Đã thêm ${clean} vào danh sách web bị chặn!`);
  };

  const handleRemoveBlacklist = (domain: string) => {
    const currentList = pcConfig.blacklistedWebsites || [];
    updateChildPcConfig(activeChildId, { blacklistedWebsites: currentList.filter((d) => d !== domain) });
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pairingPin);
    setCopiedPin(true);
    haptics.impact();
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // Usage progress
  const usedMins = telemetry?.screenTimeTodayMinutes || 0;
  const limitMins = pcConfig.dailyLimitMinutes || 120;
  const pct = Math.min(100, Math.round((usedMins / limitMins) * 100));

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen pb-24">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🖥️</span>
                <h1 className="text-base font-black text-slate-900">Điều Khiển Máy Tính Con</h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Khóa máy, chặn game, lọc web & hẹn giờ từ xa
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-[11px] font-bold ${
            telemetry
              ? (telemetry.status === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200')
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              telemetry
                ? (telemetry.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')
                : 'bg-amber-400'
            }`} />
            <span>
              {telemetry ? (telemetry.status === 'online' ? 'PC Trực tuyến' : 'PC Ngoại tuyến') : 'Chưa kết nối PC'}
            </span>
          </div>
        </div>

        {/* Child Selector Tabs */}
        {children && children.length > 1 && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
            {children.map((c) => {
              const isSelected = c.id === activeChildId;
              return (
                <button
                  key={c.id}
                  onClick={() => switchChild(c.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-4 h-4 rounded-full object-cover border border-white/40"
                  />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mt-3 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tổng quan & 1-Chạm
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
              activeTab === 'apps'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Game & Ứng dụng
          </button>
          <button
            onClick={() => setActiveTab('web_curfew')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
              activeTab === 'web_curfew'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lọc Web & Giờ ngủ
          </button>
          <button
            onClick={() => setActiveTab('pairing')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
              activeTab === 'pairing'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kết nối PC
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: TỔNG QUAN & 1-CHẠM                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <>
            {/* Status Hero Card */}
            <div className={`p-4 rounded-3xl border shadow-xs transition ${
              pcConfig.isLocked
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white border-red-400'
                : pcConfig.isStudyMode
                ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-indigo-500'
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor size={20} className={pcConfig.isLocked || pcConfig.isStudyMode ? 'text-white' : 'text-blue-600'} />
                    <h2 className="text-sm font-black tracking-tight">
                      {telemetry?.pcName || `PC Bàn Học - ${activeChild?.name || 'Bé'}`}
                    </h2>
                  </div>
                  <p className={`text-xs ${pcConfig.isLocked || pcConfig.isStudyMode ? 'text-white/80' : 'text-slate-500'}`}>
                    {telemetry?.osVersion || 'Windows'} • {telemetry?.status === 'online' ? 'Đang kết nối Realtime' : telemetry ? 'Ngoại tuyến' : 'Chưa có client kết nối'}
                  </p>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  pcConfig.isLocked
                    ? 'bg-white text-rose-600'
                    : pcConfig.isStudyMode
                    ? 'bg-amber-300 text-indigo-950'
                    : telemetry?.status === 'online'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {pcConfig.isLocked ? '🔒 Đang Khóa' : pcConfig.isStudyMode ? '📚 Góc Học Tập' : telemetry?.status === 'online' ? '🟢 Trực Tuyến' : '⚪ Ngoại Tuyến'}
                </div>
              </div>

              {/* Active Window Display */}
              <div className={`mt-4 p-3 rounded-2xl flex items-center gap-3 ${
                pcConfig.isLocked || pcConfig.isStudyMode
                  ? 'bg-black/20 text-white/95'
                  : 'bg-slate-50 border border-slate-100 text-slate-700'
              }`}>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Layers size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold opacity-75">Cửa sổ đang mở trên máy con</div>
                  <div className="text-xs font-bold truncate">
                    {telemetry?.activeWindow || 'Chưa có ứng dụng đang mở'}
                  </div>
                </div>
              </div>

              {/* Screen Time Usage Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={pcConfig.isLocked || pcConfig.isStudyMode ? 'text-white/90' : 'text-slate-600'}>
                    Thời gian dùng hôm nay:
                  </span>
                  <span className={pcConfig.isLocked || pcConfig.isStudyMode ? 'text-white' : 'text-slate-900'}>
                    {usedMins} phút / {limitMins} phút
                  </span>
                </div>
                <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      pct > 90 ? 'bg-rose-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {!telemetry && (
              <div className="p-4 rounded-3xl bg-amber-50/90 border border-amber-200 flex items-start justify-between gap-3 text-amber-950 shadow-xs">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Monitor size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black">Chưa kết nối máy tính của {activeChild?.name || 'bé'}</h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Hãy mở ứng dụng PC Client trên máy con và nhập mã PIN để bắt đầu giám sát thời gian thực.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pairing')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  Kết nối ngay
                </button>
              </div>
            )}

            {/* QUICK ACTIONS 1-CHẠM GRID */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider px-1">
                Lệnh điều khiển 1-Chạm tức thì
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. LOCK / UNLOCK PC */}
                {pcConfig.isLocked ? (
                  <button
                    onClick={handleUnlockNow}
                    className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex flex-col items-start gap-2 shadow-sm transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Unlock size={20} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black">Mở khóa PC ngay</div>
                      <div className="text-[11px] text-emerald-100 font-medium">Cho phép con dùng tiếp</div>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setLockModalOpen(true)}
                    className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex flex-col items-start gap-2 shadow-sm transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Lock size={20} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black">Khóa màn hình PC</div>
                      <div className="text-[11px] text-rose-100 font-medium">Khóa ngay lập tức</div>
                    </div>
                  </button>
                )}

                {/* 2. STUDY MODE */}
                <button
                  onClick={handleToggleStudyMode}
                  className={`p-3.5 rounded-2xl font-bold flex flex-col items-start gap-2 shadow-sm transition cursor-pointer ${
                    pcConfig.isStudyMode
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    pcConfig.isStudyMode ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <BookOpen size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black">
                      {pcConfig.isStudyMode ? 'Tắt chế độ học tập' : 'Góc học tập PC'}
                    </div>
                    <div className={`text-[11px] font-medium ${pcConfig.isStudyMode ? 'text-amber-100' : 'text-slate-500'}`}>
                      {pcConfig.isStudyMode ? 'Đang chặn game' : 'Chặn game 1-chạm'}
                    </div>
                  </div>
                </button>

                {/* 3. SHUTDOWN REMOTE */}
                <button
                  onClick={() => setShutdownModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold flex flex-col items-start gap-2 shadow-sm transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <Power size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black">Tắt máy từ xa</div>
                    <div className="text-[11px] text-slate-500 font-medium">Tắt ngay / Hẹn giờ tắt</div>
                  </div>
                </button>

                {/* 4. BROADCAST TO SCREEN */}
                <button
                  onClick={() => setBroadcastModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold flex flex-col items-start gap-2 shadow-sm transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Tv size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black">Bắn lời dặn to</div>
                    <div className="text-[11px] text-slate-500 font-medium">Hiện đè lên màn hình</div>
                  </div>
                </button>
              </div>

              {/* Secondary Actions: Restart & Sleep */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    haptics.impact();
                    restartChildPc(activeChildId);
                    showToast('🔄 Đã gửi lệnh khởi động lại máy tính!');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Khởi động lại PC</span>
                </button>

                <button
                  onClick={() => {
                    haptics.impact();
                    sleepChildPc(activeChildId);
                    showToast('💤 Đã gửi lệnh chuyển PC sang chế độ Ngủ (Sleep)!');
                  }}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Moon size={15} />
                  <span>Cho PC đi ngủ (Sleep)</span>
                </button>
              </div>
            </div>

            {/* PC Hardware & Live Telemetry Details */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Cpu size={16} className="text-blue-600" />
                  <span>Thông số máy tính thời gian thực</span>
                </span>
                <span className={telemetry?.status === 'online' ? "text-emerald-600 text-[11px]" : "text-slate-400 text-[11px]"}>
                  {telemetry?.status === 'online' ? "Đang đồng bộ" : "Chưa có tín hiệu"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-medium">Tải CPU</div>
                  <div className="text-sm font-black text-slate-800">{telemetry?.cpuUsage != null ? `${telemetry.cpuUsage}%` : '--'}</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-medium">Bộ nhớ RAM</div>
                  <div className="text-sm font-black text-slate-800">{telemetry?.ramUsage != null ? `${telemetry.ramUsage}%` : '--'}</div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-medium">Tiến trình chạy</div>
                  <div className="text-xs font-black text-blue-600 truncate">{telemetry?.activeProcess || 'Không có'}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GAME & ỨNG DỤNG PC                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'apps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Danh sách Game & Ứng dụng PC</h3>
                <p className="text-[11px] text-slate-500">Chặn hoặc đặt giới hạn số phút chơi mỗi ngày</p>
              </div>
              <button
                onClick={() => setShowAddAppModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Thêm app/game</span>
              </button>
            </div>

            {/* List of PC Apps */}
            <div className="space-y-2">
              {(pcConfig.blockedApps || []).map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                      {app.icon || '🎮'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">{app.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({app.processName})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {app.status === 'blocked' ? (
                          <span className="text-rose-600 font-bold">🚫 Đang bị Chặn hoàn toàn</span>
                        ) : app.status === 'time_limited' ? (
                          <span className="text-amber-600 font-bold">⏳ Giới hạn: {app.dailyLimitMinutes || 45} phút/ngày</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">✅ Cho phép sử dụng</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this App */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {app.status !== 'blocked' ? (
                      <button
                        onClick={() => handleUpdateAppStatus(app.id, 'blocked')}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Chặn
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateAppStatus(app.id, 'allowed')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Cho phép
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const mins = prompt('Nhập số phút cho phép chơi mỗi ngày:', String(app.dailyLimitMinutes || 45));
                        if (mins && !isNaN(Number(mins))) {
                          handleUpdateAppStatus(app.id, 'time_limited', Number(mins));
                        }
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Clock size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteApp(app.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LỌC WEB & GIỜ GIỚI NGHIÊM                                         */}
        {/* ========================================================================= */}
        {activeTab === 'web_curfew' && (
          <div className="space-y-4">
            {/* Curfew Settings */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon size={18} className="text-indigo-600" />
                  <span className="text-sm font-black text-slate-900">Giờ giới nghiêm ban đêm (Curfew)</span>
                </div>
                <input
                  type="checkbox"
                  checked={pcConfig.bedtimeLock ?? true}
                  onChange={(e) => {
                    updateChildPcConfig(activeChildId, { bedtimeLock: e.target.checked });
                    showToast(e.target.checked ? 'Đã BẬT giờ giới nghiêm ban đêm!' : 'Đã TẮT giờ giới nghiêm.');
                  }}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-500">
                Tự động khóa máy tính trong khung giờ đêm để nhắc con đi ngủ đúng giờ và bảo vệ mắt.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Bắt đầu khóa</div>
                  <div className="text-xs font-black text-slate-800">{pcConfig.curfewStart || '22:00'}</div>
                </div>
                <div className="text-slate-400 font-bold">đến</div>
                <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Mở lại lúc</div>
                  <div className="text-xs font-black text-slate-800">{pcConfig.curfewEnd || '06:00'}</div>
                </div>
              </div>
            </div>

            {/* Daily Screen Time Limit Slider */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">Giới hạn thời gian dùng máy mỗi ngày</span>
                <span className="text-xs font-black text-blue-600">{pcConfig.dailyLimitMinutes || 120} phút</span>
              </div>
              <input
                type="range"
                min="30"
                max="360"
                step="15"
                value={pcConfig.dailyLimitMinutes || 120}
                onChange={(e) => updateChildPcConfig(activeChildId, { dailyLimitMinutes: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>30 phút</span>
                <span>1 giờ</span>
                <span>2 giờ</span>
                <span>4 giờ</span>
                <span>6 giờ</span>
              </div>
            </div>

            {/* Whitelisted Study Websites */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} />
                  <span>Website Học tập được phép (Whitelist)</span>
                </span>
                <span className="text-xs font-bold text-slate-400">{(pcConfig.whitelistedWebsites || []).length} web</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. olm.vn hoặc vio.edu.vn"
                  value={newWhitelistDomain}
                  onChange={(e) => setNewWhitelistDomain(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500"
                />
                <button
                  onClick={handleAddWhitelist}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Thêm
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(pcConfig.whitelistedWebsites || []).map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold"
                  >
                    <span>{domain}</span>
                    <button
                      onClick={() => handleRemoveWhitelist(domain)}
                      className="text-emerald-500 hover:text-rose-600 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Blacklisted Entertainment Websites */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-rose-800 flex items-center gap-1.5">
                  <ShieldAlert size={16} />
                  <span>Website Giải trí bị chặn (Blacklist)</span>
                </span>
                <span className="text-xs font-bold text-slate-400">{(pcConfig.blacklistedWebsites || []).length} web</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. tiktok.com hoặc gamevui.vn"
                  value={newBlacklistDomain}
                  onChange={(e) => setNewBlacklistDomain(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-rose-500"
                />
                <button
                  onClick={handleAddBlacklist}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Chặn
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(pcConfig.blacklistedWebsites || []).map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold"
                  >
                    <span>{domain}</span>
                    <button
                      onClick={() => handleRemoveBlacklist(domain)}
                      className="text-rose-500 hover:text-slate-700 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: KẾT NỐI MÁY TÍNH (PAIRING & SETUP)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'pairing' && (
          <div className="space-y-4">
            {/* PIN Code Box */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-3xl text-center space-y-3 shadow-md">
              <span className="text-xs uppercase font-bold tracking-widest text-blue-200">
                MÃ PIN GHÉP ĐÔI MÁY TÍNH CỦA BÉ
              </span>
              <div className="text-4xl font-mono font-black tracking-widest bg-white/10 py-2.5 rounded-2xl">
                {pairingPin}
              </div>
              <button
                onClick={handleCopyPin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-black shadow-xs hover:bg-blue-50 transition cursor-pointer"
              >
                {copiedPin ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedPin ? 'Đã sao chép mã PIN' : 'Sao chép mã PIN'}</span>
              </button>
            </div>

            {/* Step-by-step Setup Guide */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900">3 Bước cài đặt trên máy tính con:</h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Mở Trình duyệt trên máy tính con</h4>
                    <p className="text-[11px] text-slate-500">
                      Mở Chrome, Cốc Cốc hoặc Edge trên máy con và truy cập vào link web client:
                    </p>
                    <div className="mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-blue-600 break-all select-all">
                      {window.location.origin}/kid-pc?childId={activeChildId}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Nhập mã PIN 6 số</h4>
                    <p className="text-[11px] text-slate-500">
                      Điền mã <strong className="font-mono text-blue-600">{pairingPin}</strong> để kết nối trực tiếp với tài khoản cha mẹ.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Cài đặt KidCare Windows Agent (Tùy chọn)</h4>
                    <p className="text-[11px] text-slate-500">
                      Để thực thi các lệnh tắt máy tính thực tế, khóa màn hình Windows bản địa hoặc đóng game, tải file chạy nền:
                    </p>
                    <a
                      href="/KidCare-Windows-Agent.bat"
                      download="KidCare-Windows-Agent.bat"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Tải KidCare-Windows-Agent.bat</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: KHÓA MÁY TÍNH NGAY (LOCK MODAL)                                    */}
      {/* ========================================================================= */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Khóa màn hình máy tính con</h3>
                <p className="text-[11px] text-slate-500">Máy tính con sẽ lập tức hiển thị màn hình khóa</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lời nhắn đến con (hiện trên màn hình khóa):</label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Bố mẹ tạm khóa máy tính. Con hãy nghỉ mắt và đi ăn cơm nhé!"
                value={lockReasonInput}
                onChange={(e) => setLockReasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setLockModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLockNow}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Khóa PC ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TẮT MÁY TÍNH TỪ XA (SHUTDOWN MODAL)                                */}
      {/* ========================================================================= */}
      {shutdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Power size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Tắt máy tính con từ xa</h3>
                <p className="text-[11px] text-slate-500">Chọn thời gian tắt để con kịp lưu bài tập</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleShutdownOption(0)}
                className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold text-left flex items-center justify-between border border-rose-200 cursor-pointer transition"
              >
                <span>⚡ Tắt máy tính ngay lập tức</span>
                <Power size={15} />
              </button>

              <button
                onClick={() => handleShutdownOption(60)}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold text-left flex items-center justify-between border border-slate-200 cursor-pointer transition"
              >
                <span>⏳ Tắt sau 1 phút (Hiện đếm ngược trên máy con)</span>
                <Clock size={15} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleShutdownOption(300)}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold text-left flex items-center justify-between border border-slate-200 cursor-pointer transition"
              >
                <span>⏳ Tắt sau 5 phút (Nhắc con lưu bài tập)</span>
                <Clock size={15} className="text-slate-400" />
              </button>

              <button
                onClick={() => handleShutdownOption(600)}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold text-left flex items-center justify-between border border-slate-200 cursor-pointer transition"
              >
                <span>⏳ Tắt sau 10 phút</span>
                <Clock size={15} className="text-slate-400" />
              </button>
            </div>

            <button
              onClick={() => setShutdownModalOpen(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BẮN LỜI DẶN NỔI TO (DESKTOP BROADCAST OVERLAY)                     */}
      {/* ========================================================================= */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Tv size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Bắn lời dặn to lên màn hình PC</h3>
                <p className="text-[11px] text-slate-500">Hiện biểu ngữ toàn màn hình kèm âm chuông</p>
              </div>
            </div>

            {/* Preset quick message chips */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500 font-bold">Mẫu lời dặn nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { text: 'Con ăn cơm nhé!', sticker: '🍚' },
                  { text: 'Đến giờ đi ngủ rồi con!', sticker: '🛏️' },
                  { text: 'Tập trung học bài nào con!', sticker: '📚' },
                  { text: 'Nghỉ mắt 5 phút nhé!', sticker: '👀' },
                ].map((item) => (
                  <button
                    key={item.text}
                    onClick={() => {
                      setBroadcastMsg(item.text);
                      setBroadcastSticker(item.sticker);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <span>{item.sticker} {item.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nội dung thông điệp:</label>
              <textarea
                rows={2}
                placeholder="Nhập lời dặn của bố mẹ gửi con..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSendBroadcast}
                disabled={!broadcastMsg.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={13} />
                <span>Gửi lên PC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: THÊM ỨNG DỤNG / GAME TÙY CHỈNH                                    */}
      {/* ========================================================================= */}
      {showAddAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Gamepad2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Thêm Game / Ứng dụng PC</h3>
                <p className="text-[11px] text-slate-500">Kiểm soát phần mềm cụ thể trên máy con</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên phần mềm:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Genshin Impact, Zalo, Discord..."
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Tên file thực thi (.exe):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: GenshinImpact.exe, Discord.exe..."
                  value={newAppProcess}
                  onChange={(e) => setNewAppProcess(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Thể loại:</label>
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-hidden focus:border-blue-500"
                >
                  <option value="game">Trò chơi (Game)</option>
                  <option value="social">Mạng xã hội & Chat</option>
                  <option value="browser">Trình duyệt Web</option>
                  <option value="study">Phần mềm Học tập</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddAppModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleAddNewApp}
                disabled={!newAppName.trim() || !newAppProcess.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Lưu quy tắc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
