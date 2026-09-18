import React, { useState } from 'react';
import {
  ChevronLeft,
  Footprints,
  Flame,
  Heart,
  Moon,
  Lightbulb,
  Activity,
  Sparkles,
  Sliders,
  Droplets,
  Eye,
  CheckCircle2,
  X,
  Target
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface HealthScreenProps {
  onBack: () => void;
}

export const HealthScreen: React.FC<HealthScreenProps> = ({ onBack }) => {
  const { state, updateHealthGoals, triggerReminder, triggerVoiceGuide } = useAppState();
  const { health, child, children, selectedChildId } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || child;

  // Goals modal state
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [targetSteps, setTargetSteps] = useState(health.stepGoal || 8000);
  const [targetActiveMins, setTargetActiveMins] = useState(health.activeGoalMinutes || 60);
  const [targetSleep, setTargetSleep] = useState(health.sleepHours || 9);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSaveGoals = () => {
    if (updateHealthGoals) {
      updateHealthGoals({
        stepGoal: targetSteps,
        activeGoalMinutes: targetActiveMins,
        sleepHours: targetSleep,
      });
    }
    setShowGoalsModal(false);
    showToast('Đã lưu mục tiêu sức khỏe mới cho con!');
  };

  const handleRemindHydration = () => {
    if (triggerReminder) {
      triggerReminder('hydration');
    }
    showToast('💧 Đã gửi thông điệp nhắc con uống nước tới máy con!');
  };

  const handleRemindPosture = () => {
    if (triggerVoiceGuide) {
      triggerVoiceGuide('Bé ơi, con hãy ngồi thẳng lưng và giữ mắt cách màn hình 40cm để bảo vệ cột sống nhé!');
    }
    showToast('🪑 Đã gửi nhắc nhở ngồi thẳng lưng qua giọng nói!');
  };

  const stepPercent = Math.min(100, Math.round((health.steps / (health.stepGoal || 8000)) * 100));
  const activePercent = Math.min(100, Math.round((health.activeMinutes / (health.activeGoalMinutes || 60)) * 100));

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Sức khỏe & Vận động</h2>
            <p className="text-[10px] text-slate-400 font-medium">Theo dõi thể chất & Giấc ngủ của {currentChild.name}</p>
          </div>
        </div>

        <button
          onClick={() => setShowGoalsModal(true)}
          className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition cursor-pointer"
          title="Thiết lập mục tiêu"
        >
          <Sliders size={16} />
        </button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Child info mini bar */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {currentChild.avatar?.startsWith('http') || currentChild.avatar?.startsWith('/') ? (
            <img
              src={currentChild.avatar}
              alt={currentChild.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg ring-2 ring-emerald-500">
              {currentChild.avatar || '👦'}
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-900">{currentChild.name}</h4>
            <span className="text-[10px] text-slate-500">{currentChild.age} tuổi • {currentChild.grade}</span>
          </div>
        </div>
        <button
          onClick={() => setShowGoalsModal(true)}
          className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 transition cursor-pointer"
        >
          Sửa mục tiêu
        </button>
      </div>

      {/* Physical Activity Cards */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Steps */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-blue-600">
                <Footprints size={17} />
                <span className="text-[11px] font-bold">Số bước chân</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">/{health.stepGoal || 8000}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{health.steps.toLocaleString('vi-VN')}</h2>
              <span className="text-[10px] text-blue-600 font-bold">Đạt {stepPercent}% mục tiêu</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>

          {/* Active Time */}
          <div className="bg-white rounded-3xl p-4 shadow-soft border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-emerald-600">
                <Flame size={17} />
                <span className="text-[11px] font-bold">Thời gian vận động</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">/{health.activeGoalMinutes || 60}p</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {Math.floor(health.activeMinutes / 60)}h {health.activeMinutes % 60}p
              </h2>
              <span className="text-[10px] text-emerald-600 font-bold">Đạt {activePercent}% mục tiêu</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${activePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Health Reminder Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleRemindHydration}
            className="p-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-2xl flex items-center space-x-2 text-sky-800 transition cursor-pointer active:scale-95 shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
              <Droplets size={16} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Nhắc Uống Nước</span>
              <span className="text-[9.5px] text-sky-600">Gửi lời nhắc 1 ly nước</span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleRemindPosture}
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center space-x-2 text-amber-800 transition cursor-pointer active:scale-95 shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Eye size={16} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block">Nhắc Ngồi Thẳng</span>
              <span className="text-[9.5px] text-amber-600">Bảo vệ mắt & cột sống</span>
            </div>
          </button>
        </div>

        {/* Biometric Stats from Wearable */}
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-800 block mb-2">Chỉ số sinh trắc học (Thiết bị đeo)</span>
          <div className="grid grid-cols-2 gap-3">
            {/* Heart rate */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Heart size={20} className="fill-rose-500 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Nhịp tim</span>
                <p className="text-sm font-extrabold text-slate-900">{health.heartRate} bpm</p>
                <span className="text-[9.5px] text-emerald-600 font-bold">Bình thường</span>
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Moon size={20} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Giấc ngủ đêm qua</span>
                <p className="text-sm font-extrabold text-slate-900">
                  {health.sleepHours}h {health.sleepMinutes}p
                </p>
                <span className="text-[9.5px] text-indigo-600 font-bold">Ngủ sâu 85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Health Advice Card */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-4 text-xs space-y-1.5">
          <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Đánh giá sức khỏe tổng thể AI:</span>
          </span>
          <p className="text-emerald-900 leading-relaxed">
            {health.aiSuggestion || 'Bé An có nhịp sinh hoạt rất điều độ, năng lượng vận động tốt và ngủ đủ giấc. Nên duy trì uống nước đều đặn khi học bài.'}
          </p>
        </div>
      </div>

      {/* Modal: Set Health Goals */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Target size={16} className="text-blue-600" />
                <span>Thiết Lập Mục Tiêu Sức Khỏe</span>
              </h3>
              <button
                onClick={() => setShowGoalsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Steps goal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Mục tiêu bước chân mỗi ngày
                  </label>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {targetSteps.toLocaleString('vi-VN')} bước
                  </span>
                </div>
                <input
                  type="range"
                  min={4000}
                  max={15000}
                  step={500}
                  value={targetSteps}
                  onChange={(e) => setTargetSteps(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Active minutes goal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Thời gian vận động / thể dục
                  </label>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {targetActiveMins} phút
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={120}
                  step={10}
                  value={targetActiveMins}
                  onChange={(e) => setTargetActiveMins(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Sleep target */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Thời gian ngủ đêm tối thiểu
                  </label>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {targetSleep} tiếng
                  </span>
                </div>
                <input
                  type="range"
                  min={7}
                  max={11}
                  step={0.5}
                  value={targetSleep}
                  onChange={(e) => setTargetSleep(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowGoalsModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveGoals}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Lưu Mục Tiêu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
