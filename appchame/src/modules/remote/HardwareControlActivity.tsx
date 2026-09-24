import React, { useState } from 'react';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Sun,
  Zap,
  Lock,
  Unlock,
  Clock,
  ShieldCheck,
  Smartphone,
  Sliders,
  Timer,
  Play,
  XCircle,
  Sparkles
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface HardwareControlActivityProps {
  onBack: () => void;
}

export const HardwareControlActivity: React.FC<HardwareControlActivityProps> = ({ onBack }) => {
  const {
    state,
    setHardwareControls,
    toggleHardwareLock,
    toggleLockVolume,
    toggleLockBrightness,
    setAllowChildAdjustment,
    setSafeHardwareLimits,
    startHardwareTimer,
    cancelHardwareTimer,
    toggleScheduleProfile,
    resolveChildHardwareAdjustment,
  } = useAppState();

  const { hardwareControls } = state;
  const activeChild = state.children?.find((c) => c.id === state.selectedChildId) || state.child;
  const childName = activeChild?.name || 'con';
  const isOnline = activeChild?.status === 'online';

  // Custom quick timer local state
  const [customMinutes, setCustomMinutes] = useState(30);
  const [customVol, setCustomVol] = useState(20);
  const [customBright, setCustomBright] = useState(60);
  const [customLock, setCustomLock] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
              <span>Điều Khiển Phần Cứng</span>
              {hardwareControls.isHardwareLocked && (
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Lock size={10} /> Đã khóa
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Thiết bị {childName} • Cấu hình từ xa & An toàn</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1 px-2.5 py-1 ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'} rounded-full text-xs font-semibold`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          <span>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Child Request Banner (Pending Permission) */}
        {hardwareControls.childRequestedAdjustment && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3.5 rounded-2xl shadow-md space-y-2 animate-bounce-short">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-yellow-200 fill-current" />
                <h4 className="text-xs font-black uppercase tracking-wider">Yêu Cầu Từ {childName}</h4>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                {hardwareControls.childRequestTime || 'Vừa xong'}
              </span>
            </div>
            <p className="text-xs font-medium text-amber-50">
              Con xin phép được tự điều chỉnh âm lượng & độ sáng để xem video bài giảng trong 15 phút ạ!
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => {
                  resolveChildHardwareAdjustment(true);
                  showToast('Đã duyệt yêu cầu của con trong 15 phút!');
                }}
                className="flex-1 py-1.5 bg-white text-amber-700 rounded-xl text-xs font-bold shadow-xs hover:bg-amber-50 transition active:scale-95"
              >
                Duyệt cho phép (15p)
              </button>
              <button
                onClick={() => {
                  resolveChildHardwareAdjustment(false);
                  showToast('Đã từ chối yêu cầu của con.');
                }}
                className="px-3 py-1.5 bg-black/20 text-white rounded-xl text-xs font-bold hover:bg-black/30 transition"
              >
                Từ chối
              </button>
            </div>
          </div>
        )}

        {/* Active Timer Countdown Banner */}
        {hardwareControls.activeTimer?.isActive && (
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Timer size={18} className="animate-spin text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-wider">Hẹn Giờ Đang Hoạt Động</span>
              </div>
              <p className="text-xs text-blue-100">{hardwareControls.activeTimer.label}</p>
              <p className="text-2xl font-black tracking-tight text-yellow-300 font-mono">
                {formatSeconds(hardwareControls.activeTimer.remainingSeconds)}
              </p>
            </div>
            <button
              onClick={() => {
                cancelHardwareTimer();
                showToast('Đã dừng hẹn giờ và khôi phục cài đặt gốc.');
              }}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
            >
              <XCircle size={14} />
              <span>Dừng lại</span>
            </button>
          </div>
        )}

        {/* SECTION 1: Direct Real-time Hardware Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sliders size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Điều Khiển Trực Tiếp</h3>
                <p className="text-[11px] text-slate-500">Phản hồi tức thì trên điện thoại con</p>
              </div>
            </div>
            {hardwareControls.isHardwareLocked && (
              <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <Lock size={12} /> Bị khóa bởi cha mẹ
              </span>
            )}
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center space-x-1.5">
                {hardwareControls.isMuted || hardwareControls.volume === 0 ? (
                  <VolumeX size={16} className="text-rose-500" />
                ) : (
                  <Volume2 size={16} className="text-blue-500" />
                )}
                <span>Âm lượng thiết bị con</span>
              </span>
              <span className="text-blue-600 font-bold text-sm">{hardwareControls.volume}%</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setHardwareControls({ isMuted: !hardwareControls.isMuted })}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                  hardwareControls.isMuted
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {hardwareControls.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{hardwareControls.isMuted ? 'Đang tắt âm' : 'Tắt âm'}</span>
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={hardwareControls.volume}
                onChange={(e) => setHardwareControls({ volume: Number(e.target.value), isMuted: false })}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Quick volume presets */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <button
                onClick={() => setHardwareControls({ volume: 0, isMuted: true })}
                className="hover:text-blue-600 font-medium"
              >
                Im lặng (0%)
              </button>
              <button
                onClick={() => setHardwareControls({ volume: 30, isMuted: false })}
                className="hover:text-blue-600 font-medium"
              >
                Học bài (30%)
              </button>
              <button
                onClick={() => setHardwareControls({ volume: 60, isMuted: false })}
                className="hover:text-blue-600 font-medium"
              >
                Chuẩn (60%)
              </button>
              <button
                onClick={() => setHardwareControls({ volume: 100, isMuted: false })}
                className="hover:text-blue-600 font-medium"
              >
                Tối đa (100%)
              </button>
            </div>
          </div>

          {/* Screen Brightness */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center space-x-1.5">
                <Sun size={16} className="text-amber-500" />
                <span>Độ sáng màn hình con</span>
              </span>
              <span className="text-amber-600 font-bold text-sm">{hardwareControls.brightness}%</span>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              value={hardwareControls.brightness}
              onChange={(e) => setHardwareControls({ brightness: Number(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <button
                onClick={() => setHardwareControls({ brightness: 20 })}
                className="hover:text-amber-600 font-medium"
              >
                Bảo vệ mắt (20%)
              </button>
              <button
                onClick={() => setHardwareControls({ brightness: 60 })}
                className="hover:text-amber-600 font-medium"
              >
                Chuẩn (60%)
              </button>
              <button
                onClick={() => setHardwareControls({ brightness: 100 })}
                className="hover:text-amber-600 font-medium"
              >
                Sáng tối đa (100%)
              </button>
            </div>
          </div>

          {/* Flashlight Finder */}
          <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Đèn Flash thiết bị</p>
                <p className="text-[10px] text-slate-500">Nháy đèn tìm thiết bị của con trong phòng tối</p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !hardwareControls.flashlight;
                setHardwareControls({ flashlight: next });
                showToast(next ? 'Đã bật đèn Flash máy con!' : 'Đã tắt đèn Flash.');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                hardwareControls.flashlight
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {hardwareControls.flashlight ? 'Đang bật' : 'Bật đèn'}
            </button>
          </div>
        </div>

        {/* SECTION 2: Lock Hardware Settings (Khóa thiết đặt phần cứng) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Khóa Thiết Đặt Phần Cứng</h3>
                <p className="text-[11px] text-slate-500">Cố định cài đặt, ngăn trẻ tự ý thay đổi</p>
              </div>
            </div>
          </div>

          {/* Master Hardware Lock Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Khóa cứng toàn bộ phần cứng</p>
              <p className="text-[11px] text-slate-500">Khóa cả âm lượng & độ sáng, không cho con can thiệp</p>
            </div>
            <button
              onClick={() => {
                toggleHardwareLock();
                showToast(
                  hardwareControls.isHardwareLocked
                    ? 'Đã mở khóa thiết lập phần cứng.'
                    : 'Đã khóa cứng thiết lập phần cứng máy con!'
                );
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                hardwareControls.isHardwareLocked ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></div>
            </button>
          </div>

          {/* Separate locks */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-semibold text-slate-700">Khóa âm lượng</p>
                <p className="text-[10px] text-slate-400">Giữ cố định</p>
              </div>
              <button
                onClick={toggleLockVolume}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  hardwareControls.lockVolume ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {hardwareControls.lockVolume ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/50">
              <div>
                <p className="text-xs font-semibold text-slate-700">Khóa độ sáng</p>
                <p className="text-[10px] text-slate-400">Giữ cố định</p>
              </div>
              <button
                onClick={toggleLockBrightness}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  hardwareControls.lockBrightness ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {hardwareControls.lockBrightness ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
          </div>

          {/* Safe threshold limits */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1 text-slate-600">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Giới hạn âm lượng tối đa cho phép bé chỉnh:</span>
              </span>
              <span className="font-bold text-emerald-600">{hardwareControls.maxAllowedVolume}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={hardwareControls.maxAllowedVolume}
              onChange={(e) => setSafeHardwareLimits(Number(e.target.value), hardwareControls.minAllowedBrightness)}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>
        </div>

        {/* SECTION 3: Schedule & Timer Config (Hẹn giờ cấu hình) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hẹn Giờ Cấu Hình Phần Cứng</h3>
                <p className="text-[11px] text-slate-500">Tự động thay đổi theo lịch hoặc đếm ngược</p>
              </div>
            </div>
          </div>

          {/* Quick Timer Presets */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">Hẹn giờ nhanh (Countdown Timer):</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  startHardwareTimer(30, 'Tập trung học bài (30 phút)', 20, 70, false, true);
                  showToast('Đã kích hoạt hẹn giờ Học bài trong 30 phút!');
                }}
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl text-left border border-indigo-100 transition active:scale-95"
              >
                <div className="flex items-center justify-between text-indigo-700 font-bold text-xs mb-1">
                  <span>30 phút</span>
                  <Play size={12} />
                </div>
                <p className="text-[10px] text-slate-500">Vol 20% • Khóa máy</p>
              </button>

              <button
                onClick={() => {
                  startHardwareTimer(15, 'Tĩnh tâm im lặng (15 phút)', 0, 40, true, true);
                  showToast('Đã kích hoạt hẹn giờ Tĩnh tâm trong 15 phút!');
                }}
                className="p-2.5 bg-rose-50 hover:bg-rose-100/80 rounded-xl text-left border border-rose-100 transition active:scale-95"
              >
                <div className="flex items-center justify-between text-rose-700 font-bold text-xs mb-1">
                  <span>15 phút</span>
                  <Play size={12} />
                </div>
                <p className="text-[10px] text-slate-500">Tắt âm • Khóa máy</p>
              </button>

              <button
                onClick={() => {
                  startHardwareTimer(60, 'Bảo vệ mắt buổi tối (1 giờ)', 30, 30, false, false);
                  showToast('Đã kích hoạt hẹn giờ Bảo vệ mắt trong 1 giờ!');
                }}
                className="p-2.5 bg-amber-50 hover:bg-amber-100/80 rounded-xl text-left border border-amber-100 transition active:scale-95"
              >
                <div className="flex items-center justify-between text-amber-700 font-bold text-xs mb-1">
                  <span>60 phút</span>
                  <Play size={12} />
                </div>
                <p className="text-[10px] text-slate-500">Độ sáng 30%</p>
              </button>
            </div>
          </div>

          {/* Custom Timer Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-xs">
            <p className="font-bold text-slate-800">Tùy biến bộ hẹn giờ:</p>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Thời gian:</span>
              <select
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700"
              >
                <option value={10}>10 phút</option>
                <option value={20}>20 phút</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>1 giờ</option>
                <option value={120}>2 giờ</option>
              </select>

              <span className="text-slate-500 ml-2">Âm lượng:</span>
              <select
                value={customVol}
                onChange={(e) => setCustomVol(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-700"
              >
                <option value={0}>0% (Tắt)</option>
                <option value={20}>20%</option>
                <option value={40}>40%</option>
                <option value={60}>60%</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customLock}
                  onChange={(e) => setCustomLock(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Khóa cài đặt trong khi hẹn giờ</span>
              </label>

              <button
                onClick={() => {
                  startHardwareTimer(
                    customMinutes,
                    `Hẹn giờ tùy biến (${customMinutes} phút)`,
                    customVol,
                    customBright,
                    customVol === 0,
                    customLock
                  );
                  showToast(`Đã bắt đầu hẹn giờ ${customMinutes} phút!`);
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold shadow-xs hover:bg-indigo-700 transition active:scale-95"
              >
                Áp dụng ngay
              </button>
            </div>
          </div>

          {/* Scheduled Day/Night Profiles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700">Lịch định kỳ tự động (Recurring Schedules):</p>
            {hardwareControls.schedules.map((profile) => (
              <div
                key={profile.id}
                className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800">{profile.name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                      {profile.startTime} - {profile.endTime}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Âm lượng {profile.targetVolume}% • Độ sáng {profile.targetBrightness}% •{' '}
                    {profile.lockDuringSchedule ? 'Khóa cài đặt' : 'Mở'}
                  </p>
                </div>
                <button
                  onClick={() => toggleScheduleProfile(profile.id)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition duration-300 ${
                    profile.enabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Allow Child to Adjust Hardware (Cho phép con cái điều chỉnh lại phần cứng) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quyền Của Con Cái</h3>
                <p className="text-[11px] text-slate-500">Cho phép con tự điều chỉnh phần cứng từ máy con</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Cho phép con tự chỉnh âm lượng & độ sáng</p>
              <p className="text-[11px] text-slate-500">
                {hardwareControls.allowChildAdjustment
                  ? 'Bé có thể tự kéo chỉnh trong phạm vi an toàn bố mẹ đặt'
                  : 'Bảng điều khiển máy con sẽ hiển thị ổ khóa'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !hardwareControls.allowChildAdjustment;
                setAllowChildAdjustment(next);
                showToast(next ? 'Đã cho phép con tự điều chỉnh phần cứng.' : 'Đã tắt quyền tự điều chỉnh của con.');
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                hardwareControls.allowChildAdjustment ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition"></div>
            </button>
          </div>

          <div className="flex items-start space-x-2 p-2.5 bg-blue-50/60 rounded-xl text-[11px] text-blue-700">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
            <p>
              Khi bật quyền này, trên điện thoại của con sẽ xuất hiện bảng điều khiển nhanh. Con có thể chủ động tăng giảm
              âm lượng phù hợp với môn học nhưng không thể vượt quá ngưỡng <strong>{hardwareControls.maxAllowedVolume}%</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
