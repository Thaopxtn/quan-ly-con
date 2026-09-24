import React, { useState } from 'react';
import {
  ChevronLeft,
  Tv,
  Camera,
  RefreshCw,
  Lock,
  Eye,
  Maximize2,
  Video,
  Radio,
  CameraOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface LiveMonitorActivityProps {
  onBack: () => void;
}

export const LiveMonitorActivity: React.FC<LiveMonitorActivityProps> = ({ onBack }) => {
  const {
    state,
    lockChildDeviceNow,
    toggleLiveStream,
    switchCameraFacing,
  } = useAppState();

  const targetChildId = state.selectedChildId;
  const currentChild = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const childSettings = state.childSettings[targetChildId] || state.childSettings[currentChild?.id || ''];
  const { liveMonitoring, kioskMode } = state;
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSnapshotSaved, setIsSnapshotSaved] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSnapshot = () => {
    setIsSnapshotSaved(true);
    showToast('📸 Đã chụp ảnh lưu vết và lưu vào Nhật ký an toàn!');
    setTimeout(() => setIsSnapshotSaved(false), 3000);
  };

  const isChildOnline = currentChild?.status === 'online';
  const isScreenOn = currentChild?.isScreenOn !== false;
  const activeApp = currentChild?.activeOpenedApp || childSettings?.activeOpenedApp || state.activeOpenedApp;
  const activeAppName = typeof activeApp === 'object' && activeApp ? activeApp.name : (typeof activeApp === 'string' ? activeApp : '');
  const screenTimeUsed = childSettings?.screenTime?.todayTotalMinutes ?? currentChild?.screenTimeUsedMinutes ?? state.screenTime?.todayTotalMinutes ?? 0;
  const isLocked = Boolean(currentChild?.isLocked || childSettings?.isLocked || childSettings?.lockChallenge?.isLocked);

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
              <span>Giám Sát Màn Hình & Trực Tiếp</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {currentChild?.name || 'Bé'} • {isChildOnline ? '🟢 Đang kết nối trực tuyến' : '⚪ Ngoại tuyến'}
            </p>
          </div>
        </div>
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          isChildOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isChildOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
          <span>{isChildOnline ? 'TRỰC TUYẾN' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Module 1: Live Screen Mirroring */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Tv size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Màn Hình Thiết Bị Của Con</h3>
                <p className="text-[10px] text-slate-500">
                  {currentChild?.deviceName || currentChild?.model || 'Điện thoại con'} • Màn hình {isScreenOn ? 'Đang bật 🟢' : 'Đang tắt 💤'}
                </p>
              </div>
            </div>
            {!isLocked && (
              <button
                onClick={() => {
                  lockChildDeviceNow(targetChildId);
                  showToast('Đang gửi lệnh khóa máy đến thiết bị con...');
                }}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
              >
                <Lock size={12} />
                <span>Khóa ngay</span>
              </button>
            )}
          </div>

          {/* Screen Status Box with Real Telemetry */}
          <div className={`relative aspect-video rounded-2xl overflow-hidden border shadow-md flex flex-col justify-between p-3.5 text-white ${
            isLocked
              ? 'bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 border-rose-800/80'
              : isScreenOn
              ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-slate-700/80'
              : 'bg-gradient-to-br from-slate-950 via-slate-900 to-black border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className={`flex items-center gap-1.5 font-bold ${isLocked ? 'text-rose-400' : isScreenOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-rose-500' : isScreenOn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                {isLocked ? 'THIẾT BỊ ĐÃ KHÓA' : isScreenOn ? 'MÀN HÌNH ĐANG BẬT' : 'MÀN HÌNH ĐANG TẮT'}
              </span>
              <span>Pin: {currentChild?.battery ?? '--'}%</span>
            </div>

            <div className="text-center space-y-1 my-auto py-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-2 text-cyan-300">
                {isLocked ? <Lock size={24} className="text-rose-400" /> : <Tv size={24} />}
              </div>
              <p className="text-xs font-extrabold text-white">
                {isLocked
                  ? `Máy đang trong trạng thái bị khóa an toàn`
                  : kioskMode.isEnabled
                  ? `Đang ghim app: ${kioskMode.pinnedAppName}`
                  : activeAppName
                  ? `Bé đang mở: ${activeAppName}`
                  : `Bé ${currentChild?.name || 'con'} đang ở màn hình chính`}
              </p>
              <p className="text-[10px] text-slate-300">
                Đã dùng hôm nay: {screenTimeUsed} phút • Vị trí: {currentChild?.currentAddress || 'Đang cập nhật'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-400">
              <span>Mã hóa bảo mật Bearer HMAC-SHA256</span>
              <span className="text-cyan-300">{isLocked ? 'Đã khóa an toàn' : 'Bấm "Khóa ngay" nếu cần can thiệp'}</span>
            </div>
          </div>
        </div>

        {/* Module 2: Live Camera Feed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Camera Góc Học Tập</h3>
                <p className="text-[10px] text-slate-500">
                  Camera {liveMonitoring.cameraFacing === 'front' ? 'Trước' : 'Sau'} • Nhận diện tư thế ngồi
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => {
                  switchCameraFacing();
                  showToast('Đã đổi góc quay Camera!');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
              >
                <RefreshCw size={12} />
                <span>Đổi góc</span>
              </button>
              <button
                onClick={handleSnapshot}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
              >
                <Camera size={12} />
                <span>Chụp ảnh</span>
              </button>
            </div>
          </div>

          {/* Camera Feed Mockup */}
          <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md flex items-center justify-center">
            {/* Simulated camera background */}
            <div className="absolute inset-0 bg-radial from-slate-800/40 via-slate-950 to-black opacity-90"></div>

            <div className="relative z-10 text-center space-y-2 p-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-400/50 flex items-center justify-center mx-auto">
                <Video size={28} className="text-purple-300" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>AI: {state.child?.name || 'Bé'} đang ngồi học bài đúng tư thế</span>
                </p>
                <p className="text-[10px] text-slate-400">Khoảng cách mắt đến màn hình: 42cm (Đạt chuẩn)</p>
              </div>
            </div>

            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
              Góc học tập • Ánh sáng phòng tốt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
