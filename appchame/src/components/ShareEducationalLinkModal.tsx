import React, { useState } from 'react';
import { X, ExternalLink, Clock, Send, Sparkles, BookOpen, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAppState } from '@shared/store';

interface ShareEducationalLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
}

const SAMPLE_LINKS = [
  { title: 'Toán học vui tiểu học', url: 'https://vuihoc.vn', duration: 15 },
  { title: 'Tiếng Anh trẻ em YouTube', url: 'https://youtube.com', duration: 10 },
  { title: 'Khám phá thế giới động vật', url: 'https://nationalgeographic.com', duration: 15 },
  { title: 'Luyện đọc sách thiếu nhi', url: 'https://sachvui.vn', duration: 20 },
];

export const ShareEducationalLinkModal: React.FC<ShareEducationalLinkModalProps> = ({
  isOpen,
  onClose,
  childName = 'Con',
}) => {
  const { state, sendSharedLinkToKid, closeSharedLinkOnKid } = useAppState();
  const currentChildId = state.selectedChildId;
  const currentSettings = state.childSettings[currentChildId];
  const activeSharedLink = currentSettings?.activeSharedLink;

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [forcedMinutes, setForcedMinutes] = useState<number>(15);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    sendSharedLinkToKid(
      url.trim(),
      title.trim() || 'Bài học Bố Mẹ gửi cho con',
      forcedMinutes,
      note.trim()
    );

    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1200);
  };

  const handleCloseActive = () => {
    closeSharedLinkOnKid();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Gửi Link Bài Học Cho Con</h3>
              <p className="text-xs text-slate-500">Tự động mở trên máy của {childName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active Shared Link Banner if currently open */}
        {activeSharedLink?.isOpen && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-black uppercase text-amber-800 flex items-center gap-1">
                <Clock size={12} />
                <span>Đang mở trên máy con</span>
              </span>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{activeSharedLink.title}</p>
              {activeSharedLink.forcedMinutes > 0 && (
                <span className="text-[10px] text-amber-700">Ép xem: {activeSharedLink.forcedMinutes} phút</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseActive}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
            >
              Tắt bài học
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3.5">
          {/* URL Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Đường dẫn liên kết (Website, Youtube, Bài học...):
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Gợi ý nhanh bài học:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_LINKS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUrl(s.url);
                    setTitle(s.title);
                    setForcedMinutes(s.duration);
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-bold rounded-xl transition cursor-pointer border border-blue-200/60"
                >
                  + {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Tiêu đề bài giảng / Tên nội dung:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Ôn tập Toán hình học bài 3"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          {/* Forced Watch Duration Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock size={14} className="text-amber-600" />
                <span>Thời gian ép xem trước khi được thoát:</span>
              </label>
              <span className="text-xs font-black text-amber-600">
                {forcedMinutes === 0 ? 'Tự do đóng' : `${forcedMinutes} phút`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Tự do', val: 0 },
                { label: '5 phút', val: 5 },
                { label: '10 phút', val: 10 },
                { label: '15 phút', val: 15 },
                { label: '30 phút', val: 30 },
                { label: '45 phút', val: 45 },
                { label: '60 phút', val: 60 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForcedMinutes(opt.val)}
                  className={`py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                    forcedMinutes === opt.val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-400 italic">
              * Khi bật ép xem, ứng dụng máy con sẽ khóa nút thoát cho đến khi xem hết số phút quy định.
            </p>
          </div>

          {/* Note Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Lời dặn thêm từ Bố Mẹ (tùy chọn):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Con hãy xem kỹ video rồi làm bài tập nhé!"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!url.trim() || isSent}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {isSent ? (
              <span>✅ ĐÃ GỬI & MỞ TRÊN MÁY CON!</span>
            ) : (
              <>
                <Send size={15} />
                <span>🚀 GỬI & MỞ BÀI HỌC TRÊN MÁY CON NGAY</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
