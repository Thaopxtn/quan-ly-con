import React, { useState } from 'react';
import {
  X,
  Send,
  Bell,
  Sparkles,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Volume2,
  Tv,
  Star,
  CheckCircle2,
  Smile,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { AlertNotification } from '@shared/types';
import { NotificationSoundType } from '@shared/services/systemNotificationService';

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultChildId?: string;
  onSuccess?: () => void;
}

type NotificationCategory = 'reminder' | 'study' | 'reward' | 'warning' | 'emergency';

interface QuickTemplate {
  category: NotificationCategory;
  title: string;
  message: string;
  icon: string;
  bonusStars?: number;
  isOverlay?: boolean;
  soundType: NotificationSoundType;
}

const TEMPLATES: QuickTemplate[] = [
  // 1. Nhắc nhở sinh hoạt
  {
    category: 'reminder',
    title: 'Giờ ăn cơm rồi! 🍚',
    message: 'Cả nhà đang chờ cơm, con cất máy ra bàn ăn cùng gia đình nhé!',
    icon: '🍚',
    soundType: 'info',
  },
  {
    category: 'reminder',
    title: 'Đã đến giờ đi ngủ! 🌙',
    message: 'Bé yêu hãy tắt máy, đánh răng và đi ngủ sớm để ngày mai đi học thật khỏe nhé.',
    icon: '🌙',
    soundType: 'info',
  },
  {
    category: 'reminder',
    title: 'Nghỉ mắt & Uống nước! 💧',
    message: 'Con đã dùng máy một lúc rồi. Đứng dậy uống ly nước và ngắm cây xanh 5 phút nhé!',
    icon: '💧',
    soundType: 'info',
  },
  {
    category: 'reminder',
    title: 'Đến giờ tắm rửa nào! 🚿',
    message: 'Đi tắm rửa sạch sẽ và thay quần áo thơm tho thôi con ơi!',
    icon: '🚿',
    soundType: 'info',
  },

  // 2. Học tập & Nhiệm vụ
  {
    category: 'study',
    title: 'Đến giờ học bài rồi! 📚',
    message: 'Con chuẩn bị bàn học, mở sách vở và hoàn thành bài tập về nhà hôm nay nhé.',
    icon: '📚',
    soundType: 'info',
  },
  {
    category: 'study',
    title: 'Đọc sách 20 phút mỗi ngày! 📖',
    message: 'Dành 20 phút đọc một chương sách bổ ích để mở mang tri thức con nhé!',
    icon: '📖',
    soundType: 'info',
  },
  {
    category: 'study',
    title: 'Học Tiếng Anh hôm nay! 🦉',
    message: 'Đừng quên vào luyện tập Tiếng Anh để duy trì chuỗi học tập xuất sắc nhé!',
    icon: '🦉',
    soundType: 'info',
  },

  // 3. Khen thưởng & Động viên
  {
    category: 'reward',
    title: 'Hôm nay con học rất tự giác! ⭐',
    message: 'Bố mẹ rất tự hào về tinh thần tự giác của con. Bố mẹ thưởng con 5 sao nhé!',
    icon: '⭐',
    bonusStars: 5,
    soundType: 'success',
  },
  {
    category: 'reward',
    title: 'Bé ngoan giúp việc nhà! 🌟',
    message: 'Cảm ơn con yêu đã tự giác dọn phòng gọn gàng sạch sẽ. Thưởng con 3 sao!',
    icon: '🌟',
    bonusStars: 3,
    soundType: 'success',
  },
  {
    category: 'reward',
    title: 'Chúc mừng thành tích xuất sắc! 🎉',
    message: 'Con đã đạt điểm rất tốt trong bài kiểm tra. Cả nhà cùng chúc mừng con!',
    icon: '🎉',
    bonusStars: 10,
    soundType: 'success',
  },

  // 4. Cảnh báo an toàn
  {
    category: 'warning',
    title: 'Cảnh báo giữ khoảng cách mắt! 📱',
    message: 'Con đang nhìn màn hình quá gần. Hãy đưa máy ra xa ít nhất 30cm để bảo vệ mắt!',
    icon: '⚠️',
    soundType: 'warning',
    isOverlay: true,
  },
  {
    category: 'warning',
    title: 'Sắp hết giờ dùng máy! ⏳',
    message: 'Thời gian sử dụng cho phép sắp hết. Con hãy lưu lại việc đang làm và chuẩn bị cất máy nhé.',
    icon: '⏳',
    soundType: 'warning',
  },
  {
    category: 'warning',
    title: 'Không dùng máy trong phòng tối! 💡',
    message: 'Bật đèn phòng sáng lên con nhé, dùng máy trong bóng tối sẽ rất hại thị lực!',
    icon: '💡',
    soundType: 'warning',
  },

  // 5. Khẩn cấp
  {
    category: 'emergency',
    title: 'Bố mẹ cần liên hệ gấp! 📞',
    message: 'Con hãy bấm gọi lại cho bố mẹ ngay khi nhìn thấy thông báo này!',
    icon: '🚨',
    soundType: 'emergency',
    isOverlay: true,
  },
  {
    category: 'emergency',
    title: 'Đứng yên tại chỗ đợi bố mẹ! 📍',
    message: 'Bố mẹ đang trên đường đón con, con đứng yên tại chỗ an toàn đợi bố mẹ nhé!',
    icon: '📍',
    soundType: 'emergency',
    isOverlay: true,
  },
];

export const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  isOpen,
  onClose,
  defaultChildId,
  onSuccess,
}) => {
  const { state, createNotification } = useAppState();
  const { children, child } = state;

  const [selectedChildId, setSelectedChildId] = useState<string>(defaultChildId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('reminder');
  const [title, setTitle] = useState('Giờ ăn cơm rồi! 🍚');
  const [message, setMessage] = useState('Cả nhà đang chờ cơm, con cất máy ra bàn ăn cùng gia đình nhé!');
  const [icon, setIcon] = useState('🍚');
  const [bonusStars, setBonusStars] = useState<number>(0);
  const [speakTTS, setSpeakTTS] = useState<boolean>(true);
  const [isOverlay, setIsOverlay] = useState<boolean>(false);
  const [soundType, setSoundType] = useState<NotificationSoundType>('info');
  const [isSending, setIsSending] = useState<boolean>(false);

  if (!isOpen) return null;

  const allChildren = children && children.length > 0 ? children : [child];

  const handleApplyTemplate = (tmpl: QuickTemplate) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setIcon(tmpl.icon);
    setBonusStars(tmpl.bonusStars || 0);
    setIsOverlay(Boolean(tmpl.isOverlay));
    setSoundType(tmpl.soundType);
  };

  const handleCategoryChange = (cat: NotificationCategory) => {
    setSelectedCategory(cat);
    const firstMatching = TEMPLATES.find((t) => t.category === cat);
    if (firstMatching) {
      handleApplyTemplate(firstMatching);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      const alertType: AlertNotification['type'] =
        selectedCategory === 'emergency'
          ? 'sos'
          : selectedCategory === 'reward'
          ? 'reward'
          : selectedCategory === 'study'
          ? 'study'
          : selectedCategory === 'warning'
          ? 'screentime'
          : 'reminder';

      const priority: AlertNotification['priority'] =
        selectedCategory === 'emergency'
          ? 'urgent'
          : selectedCategory === 'warning'
          ? 'high'
          : selectedCategory === 'reward'
          ? 'low'
          : 'medium';

      createNotification(
        selectedChildId,
        {
          type: alertType,
          title: title.trim(),
          message: message.trim(),
          priority,
          bonusStars: bonusStars > 0 ? bonusStars : undefined,
          imageUrl: icon,
        },
        {
          speakTTS,
          isOverlay,
          soundType,
        }
      );

      if (onSuccess) onSuccess();
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-slate-800/40 dark:to-slate-800/20">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <Bell size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:white flex items-center gap-1.5">
                <span>Tạo & Gửi Thông Báo Mới</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Gửi lời dặn, nhắc nhở & thưởng sao đến máy con
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer shadow-xs"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
          {/* 1. Chọn đối tượng nhận */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              1. Gửi thông báo đến:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedChildId('all')}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  selectedChildId === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 ring-2 ring-blue-400/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>👨‍👩‍👧‍👦</span>
                <span>Tất cả các con</span>
              </button>
              {allChildren.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChildId(c.id)}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    selectedChildId === c.id
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 ring-2 ring-blue-400/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c.avatar && (c.avatar.startsWith('http') || c.avatar.startsWith('data:')) ? (
                    <img src={c.avatar} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm">{c.avatar || '👦'}</span>
                  )}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chọn Danh Mục Phân Loại */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              2. Chủ đề thông báo:
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => handleCategoryChange('reminder')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  selectedCategory === 'reminder'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>⏰</span>
                <span>Nhắc nhở</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('study')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  selectedCategory === 'study'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>📚</span>
                <span>Học tập</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('reward')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  selectedCategory === 'reward'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>⭐</span>
                <span>Khen ngợi</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('warning')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  selectedCategory === 'warning'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>⚠️</span>
                <span>Cảnh báo</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('emergency')}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 transition cursor-pointer ${
                  selectedCategory === 'emergency'
                    ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>🚨</span>
                <span>Khẩn cấp</span>
              </button>
            </div>
          </div>

          {/* 3. Mẫu Tin Nhắn Nhanh 1 Chạm */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" />
                <span>Mẫu soạn sẵn gợi ý:</span>
              </label>
              <span className="text-[10px] text-slate-400">Nhấn để áp dụng</span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
              {TEMPLATES.filter((t) => t.category === selectedCategory).map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`p-2 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                    title === tmpl.title
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/30'
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{tmpl.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tmpl.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {tmpl.message}
                      </p>
                    </div>
                  </div>
                  {tmpl.bonusStars && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black shrink-0">
                      +{tmpl.bonusStars} ⭐
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Nội Dung Soạn Thảo */}
          <div className="space-y-2.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề thông báo:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-12 h-10 text-center text-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  title="Biểu tượng cảm xúc (Emoji)"
                />
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="flex-1 h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nội dung chi tiết:
              </label>
              <textarea
                required
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập lời dặn dò con cần đọc..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* 5. Tùy Chọn Bổ Sung & Thưởng Sao */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Star size={14} className="text-amber-500 fill-amber-400" />
                <span>Tặng sao khen thưởng:</span>
              </label>
              <div className="flex gap-1">
                {[0, 1, 3, 5, 10].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setBonusStars(starVal)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl font-black transition cursor-pointer ${
                      bonusStars === starVal
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {starVal === 0 ? 'Không' : `+${starVal} ⭐`}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={speakTTS}
                  onChange={(e) => setSpeakTTS(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Volume2 size={14} className="text-blue-500" />
                  <span>Đọc giọng nói (TTS)</span>
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOverlay}
                  onChange={(e) => setIsOverlay(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="flex items-center gap-1">
                  <Tv size={14} className="text-purple-500" />
                  <span>Đè toàn màn hình</span>
                </span>
              </label>
            </div>
          </div>

          {/* 6. Live Preview */}
          <div className="pt-1">
            <p className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <span>📱 Xem trước trên máy con:</span>
            </p>
            <div className="p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-2 border-blue-200 dark:border-blue-700 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-xl shadow-xs shrink-0">
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {title || 'Tiêu đề thông báo'}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-medium">Vừa xong</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                  {message || 'Nội dung lời dặn của bố mẹ...'}
                </p>
                {bonusStars > 0 && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    Tặng +{bonusStars} ⭐ sao thưởng
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSending || !title.trim() || !message.trim()}
              className="flex-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{isSending ? 'Đang gửi...' : 'Gửi Thông Báo Ngay 🚀'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNotificationModal;
