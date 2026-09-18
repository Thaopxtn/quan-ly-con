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

  const triggerFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 2500);
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

  // Fast action handlers
  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
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

      {/* 4 KIDS360 SIGNATURE QUICK ACTION MODE PILLS */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        {/* Button 1: Tạm dừng / Khóa tức thì */}
        <button
          type="button"
          onClick={handleToggleLock}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-2xs group ${
            isLocked
              ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
          title={isLocked ? 'Bấm để mở khóa cho con' : 'Khóa dừng thiết bị ngay'}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition group-hover:scale-110 ${
            isLocked ? 'bg-rose-500 text-white shadow-xs' : 'bg-rose-50 text-rose-600'
          }`}>
            {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
          </div>
          <span className="text-[10px] font-black leading-tight text-center">
            {isLocked ? 'Mở khóa' : 'Khóa ngay'}
          </span>
        </button>

        {/* Button 2: Thưởng thêm 15 phút (+15m) */}
        <button
          type="button"
          onClick={handleBonus15Mins}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 transition-all active:scale-95 cursor-pointer shadow-2xs group"
          title="Tặng nhanh 15 phút giải trí cho con"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1 transition group-hover:scale-110">
            <PlusCircle size={16} />
          </div>
          <span className="text-[10px] font-black leading-tight text-center">
            +15 Phút
          </span>
        </button>

        {/* Button 3: Chế độ giờ học (Study Mode) */}
        <button
          type="button"
          onClick={handleToggleStudyMode}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 cursor-pointer shadow-2xs group ${
            isStudyMode
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
          title="Bật/Tắt chế độ học tập (Chỉ mở app học & gọi điện)"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1 transition group-hover:scale-110 ${
            isStudyMode ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <BookOpen size={16} />
          </div>
          <span className="text-[10px] font-black leading-tight text-center">
            Giờ học
          </span>
        </button>

        {/* Button 4: Phát chuông lớn tìm kiếm (Loud Signal) */}
        <button
          type="button"
          onClick={handleLoudSignal}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white hover:bg-sky-50/80 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-800 transition-all active:scale-95 cursor-pointer shadow-2xs group"
          title="Phát chuông lớn tìm máy hoặc nhắc nhở con"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-1 transition group-hover:scale-110">
            <Volume2 size={16} />
          </div>
          <span className="text-[10px] font-black leading-tight text-center">
            Chuông báo
          </span>
        </button>
      </div>
    </div>
  );
};
