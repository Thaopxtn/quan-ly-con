import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  PlusCircle,
  BookOpen,
  Volume2,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { haptics } from '@shared/utils/haptics';

interface Kids360ScreenTimeGaugeProps {
  childId: string;
  childName: string;
  usedMinutes: number;
  limitMinutes: number;
  isLocked?: boolean;
  isStudyMode?: boolean;
  battery?: number;
  onNavigate?: (screenKey: string) => void;
  onOpenLimitModal?: () => void;
}

export const Kids360ScreenTimeGauge: React.FC<Kids360ScreenTimeGaugeProps> = ({
  childId,
  childName,
  usedMinutes,
  limitMinutes,
  isLocked = false,
  isStudyMode = false,
  battery = 100,
  onNavigate,
  onOpenLimitModal,
}) => {
  const {
    lockChildDeviceNow,
    unlockChildDeviceNow,
    toggleStudyModeAll,
    buzzKidPhone,
    setCustomScreenTimeLimit,
  } = useAppState();

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [gaugeCooldown, setGaugeCooldown] = useState<Record<string, number>>({});

  const triggerFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const triggerCooldown = (key: string) => {
    setGaugeCooldown((prev) => ({ ...prev, [key]: 3 }));
    const timer = setInterval(() => {
      setGaugeCooldown((prev) => {
        const cur = prev[key] || 0;
        if (cur <= 1) {
          clearInterval(timer);
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: cur - 1 };
      });
    }, 1000);
  };

  // Calculations
  const remainingMinutes = Math.max(0, limitMinutes - usedMinutes);
  const percent = limitMinutes > 0 ? Math.min(100, Math.round((usedMinutes / limitMinutes) * 100)) : 0;

  const usedH = Math.floor(usedMinutes / 60);
  const usedM = usedMinutes % 60;
  const usedStr = `${usedH > 0 ? `${usedH}h ` : ''}${usedM}p`;

  const limitH = Math.floor(limitMinutes / 60);
  const limitM = limitMinutes % 60;
  const limitStr = `${limitH > 0 ? `${limitH}h ` : ''}${limitM > 0 ? `${limitM}p` : ''}`;

  const remH = Math.floor(remainingMinutes / 60);
  const remM = remainingMinutes % 60;
  const remainingStr = remainingMinutes === 0
    ? 'Hết giờ'
    : `${remH > 0 ? `${remH}h ` : ''}${remM}p`;

  // SVG circular properties
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Determine theme colors based on state
  let gaugeColor = '#10B981'; // Emerald
  let glowColor = 'rgba(16, 185, 129, 0.25)';
  let statusText = 'Đang cho phép';
  let statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (isLocked) {
    gaugeColor = '#EF4444'; // Rose / Red
    glowColor = 'rgba(239, 68, 68, 0.3)';
    statusText = 'Thiết bị đang khóa';
    statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (isStudyMode) {
    gaugeColor = '#6366F1'; // Indigo
    glowColor = 'rgba(99, 102, 241, 0.3)';
    statusText = 'Chế độ giờ học';
    statusBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (percent >= 90) {
    gaugeColor = '#F43F5E'; // Red
    glowColor = 'rgba(244, 63, 94, 0.3)';
    statusText = 'Sắp hết thời gian';
    statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (percent >= 70) {
    gaugeColor = '#F59E0B'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.3)';
    statusText = 'Đã dùng hơn 70%';
    statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  // Fast action handlers with Anti-Spam protection
  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gaugeCooldown['lock']) return;
    triggerCooldown('lock');
    haptics.medium();
    if (isLocked) {
      unlockChildDeviceNow(childId);
      triggerFeedback(`Đã mở khóa thiết bị cho ${childName}! 🔓`);
    } else {
      lockChildDeviceNow(childId);
      triggerFeedback(`Đã khóa tạm dừng thiết bị của ${childName}! 🔒`);
    }
  };

  const handleBonus15Mins = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gaugeCooldown['bonus']) return;
    triggerCooldown('bonus');
    haptics.success();
    const newLimit = limitMinutes + 15;
    setCustomScreenTimeLimit(childId, newLimit);
    triggerFeedback(`Đã tặng thêm +15 phút cho ${childName}! ⏳`);
  };

  const handleToggleStudyMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    toggleStudyModeAll(!isStudyMode);
    triggerFeedback(!isStudyMode ? 'Đã bật Chế độ Học tập (Khóa game & MXH) 📚' : 'Đã tắt Chế độ Học tập 🎓');
  };

  const handleLoudSignal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gaugeCooldown['buzz']) return;
    triggerCooldown('buzz');
    haptics.warning();
    buzzKidPhone(childId);
    triggerFeedback(`Đang phát tín hiệu chuông lớn trên máy ${childName} 🔔!`);
  };

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/80 rounded-3xl p-4 border border-slate-200/80 shadow-xs relative select-none">
      {/* Mini Top Feedback Bubble */}
      {actionFeedback && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-lg animate-bounce flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles size={12} className="text-amber-400" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-black text-slate-800 tracking-tight uppercase">
            Thời Gian Sử Dụng Hôm Nay
          </span>
        </div>

        {onOpenLimitModal ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLimitModal();
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition active:scale-95 cursor-pointer"
          >
            <Sliders size={12} />
            <span>Đổi giới hạn</span>
          </button>
        ) : onNavigate ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('screentime');
            }}
            className="text-blue-600 text-xs font-bold hover:underline"
          >
            Cài đặt &gt;
          </button>
        ) : null}
      </div>

      {/* Radial Donut Gauge Center Piece */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-5 py-4">
        {/* SVG Circular Donut Chart */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background Circle Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth="11"
              fill="transparent"
            />
            {/* Active Colored Progress Arc with Rounded Endcaps */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={gaugeColor}
              strokeWidth="11"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0px 2px 6px ${glowColor})` }}
            />
          </svg>

          {/* Central Inset Typography */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isLocked ? 'Trạng thái' : 'Còn lại'}
            </span>
            <span className="text-2xl font-black text-slate-900 leading-none my-0.5 tracking-tight">
              {isLocked ? 'Đã khóa' : remainingStr}
            </span>
            <span className="text-[10.5px] font-bold text-slate-500">
              {percent}% đã dùng
            </span>
          </div>
        </div>

        {/* Right Details & Stats */}
        <div className="flex-1 space-y-2.5 w-full sm:w-auto text-center sm:text-left">
          {/* Status Badge Pill */}
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${statusBg}`}>
              {isLocked ? <Lock size={12} /> : percent >= 90 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              <span>{statusText}</span>
            </span>
          </div>

          {/* Usage Metrics Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/60 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Đã dùng:</span>
              <strong className="text-slate-900 font-extrabold">{usedStr}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Giới hạn:</span>
              <strong className="text-blue-600 font-extrabold">{limitStr}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Pin máy:</span>
              <strong className="text-emerald-700 font-extrabold">🔋 {battery}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4 SIGNATURE ACTION BUTTONS (TIERED FOR EASE OF USE) */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        {/* Row 1: 2 Primary Hero Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Button 1: Khóa máy ngay / Mở khóa */}
          <button
            type="button"
            disabled={Boolean(gaugeCooldown['lock'])}
            onClick={handleToggleLock}
            className={`py-3 px-3 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-2 border ${
              gaugeCooldown['lock']
                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                : isLocked
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-600 shadow-rose-500/25'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-slate-900/20'
            }`}
          >
            {gaugeCooldown['lock'] ? (
              <span>Chờ {gaugeCooldown['lock']}s...</span>
            ) : isLocked ? (
              <>
                <Unlock size={17} strokeWidth={2.5} />
                <span>Mở Khóa Máy</span>
              </>
            ) : (
              <>
                <Lock size={17} strokeWidth={2.5} />
                <span>Khóa Máy Ngay</span>
              </>
            )}
          </button>

          {/* Button 2: Thưởng thêm 15 phút (+15m) */}
          <button
            type="button"
            disabled={Boolean(gaugeCooldown['bonus'])}
            onClick={handleBonus15Mins}
            className={`py-3 px-3 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center gap-2 border ${
              gaugeCooldown['bonus']
                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600'
            }`}
          >
            <PlusCircle size={17} strokeWidth={2.5} />
            <span>{gaugeCooldown['bonus'] ? `Chờ ${gaugeCooldown['bonus']}s` : '+15 Phút Thưởng'}</span>
          </button>
        </div>

        {/* Row 2: 2 Secondary Quick Toggles */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Button 3: Chế độ giờ học */}
          <button
            type="button"
            onClick={handleToggleStudyMode}
            className={`py-2 px-3 rounded-xl font-bold text-[11px] transition-all active:scale-95 cursor-pointer border flex items-center justify-center gap-1.5 ${
              isStudyMode
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-extrabold shadow-2xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <BookOpen size={14} className={isStudyMode ? 'text-indigo-600' : 'text-slate-400'} />
            <span>{isStudyMode ? '📚 Đang Giờ Học' : 'Giờ Học Bài'}</span>
          </button>

          {/* Button 4: Đổ chuông tìm máy */}
          <button
            type="button"
            disabled={Boolean(gaugeCooldown['buzz'])}
            onClick={handleLoudSignal}
            className={`py-2 px-3 rounded-xl font-bold text-[11px] transition-all active:scale-95 cursor-pointer border flex items-center justify-center gap-1.5 ${
              gaugeCooldown['buzz']
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-600 hover:text-sky-700'
            }`}
          >
            <Volume2 size={14} className={gaugeCooldown['buzz'] ? 'text-slate-400' : 'text-sky-500'} />
            <span>{gaugeCooldown['buzz'] ? `Chờ ${gaugeCooldown['buzz']}s` : 'Chuông Tìm Máy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
