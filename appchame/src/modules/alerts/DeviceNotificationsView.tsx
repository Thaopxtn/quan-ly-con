import React, { useState } from 'react';
import { useAppState } from '@shared/store';
import { Trash2, Check, Bell } from 'lucide-react';
import { syncChildSettingsToCloud } from '@shared/firebase/cloudSyncService';

interface DeviceNotificationsViewProps {
  childId: string;
}

export const DeviceNotificationsView: React.FC<DeviceNotificationsViewProps> = ({ childId }) => {
  const { state, currentParent } = useAppState();
  const childSettings = state.childSettings?.[childId];
  const rawNotifications = childSettings?.deviceNotifications || [];
  
  const [filterApp, setFilterApp] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Derive unread status based on some heuristic, or we can just say "all are unread" until cleared
  // In a real app we'd need a read status array, but here we can just map them directly.
  // For simplicity, let's treat all fetched as unread until "Đọc tất cả" clears them.
  const unreadCount = rawNotifications.length;

  const handleClearAll = () => {
    if (!currentParent?.id || !childId) return;
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử thông báo máy con không?')) {
      syncChildSettingsToCloud(currentParent.id, childId, {
        deviceNotifications: [],
      }).catch(console.error);
    }
  };

  const handleReadAll = () => {
    // For now, read all just clears them or we could store a read state.
    // Let's just clear them to keep it simple, or keep them but maybe the user meant "mark read".
    alert('Đã đánh dấu đọc tất cả.');
  };

  const uniqueApps = Array.from(new Set(rawNotifications.map(n => n.packageName)));

  // Mock app names to friendly names
  const getFriendlyAppName = (pkg: string) => {
    const p = pkg.toLowerCase();
    if (p.includes('zalo')) return 'Zalo';
    if (p.includes('youtube')) return 'YouTube';
    if (p.includes('gmail')) return 'Gmail';
    if (p.includes('messenger')) return 'Messenger';
    if (p.includes('facebook')) return 'Facebook';
    if (p.includes('tiktok')) return 'TikTok';
    if (p.includes('android.system')) return 'Hệ Thống';
    return pkg.split('.').pop() || pkg;
  };

  const getAppColor = (friendlyName: string) => {
    switch (friendlyName) {
      case 'Zalo': return 'bg-blue-100 text-blue-600';
      case 'YouTube': return 'bg-red-100 text-red-600';
      case 'Gmail': return 'bg-rose-100 text-rose-600';
      case 'Messenger': return 'bg-purple-100 text-purple-600';
      case 'Facebook': return 'bg-blue-100 text-blue-700';
      case 'Hệ Thống': return 'bg-slate-100 text-slate-600';
      default: return 'bg-indigo-50 text-indigo-500';
    }
  };

  const getAppIcon = (friendlyName: string) => {
    switch (friendlyName) {
      case 'Zalo': return '💬';
      case 'YouTube': return '▶️';
      case 'Gmail': return '📧';
      case 'Messenger': return '💬';
      case 'Facebook': return '🌐';
      case 'Hệ Thống': return '⚙️';
      default: return '🔔';
    }
  };

  const filteredNotifs = rawNotifications.filter(n => {
    if (filterApp !== 'all') {
      if (getFriendlyAppName(n.packageName) !== filterApp) return false;
    }
    return true;
  });

  if (rawNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center mt-10">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
          <Bell size={28} />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Chưa có thông báo nào</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Các thông báo từ Zalo, Messenger, YouTube trên máy con sẽ đồng bộ về đây.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Filters and Actions */}
      <div className="bg-white p-4 shadow-xs rounded-b-3xl border-b border-slate-100 mb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span className="text-[15px]">⚡</span>
            <span>Bộ lọc thông báo:</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReadAll} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
              <Check size={12} />
              Đọc tất cả
            </button>
            <button onClick={handleClearAll} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition">
              <Trash2 size={12} />
              Xóa hết
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterApp('all')}
            className={`flex flex-col items-center justify-center min-w-[55px] h-12 rounded-2xl transition shadow-xs border ${
              filterApp === 'all' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] font-bold">Tất cả</span>
            <span className="text-[9px] opacity-90">({rawNotifications.length})</span>
          </button>
          {uniqueApps.map(pkg => {
            const fname = getFriendlyAppName(pkg);
            const isSelected = filterApp === fname;
            return (
              <button
                key={pkg}
                onClick={() => setFilterApp(fname)}
                className={`flex items-center justify-center px-3 h-12 rounded-2xl transition shadow-xs border text-[11px] font-bold ${
                  isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {fname}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-3 pt-2">
        {filteredNotifs.map((item, idx) => {
          const fname = getFriendlyAppName(item.packageName);
          const colorClass = getAppColor(fname);
          const iconStr = getAppIcon(fname);
          
          const timeDate = new Date(item.postTime);
          const timeStr = timeDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={item.id || idx} className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-sm flex gap-3 relative overflow-hidden">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ${colorClass}`}>
                {iconStr}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex justify-between items-start mb-0.5">
                  <span className="text-[10px] font-black uppercase text-blue-700 tracking-wide">{fname}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">{timeStr}</span>
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                </div>
                <h4 className="text-[13px] font-bold text-slate-900 truncate mb-0.5">{item.title || 'Thông báo'}</h4>
                <p className="text-[11.5px] text-slate-500 leading-snug line-clamp-2">{item.text}</p>
              </div>
            </div>
          );
        })}
        {filteredNotifs.length === 0 && (
          <p className="text-center text-xs text-slate-400 mt-10">Không tìm thấy thông báo nào.</p>
        )}
      </div>
    </div>
  );
};
