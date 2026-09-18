import React, { useState } from 'react';
import {
  Bell,
  MapPin,
  Clock,
  BookOpen,
  HeartPulse,
  Shield,
  LayoutGrid,
  Bot,
  Settings,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Battery,
  ShieldAlert,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';
import { UnifiedChildHub } from '../../components/UnifiedChildHub';
import { EmptyState } from '@shared/components/EmptyState';
import { haptics } from '@shared/utils/haptics';
import { CreateNotificationModal } from '../../components/CreateNotificationModal';

interface DashboardScreenProps {
  onNavigate: (screenKey: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { state } = useAppState();
  const { child, alerts } = state;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const currentParent = getCurrentParentAccount();
  const parentName = currentParent?.displayName || 'Phụ huynh';
  const parentAvatar = currentParent?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80';

  const quickShortcuts = [
    { id: 'tracking', label: 'Vị trí & An toàn', icon: MapPin, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'screentime', label: 'Thời gian dùng', icon: Clock, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { id: 'learning', label: 'Học tập', icon: BookOpen, color: 'bg-sky-50 text-sky-600 border-sky-100' },
    { id: 'health', label: 'Sức khỏe', icon: HeartPulse, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { id: 'content', label: 'Nội dung web', icon: Shield, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'apps', label: 'Quản lý app', icon: LayoutGrid, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'ai', label: 'Trợ lý AI', icon: Bot, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, color: 'bg-slate-50 text-slate-600 border-slate-100' },
  ];

  return (
    <div className="flex-1 p-4 space-y-4 select-none pb-6">
      {/* Top Greeting Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={parentAvatar}
              alt={parentName}
              className="w-11 h-11 rounded-2xl border-2 border-white shadow-md object-cover ring-2 ring-slate-100"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Phụ huynh</span>
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-black rounded-md border border-blue-100">
                PRO
              </span>
            </div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {parentName} 👋
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Tạo thông báo</span>
          </button>

          <button
            onClick={() => onNavigate('alerts')}
            className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:text-blue-600 active:scale-90 transition-all cursor-pointer"
          >
            <Bell size={18} strokeWidth={2} />
            {alerts.some((a) => !a.isRead) && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-subtle-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {/* Unified Modern Family & Multi-Child Hub */}
      <UnifiedChildHub onNavigate={onNavigate} />

      {/* Remote Control & Live Monitor Special Quick Launcher Banner */}
      <div
        onClick={() => onNavigate('remote')}
        className="bg-blue-600 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-3xl p-4 text-white shadow-lg shadow-blue-500/20 flex items-center justify-between cursor-pointer hover:shadow-xl transition-all active:scale-[0.985] group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl group-hover:scale-110 transition duration-200 shadow-inner">
            🎛️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-black tracking-tight text-white">Trung Tâm Điều Khiển & Giám Sát</h4>
              <span className="px-1.5 py-0.5 bg-amber-400 text-amber-950 font-black text-[9px] rounded-md uppercase tracking-wider shadow-xs">
                Realtime
              </span>
            </div>
            <p className="text-[10.5px] text-blue-100 font-medium mt-0.5">
              Khóa tức thì, Kiosk, Âm lượng, Báo thức, Chế độ giờ học
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-white/80 group-hover:translate-x-1 transition" />
      </div>

      {/* 8 Quick Action Buttons - Executive Grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {quickShortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                haptics.light();
                onNavigate(item.id);
              }}
              className="flex flex-col items-center p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-200 transition-all active:scale-92 text-center group cursor-pointer btn-press"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-2xs ${item.color} group-hover:scale-108 transition-all duration-200`}>
                <Icon size={20} strokeWidth={2} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-800 leading-tight line-clamp-2">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Motivation or Welcome Card */}
      {state.children.length === 0 ? (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 rounded-3xl p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles size={20} className="fill-blue-400/30" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-blue-950">Chào mừng bạn đến với ParentPro! 🎉</h4>
            <p className="text-[11px] text-blue-800/80 mt-0.5 font-medium">Bắt đầu bằng cách ghép đôi thiết bị của con để bảo vệ gia đình.</p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/80 rounded-3xl p-3.5 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles size={20} className="animate-spin-slow fill-amber-400/30" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-950">Hôm nay con hoàn thành mục tiêu rất tốt! 🎉</h4>
            <p className="text-[11px] text-amber-800/80 mt-0.5 font-medium">Bố mẹ nhớ khen ngợi và thưởng sao động viên con nhé!</p>
          </div>
        </div>
      )}

      {/* Recent Activities Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">Hoạt động mới nhất</h4>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 active:scale-95 transition cursor-pointer"
          >
            Xem tất cả ➔
          </button>
        </div>

        <div className="bg-white rounded-3xl p-2 shadow-xs border border-slate-200/70 divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck size={28} className="text-emerald-500" />}
              title="Tất cả an toàn và bình yên! ✨"
              description="Hiện không có cảnh báo khẩn cấp nào từ thiết bị của con."
              className="py-6 border-0 shadow-none bg-transparent"
            />
          ) : (
            alerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="p-2.5 flex items-start space-x-3 hover:bg-slate-50/60 rounded-2xl transition">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                  alert.type === 'sos' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  alert.type === 'battery' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  alert.type === 'location' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {alert.type === 'sos' ? <ShieldAlert size={16} /> :
                   alert.type === 'battery' ? <Battery size={16} /> :
                   alert.type === 'location' ? <MapPin size={16} /> :
                   <CheckCircle2 size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{alert.title}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{alert.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">{alert.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Tạo Thông Báo Nhanh */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
