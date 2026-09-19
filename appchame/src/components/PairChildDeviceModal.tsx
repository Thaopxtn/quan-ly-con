import React, { useState, useEffect, useRef } from "react";
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
  Radio,
  Copy,
  CheckCheck,
  Plus,
  User,
  Zap,
  CheckCircle2
} from "lucide-react";
import {
  createChildPairingCode,
  subscribePairingSession,
  requestPairingWithKidCode,
  loadChildDataFromCloud,
  PairingSession
} from "@shared/firebase/pairingService";
import { ChildDeviceInfo } from "@shared/types";
import { acceptShareCode } from "@shared/firebase/sharingService";
import { getCurrentParentAccount } from "@shared/firebase/firebaseService";
import { getActiveParentId, useAppState, syncAllChildrenFromCloud } from "@shared/store";
import confetti from "canvas-confetti";

interface PairChildDeviceModalProps {
  childId?: string;
  childName?: string;
  onClose: () => void;
  onSuccess?: (childId: string, childName: string) => void;
}

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150",
];

export const PairChildDeviceModal: React.FC<PairChildDeviceModalProps> = ({
  childId: propChildId,
  childName: propChildName,
  onClose,
  onSuccess,
}) => {
  const { state, addChild, addOrUpdateChildDevice } = useAppState();
  const currentParent = getCurrentParentAccount();

  // Tabs:
  // 1. 'parent_generate': Bố mẹ tạo mã PIN 6 số cho con nhập (CHÍNH - KHUYẾN NGHỊ)
  // 2. 'from_kid': Nhập mã do máy con tạo (Dự phòng)
  // 3. 'from_share': Nhận chia sẻ từ phụ huynh khác
  const [activeTab, setActiveTab] = useState<'parent_generate' | 'from_kid' | 'from_share'>('parent_generate');

  // Multi-device target mode: 'existing' or 'new'
  const initialChildId = propChildId || (state.children.length > 0 ? state.children[0].id : 'new');
  const [targetChildMode, setTargetChildMode] = useState<'existing' | 'new'>(
    initialChildId === 'new' || state.children.length === 0 ? 'new' : 'existing'
  );
  const [selectedChildId, setSelectedChildId] = useState<string>(
    initialChildId === 'new' ? '' : initialChildId
  );

  // New child form fields
  const [newChildName, setNewChildName] = useState(propChildName || '');
  const [newChildAge, setNewChildAge] = useState<number>(8);
  const [newChildGender, setNewChildGender] = useState<'boy' | 'girl'>('boy');
  const [newChildAvatar, setNewChildAvatar] = useState(DEFAULT_AVATARS[0]);

  // Tab 1 state: Generated PIN session for child to enter
  const [generatedSession, setGeneratedSession] = useState<PairingSession | null>(null);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [pinTimeLeft, setPinTimeLeft] = useState(15 * 60);
  const [copiedPin, setCopiedPin] = useState(false);

  // Tab 2 state: Parent enters kid's code
  const [kidCode, setKidCode] = useState('');
  const [isRequestingKidCode, setIsRequestingKidCode] = useState(false);
  const [kidCodeError, setKidCodeError] = useState<string | null>(null);
  const [isWaitingKidApproval, setIsWaitingKidApproval] = useState(false);
  const [pendingKidSession, setPendingKidSession] = useState<PairingSession | null>(null);
  const [kidCodeTimeLeft, setKidCodeTimeLeft] = useState(15 * 60);

  // Tab 3 state: Co-parent share
  const [shareCode, setShareCode] = useState('');
  const [isAcceptingShare, setIsAcceptingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Celebration state
  const [isPairedSuccess, setIsPairedSuccess] = useState(false);
  const [pairedChildSummary, setPairedChildSummary] = useState<{
    name: string;
    avatar?: string;
    age?: number;
    deviceModel?: string;
    deviceId?: string;
  } | null>(null);

  const selectedChildObj = state.children.find((c) => c.id === selectedChildId);

  // ─── Auto-generate PIN for Tab 1 ──────────────────────────────────────────
  const handleGeneratePin = async () => {
    setIsGeneratingPin(true);
    setCopiedPin(false);
    try {
      const parentId = currentParent?.uid || getActiveParentId();
      const parentName = currentParent?.displayName || "Bố/Mẹ";

      let finalChildId = selectedChildId;
      let finalChildName = selectedChildObj?.name || newChildName.trim() || "Bé yêu";
      let finalAge = selectedChildObj?.age || newChildAge || 8;
      let finalAvatar = selectedChildObj?.avatar || newChildAvatar;
      let finalBirthYear = selectedChildObj?.birthYear || (new Date().getFullYear() - finalAge);
      let finalGender = selectedChildObj ? undefined : newChildGender;

      if (targetChildMode === 'new' || !finalChildId) {
        finalChildId = 'child_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      }

      const session = await createChildPairingCode(
        parentId,
        parentName,
        finalChildId,
        finalChildName,
        {
          age: finalAge,
          birthYear: finalBirthYear,
          avatar: finalAvatar,
          gender: finalGender,
        }
      );

      setGeneratedSession(session);
      setPinTimeLeft(15 * 60);
    } catch (err) {
      console.error("Failed to generate child PIN:", err);
    } finally {
      setIsGeneratingPin(false);
    }
  };

  // Generate PIN on mount or when switching to existing child / setting new child
  useEffect(() => {
    if (activeTab === 'parent_generate' && !generatedSession && !isPairedSuccess) {
      handleGeneratePin();
    }
  }, [activeTab, targetChildMode, selectedChildId]);

  // Countdown timer for generated PIN (Tab 1)
  useEffect(() => {
    if (!generatedSession || activeTab !== 'parent_generate' || isPairedSuccess) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((generatedSession.expiresAt - Date.now()) / 1000));
      setPinTimeLeft(remaining);
      if (remaining <= 0) {
        // Expired
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [generatedSession, activeTab, isPairedSuccess]);

  // Countdown timer for waiting kid approval (Tab 2)
  useEffect(() => {
    if (!isWaitingKidApproval || !pendingKidSession) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pendingKidSession.expiresAt - Date.now()) / 1000));
      setKidCodeTimeLeft(remaining);
      if (remaining <= 0) {
        setIsWaitingKidApproval(false);
        setKidCodeError("Mã kết nối đã hết hạn. Vui lòng tạo mã mới trên máy con.");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isWaitingKidApproval, pendingKidSession]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Real-time listener when Kid enters the PIN (Tab 1) ───────────────────
  useEffect(() => {
    if (!generatedSession?.code || activeTab !== 'parent_generate' || isPairedSuccess) return;

    let isHandled = false;

    const finalizePinSuccess = async (session: PairingSession) => {
      if (isHandled) return;
      isHandled = true;

      const devData = session.childDeviceInfo;
      const deviceName = devData?.deviceName || devData?.model || "Điện thoại của con";
      const fullDevice: ChildDeviceInfo = {
        deviceId: devData?.deviceId || ("dev_" + session.childId),
        hardwareIdType: devData?.hardwareIdType || "android_id",
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
        battery: devData?.battery || 100,
        isPrimary: true,
      };

      const finalChildName = selectedChildObj?.name || session.childName || newChildName.trim() || "Bé yêu";
      const finalAvatar = selectedChildObj?.avatar || session.childAvatar || newChildAvatar;
      const finalAge = selectedChildObj?.age || session.childAge || newChildAge || 8;
      const finalBirthYear = selectedChildObj?.birthYear || session.childBirthYear || (new Date().getFullYear() - finalAge);

      if (targetChildMode === 'existing' && selectedChildId) {
        addOrUpdateChildDevice(selectedChildId, fullDevice);
        setPairedChildSummary({
          name: selectedChildObj?.name || finalChildName,
          avatar: selectedChildObj?.avatar || finalAvatar,
          age: selectedChildObj?.age || finalAge,
          deviceModel: `${deviceName} (${fullDevice.model})`,
          deviceId: fullDevice.deviceId,
        });
        if (onSuccess) onSuccess(selectedChildId, selectedChildObj?.name || finalChildName);
      } else {
        addChild({
          id: session.childId,
          name: finalChildName,
          avatar: finalAvatar,
          age: finalAge,
          birthYear: finalBirthYear,
          status: "online",
          battery: fullDevice.battery || 100,
          devices: [fullDevice],
          activeDeviceId: fullDevice.deviceId,
        });
        setPairedChildSummary({
          name: finalChildName,
          avatar: finalAvatar,
          age: finalAge,
          deviceModel: `${deviceName} (${fullDevice.model})`,
          deviceId: fullDevice.deviceId,
        });
        if (onSuccess) onSuccess(session.childId, finalChildName);
      }

      setIsPairedSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      syncAllChildrenFromCloud();

      setTimeout(() => {
        onClose();
      }, 3000);
    };

    const unsub = subscribePairingSession(generatedSession.code, (session) => {
      if (session && session.status === 'paired') {
        finalizePinSuccess(session);
      }
    });

    return () => unsub();
  }, [generatedSession?.code, activeTab, isPairedSuccess, targetChildMode, selectedChildId, selectedChildObj, newChildName, newChildAvatar, newChildAge]);

  // Copy PIN helper
  const handleCopyPin = () => {
    if (!generatedSession?.code) return;
    navigator.clipboard.writeText(generatedSession.code);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // ─── TAB 2: Parent sends request using Kid's 6-digit code ─────────────────
  const handleSendPairingRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = kidCode.replace(/\s+/g, "").trim();
    if (clean.length !== 6) {
      setKidCodeError("Vui lòng nhập đủ 6 chữ số hiển thị trên điện thoại của con.");
      return;
    }

    setIsRequestingKidCode(true);
    setKidCodeError(null);

    try {
      const parentId = currentParent?.uid || getActiveParentId();
      const parentName = currentParent?.displayName || "Bố/Mẹ";

      const res = await requestPairingWithKidCode(clean, parentId, parentName);

      if (!res.success || !res.session) {
        setIsRequestingKidCode(false);
        setKidCodeError(res.error || "Mã không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại!");
        return;
      }

      setPendingKidSession(res.session);
      const remaining = Math.max(0, Math.floor((res.session.expiresAt - Date.now()) / 1000));
      setKidCodeTimeLeft(remaining);
      setIsWaitingKidApproval(true);
    } catch (err: any) {
      setKidCodeError(err.message || "Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsRequestingKidCode(false);
    }
  };

  // Real-time listener for Tab 2 approval from Kid device
  useEffect(() => {
    if (!isWaitingKidApproval || !pendingKidSession?.code) return;
    const cleanCode = pendingKidSession.code;

    let isCompleted = false;

    const finalizeSuccess = async (data: any) => {
      if (isCompleted) return;
      isCompleted = true;

      const parentId = currentParent?.uid || getActiveParentId();
      let cloudData: Record<string, any> | null = null;
      try {
        cloudData = await loadChildDataFromCloud(parentId, pendingKidSession.childId);
      } catch (_) {}

      const childName = cloudData?.name || data?.childName || pendingKidSession.childName || "Bé yêu";
      const childAvatar = cloudData?.avatar || data?.childAvatar || pendingKidSession.childAvatar || DEFAULT_AVATARS[0];
      const childAge = cloudData?.age || data?.childAge || pendingKidSession.childAge || 8;
      const childBirthYear = cloudData?.birthYear || data?.childBirthYear || pendingKidSession.childBirthYear || new Date().getFullYear() - childAge;

      const devData = data?.childDeviceInfo || pendingKidSession.childDeviceInfo;
      const deviceName = devData?.deviceName || devData?.model || "Điện thoại của bé";
      const fullDevice: ChildDeviceInfo = {
        deviceId: devData?.deviceId || ("dev_" + pendingKidSession.childId),
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
        isPrimary: true,
      };

      if (targetChildMode === "existing" && selectedChildId) {
        addOrUpdateChildDevice(selectedChildId, fullDevice);
        setPairedChildSummary({
          name: selectedChildObj?.name || childName,
          avatar: selectedChildObj?.avatar || childAvatar,
          age: selectedChildObj?.age || childAge,
          deviceModel: `${deviceName} (${fullDevice.model})`,
        });
        if (onSuccess) onSuccess(selectedChildId, selectedChildObj?.name || childName);
      } else {
        addChild({
          id: pendingKidSession.childId,
          name: childName,
          avatar: childAvatar,
          age: childAge,
          birthYear: childBirthYear,
          status: "online",
          battery: 100,
          devices: [fullDevice],
          activeDeviceId: fullDevice.deviceId,
        });
        setPairedChildSummary({
          name: childName,
          avatar: childAvatar,
          age: childAge,
          deviceModel: `${deviceName} (${fullDevice.model})`,
        });
        if (onSuccess) onSuccess(pendingKidSession.childId, childName);
      }

      setIsWaitingKidApproval(false);
      setIsPairedSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      syncAllChildrenFromCloud();

      setTimeout(() => {
        onClose();
      }, 3000);
    };

    const unsub = subscribePairingSession(cleanCode, (session) => {
      if (session && session.status === 'paired') {
        finalizeSuccess(session);
      }
    });

    return () => unsub();
  }, [isWaitingKidApproval, pendingKidSession]);

  // ─── TAB 3: Connect using Co-Parent Share Code ─────────────────────────────
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
      const childAvatar = cloudData?.avatar || s.childAvatar || DEFAULT_AVATARS[0];
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
        deviceModel: "Được chia sẻ từ " + (s.fromParentName || "Phụ huynh khác"),
      });

      setIsPairedSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      syncAllChildrenFromCloud();

      if (onSuccess) onSuccess(s.childId, childName);

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setShareError(err.message || "Lỗi kết nối máy chủ. Vui lòng thử lại!");
    } finally {
      setIsAcceptingShare(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Kết Nối Máy Của Con</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Quản lý tập trung từ điện thoại cha mẹ
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3.5 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
              <Check size={36} strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-emerald-950">Ghép Đôi Thành Công!</h4>
              <p className="text-xs text-emerald-800 font-medium">
                Máy con đã kết nối và chuyển sang chế độ bảo vệ.
              </p>
            </div>

            {pairedChildSummary?.avatar && (
              <div className="flex justify-center my-2">
                <img
                  src={pairedChildSummary.avatar}
                  alt={pairedChildSummary.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-4 ring-emerald-400/40 shadow-sm"
                />
              </div>
            )}

            <div className="bg-white/80 rounded-2xl p-3 border border-emerald-200/80 text-left space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Hồ sơ bé:</span>
                <span className="text-emerald-700 font-extrabold">{pairedChildSummary?.name} ({pairedChildSummary?.age} tuổi)</span>
              </div>
              <div className="text-xs text-slate-600 flex items-center justify-between">
                <span>Thiết bị:</span>
                <span className="text-slate-800 font-bold truncate max-w-[170px]">{pairedChildSummary?.deviceModel || "Điện thoại của bé"}</span>
              </div>
              <div className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1 pt-1 border-t border-slate-100">
                <ShieldCheck size={13} />
                <span>Đang điều khiển & giám sát trực tiếp từ máy Cha Mẹ</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98 cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("parent_generate");
                  setKidCodeError(null);
                  setShareError(null);
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === "parent_generate"
                    ? "bg-white text-blue-700 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap size={13} className={activeTab === "parent_generate" ? "text-amber-500" : ""} />
                <span>Tạo mã cho con</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("from_kid");
                  setKidCodeError(null);
                  setShareError(null);
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === "from_kid"
                    ? "bg-white text-blue-700 shadow-xs font-black"
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
                  setKidCodeError(null);
                  setShareError(null);
                }}
                className={`py-2 rounded-xl transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  activeTab === "from_share"
                    ? "bg-white text-indigo-700 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Share2 size={13} />
                <span>Nhận chia sẻ</span>
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 1: BỐ MẸ TẠO MÃ KẾT NỐI CHO MÁY CON (PRIMARY FLOW)
                ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "parent_generate" && (
              <div className="space-y-3.5 py-1">
                {/* Child target picker */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Ghép thiết bị này cho:
                    </span>
                    {state.children.length > 0 && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetChildMode("existing");
                            setGeneratedSession(null);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                            targetChildMode === "existing"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          Bé đã có
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetChildMode("new");
                            setGeneratedSession(null);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                            targetChildMode === "new"
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          + Bé mới
                        </button>
                      </div>
                    )}
                  </div>

                  {targetChildMode === "existing" && state.children.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={selectedChildId}
                        onChange={(e) => {
                          setSelectedChildId(e.target.value);
                          setGeneratedSession(null);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {state.children.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.age} tuổi • {c.devices?.length || 1} máy đang gắn)
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 italic">
                        Một bé có thể gắn nhiều máy (máy 1, máy 2, máy tính bảng...).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                          Tên của bé:
                        </label>
                        <input
                          type="text"
                          value={newChildName}
                          onChange={(e) => setNewChildName(e.target.value)}
                          placeholder="Ví dụ: Bé An, Bé Bống..."
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                            Tuổi của bé:
                          </label>
                          <select
                            value={newChildAge}
                            onChange={(e) => setNewChildAge(Number(e.target.value))}
                            className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900"
                          >
                            {Array.from({ length: 15 }, (_, i) => i + 4).map((a) => (
                              <option key={a} value={a}>
                                {a} tuổi
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                            Giới tính:
                          </label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setNewChildGender("boy")}
                              className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition ${
                                newChildGender === "boy"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              👦 Nam
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewChildGender("girl")}
                              className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition ${
                                newChildGender === "girl"
                                  ? "bg-pink-600 text-white border-pink-600"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              👧 Nữ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* The Generated Code Display */}
                {isGeneratingPin ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <Loader2 size={28} className="animate-spin text-blue-600" />
                    <span className="text-xs text-slate-500 font-bold">Đang tạo mã kết nối bảo mật...</span>
                  </div>
                ) : generatedSession?.code ? (
                  <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-2 border-blue-200 rounded-3xl p-4 text-center space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                        <Radio size={11} className="text-blue-600 animate-pulse" />
                        MÃ KẾT NỐI MÁY CON
                      </span>
                      <span className="text-[11px] font-mono font-black text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                        <Clock size={12} />
                        {formatTimer(pinTimeLeft)}
                      </span>
                    </div>

                    {/* BIG 6 DIGITS */}
                    <div className="py-1">
                      <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-900 select-all flex items-center justify-center gap-2">
                        <span className="px-2.5 py-1.5 rounded-2xl bg-white border-2 border-blue-200 shadow-xs">
                          {generatedSession.code.slice(0, 3)}
                        </span>
                        <span className="text-slate-300 font-light">-</span>
                        <span className="px-2.5 py-1.5 rounded-2xl bg-white border-2 border-blue-200 shadow-xs">
                          {generatedSession.code.slice(3, 6)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        {copiedPin ? (
                          <>
                            <CheckCheck size={14} className="text-emerald-600" />
                            <span className="text-emerald-700">Đã chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} className="text-slate-500" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleGeneratePin}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Tạo mã 6 số khác"
                      >
                        <RefreshCw size={13} className="text-slate-500" />
                        <span>Đổi mã</span>
                      </button>
                    </div>

                    {/* Instructions Card */}
                    <div className="bg-white/90 rounded-2xl p-3 text-left space-y-1.5 border border-blue-100 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                        <Smartphone size={15} className="text-blue-600 shrink-0" />
                        <span>Chỉ cần 1 bước trên điện thoại con:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Mở app <strong>KidCare</strong> trên máy con ➔ Nhập <strong>{generatedSession.code}</strong> vào ô 6 số ➔ <strong>Xong ngay!</strong>
                      </p>
                      <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[10.5px] text-emerald-700 font-bold">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Không cần tài khoản Google • Không cần mật khẩu</span>
                      </div>
                    </div>

                    {/* Pulsing waiting radar */}
                    <div className="flex items-center justify-center gap-2 text-[11px] text-blue-700 font-medium pt-1">
                      <Loader2 size={13} className="animate-spin text-blue-600" />
                      <span>Đang chờ điện thoại của con nhập mã...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePin}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                  >
                    <Sparkles size={16} />
                    <span>Tạo Mã Kết Nối Mới</span>
                  </button>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 2: NHẬP MÃ DO MÁY CON TẠO (REVERSE FLOW)
                ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "from_kid" && (
              <div className="space-y-3.5 py-1">
                {isWaitingKidApproval && pendingKidSession ? (
                  <div className="space-y-4 py-2 text-center animate-in zoom-in-95">
                    <div className="relative w-16 h-16 mx-auto">
                      <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
                      <div className="relative w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-300 flex items-center justify-center text-blue-600 shadow-md">
                        <Smartphone size={26} className="animate-bounce" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10.5px] font-black uppercase tracking-wider">
                        <Radio size={12} className="text-blue-600 animate-pulse" />
                        ĐÃ GỬI YÊU CẦU GHÉP ĐÔI
                      </span>
                      <h4 className="text-sm font-black text-slate-900 pt-1">
                        Đang chờ bé "{pendingKidSession.childName}" xác nhận...
                      </h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Mở máy con và bấm nút{" "}
                        <strong className="text-blue-600 font-bold">[Chấp nhận]</strong> trên thông báo.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Thời gian còn lại:</span>
                      <span className="font-mono font-black text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        {formatTimer(kidCodeTimeLeft)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsWaitingKidApproval(false);
                        setPendingKidSession(null);
                        setKidCodeError(null);
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Hủy & nhập mã khác
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3 space-y-1.5">
                      <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                        <UserCheck size={16} className="text-blue-600 shrink-0" />
                        <span>Nhập mã 6 số hiển thị trên máy con:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Nếu bé đã mở app KidCare và đang hiển thị mã 6 số trên màn hình, hãy nhập vào đây.
                      </p>
                    </div>

                    <form onSubmit={handleSendPairingRequest} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={7}
                          value={kidCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9\s]/g, "");
                            setKidCode(val);
                            setKidCodeError(null);
                          }}
                          placeholder="VD: 852 147"
                          className="w-full text-center text-2xl font-black font-mono tracking-widest px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 shadow-inner"
                          autoFocus
                        />
                      </div>

                      {kidCodeError && (
                        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                          <AlertCircle size={15} className="shrink-0" />
                          <span>{kidCodeError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isRequestingKidCode || kidCode.replace(/\s+/g, "").length !== 6}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                      >
                        {isRequestingKidCode ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Đang gửi yêu cầu...</span>
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
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB 3: NHẬN MÃ CHIA SẺ TỪ PHỤ HUYNH KHÁC
                ══════════════════════════════════════════════════════════════════ */}
            {activeTab === "from_share" && (
              <div className="space-y-3.5 py-1">
                <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Share2 size={16} className="text-indigo-600 shrink-0" />
                    <span>Nhận quyền đồng quản lý từ người thân:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Nếu bố/mẹ khác trong gia đình đã kết nối với con và tạo mã chia sẻ 6 số, hãy nhập vào đây.
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
