import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Heart,
  Loader2,
  AlertCircle,
  Smartphone,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  getNativeDeviceInfo,
  getNativeBatteryInfo,
  DeviceHardwareInfo,
} from './services/nativePermissionsService';
import { clearRateLimit, submitChildPairingCode } from '@shared/firebase/pairingService';
import { ensureKidAnonymousAuth } from '@shared/firebase/firebaseService';
import { isSimulatorMode } from '@shared/store';
import { fireSafeConfetti, resetSafeConfetti } from '@shared/utils/safeConfetti';
import { serverApiClient } from '@shared/services/serverApiClient';

interface KidActivationScreenProps {
  onActivationComplete: (parentName: string, childName: string) => void;
}

export const KidActivationScreen: React.FC<KidActivationScreenProps> = ({
  onActivationComplete,
}) => {
  // Device hardware information state
  const [deviceInfo, setDeviceInfo] = useState<DeviceHardwareInfo | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');

  // 6-digit PIN input state for parent-initiated pairing (Sole activation flow)
  const [parentPinDigits, setParentPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmittingParentPin, setIsSubmittingParentPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const getDeviceModel = () => {
    if (typeof navigator === 'undefined') return 'Android Device';
    const ua = navigator.userAgent;
    if (/samsung/i.test(ua)) return 'Samsung Galaxy';
    if (/redmi|xiaomi/i.test(ua)) return 'Xiaomi';
    if (/oppo/i.test(ua)) return 'Oppo';
    if (/pixel/i.test(ua)) return 'Google Pixel';
    return 'Android Device';
  };

  // Server connection status state
  const [serverStatus, setServerStatus] = useState<{
    connected: boolean;
    url?: string;
    checking: boolean;
  }>({ connected: false, checking: true });

  const refreshServerConnection = async () => {
    setServerStatus((prev) => ({ ...prev, checking: true }));
    try {
      await serverApiClient.resolveServerUrlFromCloud(true);
      const health = await serverApiClient.checkHealth();
      setServerStatus({
        connected: health.ok,
        url: serverApiClient.getServerUrl(),
        checking: false,
      });
    } catch (_) {
      setServerStatus({ connected: false, checking: false });
    }
  };

  // Auto fetch real Android hardware info & resolve 4G server URL in background
  useEffect(() => {
    resetSafeConfetti();
    clearRateLimit(); // Immediately unlock any rate limits

    ensureKidAnonymousAuth().catch((err) => {
      console.warn('[KidActivation] ensureKidAnonymousAuth warning:', err);
    });
    getNativeDeviceInfo().then((info) => {
      setDeviceInfo(info);
      setDeviceName(info.deviceName || `${info.manufacturer} ${info.model}`.trim() || 'Điện thoại của con');
    });

    // Auto-fetch latest 4G URL & test health
    refreshServerConnection();
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...parentPinDigits];
    newDigits[index] = cleanVal;
    setParentPinDigits(newDigits);
    setPinError(null);

    if (cleanVal && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all 6 digits entered
    if (cleanVal && index === 5 && newDigits.every((d) => d.length === 1)) {
      handleConnectUsingParentCode(newDigits.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !parentPinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePastePin = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...parentPinDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setParentPinDigits(newDigits);
    setPinError(null);
    if (pasted.length === 6) {
      handleConnectUsingParentCode(pasted);
    } else {
      pinInputRefs.current[Math.min(5, pasted.length)]?.focus();
    }
  };

  const handleConnectUsingParentCode = async (codeToSubmit?: string) => {
    const code = (codeToSubmit || parentPinDigits.join('')).trim();
    if (code.length !== 6) {
      setPinError('Vui lòng nhập đủ 6 chữ số mã kết nối hiển thị trên máy Bố Mẹ.');
      return;
    }

    // Luôn mở khóa rate limit và đảm bảo cập nhật URL 4G mới nhất từ GitHub/jsDelivr
    clearRateLimit();
    await serverApiClient.resolveServerUrlFromCloud(true).catch(() => {});

    setIsSubmittingParentPin(true);
    setPinError(null);

    try {
      const [hwInfo, batInfo] = await Promise.all([
        deviceInfo ? Promise.resolve(deviceInfo) : getNativeDeviceInfo(),
        getNativeBatteryInfo().catch(() => ({ level: -1, isCharging: false })),
      ]);
      const activeDevName = (deviceName.trim() || `${hwInfo.manufacturer || ''} ${hwInfo.model}`.trim() || 'Điện thoại của con');
      const activeDevId = hwInfo.hardwareId || ('dev_' + Date.now());
      const realBattery = (batInfo && typeof batInfo.level === 'number' && batInfo.level >= 0) ? batInfo.level : 100;

      const res = await submitChildPairingCode(code, {
        deviceId: activeDevId,
        hardwareIdType: (hwInfo.hardwareIdType as any) || 'android_id',
        deviceName: activeDevName,
        model: hwInfo.model || getDeviceModel(),
        manufacturer: hwInfo.manufacturer || 'Android',
        androidId: hwInfo.androidId,
        serial: hwInfo.serial,
        mac: hwInfo.mac,
        imei: hwInfo.imei,
        phoneNumber: hwInfo.phoneNumber,
        osVersion: hwInfo.osVersion || 'Android',
        battery: realBattery,
      });

      if (res.success && res.session) {
        fireSafeConfetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        resetSafeConfetti();
        onActivationComplete(res.session!.parentName || 'Bố/Mẹ', res.session!.childName || 'Bé');
      } else {
        setPinError(res.error || 'Mã kết nối không chính xác hoặc đã hết hạn.');
      }
    } catch (e: any) {
      setPinError('Lỗi kết nối. Vui lòng kiểm tra Internet và thử lại.');
    } finally {
      setIsSubmittingParentPin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between px-4 py-4 select-none relative overflow-hidden">
      {/* Top status bar safe area on Android */}
      {!isSimulatorMode() && (
        <div
          className="w-full shrink-0 bg-transparent pointer-events-none"
          style={{ height: 'var(--status-bar-height, 42px)' }}
        />
      )}

      {/* Ambient background glows */}
      <div className="fixed -top-24 -left-24 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Branding */}
      <div className="pt-2 pb-3 text-center relative z-10">
        <div
          style={{ backgroundColor: '#2563eb' }}
          className="w-14 h-14 mx-auto rounded-3xl shadow-lg shadow-blue-500/25 flex items-center justify-center text-white mb-2 ring-4 ring-blue-100"
        >
          <ShieldCheck size={32} strokeWidth={2.3} />
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">KidCare – Máy Con</h1>
        <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1 mt-0.5">
          <Heart size={12} className="text-rose-500 fill-rose-500" />
          Bảo vệ an toàn & kết nối cùng Bố Mẹ
        </p>
      </div>

      {/* MAIN CONTAINER: SOLE 6-DIGIT PIN ENTRY FLOW */}
      <div className="max-w-sm mx-auto w-full relative z-10 pb-6 my-auto">
        <div className="space-y-4 animate-in fade-in">
          {/* Device Identity Pill */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Smartphone size={17} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">
                    {deviceInfo?.deviceName || deviceInfo?.model || getDeviceModel()}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {deviceInfo?.hardwareId ? `${deviceInfo.hardwareId.slice(0, 14)}...` : 'Tự nhận diện'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sẵn sàng
              </span>
            </div>
          </div>

          {/* Server Connection Status Pill */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-white/80 border border-slate-200/90 rounded-2xl shadow-2xs text-[11px]">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${serverStatus.checking ? 'bg-amber-400 animate-ping' : serverStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-semibold text-slate-700">
                {serverStatus.checking
                  ? 'Đang kết nối máy chủ...'
                  : serverStatus.connected
                  ? `Máy chủ: Đã kết nối (${serverStatus.url?.includes('192.168') ? 'Wi-Fi' : '4G'})`
                  : 'Chưa kết nối máy chủ PC'}
              </span>
            </div>
            <button
              type="button"
              onClick={refreshServerConnection}
              disabled={serverStatus.checking}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={11} className={serverStatus.checking ? 'animate-spin' : ''} />
              <span>{serverStatus.checking ? 'Đang thử...' : 'Làm mới'}</span>
            </button>
          </div>

          {/* PRIMARY HERO CARD: ENTER 6-DIGIT CODE FROM PARENT APP */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-black uppercase tracking-wider">
                <Sparkles size={12} />
                KẾT NỐI 1 CHẠM • NHẬP MÃ TỪ BỐ MẸ
              </span>
              <h2 className="text-base font-black text-slate-900 pt-1">
                Nhập Mã Kết Nối Từ Máy Bố Mẹ
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Nhìn mã 6 số hiển thị trên ứng dụng <strong>ParentPro của Bố Mẹ</strong> và nhập vào đây:
              </p>
            </div>

            {/* Error Message */}
            {pinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold text-center flex items-center gap-2 justify-center animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{pinError}</span>
              </div>
            )}

            {/* 6 Big PIN Digits Input */}
            <div className="flex justify-center items-center gap-2 sm:gap-2.5 py-1">
              {parentPinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { pinInputRefs.current[idx] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePastePin : undefined}
                  disabled={isSubmittingParentPin}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-hidden transition-all shadow-inner disabled:opacity-50"
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleConnectUsingParentCode()}
              disabled={isSubmittingParentPin || parentPinDigits.some((d) => !d)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmittingParentPin ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang kết nối vào máy Bố Mẹ...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>XÁC NHẬN & KẾT NỐI NGAY</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Simple Assurance Footer */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-bold">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>Kết nối trực tiếp 1 chạm • Không cần tài khoản</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10.5px] font-semibold text-slate-400 pb-2 relative z-10">
        Bảo mật dữ liệu 256-bit • Firebase Cloud Realtime
      </div>
    </div>
  );
};
