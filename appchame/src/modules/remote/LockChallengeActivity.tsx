import React, { useState } from 'react';
import {
  ChevronLeft,
  Lock,
  Unlock,
  Calculator,
  HelpCircle,
  Footprints,
  Timer,
  Utensils,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Sliders
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { LockType } from '@shared/types';

interface LockChallengeActivityProps {
  onBack: () => void;
}

export const LockChallengeActivity: React.FC<LockChallengeActivityProps> = ({ onBack }) => {
  const { state, setLockChallenge, unlockDevice } = useAppState();
  const { lockChallenge } = state;

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const challengeOptions: Array<{
    type: LockType;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    badge?: string;
  }> = [
    {
      type: 'instant',
      title: 'Khóa tức thì',
      desc: 'Khóa hoàn toàn, chỉ bố mẹ mới có quyền mở khóa từ xa.',
      icon: <Lock size={20} />,
      color: 'bg-rose-500 text-white',
    },
    {
      type: 'math',
      title: 'Giải toán mở máy',
      desc: 'Hệ thống sinh bài toán ngẫu nhiên, con giải đúng sẽ tự động mở và nhận 5 sao thưởng ⭐.',
      icon: <Calculator size={20} />,
      color: 'bg-blue-500 text-white',
      badge: 'Thưởng 5 sao',
    },
    {
      type: 'quiz',
      title: 'Câu đố kiến thức',
      desc: 'Bộ câu hỏi trắc nghiệm khoa học tự nhiên, kích thích trí não và tư duy phản biện.',
      icon: <HelpCircle size={20} />,
      color: 'bg-purple-500 text-white',
      badge: 'Học hỏi',
    },
    {
      type: 'movement',
      title: 'Vận động thể chất (50 bước)',
      desc: 'Con bắt buộc phải đứng dậy đi bộ hoặc nhảy dây đủ 50 bước để bảo vệ mắt và cột sống.',
      icon: <Footprints size={20} />,
      color: 'bg-emerald-500 text-white',
      badge: 'Sức khỏe',
    },
    {
      type: 'countdown',
      title: 'Đếm ngược tĩnh tâm',
      desc: 'Đếm ngược 5 phút nghỉ mắt, tự động mở khóa khi hết giờ.',
      icon: <Timer size={20} />,
      color: 'bg-amber-500 text-white',
    },
    {
      type: 'mealtime',
      title: 'Giờ ăn cơm gia đình',
      desc: 'Lời nhắc nhẹ nhàng cả nhà cùng ăn cơm, con cất máy và ra ngoài với gia đình.',
      icon: <Utensils size={20} />,
      color: 'bg-orange-500 text-white',
    },
    {
      type: 'bedtime',
      title: 'Giờ đi ngủ ngon',
      desc: 'Khóa máy buổi tối để con ngủ sớm trước 22:00 phát triển chiều cao.',
      icon: <Moon size={20} />,
      color: 'bg-indigo-500 text-white',
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
              <span>Khóa & Thử Thách Mở Khóa</span>
              {lockChallenge.isLocked && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock size={10} /> Đang Khóa
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Giáo dục tích cực & Rèn luyện thói quen</p>
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
        {/* Active Lock Banner */}
        {lockChallenge.isLocked ? (
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Lock size={20} className="text-yellow-200" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-200">
                    Máy Con Đang Bị Khóa
                  </h4>
                  <p className="text-base font-extrabold">{lockChallenge.title}</p>
                </div>
              </div>
              <span className="w-3 h-3 rounded-full bg-yellow-300 animate-ping"></span>
            </div>
            <p className="text-xs text-rose-100">{lockChallenge.description}</p>
            <button
              onClick={() => {
                unlockDevice();
                showToast('Đã mở khóa thiết bị của con!');
              }}
              className="w-full py-2 bg-white text-rose-700 font-bold rounded-xl text-xs shadow-xs hover:bg-rose-50 transition active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Unlock size={14} />
              <span>Mở Khóa Thiết Bị Ngay Lập Tức</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Thiết bị con đang hoạt động bình thường</p>
                <p className="text-[10px] text-emerald-600">Chọn một phương thức bên dưới để bắt đầu thử thách</p>
              </div>
            </div>
          </div>
        )}

        {/* Challenge Method Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 px-1">Danh sách phương thức khóa & thử thách:</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {challengeOptions.map((opt) => (
              <div
                key={opt.type}
                onClick={() => {
                  setLockChallenge(opt.type);
                  showToast(`Đã kích hoạt chế độ: ${opt.title}!`);
                }}
                className="p-3.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs transition active:scale-98 cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${opt.color}`}>
                    {opt.icon}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {opt.title}
                      </p>
                      {opt.badge && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                          <Sparkles size={10} /> {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
                  </div>
                </div>

                <button className="px-3 py-1.5 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 rounded-xl text-xs font-bold transition shrink-0 ml-2">
                  Kích hoạt
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
