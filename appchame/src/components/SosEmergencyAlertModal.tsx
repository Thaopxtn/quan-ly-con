import React, { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Volume2,
  VolumeX,
  PhoneCall,
  Navigation,
  Video,
  CheckCircle2,
  Minimize2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface SosEmergencyAlertModalProps {
  isOpen: boolean;
  sosDetails?: {
    time: string;
    lat: number;
    lng: number;
    address: string;
  } | null;
  childName: string;
  childAvatar?: string;
  childPhone?: string;
  onDismissSOS: () => void;
  onMinimize: () => void;
  onOpenLiveMonitor?: () => void;
}

export const SosEmergencyAlertModal: React.FC<SosEmergencyAlertModalProps> = ({
  isOpen,
  sosDetails,
  childName,
  childAvatar = 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80',
  childPhone = '0987654321',
  onDismissSOS,
  onMinimize,
  onOpenLiveMonitor,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  // Synthesize emergency siren using Web Audio API (No external sound file needed)
  useEffect(() => {
    if (!isOpen || isMuted) {
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Play warbling siren tone
      const playSirenPulse = () => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Warble between 650Hz and 950Hz
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(950, ctx.currentTime + 0.35);
        osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.7);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      };

      playSirenPulse();
      sirenIntervalRef.current = setInterval(playSirenPulse, 750);

      // Hardware vibration if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 250, 500, 250, 500]);
      }
    } catch (err) {
      console.warn('Web Audio Siren Error:', err);
    }

    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
    };
  }, [isOpen, isMuted]);

  if (!isOpen) return null;

  const lat = sosDetails?.lat || 10.7769;
  const lng = sosDetails?.lng || 106.7009;
  const address = sosDetails?.address || 'Đang lấy vị trí thực tế của con...';
  const timeStr = sosDetails?.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200 select-none">
      {/* Red Alert Container */}
      <div className="bg-slate-900 border-2 border-red-500 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Animated Caution Bar Header */}
        <div className="bg-red-600 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 px-4 py-3 flex items-center justify-between text-white shadow-md animate-pulse">
          <div className="flex items-center space-x-2">
            <ShieldAlert size={22} className="animate-bounce" />
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                CẢNH BÁO SOS KHẨN CẤP
              </span>
              <span className="text-[10px] text-red-100 font-medium">
                Con đang cần sự trợ giúp ngay lập tức!
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Siren sound toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Bật còi hú' : 'Tắt còi hú'}
              className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition cursor-pointer"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
            </button>
            {/* Minimize button */}
            <button
              onClick={onMinimize}
              title="Thu nhỏ để xem màn hình khác"
              className="p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition cursor-pointer"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Child Identity Card */}
          <div className="flex items-center space-x-3 bg-red-950/40 border border-red-500/30 rounded-2xl p-3">
            <div className="relative">
              <img
                src={childAvatar}
                alt={childName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] animate-ping"></span>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                !
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white truncate">{childName}</h3>
                <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                  {timeStr}
                </span>
              </div>
              <p className="text-xs text-red-300 font-medium mt-0.5">
                Đã bấm nút báo động SOS trên thiết bị!
              </p>
            </div>
          </div>

          {/* Location & GPS Info Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center space-x-1.5 text-red-400">
                <Navigation size={15} className="animate-spin-slow" />
                <span>Vị trí khẩn cấp của con:</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>

            <p className="text-xs text-white font-semibold leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
              📍 {address}
            </p>

            {/* Simulated Live Radar / Mini Map Preview */}
            <div className="h-28 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700 relative overflow-hidden flex items-center justify-center">
              {/* Radar Rings */}
              <div className="absolute w-20 h-20 rounded-full border border-red-500/30 animate-ping"></div>
              <div className="absolute w-36 h-36 rounded-full border border-red-500/20"></div>
              <div className="absolute w-52 h-52 rounded-full border border-red-500/10"></div>
              {/* Center Child Pin */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg shadow-red-600/50 animate-bounce">
                  <BellRing size={16} className="text-white" />
                </div>
                <span className="text-[10px] bg-red-600/90 text-white font-black px-2 py-0.5 rounded-full mt-1 shadow-xs">
                  {childName} Đang ở đây
                </span>
              </div>

              {/* Direct Open in Google Maps */}
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 right-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center space-x-1 transition z-20"
              >
                <span>Mở Google Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Quick Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Route Map to Child Button */}
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-3 bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 transition active:scale-[0.98]"
            >
              <Navigation size={17} />
              <span>Chỉ Đường Tới Con</span>
            </a>

            {/* Direct Call to Child */}
            <a
              href={`tel:${childPhone}`}
              className="py-3 px-3 bg-emerald-600 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/30 transition active:scale-[0.98]"
            >
              <PhoneCall size={17} />
              <span>Gọi Cho Con</span>
            </a>

            {/* Call 113 Police */}
            <a
              href="tel:113"
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
            >
              <AlertTriangle size={15} />
              <span>Gọi Cảnh Sát 113</span>
            </a>

            {/* Call 115 Ambulance */}
            <a
              href="tel:115"
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
            >
              <PhoneCall size={15} />
              <span>Gọi Cấp Cứu 115</span>
            </a>
          </div>

          {/* Remote Camera & Environmental Audio */}
          {onOpenLiveMonitor && (
            <button
              onClick={() => {
                onMinimize();
                onOpenLiveMonitor();
              }}
              className="w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Video size={16} />
              <span>Bật Camera & Nghe Âm Thanh Môi Trường Con Ngay</span>
            </button>
          )}
        </div>

        {/* Modal Footer: Confirm Safe / Cancel SOS */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center space-x-2.5">
          <button
            onClick={onMinimize}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition text-center cursor-pointer"
          >
            Thu nhỏ
          </button>
          <button
            onClick={onDismissSOS}
            className="flex-[2] py-2.5 bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Xác nhận an toàn • Tắt báo động</span>
          </button>
        </div>
      </div>
    </div>
  );
};
