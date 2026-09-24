import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Sliders,
  Search,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Star,
  ArrowUpDown,
  Filter,
  Sparkles,
  Smartphone,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { AppItem } from '@shared/types';
import { haptics } from '@shared/utils/haptics';

interface AppManagementScreenProps {
  onBack: () => void;
}

type SortMode = 'name_asc' | 'time_desc' | 'blocked_first' | 'allowed_first';

export const AppManagementScreen: React.FC<AppManagementScreenProps> = ({ onBack }) => {
  const {
    state,
    toggleAppStatus,
    setAppDailyLimit,
    toggleAppVisibility,
    toggleAppFavorite,
  } = useAppState();

  const selectedChildId = state.selectedChildId || 'bach';
  const child = state.children.find((c) => c.id === selectedChildId) || state.child;
  const childSettings = state.childSettings[selectedChildId];

  // Full list of apps for this child
  const allApps: AppItem[] = useMemo(() => {
    const raw = (childSettings?.apps && childSettings.apps.length > 0)
      ? childSettings.apps
      : (state.apps && state.apps.length > 0)
        ? state.apps
        : [];
    // Ensure all apps have required fields
    return raw.map((a) => ({
      ...a,
      category: a.category || 'other',
      dailyLimitMinutes: a.dailyLimitMinutes || 0,
      timeUsedMinutes: a.timeUsedMinutes || 0,
      status: a.status || 'allowed',
      isHidden: !!a.isHidden,
      isFavorite: !!a.isFavorite,
    }));
  }, [childSettings?.apps, state.apps]);

  const [filter, setFilter] = useState<'all' | 'allowed' | 'blocked' | 'hidden' | 'favorite'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name_asc');
  const [selectedAppForLimit, setSelectedAppForLimit] = useState<AppItem | null>(null);
  const [tempLimit, setTempLimit] = useState<number>(30);

  // Sorting & Filtering
  const filteredAndSortedApps = useMemo(() => {
    let result = allApps.filter((app) => {
      // 1. Status Filter
      if (filter === 'allowed' && app.status !== 'allowed') return false;
      if (filter === 'blocked' && app.status !== 'blocked') return false;
      if (filter === 'hidden' && !app.isHidden) return false;
      if (filter === 'favorite' && !app.isFavorite) return false;

      // 2. Category Filter
      if (categoryFilter !== 'all' && app.category !== categoryFilter) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = app.name.toLowerCase().includes(q);
        const matchesPkg = (app.packageName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPkg) return false;
      }

      return true;
    });

    // Sort: Favorites always pinned first, then by selected sortMode
    result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      switch (sortMode) {
        case 'time_desc':
          return (b.timeUsedMinutes || 0) - (a.timeUsedMinutes || 0);
        case 'blocked_first':
          if (a.status === 'blocked' && b.status !== 'blocked') return -1;
          if (a.status !== 'blocked' && b.status === 'blocked') return 1;
          return a.name.localeCompare(b.name, 'vi');
        case 'allowed_first':
          if (a.status === 'allowed' && b.status !== 'allowed') return -1;
          if (a.status !== 'allowed' && b.status === 'allowed') return 1;
          return a.name.localeCompare(b.name, 'vi');
        case 'name_asc':
        default:
          return a.name.localeCompare(b.name, 'vi');
      }
    });

    return result;
  }, [allApps, filter, categoryFilter, searchQuery, sortMode]);

  const limitPresets = [
    { label: 'Không giới hạn', value: 0 },
    { label: '15p', value: 15 },
    { label: '30p', value: 30 },
    { label: '45p', value: 45 },
    { label: '1 giờ', value: 60 },
    { label: '1.5 giờ', value: 90 },
    { label: '2 giờ', value: 120 },
    { label: '3 giờ', value: 180 },
  ];

  const getAppBg = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('youtube')) return 'bg-rose-500 text-white';
    if (n.includes('tiktok')) return 'bg-black text-white';
    if (n.includes('zalo')) return 'bg-blue-500 text-white';
    if (n.includes('facebook')) return 'bg-blue-600 text-white';
    if (n.includes('messenger')) return 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white';
    if (n.includes('chrome') || n.includes('web')) return 'bg-emerald-500 text-white';
    if (n.includes('roblox') || n.includes('game')) return 'bg-purple-600 text-white';
    if (n.includes('duolingo') || n.includes('học') || n.includes('edu')) return 'bg-amber-500 text-white';
    return 'bg-slate-700 text-white';
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-8 min-h-screen">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Quản Lý Ứng Dụng</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị của <strong>{child?.name || 'Bé'}</strong> • {allApps.length} ứng dụng
            </p>
          </div>
        </div>

        {/* Child Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
          <span>👶</span>
          <span>{child?.name || 'Bé'}</span>
        </div>
      </div>

      {/* Main Controls Area */}
      <div className="p-4 space-y-3 pb-2">
        {/* Search & Sort Row */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên ứng dụng..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Sort Dropdown Selector */}
          <div className="relative shrink-0">
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="appearance-none pl-7 pr-7 py-2 bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="name_asc">Tên A-Z</option>
              <option value="time_desc">Dùng nhiều nhất</option>
              <option value="blocked_first">Bị khóa trước</option>
              <option value="allowed_first">Được phép trước</option>
            </select>
            <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({allApps.length})
          </button>
          <button
            onClick={() => setFilter('favorite')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              filter === 'favorite'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star size={12} className="fill-amber-400 text-amber-500" />
            <span>Yêu thích ({allApps.filter((a) => a.isFavorite).length})</span>
          </button>
          <button
            onClick={() => setFilter('allowed')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              filter === 'allowed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Được phép ({allApps.filter((a) => a.status === 'allowed').length})
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              filter === 'blocked'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Đang khóa ({allApps.filter((a) => a.status === 'blocked').length})
          </button>
          <button
            onClick={() => setFilter('hidden')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              filter === 'hidden'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <EyeOff size={12} />
            <span>Đang ẩn ({allApps.filter((a) => a.isHidden).length})</span>
          </button>
        </div>
      </div>

      {/* App List Container */}
      <div className="flex-1 px-4 space-y-2.5 overflow-y-auto">
        {allApps.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-3 border border-slate-200/80 mt-2 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Smartphone size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Chưa có dữ liệu ứng dụng</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Thiết bị của {child?.name || 'con'} chưa gửi danh sách ứng dụng đã cài đặt lên hệ thống. Hãy mở ứng dụng trẻ em trên máy con để đồng bộ ứng dụng thực tế.
            </p>
          </div>
        ) : filteredAndSortedApps.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-200/80 mt-2 shadow-xs">
            <div className="text-3xl">🔍</div>
            <h4 className="text-sm font-bold text-slate-800">Không tìm thấy ứng dụng nào</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Không có ứng dụng nào khớp với điều kiện lọc & tìm kiếm hiện tại.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-2 border border-slate-200/70 shadow-xs divide-y divide-slate-100">
            {filteredAndSortedApps.map((app) => {
              const isAllowed = app.status === 'allowed';
              const isHidden = !!app.isHidden;
              const isFav = !!app.isFavorite;

              return (
                <div
                  key={app.id}
                  className={`p-3 flex items-center justify-between gap-2.5 transition rounded-2xl ${
                    isHidden ? 'bg-slate-50/70 opacity-70' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Left: Icon & Info */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* App Icon */}
                    <div className="relative shrink-0">
                      {app.icon ? (
                        <img
                          src={app.icon}
                          alt={app.name}
                          className="w-11 h-11 rounded-2xl object-contain shadow-xs border border-slate-100"
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${getAppBg(
                            app.name
                          )}`}
                        >
                          {app.name.charAt(0)}
                        </div>
                      )}
                      {isFav && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center shadow-xs">
                          <Star size={10} className="fill-amber-950" />
                        </div>
                      )}
                    </div>

                    {/* App Details */}
                    <div className="truncate flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className="text-xs font-black text-slate-900 truncate">{app.name}</h4>
                        {isHidden && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-md shrink-0">
                            Ẩn trên máy con
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        <span>Đã dùng: <strong>{app.timeUsedMinutes}p</strong></span>
                        <span>•</span>
                        <span className={app.dailyLimitMinutes ? 'text-blue-600 font-bold' : ''}>
                          Giới hạn: {app.dailyLimitMinutes ? `${app.dailyLimitMinutes}p/ngày` : 'Không'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Pin, Hide, Lock, Limit) */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {/* 1. Pin Favorite Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        toggleAppFavorite(app.id, selectedChildId);
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer active:scale-90 ${
                        isFav
                          ? 'bg-amber-50 text-amber-500 border border-amber-200'
                          : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                      }`}
                      title={isFav ? 'Bỏ ghim yêu thích' : 'Ghim yêu thích lên đầu'}
                    >
                      <Star size={15} className={isFav ? 'fill-amber-400' : ''} />
                    </button>

                    {/* 2. Hide / Show Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        toggleAppVisibility(app.id, selectedChildId);
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer active:scale-90 ${
                        isHidden
                          ? 'bg-slate-200 text-slate-800 border border-slate-300'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title={isHidden ? 'Hiện ứng dụng trên máy con' : 'Ẩn ứng dụng khỏi màn hình máy con'}
                    >
                      {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>

                    {/* 3. Daily Limit Settings Button */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSelectedAppForLimit(app);
                        setTempLimit(app.dailyLimitMinutes || 30);
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer active:scale-90 ${
                        app.dailyLimitMinutes > 0
                          ? 'bg-blue-50 text-blue-600 border border-blue-200 font-bold'
                          : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                      }`}
                      title="Đặt giới hạn thời gian mở"
                    >
                      <Sliders size={15} />
                    </button>

                    {/* 4. Lock / Unlock Primary Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.medium();
                        toggleAppStatus(app.id, selectedChildId);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition active:scale-95 cursor-pointer ${
                        isAllowed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      {isAllowed ? (
                        <>
                          <Unlock size={13} />
                          <span>Mở</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} />
                          <span>Khóa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set Daily Limit Modal */}
      {selectedAppForLimit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Giới Hạn Mở Ứng Dụng
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                    {selectedAppForLimit.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForLimit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Selected Time Display */}
            <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
              <span className="text-2xl font-black text-blue-700">
                {tempLimit === 0 ? 'Không giới hạn' : `${tempLimit} phút / ngày`}
              </span>
              <p className="text-[11px] text-blue-600 font-medium">
                {tempLimit === 0
                  ? 'Con có thể dùng ứng dụng này bất cứ lúc nào trong ngày'
                  : `Tối đa ${Math.floor(tempLimit / 60)}h ${tempLimit % 60}p mỗi ngày, hết giờ app sẽ tự khóa`}
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Mức thời gian gợi ý:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {limitPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setTempLimit(preset.value);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border active:scale-95 cursor-pointer ${
                      tempLimit === preset.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>0 phút</span>
                <span>Tùy chỉnh: {tempLimit}p</span>
                <span>180 phút (3h)</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="5"
                value={tempLimit}
                onChange={(e) => setTempLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setSelectedAppForLimit(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  haptics.success();
                  setAppDailyLimit(selectedAppForLimit.id, tempLimit, selectedChildId);
                  setSelectedAppForLimit(null);
                }}
                className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
              >
                Lưu Giới Hạn ({tempLimit ? `${tempLimit}p` : 'Mở'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
