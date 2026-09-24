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
  Plus,
  MessageCircle,
  KeyRound,
  Monitor,
  Smartphone,
  Lock,
  Unlock,
  Loader2
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';
import { UnifiedChildHub } from '../../components/UnifiedChildHub';
import { EmptyState } from '@shared/components/EmptyState';
import { haptics } from '@shared/utils/haptics';
import { CreateNotificationModal } from '../../components/CreateNotificationModal';
import { FamilyChatModal } from '../../../../shared/components/FamilyChatModal';
import { PairChildDeviceModal } from '../../components/PairChildDeviceModal';

interface DashboardScreenProps {
  onNavigate: (screenKey: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { state, markChatAlertsAsRead, switchChild, unlockChildDeviceNow, extendChildTimeNow } = useAppState();
  const { child, alerts, children, selectedChildId } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || children?.[0] || child;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);

  // Anti-spam quick action states
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null);
  const [quickActionCooldown, setQuickActionCooldown] = useState<number>(0);

  const isTargetChildLocked = Boolean(
    currentChild?.isLocked ||
    state.childSettings?.[currentChild?.id]?.isLocked ||
    (currentChild?.id === selectedChildId && state.lockChallenge?.isLocked)
  );

  const lockReasonTitle =
    currentChild?.lockTitle ||
    state.childSettings?.[currentChild?.id]?.lockTitle ||
    (currentChild?.id === selectedChildId ? state.lockChallenge?.title : '') ||
    'Thiết bị đang bị khóa từ xa';

  const lockReasonType =
    currentChild?.lockType ||
    state.childSettings?.[currentChild?.id]?.lockType ||
    (currentChild?.id === selectedChildId ? state.lockChallenge?.lockType : '') ||
    'instant';

  const handleQuickUnlock = () => {
    if (quickActionCooldown > 0) return;
    haptics.medium();
    setQuickActionLoading('unlock');
    setQuickActionCooldown(3);
    unlockChildDeviceNow(currentChild?.id);
    const interval = setInterval(() => {
      setQuickActionCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setQuickActionLoading(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleQuickExtend = () => {
    if (quickActionCooldown > 0) return;
    haptics.success();
    setQuickActionLoading('extend');
    setQuickActionCooldown(3);
    extendChildTimeNow(15, currentChild?.id);
    const interval = setInterval(() => {
      setQuickActionCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setQuickActionLoading(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const currentParent = getCurrentParentAccount();
  const parentName = currentParent?.displayName || 'Phụ huynh';
  const parentAvatar = currentParent?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80';

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;
  const unreadChatCount = alerts.filter((a) => !a.isRead && (a.id.startsWith('chat_') || a.type === 'parent_message')).length;

  const quickShortcuts = [
    { id: 'tracking', label: 'Vị trí & An toàn', icon: MapPin, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'screentime', label: 'Thời gian dùng', icon: Clock, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    { id: 'remote', label: 'Điều khiển máy', icon: Smartphone, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    { id: 'learning', label: 'Học tập', icon: BookOpen, color: 'bg-sky-50 text-sky-600 border-sky-100' },
    { id: 'health', label: 'Sức khỏe', icon: HeartPulse, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { id: 'content', label: 'Nội dung web', icon: Shield, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'apps', label: 'Quản lý app', icon: LayoutGrid, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { id: 'ai', label: 'Trợ lý AI', icon: Bot, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { id: 'settings', label: 'Cài đặt', icon: Settings, color: 'bg-slate-50 text-slate-600 border-slate-100' },
  ];

  return (
    <div className="flex-1 p-3.5 space-y-3.5 select-none pb-6">
      {/* Sleek Compact Integrated Top Header */}
      <div className="flex items-center justify-between pt-0.5">
        {/* Left: Parent Avatar & Compact Info */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={parentAvatar}
              alt={parentName}
              className="w-9 h-9 rounded-xl border border-white shadow-xs object-cover ring-1 ring-slate-200"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-xs font-black text-slate-900 leading-tight truncate">
                {parentName}
              </h2>
              <span className="px-1 py-0.2 bg-blue-50 text-blue-700 text-[8.5px] font-black rounded border border-blue-100/80 uppercase">
                PRO
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
              <span>Đang quản lý:</span>
              <strong className="text-blue-700 font-bold">{currentChild?.name || 'Bé'}</strong>
            </p>
          </div>
        </div>

        {/* Right: Unified Action Icon Cluster (Chat, Bell, Quick Message, Pair) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* 1. Chat with Child Button with Live Unread Badge */}
          <button
            type="button"
            onClick={() => {
              markChatAlertsAsRead(currentChild?.id);
              setShowChatModal(true);
            }}
            className="relative w-9 h-9 rounded-xl bg-white hover:bg-blue-50/80 border border-slate-200/80 text-slate-700 hover:text-blue-600 shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title={`Nhắn tin trò chuyện với ${currentChild?.name || 'bé'}`}
          >
            <MessageCircle size={18} strokeWidth={2} className={unreadChatCount > 0 ? 'text-blue-600' : ''} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[9.5px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-bounce">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* 2. Notification / Alerts Bell */}
          <button
            type="button"
            onClick={() => onNavigate('alerts')}
            className="relative w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 hover:text-blue-600 shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Cảnh báo & Thông báo"
          >
            <Bell size={17} strokeWidth={2} />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {/* 3. Fast Create Notification / Message to Kid */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-blue-500/25 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Tạo & gửi lời dặn / thông báo tới con"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>

          {/* 4. Quick Pair Child Device */}
          <button
            type="button"
            onClick={() => setShowPairModal(true)}
            className="w-9 h-9 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/70 shadow-2xs flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Ghép đôi thiết bị con cái (Mã 6 số)"
          >
            <KeyRound size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 🚨 REAL-TIME LOCK WARNING BANNER (Phản ánh thực tế khi điện thoại con đang bị khóa) */}
      {isTargetChildLocked && (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white shadow-lg border-2 border-rose-300/40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse ring-2 ring-white/30">
                <Lock size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black uppercase tracking-wider shadow-xs">
                    🔒 ĐANG KHÓA MÁY THỰC TẾ
                  </span>
                  <span className="text-[10px] font-bold text-rose-100">
                    • {currentChild?.name || 'Bé'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-1 leading-snug line-clamp-2">
                  {lockReasonTitle}
                </h4>
                <p className="text-[10.5px] text-rose-100/90 mt-0.5">
                  {lockReasonType === 'mealtime'
                    ? 'Đang khóa theo lịch giờ cơm gia đình 🍽️'
                    : lockReasonType === 'bedtime'
                    ? 'Đang khóa theo lịch giờ đi ngủ 🌙'
                    : lockReasonType === 'screentime'
                    ? 'Đã dùng hết thời gian màn hình trong ngày ⏱️'
                    : 'Thiết bị của con hiện đang ở trạng thái khóa.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons with Anti-Spam Cooldown */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/20">
            <button
              type="button"
              disabled={quickActionCooldown > 0}
              onClick={handleQuickUnlock}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer ${
                quickActionCooldown > 0
                  ? 'bg-white/40 text-slate-700 cursor-not-allowed'
                  : 'bg-white text-rose-700 hover:bg-rose-50 active:scale-95'
              }`}
            >
              {quickActionLoading === 'unlock' ? (
                <>
                  <Loader2 size={14} className="animate-spin text-rose-600" />
                  <span>Chờ {quickActionCooldown}s...</span>
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  <span>Mở khóa ngay</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={quickActionCooldown > 0}
              onClick={handleQuickExtend}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer ${
                quickActionCooldown > 0
                  ? 'bg-white/40 text-slate-700 cursor-not-allowed'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95'
              }`}
            >
              {quickActionLoading === 'extend' ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-900" />
                  <span>Chờ {quickActionCooldown}s...</span>
                </>
              ) : (
                <>
                  <Clock size={14} />
                  <span>Gia hạn +15p</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Unified Modern Family & Multi-Child Hub */}
      <UnifiedChildHub onNavigate={onNavigate} />

      {/* Remote Phone Control Banner Card */}
      <div
        onClick={() => onNavigate('remote')}
        className="p-3.5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-between gap-3 border border-blue-400/30 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 border border-white/20 group-hover:scale-105 transition">
            <Smartphone size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black tracking-wide uppercase">📱 Điều Khiển Điện Thoại Con</h4>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[9px] font-black uppercase">
                Trực Tiếp
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium truncate mt-0.5">
              Khóa điện thoại từ xa, rung chuông tìm máy, chế độ Kiosk & quản lý phần cứng
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:translate-x-0.5 transition">
          <ChevronRight size={18} />
        </div>
      </div>

      {/* 4 Clean Strategic Feature Hub Cards (2x2 Grid) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <h4 className="text-xs font-black text-slate-800 tracking-tight uppercase">
            Tính Năng Quản Lý Nổi Bật
          </h4>
          <span className="text-[10px] text-slate-400 font-semibold">Chạm để mở</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Vị trí GPS & Vùng an toàn */}
          <div
            onClick={() => onNavigate('tracking')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-200 transition-all cursor-pointer active:scale-98 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition">
                <MapPin size={20} />
              </div>
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Trực tiếp
              </span>
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition">
                Định Vị & Bản Đồ
              </h5>
              <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5">
                Vị trí GPS thời gian thực, vùng an toàn trường học & nhà
              </p>
            </div>
          </div>

          {/* Card 2: Quản lý ứng dụng & Web */}
          <div
            onClick={() => onNavigate('apps')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-purple-200 transition-all cursor-pointer active:scale-98 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition">
                <LayoutGrid size={20} />
              </div>
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Bảo vệ
              </span>
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900 group-hover:text-purple-600 transition">
                Ứng Dụng & Web
              </h5>
              <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5">
                Giới hạn TikTok, Youtube, game & lọc nội dung độc hại
              </p>
            </div>
          </div>

          {/* Card 3: Lịch trình 24H & Giờ ngủ */}
          <div
            onClick={() => onNavigate('screentime')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer active:scale-98 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition">
                <Clock size={20} />
              </div>
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tự động
              </span>
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition">
                Lịch Biểu & Giờ Ngủ
              </h5>
              <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5">
                Tự động khóa máy giờ ăn cơm và khóa màn hình khi đi ngủ
              </p>
            </div>
          </div>

          {/* Card 4: Trợ lý AI Gia Đình */}
          <div
            onClick={() => onNavigate('ai')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer active:scale-98 group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition">
                <Bot size={20} />
              </div>
              <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                AI Smart
              </span>
            </div>
            <div>
              <h5 className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition">
                Trợ Lý AI Gia Đình
              </h5>
              <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5">
                Tư vấn phương pháp nuôi dạy con & gợi ý an toàn số
              </p>
            </div>
          </div>
        </div>
      </div>

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

      {/* Modal Trò Chuyện Gia Đình 2 Chiều */}
      {showChatModal && (
        <FamilyChatModal
          currentRole="parent"
          childId={currentChild?.id || 'child_1'}
          childName={currentChild?.name || 'Bé'}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* Modal Ghép Đôi Thiết Bị Con */}
      {showPairModal && (
        <PairChildDeviceModal
          onClose={() => setShowPairModal(false)}
          onSuccess={(cid, cname) => {
            if (cid) switchChild(cid);
            setShowPairModal(false);
          }}
        />
      )}
    </div>
  );
};
