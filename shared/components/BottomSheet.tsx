import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
  showCloseButton?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[85vh]',
  showCloseButton = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      haptics.light();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={() => {
          haptics.light();
          onClose();
        }}
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[3px] animate-backdrop transition-opacity"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className={`relative w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl z-10 flex flex-col ${maxHeight} animate-sheet-up border border-slate-200/80 overflow-hidden`}
      >
        {/* Drag Handle for mobile */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing sm:hidden">
          <div className="w-11 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        {(title || showCloseButton) && (
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md">
            <div className="min-w-0 pr-3">
              {typeof title === 'string' ? (
                <h3 className="text-sm font-black text-slate-900 truncate">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                onClick={() => {
                  haptics.light();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition active:scale-90 shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Sheet Body with Safe Area */}
        <div className="p-5 overflow-y-auto no-scrollbar flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};
