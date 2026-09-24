import React, { useState, useRef } from "react";
import {
  X,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { submitChildPairingCode, getKidDevicePairedInfo } from "@shared/firebase/pairingService";
import { fireSafeConfetti, resetSafeConfetti } from "@shared/utils/safeConfetti";
import { getNativeDeviceInfo, getNativeBatteryInfo } from "./services/nativePermissionsService";

interface KidPairingModalProps {
  onClose: () => void;
  onPairedSuccess: (parentName: string, childName: string) => void;
}

export const KidPairingModal: React.FC<KidPairingModalProps> = ({
  onClose,
  onPairedSuccess,
}) => {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = clean;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto move to next box
    if (clean && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 6) {
        inputRefs[5].current?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const [hwInfo, batInfo] = await Promise.all([
        getNativeDeviceInfo().catch(() => null),
        getNativeBatteryInfo().catch(() => null),
      ]);
      const activeDevId = hwInfo?.hardwareId || ('dev_' + Date.now());
      const activeDevName = hwInfo?.deviceName || `${hwInfo?.manufacturer || ''} ${hwInfo?.model || ''}`.trim() || 'Thiết bị của con';
      const realBattery = (batInfo && typeof batInfo.level === 'number' && batInfo.level >= 0) ? batInfo.level : 100;

      const res = await submitChildPairingCode(code, {
        deviceId: activeDevId,
        hardwareIdType: (hwInfo?.hardwareIdType as any) || 'android_id',
        deviceName: activeDevName,
        model: hwInfo?.model || (typeof navigator !== 'undefined' ? navigator.platform : 'Android Device'),
        manufacturer: hwInfo?.manufacturer || 'Android',
        androidId: hwInfo?.androidId,
        serial: hwInfo?.serial,
        mac: hwInfo?.mac,
        imei: hwInfo?.imei,
        phoneNumber: hwInfo?.phoneNumber,
        osVersion: hwInfo?.osVersion || 'Android',
        battery: realBattery,
      });

      if (res.success && res.session) {
        fireSafeConfetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
        resetSafeConfetti();
        onPairedSuccess(res.session.parentName, res.session.childName);
        onClose();
      } else {
        setErrorMsg(res.error || "Mã không đúng hoặc đã hết hạn.");
      }
    } catch (err) {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const pairedInfo = getKidDevicePairedInfo();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Liên Kết Với Cha Mẹ</h3>
              <p className="text-[11px] text-slate-500 font-medium">Nhập mã PIN 6 số từ máy Phụ Huynh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {pairedInfo?.isPaired && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center space-x-2.5 text-xs text-emerald-800">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Thiết bị đang được quản lý bởi:</p>
              <p className="text-[11px] text-emerald-700">{pairedInfo.parentName} ({pairedInfo.childName})</p>
            </div>
          </div>
        )}

        <div className="space-y-3 text-center">
          <p className="text-xs text-slate-600 font-medium">
            Nhìn vào màn hình máy Bố/Mẹ và nhập dãy số ghép đôi:
          </p>

          {/* 6-box input */}
          <div className="flex justify-center gap-2 py-2" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-11 h-13 text-center text-2xl font-black rounded-2xl border transition-all focus:outline-none ${
                  digit
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-400 focus:bg-white"
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 animate-shake">{errorMsg}</p>
          )}

          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span>Đang kết nối Cloud...</span>
            ) : (
              <>
                <span>Xác Nhận Ghép Đôi</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
