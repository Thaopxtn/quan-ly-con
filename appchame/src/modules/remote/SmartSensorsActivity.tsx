import React, { useState } from 'react';
import {
  ChevronLeft,
  Calendar,
  ShieldAlert,
  Volume2,
  Mic,
  Moon,
  Utensils,
  Droplets,
  BookOpen,
  Bell,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { SmartRoutines } from '@shared/types';
import { ChildSwitcherBar } from '../../components/ChildSwitcherBar';

interface SmartSensorsActivityProps {
  onBack: () => void;
}

export const SmartSensorsActivity: React.FC<SmartSensorsActivityProps> = ({ onBack }) => {
  const {
    state,
    toggleSmartRoutine,
    setSensorThresholds,
    setSmartRoutineTimeRange,
    triggerVoiceGuide,
    triggerReminder,
    simulateSensorTrigger,
  } = useAppState();

  const { smartRoutines, child } = state;
  const [voiceText, setVoiceText] = useState('Con ơi, nghỉ mắt 5 phút và uống một ly nước nhé!');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

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
              <span>Lịch Tự Động & Cảm Biến</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Bảo vệ chủ động bằng cảm biến & AI</p>
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
        {/* Multi-Child Selector */}
        <ChildSwitcherBar />

        {/* Section 1: Routine Automation Schedules */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lịch Khóa Máy Tự Động</h3>
              <p className="text-[11px] text-slate-500">Khung giờ sinh hoạt cho {child.name}</p>
            </div>
          </div>

          {/* Mealtime */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Utensils size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Khóa máy giờ ăn cơm</p>
                  <p className="text-[10px] text-slate-500">
                    {smartRoutines.mealtimeStart || '11:30'} - {smartRoutines.mealtimeEnd || '12:30'} & tối
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  toggleSmartRoutine('mealtimeLock');
                  showToast('Đã thay đổi lịch khóa giờ ăn cơm!');
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  smartRoutines.mealtimeLock ? 'bg-orange-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
            </div>

            {smartRoutines.mealtimeLock && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                <span className="text-slate-500 font-bold">Khung giờ trưa:</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="time"
                    value={smartRoutines.mealtimeStart || '11:30'}
                    onChange={(e) => setSmartRoutineTimeRange('mealtime', e.target.value, smartRoutines.mealtimeEnd || '12:30')}
                    className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700"
                  />
                  <span>đến</span>
                  <input
                    type="time"
                    value={smartRoutines.mealtimeEnd || '12:30'}
                    onChange={(e) => setSmartRoutineTimeRange('mealtime', smartRoutines.mealtimeStart || '11:30', e.target.value)}
                    className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bedtime */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Moon size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Khóa máy giờ đi ngủ</p>
                  <p className="text-[10px] text-slate-500">
                    Từ {smartRoutines.bedtimeStart || '21:30'} đến {smartRoutines.bedtimeEnd || '06:30'} sáng
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  toggleSmartRoutine('bedtimeLock');
                  showToast('Đã thay đổi lịch khóa giờ đi ngủ!');
                }}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  smartRoutines.bedtimeLock ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
            </div>

            {smartRoutines.bedtimeLock && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                <span className="text-slate-500 font-bold">Giờ ngủ:</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="time"
                    value={smartRoutines.bedtimeStart || '21:30'}
                    onChange={(e) => setSmartRoutineTimeRange('bedtime', e.target.value, smartRoutines.bedtimeEnd || '06:30')}
                    className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700"
                  />
                  <span>đến</span>
                  <input
                    type="time"
                    value={smartRoutines.bedtimeEnd || '06:30'}
                    onChange={(e) => setSmartRoutineTimeRange('bedtime', smartRoutines.bedtimeStart || '21:30', e.target.value)}
                    className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Smart Safety Sensors with Explicit ON/OFF Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cảm Biến An Toàn Trên Máy Con</h3>
                <p className="text-[11px] text-slate-500">
                  Thiết lập cảm biến riêng cho <strong className="text-blue-600">{child.name}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* 1. Profanity Detection Card */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            smartRoutines.profanityDetection 
              ? 'bg-rose-50/40 border-rose-200 shadow-xs' 
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-black text-slate-900">
                    Phát hiện từ ngữ không phù hợp (Nói bậy)
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                    smartRoutines.profanityDetection 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${smartRoutines.profanityDetection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {smartRoutines.profanityDetection ? 'Đang bảo vệ 🟢' : 'Đã tắt trên máy con ⚪'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  AI nhận diện từ ngữ thô tục qua micro máy con, tự động kích hoạt khóa tĩnh tâm phạt và gửi cảnh báo về cha mẹ.
                </p>
              </div>

              <button
                onClick={() => {
                  toggleSmartRoutine('profanityDetection');
                  showToast(
                    !smartRoutines.profanityDetection 
                      ? `Đã BẬT cảm biến nói bậy trên máy của ${child.name}!` 
                      : `Đã TẮT cảm biến nói bậy trên máy của ${child.name}!`
                  );
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 shrink-0 ml-2 ${
                  smartRoutines.profanityDetection ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
            </div>

            {/* Config: Penalty duration */}
            {smartRoutines.profanityDetection && (
              <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Thời gian khóa phạt:</span>
                <div className="flex items-center space-x-1">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setSensorThresholds(mins, undefined);
                        showToast(`Đã đổi thời gian khóa phạt thành ${mins} phút`);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                        (smartRoutines.profanityPenaltyMinutes || 10) === mins
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins}p
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Noise Detection Card */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            smartRoutines.noiseDetection 
              ? 'bg-amber-50/40 border-amber-200 shadow-xs' 
              : 'bg-slate-50 border-slate-200 opacity-75'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-black text-slate-900">
                    Phát hiện âm thanh quá lớn (Tiếng ồn &gt;85dB)
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 border ${
                    smartRoutines.noiseDetection 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${smartRoutines.noiseDetection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {smartRoutines.noiseDetection ? 'Đang giám sát dB 🟢' : 'Đã tắt trên máy con ⚪'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Cảnh báo môi trường phòng học quá ồn ào hoặc tiếng la hét vượt ngưỡng an toàn bảo vệ thính lực của con.
                </p>
              </div>

              <button
                onClick={() => {
                  toggleSmartRoutine('noiseDetection');
                  showToast(
                    !smartRoutines.noiseDetection 
                      ? `Đã BẬT cảm biến tiếng ồn trên máy của ${child.name}!` 
                      : `Đã TẮT cảm biến tiếng ồn trên máy của ${child.name}!`
                  );
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 shrink-0 ml-2 ${
                  smartRoutines.noiseDetection ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
              </button>
            </div>

            {/* Config: Noise dB threshold */}
            {smartRoutines.noiseDetection && (
              <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Ngưỡng kích hoạt:</span>
                <div className="flex items-center space-x-1">
                  {[
                    { db: 75, label: '75dB' },
                    { db: 80, label: '80dB' },
                    { db: 85, label: '85dB (Chuẩn)' },
                    { db: 90, label: '90dB' }
                  ].map((item) => (
                    <button
                      key={item.db}
                      onClick={() => {
                        setSensorThresholds(undefined, item.db);
                        showToast(`Đã thiết lập ngưỡng âm thanh ${item.db}dB`);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                        (smartRoutines.noiseThresholdDb || 85) === item.db
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test Buttons */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-600 mb-2">Thử nghiệm phản hồi cảm biến ngay:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!smartRoutines.profanityDetection) {
                    showToast('⚠️ Cảm biến nói bậy đang TẮT trên máy con nên không kích hoạt khóa phạt!');
                    return;
                  }
                  simulateSensorTrigger('profanity');
                  showToast('Đã mô phỏng phát hiện nói bậy! Máy con đã bị khóa phạt.');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                  smartRoutines.profanityDetection
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                <Zap size={14} />
                <span>Test Nói bậy {smartRoutines.profanityDetection ? '' : '(Đã tắt)'}</span>
              </button>

              <button
                onClick={() => {
                  if (!smartRoutines.noiseDetection) {
                    showToast('⚠️ Cảm biến âm lượng lớn đang TẮT trên máy con nên không kích hoạt khóa phạt!');
                    return;
                  }
                  simulateSensorTrigger('noise');
                  showToast('Đã mô phỏng âm thanh >85dB!');
                }}
                className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                  smartRoutines.noiseDetection
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              >
                <Zap size={14} />
                <span>Test Tiếng ồn {smartRoutines.noiseDetection ? '' : '(Đã tắt)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Instant Reminders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gửi Lời Nhắc Nhở Tức Thì</h3>
              <p className="text-[11px] text-slate-500">Xuất hiện sinh động trên Dynamic Island của máy con</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                triggerReminder('hydration');
                showToast('Đã gửi lời nhắc uống nước!');
              }}
              className="p-3 bg-cyan-50 hover:bg-cyan-100/80 rounded-xl text-center border border-cyan-100 transition active:scale-95 space-y-1"
            >
              <Droplets size={20} className="mx-auto text-cyan-600" />
              <p className="text-xs font-bold text-cyan-900">Uống nước</p>
              <p className="text-[10px] text-cyan-700">1 cốc nước ấm</p>
            </button>

            <button
              onClick={() => {
                triggerReminder('school');
                showToast('Đã gửi lời nhắc đi học!');
              }}
              className="p-3 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl text-center border border-indigo-100 transition active:scale-95 space-y-1"
            >
              <BookOpen size={20} className="mx-auto text-indigo-600" />
              <p className="text-xs font-bold text-indigo-900">Đi học</p>
              <p className="text-[10px] text-indigo-700">Kiểm tra sách vở</p>
            </button>

            <button
              onClick={() => {
                triggerReminder('todo');
                showToast('Đã gửi lời nhắc việc cần làm!');
              }}
              className="p-3 bg-emerald-50 hover:bg-emerald-100/80 rounded-xl text-center border border-emerald-100 transition active:scale-95 space-y-1"
            >
              <Sparkles size={20} className="mx-auto text-emerald-600" />
              <p className="text-xs font-bold text-emerald-900">Việc cần làm</p>
              <p className="text-[10px] text-emerald-700">To-do List</p>
            </button>
          </div>
        </div>

        {/* Section 4: Text-To-Speech Audio Guidance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Volume2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Phát Âm Thanh Hướng Dẫn (Tiếng Việt)</h3>
              <p className="text-[11px] text-slate-500">Giọng nói tự nhiên đọc to thông điệp trên loa máy con</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              type="text"
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Nhập nội dung muốn đọc to..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={() => {
              if (!voiceText.trim()) return;
              triggerVoiceGuide(voiceText);
              showToast('Đang phát giọng nói Tiếng Việt trên máy con!');
            }}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-500/20 transition active:scale-95 flex items-center justify-center space-x-2"
          >
            <Volume2 size={14} />
            <span>Phát Giọng Nói Lên Loa Máy Con Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
