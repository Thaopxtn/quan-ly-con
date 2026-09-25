import React, { useState, useEffect } from "react";
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
  RotateCcw
} from "lucide-react";
import { useAppState } from "@shared/store";
import { SensorValues } from "@shared/types";

interface SensorDashboardScreenProps {
  onBack?: () => void;
}

function SensorCard({
  icon,
  label,
  value,
  unit,
  color = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  color?: "indigo" | "blue" | "emerald" | "amber" | "rose" | "violet";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className={`rounded-2xl p-3.5 border ${colorMap[color]} shadow-2xs space-y-1`}>
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
    </div>
  );
}

// 3D Phone Model using CSS Perspective & Transform
function Phone3DModel({ pitch, roll, yaw }: { pitch: number; roll: number; yaw: number }) {
  return (
    <div
      className="flex items-center justify-center py-6 select-none"
      style={{ perspective: "800px", height: "230px" }}
    >
      <div
        style={{
          width: "110px",
          height: "190px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${-pitch}deg) rotateY(${yaw * 0.4}deg) rotateZ(${-roll}deg)`,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
        }}
      >
        {/* Phone Case Outer Border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(145deg, #1e293b, #0f172a)",
            borderRadius: "26px",
            border: "3px solid #64748b",
            boxShadow:
              "0 25px 50px -12px rgba(15, 23, 42, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px",
          }}
        >
          {/* Dynamic Island / Speaker */}
          <div
            style={{
              width: "36px",
              height: "10px",
              backgroundColor: "#020617",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#3b82f6" }} />
          </div>

          {/* Screen showing real-time 3D orientation */}
          <div
            style={{
              flex: 1,
              width: "100%",
              margin: "6px 0",
              borderRadius: "18px",
              background: "linear-gradient(180deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              padding: "6px",
              boxShadow: "inset 0 0 10px rgba(0,0,0,0.2)",
            }}
          >
            <Smartphone size={26} className="text-white/90 drop-shadow-md mb-1" />
            <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "-0.5px" }}>
              KidCare OS
            </span>
            <span style={{ fontSize: "8px", opacity: 0.9 }}>Không Gian 3D Realtime</span>
          </div>

          {/* Home indicator bar */}
          <div
            style={{
              width: "32px",
              height: "3px",
              backgroundColor: "#94a3b8",
              borderRadius: "4px",
            }}
          />
        </div>

        {/* 3D Depth Edges */}
        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "-7px",
            width: "7px",
            height: "178px",
            background: "linear-gradient(to right, #334155, #0f172a)",
            borderRadius: "0 12px 12px 0",
            transform: "rotateY(90deg) translateX(3.5px)",
            transformOrigin: "left center",
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
  const settings = state.childSettings[targetChildId];

  const sensors: SensorValues = settings?.sensorValues || {
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

  const [tab, setTab] = useState<"3d" | "motion" | "environment">("3d");

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-8 overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs">
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
              Thiết bị {child?.name || "Bé"} • Con quay, gia tốc & không gian 3 chiều
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cảm biến LIVE</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* View Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setTab("3d")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "3d" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
            }`}
          >
            📱 Mô Hình 3D Điện Thoại
          </button>
          <button
            onClick={() => setTab("motion")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "motion" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
            }`}
          >
            ⚡ Gia Tốc & Con Quay
          </button>
          <button
            onClick={() => setTab("environment")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "environment" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
            }`}
          >
            🌡️ Môi Trường & Ánh Sáng
          </button>
        </div>

        {tab === "3d" && (
          <div className="space-y-4">
            {/* 3D Visualizer Stage Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full font-bold">
                  <Maximize2 size={12} className="text-indigo-400" />
                  Mô Phỏng Không Gian 3D Real-time
                </span>
                <span className="text-[10px] text-slate-400">Tự động xoay theo cảm biến</span>
              </div>

              {/* 3D Component */}
              <Phone3DModel pitch={sensors.pitch} roll={sensors.roll} yaw={sensors.yaw} />

              {/* Euler Angles Display */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-semibold">Góc Nghiêng (Pitch)</p>
                  <p className="text-sm font-black text-white mt-0.5">{sensors.pitch.toFixed(1)}°</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-semibold">Góc Lắc (Roll)</p>
                  <p className="text-sm font-black text-white mt-0.5">{sensors.roll.toFixed(1)}°</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-semibold">Hướng La Bàn (Yaw)</p>
                  <p className="text-sm font-black text-white mt-0.5">{sensors.yaw.toFixed(0)}°</p>
                </div>
              </div>
            </div>

            {/* Compass & Heading Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16 flex items-center justify-center bg-slate-50 rounded-full border border-slate-200">
                  {/* Compass needle */}
                  <div
                    className="absolute w-1 h-12 flex flex-col items-center justify-between transition-transform duration-300"
                    style={{ transform: `rotate(${sensors.yaw}deg)` }}
                  >
                    <div className="w-2.5 h-6 bg-rose-500 rounded-t-full shadow-xs" />
                    <div className="w-2 h-6 bg-slate-400 rounded-b-full" />
                  </div>
                  <div className="w-3 h-3 rounded-full bg-slate-900 ring-2 ring-white z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Compass size={16} className="text-rose-500" />
                    <h4 className="text-xs font-bold text-slate-900">La Bàn Kỹ Thuật Số</h4>
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
                  <p className="text-[11px] text-slate-400">Độ chính xác từ trường: ±0.5°</p>
                </div>
              </div>

              <button
                onClick={() =>
                  updateSensorValues(targetChildId, {
                    pitch: 0,
                    roll: 0,
                    yaw: 0,
                  })
                }
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer"
                title="Đặt lại góc mô phỏng"
              >
                <RotateCcw size={13} />
                <span>Cân bằng</span>
              </button>
            </div>
          </div>
        )}

        {tab === "motion" && (
          <div className="space-y-4">
            {/* Accelerometer */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
                Gia Tốc Kế 3 Trục (m/s²):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <SensorCard icon={<Activity size={14} />} label="Trục X" value={sensors.accelX} unit="m/s²" color="blue" />
                <SensorCard icon={<Activity size={14} />} label="Trục Y" value={sensors.accelY} unit="m/s²" color="blue" />
                <SensorCard icon={<Activity size={14} />} label="Trục Z" value={sensors.accelZ} unit="m/s²" color="blue" />
              </div>
            </div>

            {/* Gyroscope */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
                Con Quay Hồi Chuyển (rad/s):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <SensorCard icon={<Compass size={14} />} label="Gyro X" value={sensors.gyroX} unit="rad/s" color="indigo" />
                <SensorCard icon={<Compass size={14} />} label="Gyro Y" value={sensors.gyroY} unit="rad/s" color="indigo" />
                <SensorCard icon={<Compass size={14} />} label="Gyro Z" value={sensors.gyroZ} unit="rad/s" color="indigo" />
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
                  <p className="text-[10px] text-slate-400">Mục tiêu: 6,000 bước / ngày</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "environment" && (
          <div className="space-y-3">
            <SensorCard
              icon={<Gauge size={16} />}
              label="Áp Suất Khí Quyển (Khí áp kế)"
              value={sensors.pressureHpa}
              unit="hPa"
              color="amber"
            />
            <SensorCard
              icon={<Sun size={16} />}
              label="Cảm Biến Ánh Sáng Môi Trường"
              value={sensors.lightLux}
              unit="Lux"
              color="amber"
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
                  <h4 className="text-xs font-bold text-slate-900">Cảm Biến Tiệm Cận (Gần/Xa)</h4>
                  <p
                    className={`text-sm font-bold mt-0.5 ${
                      sensors.proximityNear ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {sensors.proximityNear ? "⚠️ Có vật thể che sát màn hình" : "✅ Thông thoáng, bình thường"}
                  </p>
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
