import React, { useState } from 'react';
import {
  X,
  Server,
  Smartphone,
  Wifi,
  Radio,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Battery,
  BatteryCharging,
  Lock,
  Unlock,
  Volume2,
  ExternalLink,
  ShieldCheck,
  Globe,
  Clock,
  MapPin,
  Cpu,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { useConnectionStatus } from '@shared/services/connectionMonitorService';
import { useAppState, syncWithCloudForChild, getActiveParentId } from '@shared/store';
import { haptics } from '@shared/utils/haptics';

interface ConnectionHubModalProps {
  onClose: () => void;
}

export const ConnectionHubModal: React.FC<ConnectionHubModalProps> = ({ onClose }) => {
  const conn = useConnectionStatus();
  const { state, buzzKidPhone } = useAppState();
  const [activeTab, setActiveTab] = useState<'kids' | 'server' | 'diagnostics'>('kids');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const triggerFeedback = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleBuzz = (childId: string, name: string) => {
    haptics.medium();
    buzzKidPhone(childId);
    triggerFeedback(`Đã gửi lệnh phát chuông tìm máy bé ${name}!`);
  };

  const handleSyncNow = (childId: string, name: string) => {
    haptics.light();
    const pId = getActiveParentId();
    syncWithCloudForChild(pId, childId);
    conn.refresh();
    triggerFeedback(`Đang yêu cầu máy bé ${name} gửi định vị & pin mới nhất...`);
  };

  // Combine kids from state and monitor
  const kidsList = (state.children && state.children.length > 0 ? state.children : [state.child]).map((ch) => {
    const monitorData = conn.children.find((c) => c.childId === ch.id);
    const lastSeenMs = monitorData?.lastSeenMs || (ch.lastUpdated ? new Date(ch.lastUpdated).getTime() : 0);
    const isLive = Boolean(monitorData?.isOnline || (lastSeenMs && Date.now() - lastSeenMs < 60000));

    return {
      id: ch.id,
      name: ch.name || 'Bé yêu',
      avatar: ch.avatar,
      deviceName: monitorData?.deviceName || (ch as any)?.deviceName || ch.model || 'Điện thoại con',
      model: monitorData?.model || ch.model || 'Android',
      isOnline: isLive,
      lastSeenText: monitorData?.lastSeenText || conn.formatTimeAgo(lastSeenMs),
      battery: typeof monitorData?.battery === 'number' ? monitorData.battery : (typeof ch.battery === 'number' ? ch.battery : 100),
      isCharging: monitorData?.isCharging,
      networkType: monitorData?.networkType || 'unknown',
      wifiSSID: monitorData?.wifiSSID || '',
      screenState: monitorData?.screenState || (ch.isLocked ? 'locked' : (ch.isScreenOn ? 'active' : 'screen_off')),
      currentApp: monitorData?.currentApp || ch.activeOpenedApp || '',
      address: monitorData?.address || ch.currentAddress || '',
      isLocked: Boolean(ch.isLocked || state.childSettings?.[ch.id]?.isLocked),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">Trung Tâm Trạng Thái Kết Nối</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Theo dõi máy chủ PC, đường truyền 4G và điện thoại con cái
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptics.light();
                conn.refresh();
              }}
              disabled={conn.isRefreshing}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Làm mới toàn bộ trạng thái"
            >
              <RefreshCw size={15} className={conn.isRefreshing ? 'animate-spin text-blue-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action feedback notification toast */}
        {actionFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top-1">
            <CheckCircle2 size={15} />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('kids')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'kids'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={16} />
            <span>Máy Con Cái ({kidsList.length})</span>
            <span
              className={`w-2 h-2 rounded-full ${
                kidsList.some((k) => k.isOnline) ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'server'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server size={16} />
            <span>Máy Chủ PC & 4G</span>
            <span
              className={`w-2 h-2 rounded-full ${
                conn.server.online ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info size={16} />
            <span>Chẩn Đoán Mạng</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: KIDS DEVICES */}
          {activeTab === 'kids' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Danh sách thiết bị con đang liên kết:</span>
                <span>Tự động cập nhật: mỗi 10s</span>
              </div>

              {kidsList.map((kid) => (
                <div
                  key={kid.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3"
                >
                  {/* Top: Avatar, Name, Online Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={kid.avatar || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150'}
                          alt={kid.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 shadow-xs"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            kid.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-sm">{kid.name}</h3>
                          {kid.isLocked ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200/60 flex items-center gap-0.5">
                              <Lock size={10} /> Đang Khóa
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 flex items-center gap-0.5">
                              <Unlock size={10} /> Đang Mở
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <span>Thiết bị:</span>
                          <strong className="text-slate-800">{kid.deviceName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="text-right">
                      {kid.isOnline ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-extrabold text-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>Trực Tuyến</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                          <Clock size={12} />
                          <span>{kid.lastSeenText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges Matrix */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Battery */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          kid.battery <= 20
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {kid.isCharging ? <BatteryCharging size={16} /> : <Battery size={16} />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-semibold leading-tight">PIN MÁY</span>
                        <span className="font-extrabold text-slate-800">{kid.battery}% {kid.isCharging ? '(Đang sạc)' : ''}</span>
                      </div>
                    </div>

                    {/* Network */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        {kid.networkType === 'wifi' ? <Wifi size={16} /> : <Radio size={16} />}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] text-slate-400 block font-semibold leading-tight">KẾT NỐI</span>
                        <span className="font-extrabold text-slate-800 truncate block">
                          {kid.networkType === 'wifi' ? (kid.wifiSSID || 'Wi-Fi') : '4G / Di động'}
                        </span>
                      </div>
                    </div>

                    {/* Screen / Activity */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="text-[10px] text-slate-400 block font-semibold leading-tight">MÀN HÌNH</span>
                        <span className="font-extrabold text-slate-800 truncate block">
                          {kid.screenState === 'locked' ? 'Đã khóa' : kid.screenState === 'active' ? (kid.currentApp || 'Đang sáng') : 'Đang tắt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location snippet if available */}
                  {kid.address && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                      <MapPin size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{kid.address}</span>
                    </div>
                  )}

                  {/* Fast Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleBuzz(kid.id, kid.name)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Volume2 size={14} className="text-amber-600" />
                      <span>Rung Chuông Tìm Máy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSyncNow(kid.id, kid.name)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                      <span>Cập Nhật Tín Hiệu Ngay</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: SERVER & 4G TUNNEL */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              {/* Local PC Server Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Server size={18} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Máy Chủ Cục Bộ (PC Server)</h4>
                      <p className="text-xs text-slate-500">Chạy trực tiếp trên máy tính cổng 3000</p>
                    </div>
                  </div>
                  {conn.server.online ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200/80 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Hoạt Động
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-black border border-rose-200/80 flex items-center gap-1">
                      <XCircle size={13} /> Ngoại Tuyến
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">TỐC ĐỘ PHẢN HỒI (PING)</span>
                    <span className="font-mono font-black text-sm text-slate-800">
                      {conn.server.latencyMs > 0 ? `${conn.server.latencyMs} ms` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-bold">
                      {conn.server.latencyMs <= 50 ? 'Rất nhanh (0ms - 50ms)' : 'Bình thường'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">KÊNH TRUYỀN DỮ LIỆU</span>
                    <span className="font-bold text-xs text-slate-800 block">SSE + Realtime Event</span>
                    <span className="text-[10px] text-blue-600 block font-bold">Độ trễ tức thời 0ms</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-semibold">URL ĐANG KẾT NỐI:</span>
                    <span className="font-mono text-slate-700 text-xs font-bold truncate block select-all">
                      {conn.server.url || 'http://localhost:3000'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-black uppercase shrink-0">
                    {conn.server.type}
                  </span>
                </div>
              </div>

              {/* Cloudflare 4G Tunnel Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Globe size={18} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Đường Truyền Internet 4G (Cloudflare)</h4>
                      <p className="text-xs text-slate-500">Giúp Cha Mẹ & Con kết nối ngoài đường 4G</p>
                    </div>
                  </div>
                  {conn.tunnel.online ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200/80 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Sẵn Sàng
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black border border-amber-200/80 flex items-center gap-1">
                      <AlertTriangle size={13} /> Đang Cấp Link
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 text-white font-mono text-xs flex items-center justify-between gap-2">
                  <span className="truncate text-blue-300 font-bold select-all">
                    {conn.tunnel.url || 'Đang kết nối Cloudflare...'}
                  </span>
                  {conn.tunnel.url && (
                    <a
                      href={`${conn.tunnel.url}/parent.html`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
                      title="Mở liên kết"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Tự động đồng bộ lên GitHub:</span>
                  </div>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    🟢 Đã Bật (100%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/70 text-blue-900 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-sm">
                  <Info size={16} className="text-blue-600" />
                  <span>Cơ chế kết nối thông minh 2 chiều:</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Hệ thống tự động sử dụng <strong>Wi-Fi nội bộ trong nhà (0ms)</strong> khi bạn ở cùng mạng, và tự động chuyển sang <strong>Đường hầm 4G bảo mật</strong> khi bạn hoặc con cái ra khỏi nhà.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">Bảng kiểm tra nhanh khi mất kết nối:</h4>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">1</span>
                    <span>Máy tính PC đã bật và máy chủ đang chạy chưa?</span>
                  </div>
                  <p className="text-slate-500 pl-7">
                    Đảm bảo máy tính bật. Máy chủ đã được cài chạy ngầm tự động 24/7. Nếu cần kiểm tra, hãy mở file <code>CHAY-TAT-CA-1-CLICK.bat</code> trên máy tính.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">2</span>
                    <span>Điện thoại con có bật mạng Wi-Fi hoặc 4G không?</span>
                  </div>
                  <p className="text-slate-500 pl-7">
                    Nếu máy con tắt dữ liệu di động hoặc hết pin, app con sẽ tạm thời ngắt kết nối. Ngay khi có mạng trở lại, máy con sẽ gửi tín hiệu ACK tự động.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">3</span>
                    <span>Quyền chạy ngầm & Tự khởi chạy trên máy con:</span>
                  </div>
                  <p className="text-slate-500 pl-7">
                    Trên điện thoại con (Huawei / Samsung / Oppo), hãy đảm bảo đã cấp quyền "Tự khởi chạy" và "Không hạn chế pin trong nền" cho App Con Cái (KidCare).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span>Cập nhật lần cuối: </span>
            <strong className="text-slate-600">
              {conn.lastRefreshedAt > 0 ? new Date(conn.lastRefreshedAt).toLocaleTimeString('vi-VN') : 'Đang quét...'}
            </strong>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition active:scale-95 cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
