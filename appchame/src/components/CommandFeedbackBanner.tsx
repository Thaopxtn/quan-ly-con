import React, { useEffect } from 'react';
import { CheckCircle2, Loader2, AlertTriangle, Radio, X, Smartphone, Check } from 'lucide-react';
import { useAppState } from '@shared/store';

export const CommandFeedbackBanner: React.FC = () => {
  const { state, clearLastCommandAck } = useAppState();
  const ack = state.lastCommandAck;

  // Auto-dismiss executed notification after 8 seconds
  useEffect(() => {
    if (ack && ack.status === 'executed') {
      const timer = setTimeout(() => {
        clearLastCommandAck();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [ack, clearLastCommandAck]);

  if (!ack) return null;

  const timeStr = ack.executedAt
    ? new Date(ack.executedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ack.sentAt
    ? new Date(ack.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

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
    <div
      role="status"
      aria-live="polite"
      className="fixed top-14 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50 pointer-events-auto transition-all animate-in slide-in-from-top-3 duration-300 select-none shadow-2xl"
    >
      <div
        className={`rounded-2xl p-4 border-2 shadow-2xl flex flex-col gap-2 transition-colors ${
          isExecuted
            ? 'bg-slate-900 border-emerald-500 text-white'
            : isReceived
            ? 'bg-slate-900 border-sky-400 text-white'
            : isTimeout
            ? 'bg-slate-900 border-amber-500 text-white'
            : 'bg-slate-900 border-indigo-500 text-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {isPending && (
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center animate-spin">
                <Loader2 size={16} />
              </div>
            )}
            {isReceived && (
              <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Check size={16} />
              </div>
            )}
            {isExecuted && (
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center animate-bounce">
                <CheckCircle2 size={17} />
              </div>
            )}
            {isTimeout && (
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    isExecuted
                      ? 'text-emerald-400'
                      : isReceived
                      ? 'text-sky-400'
                      : isTimeout
                      ? 'text-amber-400'
                      : 'text-indigo-400'
                  }`}
                >
                  {isExecuted
                    ? 'Đã Thực Thi Trên Máy Con'
                    : isReceived
                    ? 'Máy Con Đã Nhận Lệnh'
                    : isTimeout
                    ? 'Chưa Nhận Được Phản Hồi'
                    : 'Đang Gửi Lệnh Đến Máy Con...'}
                </span>
                {timeStr && <span className="text-[10px] text-slate-400 font-mono">({timeStr})</span>}
              </div>
            </div>
          </div>

          <button
            onClick={() => clearLastCommandAck()}
            className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content detail */}
        <div className="text-xs text-slate-200 leading-snug pl-9">
          <div className="font-bold text-white mb-1 flex items-center gap-2">
            <span className="text-amber-300 font-extrabold">{ack.commandTitle}</span>
            <span className="text-[11px] bg-white/15 text-slate-200 px-2 py-0.5 rounded-full font-medium">
              {childLabel}
            </span>
          </div>

          <p className="text-xs text-slate-300">
            {isExecuted
              ? `Điện thoại của ${childLabel} đã nhận tín hiệu và hoàn thành lệnh!`
              : isReceived
              ? `Điện thoại của ${childLabel} đã kết nối và đang áp dụng...`
              : isTimeout
              ? `Điện thoại của ${childLabel} chưa phản hồi mạng. Lệnh sẽ tự động chạy ngay khi máy con kết nối 4G/WiFi.`
              : `Hệ thống đang truyền lệnh đến máy ${childLabel}. Vui lòng đợi trong giây lát...`}
          </p>

          {ack.deviceName && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1.5">
              <Smartphone size={12} className="text-indigo-400" />
              <span>Thiết bị: <strong className="text-slate-200">{ack.deviceName}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
