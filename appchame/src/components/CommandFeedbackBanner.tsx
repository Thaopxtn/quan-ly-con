import React, { useEffect } from 'react';
import { CheckCircle2, Loader2, AlertTriangle, X, Check } from 'lucide-react';
import { useAppState, isSilentRemoteCommand } from '@shared/store';

export const CommandFeedbackBanner: React.FC = () => {
  const { state, clearLastCommandAck } = useAppState();
  const ack = state.lastCommandAck;

  // Auto-dismiss notification on ALL statuses:
  // received: 2.5s, executed: 3s, timeout: 4s, pending: 6s
  useEffect(() => {
    if (!ack) return;
    const dismissTimes: Record<string, number> = {
      received: 2500,
      executed: 3000,
      timeout: 4000,
      pending: 6000,
    };
    const duration = dismissTimes[ack.status] || 3000;
    const timer = setTimeout(() => {
      clearLastCommandAck();
    }, duration);
    return () => clearTimeout(timer);
  }, [ack?.id, ack?.status, clearLastCommandAck]);

  if (!ack) return null;
  // Completely silent for background sync / heartbeat / tracking commands
  if (isSilentRemoteCommand(ack.command, ack.commandTitle)) return null;

  const isPending = ack.status === 'pending';
  const isReceived = ack.status === 'received';
  const isExecuted = ack.status === 'executed';
  const isTimeout = ack.status === 'timeout';

  const childLabel = ack.childName
    ? ack.childName.startsWith('Bé ')
      ? ack.childName
      : `Bé ${ack.childName}`
    : 'Con';

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed bottom-24 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-sm z-50 pointer-events-auto transition-all animate-in slide-in-from-bottom-4 fade-in duration-300 select-none"
    >
      <div
        className={`rounded-2xl px-3.5 py-2.5 border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 transition-all ${
          isExecuted
            ? 'bg-slate-900/95 border-emerald-500/80 text-white ring-1 ring-emerald-500/30'
            : isReceived
            ? 'bg-slate-900/95 border-sky-400/80 text-white ring-1 ring-sky-400/30'
            : isTimeout
            ? 'bg-slate-900/95 border-amber-500/80 text-white ring-1 ring-amber-500/30'
            : 'bg-slate-900/95 border-indigo-500/80 text-white ring-1 ring-indigo-500/30'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isPending && (
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 animate-spin">
              <Loader2 size={16} />
            </div>
          )}
          {isReceived && (
            <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Check size={16} />
            </div>
          )}
          {isExecuted && (
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
              <CheckCircle2 size={17} />
            </div>
          )}
          {isTimeout && (
            <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-white truncate">
                {ack.commandTitle}
              </span>
              <span className="text-[10px] bg-white/20 text-slate-200 px-1.5 py-0.5 rounded-md shrink-0 font-medium">
                {childLabel}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              {isExecuted
                ? 'Đã thực thi trên máy con ✓'
                : isReceived
                ? 'Máy con đã nhận lệnh, đang áp dụng...'
                : isTimeout
                ? 'Chưa phản hồi (sẽ chạy khi có mạng)'
                : 'Đang gửi tín hiệu...'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => clearLastCommandAck()}
          className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
};
