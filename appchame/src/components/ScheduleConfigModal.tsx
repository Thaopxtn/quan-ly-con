import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Moon,
  Utensils,
  BookOpen,
  Eye,
  Droplet,
  BellRing,
  Sparkles,
  Check,
  ChevronRight,
  Sun,
  GraduationCap
} from 'lucide-react';
import { SmartRoutines } from '@shared/types';
import { haptics } from '@shared/utils/haptics';

interface ScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName: string;
  childId?: string;
  initialRoutines: SmartRoutines;
  onSave: (updated: SmartRoutines) => void;
  onNavigate?: (screenKey: string) => void;
}

export const ScheduleConfigModal: React.FC<ScheduleConfigModalProps> = ({
  isOpen,
  onClose,
  childName,
  initialRoutines,
  onSave,
  onNavigate,
}) => {
  const [routines, setRoutines] = useState<SmartRoutines>(initialRoutines);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [isSavedToast, setIsSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRoutines({
        ...initialRoutines,
        mealtimeStart: initialRoutines.mealtimeStart || '11:30',
        mealtimeEnd: initialRoutines.mealtimeEnd || '13:00',
        bedtimeStart: initialRoutines.bedtimeStart || '21:30',
        bedtimeEnd: initialRoutines.bedtimeEnd || '06:30',
        schoolMorningStart: initialRoutines.schoolMorningStart || '07:30',
        schoolMorningEnd: initialRoutines.schoolMorningEnd || '11:30',
        schoolAfternoonStart: initialRoutines.schoolAfternoonStart || '13:30',
        schoolAfternoonEnd: initialRoutines.schoolAfternoonEnd || '17:00',
        homeStudyStart: initialRoutines.homeStudyStart || '19:30',
        homeStudyEnd: initialRoutines.homeStudyEnd || '21:30',
      });
      setSelectedPreset('custom');
      setIsSavedToast(false);
    }
  }, [isOpen, initialRoutines]);

  if (!isOpen) return null;

  // Preset 1: Kids360 Standard
  const applyKids360Standard = () => {
    haptics.selection();
    setSelectedPreset('kids360');
    setRoutines((prev) => ({
      ...prev,
      bedtimeLock: true,
      bedtimeStart: '21:30',
      bedtimeEnd: '06:30',
      mealtimeLock: true,
      mealtimeStart: '11:30',
      mealtimeEnd: '13:00',
      schoolMorningStart: '07:30',
      schoolMorningEnd: '11:30',
      schoolAfternoonStart: '13:30',
      schoolAfternoonEnd: '17:00',
      homeStudyStart: '19:30',
      homeStudyEnd: '21:30',
      studyModeLock: true,
      continuousLimitMinutes: 30,
      hydrationReminder: true,
      schoolReminder: true,
    }));
  };

  // Preset 2: Summer Vacation
  const applySummerVacation = () => {
    haptics.selection();
    setSelectedPreset('summer');
    setRoutines((prev) => ({
      ...prev,
      bedtimeLock: true,
      bedtimeStart: '22:30',
      bedtimeEnd: '07:30',
      mealtimeLock: true,
      mealtimeStart: '12:00',
      mealtimeEnd: '13:30',
      schoolMorningStart: '',
      schoolMorningEnd: '',
      schoolAfternoonStart: '',
      schoolAfternoonEnd: '',
      homeStudyStart: '20:00',
      homeStudyEnd: '21:30',
      studyModeLock: false,
      continuousLimitMinutes: 45,
      hydrationReminder: true,
      schoolReminder: false,
    }));
  };

  // Preset 3: Exam Season
  const applyExamSeason = () => {
    haptics.selection();
    setSelectedPreset('exam');
    setRoutines((prev) => ({
      ...prev,
      bedtimeLock: true,
      bedtimeStart: '22:00',
      bedtimeEnd: '06:00',
      mealtimeLock: true,
      mealtimeStart: '11:30',
      mealtimeEnd: '12:30',
      schoolMorningStart: '07:00',
      schoolMorningEnd: '11:30',
      schoolAfternoonStart: '13:30',
      schoolAfternoonEnd: '17:30',
      homeStudyStart: '19:00',
      homeStudyEnd: '22:00',
      studyModeLock: true,
      continuousLimitMinutes: 30,
      hydrationReminder: true,
      schoolReminder: true,
    }));
  };

  const handleSave = () => {
    haptics.success();
    onSave(routines);
    setIsSavedToast(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Cấu hình Lịch Biểu & Thói Quen 24H
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Thiết lập giờ sinh hoạt & khóa máy thông minh cho {childName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Quick Presets Ribbon */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" />
              <span>Bộ cấu hình mẫu nhanh (1 chạm)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={applyKids360Standard}
                className={`p-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  selectedPreset === 'kids360'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span className="text-base">🌟</span>
                <span className="text-[10px] font-bold leading-tight">Chuẩn Kids360</span>
                <span className="text-[8.5px] text-indigo-600 font-medium">Khuyên dùng</span>
              </button>

              <button
                type="button"
                onClick={applySummerVacation}
                className={`p-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  selectedPreset === 'summer'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Sun size={18} className="text-amber-500" />
                <span className="text-[10px] font-bold leading-tight">Kỳ nghỉ hè</span>
                <span className="text-[8.5px] text-amber-600 font-medium">Nới lỏng</span>
              </button>

              <button
                type="button"
                onClick={applyExamSeason}
                className={`p-2 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                  selectedPreset === 'exam'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <GraduationCap size={18} className="text-blue-600" />
                <span className="text-[10px] font-bold leading-tight">Mùa thi cử</span>
                <span className="text-[8.5px] text-blue-600 font-medium">Tập trung cao</span>
              </button>
            </div>
          </div>

          {/* Section 1: Giờ Ngủ Ban Đêm */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Moon size={14} />
                </div>
                <span className="text-xs font-bold text-slate-800">Giờ đi ngủ đêm</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10.5px] font-bold text-indigo-700">
                  {routines.bedtimeLock ? 'Tự khóa' : 'Không khóa'}
                </span>
                <input
                  type="checkbox"
                  checked={routines.bedtimeLock}
                  onChange={(e) => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, bedtimeLock: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Bắt đầu ngủ</span>
                <input
                  type="time"
                  value={routines.bedtimeStart || '21:30'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, bedtimeStart: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Thức dậy</span>
                <input
                  type="time"
                  value={routines.bedtimeEnd || '06:30'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, bedtimeEnd: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Khi bật tự khóa, máy con sẽ tự động khóa ban đêm, bảo vệ giấc ngủ lành mạnh.
            </p>
          </div>

          {/* Section 2: Giờ Cơm Gia Đình */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Utensils size={14} />
                </div>
                <span className="text-xs font-bold text-slate-800">Giờ cơm & Nghỉ trưa</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10.5px] font-bold text-amber-700">
                  {routines.mealtimeLock ? 'Khóa cơm' : 'Không khóa'}
                </span>
                <input
                  type="checkbox"
                  checked={routines.mealtimeLock}
                  onChange={(e) => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, mealtimeLock: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Bắt đầu ăn</span>
                <input
                  type="time"
                  value={routines.mealtimeStart || '11:30'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, mealtimeStart: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kết thúc nghỉ</span>
                <input
                  type="time"
                  value={routines.mealtimeEnd || '13:00'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, mealtimeEnd: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Khóa thiết bị trong mâm cơm để cả nhà trò chuyện và ăn ngon miệng hơn.
            </p>
          </div>

          {/* Section 3: Giờ Học Ở Trường */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <BookOpen size={14} />
                </div>
                <span className="text-xs font-bold text-slate-800">Giờ học ở trường</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[10.5px] font-bold text-blue-700">
                  {routines.studyModeLock ? 'Chế độ học' : 'Tự do'}
                </span>
                <input
                  type="checkbox"
                  checked={routines.studyModeLock || false}
                  onChange={(e) => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, studyModeLock: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Buổi sáng (từ)</span>
                  <input
                    type="time"
                    value={routines.schoolMorningStart || '07:30'}
                    onChange={(e) => setRoutines((prev) => ({ ...prev, schoolMorningStart: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Buổi sáng (đến)</span>
                  <input
                    type="time"
                    value={routines.schoolMorningEnd || '11:30'}
                    onChange={(e) => setRoutines((prev) => ({ ...prev, schoolMorningEnd: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Buổi chiều (từ)</span>
                  <input
                    type="time"
                    value={routines.schoolAfternoonStart || '13:30'}
                    onChange={(e) => setRoutines((prev) => ({ ...prev, schoolAfternoonStart: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Buổi chiều (đến)</span>
                  <input
                    type="time"
                    value={routines.schoolAfternoonEnd || '17:00'}
                    onChange={(e) => setRoutines((prev) => ({ ...prev, schoolAfternoonEnd: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Tự Học Tại Nhà Buổi Tối */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <BookOpen size={14} />
              </div>
              <span className="text-xs font-bold text-slate-800">Tự học & Làm bài tập tối</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Bắt đầu học</span>
                <input
                  type="time"
                  value={routines.homeStudyStart || '19:30'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, homeStudyStart: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Kết thúc</span>
                <input
                  type="time"
                  value={routines.homeStudyEnd || '21:30'}
                  onChange={(e) => setRoutines((prev) => ({ ...prev, homeStudyEnd: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs shadow-2xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Giới Hạn Dùng Màn Hình Liên Tục (Bảo vệ mắt) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Eye size={14} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Nghỉ mắt sau khi dùng liên tục</span>
                <span className="text-[10px] text-slate-400 font-medium">Cảnh báo nghỉ ngơi khi nhìn màn hình quá lâu</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '30 phút', value: 30 },
                { label: '45 phút', value: 45 },
                { label: '60 phút', value: 60 },
                { label: 'Tắt', value: 0 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, continuousLimitMinutes: opt.value }));
                  }}
                  className={`py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    routines.continuousLimitMinutes === opt.value
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 6: Nhắc Nhở Thông Minh */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">Nhắc nhở thông minh</span>
            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-2">
                  <Droplet size={14} className="text-cyan-600" />
                  <span className="text-slate-700 font-medium">Nhắc con uống nước định kỳ</span>
                </div>
                <input
                  type="checkbox"
                  checked={routines.hydrationReminder}
                  onChange={(e) => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, hydrationReminder: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-2">
                  <BellRing size={14} className="text-amber-600" />
                  <span className="text-slate-700 font-medium">Nhắc chuẩn bị sách vở giờ học</span>
                </div>
                <input
                  type="checkbox"
                  checked={routines.schoolReminder}
                  onChange={(e) => {
                    haptics.selection();
                    setRoutines((prev) => ({ ...prev, schoolReminder: e.target.checked }));
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Link to Timetable / Alarms if onNavigate available */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('screentime');
              }}
              className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-[11px] font-bold text-blue-600 flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                <span>Xem chi tiết thời lượng từng ứng dụng</span>
              </span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer text-center"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSavedToast}
            className="flex-2 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center space-x-1.5 active:scale-98"
          >
            {isSavedToast ? (
              <>
                <Check size={14} className="text-emerald-300 animate-bounce" />
                <span>Đã lưu thành công!</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
