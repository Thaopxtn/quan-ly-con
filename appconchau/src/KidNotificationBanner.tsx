import React, { useEffect } from 'react';
import { Volume2, X, CheckCircle2, Heart, Star, ThumbsUp, Clock } from 'lucide-react';
import { playNotificationSound } from '@shared/services/systemNotificationService';

export interface KidNotificationBannerProps {
  isVisible: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  timestamp?: string;
  bonusStars?: number;
  notifId?: string;
  onDismiss: () => void;
  onSpeak?: () => void;
  onReply?: (responseText: string) => void;
}

export const KidNotificationBanner: React.FC<KidNotificationBannerProps> = ({
  isVisible,
  title,
  message,
  imageUrl = '📢',
  timestamp,
  bonusStars,
  notifId,
  onDismiss,
  onSpeak,
  onReply,
}) => {
  useEffect(() => {
    if (isVisible) {
      playNotificationSound(bonusStars && bonusStars > 0 ? 'success' : 'info');
    }
  }, [isVisible, bonusStars]);

  // Auto-dismiss banner after 30 seconds to prevent permanent screen blockage
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 30000);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  const displayTime =
    timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const handleReplyClick = (replyText: string) => {
    try {
      if (onReply) {
        onReply(replyText);
      }
    } catch (err) {
      console.warn('Error in onReply:', err);
    } finally {
      onDismiss();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={(e) => e.stopPropagation()}
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50 pointer-events-auto transition-all animate-in slide-in-from-top-4 duration-300 select-none"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-blue-400 dark:border-blue-500 rounded-3xl p-4 shadow-2xl ring-2 ring-blue-500/20 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] tracking-wider uppercase">
              <Heart size={14} className="text-rose-500 fill-rose-500" />
              <span>Lời Dặn Từ Bố Mẹ</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {displayTime}
            </span>
            {onSpeak && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSpeak();
                }}
                aria-label="Đọc lời nhắn"
                className="p-1 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                <Volume2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              aria-label="Đóng thông báo"
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-100 to-sky-100 dark:from-blue-900/40 dark:to-sky-900/40 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            {imageUrl || '📢'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug truncate">
              {title || 'Lời dặn từ Bố Mẹ'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-3 font-medium">
              {message}
            </p>

            {bonusStars && bonusStars > 0 && (
              <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                <Star size={11} className="fill-amber-400 text-amber-500" />
                <span>Bố mẹ tặng con +{bonusStars} sao ⭐</span>
              </div>
            )}
          </div>
        </div>

        {/* Kid Quick Reply Buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400">Trả lời nhanh cho Bố Mẹ:</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReplyClick('Con biết rồi ạ');
              }}
              className="py-1.5 px-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-xl text-[10.5px] font-bold border border-blue-200/60 dark:border-blue-800 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer truncate"
            >
              <CheckCircle2 size={12} className="shrink-0" />
              <span className="truncate">Biết rồi ạ</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReplyClick('Con làm ngay');
              }}
              className="py-1.5 px-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-[10.5px] font-bold border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer truncate"
            >
              <ThumbsUp size={12} className="shrink-0" />
              <span className="truncate">Làm ngay</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReplyClick('Cho con thêm 5 phút nhé');
              }}
              className="py-1.5 px-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-xl text-[10.5px] font-bold border border-amber-200/60 dark:border-amber-800 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer truncate"
            >
              <Clock size={12} className="shrink-0" />
              <span className="truncate">Thêm 5p</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KidNotificationBanner;
