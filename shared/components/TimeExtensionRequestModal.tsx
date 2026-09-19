import React, { useState } from 'react';
import { Clock, Send, X, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface TimePreset {
  minutes: number; // -1 represents "cho đến khi khóa"
  label: string;
  badge?: string;
}

export const TIME_EXTENSION_PRESETS: TimePreset[] = [
  { minutes: 1, label: '1 phút' },
  { minutes: 5, label: '5 phút' },
  { minutes: 15, label: '15 phút', badge: 'Gợi ý' },
  { minutes: 30, label: '30 phút', badge: 'Học bài' },
  { minutes: 60, label: '1 giờ' },
  { minutes: 180, label: '3 giờ' },
  { minutes: 300, label: '5 giờ' },
  { minutes: 480, label: '8 giờ' },
  { minutes: 720, label: '12 giờ' },
  { minutes: -1, label: 'Đến khi khóa', badge: 'Mở luôn' },
];

interface TimeExtensionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAppOrDeviceName?: string;
  onSubmit: (minutes: number, reason: string) => void;
}

export const TimeExtensionRequestModal: React.FC<TimeExtensionRequestModalProps> = ({
  isOpen,
  onClose,
  targetAppOrDeviceName = 'Thiết bị',
  onSubmit,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [reason, setReason] = useState<string>('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const quickReasons = [
    'Con cần xem bài tập cô giao 📚',
    'Con đang gọi học nhóm cùng bạn 👥',
    'Con tra từ điển học tiếng Anh 📖',
    'Con xin giải trí một chút thôi ạ 🎮',
  ];

  const handleSend = () => {
    haptics.medium();
    const finalReason = reason.trim() || 'Con xin Bố Mẹ mở thêm giờ dùng máy ạ';
    onSubmit(selectedMinutes, finalReason);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1200);
  };

  const getPresetDisplay = (mins: number) => {
    if (mins === -1) return 'Cho đến khi khóa máy';
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours} giờ ${remainingMins} phút` : `${hours} giờ`;
    }
    return `${mins} phút`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 border border-slate-100 animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Xin Mở Máy / Thêm Giờ Dùng
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                {targetAppOrDeviceName ? `Áp dụng: ${targetAppOrDeviceName}` : 'Gửi yêu cầu tới điện thoại Bố Mẹ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">Đã gửi yêu cầu thành công!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Bố Mẹ sẽ nhận được thông báo xin <strong>{getPresetDisplay(selectedMinutes)}</strong> ngay lập tức.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Time Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Chọn thời gian con muốn xin:</span>
                <span className="text-blue-600 font-black">
                  {getPresetDisplay(selectedMinutes)}
                </span>
              </label>

              <div className="grid grid-cols-5 gap-1.5">
                {TIME_EXTENSION_PRESETS.map((p) => {
                  const isSelected = selectedMinutes === p.minutes;
                  return (
                    <button
                      key={p.minutes}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSelectedMinutes(p.minutes);
                      }}
                      className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-black leading-tight">{p.label}</span>
                      {p.badge && (
                        <span
                          className={`text-[8px] font-bold px-1 rounded-md mt-0.5 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lý do con cần dùng:</label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => {
                      haptics.light();
                      setReason(qr);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all active:scale-95 text-left ${
                      reason === qr
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Hoặc gõ lời nhắn gửi Bố Mẹ..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="flex-[2] py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
              >
                <Send size={14} />
                <span>Gửi yêu cầu ({getPresetDisplay(selectedMinutes)})</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
