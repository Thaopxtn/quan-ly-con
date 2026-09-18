import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Loader2,
  Users,
  Crown,
  Eye,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Trash2,
  Shield,
  ChevronLeft,
} from 'lucide-react';
import { safeCopyToClipboard } from '@shared/utils/clipboard';
import {
  createShareCode,
  acceptShareCode,
  revokeParentAccess,
  getConnectedParents,
  ConnectedParent,
} from '@shared/firebase/sharingService';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';
import { getActiveParentId, useAppState } from '@shared/store';
import { loadChildDataFromCloud } from '@shared/firebase/pairingService';
import confetti from 'canvas-confetti';

interface ShareChildModalProps {
  childId: string;
  childName: string;
  childAvatar?: string;
  ownerParentId: string;
  onClose: () => void;
}

type ModalTab = 'connected' | 'share_out' | 'accept_share';
type ShareRole = 'co_parent' | 'viewer';

const ROLE_LABELS: Record<string, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  owner: {
    label: 'Chủ tài khoản',
    description: 'Toàn quyền quản lý',
    color: '#f59e0b',
    icon: <Crown size={14} />,
  },
  co_parent: {
    label: 'Đồng quản lý',
    description: 'Xem + điều khiển, không thể xóa',
    color: '#2563eb',
    icon: <ShieldCheck size={14} />,
  },
  viewer: {
    label: 'Chỉ xem',
    description: 'Chỉ xem thông tin, không điều khiển',
    color: '#64748b',
    icon: <Eye size={14} />,
  },
};

export const ShareChildModal: React.FC<ShareChildModalProps> = ({
  childId,
  childName,
  childAvatar,
  ownerParentId,
  onClose,
}) => {
  const currentParent = getCurrentParentAccount();
  const parentId = currentParent?.uid || ownerParentId || getActiveParentId();
  const parentName = currentParent?.displayName || 'Bố/Mẹ';
  const { addChild } = useAppState();

  const [activeTab, setActiveTab] = useState<ModalTab>('connected');

  // ── Tab: Connected parents ───────────────────────────────────────────────
  const [connectedParents, setConnectedParents] = useState<ConnectedParent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Tab: Share out ───────────────────────────────────────────────────────
  const [shareRole, setShareRole] = useState<ShareRole>('co_parent');
  const [shareSession, setShareSession] = useState<{ code: string; expiresAt: number } | null>(null);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // ── Tab: Accept share ────────────────────────────────────────────────────
  const [incomingCode, setIncomingCode] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  const formattedShareCode = shareSession?.code
    ? `${shareSession.code.slice(0, 3)} ${shareSession.code.slice(3)}`
    : '';

  // Load connected parents on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingParents(true);
      try {
        const list = await getConnectedParents(parentId, childId);
        if (!cancelled) setConnectedParents(list);
      } catch (_) {}
      if (!cancelled) setLoadingParents(false);
    }
    load();
    return () => { cancelled = true; };
  }, [parentId, childId]);

  // Generate share code
  const handleGenerateShareCode = async () => {
    setGeneratingShare(true);
    try {
      const session = await createShareCode(
        parentId,
        parentName,
        childId,
        childName,
        childAvatar,
        shareRole
      );
      setShareSession({ code: session.code, expiresAt: session.expiresAt });
    } catch (e) {
      console.error('Share code error:', e);
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleCopyShare = () => {
    if (shareSession?.code) {
      safeCopyToClipboard(shareSession.code);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  // Accept an incoming share code
  const handleAcceptShare = async () => {
    const clean = incomingCode.replace(/\s+/g, '').trim();
    if (clean.length !== 6) {
      setAcceptError('Vui lòng nhập đủ 6 chữ số mã chia sẻ.');
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await acceptShareCode(clean, parentId, parentName);
      if (res.success && res.session) {
        const s = res.session;
        let cloudData: any = null;
        try {
          cloudData = await loadChildDataFromCloud(s.fromParentId, s.childId);
        } catch (_) {}

        addChild({
          id: s.childId,
          name: cloudData?.name || s.childName || "Bé yêu",
          avatar: cloudData?.avatar || s.childAvatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
          age: cloudData?.age || 8,
          birthYear: cloudData?.birthYear || (new Date().getFullYear() - 8),
          gender: cloudData?.gender || "boy",
          status: "online",
          battery: cloudData?.battery ?? 100,
        });

        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setAcceptSuccess(true);
      } else {
        setAcceptError(res.error || 'Mã chia sẻ không hợp lệ.');
      }
    } catch (e: any) {
      setAcceptError(e.message || 'Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setAccepting(false);
    }
  };

  // Revoke a parent's access
  const handleRevoke = async (targetParentId: string) => {
    setRevokingId(targetParentId);
    try {
      await revokeParentAccess(parentId, childId, targetParentId);
      setConnectedParents((prev) => prev.filter((p) => p.parentId !== targetParentId));
    } catch (_) {}
    setRevokingId(null);
  };

  const tabs: { key: ModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'connected', label: 'Kết nối', icon: <Users size={13} /> },
    { key: 'share_out', label: 'Chia sẻ', icon: <Share2 size={13} /> },
    { key: 'accept_share', label: 'Nhận mã', icon: <KeyRound size={13} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chia Sẻ Quản Lý</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                {childAvatar && (
                  <img src={childAvatar} alt={childName} className="w-4 h-4 rounded-full object-cover" />
                )}
                {childName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 p-2 gap-1 bg-slate-50 border-b border-slate-100 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── TAB: CONNECTED ────────────────────────────────────── */}
          {activeTab === 'connected' && (
            <>
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Tài khoản có quyền quản lý {childName}
                </p>

                {/* Owner (yourself) */}
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {(parentName || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {parentName}
                        <span className="ml-1.5 text-[9.5px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-bold">
                          Bạn · Chủ
                        </span>
                      </p>
                      <p className="text-[10.5px] text-slate-500">{currentParent?.email || 'Tài khoản chính'}</p>
                    </div>
                    <Crown size={16} className="text-amber-500 shrink-0" />
                  </div>

                  {/* Other connected parents */}
                  {loadingParents && connectedParents.length === 0 ? (
                    <div className="flex items-center justify-center py-5 text-slate-400">
                      <Loader2 size={18} className="animate-spin mr-2" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  ) : connectedParents.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400">Chưa có tài khoản nào được chia sẻ</p>
                    </div>
                  ) : (
                    connectedParents.map((parent) => {
                      const roleInfo = ROLE_LABELS[parent.role] || ROLE_LABELS.viewer;
                      return (
                        <div key={parent.parentId} className="flex items-center gap-3 p-3.5">
                          <div
                            className="w-10 h-10 rounded-2xl text-white font-bold text-sm flex items-center justify-center shrink-0"
                            style={{ backgroundColor: roleInfo.color }}
                          >
                            {(parent.parentName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{parent.parentName}</p>
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${roleInfo.color}15`, color: roleInfo.color }}
                            >
                              {roleInfo.icon}
                              {roleInfo.label}
                            </span>
                          </div>
                          {/* Revoke button */}
                          <button
                            onClick={() => handleRevoke(parent.parentId)}
                            disabled={revokingId === parent.parentId}
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
                            title="Thu hồi quyền"
                          >
                            {revokingId === parent.parentId
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                <Shield size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Bấm <strong>"Chia sẻ"</strong> để tạo mã gửi cho người thân. Bấm <strong>"Nhận mã"</strong> nếu người khác gửi mã cho bạn để cùng quản lý một bé.
                </p>
              </div>
            </>
          )}

          {/* ── TAB: SHARE OUT ─────────────────────────────────────── */}
          {activeTab === 'share_out' && (
            <>
              {!shareSession ? (
                <>
                  {/* Role selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Chọn quyền cho người được chia sẻ:</p>
                    {(['co_parent', 'viewer'] as ShareRole[]).map((role) => {
                      const info = ROLE_LABELS[role];
                      return (
                        <button
                          key={role}
                          onClick={() => setShareRole(role)}
                          style={{
                            borderColor: shareRole === role ? info.color : '#e2e8f0',
                            backgroundColor: shareRole === role ? `${info.color}08` : '#f8fafc',
                          }}
                          className="w-full p-3.5 rounded-2xl border-2 flex items-center gap-3 text-left transition cursor-pointer"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: info.color }}
                          >
                            {info.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{info.label}</p>
                            <p className="text-[11px] text-slate-500">{info.description}</p>
                          </div>
                          {shareRole === role && (
                            <Check size={16} style={{ color: info.color }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleGenerateShareCode}
                    disabled={generatingShare}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    {generatingShare ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang tạo mã chia sẻ...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Tạo mã chia sẻ 6 số</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Share code display */}
                  <div
                    style={{ backgroundColor: '#1e1b4b' }}
                    className="text-white p-5 rounded-3xl text-center space-y-2 shadow-xl"
                  >
                    <p className="text-[10.5px] text-indigo-300 uppercase font-extrabold tracking-wider">
                      MÃ CHIA SẺ QUYỀN QUẢN LÝ
                    </p>
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="text-3xl font-black font-mono tracking-widest text-amber-400">
                        {formattedShareCode}
                      </span>
                      <button
                        onClick={handleCopyShare}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-90 cursor-pointer"
                      >
                        {shareCopied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${ROLE_LABELS[shareRole].color}25`,
                          color: ROLE_LABELS[shareRole].color,
                        }}
                      >
                        {ROLE_LABELS[shareRole].icon}&nbsp;{ROLE_LABELS[shareRole].label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Hiệu lực 24 giờ · Chỉ dùng 1 lần
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 text-xs text-slate-600 space-y-1.5">
                    <p className="font-bold text-indigo-900">Hướng dẫn:</p>
                    <p>Gửi mã <strong className="font-mono text-indigo-700">{formattedShareCode}</strong> cho người thân.</p>
                    <p>Họ vào app <strong>ParentPro → Chia sẻ quản lý → "Nhận mã"</strong> và nhập mã này.</p>
                    <p className="text-[10.5px] text-slate-400">Mã chỉ dùng được 1 lần và hết hạn sau 24 giờ.</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShareSession(null)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      Chọn quyền khác
                    </button>
                    <button
                      onClick={() => { setShareSession(null); handleGenerateShareCode(); }}
                      disabled={generatingShare}
                      className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={generatingShare ? 'animate-spin' : ''} />
                      Tạo mã mới
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── TAB: ACCEPT SHARE ──────────────────────────────────── */}
          {activeTab === 'accept_share' && (
            <>
              {!acceptSuccess ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Nhập mã 6 số do thành viên gia đình khác gửi để cùng quản lý con cái của họ.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Mã chia sẻ 6 số:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={7}
                      value={incomingCode}
                      onChange={(e) => {
                        setIncomingCode(e.target.value.replace(/[^0-9\s]/g, ''));
                        setAcceptError(null);
                      }}
                      placeholder="VD: 852 147"
                      className="w-full text-center text-2xl font-black font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 shadow-inner"
                    />
                  </div>

                  {acceptError && (
                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{acceptError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleAcceptShare}
                    disabled={accepting || incomingCode.replace(/\s+/g, '').length !== 6}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    {accepting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xác nhận...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Nhận quyền quản lý</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Check size={30} strokeWidth={3} />
                  </div>
                  <h4 className="text-base font-black text-emerald-900">Kết Nối Thành Công!</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Bạn đã được cấp quyền quản lý bé. Thông tin sẽ đồng bộ trong vài giây.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl"
                  >
                    Xong
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
