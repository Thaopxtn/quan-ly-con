import React from 'react';
import { ShieldAlert, MapPin, Phone, X, Navigation } from 'lucide-react';

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
  if (!isVisible) return null;

  const displayTime = time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const displayAddress = address || 'Đang cập nhật vị trí...';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50 pointer-events-auto transition-all animate-in slide-in-from-top-4 duration-300"
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
              onClick={onDismiss}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Navigation size={13} />
              <span>Xem vị trí</span>
            </button>
          )}

          <a
            href={`tel:${childPhone}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-colors text-center"
          >
            <Phone size={13} className="text-emerald-500" />
            <span>Gọi cho con</span>
          </a>

          <button
            onClick={onDismiss}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Đã xử lý
          </button>
        </div>
      </div>
    </div>
  );
};
