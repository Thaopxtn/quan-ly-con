import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  ShieldCheck,
  Check,
  RefreshCw,
  Sparkles,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Loader2,
  UserCheck,
  Share2,
  Clock,
  Radio
} from "lucide-react";
import {
  requestPairingWithKidCode,
  loadChildDataFromCloud,
  PairingSession
} from "@shared/firebase/pairingService";
import { ChildDeviceInfo } from "@shared/types";
import { acceptShareCode } from "@shared/firebase/sharingService";
import { getCurrentParentAccount, getFirebaseInstance } from "@shared/firebase/firebaseService";
import { isFirebaseConfigured } from "@shared/firebase/firebaseConfig";
import { getActiveParentId, useAppState } from "@shared/store";
import { doc, onSnapshot } from "firebase/firestore";
import { ref as rtdbRef, onValue as rtdbOnValue } from "firebase/database";
import confetti from "canvas-confetti";

interface PairChildDeviceModalProps {
  childId?: string;
  childName?: string;
  onClose: () => void;
  onSuccess?: (childId: string, childName: string) => void;
}

export const PairChildDeviceModal: React.FC<PairChildDeviceModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { state, addChild, addOrUpdateChildDevice } = useAppState();
  const currentParent = getCurrentParentAccount();

  // Multi-device target mode: 'new' child or 'existing' child
  const [targetChildMode, setTargetChildMode] = useState<'new' | 'existing'>(
    state.children.length > 0 ? 'existing' : 'new'
  );
  const [selectedExistingChildId, setSelectedExistingChildId] = useState<string>(
    state.children[0]?.id || ''
  );

  // Tab: 'from_kid' (Nhập mã từ máy con - DUY NHẤT) vs 'from_share' (Nhận chia sẻ từ phụ huynh khác)
  const [activeTab, setActiveTab] = useState<'from_kid' | 'from_share'>('from_kid');

  // Input state
  const [kidCode, setKidCode] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [kidError, setKidError] = useState<string | null>(null);

  // Waiting for child device approval state
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [pendingSession, setPendingSession] = useState<PairingSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Co-parent share state
  const [shareCode, setShareCode] = useState('');
  const [isAcceptingShare, setIsAcceptingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Successful paired child info for celebration view
  const [pairedChildSummary, setPairedChildSummary] = useState<{
    name: string;
    avatar?: string;
    age?: number;
    birthYear?: number;
    deviceModel?: string;
  } | null>(null);
  const [isPairedSuccess, setIsPairedSuccess] = useState(false);

  // 15-minute countdown timer when waiting for approval
  useEffect(() => {
    if (!isWaitingApproval || !pendingSession) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pendingSession.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsWaitingApproval(false);
        setKidError("Mã kết nối đã hết hạn (quá 15 phút). Vui lòng tạo mã mới trên máy con.");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaitingApproval, pendingSession]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Step 1: Parent submits kid code -> sends connection request to child device
  const handleSendPairingRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = kidCode.replace(/\s+/g, "").trim();
    if (clean.length !== 6) {
      setKidError("Vui lòng nhập đủ 6 chữ số hiển thị trên điện thoại của con.");
      return;
    }

    setIsRequesting(true);
    setKidError(null);

    try {
      const parentId = currentParent?.uid || getActiveParentId();
      const parentName = currentParent?.displayName || "Bố/Mẹ";

      const res = await requestPairingWithKidCode(clean, parentId, parentName);

      if (!res.success || !res.session) {
        setIsRequesting(false);
        setKidError(res.error || "Mã không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại!");
        return;
      }

      setPendingSession(res.session);
      const remaining = Math.max(0, Math.floor((res.session.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setIsWaitingApproval(true);
    } catch (err: any) {
      setKidError(err.message || "Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsRequesting(false);
    }
  };

  // Step 2: Real-time listener waiting for kid device to click "Chấp nhận"
  useEffect(() => {
    if (!isWaitingApproval || !pendingSession?.code) return;
    const cleanCode = pendingSession.code;
    const { db, rtdb } = getFirebaseInstance();

    let isCompleted = false;

    const finalizeSuccess = async (data: any) => {
      if (isCompleted) return;
      isCompleted = true;

      const parentId = currentParent?.uid || getActiveParentId();

      let cloudData: Record<string, any> | null = null;
      try {
        cloudData = await loadChildDataFromCloud(parentId, pendingSession.childId);
      } catch (_) {}

      const childName = cloudData?.name || data?.childName || pendingSession.childName || "Bé yêu";
      const childAvatar =
        cloudData?.avatar ||
        data?.childAvatar ||
        pendingSession.childAvatar ||
        "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150";
      const childAge = cloudData?.age || data?.childAge || pendingSession.childAge || 8;
      const childBirthYear =
        cloudData?.birthYear ||
        data?.childBirthYear ||
        pendingSession.childBirthYear ||
        new Date().getFullYear() - childAge;

      const devData = data?.childDeviceInfo || pendingSession.childDeviceInfo;
      const deviceName = devData?.deviceName || devData?.model || "Điện thoại của bé";
      const fullDevice: ChildDeviceInfo = {
        deviceId: devData?.deviceId || "dev_" + pendingSession.childId,
        hardwareIdType: devData?.hardwareIdType || "imei",
        deviceName: deviceName,
        model: devData?.model || "Android Device",
        manufacturer: devData?.manufacturer || "Android",
        phoneNumber: devData?.phoneNumber || "",
        imei: devData?.imei || "",
        mac: devData?.mac || "",
        serial: devData?.serial || "",
        androidId: devData?.androidId || "",
        osVersion: devData?.osVersion || "Android",
        pairedAt: new Date().toISOString(),
        status: "online",
        battery: 100,
      };

      if (targetChildMode === "existing" && selectedExistingChildId) {
        addOrUpdateChildDevice(selectedExistingChildId, fullDevice);
        const existingChild = state.children.find((c) => c.id === selectedExistingChildId);
        setPairedChildSummary({
          name: existingChild?.name || childName,
          avatar: existingChild?.avatar || childAvatar,
          age: existingChild?.age || childAge,
          birthYear: existingChild?.birthYear || childBirthYear,
          deviceModel: `${deviceName} (${fullDevice.model})`,
        });

        if (onSuccess) {
          onSuccess(selectedExistingChildId, existingChild?.name || childName);
        }
      } else {
        addChild({
          id: pendingSession.childId,
          name: childName,
          avatar: childAvatar,
          age: childAge,
          birthYear: childBirthYear,
          phone: fullDevice.phoneNumber || undefined,
          status: "online",
          battery: cloudData?.battery ?? 100,
          devices: [fullDevice],
          activeDeviceId: fullDevice.deviceId,
        });

        setPairedChildSummary({
          name: childName,
          avatar: childAvatar,
          age: childAge,
          birthYear: childBirthYear,
          deviceModel: `${deviceName} (${fullDevice.model})`,
        });

        if (onSuccess) {
          onSuccess(pendingSession.childId, childName);
        }
      }

      setIsWaitingApproval(false);
      setIsPairedSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

      setTimeout(() => {
        onClose();
      }, 2500);
    };

    const handleRejected = () => {
      if (isCompleted) return;
      setIsWaitingApproval(false);
      setKidError("Bé đã bấm 'Từ chối' trên máy con. Vui lòng tạo mã mới trên máy con nếu muốn kết nối lại.");
    };

    // 1. RTDB listener
    let unsubRtdb: (() => void) | null = null;
    if (isFirebaseConfigured() && rtdb) {
      try {
        unsubRtdb = rtdbOnValue(rtdbRef(rtdb, `pairings/${cleanCode}`), (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val.status === "paired") {
              finalizeSuccess(val);
            } else if (val.status === "rejected") {
              handleRejected();
            }
          }
        });
      } catch (e) {
        console.warn("RTDB pair listener error:", e);
      }
    }

    // 2. Firestore listener
    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(doc(db, "pairings", cleanCode), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.status === "paired") {
              finalizeSuccess(data);
            } else if (data.status === "rejected") {
              handleRejected();
            }
          }
        });
      } catch (e) {
        console.warn("Firestore pair listener error:", e);
      }
    }

    // 3. LocalStorage polling fallback (same device / offline demo)
    const localTimer = setInterval(() => {
      if (typeof window === "undefined" || isCompleted) return;
      const raw = localStorage.getItem("parent_pro_pairing_sessions");
      if (raw) {
        try {
          const sessions = JSON.parse(raw);
          const s = sessions[cleanCode];
          if (s?.status === "paired") {
            finalizeSuccess(s);
          } else if (s?.status === "rejected") {
            handleRejected();
          }
        } catch (_) {}
      }
    }, 1500);

    return () => {
      if (unsubRtdb) unsubRtdb();
      if (unsubFirestore) unsubFirestore();
      clearInterval(localTimer);
    };
  }, [isWaitingApproval, pendingSession, currentParent?.uid, addChild, onSuccess, onClose]);

  // Connect using share code provided by another Parent (Tab 2)
  const handleAcceptShareCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = shareCode.replace(/\s+/g, "").trim();
    if (clean.length !== 6) {
      setShareError("Vui lòng nhập đủ 6 chữ số mã chia sẻ.");
      return;
    }

    setIsAcceptingShare(true);
    setShareError(null);

    try {
      const parentId = currentParent?.uid || getActiveParentId();
      const parentName = currentParent?.displayName || "Bố/Mẹ";

      const res = await acceptShareCode(clean, parentId, parentName, currentParent?.email);

      if (!res.success || !res.session) {
        setIsAcceptingShare(false);
        setShareError(res.error || "Mã chia sẻ không đúng hoặc đã hết hạn.");
        return;
      }

      const s = res.session;
      let cloudData: any = null;
      try {
        cloudData = await loadChildDataFromCloud(s.fromParentId, s.childId);
      } catch (_) {}

      const childName = cloudData?.name || s.childName || "Bé yêu";
      const childAvatar =
        cloudData?.avatar ||
        s.childAvatar ||
        "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150";
      const childAge = cloudData?.age || 8;
      const childBirthYear = cloudData?.birthYear || new Date().getFullYear() - childAge;

      addChild({
        id: s.childId,
        name: childName,
        avatar: childAvatar,
        age: childAge,
        birthYear: childBirthYear,
        status: "online",
        battery: cloudData?.battery ?? 100,
      });

      setPairedChildSummary({
        name: childName,
        avatar: childAvatar,
        age: childAge,
        birthYear: childBirthYear,
        deviceModel: "Được chia sẻ từ " + (s.fromParentName || "Phụ huynh khác"),
      });

      setIsPairedSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

      if (onSuccess) {
        onSuccess(s.childId, childName);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setShareError(err.message || "Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsAcceptingShare(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ghép Đôi Thiết Bị Con</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Duy nhất qua mã 6 số do máy con tạo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success Screen */}
        {isPairedSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check size={36} strokeWidth={3} />
            </div>
            <h4 className="text-base font-black text-emerald-900">Ghép Đôi Thành Công!</h4>
            {pairedChildSummary?.avatar && (
              <div className="flex justify-center my-1">
                <img
                  src={pairedChildSummary.avatar}
                  alt={pairedChildSummary.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-400 shadow-sm"
                />
              </div>
            )}
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
              Đã nhận hồ sơ của bé <strong>{pairedChildSummary?.name || "Bé"}</strong>
              {pairedChildSummary?.age ? ` (${pairedChildSummary.age} tuổi)` : ""}!
              <br />
              <span className="text-[11px] text-emerald-600">
                Hai thiết bị đã liên kết và đang đồng bộ dữ liệu thời gian thực.
              </span>
            </p>
          </div>
        ) : isWaitingApproval && pendingSession ? (
          /* =========================================================================
             WAITING FOR KID CONFIRMATION SCREEN
             ========================================================================= */
          <div className="space-y-4 py-2 text-center animate-in zoom-in-95">
            {/* Pulsing indicator */}
            <div className="relative w-20 h-20 mx-auto">
              <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-300 flex items-center justify-center text-blue-600 shadow-md">
                <Smartphone size={32} className="animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10.5px] font-black uppercase tracking-wider">
                <Radio size={12} className="text-blue-600 animate-pulse" />
                ĐÃ GỬI YÊU CẦU GHÉP ĐÔI
              </span>
              <h4 className="text-base font-black text-slate-900 pt-1">
                Đang chờ bé "{pendingSession.childName}" xác nhận...
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Vui lòng mở điện thoại của con và bấm nút{" "}
                <strong className="text-blue-600 font-bold">[Chấp nhận]</strong> trên thông báo xuất
                hiện để hoàn tất ghép đôi.
              </p>
            </div>

            {/* Device Info Card from Kid */}
            {pendingSession.childDeviceInfo && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 text-left space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-blue-600" />
                    <span>{pendingSession.childDeviceInfo.deviceName || pendingSession.childDeviceInfo.model}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase">
                    {pendingSession.childDeviceInfo.hardwareIdType || "IMEI"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Mã phần cứng: <span className="font-bold text-slate-800">{pendingSession.childDeviceInfo.deviceId}</span>
                </div>
                {pendingSession.childDeviceInfo.phoneNumber && (
                  <div className="text-[11px] text-emerald-700 font-bold">
                    📞 Số SIM: {pendingSession.childDeviceInfo.phoneNumber}
                  </div>
                )}
              </div>
            )}

            {/* Multi-Device Support: Link to existing child or create new */}
            {state.children.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Liên kết máy này vào hồ sơ con:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetChildMode("existing")}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      targetChildMode === "existing"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Gán cho con đã có
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetChildMode("new")}
                    className={`py-2 px-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      targetChildMode === "new"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Tạo bé mới
                  </button>
                </div>

                {targetChildMode === "existing" && (
                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Chọn bé sở hữu thiết bị này:
                    </label>
                    <select
                      value={selectedExistingChildId}
                      onChange={(e) => setSelectedExistingChildId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {state.children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.devices?.length || 1} máy)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      Một tài khoản bé có thể gắn nhiều máy (máy 1, máy 2...) mà không bị nhầm lẫn.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Countdown timer */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Clock size={15} className="text-blue-600" />
                <span>Thời gian hiệu lực còn lại:</span>
              </div>
              <span className="font-mono font-black text-blue-700 text-sm bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {formatTimer(timeLeft)}
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left space-y-0.5">
              <p className="font-bold text-amber-900">🔔 Lưu ý bảo mật:</p>
              <p>• Mã số này dùng 1 lần và hết hạn sau 15 phút.</p>
              <p>• Nếu kết nối máy khác, cần tạo mã mới trên máy con.</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsWaitingApproval(false);
                setPendingSession(null);
                setKidError(null);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition active:scale-98 cursor-pointer"
            >
              Hủy yêu cầu & nhập mã khác
            </button>
          </div>
        ) : (
          /* =========================================================================
             INPUT 6-DIGIT CODE FROM KID SCREEN (ONLY METHOD)
             ========================================================================= */
          <>
            {/* Mode Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("from_kid");
                  setKidError(null);
                  setShareError(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "from_kid"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone size={13} />
                <span>Nhập mã máy con</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("from_share");
                  setKidError(null);
                  setShareError(null);
                }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === "from_share"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Share2 size={13} />
                <span>Nhận chia sẻ</span>
              </button>
            </div>

            {/* TAB 1: NHẬP MÃ TỪ MÁY CON (Kid-First Onboarding - DUY NHẤT) */}
            {activeTab === "from_kid" && (
              <div className="space-y-3.5 py-1">
                <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <UserCheck size={16} className="text-blue-600 shrink-0" />
                    <span>Quy trình ghép đôi an toàn 2 bước:</span>
                  </div>
                  <ol className="text-[11px] text-slate-600 space-y-1 pl-4 list-decimal">
                    <li>
                      Mở app <strong>KidCare</strong> trên máy con, tạo hồ sơ và lấy <strong>mã 6 số</strong> (hiệu lực 15 phút, dùng 1 lần).
                    </li>
                    <li>
                      Nhập 6 số vào ô dưới rồi nhấn <strong>Gửi Yêu Cầu Kết Nối</strong>.
                    </li>
                    <li>
                      Bấm <strong>[Chấp nhận]</strong> trên màn hình máy con để hoàn tất.
                    </li>
                  </ol>
                </div>

                <form onSubmit={handleSendPairingRequest} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mã 6 số trên màn hình máy con:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={7}
                      value={kidCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9\s]/g, "");
                        setKidCode(val);
                        setKidError(null);
                      }}
                      placeholder="VD: 852 147"
                      className="w-full text-center text-2xl font-black font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 shadow-inner"
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-400 text-center mt-1">
                      ⏱️ Mã có hiệu lực 15 phút và chỉ dùng được 1 lần.
                    </p>
                  </div>

                  {kidError && (
                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{kidError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isRequesting || kidCode.replace(/\s+/g, "").length !== 6}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    {isRequesting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang gửi yêu cầu tới máy con...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Gửi Yêu Cầu Kết Nối</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: NHẬN MÃ CHIA SẺ TỪ PHỤ HUYNH KHÁC */}
            {activeTab === "from_share" && (
              <div className="space-y-3.5 py-1">
                <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Share2 size={16} className="text-indigo-600 shrink-0" />
                    <span>Nhận quyền quản lý từ người thân:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Nếu người thân khác trong gia đình đã kết nối với máy con và chia sẻ mã 6 số cho
                    bạn, hãy nhập mã vào ô bên dưới.
                  </p>
                </div>

                <form onSubmit={handleAcceptShareCode} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Mã chia sẻ 6 số:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={7}
                      value={shareCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9\s]/g, "");
                        setShareCode(val);
                        setShareError(null);
                      }}
                      placeholder="VD: 654 321"
                      className="w-full text-center text-2xl font-black font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 shadow-inner"
                      autoFocus
                    />
                  </div>

                  {shareError && (
                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{shareError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAcceptingShare || shareCode.replace(/\s+/g, "").length !== 6}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    {isAcceptingShare ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xác nhận mã chia sẻ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Nhận quyền quản lý bé</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
