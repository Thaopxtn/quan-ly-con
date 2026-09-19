import React, { useState } from 'react';
import { ShieldAlert, MapPin, Phone, X, Navigation, Copy, Check } from 'lucide-react';
import { makePhoneCall } from '@shared/utils/phoneCall';
import { safeCopyToClipboard } from '@shared/utils/clipboard';

export interface SystemNotificationBannerProps {
  isVisible: boolean;
  childName: string;
  childAvatar?: string;
  childPhone?: string;
  time?: string;
  address?: string;
  onDismiss: () => void;
  onOpenMap?: () => void;
}

export const SystemNotificationBanner: React.FC<SystemNotificationBannerProps> = ({
  isVisible,
  childName,
  childAvatar = 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80',
  childPhone = '0987654321',
  time,
  address,
  onDismiss,
  onOpenMap,
}) => {
  const [showCallInfo, setShowCallInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isVisible) return null;

  const displayTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const displayAddress = address || 'Đang cập nhật vị trí...';

  const handleCallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    makePhoneCall(childPhone);
    setShowCallInfo(true);
  };

  const handleCopyPhone = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await safeCopyToClipboard(childPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={(e) => e.stopPropagation()}
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50 pointer-events-auto transition-all animate-in slide-in-from-top-4 duration-300 select-none"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-red-500/80 dark:border-red-600 rounded-2xl p-3.5 shadow-2xl ring-1 ring-black/5 flex flex-col gap-2.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-xs tracking-wide uppercase">
              <ShieldAlert size={14} className="text-red-500 shrink-0" />
              <span>Báo Động Khẩn SOS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {displayTime}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              aria-label="Đóng thông báo"
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3">
          <img
            src={childAvatar}
            alt={childName}
            className="w-10 h-10 rounded-full object-cover border border-red-200 dark:border-red-900/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {childName} vừa gửi cảnh báo cứu hộ!
            </div>
            <div className="flex items-start gap-1 text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              <MapPin size={12} className="text-red-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{displayAddress}</span>
            </div>
          </div>
        </div>

        {/* Quick Phone Tray for Desktop & Safe Calling */}
        {showCallInfo && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <Phone size={14} className="text-emerald-600 shrink-0" />
              <div className="truncate">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Số điện thoại của bé:</p>
                <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 tracking-wider font-mono">{childPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCallInfo(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {onOpenMap && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMap();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Navigation size={13} />
              <span>Xem vị trí</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCallClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
          >
            <Phone size={13} className="text-emerald-500" />
            <span>Gọi cho con</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Đã xử lý
          </button>
        </div>
      </div>
    </div>
  );
};
