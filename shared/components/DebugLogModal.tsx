import React, { useState, useEffect, useMemo } from 'react';
import {
  debugLogService,
  DebugLogEntry,
  DebugCategory,
  DebugStatus,
} from '../services/debugLogService';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';

interface DebugLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: 'ParentPro' | 'KidCare' | string;
  childId?: string;
  childName?: string;
}

export const DebugLogModal: React.FC<DebugLogModalProps> = ({
  isOpen,
  onClose,
  appName = 'KidCare',
  childId,
  childName,
}) => {
  const [logs, setLogs] = useState<DebugLogEntry[]>(() => debugLogService.getLogs());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DebugLogEntry | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLogs(debugLogService.getLogs());
    const unsub = debugLogService.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsub();
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterCategory !== 'all' && log.category !== filterCategory) return false;
      if (filterStatus === 'error' && log.status !== 'error') return false;
      if (filterStatus === 'warning' && log.status !== 'warning') return false;
      if (filterStatus === 'success' && log.status !== 'success') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = log.action.toLowerCase().includes(q);
        const matchSummary = log.summary.toLowerCase().includes(q);
        const matchChild = (log.childName || log.childId || '').toLowerCase().includes(q);
        const matchError = log.error?.message.toLowerCase().includes(q);
        if (!matchAction && !matchSummary && !matchChild && !matchError) return false;
      }

      return true;
    });
  }, [logs, filterCategory, filterStatus, searchQuery]);

  const errorCount = useMemo(() => logs.filter((l) => l.status === 'error').length, [logs]);

  const handleCopyLogs = () => {
    const text = debugLogService.exportAsText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  const handleClear = () => {
    if (window.confirm('Bạn có chắc muốn xóa sạch toàn bộ nhật ký debug hiện tại?')) {
      debugLogService.clearLogs();
      setSelectedLog(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Nhật Ký Truyền Nhận Dữ Liệu & Sửa Lỗi ({appName})
                </h3>
                {errorCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    <span>{errorCount} Lỗi</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>Hệ thống ổn định</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kiểm tra các luồng: Thêm giờ (Bố mẹ), Thời gian đã dùng (Con), Telemetry & Lệnh từ xa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
              title="Sao chép toàn bộ nhật ký gửi kỹ thuật hỗ trợ"
            >
              <Copy size={13} />
              <span>{copied ? 'Đã sao chép!' : 'Sao chép log'}</span>
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
              title="Xóa nhật ký"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:px-5 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full text-xs">
            {[
              { id: 'all', label: `Tất cả (${logs.length})` },
              { id: 'screentime', label: '⏱️ Thời gian dùng' },
              { id: 'telemetry', label: '📡 Telemetry' },
              { id: 'settings', label: '⚙️ Cài đặt' },
              { id: 'command', label: '🎮 Lệnh từ xa' },
              { id: 'sos', label: '🚨 SOS' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                  filterCategory === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              onClick={() => setFilterStatus((prev) => (prev === 'error' ? 'all' : 'error'))}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ml-1 whitespace-nowrap ${
                filterStatus === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/50'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Chỉ lỗi ({errorCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm hành động, bé, lỗi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 text-slate-100 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Log List & Details Split View */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">
          {/* Main Log Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <CheckCircle2 size={40} className="text-slate-600 mb-2" />
                <p className="text-sm font-medium">Chưa có bản ghi nào phù hợp bộ lọc.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Các sự kiện gửi và nhận sẽ tự động hiển thị thời gian thực tại đây.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isErr = log.status === 'error';
                const isWarn = log.status === 'warning';

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 sm:px-5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-800/40 ${
                      isSelected ? 'bg-slate-800/80 ring-1 ring-indigo-500/40' : ''
                    } ${isErr ? 'bg-rose-950/20' : ''}`}
                  >
                    {/* Direction Icon Badge */}
                    <div className="shrink-0 mt-0.5">
                      {log.direction === 'kid->cloud' ? (
                        <div
                          className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold"
                          title="Máy con gửi lên Cloud"
                        >
                          <ArrowUpRight size={14} />
                        </div>
                      ) : log.direction === 'parent->cloud' ? (
                        <div
                          className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold"
                          title="Máy cha mẹ gửi lên Cloud"
                        >
                          <ArrowUpRight size={14} />
                        </div>
                      ) : log.direction === 'cloud->kid' ? (
                        <div
                          className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold"
                          title="Cloud gửi xuống Máy con"
                        >
                          <ArrowDownLeft size={14} />
                        </div>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold"
                          title="Cloud gửi tới Máy cha mẹ"
                        >
                          <ArrowDownLeft size={14} />
                        </div>
                      )}
                    </div>

                    {/* Log Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.timeString}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded font-mono ${
                            isErr
                              ? 'bg-rose-600 text-white'
                              : isWarn
                              ? 'bg-amber-500 text-black'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="text-xs font-bold text-white tracking-tight">
                          {log.action}
                        </span>
                        {log.childName && (
                          <span className="text-[11px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/40">
                            {log.childName}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {log.summary}
                      </p>

                      {log.error && (
                        <div className="mt-1.5 p-2 rounded-xl bg-rose-950/60 border border-rose-800/50 text-[11px] text-rose-200 font-mono flex items-start gap-1.5">
                          <ShieldAlert size={13} className="text-rose-400 shrink-0 mt-0.5" />
                          <span className="break-all">{log.error.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Side Drawer: Detailed Inspection of Selected Log */}
          {selectedLog && (
            <div className="w-full sm:w-80 lg:w-96 border-t sm:border-t-0 sm:border-l border-slate-800 bg-slate-950/80 p-4 overflow-y-auto shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chi Tiết Sự Kiện
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-slate-400">ID: <span className="text-slate-200 font-mono">{selectedLog.id}</span></div>
                <div className="text-slate-400">Thời gian: <span className="text-slate-200">{selectedLog.timeString}</span></div>
                <div className="text-slate-400">Hướng truyền: <span className="text-indigo-300 font-mono font-bold">{selectedLog.direction}</span></div>
                <div className="text-slate-400">Phân loại: <span className="text-emerald-300 font-mono">{selectedLog.category}</span></div>
                <div className="text-slate-400">Hành động: <span className="text-white font-bold">{selectedLog.action}</span></div>
                {selectedLog.childName && (
                  <div className="text-slate-400">Bé: <span className="text-white">{selectedLog.childName}</span></div>
                )}
              </div>

              {selectedLog.error && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-700/60 text-xs text-rose-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-300">
                    <AlertTriangle size={13} />
                    <span>Lỗi phát sinh:</span>
                  </div>
                  <p className="font-mono break-all">{selectedLog.error.message}</p>
                  {selectedLog.error.code && (
                    <div className="text-[11px] text-rose-400">Mã lỗi: {selectedLog.error.code}</div>
                  )}
                  {selectedLog.error.stack && (
                    <pre className="text-[10px] text-slate-400 overflow-x-auto p-1.5 bg-black/40 rounded mt-1">
                      {selectedLog.error.stack}
                    </pre>
                  )}
                </div>
              )}

              {selectedLog.payload && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400">Dữ liệu gửi (Payload):</span>
                  <pre className="text-[11px] font-mono text-slate-300 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Đang giám sát luồng dữ liệu thời gian thực</span>
          </div>
          <span>Tổng số {logs.length} bản ghi</span>
        </div>
      </div>
    </div>
  );
};
