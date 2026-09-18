import React, { useState } from 'react';
import {
  ChevronLeft,
  MessageSquare,
  Send,
  XCircle,
  Sparkles,
  Smartphone,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface BroadcastOverlayActivityProps {
  onBack: () => void;
}

export const BroadcastOverlayActivity: React.FC<BroadcastOverlayActivityProps> = ({ onBack }) => {
  const { state, broadcastOverlay, clearBroadcastOverlay } = useAppState();
  const { broadcastMessage } = state;

  const [title, setTitle] = useState('Bố mẹ có lời nhắc!');
  const [message, setMessage] = useState('Đã đến giờ ăn cơm rồi, con hãy cất máy và ra ngoài với cả nhà nhé.');
  const [selectedSticker, setSelectedSticker] = useState('🍚');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const stickers = [
    { label: 'Ăn cơm', emoji: '🍚' },
    { label: 'Ngủ ngon', emoji: '🌙' },
    { label: 'Học bài', emoji: '📚' },
    { label: 'Uống nước', emoji: '💧' },
    { label: 'Cảnh báo', emoji: '⚠️' },
    { label: 'Khen ngợi', emoji: '⭐' },
    { label: 'Hoa quả', emoji: '🍎' },
    { label: 'Vận động', emoji: '🏃' },
  ];

  const templates = [
    {
      title: 'Giờ ăn cơm rồi! 🍚',
      desc: 'Cả nhà đang chờ cơm, con cất máy ra ăn cơm nhé!',
      sticker: '🍚',
    },
    {
      title: 'Đã đến giờ đi ngủ! 🌙',
      desc: 'Bé yêu hãy tắt máy, đánh răng và đi ngủ sớm để cao lớn nhé.',
      sticker: '🌙',
    },
    {
      title: 'Nghỉ mắt & Uống nước! 💧',
      desc: 'Con đã dùng máy hơn 45 phút rồi. Hãy đứng dậy uống ly nước và ngắm cây xanh 5 phút nhé!',
      sticker: '💧',
    },
    {
      title: 'Hôm nay con học rất tốt! ⭐',
      desc: 'Bố mẹ rất tự hào về tinh thần tự giác học tập của con hôm nay!',
      sticker: '⭐',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-8 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Phát Đè Màn Hình</span>
              {broadcastMessage?.isShowing && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  Đang Phát
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Hiển thị thông điệp khẩn lên máy con</p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Active Broadcast Alert */}
        {broadcastMessage?.isShowing && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{broadcastMessage.imageUrl || '📢'}</span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-200">
                    Đang Phát Trên Điện Thoại Con
                  </h4>
                  <p className="text-sm font-bold">{broadcastMessage.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  clearBroadcastOverlay();
                  showToast('Đã tắt thông điệp trên máy con.');
                }}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <XCircle size={14} />
                <span>Tắt thông điệp</span>
              </button>
            </div>
            <p className="text-xs text-blue-100 bg-white/10 p-2.5 rounded-xl">{broadcastMessage.message}</p>
          </div>
        )}

        {/* Composer Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Soạn Thảo Thông Điệp</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Tiêu đề thông điệp:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề lời nhắc..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Nội dung chữ viết:</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nhập nội dung thông điệp con cần đọc..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">Chọn nhãn dán / hình ảnh trực quan:</label>
            <div className="flex flex-wrap gap-2">
              {stickers.map((st) => (
                <button
                  key={st.emoji}
                  onClick={() => setSelectedSticker(st.emoji)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition active:scale-95 ${
                    selectedSticker === st.emoji
                      ? 'bg-blue-100 ring-2 ring-blue-500 scale-105 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {st.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
              <Eye size={13} />
              <span>Xem trước trên màn hình máy con:</span>
            </p>
            <div className="bg-slate-900 text-white p-4 rounded-2xl text-center space-y-2 relative overflow-hidden shadow-inner">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-3xl mx-auto shadow-md">
                {selectedSticker}
              </div>
              <span className="inline-block text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-wider">
                THÔNG ĐIỆP TỪ BỐ MẸ
              </span>
              <h4 className="text-sm font-bold text-white">{title || 'Tiêu đề'}</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                {message || 'Nội dung thông điệp sẽ hiển thị ở đây...'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!title.trim() || !message.trim()) {
                showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung!');
                return;
              }
              broadcastOverlay(title, message, selectedSticker);
              showToast('Đã phát thông điệp đè toàn màn hình máy con!');
            }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center justify-center space-x-2"
          >
            <Send size={14} />
            <span>Phát Đè Lên Màn Hình Con Ngay</span>
          </button>
        </div>

        {/* Quick Template Cards */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 px-1">Mẫu tin nhắn nhanh có sẵn:</h3>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((tpl, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setTitle(tpl.title);
                  setMessage(tpl.desc);
                  setSelectedSticker(tpl.sticker);
                  showToast('Đã áp dụng mẫu tin nhắn!');
                }}
                className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl shadow-xs transition active:scale-98 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">{tpl.sticker}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tpl.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{tpl.desc}</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg shrink-0">
                  Chọn
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
