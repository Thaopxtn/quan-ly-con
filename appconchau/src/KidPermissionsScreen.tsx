import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Shield,
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
  Sliders,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PrivacyPolicyModal } from "@shared/components/PrivacyPolicyModal";
import { Capacitor } from "@capacitor/core";
import { resetSafeConfetti, fireSafeConfetti } from "@shared/utils/safeConfetti";
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
  tag: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  isGranted: boolean;
  defaultGranted: boolean;
  instruction: string;
}

export const PERMISSIONS_STORAGE_KEY = "kidcare_permissions_state_v1";
export const PERMISSIONS_SNOOZE_KEY = "kidcare_permissions_dismissed_until";

const DEFAULT_CONFIG: Omit<PermissionItem, "isGranted">[] = [
  {
    id: "overlay",
    name: "Hiển thị trên ứng dụng khác",
    tag: "Khóa máy & Khẩn cấp",
    desc: "Hiển thị màn hình khóa và thông điệp khẩn cấp khi con hết giờ sử dụng.",
    icon: <Eye size={18} />,
    iconBg: "bg-blue-100 text-blue-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Xuất hiện trên cùng (Overlay) > Bật KidCare.",
  },
  {
    id: "accessibility",
    name: "Dịch vụ trợ năng",
    tag: "Chặn app bị cấm",
    desc: "Tự động nhận diện khi con mở ứng dụng bị cấm (TikTok, Game) và chặn tức thì.",
    icon: <Lock size={18} />,
    iconBg: "bg-purple-100 text-purple-700",
    defaultGranted: false,
    instruction: "Cài đặt > Hỗ trợ tiếp cận (Trợ năng) > Ứng dụng đã tải xuống > KidCare > Bật.",
  },
  {
    id: "usage_stats",
    name: "Thời gian sử dụng máy",
    tag: "Đồng hồ 360 & Giờ dùng",
    desc: "Theo dõi thời lượng dùng máy và thống kê chi tiết từng ứng dụng trong ngày.",
    icon: <Clock size={18} />,
    iconBg: "bg-indigo-100 text-indigo-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền đặc biệt > Truy cập dữ liệu sử dụng > KidCare > Cho phép.",
  },
  {
    id: "device_admin",
    name: "Quản trị viên thiết bị",
    tag: "Chống gỡ ứng dụng",
    desc: "Ngăn chặn việc con tự ý gỡ cài đặt KidCare trái phép mà không có mã cha mẹ.",
    icon: <Shield size={18} />,
    iconBg: "bg-rose-100 text-rose-700",
    defaultGranted: false,
    instruction: "Cài đặt > Bảo mật & Quyền riêng tư > Quản trị viên thiết bị > Kích hoạt KidCare.",
  },
  {
    id: "battery",
    name: "Bỏ qua tối ưu hóa pin",
    tag: "Duy trì kết nối 24/7",
    desc: "Giữ KidCare chạy ngầm liên tục, không bị Android tắt khi khóa màn hình.",
    icon: <BatteryCharging size={18} />,
    iconBg: "bg-amber-100 text-amber-700",
    defaultGranted: true,
    instruction: "Cài đặt > Pin & Hiệu suất > Tiết kiệm pin ứng dụng > KidCare > Không giới hạn.",
  },
  {
    id: "location",
    name: "Định vị GPS vị trí thực",
    tag: "Bản đồ & Vùng an toàn",
    desc: "Cập nhật tọa độ máy con lên bản đồ cha mẹ và gửi cảnh báo SOS.",
    icon: <MapPin size={18} />,
    iconBg: "bg-emerald-100 text-emerald-700",
    defaultGranted: true,
    instruction: "Cài đặt > Vị trí > Quyền ứng dụng > KidCare > Luôn cho phép.",
  },
  {
    id: "notification_listener",
    name: "Truy cập thông báo & media",
    tag: "Nhạc & Video đang phát",
    desc: "Nhận biết tên bài hát, video (YouTube, Spotify...) đang phát trên thiết bị con.",
    icon: <FileText size={18} />,
    iconBg: "bg-pink-100 text-pink-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền đặc biệt > Truy cập thông báo > KidCare > Bật.",
  },
  {
    id: "activity_recognition",
    name: "Đếm bước chân & Vận động",
    tag: "Sức khỏe thể chất",
    desc: "Đếm số bước chân di chuyển mỗi ngày để khuyến khích vận động tích sao.",
    icon: <Activity size={18} />,
    iconBg: "bg-cyan-100 text-cyan-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Hoạt động thể chất > KidCare > Cho phép.",
  },
  {
    id: "camera",
    name: "Đèn Flash & Camera",
    tag: "Cảnh báo tìm máy",
    desc: "Bật đèn flash từ xa để tìm máy trong bóng tối hoặc phát tín hiệu khẩn cấp.",
    icon: <Zap size={18} />,
    iconBg: "bg-yellow-100 text-yellow-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Máy ảnh > KidCare > Cho phép.",
  },
  {
    id: "calendar",
    name: "Lịch & Thời gian biểu",
    tag: "Thời khóa biểu học tập",
    desc: "Đồng bộ thời khóa biểu học tập và nhắc nhở thời gian biểu từ cha mẹ.",
    icon: <Calendar size={18} />,
    iconBg: "bg-teal-100 text-teal-700",
    defaultGranted: true,
    instruction: "Cài đặt > Quyền ứng dụng > Lịch > KidCare > Cho phép.",
  },
  {
    id: "write_settings",
    name: "Cài đặt hệ thống",
    tag: "Âm lượng & Độ sáng",
    desc: "Hạ độ sáng và điều chỉnh âm lượng từ xa để bảo vệ mắt con vào ban đêm.",
    icon: <Sliders size={18} />,
    iconBg: "bg-violet-100 text-violet-700",
    defaultGranted: false,
    instruction: "Cài đặt > Ứng dụng > Quyền đặc biệt > Sửa đổi cài đặt hệ thống > Bật KidCare.",
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
  const [showBrandGuide, setShowBrandGuide] = useState(false);
  const [showGrantedSection, setShowGrantedSection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
  const syncWithNativePermissions = async (showFeedback = false) => {
    setIsSyncing(true);
    try {
      const realStatus = await checkRealAndroidPermissions();
      if (realStatus) {
        setPermissions((prev) => {
          const updated = prev.map((p) => {
            const val = realStatus[p.id as keyof KidPermissionsStatus];
            return typeof val === "boolean" ? { ...p, isGranted: val } : p;
          });
          savePermissions(updated);
          const allGranted = updated.every((p) => p.isGranted);
          if (allGranted) {
            fireSafeConfetti();
          }
          return updated;
        });
        if (showFeedback) {
          showToast("✅ Đã đồng bộ quyền thực tế từ Android!");
        }
      } else if (showFeedback) {
        showToast("ℹ️ Đang chạy ở chế độ mô phỏng");
      }
    } catch (e) {
      console.warn("syncWithNativePermissions error:", e);
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
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

  // Open Android permission settings for a specific permission
  const handlePermissionAction = async (perm: PermissionItem) => {
    if (Capacitor.isNativePlatform()) {
      showToast(`Đang mở Cài đặt cho: ${perm.name}...`);
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
          showToast(next ? `✅ Đã bật "${p.name}"` : `⚠️ Đã tắt "${p.name}"`);
          return { ...p, isGranted: next };
        }
        return p;
      });
      savePermissions(updated);
      return updated;
    });
  };

  // Filter missing and granted permissions
  const missingList = permissions.filter((p) => !p.isGranted);
  const grantedList = permissions.filter((p) => p.isGranted);
  const grantedCount = grantedList.length;
  const isFullyProtected = missingList.length === 0;
  const nextPermission = missingList[0];
  const percent = Math.round((grantedCount / permissions.length) * 100);

  // Smart sequential wizard: grant next ungranted permission
  const handleGrantNext = async () => {
    if (!nextPermission) {
      handleExit();
      return;
    }

    if (Capacitor.isNativePlatform()) {
      // 1. Proactively request standard native runtime dialogs (fine location, camera, calendar, activity)
      try {
        await requestAllNativeAppPermissions();
      } catch (_) {}

      // 2. Open the specific settings page for the next ungranted permission
      showToast(`Bước ${grantedCount + 1}/${permissions.length}: Mở cài đặt "${nextPermission.name}"...`);
      await openAndroidPermissionSettings(nextPermission.id as PermissionSettingType);
    } else {
      // Web simulator: toggle the next missing permission
      togglePermission(nextPermission.id);
    }
  };

  // Grant all permissions (Simulation on web, or bulk prompt on native)
  const handleGrantAll = async () => {
    if (Capacitor.isNativePlatform()) {
      showToast("Đang yêu cầu quyền hệ thống...");
      try {
        await requestAllNativeAppPermissions();
      } catch (_) {}
      if (nextPermission) {
        await openAndroidPermissionSettings(nextPermission.id as PermissionSettingType);
      }
    } else {
      setPermissions((prev) => {
        const updated = prev.map((p) => ({ ...p, isGranted: true }));
        savePermissions(updated);
        showToast("🎉 Đã bật tất cả quyền bảo vệ!");
        fireSafeConfetti();
        return updated;
      });
    }
  };

  // Universal exit handler: snooze for 30 days
  const handleExit = () => {
    const oneMonthLater = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PERMISSIONS_SNOOZE_KEY, oneMonthLater.toString());
    onBack();
  };

  const handleSnoozeForOneMonth = () => {
    showToast("Đã hoãn cấp quyền. Hệ thống sẽ nhắc lại sau 1 tháng.");
    handleExit();
  };

  // Hardware back button support
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

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-50 select-none overflow-hidden relative pointer-events-auto"
      style={{ touchAction: "manipulation" }}
    >
      {/* Native Status Bar Spacer */}
      <div
        className="w-full shrink-0 bg-white"
        style={{ height: "var(--status-bar-height, 42px)" }}
      />

      {/* Top App Bar - Clean, Minimal Header with Single Exit Action */}
      <div className="shrink-0 bg-white/95 backdrop-blur-xl px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between shadow-2xs z-30 sticky top-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExit}
            className="h-9 px-2.5 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs flex items-center gap-1 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title="Quay lại màn hình chính"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
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
              Quyền Bảo Vệ Con
            </h1>
          </div>
        </div>

        {/* Right Tools: Refresh Sync & Privacy Policy */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => syncWithNativePermissions(true)}
            className={`w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition cursor-pointer shadow-2xs ${
              isSyncing ? "animate-spin text-blue-600" : ""
            }`}
            title="Đồng bộ lại trạng thái quyền từ Android"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center hover:bg-blue-50 active:scale-90 transition cursor-pointer shadow-2xs"
            title="Chính sách quyền riêng tư"
          >
            <FileText size={14} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto pb-4">
        {/* Streamlined Summary Banner with Progress Bar & 1-Click Wizard Button */}
        <div
          className={`p-3.5 rounded-2xl text-white shadow-sm space-y-2.5 transition-all ${
            isFullyProtected
              ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/15"
              : "bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500 shadow-rose-500/15"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg shrink-0 shadow-inner">
                {isFullyProtected ? "🛡️" : "⚠️"}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-black">
                  {isFullyProtected
                    ? "Đã bảo vệ an toàn 100%"
                    : `Còn ${missingList.length} quyền cần kích hoạt`}
                </h3>
                <p className="text-[10.5px] text-white/90">
                  {isFullyProtected
                    ? "Tất cả tính năng khóa máy và bảo vệ hoạt động tối ưu"
                    : `Đã cấp ${grantedCount}/${permissions.length} quyền (${percent}%)`}
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md text-white font-black text-xs rounded-lg border border-white/20 shrink-0">
              {percent}%
            </span>
          </div>

          {/* Smooth Animated Progress Bar */}
          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Smart Fast Action inside Banner */}
          {!isFullyProtected && nextPermission && (
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={handleGrantNext}
                className="flex-1 py-2 px-3 bg-white text-rose-700 hover:bg-rose-50 rounded-xl font-black text-xs shadow-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
              >
                <Zap size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                <span className="truncate">Cấp quyền tiếp theo: {nextPermission.name} ➔</span>
              </button>
              {!Capacitor.isNativePlatform() && (
                <button
                  onClick={handleGrantAll}
                  className="px-2.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-[11px] transition shrink-0 cursor-pointer"
                  title="Mô phỏng bật toàn bộ quyền"
                >
                  Cấp tất cả
                </button>
              )}
            </div>
          )}
        </div>

        {/* SECTION 1: MISSING PERMISSIONS (High Priority at Top) */}
        {missingList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-xs font-black text-rose-700 uppercase tracking-wide">
                  Cần cấp ngay ({missingList.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Chạm nút để mở Cài đặt
              </span>
            </div>

            {missingList.map((perm) => (
              <div
                key={perm.id}
                className="bg-white p-3 rounded-2xl border-2 border-rose-200/90 shadow-2xs space-y-2 relative overflow-hidden"
              >
                {/* Header row: Icon + Title + Tag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${perm.iconBg}`}
                    >
                      {perm.icon}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {perm.name}
                        </h4>
                        <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 text-[9px] font-bold rounded-md border border-rose-200">
                          {perm.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {perm.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compact Instruction Tip */}
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl px-2.5 py-1.5 text-[10.5px] text-rose-950 flex items-center gap-1.5">
                  <Info size={13} className="text-rose-500 shrink-0" />
                  <span className="truncate">
                    <strong>Bật tại:</strong> {perm.instruction}
                  </span>
                </div>

                {/* 1-Tap Action Button */}
                <button
                  onClick={() => handlePermissionAction(perm)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center space-x-1.5 active:scale-[0.98] transition cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>Bật quyền này trong Cài đặt ➔</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 2: GRANTED PERMISSIONS (Clean Compact List / Accordion) */}
        {grantedList.length > 0 && (
          <div className="space-y-1.5">
            <div
              onClick={() => setShowGrantedSection(!showGrantedSection)}
              className="flex items-center justify-between px-1 py-1 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-700">
                  Đã kích hoạt ({grantedList.length}/{permissions.length})
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                <span>{showGrantedSection ? "Thu gọn" : "Xem danh sách"}</span>
                {showGrantedSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Compact 1-line list for granted permissions */}
            {showGrantedSection && (
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                {grantedList.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${perm.iconBg}`}>
                        {perm.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {perm.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {perm.tag}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Đã bật
                      </span>
                      <button
                        onClick={() => handlePermissionAction(perm)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Mở lại cài đặt để kiểm tra"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsible Brand Specific Optimization Guide (Xiaomi, Samsung, Oppo) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div
            onClick={() => setShowBrandGuide(!showBrandGuide)}
            className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition select-none"
          >
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
              <Smartphone size={15} className="text-blue-600" />
              <span>Hướng dẫn chạy ngầm theo hãng máy (Xiaomi, Samsung, Oppo)</span>
            </div>
            {showBrandGuide ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>

          {showBrandGuide && (
            <div className="p-3 pt-0 border-t border-slate-100 space-y-2 text-[11px] text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                <p>
                  <strong>• Xiaomi / Redmi (HyperOS / MIUI):</strong> Vào <em>Cài đặt &gt; Ứng dụng &gt; Quản lý ứng dụng &gt; KidCare</em> &gt; Bật <strong>"Tự khởi chạy"</strong> và chọn Tiết kiệm pin là <strong>"Không hạn chế"</strong>.
                </p>
                <p>
                  <strong>• Samsung (One UI):</strong> Vào <em>Cài đặt &gt; Chăm sóc thiết bị &gt; Pin &gt; Giới hạn sử dụng dưới nền</em> &gt; Thêm KidCare vào <strong>"Ứng dụng không bao giờ nghỉ"</strong>.
                </p>
                <p>
                  <strong>• Oppo / Realme / Vivo:</strong> Mở màn hình Đa nhiệm &gt; Bấm giữ biểu tượng KidCare &gt; Chọn <strong>Khóa (Lock)</strong> để không bị giải phóng RAM khi dọn dẹp.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Policy Link Card */}
        <div
          onClick={() => setShowPrivacyModal(true)}
          className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition active:scale-98 shadow-2xs"
        >
          <div className="flex items-center space-x-2">
            <FileText size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Chính sách quyền riêng tư & bảo vệ dữ liệu</span>
          </div>
          <span className="text-[11px] text-blue-600 font-bold">Xem ➔</span>
        </div>
      </div>

      {/* Persistent Sticky Bottom Bar - Contextual 1-Click Action & Snooze */}
      <div className="shrink-0 p-3 pb-[max(12px,calc(10px+env(safe-area-inset-bottom)))] bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg flex items-center gap-2 z-30">
        {isFullyProtected ? (
          <button
            onClick={handleExit}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>Vào Màn Hình Chính 🎉</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleGrantNext}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center space-x-1.5 transition active:scale-[0.98] cursor-pointer min-w-0"
            >
              <Zap size={14} className="text-yellow-300 fill-yellow-300 shrink-0" />
              <span className="truncate">
                {nextPermission ? `Bật tiếp: ${nextPermission.name} ➔` : "Tiếp tục vào App"}
              </span>
            </button>

            <button
              onClick={handleSnoozeForOneMonth}
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition active:scale-[0.98] cursor-pointer shrink-0"
              title="Sẽ nhắc lại sau 30 ngày"
            >
              Để sau
            </button>
          </>
        )}
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
