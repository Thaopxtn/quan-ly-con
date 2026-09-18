import React from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  theme?: 'light' | 'dark';
  deviceRole?: 'parent' | 'child';
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  className = '',
  theme = 'light',
  deviceRole = 'parent',
}) => {
  const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`relative mx-auto w-full max-w-[390px] h-[810px] bg-slate-900 rounded-[50px] p-[10px] shadow-2xl ring-1 ring-slate-800/10 transition-all duration-300 ${className}`}>
      {/* Outer Phone Bezel Buttons */}
      <div className="absolute -left-[13px] top-[115px] w-[3px] h-[26px] bg-slate-700 rounded-l-md"></div>
      <div className="absolute -left-[13px] top-[160px] w-[3px] h-[45px] bg-slate-700 rounded-l-md"></div>
      <div className="absolute -left-[13px] top-[215px] w-[3px] h-[45px] bg-slate-700 rounded-l-md"></div>
      <div className="absolute -right-[13px] top-[160px] w-[3px] h-[65px] bg-slate-700 rounded-r-md"></div>

      {/* Screen Container */}
      <div className={`relative w-full h-full rounded-[40px] overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        {/* iOS Status Bar */}
        <div className="relative z-50 flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold select-none">
          <span className="text-slate-800 text-[13px] tracking-tight">{currentTime || '9:41'}</span>
          
          {/* Dynamic Island Pill */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2 h-6 w-28 bg-black rounded-full flex items-center justify-center space-x-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
            <div className={`w-1.5 h-1.5 rounded-full ${deviceRole === 'parent' ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse`}></div>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-700">
            <Signal size={13} strokeWidth={2.5} />
            <Wifi size={13} strokeWidth={2.5} />
            <BatteryMedium size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* Screen Dynamic Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          {children}
        </div>

        {/* Home Indicator Bar */}
        <div className="w-full pb-2 pt-1 flex justify-center items-center select-none bg-transparent">
          <div className="w-32 h-1 bg-slate-400/60 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
