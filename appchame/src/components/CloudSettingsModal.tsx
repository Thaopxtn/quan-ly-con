import React, { useState } from "react";
import {
  X,
  Cloud,
  CheckCircle2,
  Shield,
  Key,
  Server,
  Zap,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink
} from "lucide-react";
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  isFirebaseConfigured,
  FirebaseProjectConfig,
  DEFAULT_FIREBASE_CONFIG,
} from "@shared/firebase/firebaseConfig";
import { getCurrentParentAccount } from "@shared/firebase/firebaseService";

interface CloudSettingsModalProps {
  onClose: () => void;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({ onClose }) => {
  const [config, setConfig] = useState<FirebaseProjectConfig>(getSavedFirebaseConfig());
  const [isCustomMode, setIsCustomMode] = useState(isFirebaseConfigured());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const parent = getCurrentParentAccount();

  const handleSave = () => {
    saveFirebaseConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  const handleResetDefault = () => {
    setConfig(DEFAULT_FIREBASE_CONFIG);
    saveFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    setIsCustomMode(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hạ Tầng Cloud & Backend</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Google Firebase & SaaS Multi-tenant
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

        {/* Current SaaS Plan Status Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Gói Dịch Vụ SaaS
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-black">
              PRO FAMILY (VĨNH VIỄN)
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <p className="text-slate-300">
              Chủ tài khoản: <strong className="text-white">{parent?.displayName || "Bố/Mẹ"}</strong>
            </p>
            <p className="text-slate-400 text-[11px]">
              Email: <span className="text-slate-300">{parent?.email}</span>
            </p>
            <p className="text-slate-400 text-[11px]">
              Tenant ID: <span className="font-mono text-indigo-300">{parent?.uid}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-slate-400 text-[10px]">Push Lệnh (FCM)</p>
              <p className="font-bold text-emerald-400">Không giới hạn</p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-slate-400 text-[10px]">Đồng bộ Real-time</p>
              <p className="font-bold text-blue-400">&lt; 100ms</p>
            </div>
          </div>
        </div>

        {/* Custom Firebase Credentials Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Tùy Biến Firebase Riêng</h4>
              <p className="text-[10px] text-slate-400">Dành cho cá nhân / đơn vị muốn tự host CSDL riêng</p>
            </div>
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                isCustomMode ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  isCustomMode ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {isCustomMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5 animate-in fade-in">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Firebase API Key:</label>
                <input
                  type="text"
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Project ID:</label>
                <input
                  type="text"
                  value={config.projectId}
                  onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                  placeholder="my-parent-app-123"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">App ID:</label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>{savedSuccess ? "Đã lưu!" : "Lưu cấu hình"}</span>
                </button>
                <button
                  onClick={handleResetDefault}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                  title="Đặt lại mặc định"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};
