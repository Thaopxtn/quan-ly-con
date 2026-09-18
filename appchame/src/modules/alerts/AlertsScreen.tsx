import React, { useState } from 'react';
import {
  ChevronLeft,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  BatteryCharging,
  Clock,
  Trash2,
  ShieldAlert,
  Check,
  Plus,
  Bell,
  Star,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { CreateNotificationModal } from '../../components/CreateNotificationModal';

interface AlertsScreenProps {
  onBack: () => void;
  onNavigate?: (screenKey: string) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onBack, onNavigate }) => {
  const { state, markAlertAsRead, clearAllAlerts } = useAppState();
  const { alerts, selectedChildId, children, child } = state;
  const [filter, setFilter] = useState<'all' | 'messages' | 'location' | 'study' | 'device'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'all') return true;
    if (filter === 'messages') {
      return (
        alert.type === 'parent_message' ||
        alert.type === 'reminder' ||
        alert.type === 'reward' ||
        Boolean(alert.kidResponse)
      );
    }
    if (filter === 'location') return alert.type === 'location' || alert.type === 'sos';
    if (filter === 'study') return alert.type === 'study' || alert.type === 'reward';
    if (filter === 'device') return alert.type === 'battery' || alert.type === 'device';
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const getAlertIcon = (type: string, priority: string, imageUrl?: string) => {
    if (imageUrl && imageUrl.length <= 4) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shrink-0 shadow-xs text-xl">
          {imageUrl}
        </div>
      );
    }
    if (type === 'sos') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/30 animate-pulse">
          <ShieldAlert size={20} />
        </div>
      );
    }
    if (type === 'location') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
          <MapPin size={20} />
        </div>
      );
    }
    if (type === 'study') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 size={20} />
        </div>
      );
    }
    if (type === 'reward') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
          <Star size={20} className="fill-amber-400 text-amber-500" />
        </div>
      );
    }
    if (type === 'battery') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
          <BatteryCharging size={20} />
        </div>
      );
    }
    if (type === 'parent_message' || type === 'reminder') {
      return (
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
          <MessageSquare size={20} />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 shadow-xs">
        <Clock size={20} />
      </div>
    );
  };

  return (
    <div className="relative flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 select-none pb-8 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black text-slate-900 dark:text-white">Trung Tâm Thông Báo</h2>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-black animate-pulse">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Quản lý cảnh báo & gửi thông báo nhắc nhở đến con
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Nút Tạo Thông Báo Mới */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/25 active:scale-95 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Tạo thông báo</span>
          </button>

          {alerts.length > 0 && (
            <button
              onClick={clearAllAlerts}
              title="Xóa tất cả thông báo"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center transition cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 pb-2">
        <div className="bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl flex gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất cả ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('messages')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center justify-center gap-1 ${
              filter === 'messages'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>💬 Lời dặn</span>
          </button>
          <button
            onClick={() => setFilter('location')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center justify-center gap-1 ${
              filter === 'location'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>📍 Vị trí</span>
          </button>
          <button
            onClick={() => setFilter('study')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center justify-center gap-1 ${
              filter === 'study'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>📚 Học tập</span>
          </button>
          <button
            onClick={() => setFilter('device')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center justify-center gap-1 ${
              filter === 'device'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>🔋 Thiết bị</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 px-4 space-y-3 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-3 bg-white dark:bg-slate-800/60 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 mt-2 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-500 mx-auto flex items-center justify-center text-3xl">
              🔔
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Không có thông báo nào</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {filter === 'all'
                  ? 'Hiện chưa có cảnh báo hoặc lời dặn nào. Bạn có thể bấm nút "Tạo thông báo" bên dưới để gửi lời nhắc cho con.'
                  : 'Không có thông báo nào trong danh mục này.'}
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Tạo thông báo gửi con</span>
            </button>
          </div>
        ) : (
          filteredAlerts.map((item) => (
            <div
              key={item.id}
              onClick={() => markAlertAsRead(item.id)}
              className={`rounded-3xl p-3.5 border transition cursor-pointer flex flex-col gap-2.5 ${
                item.isRead
                  ? 'bg-white/90 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  : 'bg-white dark:bg-slate-800 border-blue-200/90 dark:border-blue-700/80 shadow-md shadow-blue-500/5 ring-1 ring-blue-50 dark:ring-blue-900/20'
              }`}
            >
              <div className="flex items-start space-x-3">
                {getAlertIcon(item.type, item.priority, item.imageUrl)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4
                        className={`text-xs truncate ${
                          item.isRead
                            ? 'font-bold text-slate-700 dark:text-slate-200'
                            : 'font-black text-slate-900 dark:text-white'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.childName && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold shrink-0">
                          {item.childName}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2 font-medium">{item.time}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  {/* Bonus Stars Badge */}
                  {item.bonusStars && item.bonusStars > 0 && (
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-black">
                      <Star size={11} className="fill-amber-400 text-amber-500" />
                      <span>Đã tặng +{item.bonusStars} sao thưởng</span>
                    </div>
                  )}

                  {/* Kid's Feedback Response Badge */}
                  {item.kidResponse && (
                    <div className="mt-2 p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Bé đã phản hồi: &quot;{item.kidResponse}&quot;</span>
                      </div>
                      {item.kidResponseTime && (
                        <span className="text-[10px] text-emerald-600/70 font-medium">
                          {item.kidResponseTime}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!item.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5 ring-2 ring-blue-100 dark:ring-blue-900" />
                )}
              </div>

              {/* Action shortcuts if location or study */}
              {(item.type === 'location' || item.type === 'sos') && onNavigate && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('tracking');
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem vị trí trực tiếp</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button (FAB) for Quick Notification Creation */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-20 right-4 sm:right-6 z-30 w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/35 flex items-center justify-center active:scale-90 transition-all cursor-pointer group"
        title="Tạo thông báo mới cho con"
      >
        <Plus size={24} className="group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Modal Tạo Thông Báo */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultChildId={selectedChildId}
      />
    </div>
  );
};

export default AlertsScreen;
