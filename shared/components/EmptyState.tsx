import React from 'react';
import { Sparkles } from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 bg-white/80 backdrop-blur-xs rounded-3xl border border-slate-100 shadow-xs ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
        {icon || <Sparkles size={24} className="text-blue-500" />}
      </div>
      <h4 className="text-sm font-black text-slate-800 leading-tight">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 font-medium max-w-xs mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={() => {
            haptics.medium();
            onAction();
          }}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
