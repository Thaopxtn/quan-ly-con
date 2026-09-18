import React, { useState } from 'react';
import {
  ChevronLeft,
  Pin,
  ExternalLink,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface KioskModeActivityProps {
  onBack: () => void;
}

export const KioskModeActivity: React.FC<KioskModeActivityProps> = ({ onBack }) => {
  const { state, setKioskMode, remoteOpenApp } = useAppState();
  const { kioskMode, apps } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'study' | 'social' | 'game'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const filteredApps = apps.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
              <span>Chế Độ Kiosk & Ghim App</span>
              {kioskMode.isEnabled && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Pin size={10} /> Đang Ghim
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Ép buộc dùng 1 ứng dụng duy nhất</p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Active Pinned Banner */}
        {kioskMode.isEnabled ? (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Pin size={20} className="text-yellow-200" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-100">Đang Ghim Cưỡng Chế</h4>
                  <p className="text-base font-extrabold">{kioskMode.pinnedAppName || 'Ứng dụng đã chọn'}</p>
                </div>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-300 animate-ping"></span>
            </div>
            <p className="text-xs text-amber-50">
              Máy con đang bị khóa cứng trong ứng dụng này. Con không thể thoát ra màn hình chính hay mở ứng dụng khác.
            </p>
            <button
              onClick={() => {
                setKioskMode(false, null, null);
                showToast('Đã hủy ghim Kiosk! Máy con đã trở lại bình thường.');
              }}
              className="w-full py-2 bg-white text-amber-700 font-bold rounded-xl text-xs shadow-xs hover:bg-amber-50 transition active:scale-95"
            >
              Hủy Ghim & Trả Lại Quyền Dùng Máy
            </button>
          </div>
        ) : (
          <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start space-x-2.5">
            <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-0.5">
              <p className="font-bold">Chế độ Kiosk Giáo Dục Thông Minh:</p>
              <p className="text-blue-700 text-[11px] leading-relaxed">
                Khi con cần học trực tuyến hoặc làm bài tập, hãy chọn <strong>"Khóa ghim Kiosk"</strong> cho app học tập.
                Con sẽ tập trung 100% vào bài học mà không bị phân tâm bởi game hay mạng xã hội!
              </p>
            </div>
          </div>
        )}

        {/* Filter & Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm ứng dụng cài trên máy con..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'study', label: '📚 Học tập' },
              { id: 'social', label: '💬 Mạng xã hội' },
              { id: 'game', label: '🎮 Trò chơi' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* App List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 px-1">Danh sách ứng dụng ({filteredApps.length}):</h3>
          {filteredApps.map((app) => {
            const isPinned = kioskMode.isEnabled && kioskMode.pinnedAppId === app.id;
            return (
              <div
                key={app.id}
                className={`p-3 bg-white rounded-2xl border transition shadow-xs flex items-center justify-between ${
                  isPinned ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm shadow-xs">
                    {app.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-xs font-bold text-slate-900">{app.name}</p>
                      {isPinned && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                          Đang ghim
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {app.category === 'study'
                        ? 'Học tập'
                        : app.category === 'social'
                        ? 'Mạng xã hội'
                        : app.category === 'game'
                        ? 'Trò chơi'
                        : 'Tiện ích'}{' '}
                      • Đã dùng {app.timeUsedMinutes}p
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      remoteOpenApp(app.id, app.name);
                      showToast(`Đã gửi lệnh mở ứng dụng ${app.name} trên máy con!`);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center space-x-1"
                  >
                    <ExternalLink size={12} />
                    <span>Mở app</span>
                  </button>

                  {isPinned ? (
                    <button
                      onClick={() => {
                        setKioskMode(false, null, null);
                        showToast('Đã gỡ ghim Kiosk!');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center space-x-1"
                    >
                      <XCircle size={12} />
                      <span>Hủy ghim</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setKioskMode(true, app.id, app.name);
                        showToast(`Đã khóa ghim cứng ứng dụng ${app.name}!`);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center space-x-1 shadow-xs"
                    >
                      <Pin size={12} />
                      <span>Khóa ghim</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
