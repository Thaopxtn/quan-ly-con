import React, { useState } from 'react';
import {
  Server,
  Smartphone,
  Wifi,
  Radio,
  RefreshCw,
  ChevronRight,
  Battery,
  BatteryCharging,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react';
import { useConnectionStatus } from '@shared/services/connectionMonitorService';
import { useAppState } from '@shared/store';
import { ConnectionHubModal } from './ConnectionHubModal';

export const ConnectionStatusBar: React.FC = () => {
  const conn = useConnectionStatus();
  const { state } = useAppState();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedChild = state.children?.find(c => c.id === state.selectedChildId) || state.children?.[0] || state.child;
  const childConn = conn.children.find(c => c.childId === selectedChild?.id) || conn.children[0];

  const isServerOnline = conn.server.online;
  const isKidOnline = childConn ? childConn.isOnline : false;

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    conn.refresh();
  };

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="mx-3 my-1.5 px-3 py-1.5 rounded-2xl bg-white/95 hover:bg-slate-50/90 border border-slate-200/90 shadow-2xs backdrop-blur-md flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99] select-none text-xs"
      >
        {/* Left: Server Connection Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center">
            <Server size={14} className={isServerOnline ? 'text-blue-600' : 'text-slate-400'} />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 truncate text-[11px]">
            <span className="font-bold text-slate-800">
              {conn.server.type === 'lan' ? 'Máy chủ Wi-Fi' : 'Máy chủ 4G'}
            </span>
            {isServerOnline ? (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9.5px] border border-emerald-200/60">
                {conn.server.latencyMs > 0 ? `${conn.server.latencyMs}ms` : 'Online'}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-600 font-bold text-[9.5px] border border-rose-200/60">
                Mất kết nối
              </span>
            )}
          </div>
        </div>

        {/* Divider dot */}
        <span className="text-slate-300 font-black">•</span>

        {/* Right: Child Device Status Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center">
            <Smartphone size={14} className={isKidOnline ? 'text-indigo-600' : 'text-slate-400'} />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                isKidOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 truncate text-[11px]">
            <span className="font-bold text-slate-700 truncate max-w-[80px]">
              {selectedChild?.name || 'Máy con'}
            </span>
            {childConn ? (
              <div className="flex items-center gap-1">
                {isKidOnline ? (
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9.5px] border border-emerald-200/60">
                    Trực tuyến
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-medium text-[9.5px]">
                    {childConn.lastSeenText}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-[9.5px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                  <Battery size={11} className={childConn.battery <= 20 ? 'text-rose-500' : 'text-emerald-600'} />
                  {childConn.battery}%
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-[10px]">Đang quét...</span>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={handleRefresh}
            className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition"
            title="Làm mới trạng thái kết nối"
          >
            <RefreshCw size={12} className={conn.isRefreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
          <ChevronRight size={13} className="text-slate-400" />
        </div>
      </div>

      {/* Full Modal */}
      {isModalOpen && <ConnectionHubModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};
