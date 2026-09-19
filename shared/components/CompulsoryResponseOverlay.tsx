import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, MessageCircle, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface CompulsoryResponseOverlayProps {
  messageText: string;
  senderName?: string;
  onSendReply: (replyText: string) => void;
  onPlayAudio?: () => void;
}

export const CompulsoryResponseOverlay: React.FC<CompulsoryResponseOverlayProps> = ({
  messageText,
  senderName = 'Bố Mẹ',
  onSendReply,
  onPlayAudio,
}) => {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickReplies = [
    'Con nghe rồi ạ! 👍',
    'Con đang học bài 📚',
    'Con chuẩn bị về nhà 🚲',
    'Con hiểu rồi Bố Mẹ ơi ❤️',
    'Con đồng ý ạ 👌',
  ];

  const handleSend = (textToSend?: string) => {
    const finalMsg = (textToSend || replyText).trim();
    if (!finalMsg) return;
    haptics.success();
    setIsSubmitting(true);
    onSendReply(finalMsg);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border-2 border-rose-500/80 animate-in zoom-in-95">
        {/* Urgent Alert Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-rose-100">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/30 animate-bounce">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 tracking-wider">
              Yêu cầu bắt buộc
            </span>
            <h3 className="text-base font-black text-slate-900 leading-snug mt-0.5">
              Lời Dặn Khẩn Cấp Từ {senderName}
            </h3>
          </div>
        </div>

        {/* Message Box */}
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-2">
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} />
              <span>Nội dung tin nhắn:</span>
            </span>
            {onPlayAudio && (
              <button
                type="button"
                onClick={onPlayAudio}
                className="flex items-center gap-1 text-[11px] bg-rose-200/60 hover:bg-rose-200 text-rose-900 px-2 py-0.5 rounded-lg transition active:scale-95"
              >
                <Volume2 size={12} />
                <span>Nghe lại</span>
              </button>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 leading-relaxed italic">
            &ldquo;{messageText}&rdquo;
          </p>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          ⚠️ Con cần phản hồi lại Bố Mẹ để mở khóa tiếp tục sử dụng máy:
        </p>

        {/* Quick Answer Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => {
                setReplyText(qr);
                handleSend(qr);
              }}
              disabled={isSubmitting}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition active:scale-95 cursor-pointer"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Hoặc gõ câu trả lời của con..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!replyText.trim() || isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
          >
            <Send size={15} />
            <span>Gửi phản hồi & Tiếp tục dùng máy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
