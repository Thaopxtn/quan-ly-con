import React, { useState, useEffect } from 'react';
import { Clock, Moon, BookOpen, Gamepad2, Utensils, Sparkles, ChevronRight, Info } from 'lucide-react';
import { haptics } from '@shared/utils/haptics';

interface Kids360DayTimelineProps {
  childName: string;
  onNavigate?: (screenKey: string) => void;
}

interface ScheduleSegment {
  id: string;
  label: string;
  icon: any;
  startMinutes: number; // minutes from 0:00
  endMinutes: number;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  badgeBg: string;
  ruleDescription: string;
}

export const Kids360DayTimeline: React.FC<Kids360DayTimelineProps> = ({
  childName,
  onNavigate,
}) => {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const [selectedSegment, setSelectedSegment] = useState<ScheduleSegment | null>(null);

  // Keep live time updated every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 24-hour visual schedule blocks (1440 mins total)
  const segments: ScheduleSegment[] = [
    {
      id: 'night_sleep_1',
      label: 'Giờ ngủ đêm',
      icon: Moon,
      startMinutes: 0,
      endMinutes: 390, // 0:00 - 6:30 (390m)
      colorBg: 'bg-slate-700',
      colorBorder: 'border-slate-800',
      colorText: 'text-slate-200',
      badgeBg: 'bg-slate-800 text-slate-100',
      ruleDescription: 'Khóa toàn bộ màn hình, chỉ cho phép cuộc gọi khẩn cấp tới bố mẹ.',
    },
    {
      id: 'morning_prep',
      label: 'Thức dậy & Ăn sáng',
      icon: Utensils,
      startMinutes: 390, // 6:30
      endMinutes: 450, // 7:30 (60m)
      colorBg: 'bg-amber-400',
      colorBorder: 'border-amber-500',
      colorText: 'text-amber-950',
      badgeBg: 'bg-amber-100 text-amber-900',
      ruleDescription: 'Mở ứng dụng cơ bản, nhắc nhở con chuẩn bị sách vở đến trường.',
    },
    {
      id: 'school_morning',
      label: 'Học ở trường (Sáng)',
      icon: BookOpen,
      startMinutes: 450, // 7:30
      endMinutes: 690, // 11:30 (240m)
      colorBg: 'bg-blue-500',
      colorBorder: 'border-blue-600',
      colorText: 'text-white',
      badgeBg: 'bg-blue-100 text-blue-900',
      ruleDescription: 'Chế độ giờ học: Khóa game và mạng xã hội, chỉ mở từ điển & gọi điện.',
    },
    {
      id: 'lunch_rest',
      label: 'Nghỉ trưa & Ăn cơm',
      icon: Utensils,
      startMinutes: 690, // 11:30
      endMinutes: 810, // 13:30 (120m)
      colorBg: 'bg-emerald-400',
      colorBorder: 'border-emerald-500',
      colorText: 'text-emerald-950',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      ruleDescription: 'Thời gian nghỉ ngơi, khóa máy trong bữa ăn gia đình.',
    },
    {
      id: 'school_afternoon',
      label: 'Học ở trường (Chiều)',
      icon: BookOpen,
      startMinutes: 810, // 13:30
      endMinutes: 1020, // 17:00 (210m)
      colorBg: 'bg-blue-500',
      colorBorder: 'border-blue-600',
      colorText: 'text-white',
      badgeBg: 'bg-blue-100 text-blue-900',
      ruleDescription: 'Chế độ giờ học: Khóa các ứng dụng gây xao nhãng.',
    },
    {
      id: 'free_play',
      label: 'Giải trí tự do',
      icon: Gamepad2,
      startMinutes: 1020, // 17:00
      endMinutes: 1170, // 19:30 (150m)
      colorBg: 'bg-teal-400',
      colorBorder: 'border-teal-500',
      colorText: 'text-teal-950',
      badgeBg: 'bg-teal-100 text-teal-900',
      ruleDescription: 'Cho phép sử dụng game và video theo hạn mức thời gian đã đặt.',
    },
    {
      id: 'home_study',
      label: 'Tự học tại nhà',
      icon: BookOpen,
      startMinutes: 1170, // 19:30
      endMinutes: 1290, // 21:30 (120m)
      colorBg: 'bg-indigo-500',
      colorBorder: 'border-indigo-600',
      colorText: 'text-white',
      badgeBg: 'bg-indigo-100 text-indigo-900',
      ruleDescription: 'Chế độ làm bài tập về nhà: Hỗ trợ tài liệu học tập.',
    },
    {
      id: 'night_sleep_2',
      label: 'Giờ đi ngủ',
      icon: Moon,
      startMinutes: 1290, // 21:30
      endMinutes: 1440, // 24:00 (150m)
      colorBg: 'bg-slate-700',
      colorBorder: 'border-slate-800',
      colorText: 'text-slate-200',
      badgeBg: 'bg-slate-800 text-slate-100',
      ruleDescription: 'Khóa màn hình ban đêm, bảo vệ giấc ngủ lành mạnh của con.',
    },
  ];

  // Find active current segment
  const activeSegment = segments.find(
    (s) => currentMinutes >= s.startMinutes && currentMinutes < s.endMinutes
  ) || segments[0];

  const nowHours = Math.floor(currentMinutes / 60);
  const nowMins = currentMinutes % 60;
  const timeNowStr = `${nowHours.toString().padStart(2, '0')}:${nowMins.toString().padStart(2, '0')}`;
  const needlePercent = Math.min(99.5, Math.max(0.5, (currentMinutes / 1440) * 100));

  const ActiveIcon = activeSegment.icon;

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shadow-2xs">
            <Clock size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
              Lịch Biểu 24H Trực Quan
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Theo dõi lịch sinh hoạt thông minh của {childName}
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('screentime')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-0.5 cursor-pointer"
          >
            <span>Cấu hình</span>
            <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Current Real-time Active Phase Banner */}
      <div className="bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/30 rounded-2xl p-2.5 border border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs border border-slate-200/80 shrink-0">
            <ActiveIcon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bây giờ ({timeNowStr})
              </span>
              <span className={`px-2 py-0.2 rounded-md text-[10px] font-black uppercase tracking-wider ${activeSegment.badgeBg}`}>
                {activeSegment.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
              {activeSegment.ruleDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Visual 24h Ribbon Bar with Needle Indicator */}
      <div className="pt-2 pb-1 space-y-1.5">
        <div className="relative pt-6 pb-2">
          {/* Real-time Glowing Needle Marker */}
          <div
            className="absolute top-0 flex flex-col items-center -translate-x-1/2 z-20 transition-all duration-500 pointer-events-none"
            style={{ left: `${needlePercent}%` }}
          >
            <div className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md whitespace-nowrap animate-pulse">
              {timeNowStr}
            </div>
            <div className="w-0.5 h-10 bg-rose-500 shadow-sm" />
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white shadow-xs -mt-1" />
          </div>

          {/* 24-Hour Continuous Colored Track Bar */}
          <div className="w-full h-7 rounded-2xl bg-slate-100 flex overflow-hidden border border-slate-200 shadow-inner">
            {segments.map((seg) => {
              const duration = seg.endMinutes - seg.startMinutes;
              const widthPct = (duration / 1440) * 100;
              const isCurrent = seg.id === activeSegment.id;

              return (
                <div
                  key={seg.id}
                  onClick={() => {
                    haptics.selection();
                    setSelectedSegment(seg);
                  }}
                  className={`${seg.colorBg} h-full relative group cursor-pointer transition-all duration-200 hover:brightness-110 flex items-center justify-center`}
                  style={{ width: `${widthPct}%` }}
                  title={`${seg.label} (${Math.floor(seg.startMinutes / 60)}h - ${Math.floor(seg.endMinutes / 60)}h)`}
                >
                  {widthPct >= 12 && (
                    <span className={`text-[9px] font-black ${seg.colorText} opacity-80 group-hover:opacity-100 truncate px-1`}>
                      {seg.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 24-Hour Clock Labels */}
          <div className="flex justify-between items-center text-[9.5px] font-mono font-bold text-slate-400 px-1 pt-1.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>

      {/* Selected Segment Quick Details Modal/Drawer */}
      {selectedSegment && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-base">📌</span>
            <div>
              <strong className="text-slate-900 block font-bold">
                {selectedSegment.label} ({Math.floor(selectedSegment.startMinutes / 60)}h00 - {Math.floor(selectedSegment.endMinutes / 60)}h00)
              </strong>
              <span className="text-[10.5px] text-slate-500 font-medium">
                {selectedSegment.ruleDescription}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSegment(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kids360 Legend Badges */}
      <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-500 flex-wrap pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
          <span>Giờ ngủ</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Giờ học trường</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
          <span>Giờ chơi tự do</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Tự học tại nhà</span>
        </span>
      </div>
    </div>
  );
};
