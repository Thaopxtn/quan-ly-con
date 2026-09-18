import React from 'react';

export const ShimmerBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-xl ${className}`} />
);

export const ShimmerText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 2,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton-shimmer h-3.5 rounded-md"
        style={{ width: i === lines - 1 && lines > 1 ? '65%' : '100%' }}
      />
    ))}
  </div>
);

export const ShimmerCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3 ${className}`}>
    <div className="flex items-center space-x-3">
      <div className="w-11 h-11 rounded-2xl skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
      </div>
    </div>
    <div className="skeleton-shimmer h-2 rounded-full w-full mt-2" />
  </div>
);

export const ShimmerList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: count }).map((_, idx) => (
      <ShimmerCard key={idx} />
    ))}
  </div>
);
