import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  Pin,
  Lock,
  MessageSquare,
  ShieldAlert,
  Tv,
  Volume2,
  Sun,
  Zap,
  Battery,
  Wifi,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Timer,
  Clock,
  Music,
  Radio,
  Bell,
  Calendar,
  Compass,
  Activity,
  Maximize2,
  BookOpen,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Check,
  X
} from "lucide-react";
import { useAppState } from "@shared/store";
import { HardwareControlActivity } from "./HardwareControlActivity";
import { KioskModeActivity } from "./KioskModeActivity";
import { LockChallengeActivity } from "./LockChallengeActivity";
import { BroadcastOverlayActivity } from "./BroadcastOverlayActivity";
import { SmartSensorsActivity } from "./SmartSensorsActivity";
import { LiveMonitorActivity } from "./LiveMonitorActivity";
import { NotificationCenterScreen } from "../../components/NotificationCenterScreen";
import { MediaControllerScreen } from "../../components/MediaControllerScreen";
import { NetworkMonitorScreen } from "../../components/NetworkMonitorScreen";
import { SensorDashboardScreen } from "../../components/SensorDashboardScreen";
import { ScheduleManagerScreen } from "../../components/ScheduleManagerScreen";
import { ShareEducationalLinkModal } from "../../components/ShareEducationalLinkModal";

export type RemoteActivityType =
  | "hub"
  | "hardware"
  | "kiosk"
  | "challenge"
  | "broadcast"
  | "media"
  | "live"
  | "sensor3d"
  | "network"
  | "notifications"
  | "schedule"
  | "sensors";

interface RemoteControlCenterProps {
  onBack: () => void;
  initialActivity?: RemoteActivityType;
}

export const RemoteControlCenter: React.FC<RemoteControlCenterProps> = ({
  onBack,
  initialActivity = "hub",
}) => {
  const { state, buzzKidPhone, lockChildDeviceNow, unlockChildDeviceNow, extendChildTimeNow, clearLastCommandAck } = useAppState();
  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const settings = state.childSettings[targetChildId] || {
    hardwareControls: state.hardwareControls,
    kioskMode: state.kioskMode,
    lockChallenge: state.lockChallenge,
    smartRoutines: state.smartRoutines,
    notifications: [],
    mediaPlayback: undefined,
    networkInfo: undefined,
    sensorValues: undefined,
    alarms: [],
    timers: [],
    scheduleEvents: [],
  };

  const { hardwareControls, kioskMode, lockChallenge, broadcastMessage, smartRoutines } = state;
  const notifications = settings.notifications || [];
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;
  const media = settings.mediaPlayback;
  const net = settings.networkInfo;
  const sensors = settings.sensorValues;
  const alarms = settings.alarms || [];
  const timers = settings.timers || [];

  const [currentActivity, setCurrentActivity] = useState<RemoteActivityType>(initialActivity);
  const [filterCategory, setFilterCategory] = useState<"all" | "control" | "monitor" | "schedule">("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showShareLinkModal, setShowShareLinkModal] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Sub-Activity Full Views with onBack handler
  if (currentActivity === "hardware") {
    return <HardwareControlActivity onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "kiosk") {
    return <KioskModeActivity onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "challenge") {
    return <LockChallengeActivity onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "broadcast") {
    return <BroadcastOverlayActivity onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "media") {
    return <MediaControllerScreen onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "live") {
    return <LiveMonitorActivity onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "sensor3d") {
    return <SensorDashboardScreen onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "network") {
    return <NetworkMonitorScreen onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "notifications") {
    return <NotificationCenterScreen onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "schedule") {
    return <ScheduleManagerScreen onBack={() => setCurrentActivity("hub")} />;
  }
  if (currentActivity === "sensors") {
    return <SmartSensorsActivity onBack={() => setCurrentActivity("hub")} />;
  }

  // All activities configuration
  const allActivities = [
    // ─── ĐIỀU KHIỂN TỪ XA ─────────────────────────────────────────
    {
      id: "hardware" as RemoteActivityType,
      category: "control" as const,
      num: "1",
      title: "Điều Khiển Phần Cứng & An Toàn",
      desc: "Âm lượng, độ sáng, đèn flash, khóa cứng nút bấm, hẹn giờ cấu hình và cấp quyền cho con.",
      icon: <Sliders size={22} />,
      iconBg: "bg-blue-50 text-blue-600",
      badge: hardwareControls.isHardwareLocked ? (
        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
          <Lock size={10} /> Đã khóa cứng
        </span>
      ) : hardwareControls.activeTimer?.isActive ? (
        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
          <Timer size={10} /> Hẹn giờ
        </span>
      ) : null,
    },
    {
      id: "kiosk" as RemoteActivityType,
      category: "control" as const,
      num: "2",
      title: "Chế Độ Kiosk & Ghim Ứng Dụng",
      desc: "Ép buộc máy con chỉ mở 1 app duy nhất, chặn thoát ra màn hình chính khi học tập.",
      icon: <Pin size={22} />,
      iconBg: "bg-amber-50 text-amber-600",
      badge: kioskMode.isEnabled ? (
        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
          Đang ghim: {kioskMode.pinnedAppName}
        </span>
      ) : null,
    },
    {
      id: "challenge" as RemoteActivityType,
      category: "control" as const,
      num: "3",
      title: "Khóa Máy & Thử Thách Mở Khóa",
      desc: "Khóa tức thì, thử thách giải toán, câu đố IQ, đi bộ vận động 50 bước, đếm ngược tĩnh tâm.",
      icon: <Lock size={22} />,
      iconBg: "bg-rose-50 text-rose-600",
      badge: lockChallenge.isLocked ? (
        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">
          Đang khóa máy
        </span>
      ) : null,
    },
    {
      id: "broadcast" as RemoteActivityType,
      category: "control" as const,
      num: "4",
      title: "Phát Thông Điệp Đè Màn Hình",
      desc: "Soạn lời nhắc toàn màn hình, chọn biểu tượng vui nhộn và âm thanh thông báo khẩn cấp.",
      icon: <MessageSquare size={22} />,
      iconBg: "bg-sky-50 text-sky-600",
      badge: broadcastMessage?.isShowing ? (
        <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-bold">
          Đang phát đè
        </span>
      ) : null,
    },
    {
      id: "media" as RemoteActivityType,
      category: "control" as const,
      num: "5",
      title: "Điều Khiển Media & Âm Nhạc",
      desc: "Xem bài hát con đang nghe, điều khiển Play/Pause/Chuyển bài và chỉnh âm lượng từ xa.",
      icon: <Music size={22} />,
      iconBg: "bg-purple-50 text-purple-600",
      badge: media?.isPlaying ? (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
          <Radio size={10} className="animate-pulse" /> {media.trackTitle}
        </span>
      ) : (
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium">
          Media
        </span>
      ),
    },

    // ─── GIÁM SÁT TRỰC TIẾP ───────────────────────────────────────
    {
      id: "live" as RemoteActivityType,
      category: "monitor" as const,
      num: "6",
      title: "Giám Sát Màn Hình & Camera Trực Tiếp",
      desc: "Xem trực tiếp màn hình điện thoại con thời gian thực và theo dõi camera góc học tập.",
      icon: <Tv size={22} />,
      iconBg: "bg-red-50 text-red-600",
      badge: (
        <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black">
          LIVE 1080P
        </span>
      ),
    },
    {
      id: "sensor3d" as RemoteActivityType,
      category: "monitor" as const,
      num: "7",
      title: "Cảm Biến Real-time & Mô Hình 3D Vị Trí",
      desc: "Mô hình 3D xoay realtime theo vị trí cầm máy của con, la bàn số, gia tốc kế và đo bước chân.",
      icon: <Maximize2 size={22} />,
      iconBg: "bg-indigo-50 text-indigo-600",
      badge: sensors ? (
        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
          3D: {sensors.pitch.toFixed(0)}° / {sensors.yaw.toFixed(0)}°
        </span>
      ) : null,
    },
    {
      id: "network" as RemoteActivityType,
      category: "monitor" as const,
      num: "8",
      title: "Giám Sát Mạng & Quét WiFi / Bluetooth",
      desc: "Cường độ sóng di động 4G/5G, tên WiFi đang kết nối, và quét các thiết bị xung quanh con.",
      icon: <Wifi size={22} />,
      iconBg: "bg-emerald-50 text-emerald-600",
      badge: net?.wifiConnected ? (
        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
          WiFi: {net.wifiSSID}
        </span>
      ) : null,
    },
    {
      id: "notifications" as RemoteActivityType,
      category: "monitor" as const,
      num: "9",
      title: "Nhật Ký Thông Báo Máy Con",
      desc: "Feed theo dõi tin nhắn và thông báo từ các ứng dụng (Zalo, YouTube, Messenger, cảnh báo pin...).",
      icon: <Bell size={22} />,
      iconBg: "bg-blue-50 text-blue-600",
      badge: unreadNotifCount > 0 ? (
        <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded font-black animate-pulse">
          {unreadNotifCount} mới
        </span>
      ) : (
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium">
          {notifications.length} tin
        </span>
      ),
    },

    // ─── LỊCH & TỰ ĐỘNG HÓA ───────────────────────────────────────
    {
      id: "schedule" as RemoteActivityType,
      category: "schedule" as const,
      num: "10",
      title: "Đặt Lịch, Hẹn Giờ & Báo Thức Máy Con",
      desc: "Tạo thời khóa biểu sự kiện, cài báo thức thức dậy đi học, hẹn giờ đếm ngược cho con.",
      icon: <Calendar size={22} />,
      iconBg: "bg-orange-50 text-orange-600",
      badge:
        alarms.filter((a) => a.isEnabled).length > 0 ? (
          <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-bold">
            {alarms.filter((a) => a.isEnabled).length} báo thức
          </span>
        ) : timers.some((t) => t.isRunning) ? (
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold animate-pulse">
            Đang đếm ngược
          </span>
        ) : null,
    },
    {
      id: "sensors" as RemoteActivityType,
      category: "schedule" as const,
      num: "11",
      title: "Lịch Tự Động & Cảm Biến Bảo Vệ",
      desc: "Tự động khóa giờ ăn cơm, giờ đi ngủ, cảnh báo phát hiện nói bậy, tiếng ồn >85dB và nhắc uống nước.",
      icon: <ShieldAlert size={22} />,
      iconBg: "bg-amber-50 text-amber-600",
      badge:
        smartRoutines.mealtimeLock || smartRoutines.bedtimeLock ? (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
            Đang bật lịch khóa
          </span>
        ) : null,
    },
  ];

  const filteredActivities = allActivities.filter(
    (act) => filterCategory === "all" || act.category === filterCategory
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-8 overflow-y-auto">
      {/* Hub App Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900">Điều Khiển Từ Xa & Giám Sát</h1>
            <p className="text-[11px] text-slate-500 font-medium">
              11 Phân hệ Activity chuyên sâu • Đồng bộ máy {child?.name || "con"}
            </p>
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
      </div>

      <div className="p-4 space-y-4">
        {/* Child Device Telemetry Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-3xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={child?.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150"}
                alt="Child Avatar"
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-400/40 shadow-xs"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold">{child?.name || "Bé"}</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 font-bold px-2 py-0.2 rounded-full">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {child?.grade} • iPhone 13 • Đồng bộ Real-time
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl">
                <Battery size={13} className="text-emerald-400" />
                {child?.battery || 78}%
              </span>
              <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl">
                <Wifi size={13} className="text-blue-400" />
                {net?.wifiSSID ? "WiFi" : "4G"}
              </span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center text-xs">
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-[10px] text-slate-400">Âm lượng</p>
              <p className="font-bold text-white mt-0.5">{hardwareControls.volume}%</p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-[10px] text-slate-400">Độ sáng</p>
              <p className="font-bold text-white mt-0.5">{hardwareControls.brightness}%</p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-[10px] text-slate-400">Khóa cứng</p>
              <p
                className={`font-bold mt-0.5 text-[11px] ${
                  hardwareControls.isHardwareLocked ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {hardwareControls.isHardwareLocked ? "Đã khóa" : "Mở"}
              </p>
            </div>
            <div className="bg-white/5 p-2 rounded-xl">
              <p className="text-[10px] text-slate-400">Thông báo</p>
              <p className="font-bold text-amber-400 mt-0.5">{unreadNotifCount} mới</p>
            </div>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMsg && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl border border-slate-700 backdrop-blur-md animate-in fade-in">
            {toastMsg}
          </div>
        )}

        {/* Real-Time Command Delivery & Feedback Card */}
        {state.lastCommandAck && (
          <div
            className={`p-3.5 rounded-2xl border transition-all duration-300 shadow-sm ${
              state.lastCommandAck.status === 'executed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : state.lastCommandAck.status === 'received'
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : state.lastCommandAck.status === 'timeout'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-indigo-50 border-indigo-300 text-indigo-950'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                {state.lastCommandAck.status === 'pending' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 animate-spin mt-0.5">
                    <Loader2 size={16} />
                  </div>
                )}
                {state.lastCommandAck.status === 'received' && (
                  <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={16} />
                  </div>
                )}
                {state.lastCommandAck.status === 'executed' && (
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 animate-bounce mt-0.5">
                    <CheckCircle2 size={17} />
                  </div>
                )}
                {state.lastCommandAck.status === 'timeout' && (
                  <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={16} />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-black uppercase tracking-wider ${
                        state.lastCommandAck.status === 'executed'
                          ? 'text-emerald-700'
                          : state.lastCommandAck.status === 'received'
                          ? 'text-sky-700'
                          : state.lastCommandAck.status === 'timeout'
                          ? 'text-amber-800'
                          : 'text-indigo-700'
                      }`}
                    >
                      {state.lastCommandAck.status === 'executed'
                        ? 'ĐÃ THỰC THI TRÊN MÁY CON'
                        : state.lastCommandAck.status === 'received'
                        ? 'MÁY CON ĐÃ NHẬN LỆNH'
                        : state.lastCommandAck.status === 'timeout'
                        ? 'CHƯA NHẬN ĐƯỢC PHẢN HỒI'
                        : 'ĐANG GỬI LỆNH ĐẾN MÁY CON...'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 shadow-2xs">
                      {state.lastCommandAck.commandTitle}
                    </span>
                  </div>

                  {(() => {
                    const cName = state.lastCommandAck.childName || 'Con';
                    const cLabel = cName.startsWith('Bé ') ? cName : `Bé ${cName}`;
                    return (
                      <p className="text-[11.5px] text-slate-700 mt-1 leading-snug">
                        {state.lastCommandAck.status === 'executed'
                          ? `Thiết bị của ${cLabel} đã nhận tín hiệu và hoàn thành lệnh lúc ${
                              state.lastCommandAck.executedAt
                                ? new Date(state.lastCommandAck.executedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : ''
                            }!`
                          : state.lastCommandAck.status === 'received'
                          ? `Điện thoại của ${cLabel} đã kết nối và đang áp dụng...`
                          : state.lastCommandAck.status === 'timeout'
                          ? `Điện thoại của ${cLabel} chưa phản hồi mạng. Lệnh sẽ tự động chạy ngay khi máy con mở 4G/WiFi.`
                          : `Đang truyền tín hiệu đến máy của ${cLabel}...`}
                      </p>
                    );
                  })()}

                  {state.lastCommandAck.deviceName && (
                    <p className="text-[10.5px] text-slate-500 mt-1 flex items-center gap-1">
                      <Smartphone size={11} className="text-slate-400" />
                      <span>Thiết bị: <strong className="text-slate-700">{state.lastCommandAck.deviceName}</strong></span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => clearLastCommandAck()}
                className="w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Quick Instant Actions Strip */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              if (lockChallenge.isLocked) {
                unlockChildDeviceNow(child?.id);
                showToast(`Đã gửi lệnh mở khóa máy ${child?.name || 'con'}!`);
              } else {
                lockChildDeviceNow(child?.id);
                showToast(`Đã gửi lệnh khóa máy ${child?.name || 'con'} ngay lập tức!`);
              }
            }}
            className={`p-2 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-xs border cursor-pointer ${
              lockChallenge.isLocked
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Lock size={16} />
            <span>{lockChallenge.isLocked ? 'Mở khóa' : 'Khóa máy'}</span>
          </button>

          <button
            onClick={() => {
              buzzKidPhone(child?.id);
              showToast(`Đang phát tín hiệu còi hú trên máy ${child?.name || 'con'}! 🚨`);
            }}
            className="p-2 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <Volume2 size={16} className="animate-bounce text-amber-600" />
            <span>Hú còi</span>
          </button>

          <button
            onClick={() => {
              extendChildTimeNow(30, child?.id);
              showToast(`Đã gia hạn thêm +30 phút cho ${child?.name || 'con'}! ⏱️`);
            }}
            className="p-2 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <Clock size={16} className="text-blue-600" />
            <span>+30 phút</span>
          </button>

          <button
            onClick={() => setShowShareLinkModal(true)}
            className="p-2 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <BookOpen size={16} className="text-purple-600" />
            <span>Gửi link</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterCategory("all")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition cursor-pointer whitespace-nowrap text-center ${
              filterCategory === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
            }`}
          >
            Tất Cả ({allActivities.length})
          </button>
          <button
            onClick={() => setFilterCategory("control")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition cursor-pointer whitespace-nowrap text-center ${
              filterCategory === "control" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
            }`}
          >
            🎮 Điều Khiển (5)
          </button>
          <button
            onClick={() => setFilterCategory("monitor")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition cursor-pointer whitespace-nowrap text-center ${
              filterCategory === "monitor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
            }`}
          >
            📡 Giám Sát (4)
          </button>
          <button
            onClick={() => setFilterCategory("schedule")}
            className={`flex-1 py-1.5 px-2 rounded-xl transition cursor-pointer whitespace-nowrap text-center ${
              filterCategory === "schedule" ? "bg-white text-orange-600 shadow-sm" : "text-slate-600"
            }`}
          >
            ⏰ Lịch & Báo Thức (2)
          </button>
        </div>

        {/* Dedicated Activity Cards List */}
        <div className="space-y-2.5">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => setCurrentActivity(act.id)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs transition active:scale-[0.99] cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition shadow-2xs ${act.iconBg}`}
                >
                  {act.icon}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                      {act.num}. {act.title}
                    </h4>
                    {act.badge}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {act.desc}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={18}
                className="text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Share Educational Link Modal */}
      <ShareEducationalLinkModal
        isOpen={showShareLinkModal}
        onClose={() => setShowShareLinkModal(false)}
        childName={child?.name}
      />
    </div>
  );
};

export default RemoteControlCenter;
