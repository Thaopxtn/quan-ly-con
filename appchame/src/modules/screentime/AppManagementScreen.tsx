import React, { useState } from 'react';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Sliders,
  Search,
  Lock,
  Unlock
} from 'lucide-react';
import { useAppState } from '@shared/store';

interface AppManagementScreenProps {
  onBack: () => void;
}

export const AppManagementScreen: React.FC<AppManagementScreenProps> = ({ onBack }) => {
  const { state, toggleAppStatus, setAppDailyLimit } = useAppState();
  const { apps } = state;
  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppForLimit, setSelectedAppForLimit] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState(30);

  const filteredApps = apps.filter((app) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'allowed' && app.status === 'allowed') ||
      (filter === 'blocked' && app.status === 'blocked');
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getAppBg = (name: string) => {
    if (name.includes('YouTube')) return 'bg-rose-500 text-white';
    if (name.includes('TikTok')) return 'bg-black text-white';
    if (name.includes('Zalo')) return 'bg-blue-500 text-white';
    if (name.includes('Facebook')) return 'bg-blue-600 text-white';
    if (name.includes('Messenger')) return 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white';
    if (name.includes('Chrome')) return 'bg-emerald-500 text-white';
    if (name.includes('Game')) return 'bg-purple-600 text-white';
    return 'bg-pink-600 text-white';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Quản lý ứng dụng</h2>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 pb-2">
        <div className="bg-slate-200/70 p-1 rounded-2xl flex">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('allowed')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              filter === 'allowed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã cho phép
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              filter === 'blocked' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bị chặn
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm ứng dụng..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Apps List */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-soft divide-y divide-slate-100">
          {filteredApps.map((app) => {
            const isAllowed = app.status === 'allowed';
            return (
              <div key={app.id} className="p-2.5 flex items-center justify-between group">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${getAppBg(
                      app.name
                    )}`}
                  >
                    {app.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{app.name}</h4>
                    <p className="text-[10px] text-slate-400">
                      Đã dùng {app.timeUsedMinutes}p • Giới hạn {app.dailyLimitMinutes || 'Không'}p
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {/* Toggle Button */}
                  <button
                    onClick={() => toggleAppStatus(app.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1 transition active:scale-95 ${
                      isAllowed
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {isAllowed ? (
                      <>
                        <Unlock size={12} />
                        <span>Được phép</span>
                      </>
                    ) : (
                      <>
                        <Lock size={12} />
                        <span>Bị chặn</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAppForLimit(app.id);
                      setTempLimit(app.dailyLimitMinutes || 30);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    title="Đặt thời gian"
                  >
                    <Sliders size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Set limit modal */}
      {selectedAppForLimit && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Giới hạn sử dụng:{' '}
              {apps.find((a) => a.id === selectedAppForLimit)?.name}
            </h3>
            <p className="text-xs text-slate-500">Đặt thời gian tối đa mỗi ngày cho ứng dụng này.</p>
            <div className="text-center p-4 bg-blue-50 rounded-2xl">
              <span className="text-2xl font-black text-blue-700">{tempLimit} phút</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="10"
              value={tempLimit}
              onChange={(e) => setTempLimit(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setSelectedAppForLimit(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setAppDailyLimit(selectedAppForLimit, tempLimit);
                  setSelectedAppForLimit(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Lưu giới hạn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
