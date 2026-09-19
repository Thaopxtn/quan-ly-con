import React, { useState, useEffect } from 'react';
import { Clock, Moon, BookOpen, Gamepad2, Utensils, Sparkles, ChevronRight, Megaphone } from 'lucide-react';
import { SmartRoutines } from '@shared/types';
import { haptics } from '@shared/utils/haptics';

interface Kids360DayTimelineProps {
  childName: string;
  childId?: string;
  smartRoutines?: SmartRoutines;
  onNavigate?: (screenKey: string) => void;
  onOpenConfig?: () => void;
  showQuickActions?: boolean;
  isMealtimeLocked?: boolean;
  isBedtimeLocked?: boolean;
  isStudyMode?: boolean;
  onToggleMealtime?: () => void;
  onToggleBedtime?: () => void;
  onToggleStudyMode?: () => void;
  onOpenBroadcast?: () => void;
  familyUsedMinutes?: number;
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

function parseTimeToMinutes(timeStr?: string, fallback: number = 0): number {
  if (!timeStr) return fallback;
  const parts = timeStr.split(':');
  if (parts.length < 2) return fallback;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return fallback;
  return Math.min(1440, Math.max(0, h * 60 + m));
}

function formatMinutesToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export const Kids360DayTimeline: React.FC<Kids360DayTimelineProps> = ({
  childName,
  smartRoutines,
  onNavigate,
  onOpenConfig,
  showQuickActions,
  isMealtimeLocked,
  isBedtimeLocked,
  isStudyMode,
  onToggleMealtime,
  onToggleBedtime,
  onToggleStudyMode,
  onOpenBroadcast,
  familyUsedMinutes,
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

  // Compute dynamic routine boundaries from smartRoutines or Kids360 defaults
  const wakeUpMins = parseTimeToMinutes(smartRoutines?.bedtimeEnd, 390); // 06:30
  const schoolMornStart = Math.max(wakeUpMins, parseTimeToMinutes(smartRoutines?.schoolMorningStart, 450)); // 07:30
  const schoolMornEnd = Math.max(schoolMornStart, parseTimeToMinutes(smartRoutines?.schoolMorningEnd, 690)); // 11:30
  const mealStart = Math.max(schoolMornEnd, parseTimeToMinutes(smartRoutines?.mealtimeStart, 690)); // 11:30
  const mealEnd = Math.max(mealStart, parseTimeToMinutes(smartRoutines?.mealtimeEnd, 810)); // 13:30
  const schoolAftStart = Math.max(mealEnd, parseTimeToMinutes(smartRoutines?.schoolAfternoonStart, 810)); // 13:30
  const schoolAftEnd = Math.max(schoolAftStart, parseTimeToMinutes(smartRoutines?.schoolAfternoonEnd, 1020)); // 17:00
  const homeStudyStart = Math.max(schoolAftEnd, parseTimeToMinutes(smartRoutines?.homeStudyStart, 1170)); // 19:30
  const homeStudyEnd = Math.max(homeStudyStart, parseTimeToMinutes(smartRoutines?.homeStudyEnd, 1290)); // 21:30
  const bedtimeStart = Math.max(homeStudyEnd, parseTimeToMinutes(smartRoutines?.bedtimeStart, 1290)); // 21:30

  // 24-hour visual schedule blocks (1440 mins total)
  const segments: ScheduleSegment[] = [
    {
      id: 'night_sleep_1',
      label: 'Giờ ngủ đêm',
      icon: Moon,
      startMinutes: 0,
      endMinutes: wakeUpMins,
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
      startMinutes: wakeUpMins,
      endMinutes: schoolMornStart,
      colorBg: 'bg-amber-400',
      colorBorder: 'border-amber-500',
      colorText: 'text-amber-950',
      badgeBg: 'bg-amber-100 text-amber-900',
      ruleDescription: 'Mở ứng dụng cơ bản, chuẩn bị sách vở đến trường.',
    },
    {
      id: 'school_morning',
      label: 'Học ở trường (Sáng)',
      icon: BookOpen,
      startMinutes: schoolMornStart,
      endMinutes: schoolMornEnd,
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
      startMinutes: mealStart,
      endMinutes: mealEnd,
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
      startMinutes: schoolAftStart,
      endMinutes: schoolAftEnd,
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
      startMinutes: schoolAftEnd,
      endMinutes: homeStudyStart,
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
      startMinutes: homeStudyStart,
      endMinutes: homeStudyEnd,
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
      startMinutes: bedtimeStart,
      endMinutes: 1440,
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

        {(onOpenConfig || onNavigate) && (
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              if (onOpenConfig) {
                onOpenConfig();
              } else if (onNavigate) {
                onNavigate('screentime');
              }
            }}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-0.5 cursor-pointer bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-xl border border-blue-100 shadow-2xs"
            title="Mở cấu hình lịch biểu & thói quen 24h"
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
              const duration = Math.max(0, seg.endMinutes - seg.startMinutes);
              if (duration <= 0) return null;
              const widthPct = (duration / 1440) * 100;

              return (
                <div
                  key={seg.id}
                  onClick={() => {
                    haptics.selection();
                    setSelectedSegment(seg);
                  }}
                  className={`${seg.colorBg} h-full relative group cursor-pointer transition-all duration-200 hover:brightness-110 flex items-center justify-center`}
                  style={{ width: `${widthPct}%` }}
                  title={`${seg.label} (${formatMinutesToTime(seg.startMinutes)} - ${formatMinutesToTime(seg.endMinutes)})`}
                >
                  {widthPct >= 11 && (
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
                {selectedSegment.label} ({formatMinutesToTime(selectedSegment.startMinutes)} - {formatMinutesToTime(selectedSegment.endMinutes)})
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

      {/* Integrated Routine Controls (One-Touch Quick Actions) */}
      {(showQuickActions || onToggleMealtime) && (
        <div className="pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-500" />
              <span>Điều khiển nhanh cả nhà:</span>
            </span>
            {familyUsedMinutes !== undefined && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/80">
                ⏱️ {Math.floor(familyUsedMinutes / 60)}h {familyUsedMinutes % 60}p / cả nhà
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {/* 1. Mealtime Lock */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onToggleMealtime?.();
              }}
              className={`p-2 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isMealtimeLocked
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
              }`}
              title="Khóa/mở máy con trong giờ ăn cơm gia đình"
            >
              <Utensils size={16} className={isMealtimeLocked ? 'text-white' : 'text-amber-600'} />
              <span className="text-[10px] font-bold leading-tight">
                {isMealtimeLocked ? 'Mở giờ cơm' : 'Giờ cơm'}
              </span>
            </button>

            {/* 2. Bedtime Lock */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onToggleBedtime?.();
              }}
              className={`p-2 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isBedtimeLocked
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
              }`}
              title="Khóa/mở máy con trong giờ ngủ ban đêm"
            >
              <Moon size={16} className={isBedtimeLocked ? 'text-white' : 'text-indigo-600'} />
              <span className="text-[10px] font-bold leading-tight">
                {isBedtimeLocked ? 'Mở giờ ngủ' : 'Giờ ngủ'}
              </span>
            </button>

            {/* 3. Study Mode */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onToggleStudyMode?.();
              }}
              className={`p-2 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isStudyMode
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
              }`}
              title="Bật/tắt chế độ giờ học tập trung"
            >
              <BookOpen size={16} className={isStudyMode ? 'text-white' : 'text-blue-600'} />
              <span className="text-[10px] font-bold leading-tight">
                {isStudyMode ? 'Đang học' : 'Giờ học'}
              </span>
            </button>

            {/* 4. Reminder / Broadcast */}
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                onOpenBroadcast?.();
              }}
              className="p-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="Gửi lời dặn / loa nhắc nhở đến các con"
            >
              <Megaphone size={16} className="text-emerald-600" />
              <span className="text-[10px] font-bold leading-tight">Nhắc nhở</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
