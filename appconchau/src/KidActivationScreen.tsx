import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Heart,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  ChevronLeft,
  Smile,
  Calendar,
  CheckCircle2,
  Loader2,
  Clock,
  Radio,
  X,
  AlertCircle,
  Smartphone,
  Tag,
  LogOut,
  Plus,
  Users,
} from 'lucide-react';
import { safeCopyToClipboard } from '@shared/utils/clipboard';
import {
  getNativeDeviceInfo,
  DeviceHardwareInfo,
} from './services/nativePermissionsService';
import {
  createKidInitiatedPairingCode,
  getKidPendingPairing,
  approveParentPairing,
  rejectParentPairing,
  saveKidDevicePairedInfo,
  KidPairedInfo,
  PairingSession,
} from '@shared/firebase/pairingService';
import {
  loginKidWithGoogle,
  fetchChildrenForParentAccount,
  createChildForParentAccount,
  getCurrentKidLoggedUser,
  logoutKidAccount,
  getFirebaseInstance,
  ParentAccount,
} from '@shared/firebase/firebaseService';
import { registerChildDeviceInCloud } from '@shared/firebase/cloudSyncService';
import { ChildDeviceInfo } from '@shared/types';
import { isSimulatorMode } from '@shared/store';
import { isFirebaseConfigured } from '@shared/firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref as rtdbRef, onValue as rtdbOnValue } from 'firebase/database';
import confetti from 'canvas-confetti';

interface KidActivationScreenProps {
  onActivationComplete: (parentName: string, childName: string) => void;
}

const KID_AVATAR_PRESETS = [
  { id: 'av_1', title: 'Bé Trai', emoji: '👦', url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_2', title: 'Bé Gái', emoji: '👧', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_3', title: 'Siêu Nhân', emoji: '🦸‍♂️', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_4', title: 'Công Chúa', emoji: '👸', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_5', title: 'Vui Vẻ', emoji: '🧒', url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_6', title: 'Thông Thái', emoji: '👓', url: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_7', title: 'Mèo Con', emoji: '🐱', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=180&auto=format&fit=crop&q=80' },
  { id: 'av_8', title: 'Cún Cưng', emoji: '🐶', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=180&auto=format&fit=crop&q=80' },
];

export const KidActivationScreen: React.FC<KidActivationScreenProps> = ({
  onActivationComplete,
}) => {
  const [mode, setMode] = useState<'auth_choice' | 'select_child' | 'create_child' | 'kid_setup' | 'waiting_parent'>('auth_choice');

  // Google Logged In Parent / Child account
  const [loggedUser, setLoggedUser] = useState<ParentAccount | null>(() => getCurrentKidLoggedUser());
  const [availableChildren, setAvailableChildren] = useState<Array<{ id: string; name: string; age?: number; grade?: string; avatar?: string }>>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Kid profile form state
  const [childName, setChildName] = useState('');
  const [birthYear, setBirthYear] = useState<number>(2017);
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [avatar, setAvatar] = useState(KID_AVATAR_PRESETS[0].url);

  // Device hardware information state
  const [deviceInfo, setDeviceInfo] = useState<DeviceHardwareInfo | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');

  // Active kid-initiated pairing session
  const [session, setSession] = useState<PairingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 15-minute countdown timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Approval confirmation modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingParentName, setPendingParentName] = useState<string>('Bố/Mẹ');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const currentYear = new Date().getFullYear();
  const validBirthYear = Number(birthYear) || 2017;
  const calculatedAge = Math.max(1, currentYear - validBirthYear);

  const getDeviceModel = () => {
    if (typeof navigator === 'undefined') return 'Android Device';
    const ua = navigator.userAgent;
    if (/samsung/i.test(ua)) return 'Samsung Galaxy';
    if (/redmi|xiaomi/i.test(ua)) return 'Xiaomi';
    if (/oppo/i.test(ua)) return 'Oppo';
    if (/pixel/i.test(ua)) return 'Google Pixel';
    return 'Android Device';
  };

  // Auto fetch real Android hardware info (IMEI, MAC, Serial, Phone Number)
  useEffect(() => {
    getNativeDeviceInfo().then((info) => {
      setDeviceInfo(info);
      setDeviceName(info.deviceName || `${info.manufacturer} ${info.model}`.trim() || 'Điện thoại của con');
    });
  }, []);

  // Check if there is already a pending pairing session saved on this device
  useEffect(() => {
    const existing = getKidPendingPairing();
    if (existing && existing.code && Date.now() < existing.expiresAt) {
      setSession(existing);
      setChildName(existing.childName || '');
      if (existing.childBirthYear) setBirthYear(existing.childBirthYear);
      if (existing.childAvatar) setAvatar(existing.childAvatar);
      if (existing.childGender) setGender(existing.childGender);
      const remaining = Math.max(0, Math.floor((existing.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setMode('waiting_parent');
    }
  }, []);

  // Check if user was already signed in with Google
  useEffect(() => {
    if (loggedUser && mode === 'auth_choice') {
      loadChildrenForAccount(loggedUser.uid);
    }
  }, [loggedUser]);

  const loadChildrenForAccount = async (uid: string) => {
    setLoadingChildren(true);
    setErrorMsg(null);
    try {
      const list = await fetchChildrenForParentAccount(uid);
      setAvailableChildren(list);
      if (list.length > 0) {
        setSelectedChildId(list[0].id);
        const autoName = `${deviceInfo?.model || 'Điện thoại'} - ${list[0].name}`;
        setDeviceName(autoName);
        setMode('select_child');
      } else {
        setMode('create_child');
      }
    } catch (e) {
      console.warn('loadChildrenForAccount error:', e);
      setMode('create_child');
    } finally {
      setLoadingChildren(false);
    }
  };

  // 15-minute countdown timer when in waiting_parent mode
  useEffect(() => {
    if (mode !== 'waiting_parent' || !session?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setErrorMsg('Mã kết nối đã hết hạn (15 phút). Vui lòng bấm [Tạo mã mới khác].');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, session?.expiresAt]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Google Sign-In Action
  const handleGoogleSignIn = async () => {
    setLoadingGoogle(true);
    setErrorMsg(null);
    try {
      const res = await loginKidWithGoogle();
      if (res.success && res.user) {
        setLoggedUser(res.user);
        await loadChildrenForAccount(res.user.uid);
      } else {
        setErrorMsg(res.error || 'Đăng nhập Google không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi kết nối khi xác thực Google. Vui lòng kiểm tra Internet.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleLogoutAccount = () => {
    logoutKidAccount();
    setLoggedUser(null);
    setAvailableChildren([]);
    setMode('auth_choice');
  };

  // Activate device for selected existing child
  const handleActivateSelectedChild = async () => {
    if (!loggedUser || !selectedChildId) return;
    const targetChild = availableChildren.find((c) => c.id === selectedChildId);
    if (!targetChild) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const hwInfo = deviceInfo || (await getNativeDeviceInfo());
      const activeDevId = hwInfo.hardwareId || ('dev_' + Date.now());
      const activeDevName = (deviceName.trim() || `${hwInfo.manufacturer} ${hwInfo.model}`.trim() || `Điện thoại của ${targetChild.name}`);

      const childDevice: ChildDeviceInfo = {
        deviceId: activeDevId,
        id: activeDevId,
        hardwareIdType: hwInfo.hardwareIdType || 'android_id',
        deviceName: activeDevName,
        model: hwInfo.model || getDeviceModel(),
        manufacturer: hwInfo.manufacturer || 'Android',
        phoneNumber: hwInfo.phoneNumber,
        imei: hwInfo.imei,
        mac: hwInfo.mac,
        serial: hwInfo.serial,
        androidId: hwInfo.androidId,
        osVersion: hwInfo.osVersion || 'Android',
        battery: 100,
        status: 'online',
        pairedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isPrimary: true,
      };

      await registerChildDeviceInCloud(loggedUser.uid, targetChild.id, childDevice);

      const kidPairedInfo: KidPairedInfo = {
        isPaired: true,
        parentId: loggedUser.uid,
        parentName: loggedUser.displayName || 'Bố/Mẹ',
        childId: targetChild.id,
        childName: targetChild.name,
        childAge: targetChild.age,
        childAvatar: targetChild.avatar,
        pairedAt: new Date().toISOString(),
        deviceId: activeDevId,
        deviceName: activeDevName,
        model: childDevice.model,
        manufacturer: childDevice.manufacturer,
        serial: childDevice.serial,
        phoneNumber: childDevice.phoneNumber,
      };

      saveKidDevicePairedInfo(kidPairedInfo);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        onActivationComplete(loggedUser.displayName || 'Bố/Mẹ', targetChild.name);
      }, 500);
    } catch (e: any) {
      console.error('handleActivateSelectedChild error:', e);
      setErrorMsg('Không thể kích hoạt thiết bị. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Create new child profile under Google account and activate device
  const handleCreateNewChildAndActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loggedUser) return;
    if (!childName.trim()) {
      setErrorMsg('Vui lòng nhập tên của bé.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const createdChild = await createChildForParentAccount(loggedUser.uid, loggedUser.displayName || 'Bố/Mẹ', {
        name: childName.trim(),
        birthYear: validBirthYear,
        age: calculatedAge,
        avatar,
        gender,
      });

      const hwInfo = deviceInfo || (await getNativeDeviceInfo());
      const activeDevId = hwInfo.hardwareId || ('dev_' + Date.now());
      const activeDevName = (deviceName.trim() || `${hwInfo.manufacturer} ${hwInfo.model}`.trim() || `Điện thoại của ${createdChild.name}`);

      const childDevice: ChildDeviceInfo = {
        deviceId: activeDevId,
        id: activeDevId,
        hardwareIdType: hwInfo.hardwareIdType || 'android_id',
        deviceName: activeDevName,
        model: hwInfo.model || getDeviceModel(),
        manufacturer: hwInfo.manufacturer || 'Android',
        phoneNumber: hwInfo.phoneNumber,
        imei: hwInfo.imei,
        mac: hwInfo.mac,
        serial: hwInfo.serial,
        androidId: hwInfo.androidId,
        osVersion: hwInfo.osVersion || 'Android',
        battery: 100,
        status: 'online',
        pairedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isPrimary: true,
      };

      await registerChildDeviceInCloud(loggedUser.uid, createdChild.id, childDevice);

      const kidPairedInfo: KidPairedInfo = {
        isPaired: true,
        parentId: loggedUser.uid,
        parentName: loggedUser.displayName || 'Bố/Mẹ',
        childId: createdChild.id,
        childName: createdChild.name,
        childAge: createdChild.age,
        childAvatar: createdChild.avatar,
        pairedAt: new Date().toISOString(),
        deviceId: activeDevId,
        deviceName: activeDevName,
        model: childDevice.model,
        manufacturer: childDevice.manufacturer,
        serial: childDevice.serial,
        phoneNumber: childDevice.phoneNumber,
      };

      saveKidDevicePairedInfo(kidPairedInfo);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        onActivationComplete(loggedUser.displayName || 'Bố/Mẹ', createdChild.name);
      }, 500);
    } catch (e: any) {
      console.error('handleCreateNewChildAndActivate error:', e);
      setErrorMsg('Không thể tạo hồ sơ cho bé. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Create profile and generate 6-digit code for parent
  const handleCreateProfileAndCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!childName.trim()) {
      setErrorMsg('Vui lòng nhập tên của bé (ví dụ: Bé Bắp, Minh Khôi...).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const activeDevName = (deviceName.trim() || deviceInfo?.deviceName || deviceInfo?.model || 'Thiết bị của con');
      const newSession = await createKidInitiatedPairingCode(
        {
          name: childName.trim(),
          birthYear: validBirthYear,
          age: calculatedAge,
          avatar,
          gender,
        },
        {
          deviceId: deviceInfo?.hardwareId || ('dev_' + Date.now()),
          hardwareIdType: deviceInfo?.hardwareIdType || 'imei',
          deviceName: activeDevName,
          model: deviceInfo?.model || getDeviceModel(),
          manufacturer: deviceInfo?.manufacturer || 'Android',
          phoneNumber: deviceInfo?.phoneNumber || '',
          imei: deviceInfo?.imei || '',
          mac: deviceInfo?.mac || '',
          serial: deviceInfo?.serial || '',
          androidId: deviceInfo?.androidId || '',
          osVersion: deviceInfo?.osVersion || 'Android 14',
        }
      );

      setSession(newSession);
      const remaining = Math.max(0, Math.floor((newSession.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setMode('waiting_parent');
    } catch (err) {
      setErrorMsg('Không thể tạo mã kết nối. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Real-time listener waiting for Parent to connect or send approval request
  useEffect(() => {
    if (mode !== 'waiting_parent' || !session?.code) return;
    const { db, rtdb } = getFirebaseInstance();

    const handleDataUpdate = (data: any) => {
      if (!data) return;
      if (data.status === 'pending_approval') {
        setPendingParentName(data.parentName || 'Bố/Mẹ');
        setShowApprovalModal(true);
      } else if (data.status === 'paired') {
        setShowApprovalModal(false);
        // ✅ FIX BUG #1: Save paired info BEFORE calling onActivationComplete
        // Without this, getKidDevicePairedInfo() returns null and app stays stuck on ActivationScreen
        try {
          const pairedData: KidPairedInfo = {
            isPaired: true,
            parentId: data.parentId || 'family_primary',
            parentName: data.parentName || 'Bố/Mẹ',
            childId: session.childId || data.childId || '',
            childName: session.childName || data.childName || '',
            childAge: session.childAge || data.childAge,
            childAvatar: session.childAvatar || data.childAvatar,
            pairedAt: new Date().toISOString(),
            deviceId: deviceInfo?.hardwareId || ('dev_' + Date.now()),
            deviceName: deviceInfo?.deviceName,
            model: deviceInfo?.model,
            manufacturer: deviceInfo?.manufacturer,
            sessionToken: data.sessionToken,
          };
          saveKidDevicePairedInfo(pairedData);
        } catch (e) {
          console.warn('Failed to save paired info from listener:', e);
        }
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
        setTimeout(() => {
          onActivationComplete(data.parentName || 'Bố/Mẹ', session.childName);
        }, 1000);
      }
    };

    let unsubRtdb: (() => void) | null = null;
    if (isFirebaseConfigured() && rtdb) {
      try {
        unsubRtdb = rtdbOnValue(rtdbRef(rtdb, `pairings/${session.code}`), (snap) => {
          if (snap.exists()) {
            handleDataUpdate(snap.val());
          }
        });
      } catch (e) {
        console.warn('RTDB listener error:', e);
      }
    }

    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        unsubFirestore = onSnapshot(doc(db, 'pairings', session.code), (snap) => {
          if (snap.exists()) {
            handleDataUpdate(snap.data());
          }
        }, (error) => {
          console.warn('Firestore pairing snapshot error:', error?.message || error);
        });
      } catch (e) {
        console.warn('Firestore listener error:', e);
      }
    }

    // LocalStorage polling fallback for demo/offline test on same device
    const pollTimer = setInterval(() => {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem('parent_pro_pairing_sessions');
      if (raw) {
        try {
          const sessions = JSON.parse(raw);
          const s = sessions[session.code];
          if (s) handleDataUpdate(s);
        } catch (_) {}
      }
    }, 1500);

    return () => {
      if (unsubRtdb) unsubRtdb();
      if (unsubFirestore) unsubFirestore();
      clearInterval(pollTimer);
    };
  }, [mode, session?.code, onActivationComplete]);

  // Kid clicks "Chấp nhận" to finalize pairing
  const handleApprove = async () => {
    if (!session?.code) return;
    setIsApproving(true);
    setErrorMsg(null);
    try {
      const res = await approveParentPairing(session.code);
      if (res.success) {
        setShowApprovalModal(false);
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
        setTimeout(() => {
          onActivationComplete(pendingParentName, session.childName);
        }, 800);
      } else {
        setErrorMsg(res.error || 'Lỗi xác nhận. Vui lòng thử lại.');
      }
    } catch (e) {
      setErrorMsg('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsApproving(false);
    }
  };

  // Kid clicks "Từ chối"
  const handleReject = async () => {
    if (!session?.code) return;
    setIsRejecting(true);
    try {
      await rejectParentPairing(session.code);
      setShowApprovalModal(false);
      setErrorMsg('Bạn đã từ chối yêu cầu kết nối từ ' + pendingParentName);
    } catch (e) {
      setShowApprovalModal(false);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCopyCode = () => {
    if (session?.code) {
      safeCopyToClipboard(session.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedCode = session?.code
    ? `${session.code.slice(0, 3)} ${session.code.slice(3)}`
    : '------';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col p-4 select-none relative overflow-y-auto">
      {/* Status Bar Spacer */}
      {!isSimulatorMode() && (
        <div
          className="w-full shrink-0 bg-transparent pointer-events-none"
          style={{ height: 'var(--status-bar-height, 42px)' }}
        />
      )}

      {/* Background ambient accents */}
      <div className="fixed -top-24 -left-24 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="pt-2 pb-3 text-center relative z-10">
        <div
          style={{ backgroundColor: '#2563eb' }}
          className="w-13 h-13 mx-auto rounded-2xl shadow-md flex items-center justify-center text-white mb-1.5 ring-4 ring-blue-100"
        >
          <ShieldCheck size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-lg font-black tracking-tight text-slate-900">KidCare – Máy Con</h1>
        <p className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1">
          <Heart size={11} className="text-rose-500 fill-rose-500" />
          Bảo vệ an toàn & kết nối cùng Bố Mẹ
        </p>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-sm mx-auto w-full relative z-10 pb-8">
        {mode === 'auth_choice' && (
          /* =========================================================================
             CHOICE: GOOGLE SIGN-IN OR 6-DIGIT CODE
             ========================================================================= */
          <div className="space-y-4 animate-in fade-in">
            {/* Device Identity Badge */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      {deviceInfo?.deviceName || deviceInfo?.model || getDeviceModel()}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {deviceInfo?.hardwareId ? `${deviceInfo.hardwareId.slice(0, 16)}...` : 'Tự nhận diện'}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Máy riêng
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-snug">
                💡 Mỗi máy được đăng ký độc lập trong tài khoản gia đình. Bé có thể dùng nhiều máy hoặc dùng chung tài khoản với Bố Mẹ.
              </p>
            </div>

            {/* Google Sign In Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black">
                  <Sparkles size={12} />
                  KHUYÊN DÙNG (NHANH & TỰ ĐỒNG BỘ)
                </span>
                <h2 className="text-base font-black text-slate-900">Đăng Nhập Tài Khoản Google</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sử dụng tài khoản Google của <strong>Bố/Mẹ</strong> hoặc của <strong>Con</strong>. Sau khi đăng nhập, bạn chọn bé sẽ sở hữu chiếc điện thoại này.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold text-center flex items-center gap-2 justify-center">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loadingGoogle}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-black text-sm rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                {loadingGoogle ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <span>Đang xác thực Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Tiếp tục với Google</span>
                    <ArrowRight size={16} className="text-slate-400" />
                  </>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  HOẶC KẾT NỐI KHÔNG CẦN TÀI KHOẢN
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => setMode('kid_setup')}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound size={16} className="text-amber-500" />
                <span>Ghép đôi bằng mã 6 số (15 phút)</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'select_child' && loggedUser && (
          /* =========================================================================
             SELECT CHILD UNDER GOOGLE ACCOUNT
             ========================================================================= */
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in">
            {/* Account Info Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm ring-2 ring-blue-50 shrink-0">
                  {loggedUser.displayName?.charAt(0) || 'G'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {loggedUser.displayName || 'Tài khoản Google'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{loggedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogoutAccount}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                title="Đổi tài khoản"
              >
                <LogOut size={14} />
                <span>Đổi TK</span>
              </button>
            </div>

            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black">
                <Users size={12} />
                BƯỚC 2: CHỌN HỒ SƠ CỦA BÉ
              </span>
              <h2 className="text-base font-black text-slate-900">Chiếc Máy Này Của Bé Nào?</h2>
              <p className="text-xs text-slate-500">
                Chọn hồ sơ bé sẽ sử dụng chiếc điện thoại này:
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            {/* List of Available Children */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {availableChildren.map((childItem) => {
                const isSelected = selectedChildId === childItem.id;
                return (
                  <button
                    type="button"
                    key={childItem.id}
                    onClick={() => {
                      setSelectedChildId(childItem.id);
                      setDeviceName(`${deviceInfo?.model || 'Điện thoại'} - ${childItem.name}`);
                    }}
                    style={{
                      borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    }}
                    className={`w-full p-3 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500/20 shadow-xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={childItem.avatar || KID_AVATAR_PRESETS[0].url}
                        alt={childItem.name}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {childItem.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          {childItem.age ? `${childItem.age} tuổi` : childItem.grade || 'Học sinh'}
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Device Name input */}
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Smartphone size={14} className="text-blue-600" />
                  <span>Tên hiển thị của máy này:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID: {deviceInfo?.hardwareId ? `${deviceInfo.hardwareId.slice(0, 10)}...` : 'Tự nhận diện'}
                </span>
              </div>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="VD: Samsung của bé..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Confirm Activate Button */}
            <button
              type="button"
              onClick={handleActivateSelectedChild}
              disabled={loading || !selectedChildId}
              style={{
                backgroundColor: !selectedChildId ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
              }}
              className="w-full py-3.5 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-blue-500/25 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>Đang đăng ký thiết bị...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>KÍCH HOẠT MÁY NÀY CHO BÉ</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Add new child button */}
            <button
              type="button"
              onClick={() => {
                setChildName('');
                setMode('create_child');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} className="text-blue-600" />
              <span>Thêm hồ sơ bé khác vào tài khoản này</span>
            </button>
          </div>
        )}

        {(mode === 'kid_setup' || mode === 'create_child') && (
          /* =========================================================================
             PROFILE CREATION FORM (FOR 6-DIGIT CODE OR NEW GOOGLE CHILD)
             ========================================================================= */
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in">
            {/* Top Return Button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (mode === 'create_child' && availableChildren.length > 0) {
                    setMode('select_child');
                  } else {
                    setMode('auth_choice');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>Quay lại</span>
              </button>
              {mode === 'create_child' && loggedUser && (
                <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                  TK: {loggedUser.email}
                </span>
              )}
            </div>

            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black">
                <Sparkles size={12} />
                {mode === 'create_child' ? 'HỒ SƠ BÉ MỚI' : 'BƯỚC 1: TẠO HỒ SƠ CỦA CON'}
              </span>
              <h2 className="text-base font-black text-slate-900">
                {mode === 'create_child' ? 'Thêm Hồ Sơ Của Bé' : 'Nhập Thông Tin Của Bé'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {mode === 'create_child'
                  ? 'Hồ sơ sẽ được lưu vào tài khoản Google và thiết bị này sẽ được kích hoạt ngay.'
                  : 'Thông tin này sẽ được tự động gửi tới điện thoại Bố/Mẹ khi kết nối.'}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                if (mode === 'create_child') {
                  handleCreateNewChildAndActivate(e);
                } else {
                  handleCreateProfileAndCode(e);
                }
              }}
              className="space-y-4"
            >
              {/* 1. Avatar Selection */}
              <div className="space-y-2 text-center">
                <label className="text-xs font-bold text-slate-700 block">
                  Chọn ảnh đại diện của con:
                </label>

                {/* Big Preview */}
                <div className="w-18 h-18 mx-auto rounded-full ring-4 ring-blue-500/30 shadow-md p-1 bg-white relative">
                  <img
                    src={avatar}
                    alt={childName || 'Avatar'}
                    className="w-full h-full rounded-full object-cover"
                  />
                  <div
                    style={{ backgroundColor: '#2563eb' }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-white flex items-center justify-center shadow-xs"
                  >
                    <Smile size={13} />
                  </div>
                </div>

                {/* Presets Grid */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {KID_AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatar === preset.url;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => setAvatar(preset.url)}
                        style={{
                          borderColor: isSelected ? '#2563eb' : '#e2e8f0',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        }}
                        className={`p-1.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 cursor-pointer relative ${
                          isSelected ? 'ring-2 ring-blue-500/30 scale-102' : 'hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.title}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <span className="text-[9.5px] font-extrabold text-slate-700 leading-none">
                          {preset.emoji} {preset.title}
                        </span>
                        {isSelected && (
                          <span
                            style={{ backgroundColor: '#2563eb' }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center shadow-xs"
                          >
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Child Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Tên của con: <strong className="text-rose-500">*</strong></span>
                  <span className="text-[10.5px] font-normal text-slate-400">VD: Bé Bắp, Minh Khôi</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => {
                      setChildName(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Nhập tên bé..."
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-bold text-slate-900 bg-slate-50 focus:bg-white"
                    autoFocus
                  />
                  {childName.trim() && (
                    <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* 3. Birth Year & Age with Direct Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" />
                    <span>Năm sinh của con: <strong className="text-rose-500">*</strong></span>
                  </label>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-black">
                    👶 Bé {calculatedAge} tuổi
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBirthYear((prev) => Math.max(2005, prev - 1))}
                    className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                    title="Giảm năm sinh"
                  >
                    –
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min={2005}
                      max={currentYear}
                      value={birthYear || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setBirthYear(val);
                        } else {
                          setBirthYear(0);
                        }
                      }}
                      placeholder="VD: 2017"
                      className="w-full text-center font-black text-base py-2.5 px-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none text-slate-900 shadow-inner"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setBirthYear((prev) => Math.min(currentYear, prev + 1))}
                    className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                    title="Tăng năm sinh"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">Chọn nhanh:</span>
                  {[2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setBirthYear(yr)}
                      style={{
                        backgroundColor: birthYear === yr ? '#eff6ff' : '#f8fafc',
                        borderColor: birthYear === yr ? '#2563eb' : '#e2e8f0',
                        color: birthYear === yr ? '#1d4ed8' : '#475569',
                      }}
                      className="px-2 py-0.5 rounded-lg border text-[10.5px] font-bold shrink-0 cursor-pointer transition active:scale-95"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Gender Selection Cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Giới tính của bé: <strong className="text-rose-500">*</strong>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('boy')}
                    style={{
                      backgroundColor: gender === 'boy' ? '#2563eb' : '#f8fafc',
                      borderColor: gender === 'boy' ? '#1d4ed8' : '#e2e8f0',
                      color: gender === 'boy' ? '#ffffff' : '#334155',
                    }}
                    className={`py-3 px-3 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      gender === 'boy' ? 'ring-2 ring-blue-400/30' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">👦</span>
                    <span>Bé Trai</span>
                    {gender === 'boy' && <Check size={16} className="text-white ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGender('girl')}
                    style={{
                      backgroundColor: gender === 'girl' ? '#db2777' : '#f8fafc',
                      borderColor: gender === 'girl' ? '#be185d' : '#e2e8f0',
                      color: gender === 'girl' ? '#ffffff' : '#334155',
                    }}
                    className={`py-3 px-3 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      gender === 'girl' ? 'ring-2 ring-pink-400/30' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">👧</span>
                    <span>Bé Gái</span>
                    {gender === 'girl' && <Check size={16} className="text-white ml-0.5" />}
                  </button>
                </div>
              </div>

              {/* 5. Device Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-blue-600" />
                    <span>Thiết bị này của con:</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase">
                    {deviceInfo?.hardwareIdType ? `Gắn với ${deviceInfo.hardwareIdType.toUpperCase()}` : 'Tự nhận diện'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>Tên máy hiển thị cho Bố Mẹ:</span>
                    <span className="text-[10px] text-slate-400">VD: Máy Samsung, iPad...</span>
                  </div>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="VD: Điện thoại của con..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="space-y-1 text-[10.5px] text-slate-600 pt-0.5">
                  <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-500">Mã phần cứng:</span>
                    <span className="font-mono font-bold text-slate-800 truncate max-w-[170px]" title={deviceInfo?.hardwareId}>
                      {deviceInfo?.hardwareId || 'Đang nhận diện...'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic leading-tight">
                  💡 Mỗi máy có mã phần cứng riêng để con có thể đăng nhập trên nhiều máy mà không bị nhầm lẫn.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold text-center">
                  {errorMsg}
                </div>
              )}

              {/* 6. Submit Button */}
              <button
                type="submit"
                disabled={loading || !childName.trim()}
                style={{
                  backgroundColor: !childName.trim() ? '#94a3b8' : '#2563eb',
                  color: '#ffffff',
                }}
                className={`w-full py-3.5 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                  !childName.trim()
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:opacity-95 shadow-blue-500/30'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-white" />
                    <span>Đang lưu thông tin & kích hoạt...</span>
                  </>
                ) : mode === 'create_child' ? (
                  <>
                    <ShieldCheck size={18} />
                    <span>TẠO HỒ SƠ & KÍCH HOẠT MÁY NÀY</span>
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <KeyRound size={18} className="text-amber-300" />
                    <span>LƯU HỒ SƠ & TẠO MÃ (15 PHÚT)</span>
                    <ArrowRight size={18} className="text-white" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {mode === 'waiting_parent' && session && (
          /* =========================================================================
             STEP 2: DISPLAY 6-DIGIT CODE FOR PARENT TO CONNECT (15-MIN ONCE)
             ========================================================================= */
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4 animate-in zoom-in-95">
            {/* Child Profile Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5 rounded-2xl border border-blue-200 flex items-center space-x-3">
              <img
                src={avatar}
                alt={childName}
                className="w-13 h-13 rounded-full object-cover ring-2 ring-blue-500 shadow-xs shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-slate-900 truncate">{childName}</h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10.5px] font-black rounded-md">
                    {calculatedAge} tuổi
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-slate-600">
                    {gender === 'boy' ? '👦 Bé Trai' : '👧 Bé Gái'}
                  </span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] font-bold text-blue-700 truncate">
                    📱 {session.childDeviceInfo?.deviceName || session.childDeviceInfo?.model || getDeviceModel()}
                  </span>
                </div>
                {session.childDeviceInfo?.deviceId && (
                  <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                    Mã phần cứng: <span className="font-bold text-slate-700">{session.childDeviceInfo.deviceId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 6-Digit PIN Box */}
            <div
              style={{ backgroundColor: '#0f172a' }}
              className="text-white p-5 rounded-3xl text-center space-y-2 shadow-xl relative overflow-hidden"
            >
              <p className="text-[11px] text-indigo-300 uppercase font-extrabold tracking-wider">
                MÃ KẾT NỐI CHO CHA MẸ (MÃ 1 LẦN)
              </p>
              <div className="flex items-center justify-center gap-2 py-1">
                <span className="text-3xl font-black font-mono tracking-widest text-amber-400 drop-shadow-md">
                  {formattedCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-90 cursor-pointer"
                  title="Sao chép mã"
                >
                  {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </button>
              </div>

              {/* Countdown timer */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-bold pt-0.5">
                <Clock size={13} className="text-amber-400" />
                <span>Hiệu lực còn: <strong className="font-mono text-white text-sm">{formatTimer(timeLeft)}</strong></span>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-emerald-400 font-bold pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Đang chờ máy Cha Mẹ nhập mã...</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold text-center flex items-center gap-2 justify-center">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-2 text-xs text-slate-600 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
              <p className="font-black text-blue-900 text-xs">Cách kết nối với Bố Mẹ:</p>
              <div className="flex items-start gap-2 text-xs">
                <div
                  style={{ backgroundColor: '#2563eb' }}
                  className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5"
                >
                  1
                </div>
                <span>Mở app <strong>ParentPro (Cha Mẹ)</strong> ➔ Bấm <strong>"+ Thêm bé"</strong> 🔑</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <div
                  style={{ backgroundColor: '#2563eb' }}
                  className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5"
                >
                  2
                </div>
                <span>Nhập mã 6 số <strong className="text-blue-700 font-mono">{formattedCode}</strong> trên máy Cha Mẹ.</span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <div
                  style={{ backgroundColor: '#2563eb' }}
                  className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5"
                >
                  3
                </div>
                <span>Khi màn hình máy con hiện thông báo yêu cầu ghép đôi, hãy bấm <strong>[Chấp nhận]</strong>.</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('kid_setup')}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition active:scale-98 cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Sửa thông tin bé</span>
              </button>
              <button
                type="button"
                onClick={() => handleCreateProfileAndCode()}
                className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition active:scale-98 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Tạo mã mới khác</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMode('auth_choice')}
              className="w-full py-1 text-slate-500 hover:text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <span>← Quay lại chọn cách đăng nhập</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
         MODAL: KID CONFIRMATION PROMPT (REQUIREMENT: XÁC NHẬN CHA MẸ TRÊN MÁY CON)
         ========================================================================= */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border-2 border-blue-400 text-center space-y-4 animate-in zoom-in-95">
            <div className="relative w-16 h-16 mx-auto">
              <span className="absolute inset-0 rounded-full bg-blue-400/40 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center ring-4 ring-blue-50">
                <ShieldCheck size={36} />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10.5px] font-black uppercase tracking-wider">
                <Radio size={12} className="text-blue-600 animate-pulse" />
                YÊU CẦU GHÉP ĐÔI TỪ CHA MẸ
              </span>
              <h3 className="text-base font-black text-slate-900 pt-1">
                Xác Nhận Kết Nối Cha Mẹ?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed px-1">
                Phụ huynh <strong className="text-blue-700 font-black font-sans">"{pendingParentName}"</strong> đang gửi yêu cầu kết nối với thiết bị này.
              </p>
            </div>

            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-[11px] text-slate-700 text-left space-y-1">
              <p className="font-bold text-blue-900 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-blue-600" />
                Sau khi đồng ý, Bố Mẹ có thể:
              </p>
              <p className="pl-4">• Định vị bảo vệ an toàn cho con</p>
              <p className="pl-4">• Nhắc nhở giờ học tập & giải trí lành mạnh</p>
              <p className="pl-4">• Hỗ trợ cứu hộ khẩn cấp 24/7</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleReject}
                disabled={isRejecting || isApproving}
                className="py-3 px-3 rounded-xl border-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'Đang hủy...' : 'Từ chối'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/30 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang kết nối...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Chấp nhận</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400 font-semibold pb-2 relative z-10">
        KidCare v1.0 • MDM Protected Real-time Security
      </div>
    </div>
  );
};
