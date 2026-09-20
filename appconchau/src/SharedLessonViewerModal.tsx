import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, CheckCircle2, BookOpen, AlertCircle, X, Sparkles, Award } from 'lucide-react';
import { fireSafeConfetti } from '../../shared/utils/safeConfetti';
import { SharedLessonLink } from '../../shared/types';
import { EmergencyContactBar } from './EmergencyContactBar';

interface SharedLessonViewerModalProps {
  sharedLink: SharedLessonLink | null;
  onClose: () => void;
  parentPhone?: string;
  allowedEmergencyApps?: Array<'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat'>;
  onOpenChat: () => void;
  onRewardStars?: (stars: number) => void;
}

export const SharedLessonViewerModal: React.FC<SharedLessonViewerModalProps> = ({
  sharedLink,
  onClose,
  parentPhone = '0987654321',
  allowedEmergencyApps = ['phone', 'sms', 'zalo', 'family_chat'],
  onOpenChat,
  onRewardStars,
}) => {
  if (!sharedLink || !sharedLink.isOpen) return null;

  const totalForcedSeconds = Math.max(0, (sharedLink.forcedMinutes || 0) * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalForcedSeconds);
  const [isCompleted, setIsCompleted] = useState<boolean>(totalForcedSeconds === 0);

  useEffect(() => {
    setRemainingSeconds(totalForcedSeconds);
    setIsCompleted(totalForcedSeconds === 0);
  }, [sharedLink.id, totalForcedSeconds]);

  // Countdown timer effect
  useEffect(() => {
    if (totalForcedSeconds <= 0) {
      setIsCompleted(true);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCompleted(true);
          // Confetti celebration
          try {
            fireSafeConfetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (_) {}
          if (onRewardStars) {
            onRewardStars(2);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalForcedSeconds, onRewardStars]);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progressPercent = totalForcedSeconds > 0
    ? Math.min(100, Math.round(((totalForcedSeconds - remainingSeconds) / totalForcedSeconds) * 100))
    : 100;

  const handleOpenLink = () => {
    window.open(sharedLink.url, '_system');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md text-white flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Bài Học Bố Mẹ Gửi Cho Con
            </span>
            <h3 className="text-base font-black text-white truncate max-w-xs">
              {sharedLink.title || 'Bài học đặc biệt'}
            </h3>
          </div>
        </div>

        {/* Close Button (Always enabled so child can dismiss or close) */}
        <button
          type="button"
          onClick={onClose}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
            isCompleted
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 size={14} />
              <span>Đã xong ✕</span>
            </>
          ) : (
            <>
              <X size={14} />
              <span>Đóng lại</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 my-3 flex flex-col space-y-3 overflow-y-auto">
        {/* Forced Watch Timer Banner */}
        {totalForcedSeconds > 0 && (
          <div className={`p-4 rounded-3xl border transition-all ${
            isCompleted
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-amber-900/40 border-amber-500/40 text-amber-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                {isCompleted ? <Award size={16} className="text-emerald-400" /> : <Clock size={16} className="text-amber-400 animate-pulse" />}
                <span>
                  {isCompleted
                    ? '🎉 Xuất sắc! Con đã hoàn thành thời gian xem bài học!'
                    : `🔒 Chế độ học tập: Con cần xem trong ${timeFormatted} nữa`}
                </span>
              </span>
              <span className="text-xs font-black font-mono">
                {isCompleted ? '100%' : `${progressPercent}%`}
              </span>
            </div>

            <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-400 shadow-sm' : 'bg-gradient-to-r from-amber-400 to-yellow-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {isCompleted ? (
              <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                <Sparkles size={13} />
                <span>Bé được thưởng +2 ⭐ vào heo đất vì tinh thần học tập chăm chỉ!</span>
              </p>
            ) : (
              <p className="text-[10.5px] text-amber-300/80 mt-1.5">
                Bố Mẹ muốn con tập trung theo dõi hết nội dung này trước khi thoát ra chơi.
              </p>
            )}
          </div>
        )}

        {/* Note / Message from parents */}
        {sharedLink.note && (
          <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-amber-400 block mb-1">💬 Lời dặn từ Bố Mẹ:</span>
            <span>"{sharedLink.note}"</span>
          </div>
        )}

        {/* Link Preview & Action Box */}
        <div className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800 flex flex-col items-center justify-center text-center space-y-4 my-auto">
          <div className="w-16 h-16 rounded-3xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-2xl shadow-inner">
            🌐
          </div>

          <div className="space-y-1 max-w-md">
            <h4 className="text-base font-black text-white">{sharedLink.title}</h4>
            <p className="text-xs text-slate-400 break-all font-mono line-clamp-2 px-2">
              {sharedLink.url}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenLink}
            className="w-full max-w-xs py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <ExternalLink size={16} />
            <span>MỞ BÀI HỌC TRÊN TRÌNH DUYỆT ➔</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full max-w-xs py-2 text-slate-400 hover:text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition active:scale-95 cursor-pointer text-center"
          >
            Để sau / Đóng lại
          </button>
        </div>
      </div>

      {/* Footer: Emergency Contact Bar (Always Available) */}
      <EmergencyContactBar
        parentPhone={parentPhone}
        allowedApps={allowedEmergencyApps}
        onOpenChat={onOpenChat}
        title="Liên hệ Bố Mẹ khi cần trợ giúp bài học:"
      />
    </div>
  );
};
