import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  Eye,
  Crown,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  Loader2,
  Smartphone,
  Plus,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { safeCopyToClipboard } from '@shared/utils/clipboard';
import {
  ConnectedParent,
  getLocalConnectedParents,
  getConnectedParents,
} from '@shared/firebase/sharingService';
import {
  createKidInitiatedPairingCode,
  getKidPendingPairing,
  getKidDevicePairedInfo,
  PairingSession,
} from '@shared/firebase/pairingService';

interface ConnectedAccountsModalProps {
  onClose: () => void;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  owner: {
    label: 'Chủ tài khoản',
    color: '#f59e0b',
    icon: <Crown size={12} />,
  },
  co_parent: {
    label: 'Đồng quản lý',
    color: '#2563eb',
    icon: <ShieldCheck size={12} />,
  },
  viewer: {
    label: 'Chỉ xem',
    color: '#64748b',
    icon: <Eye size={12} />,
  },
};

function getDeviceModel(): string {
  const ua = navigator.userAgent;
  if (/samsung/i.test(ua)) return 'Samsung Galaxy';
  if (/redmi|xiaomi/i.test(ua)) return 'Xiaomi';
  if (/oppo/i.test(ua)) return 'Oppo';
  if (/pixel/i.test(ua)) return 'Google Pixel';
  return 'Android Device';
}

export const ConnectedAccountsModal: React.FC<ConnectedAccountsModalProps> = ({ onClose }) => {
  const pairedInfo = getKidDevicePairedInfo();
  const [parents, setParents] = useState<ConnectedParent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  // New code generation
  const [mode, setMode] = useState<'list' | 'new_code'>('list');
  const [newSession, setNewSession] = useState<PairingSession | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedNewCode = newSession?.code
    ? `${newSession.code.slice(0, 3)} ${newSession.code.slice(3)}`
    : '';

  // Load connected parents
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingParents(true);

      // Show cached local data immediately
      const local = getLocalConnectedParents(pairedInfo?.childId || '');
      if (local.length > 0 && !cancelled) {
        setParents(local);
      }

      // Then try cloud
      if (pairedInfo?.parentId && pairedInfo?.childId) {
        try {
          const cloud = await getConnectedParents(pairedInfo.parentId, pairedInfo.childId);
          if (!cancelled && cloud.length > 0) {
            setParents(cloud);
          }
        } catch (_) {}
      }

      if (!cancelled) setLoadingParents(false);
    }

    load();
    return () => { cancelled = true; };
  }, [pairedInfo?.parentId, pairedInfo?.childId]);

  // Build full list including the primary owner
  const allParents: ConnectedParent[] = [];

  if (pairedInfo) {
    const ownerAlreadyIn = parents.some((p) => p.parentId === pairedInfo.parentId);
    if (!ownerAlreadyIn) {
      allParents.push({
        parentId: pairedInfo.parentId,
        parentName: pairedInfo.parentName || 'Bố/Mẹ',
        role: 'owner',
        connectedAt: new Date(pairedInfo.pairedAt).getTime(),
      });
    }
  }
  allParents.push(...parents);

  // Generate new pairing code for an additional parent device
  const handleGenerateNewCode = async () => {
    if (!pairedInfo) return;
    setGenerating(true);
    try {
      const session = await createKidInitiatedPairingCode(
        {
          name: pairedInfo.childName,
          birthYear: pairedInfo.childBirthYear || 2017,
          age: pairedInfo.childAge || 8,
          avatar: pairedInfo.childAvatar || '',
          gender: pairedInfo.childGender,
        },
        {
          model: getDeviceModel(),
          osVersion: 'Android 14',
        }
      );
      setNewSession(session);
      setMode('new_code');
    } catch (e) {
      console.error('Generate code error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (newSession?.code) {
      safeCopyToClipboard(newSession.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshCode = async () => {
    setNewSession(null);
    await handleGenerateNewCode();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in">
      <div className="bg-white rounded-t-3xl w-full max-w-sm shadow-2xl pb-8 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'list' ? 'Tài Khoản Kết Nối' : 'Mã Kết Nối Mới'}
              </h3>
              <p className="text-[10.5px] text-slate-500">
                {mode === 'list'
                  ? `${pairedInfo?.childName || 'Bé'} · ${allParents.length} tài khoản`
                  : 'Cho cha mẹ khác quét hoặc nhập'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200 transition active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── MODE: LIST ───────────────────────────────────────── */}
          {mode === 'list' && (
            <>
              {/* Child info banner */}
              {pairedInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-3">
                  {pairedInfo.childAvatar && (
                    <img
                      src={pairedInfo.childAvatar}
                      alt={pairedInfo.childName}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-300 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-blue-900 truncate">{pairedInfo.childName}</p>
                    <p className="text-[11px] text-blue-600">
                      {pairedInfo.childAge ? `${pairedInfo.childAge} tuổi` : ''}
                      {pairedInfo.childGender === 'boy' ? ' · 👦 Bé Trai' : ' · 👧 Bé Gái'}
                    </p>
                  </div>
                </div>
              )}

              {/* Connected parents list */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Tài khoản có quyền quản lý
                </p>

                {loadingParents && allParents.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    <span className="text-sm">Đang tải...</span>
                  </div>
                ) : allParents.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <Smartphone size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Chưa có thiết bị nào kết nối</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm">
                    {allParents.map((parent) => {
                      const roleInfo = ROLE_LABELS[parent.role] || ROLE_LABELS.viewer;
                      const connectedDate = parent.connectedAt
                        ? new Date(parent.connectedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '';

                      return (
                        <div key={parent.parentId} className="flex items-center gap-3 p-3.5">
                          {/* Avatar initial */}
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                            style={{ backgroundColor: roleInfo.color }}
                          >
                            {(parent.parentName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {parent.parentName}
                              {parent.parentId === pairedInfo?.parentId && (
                                <span className="ml-1.5 text-[9.5px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">
                                  Chủ
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.3 rounded-md"
                                style={{
                                  backgroundColor: `${roleInfo.color}15`,
                                  color: roleInfo.color,
                                }}
                              >
                                {roleInfo.icon}
                                {roleInfo.label}
                              </span>
                              {connectedDate && (
                                <span className="text-[10px] text-slate-400">
                                  · {connectedDate}
                                </span>
                              )}
                            </div>
                          </div>
                          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Chỉ <strong>tài khoản chủ</strong> mới có thể xem vị trí, chặn app và điều khiển thiết bị. Tài khoản được chia sẻ có quyền hạn tùy vai trò.
                </p>
              </div>

              {/* Add new device button */}
              <button
                onClick={handleGenerateNewCode}
                disabled={generating || !pairedInfo}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang tạo mã...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Tạo mã kết nối thêm thiết bị</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          )}

          {/* ── MODE: NEW CODE ───────────────────────────────────── */}
          {mode === 'new_code' && newSession && (
            <>
              {/* Child summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2.5">
                {pairedInfo?.childAvatar && (
                  <img
                    src={pairedInfo.childAvatar}
                    alt={pairedInfo?.childName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-300 shrink-0"
                  />
                )}
                <div>
                  <p className="text-xs font-black text-blue-900">{pairedInfo?.childName}</p>
                  <p className="text-[10.5px] text-blue-600 font-bold">⏱️ Mã dùng 1 lần, hiệu lực 15 phút</p>
                </div>
              </div>

              {/* Big code display */}
              <div
                style={{ backgroundColor: '#0f172a' }}
                className="text-white p-5 rounded-3xl text-center space-y-2 shadow-xl"
              >
                <p className="text-[11px] text-indigo-300 uppercase font-extrabold tracking-wider">
                  MÃ KẾT NỐI CHO CHA MẸ (PIN CODE)
                </p>
                <div className="flex items-center justify-center gap-2 py-1">
                  <span className="text-3xl font-black font-mono tracking-widest text-amber-400 drop-shadow-md">
                    {formattedNewCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-90 cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Đang chờ thiết bị cha mẹ kết nối...</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
                <p className="font-black text-blue-900 text-xs">Hướng dẫn kết nối:</p>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span>Mở app <strong>ParentPro (Cha Mẹ)</strong> trên thiết bị muốn thêm.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span>Vào <strong>"Ghép đôi thiết bị con"</strong> → Tab <strong>"Nhập mã máy con"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span>Nhập mã <strong className="text-blue-700 font-mono">{formattedNewCode}</strong> → Kết nối thành công!</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('list')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                >
                  <Users size={14} />
                  <span>Xem danh sách</span>
                </button>
                <button
                  onClick={handleRefreshCode}
                  disabled={generating}
                  className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                  <span>Tạo mã mới</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
