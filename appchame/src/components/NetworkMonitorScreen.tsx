import React, { useState } from "react";
import {
  ChevronLeft,
  Wifi,
  Radio,
  Bluetooth,
  Lock,
  Unlock,
  RefreshCw,
  Signal,
  Smartphone,
  Headphones,
  Watch,
  Speaker
} from "lucide-react";
import { useAppState } from "@shared/store";
import { NetworkInfo } from "@shared/types";

interface NetworkMonitorScreenProps {
  onBack?: () => void;
}

function WifiSignalBars({ signal }: { signal: number }) {
  const level = signal >= -55 ? 4 : signal >= -67 ? 3 : signal >= -78 ? 2 : signal >= -89 ? 1 : 0;
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-sm transition-all ${
            b <= level ? "bg-emerald-500" : "bg-slate-200"
          }`}
          style={{ height: `${b * 3.5 + 4}px` }}
        />
      ))}
    </div>
  );
}

function CellBars({ bars }: { bars: number }) {
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <div
          key={b}
          className={`w-1.5 rounded-sm transition-all ${
            b <= bars ? "bg-blue-600" : "bg-slate-200"
          }`}
          style={{ height: `${b * 3.5 + 4}px` }}
        />
      ))}
    </div>
  );
}

export const NetworkMonitorScreen: React.FC<NetworkMonitorScreenProps> = ({ onBack }) => {
  const { state, dispatchRemoteCommand } = useAppState();
  const targetChildId = state.selectedChildId;
  const child = state.children.find((c) => c.id === targetChildId) || state.children[0] || state.child;
  const settings = state.childSettings[targetChildId];
  const net: NetworkInfo = settings?.networkInfo || {
    wifiSSID: "Chưa kết nối",
    wifiSignalDbm: -100,
    wifiConnected: false,
    cellBars: 0,
    cellType: "N/A",
    cellConnected: false,
    nearbyWifis: [],
    nearbyBluetooth: [],
  };

  const [tab, setTab] = useState<"overview" | "wifi" | "bluetooth">("overview");
  const [isScanning, setIsScanning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setToastMsg("Đang gửi yêu cầu quét sóng & đồng bộ mạng đến máy con...");
    try {
      await dispatchRemoteCommand("sync_request", undefined, targetChildId, "Yêu cầu đồng bộ mạng & cảm biến 🔄");
      setTimeout(() => {
        setIsScanning(false);
        setToastMsg("Đã gửi lệnh yêu cầu cập nhật mạng từ xa thành công!");
        setTimeout(() => setToastMsg(null), 2500);
      }, 1500);
    } catch (_) {
      setIsScanning(false);
      setToastMsg("Không thể gửi lệnh đồng bộ. Vui lòng kiểm tra kết nối mạng!");
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  const getBtIcon = (type: string) => {
    switch (type) {
      case "headphone":
        return <Headphones size={18} />;
      case "watch":
        return <Watch size={18} />;
      case "speaker":
        return <Speaker size={18} />;
      case "phone":
        return <Smartphone size={18} />;
      default:
        return <Radio size={18} />;
    }
  };

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
              <span>Giám Sát Mạng & Sóng Tín Hiệu</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Thiết bị {child?.name || "Bé"} • WiFi, 4G/5G & Thiết bị Bluetooth
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <RefreshCw size={13} className={isScanning ? "animate-spin" : ""} />
          <span>Quét lại</span>
        </button>
      </div>

      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setTab("overview")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "overview" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
            }`}
          >
            📊 Tổng Quan Sóng
          </button>
          <button
            onClick={() => setTab("wifi")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "wifi" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
            }`}
          >
            📶 Quét WiFi ({net.nearbyWifis.length})
          </button>
          <button
            onClick={() => setTab("bluetooth")}
            className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
              tab === "bluetooth" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600"
            }`}
          >
            🔵 Bluetooth ({net.nearbyBluetooth.length})
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-3">
            {/* Active WiFi Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Wifi size={22} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">Mạng WiFi Hiện Tại</h4>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                          net.wifiConnected
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {net.wifiConnected ? "Đang kết nối" : "Ngắt kết nối"}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{net.wifiSSID}</p>
                    <p className="text-[11px] text-slate-500">
                      Cường độ tín hiệu: {net.wifiSignalDbm} dBm (Rất tốt)
                    </p>
                  </div>
                </div>
                <WifiSignalBars signal={net.wifiSignalDbm} />
              </div>
            </div>

            {/* Cellular Network Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Radio size={22} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">Sóng Mạng Di Động</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.2 rounded-full font-bold">
                        {net.cellType} LTE
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 mt-0.5">Viettel Telecom</p>
                    <p className="text-[11px] text-slate-500">{net.cellBars}/4 vạch • Đầy đủ băng thông</p>
                  </div>
                </div>
                <CellBars bars={net.cellBars} />
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wifi size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    WiFi Xung Quanh
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {net.nearbyWifis.length} điểm
                  </p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Bluetooth size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Thiết Bị Bluetooth
                  </p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {net.nearbyBluetooth.length} thiết bị
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "wifi" && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 font-medium px-1">
              Danh sách các mạng WiFi máy con đang thu được trong phạm vi:
            </p>
            {net.nearbyWifis.map((wifi, idx) => (
              <div
                key={`${wifi.ssid}-${idx}`}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                  wifi.isConnected
                    ? "bg-emerald-50/50 border-emerald-200 shadow-xs"
                    : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      wifi.isConnected
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Wifi size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <p
                        className={`text-xs font-bold truncate ${
                          wifi.isConnected ? "text-emerald-900" : "text-slate-800"
                        }`}
                      >
                        {wifi.ssid}
                      </p>
                      {wifi.isConnected && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black shrink-0">
                          ĐANG DÙNG
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span>{wifi.signal} dBm</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        {wifi.isSecured ? (
                          <>
                            <Lock size={10} className="text-slate-400" /> WPA2 Bảo Mật
                          </>
                        ) : (
                          <>
                            <Unlock size={10} className="text-amber-500" /> Mạng Mở
                          </>
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                <WifiSignalBars signal={wifi.signal} />
              </div>
            ))}
          </div>
        )}

        {tab === "bluetooth" && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500 font-medium px-1">
              Các phụ kiện & thiết bị Bluetooth xung quanh điện thoại con:
            </p>
            {net.nearbyBluetooth.map((bt, idx) => (
              <div
                key={`${bt.name}-${idx}`}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                  bt.isPaired
                    ? "bg-indigo-50/50 border-indigo-200 shadow-xs"
                    : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      bt.isPaired ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getBtIcon(bt.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <p
                        className={`text-xs font-bold truncate ${
                          bt.isPaired ? "text-indigo-900" : "text-slate-800"
                        }`}
                      >
                        {bt.name}
                      </p>
                      {bt.isPaired && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-black shrink-0">
                          ĐÃ GHÉP NỐI
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Cường độ sóng RSSI: {bt.rssi} dBm
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      bt.isPaired
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {bt.isPaired ? "Đã liên kết" : "Khả dụng"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkMonitorScreen;
