import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  Compass,
  Activity,
  Sun,
  Eye,
  Footprints,
  Maximize2,
  Gauge,
  Sparkles,
  Smartphone,
  RotateCcw,
  Radio,
  Play,
  Pause,
  Layers,
  Battery,
  Wifi,
  Navigation,
  HelpCircle,
  Move3d,
} from "lucide-react";
import { useAppState, getActiveParentId } from "@shared/store";
import { SensorValues } from "@shared/types";
import { serverApiClient } from "@shared/services/serverApiClient";
import { sendRemoteCommandToKid } from "@shared/firebase/cloudSyncService";

interface SensorDashboardScreenProps {
  onBack?: () => void;
}

function SensorCard({
  icon,
  label,
  value,
  unit,
  color = "indigo",
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  color?: "indigo" | "blue" | "emerald" | "amber" | "rose" | "violet";
  subtitle?: string;
}) {
  const colorMap = {
    indigo: "bg-indigo-50/80 text-indigo-700 border-indigo-100",
    blue: "bg-blue-50/80 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50/80 text-amber-800 border-amber-100",
    rose: "bg-rose-50/80 text-rose-700 border-rose-100",
    violet: "bg-purple-50/80 text-purple-700 border-purple-100",
  };

  return (
    <div className={`rounded-2xl p-3.5 border ${colorMap[color]} shadow-2xs space-y-1 transition-all`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </span>
      </div>
      <p className="text-base font-black text-slate-900 flex items-baseline gap-1">
        <span>{typeof value === "number" ? value.toFixed(2) : value}</span>
        <span className="text-[10px] text-slate-500 font-bold uppercase">{unit}</span>
      </p>
      {subtitle && <p className="text-[10px] text-slate-400 font-medium leading-none">{subtitle}</p>}
    </div>
  );
}

// 3D Realistic Phone Model with CSS 3D Transforms & Perspective
function Phone3DModel({
  pitch,
  roll,
  yaw,
  battery = 85,
  childName = "Bé",
  dragMode = "live",
  manualRot = { x: 0, y: 0 },
  onManualDragStart,
}: {
  pitch: number;
  roll: number;
  yaw: number;
  battery?: number;
  childName?: string;
  dragMode?: "live" | "manual";
  manualRot?: { x: number; y: number };
  onManualDragStart?: (e: React.PointerEvent) => void;
}) {
  // Compute transform angles
  // In live mode: rotateX tilts forward/back (-pitch), rotateZ tilts left/right (-roll), rotateY spins (yaw relative to north)
  const rotX = dragMode === "manual" ? manualRot.x : -pitch;
  const rotY = dragMode === "manual" ? manualRot.y : Math.sin((yaw * Math.PI) / 180) * 35;
  const rotZ = dragMode === "manual" ? 0 : -roll;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      className="flex flex-col items-center justify-center py-6 select-none relative cursor-grab active:cursor-grabbing touch-none"
      style={{ perspective: "900px", height: "260px" }}
      onPointerDown={onManualDragStart}
    >
      {/* 3D Phone Body */}
      <div
        style={{
          width: "125px",
          height: "215px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
          transition: dragMode === "manual" ? "none" : "transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1)",
          position: "relative",
        }}
      >
        {/* Shadow plane underneath the phone */}
        <div
          style={{
            position: "absolute",
            width: "140px",
            height: "230px",
            left: "-7.5px",
            top: "10px",
            borderRadius: "32px",
            background: "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 70%)",
            transform: "translateZ(-30px)",
            pointerEvents: "none",
          }}
        />

        {/* Front Face / Screen */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(145deg, #1e293b, #090d16)",
            borderRadius: "28px",
            border: "3px solid #64748b",
            boxShadow:
              "0 20px 40px -10px rgba(0, 0, 0, 0.8), inset 0 1px 3px rgba(255, 255, 255, 0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px",
            overflow: "hidden",
            backfaceVisibility: "hidden",
            transform: "translateZ(6px)",
          }}
        >
          {/* Dynamic Island / Punch Hole */}
          <div
            style={{
              width: "42px",
              height: "11px",
              backgroundColor: "#020617",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
              zIndex: 10,
            }}
          >
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#3b82f6" }} />
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#0f172a" }} />
          </div>

          {/* Screen Content */}
          <div
            style={{
              flex: 1,
              width: "100%",
              margin: "5px 0",
              borderRadius: "20px",
              background: "linear-gradient(160deg, #1e1b4b 0%, #2563eb 50%, #4338ca 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              color: "white",
              padding: "8px 6px",
              boxShadow: "inset 0 0 12px rgba(0,0,0,0.4)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ambient Background Grid Pattern */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "10px 10px",
                opacity: 0.4,
              }}
            />

            {/* Mini Status Bar */}
            <div className="w-full flex items-center justify-between text-[8px] font-bold text-white/90 z-10 px-1">
              <span>{timeStr}</span>
              <div className="flex items-center gap-1">
                <Wifi size={9} />
                <span>{battery}%</span>
              </div>
            </div>

            {/* App Center Identity */}
            <div className="flex flex-col items-center justify-center z-10 my-auto text-center">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner mb-1 border border-white/20">
                <Smartphone size={20} className="text-white drop-shadow-sm" />
              </div>
              <span className="text-[10px] font-black tracking-tight">{childName}</span>
              <span className="text-[7.5px] font-semibold text-indigo-200 mt-0.5">KidCare 3D Live</span>
            </div>

            {/* Live Euler Angles overlay */}
            <div className="w-full bg-black/40 backdrop-blur-md rounded-xl p-1.5 z-10 text-[7px] font-mono grid grid-cols-3 text-center border border-white/10">
              <div>
                <span className="text-slate-400 block text-[6.5px]">PITCH</span>
                <span className="font-bold text-sky-300">{pitch.toFixed(0)}°</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[6.5px]">ROLL</span>
                <span className="font-bold text-indigo-300">{roll.toFixed(0)}°</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[6.5px]">YAW</span>
                <span className="font-bold text-amber-300">{yaw.toFixed(0)}°</span>
              </div>
            </div>
          </div>

          {/* Bottom Home Indicator */}
          <div
            style={{
              width: "36px",
              height: "3.5px",
              backgroundColor: "#94a3b8",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* Back Face */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(145deg, #0f172a, #1e293b)",
            borderRadius: "28px",
            border: "3px solid #475569",
            transform: "translateZ(-6px) rotateY(180deg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8)",
            backfaceVisibility: "hidden",
            padding: "12px",
          }}
        >
          {/* Dual Camera Module */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              width: "34px",
              height: "34px",
              backgroundColor: "#020617",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#1e293b", border: "1px solid #475569" }} />
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#1e293b", border: "1px solid #475569" }} />
          </div>
          <span style={{ fontSize: "9px", fontWeight: "800", color: "#94a3b8", letterSpacing: "1px" }}>KIDCARE</span>
        </div>

        {/* Right Metal Edge */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "-6px",
            width: "12px",
            height: "199px",
            background: "linear-gradient(to right, #475569, #1e293b)",
            transform: "rotateY(90deg) translateZ(0px)",
            transformOrigin: "center",
            borderRadius: "2px",
          }}
        />

        {/* Left Metal Edge */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "-6px",
            width: "12px",
            height: "199px",
            background: "linear-gradient(to right, #1e293b, #475569)",
            transform: "rotateY(-90deg) translateZ(0px)",
            transformOrigin: "center",
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}

export const SensorDashboardScreen: React.FC<SensorDashboardScreenProps> = ({ onBack }) => {
  const { state, updateSensorValues } = useAppState();
  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const activeParentId = getActiveParentId() || "parent_default";
  const settings = state.childSettings[targetChildId];

  // Default initial sensor values
  const defaultSensors: SensorValues = {
    accelX: 0,
    accelY: 9.8,
    accelZ: 0,
    gyroX: 0,
    gyroY: 0,
    gyroZ: 0,
    magnetX: 0,
    magnetY: 0,
    magnetZ: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    pressureHpa: 1013.25,
    lightLux: 250,
    proximityNear: false,
    stepCount: 0,
  };

  const [sensors, setSensors] = useState<SensorValues>(() => {
    return settings?.sensorValues ? { ...defaultSensors, ...settings.sensorValues } : defaultSensors;
  });

  const [tab, setTab] = useState<"3d" | "motion" | "environment">("3d");
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [lastPacketTime, setLastPacketTime] = useState<number>(0);
  const [dragMode, setDragMode] = useState<"live" | "manual">("live");
  const [manualRot, setManualRot] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragStartRef = useRef<{ startX: number; startY: number; startRotX: number; startRotY: number } | null>(null);
  const streamActiveRef = useRef<boolean>(true);
  streamActiveRef.current = isStreaming;

  // Send live_sensor_start command to child device when screen mounts
  useEffect(() => {
    if (!targetChildId) return;

    let mounted = true;

    // Send command to child phone to start high-rate sensor streaming
    sendRemoteCommandToKid(
      activeParentId,
      targetChildId,
      "live_sensor_start",
      undefined,
      child?.name
    ).catch((err) => {
      console.warn("[SensorDashboardScreen] Failed to send live_sensor_start:", err);
    });

    // Listen to real-time high-speed SSE events
    const unsubStream = serverApiClient.on("sensor_stream", (eventData: any) => {
      if (!mounted) return;
      if (eventData && eventData.childId === targetChildId && eventData.sensors) {
        setSensors((prev) => ({
          ...prev,
          ...eventData.sensors,
        }));
        setPacketCount((c) => c + 1);
        setLastPacketTime(Date.now());
      }
    });

    // Also update from settings snapshot if refreshed
    if (settings?.sensorValues) {
      setSensors((prev) => ({ ...prev, ...settings.sensorValues }));
    }

    return () => {
      mounted = false;
      unsubStream();
      // Send command to child phone to stop streaming and save battery
      sendRemoteCommandToKid(
        activeParentId,
        targetChildId,
        "live_sensor_stop",
        undefined,
        child?.name
      ).catch(() => {});
    };
  }, [targetChildId, activeParentId, child?.name]);

  // Toggle sensor stream on/off manually
  const toggleStreaming = useCallback(() => {
    if (!targetChildId) return;
    if (isStreaming) {
      setIsStreaming(false);
      sendRemoteCommandToKid(activeParentId, targetChildId, "live_sensor_stop", undefined, child?.name).catch(() => {});
    } else {
      setIsStreaming(true);
      sendRemoteCommandToKid(activeParentId, targetChildId, "live_sensor_start", undefined, child?.name).catch(() => {});
    }
  }, [isStreaming, targetChildId, activeParentId, child?.name]);

  // Pointer drag events for manual 3D model inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotX: manualRot.x,
      startRotY: manualRot.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;
    setDragMode("manual");
    setManualRot({
      x: Math.max(-85, Math.min(85, dragStartRef.current.startRotX - deltaY * 0.7)),
      y: (dragStartRef.current.startRotY + deltaX * 0.7) % 360,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  // Reset to live sensor sync
  const resetToLive = () => {
    setDragMode("live");
    setManualRot({ x: 0, y: 0 });
    updateSensorValues(targetChildId, {
      pitch: 0,
      roll: 0,
      yaw: 0,
    });
  };

  // Derived calculations
  const totalGForce = Math.sqrt(
    Math.pow(sensors.accelX, 2) + Math.pow(sensors.accelY, 2) + Math.pow(sensors.accelZ, 2)
  ) / 9.8;

  const totalMagnetField = Math.sqrt(
    Math.pow(sensors.magnetX, 2) + Math.pow(sensors.magnetY, 2) + Math.pow(sensors.magnetZ, 2)
  );

  const estimatedAltitude = Math.round(
    (1 - Math.pow(Math.max(300, sensors.pressureHpa) / 1013.25, 0.190284)) * 44307.69
  );

  // Connection indicator status
  const isReceivingLive = isStreaming && Date.now() - lastPacketTime < 3500 && packetCount > 0;

  return (
    <div
      className="flex-1 flex flex-col bg-slate-50 select-none pb-8 overflow-y-auto"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top App Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Cảm Biến & Mô Hình 3D Vị Trí</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {child?.name || "Bé"} • Con quay, gia tốc & không gian 3D
            </p>
          </div>
        </div>

        {/* Live streaming status badge with pause/play toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleStreaming}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
              isReceivingLive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : isStreaming
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
            }`}
            title={isStreaming ? "Bấm để tạm dừng truyền cảm biến (tiết kiệm pin)" : "Bấm để tiếp tục truyền cảm biến trực tiếp"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isReceivingLive
                  ? "bg-emerald-500 animate-pulse"
                  : isStreaming
                  ? "bg-amber-500 animate-ping"
                  : "bg-slate-400"
              }`}
            />
            <span>
              {isReceivingLive
                ? `LIVE: ${packetCount} gói`
                : isStreaming
                ? "Đang kết nối..."
                : "Đã tạm dừng"}
            </span>
            {isStreaming ? <Pause size={11} className="ml-0.5 opacity-70" /> : <Play size={11} className="ml-0.5 opacity-70" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setTab("3d")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "3d" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
            }`}
          >
            <Smartphone size={14} />
            <span>Mô Hình 3D</span>
          </button>
          <button
            onClick={() => setTab("motion")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "motion" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
            }`}
          >
            <Activity size={14} />
            <span>Gia Tốc & Con Quay</span>
          </button>
          <button
            onClick={() => setTab("environment")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === "environment" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
            }`}
          >
            <Gauge size={14} />
            <span>Môi Trường & Áp Suất</span>
          </button>
        </div>

        {tab === "3d" && (
          <div className="space-y-4">
            {/* 3D Visualizer Stage Card */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden space-y-3 border border-slate-800">
              {/* Card Header with Mode Pill */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full font-bold backdrop-blur-md">
                  <Move3d size={13} className="text-indigo-400" />
                  <span>Không Gian 3D Real-time</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      dragMode === "live"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {dragMode === "live" ? "📱 Theo máy thật" : "🔄 Xoay tự do"}
                  </span>
                </div>
              </div>

              {/* Interactive 3D Component */}
              <Phone3DModel
                pitch={sensors.pitch}
                roll={sensors.roll}
                yaw={sensors.yaw}
                battery={child?.battery || 85}
                childName={child?.name || "Bé"}
                dragMode={dragMode}
                manualRot={manualRot}
                onManualDragStart={handlePointerDown}
              />

              <p className="text-[10px] text-center text-slate-400 font-medium">
                {dragMode === "manual"
                  ? "👉 Chạm giữ và vuốt màn hình để xoay mô hình 360 độ"
                  : "💡 Mô hình đang tự động xoay theo cử chỉ nghiêng và hướng máy con"}
              </p>

              {/* Euler Angles Display */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-xl backdrop-blur-xs">
                  <p className="text-[10px] text-slate-400 font-semibold">Góc Nghiêng (Pitch)</p>
                  <p className="text-sm font-black text-white mt-0.5">
                    {sensors.pitch > 0 ? `+${sensors.pitch.toFixed(1)}` : sensors.pitch.toFixed(1)}°
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl backdrop-blur-xs">
                  <p className="text-[10px] text-slate-400 font-semibold">Góc Lắc (Roll)</p>
                  <p className="text-sm font-black text-white mt-0.5">
                    {sensors.roll > 0 ? `+${sensors.roll.toFixed(1)}` : sensors.roll.toFixed(1)}°
                  </p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl backdrop-blur-xs">
                  <p className="text-[10px] text-slate-400 font-semibold">Hướng La Bàn (Yaw)</p>
                  <p className="text-sm font-black text-white mt-0.5">{sensors.yaw.toFixed(0)}°</p>
                </div>
              </div>

              {/* Reset / Live Alignment Button */}
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={resetToLive}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  title="Đặt lại chế độ đồng bộ theo cảm biến thực tế"
                >
                  <RotateCcw size={12} />
                  <span>{dragMode === "manual" ? "Về góc máy thật" : "Cân bằng lại"}</span>
                </button>
              </div>
            </div>

            {/* Compass & Heading Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative w-18 h-18 flex items-center justify-center bg-slate-50 rounded-full border border-slate-200 shadow-inner">
                  {/* Compass cardinal ticks */}
                  <span className="absolute top-1 text-[9px] font-black text-rose-500">N</span>
                  <span className="absolute bottom-1 text-[9px] font-bold text-slate-400">S</span>
                  <span className="absolute right-1.5 text-[9px] font-bold text-slate-400">E</span>
                  <span className="absolute left-1.5 text-[9px] font-bold text-slate-400">W</span>

                  {/* Compass needle */}
                  <div
                    className="absolute w-1.5 h-12 flex flex-col items-center justify-between transition-transform duration-150"
                    style={{ transform: `rotate(${sensors.yaw}deg)` }}
                  >
                    <div className="w-2.5 h-6 bg-rose-500 rounded-t-full shadow-xs" />
                    <div className="w-2 h-6 bg-slate-400 rounded-b-full" />
                  </div>
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-900 ring-2 ring-white z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Compass size={16} className="text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-900">La Bàn Từ Trường Kỹ Thuật Số</h4>
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-0.5">
                    {sensors.yaw.toFixed(0)}°{" "}
                    <span className="text-xs font-bold text-indigo-600">
                      {sensors.yaw < 22.5 || sensors.yaw >= 337.5
                        ? "Hướng Bắc (N)"
                        : sensors.yaw < 67.5
                        ? "Đông Bắc (NE)"
                        : sensors.yaw < 112.5
                        ? "Hướng Đông (E)"
                        : sensors.yaw < 157.5
                        ? "Đông Nam (SE)"
                        : sensors.yaw < 202.5
                        ? "Hướng Nam (S)"
                        : sensors.yaw < 247.5
                        ? "Tây Nam (SW)"
                        : sensors.yaw < 292.5
                        ? "Hướng Tây (W)"
                        : "Tây Bắc (NW)"}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Từ trường tổng hợp: {totalMagnetField > 0 ? `${totalMagnetField.toFixed(1)} µT` : "±45 µT chuẩn"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "motion" && (
          <div className="space-y-4">
            {/* Total G-Force overview */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-blue-100">Tổng Lực Trọng Trường (G-Force)</span>
                <p className="text-2xl font-black mt-0.5">{totalGForce.toFixed(2)} G</p>
                <p className="text-[10px] text-blue-100 mt-0.5">
                  {totalGForce > 1.8 ? "⚠️ Thiết bị đang rung lắc hoặc chuyển động mạnh" : "✅ Trạng thái ổn định, bình thường"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
                🚀
              </div>
            </div>

            {/* Accelerometer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
                Gia Tốc Kế 3 Trục (Accelerometer):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <SensorCard icon={<Activity size={14} />} label="Trục X (Ngang)" value={sensors.accelX} unit="m/s²" color="blue" />
                <SensorCard icon={<Activity size={14} />} label="Trục Y (Dọc)" value={sensors.accelY} unit="m/s²" color="blue" />
                <SensorCard icon={<Activity size={14} />} label="Trục Z (Độ cao)" value={sensors.accelZ} unit="m/s²" color="blue" />
              </div>
            </div>

            {/* Gyroscope */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
                Con Quay Hồi Chuyển (Gyroscope):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <SensorCard icon={<Compass size={14} />} label="Vận tốc X" value={sensors.gyroX} unit="rad/s" color="indigo" />
                <SensorCard icon={<Compass size={14} />} label="Vận tốc Y" value={sensors.gyroY} unit="rad/s" color="indigo" />
                <SensorCard icon={<Compass size={14} />} label="Vận tốc Z" value={sensors.gyroZ} unit="rad/s" color="indigo" />
              </div>
            </div>

            {/* Magnetometer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
                Từ Kế 3 Trục (Magnetometer):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <SensorCard icon={<Navigation size={14} />} label="Từ trường X" value={sensors.magnetX} unit="µT" color="violet" />
                <SensorCard icon={<Navigation size={14} />} label="Từ trường Y" value={sensors.magnetY} unit="µT" color="violet" />
                <SensorCard icon={<Navigation size={14} />} label="Từ trường Z" value={sensors.magnetZ} unit="µT" color="violet" />
              </div>
            </div>

            {/* Step count summary card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Footprints size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Đếm Bước Chân Tích Hợp</h4>
                  <p className="text-base font-black text-emerald-600 mt-0.5">
                    {sensors.stepCount.toLocaleString()} bước
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Đã hoàn thành {Math.min(100, Math.round((sensors.stepCount / 6000) * 100))}% mục tiêu 6,000 bước/ngày
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "environment" && (
          <div className="space-y-3">
            <SensorCard
              icon={<Gauge size={16} />}
              label="Áp Suất Khí Quyển (Barometer)"
              value={sensors.pressureHpa}
              unit="hPa"
              color="amber"
              subtitle={`Ước tính độ cao so với mực nước biển: ~${estimatedAltitude} mét`}
            />

            <SensorCard
              icon={<Sun size={16} />}
              label="Cảm Biến Ánh Sáng Môi Trường (Lux)"
              value={sensors.lightLux}
              unit="Lux"
              color="amber"
              subtitle={
                sensors.lightLux < 20
                  ? "🌙 Môi trường tối (phòng ngủ / ban đêm)"
                  : sensors.lightLux < 300
                  ? "💡 Ánh sáng đèn phòng học bình thường"
                  : "☀️ Môi trường ngoài trời / ánh sáng mạnh"
              }
            />

            {/* Proximity Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    sensors.proximityNear ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <Eye size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Cảm Biến Tiệm Cận (Proximity)</h4>
                  <p
                    className={`text-sm font-bold mt-0.5 ${
                      sensors.proximityNear ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {sensors.proximityNear ? "⚠️ Có vật thể che sát màn hình (đang úp mặt hoặc áp tai)" : "✅ Thông thoáng, không bị che khuất"}
                  </p>
                  <p className="text-[10px] text-slate-400">Khoảng cách tiệm cận: {sensors.proximityNear ? "< 5 cm" : "> 5 cm (An toàn)"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorDashboardScreen;
