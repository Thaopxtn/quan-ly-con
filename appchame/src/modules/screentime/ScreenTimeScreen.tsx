import React, { useState, useEffect } from 'react';
import { ChevronLeft, TrendingDown, Clock, Sliders, Check, Sparkles, Hourglass } from 'lucide-react';
import { useAppState } from '@shared/store';
import { ChildSwitcherBar } from '../../components/ChildSwitcherBar';
import { Kids360ScreenTimeGauge } from '../../components/Kids360ScreenTimeGauge';
import { Kids360DayTimeline } from '../../components/Kids360DayTimeline';
import { UsageAccessPermissionAlert } from '../../components/UsageAccessPermissionAlert';

interface ScreenTimeScreenProps {
  onBack: () => void;
  onNavigate: (screenKey: string) => void;
}

const PRESET_TIMES = [
  { label: '30 phút', minutes: 30 },
  { label: '45 phút', minutes: 45 },
  { label: '1 giờ', minutes: 60 },
  { label: '1h 30p', minutes: 90 },
  { label: '2 giờ', minutes: 120 },
  { label: '2h 15p', minutes: 135 },
  { label: '3 giờ', minutes: 180 },
  { label: '4 giờ', minutes: 240 },
];

export const ScreenTimeScreen: React.FC<ScreenTimeScreenProps> = ({ onBack, onNavigate }) => {
  const { state, setCustomScreenTimeLimit } = useAppState();
  const { apps, screenTime, child } = state;
  const [timeTab, setTimeTab] = useState<'today' | '7days' | '30days'>('today');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Read currently saved custom limit for this child
  const savedLimitMinutes = state.childSettings?.[child.id]?.screenTimeLimitMinutes || 135;
  const [customHours, setCustomHours] = useState(Math.floor(savedLimitMinutes / 60));
  const [customMinutes, setCustomMinutes] = useState(savedLimitMinutes % 60);

  useEffect(() => {
    const cur = state.childSettings?.[child.id]?.screenTimeLimitMinutes || 135;
    setCustomHours(Math.floor(cur / 60));
    setCustomMinutes(cur % 60);
  }, [child.id, state.childSettings]);

  const hourlyLabels = ['6h', '9h', '12h', '15h', '18h', '21h', '24h'];
  const sampleHeights = [15, 45, 80, 50, 30, 65, 10]; // percentage heights

  const totalUsedHours = Math.floor(screenTime.todayTotalMinutes / 60);
  const totalUsedMins = screenTime.todayTotalMinutes % 60;
  const timeUsedStr = `${totalUsedHours > 0 ? `${totalUsedHours}h ` : ''}${totalUsedMins}p`;

  const limitH = Math.floor(savedLimitMinutes / 60);
  const limitM = savedLimitMinutes % 60;
  const limitStr = `${limitH > 0 ? `${limitH}h ` : ''}${limitM > 0 ? `${limitM}p` : ''}`;

  const handleApplyLimit = () => {
    const total = Math.max(15, (Number(customHours) || 0) * 60 + (Number(customMinutes) || 0));
    setCustomScreenTimeLimit(child.id, total);
    setShowLimitModal(false);
  };

  const selectPreset = (minutes: number) => {
    setCustomHours(Math.floor(minutes / 60));
    setCustomMinutes(minutes % 60);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Thời gian sử dụng thiết bị</h2>
            <p className="text-[10px] text-slate-500 font-medium">Cài đặt giới hạn độc lập cho từng bé</p>
          </div>
        </div>
      </div>

      {/* Multi-Child Selector */}
      <div className="px-4 pt-3">
        <ChildSwitcherBar />
      </div>

      {/* Usage Permission Prompt: Warns parent if kid hasn't granted PACKAGE_USAGE_STATS */}
      <UsageAccessPermissionAlert childId={child.id} className="mx-4 mt-3" />

      {/* Tabs Filter */}
      <div className="px-4 pt-3 pb-1">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex">
          <button
            onClick={() => setTimeTab('today')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              timeTab === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeTab('7days')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              timeTab === '7days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setTimeTab('30days')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              timeTab === '30days' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 ngày
          </button>
        </div>
      </div>

      {/* Kids360 Radial Screen Time Gauge */}
      <div className="px-4 pt-2">
        <Kids360ScreenTimeGauge
          childId={child.id}
          childName={child.name}
          usedMinutes={screenTime.todayTotalMinutes}
          limitMinutes={savedLimitMinutes}
          isLocked={Boolean(child.isLocked || state.childSettings?.[child.id]?.isLocked || state.childSettings?.[child.id]?.lockChallenge?.isLocked || (child.id === state.selectedChildId && state.lockChallenge?.isLocked))}
          isStudyMode={state.studyModeOnly}
          battery={child.battery}
          onOpenLimitModal={() => setShowLimitModal(true)}
        />
      </div>

      {/* Hourly Bar Chart Visualization Card */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Biểu đồ dùng theo giờ</h4>
              <p className="text-[10px] text-slate-400 font-medium">Hôm nay ({child.name})</p>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-600 text-xs font-semibold">
              <TrendingDown size={14} />
              <span>Giảm {Math.abs(screenTime.percentChangeVsYesterday)}%</span>
            </div>
          </div>

          <div className="h-28 flex items-end justify-between gap-2.5 px-2 pt-2">
            {sampleHeights.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full bg-slate-100 rounded-t-lg relative flex items-end h-24 overflow-hidden">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      i === 2 ? 'bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{hourlyLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kids360 24-Hour Visual Day-Planner Timeline */}
      <div className="px-4 pt-3">
        <Kids360DayTimeline
          childName={child.name}
          onNavigate={onNavigate}
        />
      </div>

      {/* App Breakdown Details */}
      <div className="flex-1 px-4 space-y-2.5 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Chi tiết ứng dụng của {child.name}</h3>
          <button
            onClick={() => onNavigate('apps')}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
          >
            Quản lý tất cả
          </button>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-soft border border-slate-100 space-y-3">
          {apps.slice(0, 4).map((app) => (
            <div key={app.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700">
                    {app.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">{app.name}</span>
                    <span className={`text-[9px] font-bold ${app.status === 'blocked' ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {app.status === 'blocked' ? 'Đang khóa' : 'Cho phép'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    {Math.floor(app.timeUsedMinutes / 60) > 0 ? `${Math.floor(app.timeUsedMinutes / 60)}h ` : ''}
                    {app.timeUsedMinutes % 60}p
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({app.percentChange}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, app.percentChange || 20)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Set Screen Time Button */}
        <button
          onClick={() => setShowLimitModal(true)}
          className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition active:scale-[0.98]"
        >
          <Sliders size={16} />
          <span>Đặt thời gian tùy chọn cho {child.name}</span>
        </button>
      </div>

      {/* Screen Limit Modal with Granular Custom Time Inputs */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Hourglass size={16} className="text-blue-600" />
                  <span>Đặt Giới Hạn Tùy Chọn</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Áp dụng riêng cho: <strong className="text-blue-600">{child.name}</strong> ({child.age} tuổi)
                </p>
              </div>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Visual Display */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl text-center border border-blue-100 space-y-1">
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                Tổng thời lượng cho phép mỗi ngày:
              </span>
              <div className="text-2xl font-black text-blue-900">
                {customHours} giờ {customMinutes} phút
              </div>
              <span className="text-[11px] text-slate-500">
                (= {(customHours * 60) + Number(customMinutes)} phút / ngày)
              </span>
            </div>

            {/* Custom Hours & Minutes Numeric Inputs */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Nhập số giờ và phút tùy ý:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Số giờ:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={customHours}
                      onChange={(e) => setCustomHours(Math.max(0, Math.min(12, Number(e.target.value))))}
                      className="w-14 text-center font-black text-sm bg-white border border-slate-300 rounded-lg py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-bold">h</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Số phút:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                      className="w-14 text-center font-black text-sm bg-white border border-slate-300 rounded-lg py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-bold">p</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Hoặc chọn nhanh thời lượng mẫu:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_TIMES.map((preset) => {
                  const isCurrent =
                    customHours === Math.floor(preset.minutes / 60) &&
                    customMinutes === preset.minutes % 60;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => selectPreset(preset.minutes)}
                      className={`py-1.5 px-1 rounded-xl text-center text-[11px] font-bold border transition active:scale-95 ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              * Khi hết thời gian trên, thiết bị của {child.name} sẽ tự động khóa các ứng dụng giải trí và chỉ cho phép gọi điện thoại khẩn cấp cho gia đình.
            </p>

            <div className="flex space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLimitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyLimit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition"
              >
                Áp dụng cho {child.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
