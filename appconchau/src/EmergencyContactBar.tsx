import React from 'react';
import { Phone, MessageSquare, Send, HeartHandshake } from 'lucide-react';

interface EmergencyContactBarProps {
  parentPhone?: string;
  allowedApps?: Array<'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat'>;
  onOpenChat: () => void;
  title?: string;
}

export const EmergencyContactBar: React.FC<EmergencyContactBarProps> = ({
  parentPhone = '0987654321',
  allowedApps = ['phone', 'sms', 'zalo', 'family_chat'],
  onOpenChat,
  title = 'Con có thể liên hệ Bố Mẹ bất kỳ lúc nào:',
}) => {
  const cleanPhone = parentPhone.replace(/\s+/g, '');

  const handleCall = () => {
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleSms = () => {
    window.location.href = `sms:${cleanPhone}?body=Con chào Bố Mẹ! Con đang cần liên hệ với Bố Mẹ.`;
  };

  const handleZalo = () => {
    // Open Zalo via deep link or web
    window.open(`https://zalo.me/${cleanPhone}`, '_system');
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-700/80 p-3.5 rounded-3xl space-y-2.5 shadow-2xl">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
          <HeartHandshake size={14} className="text-emerald-400" />
          <span>{title}</span>
        </span>
        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-600/40 px-2 py-0.5 rounded-full">
          Luôn sẵn sàng 24/7
        </span>
      </div>

      {/* Main Big Call Button */}
      <button
        type="button"
        onClick={handleCall}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ring-2 ring-emerald-400/30 cursor-pointer"
      >
        <Phone size={18} className="animate-bounce" />
        <span>GỌI CHO BỐ MẸ NGAY ({cleanPhone})</span>
      </button>

      {/* Allowed Secondary Messaging Apps */}
      <div className="flex items-center gap-2">
        {allowedApps.includes('sms') && (
          <button
            type="button"
            onClick={handleSms}
            className="flex-1 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600/80 rounded-xl text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <Send size={13} className="text-sky-400" />
            <span>Nhắn SMS</span>
          </button>
        )}

        {allowedApps.includes('zalo') && (
          <button
            type="button"
            onClick={handleZalo}
            className="flex-1 py-2 px-2.5 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 rounded-xl text-[11px] font-bold text-blue-200 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="font-black text-[12px] text-blue-400">Z</span>
            <span>Zalo Bố Mẹ</span>
          </button>
        )}

        {allowedApps.includes('family_chat') && (
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 py-2 px-2.5 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/50 rounded-xl text-[11px] font-bold text-purple-200 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
          >
            <MessageSquare size={13} className="text-purple-400" />
            <span>Chat Gia Đình</span>
          </button>
        )}
      </div>
    </div>
  );
};
