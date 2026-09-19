import React, { useState } from 'react';
import {
  ChevronLeft,
  Bell,
  PhoneCall,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  ExternalLink,
  Video,
  ShieldCheck,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { makePhoneCall } from '@shared/utils/phoneCall';

interface SosMonitorScreenProps {
  onBack: () => void;
  onNavigate?: (screenKey: string) => void;
}

const EMERGENCY_CONTACTS = [
  { name: 'Tổng đài Quốc gia Bảo vệ Trẻ em', number: '111', type: 'helpline', desc: 'Miễn phí 24/7 bảo vệ & tư vấn trẻ em' },
  { name: 'Cảnh sát Phản ứng nhanh', number: '113', type: 'police', desc: 'Trực ban công an khẩn cấp' },
  { name: 'Cứu thương & Cấp cứu y tế', number: '115', type: 'ambulance', desc: 'Cấp cứu y tế lưu động' },
  { name: 'Cứu nạn & Cứu hỏa', number: '114', type: 'fire', desc: 'Cứu hỏa & cứu hộ cứu nạn' },
];

export const SosMonitorScreen: React.FC<SosMonitorScreenProps> = ({ onBack, onNavigate }) => {
  const { state, cancelSOS } = useAppState();
  const { activeSOS, sosDetails, child, children, selectedChildId } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || child;

  const lat = sosDetails?.lat || currentChild.lat || 10.7769;
  const lng = sosDetails?.lng || currentChild.lng || 106.7009;
  const address = sosDetails?.address || currentChild.currentAddress || 'Đang xác định vị trí...';
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-rose-950/90 to-slate-950 text-white select-none relative overflow-y-auto">
      {/* Background Animated Concentric Pulsing Waves */}
      {activeSOS && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-80 h-80 rounded-full border border-rose-500/20 animate-ping duration-1000"></div>
          <div className="w-64 h-64 rounded-full border border-rose-500/30 animate-pulse"></div>
          <div className="w-48 h-48 rounded-full bg-rose-600/10 blur-xl"></div>
        </div>
      )}

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between pb-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition backdrop-blur-md cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-xs font-extrabold uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
          {activeSOS ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span>CẢNH BÁO SOS ĐANG KÍCH HOẠT</span>
            </>
          ) : (
            <span>TRUNG TÂM CỨU HỘ KHẨN CẤP</span>
          )}
        </span>
        <div className="w-9"></div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start text-center space-y-4 py-2">
        {/* Pulsing SOS Bell / Icon */}
        <div className="relative my-2">
          <div
            className={`absolute -inset-4 rounded-full blur-xl ${
              activeSOS ? 'bg-rose-600/50 animate-pulse' : 'bg-emerald-600/20'
            }`}
          ></div>
          <div
            className={`relative w-28 h-28 rounded-full shadow-emergency flex items-center justify-center border-4 ${
              activeSOS
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 border-rose-300/40 animate-pulse'
                : 'bg-gradient-to-tr from-slate-800 to-slate-700 border-slate-600'
            }`}
          >
            {activeSOS ? (
              <Bell size={52} className="text-white fill-white animate-bounce" />
            ) : (
              <ShieldCheck size={52} className="text-emerald-400" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {activeSOS ? 'Tín Hiệu Cấp Cứu Khẩn Cấp' : 'Trạng Thái: Gia Đình An Toàn'}
          </h1>
          <p className="text-xs text-rose-200/80 max-w-xs mx-auto mt-1 leading-relaxed">
            {activeSOS
              ? `🚨 ${currentChild.name.toUpperCase()} ĐÃ NHẤN NÚT SOS LÚC ${
                  sosDetails?.time || 'VỪA XONG'
                }! Vui lòng kiểm tra và liên lạc ngay.`
              : 'Tất cả thiết bị của các con đang hoạt động bình thường và an toàn.'}
          </p>
        </div>

        {/* SOS Location Card */}
        {activeSOS && (
          <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-rose-500/50 text-left w-full max-w-sm space-y-2.5">
            <div className="flex items-center justify-between text-rose-300 text-xs font-bold">
              <div className="flex items-center space-x-1.5">
                <MapPin size={16} className="text-red-400" />
                <span>Vị trí khẩn cấp của con:</span>
              </div>
              <span className="text-[10px] text-slate-300 font-mono">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>

            <p className="text-xs text-white font-medium bg-black/30 p-2.5 rounded-xl border border-white/10">
              {address}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98]"
              >
                <Navigation size={15} />
                <span>Chỉ đường Maps</span>
              </a>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('remote')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Video size={15} />
                  <span>Bật Camera Live</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Direct Emergency Call List */}
        <div className="w-full max-w-sm text-left space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Liên lạc khẩn cấp 1 chạm:
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Sẵn sàng 24/7</span>
          </div>

          <div className="space-y-1.5">
            {/* Call Child's Device */}
            <button
              type="button"
              onClick={() => makePhoneCall(currentChild.phone || '0987654321')}
              className="w-full p-3 bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-900/50 rounded-2xl flex items-center justify-between text-white transition active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <PhoneCall size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Gọi máy con: {currentChild.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                      Ưu tiên 1
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-300 font-mono">{currentChild.phone || '0987 654 321'}</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold shrink-0">
                Gọi ngay
              </span>
            </button>

            {/* National Hotlines */}
            {EMERGENCY_CONTACTS.map((c) => (
              <button
                key={c.number}
                type="button"
                onClick={() => makePhoneCall(c.number)}
                className="w-full p-2.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between text-white transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black text-xs shrink-0">
                    {c.number}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{c.name}</h4>
                    <p className="text-[10px] text-slate-400">{c.desc}</p>
                  </div>
                </div>
                <span className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 shrink-0">
                  <PhoneCall size={12} />
                  <span>Gọi {c.number}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="relative z-10 space-y-2 pt-3">
        {activeSOS ? (
          <button
            onClick={() => cancelSOS()}
            className="w-full py-3.5 bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 size={18} />
            <span>Xác nhận đã an toàn • Tắt báo động</span>
          </button>
        ) : (
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              💡 Bố mẹ có thể kích hoạt thử tín hiệu cứu hộ từ nút SOS trên máy con để kiểm tra âm lượng còi hú và định vị GPS.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
