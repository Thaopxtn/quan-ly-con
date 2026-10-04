import React from 'react';

interface KidMascotProps {
  mood: 'happy' | 'cheer' | 'sad' | 'sleep' | 'wave' | 'study';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const moodMap = {
  happy: { emoji: '🐻', bg: 'from-amber-100 to-yellow-50', border: 'border-amber-200' },
  cheer: { emoji: '🎉', bg: 'from-pink-100 to-rose-50', border: 'border-pink-200' },
  sad: { emoji: '🐻‍❄️', bg: 'from-sky-100 to-blue-50', border: 'border-sky-200' },
  sleep: { emoji: '🌙', bg: 'from-indigo-100 to-purple-50', border: 'border-indigo-200' },
  wave: { emoji: '🐻', bg: 'from-emerald-100 to-green-50', border: 'border-emerald-200' },
  study: { emoji: '📚', bg: 'from-blue-100 to-sky-50', border: 'border-blue-200' },
};

const sizeMap = {
  sm: 'w-8 h-8 text-lg',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
};

export const KidMascot: React.FC<KidMascotProps> = ({ mood, size = 'md', className = '', message }) => {
  const { emoji, bg, border } = moodMap[mood];

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-2xl bg-gradient-to-br ${bg} border ${border} flex items-center justify-center shadow-xs animate-subtle-pulse select-none`}
      >
        <span className="animate-bounce" style={{ animationDuration: '2s' }}>
          {emoji}
        </span>
      </div>
      {message && (
        <div className={`relative bg-white border ${border} rounded-2xl px-3 py-1.5 shadow-xs max-w-[200px]`}>
          <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l ${border} transform -rotate-45`} />
          <p className="text-[11px] font-bold text-slate-700 text-center leading-tight relative z-10">
            {message}
          </p>
        </div>
      )}
    </div>
  );
};
