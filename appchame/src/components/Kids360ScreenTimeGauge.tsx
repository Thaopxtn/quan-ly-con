import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  PlusCircle,
  Volume2,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wifi,
  WifiOff,
  Smartphone,
  Signal,
  Zap,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { useConnectionStatus } from '@shared/services/connectionMonitorService';
import { haptics } from '@shared/utils/haptics';
import { UsageAccessPermissionAlert } from './UsageAccessPermissionAlert';
import type { ChildProfile, ChildSpecificSettings } from '@shared/types';

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
  child?: ChildProfile;
  childSettings?: ChildSpecificSettings;
}

export const Kids360ScreenTimeGauge: React.FC<Kids360ScreenTimeGaugeProps> = ({
  childId,
  childName,
  usedMinutes,
  limitMinutes,
  isLocked = false,
  isStudyMode = false,
  battery,
  onNavigate,
  onOpenLimitModal,
  child,
  childSettings,
}) => {
  const {
    state,
    lockChildDeviceNow,
    unlockChildDeviceNow,
    buzzKidPhone,
    setCustomScreenTimeLimit,
  } = useAppState();

  const { lastCommandAck } = state;
  const isInFlightLock = Boolean(
    lastCommandAck &&
    lastCommandAck.childId === childId &&
    (lastCommandAck.command === 'lock_now' || lastCommandAck.command === 'unlock_now') &&
    (lastCommandAck.status === 'pending' || lastCommandAck.status === 'received') &&
    (Date.now() - (lastCommandAck.sentAt || 0) < 15000)
  );
  const inFlightLockCmd = isInFlightLock ? lastCommandAck : null;

  const isTimedOutLock = Boolean(
    lastCommandAck &&
    lastCommandAck.childId === childId &&
    (lastCommandAck.command === 'lock_now' || lastCommandAck.command === 'unlock_now') &&
    lastCommandAck.status === 'timeout' &&
    (Date.now() - (lastCommandAck.sentAt || 0) < 25000)
  );
  const timedOutLockCmd = isTimedOutLock ? lastCommandAck : null;

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

  // Monitor status for live latency
  const conn = useConnectionStatus();

  // Calculations
  const safeUsedMinutes = Math.max(0, Math.round(usedMinutes || 0));
  const hasLimit = limitMinutes > 0;
  const remainingMinutes = hasLimit ? Math.max(0, limitMinutes - safeUsedMinutes) : 0;
  const percent = hasLimit ? Math.min(100, Math.round((safeUsedMinutes / limitMinutes) * 100)) : 0;

  const usedH = Math.floor(safeUsedMinutes / 60);
  const usedM = safeUsedMinutes % 60;
  const usedStr = `${usedH > 0 ? `${usedH}h ` : ''}${usedM}p`;

  const limitH = Math.floor(limitMinutes / 60);
  const limitM = limitMinutes % 60;
  const limitStr = hasLimit
    ? (`${limitH > 0 ? `${limitH}h ` : ''}${limitM > 0 ? `${limitM}p` : ''}`.trim() || '0p')
    : 'Không giới hạn';

  const remH = Math.floor(remainingMinutes / 60);
  const remM = remainingMinutes % 60;
  const remainingStr = !hasLimit
    ? 'Không giới hạn'
    : remainingMinutes === 0
    ? 'Hết giờ'
    : `${remH > 0 ? `${remH}h ` : ''}${remM}p`;

  // SVG circular properties
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  const strokeDashoffset = hasLimit ? circumference - (percent / 100) * circumference : 0;

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

  // Child Network & Wi-Fi Connection Information
  const localChildSettings = state.childSettings?.[childId];
  const networkInfo = localChildSettings?.networkInfo;
  const isWifiConnected = Boolean(networkInfo?.wifiConnected || (networkInfo?.wifiSSID && networkInfo.wifiSSID !== 'Chưa kết nối'));
  const wifiSSID = isWifiConnected ? (networkInfo?.wifiSSID || 'Wi-Fi Gia Đình') : (networkInfo?.cellConnected ? (networkInfo?.carrierName || 'Dữ liệu 4G/LTE') : 'Chưa kết nối Wi-Fi');
  const wifiSignal = networkInfo?.wifiSignalDbm;

  // Fast action handlers with Anti-Spam protection
  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inFlightLockCmd || gaugeCooldown['lock']) return;
    triggerCooldown('lock');
    haptics.medium();
    if (isLocked) {
      unlockChildDeviceNow(childId);
      triggerFeedback(`Đang gửi lệnh mở khóa đến máy ${childName}... 🔓`);
    } else {
      lockChildDeviceNow(childId);
      triggerFeedback(`Đang gửi lệnh khóa đến máy ${childName}... 🔒`);
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

      {/* Usage Permission Alert if child device hasn't granted PACKAGE_USAGE_STATS */}
      <UsageAccessPermissionAlert childId={childId} compact={true} className="mb-2.5" />

      {/* Connected Wi-Fi Card - Light Modern Clean iOS Style */}
      <div
        onClick={() => onNavigate && onNavigate('network')}
        className={`mb-3 p-2.5 rounded-2xl border transition-all flex items-center justify-between shadow-2xs select-none ${
          isWifiConnected
            ? 'bg-sky-50/70 hover:bg-sky-50 border-sky-100/90 cursor-pointer active:scale-[0.99]'
            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70 cursor-pointer active:scale-[0.99]'
        }`}
        title={onNavigate ? 'Bấm để xem chi tiết tình trạng mạng & Bluetooth của con' : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isWifiConnected ? 'bg-sky-500/15 text-sky-600' : 'bg-slate-200/80 text-slate-500'
            }`}
          >
            {isWifiConnected ? <Wifi size={18} strokeWidth={2.3} /> : <WifiOff size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-800 leading-tight">
                {isWifiConnected ? `Wi-Fi: ${wifiSSID}` : wifiSSID}
              </span>
              {isWifiConnected && networkInfo?.frequency ? (
                <span className="text-[9.5px] font-bold text-sky-700 bg-sky-100/70 px-1.5 py-0.2 rounded-md">
                  {networkInfo.frequency > 4000 ? '5GHz' : '2.4GHz'}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  isWifiConnected
                    ? 'bg-emerald-100/80 text-emerald-800'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isWifiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {isWifiConnected ? 'Đã kết nối' : 'Ngoại tuyến / Chưa kết nối'}
              </span>

              {isWifiConnected && conn.server.online && conn.server.latencyMs > 0 && (
                <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-slate-600 bg-white/90 border border-slate-200/60 px-1.5 py-0.2 rounded-md">
                  ⚡ {conn.server.latencyMs}ms
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4-bar Signal Strength Indicator */}
        <div className="flex items-end gap-0.5 h-4.5 px-1 shrink-0" title="Cường độ sóng">
          {[1, 2, 3, 4].map((bar) => {
            const activeLevel =
              wifiSignal !== undefined && wifiSignal !== null
                ? wifiSignal >= -55
                  ? 4
                  : wifiSignal >= -68
                  ? 3
                  : wifiSignal >= -80
                  ? 2
                  : wifiSignal >= -92
                  ? 1
                  : 0
                : 0;
            const isLit = isWifiConnected && wifiSignal !== undefined && bar <= activeLevel;
            return (
              <span
                key={bar}
                className={`w-1 rounded-xs transition-all ${
                  isLit ? 'bg-sky-500 shadow-2xs' : 'bg-slate-200'
                }`}
                style={{ height: `${bar * 3.5 + 3}px` }}
              />
            );
          })}
        </div>
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
              <strong className="text-emerald-700 font-extrabold">🔋 {battery !== undefined && battery !== null ? `${battery}%` : '--'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4 SIGNATURE ACTION BUTTONS (TIERED FOR EASE OF USE) */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        {/* Row 1: 2 Primary Hero Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Button 1: Khóa máy ngay / Mở khóa với hiển thị trạng thái thực tế của con */}
          <button
            type="button"
            disabled={Boolean(inFlightLockCmd) || Boolean(gaugeCooldown['lock'])}
            onClick={handleToggleLock}
            className={`py-2 px-2.5 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex flex-col items-center justify-center gap-0.5 border min-h-[52px] ${
              inFlightLockCmd
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-amber-500/10 cursor-wait'
                : gaugeCooldown['lock']
                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                : isLocked
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-600 shadow-rose-500/25'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-slate-900/20'
            }`}
          >
            {inFlightLockCmd ? (
              <>
                <div className="flex items-center gap-1.5 text-amber-800">
                  <Loader2 size={15} className="animate-spin text-amber-600 shrink-0" />
                  <span className="font-extrabold text-[11px] leading-tight">
                    {inFlightLockCmd.command === 'lock_now' ? 'Đang gửi lệnh khóa...' : 'Đang gửi lệnh mở...'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-amber-900 bg-amber-200/90 px-2 py-0.2 rounded-full">
                  <span>Trạng thái con:</span>
                  <span className="underline font-black">{isLocked ? 'Đang Khóa 🔒' : 'Đang Mở 🟢'}</span>
                </div>
              </>
            ) : gaugeCooldown['lock'] ? (
              <span>Chờ {gaugeCooldown['lock']}s...</span>
            ) : isLocked ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Unlock size={16} strokeWidth={2.5} />
                  <span className="leading-tight">Mở Khóa Toàn Bộ</span>
                </div>
                <span className="text-[9.5px] opacity-80 font-semibold">
                  Máy con: Đang bị khóa 🔒
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Lock size={16} strokeWidth={2.5} />
                  <span className="leading-tight">Khóa Toàn Bộ Máy</span>
                </div>
                <span className="text-[9.5px] opacity-80 font-semibold">
                  Máy con: Đang mở 🟢
                </span>
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

        {/* Warning notification banner if command timed out (Child device offline or hasn't received) */}
        {timedOutLockCmd && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl px-2.5 py-1.5 text-[10.5px] text-amber-800 font-medium flex items-center gap-1.5 animate-fadeIn">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>
              Máy con <strong>{childName}</strong> chưa phản hồi (thiết bị có thể đang tắt mạng). Trạng thái thực tế: <strong>{isLocked ? 'Đang khóa 🔒' : 'Đang mở máy 🟢'}</strong>.
            </span>
          </div>
        )}

        {/* Row 2: Chuông Tìm Máy (nút đơn lẻ) */}
        <button
          type="button"
          disabled={Boolean(gaugeCooldown['buzz'])}
          onClick={handleLoudSignal}
          className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] transition-all active:scale-95 cursor-pointer border flex items-center justify-center gap-1.5 ${
            gaugeCooldown['buzz']
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-sky-50 border-slate-200 hover:border-sky-300 text-slate-600 hover:text-sky-700'
          }`}
        >
          <Volume2 size={14} className={gaugeCooldown['buzz'] ? 'text-slate-400' : 'text-sky-500'} />
          <span>{gaugeCooldown['buzz'] ? `Chờ ${gaugeCooldown['buzz']}s` : '🔔 Chuông Tìm Máy'}</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* DEVICE HARDWARE VITALS (Tích hợp từ ChildDeviceQuickStatusCard) */}
      {/* ═══════════════════════════════════════════════ */}
      {child && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Smartphone size={11} />
              Thông số thiết bị
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('remote')}
                className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Điều khiển <ChevronRight size={10} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Pin */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-[10px] text-slate-500 font-bold">Pin</div>
              <div className={`text-sm font-black ${
                child.battery === undefined || child.battery === null ? 'text-slate-500'
                : child.battery <= 20 ? 'text-rose-600'
                : child.battery <= 50 ? 'text-amber-600'
                : 'text-emerald-600'
              }`}>
                {child.battery !== undefined && child.battery !== null ? `${child.battery}%` : '--'}
              </div>
              <div className="text-[9px] text-slate-400">
                {child.isCharging ? '⚡ Sạc' : 'Dùng pin'}
              </div>
            </div>

            {/* Màn hình */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-[10px] text-slate-500 font-bold">Màn hình</div>
              <div className="text-sm font-black text-slate-800 truncate px-0.5">
                {child.screenState === 'screen_off' || child.isScreenOn === false ? '💤 Tắt' : '📱 Sáng'}
              </div>
              <div className="text-[9px] text-slate-400 truncate" title={child.currentApp || ''}>
                {child.currentApp || '--'}
              </div>
            </div>

            {/* Vị trí */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-[10px] text-slate-500 font-bold">Vị trí</div>
              <div className="text-[11px] font-bold text-slate-700 truncate px-0.5"
                   title={child.currentAddress || ''}>
                📍 {child.currentAddress ? child.currentAddress.split(',')[0] : 'GPS...'}
              </div>
              <div className="text-[9px] text-slate-400">
                {child.speed ? `${Math.round(child.speed)} km/h` : 'Đứng yên'}
              </div>
            </div>
          </div>

          {/* Row 2: Phần cứng nhỏ */}
          <div className="grid grid-cols-3 gap-1.5 mt-1.5">
            {/* Âm lượng */}
            <div className="p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 flex items-center gap-1.5">
              <Volume2 size={11} className="text-indigo-400 shrink-0" />
              <span className="text-[9.5px] font-bold text-slate-600 truncate">
                {child.isMuted ? 'Tắt âm' : `${child.volume ?? '--'}%`}
              </span>
            </div>

            {/* Đèn Flash */}
            <div className="p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 flex items-center gap-1.5">
              <Zap size={11} className={child.isFlashlightOn ? 'text-amber-500 fill-amber-500' : 'text-slate-400'} />
              <span className="text-[9.5px] font-bold text-slate-600">
                {child.isFlashlightOn ? 'BẬT' : 'Tắt'}
              </span>
            </div>

            {/* Mạng */}
            <div className="p-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 flex items-center gap-1.5">
              <Signal size={11} className={child.status === 'online' ? 'text-emerald-500' : 'text-slate-400'} />
              <span className="text-[9.5px] font-bold text-slate-600 truncate">
                {child.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
