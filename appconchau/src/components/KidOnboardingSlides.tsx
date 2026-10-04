import React, { useState } from 'react';
import { Clock, Star, AlertOctagon, ChevronRight, Sparkles } from 'lucide-react';

interface KidOnboardingSlidesProps {
  childName: string;
  onComplete: () => void;
}

const slides = [
  {
    emoji: '🐻',
    bg: 'from-sky-400 via-blue-500 to-indigo-500',
    title: 'Chào mừng đến KidCare!',
    subtitle: (name: string) => `Xin chào ${name}! Đây là ứng dụng giúp con sử dụng điện thoại an toàn và vui vẻ.`,
    icon: Sparkles,
  },
  {
    emoji: '⏰',
    bg: 'from-emerald-400 via-teal-500 to-cyan-500',
    title: 'Đồng Hồ Thời Gian',
    subtitle: () => 'Vòng tròn màu cầu vồng cho con biết còn bao nhiêu thời gian dùng máy hôm nay.',
    icon: Clock,
  },
  {
    emoji: '⭐',
    bg: 'from-amber-400 via-orange-500 to-amber-500',
    title: 'Tích Sao Đổi Quà',
    subtitle: () => 'Hoàn thành nhiệm vụ Bố Mẹ giao để nhận sao ⭐ rồi đổi quà yêu thích!',
    icon: Star,
  },
  {
    emoji: '🆘',
    bg: 'from-rose-500 via-red-500 to-rose-600',
    title: 'Nút SOS An Toàn',
    subtitle: () => 'Khi cần giúp đỡ, bấm nút SOS đỏ ở góc trên để gọi Bố Mẹ ngay lập tức!',
    icon: AlertOctagon,
  },
];

export const KidOnboardingSlides: React.FC<KidOnboardingSlidesProps> = ({ childName, onComplete }) => {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div className={`fixed inset-0 z-[200] bg-gradient-to-b ${slide.bg} flex flex-col items-center justify-between p-6 text-white select-none transition-all duration-500`}>
      {/* Skip */}
      <div className="w-full flex justify-end pt-[max(12px,var(--status-bar-height,42px))]">
        <button
          type="button"
          onClick={onComplete}
          className="text-white/70 hover:text-white text-xs font-bold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md"
        >
          Bỏ qua
        </button>
      </div>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
        <div className="text-7xl animate-bounce" style={{ animationDuration: '2s' }}>
          {slide.emoji}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-black tracking-tight">{slide.title}</h1>
          <p className="text-sm font-semibold text-white/85 leading-relaxed">
            {slide.subtitle(childName)}
          </p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
          <Icon size={28} strokeWidth={2.5} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="w-full max-w-sm space-y-4 pb-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-white' : 'w-2 bg-white/40'
            }`} />
          ))}
        </div>

        {/* Next / Done Button */}
        <button
          type="button"
          onClick={() => {
            if (isLast) {
              onComplete();
            } else {
              setCurrent(current + 1);
            }
          }}
          className="w-full py-3.5 bg-white text-slate-900 font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <span>{isLast ? 'Bắt Đầu Khám Phá! 🚀' : 'Tiếp theo'}</span>
          {!isLast && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
};
