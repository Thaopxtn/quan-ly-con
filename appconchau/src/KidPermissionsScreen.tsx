import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Shield,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Lock,
  Eye,
  MapPin,
  BatteryCharging,
  Smartphone,
  Info,
  Clock,
  FileText,
  Activity,
  Zap,
  Calendar,
  Sliders
} from "lucide-react";
import { PrivacyPolicyModal } from "@shared/components/PrivacyPolicyModal";
import { Capacitor } from "@capacitor/core";
import { resetSafeConfetti } from "@shared/utils/safeConfetti";
import {
  checkRealAndroidPermissions,
  openAndroidPermissionSettings,
  requestAllNativeAppPermissions,
  PermissionSettingType,
  KidPermissionsStatus
} from "./services/nativePermissionsService";

interface KidPermissionsScreenProps {
  onBack: () => void;
}

interface PermissionItem {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  isGranted: boolean;
  instruction: string;
}

export const PERMISSIONS_STORAGE_KEY = "kidcare_permissions_state_v1";
export const PERMISSIONS_SNOOZE_KEY = "kidcare_permissions_dismissed_until";

const DEFAULT_CONFIG = [
  {
    id: "overlay",
    name: "Quyền Vẽ Đè Màn Hình (Display Over Other Apps)",
    desc: "Cho phép KidCare hiển thị màn hình khóa, thông điệp khẩn cấp và thử thách giải toán khi hết giờ dùng.",
    icon: <Eye size={20} />,
    iconBg: "bg-blue-100 text-blue-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền truy cập đặc biệt > Xuất hiện trên cùng > Bật KidCare.",
  },
  {
    id: "accessibility",
    name: "Dịch Vụ Trợ Năng (Accessibility Service)",
    desc: "Tự động nhận diện khi mở ứng dụng bị cấm (TikTok, Game) trong giờ học và chặn tức thì.",
    icon: <Lock size={20} />,
    iconBg: "bg-purple-100 text-purple-700",
    defaultGranted: false,
    instruction: "Cài đặt > Hỗ trợ tiếp cận (Trợ năng) > Ứng dụng đã tải xuống > KidCare > Bật.",
  },
  {
    id: "device_admin",
    name: "Quản Trị Viên Thiết Bị (Device Admin MDM)",
    desc: "Ngăn chặn việc tự ý gỡ cài đặt KidCare trái phép mà không có sự đồng ý của cha mẹ.",
    icon: <Shield size={20} />,
    iconBg: "bg-rose-100 text-rose-700",
    defaultGranted: false,
    instruction: "Cài đặt > Bảo mật & Quyền riêng tư > Quyền quản trị thiết bị > Kích hoạt KidCare.",
  },
  {
    id: "location",
    name: "Định Vị GPS Chạy Nền (Always Allow Location)",
    desc: "Gửi tọa độ vị trí thực tế của con về điện thoại cha mẹ và cảnh báo ra/vào vùng an toàn.",
    icon: <MapPin size={20} />,
    iconBg: "bg-emerald-100 text-emerald-700",
    defaultGranted: true,
    instruction: "Cài đặt > Vị trí > Quyền ứng dụng > KidCare > Chọn 'Luôn cho phép'.",
  },
  {
    id: "battery",
    name: "Bỏ Qua Tối Ưu Hóa Pin (No Battery Restrictions)",
    desc: "Giữ KidCare chạy ngầm ổn định 24/7, không bị Android tự động tắt khi màn hình khóa.",
    icon: <BatteryCharging size={20} />,
    iconBg: "bg-amber-100 text-amber-700",
    defaultGranted: true,
    instruction: "Cài đặt > Pin & Hiệu suất > Tiết kiệm pin ứng dụng > KidCare > Chọn 'Không giới hạn'.",
  },
  {
    id: "usage_stats",
    name: "Quyền Xem Thời Gian Sử Dụng (Usage Stats Access)",
    desc: "Cho phép cha mẹ xem thời lượng sử dụng máy và từng ứng dụng (YouTube, Game...) trong ngày.",
    icon: <Clock size={20} />,
    iconBg: "bg-indigo-100 text-indigo-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền truy cập đặc biệt > Truy cập dữ liệu sử dụng > KidCare > Cho phép.",
  },
  {
    id: "activity_recognition",
    name: "Quyền Sức Khỏe & Đếm Bước Chân (Health & Activity)",
    desc: "Nhận diện hoạt động thể chất và đếm số bước chân con di chuyển mỗi ngày để khuyến khích vận động.",
    icon: <Activity size={20} />,
    iconBg: "bg-cyan-100 text-cyan-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Hoạt động thể chất > KidCare > Cho phép.",
  },
  {
    id: "camera",
    name: "Quyền Bật Đèn Flash & Camera (Flashlight Alert)",
    desc: "Cho phép cha mẹ bật đèn flash từ xa để tìm máy trong phòng tối hoặc phát tín hiệu khẩn cấp.",
    icon: <Zap size={20} />,
    iconBg: "bg-yellow-100 text-yellow-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Máy ảnh > KidCare > Cho phép.",
  },
  {
    id: "calendar",
    name: "Quyền Lịch Biểu & Thời Gian Biểu (Calendar & Study)",
    desc: "Đồng bộ lịch học, bài tập về nhà và nhắc nhở thời gian biểu của con tự động từ cha mẹ.",
    icon: <Calendar size={20} />,
    iconBg: "bg-teal-100 text-teal-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Lịch > KidCare > Cho phép.",
  },
  {
    id: "write_settings",
    name: "Quyền Điều Chỉnh Âm Lượng & Độ Sáng (System Settings)",
    desc: "Cho phép cha mẹ điều chỉnh âm lượng loa và hạ độ sáng màn hình để bảo vệ thị lực con vào ban đêm.",
    icon: <Sliders size={20} />,
    iconBg: "bg-violet-100 text-violet-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền truy cập đặc biệt > Sửa đổi cài đặt hệ thống > Bật KidCare.",
  },
];

export const KidPermissionsScreen: React.FC<KidPermissionsScreenProps> = ({ onBack }) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>(() => {
    try {
      const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return DEFAULT_CONFIG.map((item) => ({
          ...item,
          isGranted: parsed[item.id] !== undefined ? !!parsed[item.id] : item.defaultGranted,
        }));
      }
    } catch (e) {}

    return DEFAULT_CONFIG.map((item) => ({
      ...item,
      isGranted: item.defaultGranted,
    }));
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const savePermissions = (updated: PermissionItem[]) => {
    try {
      const stateObj: Record<string, boolean> = {};
      updated.forEach((p) => {
        stateObj[p.id] = p.isGranted;
      });
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(stateObj));
    } catch (e) {}
  };

  // Auto sync with real Android permissions
  const syncWithNativePermissions = async () => {
    try {
      const realStatus = await checkRealAndroidPermissions();
      if (realStatus) {
        setPermissions((prev) => {
          const updated = prev.map((p) => {
            const val = realStatus[p.id as keyof KidPermissionsStatus];
            return typeof val === "boolean" ? { ...p, isGranted: val } : p;
          });
          setTimeout(() => savePermissions(updated), 0);
          return updated;
        });
      }
    } catch (e) {
      console.warn('syncWithNativePermissions error:', e);
    }
  };

  useEffect(() => {
    resetSafeConfetti();
    syncWithNativePermissions();

    const handleFocus = () => {
      syncWithNativePermissions();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const handlePermissionAction = async (perm: PermissionItem) => {
    if (Capacitor.isNativePlatform()) {
      showToast(`Đang mở Cài đặt Android cho quyền: ${perm.name}...`);
      await openAndroidPermissionSettings(perm.id as PermissionSettingType);
    } else {
      togglePermission(perm.id);
    }
  };

  const togglePermission = (id: string) => {
    setPermissions((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const next = !p.isGranted;
          showToast(next ? `✅ Đã xác nhận cấp quyền "${p.name}"` : `⚠️ Đã tắt quyền`);
          return { ...p, isGranted: next };
        }
        return p;
      });
      setTimeout(() => savePermissions(updated), 0);
      return updated;
    });
  };

  const grantAllPermissions = async () => {
    if (Capacitor.isNativePlatform()) {
      showToast("Đang kích hoạt toàn bộ quyền bảo vệ cho KidCare...");
      await requestAllNativeAppPermissions();
      const ungranted = permissions.find((p) => !p.isGranted);
      if (ungranted) {
        await openAndroidPermissionSettings(ungranted.id as PermissionSettingType);
      } else {
        await openAndroidPermissionSettings("app_details");
      }
    } else {
      setPermissions((prev) => {
        const updated = prev.map((p) => ({ ...p, isGranted: true }));
        setTimeout(() => savePermissions(updated), 0);
        showToast("🎉 Đã kích hoạt toàn bộ quyền bảo vệ an toàn!");
        return updated;
      });
    }
  };

  // Universal exit handler: always snooze for 30 days so user is never trapped
  const handleExit = () => {
    const oneMonthLater = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    localStorage.setItem(PERMISSIONS_SNOOZE_KEY, oneMonthLater.toString());
    onBack();
  };

  const handleSnoozeForOneMonth = () => {
    showToast("Đã hoãn yêu cầu cấp quyền. Hệ thống sẽ nhắc lại sau 1 tháng.");
    handleExit();
  };

  // Listen for Android hardware back button
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      e.preventDefault();
      handleExit();
    };
    document.addEventListener("backbutton", handleBackButton);
    return () => {
      document.removeEventListener("backbutton", handleBackButton);
    };
  }, []);

  const grantedCount = permissions.filter((p) => p.isGranted).length;
  const isFullyProtected = grantedCount === permissions.length;

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-hidden relative pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Native Status Bar Spacer */}
      <div
        className="w-full shrink-0 bg-white"
        style={{ height: 'var(--status-bar-height, 42px)' }}
      />

      {/* Top App Bar - Executive ParentPro Style with prominent Exit button */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xl px-4 py-3 border-b border-slate-200/80 flex items-center justify-between shadow-xs z-30 sticky top-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExit}
            className="h-10 px-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Quay lại màn hình chính"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
            <span>Vào App</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hệ thống</span>
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-black rounded-md border border-blue-100">
                KIDCARE
              </span>
            </div>
            <h1 className="text-sm font-black text-slate-900 leading-tight">
              Quyền Hệ Thống
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition cursor-pointer shadow-xs active:scale-90"
            title="Chính sách quyền riêng tư"
          >
            <FileText size={15} />
          </button>
          <button
            onClick={handleExit}
            className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer border border-slate-200 shadow-2xs"
            title="Bỏ qua và vào màn hình chính"
          >
            Bỏ qua ✕
          </button>
        </div>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {/* Banner Status Card - Executive ParentPro Rounded-3xl */}
        <div
          className={`p-4 rounded-3xl text-white shadow-md space-y-3 transition-all ${
            isFullyProtected
              ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/15"
              : "bg-gradient-to-br from-rose-600 via-pink-600 to-orange-600 shadow-rose-500/20"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shrink-0 shadow-inner">
                {isFullyProtected ? "🛡️" : "⚠️"}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black">
                    {isFullyProtected
                      ? "Thiết Bị Đã Được Bảo Vệ 100%"
                      : "Chưa Cấp Đủ Quyền Bảo Vệ Máy Con!"}
                  </h3>
                  {!isFullyProtected && (
                    <span className="px-1.5 py-0.2 bg-yellow-300 text-rose-900 font-black text-[9px] rounded-md uppercase">
                      Cần cấp
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/90 leading-relaxed">
                  {isFullyProtected
                    ? "Tất cả các rào chắn an toàn, chống gỡ ứng dụng và khóa giờ học đều đang hoạt động tốt nhất."
                    : `Còn ${permissions.length - grantedCount} quyền chưa được kích hoạt. Hãy bấm vào nút bên dưới từng quyền để mở Cài đặt và bật quyền.`}
                </p>
              </div>
            </div>
          </div>

          {!isFullyProtected && (
            <div className="pt-2.5 border-t border-white/20 flex items-center justify-between gap-2">
              <p className="text-[10.5px] text-white/90 font-medium">
                👉 Khuyên dùng: Bấm để mở quản lý quyền ứng dụng
              </p>
              <button
                onClick={grantAllPermissions}
                className="px-3 py-1.5 bg-white text-rose-700 rounded-xl text-xs font-black shadow-xs hover:bg-rose-50 transition active:scale-95 shrink-0 cursor-pointer"
              >
                Cấp tất cả quyền
              </button>
            </div>
          )}
        </div>

        {/* Permissions List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
              Danh sách quyền bảo vệ ({grantedCount}/{permissions.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">
              Bấm nút dưới mỗi quyền để cấp
            </span>
          </div>

          {permissions.map((perm) => (
            <div
              key={perm.id}
              className={`bg-white p-4 rounded-3xl border shadow-xs space-y-3 transition-all ${
                perm.isGranted
                  ? "border-slate-200/80"
                  : "border-rose-200 ring-2 ring-rose-100 shadow-sm"
              }`}
            >
              {/* Permission Info Row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${perm.iconBg}`}
                  >
                    {perm.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-xs font-black text-slate-900 leading-snug">{perm.name}</h4>
                      {perm.id === 'overlay' && (
                        <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-2xs">
                          ⭐ Quyền hiển thị cốt lõi
                        </span>
                      )}
                      {perm.isGranted ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" /> Đã cấp quyền
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-black flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={11} className="text-rose-600" /> Chưa cấp quyền !
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{perm.desc}</p>
                  </div>
                </div>
              </div>

              {/* Step-by-step Instruction Guide */}
              <div
                className={`p-3 rounded-2xl border text-[11px] flex items-start space-x-2 ${
                  perm.isGranted
                    ? "bg-slate-50 border-slate-100 text-slate-600"
                    : perm.id === 'overlay'
                    ? "bg-blue-50/90 border-blue-200 text-blue-950 font-medium"
                    : "bg-rose-50/70 border-rose-100 text-rose-950 font-medium"
                }`}
              >
                <Info
                  size={15}
                  className={`shrink-0 mt-0.5 ${
                    perm.isGranted ? "text-blue-500" : perm.id === 'overlay' ? "text-blue-600" : "text-rose-500"
                  }`}
                />
                <span className="leading-relaxed">
                  <strong>Cách bật:</strong> {perm.instruction}
                </span>
              </div>

              {/* Direct Grant Action Button on Every Permission */}
              <div>
                {!perm.isGranted ? (
                  <button
                    onClick={() => handlePermissionAction(perm)}
                    className={`w-full py-2.5 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer ${
                      perm.id === 'overlay'
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/25 ring-2 ring-blue-300'
                        : 'bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 shadow-rose-500/20'
                    }`}
                  >
                    <ExternalLink size={14} />
                    <span>{perm.id === 'overlay' ? '👉 Cấp quyền Hiển thị trên các ứng dụng khác ➔' : 'Bấm để cấp quyền trong Cài đặt ➔'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handlePermissionAction(perm)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
                    title="Mở lại cài đặt để kiểm tra hoặc tắt"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Đã cấp quyền • Bấm để kiểm tra lại</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Brand Specific Optimization Guide */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center space-x-2 text-slate-900 font-black">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
            <span>Hướng dẫn tối ưu theo hãng máy (Xiaomi, Samsung, Oppo):</span>
          </div>
          <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
            <li>
              <strong>Xiaomi / Redmi (HyperOS / MIUI):</strong> Vào <em>Cài đặt &gt; Ứng dụng &gt; Quản lý ứng dụng &gt; KidCare</em> &gt; Bật <strong>"Tự khởi chạy (Autostart)"</strong> và chọn Tiết kiệm pin là <strong>"Không hạn chế"</strong>.
            </li>
            <li>
              <strong>Samsung (One UI):</strong> Vào <em>Cài đặt &gt; Chăm sóc thiết bị &gt; Pin &gt; Giới hạn sử dụng dưới nền</em> &gt; Thêm KidCare vào mục <strong>"Ứng dụng không bao giờ nghỉ"</strong>.
            </li>
            <li>
              <strong>Oppo / Realme / Vivo:</strong> Mở màn hình Đa nhiệm &gt; Bấm giữ biểu tượng KidCare &gt; Chọn <strong>Khóa (Lock)</strong> để ứng dụng chạy ngầm liên tục không bị giải phóng RAM.
            </li>
          </ul>
        </div>

        {/* Action Buttons: Hoàn tất & Để sau (1 tháng) */}
        <div className="pt-2 space-y-2.5">
          <button
            onClick={handleExit}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <span>Đã hoàn tất kiểm tra</span>
          </button>

          <button
            onClick={handleSnoozeForOneMonth}
            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
            title="Sẽ nhắc lại sau 30 ngày"
          >
            <Clock size={14} className="text-slate-500" />
            <span>Để sau (Nhắc lại sau 1 tháng)</span>
          </button>

          <p className="text-center text-[10.5px] text-slate-400 font-medium px-4 leading-normal">
            ℹ️ Nếu chọn "Để sau", hệ thống sẽ hoãn thông báo tự động trong 30 ngày. Bạn có thể mở lại trang cấp quyền bất cứ lúc nào từ nút cảnh báo trên màn hình chính.
          </p>
        </div>

        {/* Privacy Policy Link Card */}
        <div
          onClick={() => setShowPrivacyModal(true)}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition active:scale-98 shadow-xs"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Chính Sách Quyền Riêng Tư & Bảo Vệ Trẻ Em</p>
              <p className="text-[10px] text-slate-500">Xem điều khoản bảo mật và cam kết bảo vệ dữ liệu</p>
            </div>
          </div>
          <span className="text-xs text-blue-600 font-bold">Xem ➔</span>
        </div>
      </div>

      {/* Persistent Bottom Bar - Always visible, never stuck with Safe Area Inset */}
      <div className="shrink-0 p-3 pb-[max(12px,calc(10px+env(safe-area-inset-bottom)))] bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex items-center gap-2 z-30">
        <button
          onClick={handleExit}
          className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
        >
          <span>Tiếp tục vào Màn Hình Chính</span>
        </button>
        <button
          onClick={handleSnoozeForOneMonth}
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl border border-slate-200 transition active:scale-[0.98] cursor-pointer"
          title="Sẽ nhắc lại sau 30 ngày"
        >
          <span>Để sau</span>
        </button>
      </div>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        role="kid"
        isViewOnly={true}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};
