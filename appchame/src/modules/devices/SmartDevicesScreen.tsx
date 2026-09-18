import React, { useState } from 'react';
import {
  ChevronLeft,
  Watch,
  Navigation,
  Camera,
  Home,
  ChevronRight,
  BatteryMedium,
  Plus,
  Check,
  X,
  Trash2,
  RefreshCw,
  Wifi,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { ConnectedDevice } from '@shared/types';

interface SmartDevicesScreenProps {
  onBack: () => void;
}

const DEVICE_TYPE_OPTIONS: Array<{
  type: 'smartwatch' | 'gps' | 'camera' | 'smarthome';
  label: string;
  icon: any;
  defaultName: string;
  desc: string;
  color: string;
}> = [
  {
    type: 'smartwatch',
    label: 'Đồng hồ thông minh',
    icon: Watch,
    defaultName: 'KidWatch Pro',
    desc: 'Định vị GPS, nghe gọi 2 chiều và đo nhịp tim',
    color: '#10B981',
  },
  {
    type: 'gps',
    label: 'SmartTag Định vị',
    icon: Navigation,
    defaultName: 'SmartTag Ba lô',
    desc: 'Gắn vào cặp sách hoặc xe đạp của con',
    color: '#3B82F6',
  },
  {
    type: 'camera',
    label: 'Camera góc học tập',
    icon: Camera,
    defaultName: 'Camera bàn học',
    desc: 'Giám sát tư thế ngồi học và ánh sáng phòng',
    color: '#8B5CF6',
  },
  {
    type: 'smarthome',
    label: 'Nhà thông minh',
    icon: Home,
    defaultName: 'Khóa cổng thông minh',
    desc: 'Cảnh báo khi con mở cửa về nhà an toàn',
    color: '#F59E0B',
  },
];

export const SmartDevicesScreen: React.FC<SmartDevicesScreenProps> = ({ onBack }) => {
  const { state, updateDeviceConnection, addSmartDevice, deleteSmartDevice } = useAppState();
  const { devices } = state;

  // Selected device for viewing details
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | null>(null);

  // Add Device Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'smartwatch' | 'gps' | 'camera' | 'smarthome'>('smartwatch');
  const [deviceName, setDeviceName] = useState('Đồng hồ KidWatch Pro');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'form' | 'scanning' | 'success'>('form');

  // Connecting loader for individual device
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const getDeviceIcon = (type: string, color?: string) => {
    switch (type) {
      case 'smartwatch':
        return <Watch size={20} style={{ color: color || '#10B981' }} />;
      case 'gps':
        return <Navigation size={20} style={{ color: color || '#3B82F6' }} />;
      case 'camera':
        return <Camera size={20} style={{ color: color || '#8B5CF6' }} />;
      default:
        return <Home size={20} style={{ color: color || '#F59E0B' }} />;
    }
  };

  const handleToggleConnection = (device: ConnectedDevice) => {
    if (!device.isConnected) {
      setConnectingId(device.id);
      setTimeout(() => {
        updateDeviceConnection(device.id, true);
        setConnectingId(null);
        if (selectedDevice?.id === device.id) {
          setSelectedDevice({ ...device, isConnected: true, statusText: 'Đang kết nối • Tín hiệu tốt' });
        }
      }, 1000);
    } else {
      updateDeviceConnection(device.id, false);
      if (selectedDevice?.id === device.id) {
        setSelectedDevice({ ...device, isConnected: false, statusText: 'Đã ngắt kết nối' });
      }
    }
  };

  const handleOpenAddModal = () => {
    setSelectedType('smartwatch');
    setDeviceName('Đồng hồ KidWatch Pro');
    setScanStep('form');
    setIsScanning(false);
    setShowAddModal(true);
  };

  const handleStartPairing = () => {
    setScanStep('scanning');
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanStep('success');
      const newDev: ConnectedDevice = {
        id: 'dev_' + Date.now(),
        name: deviceName.trim() || 'Thiết bị mới',
        type: selectedType,
        battery: Math.floor(Math.random() * 25) + 75,
        isConnected: true,
        statusText: 'Đang kết nối • Tín hiệu tốt',
        icon: selectedType,
      };
      addSmartDevice(newDev);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800">Kết nối thiết bị thông minh</h2>
            <p className="text-[10px] text-slate-400 font-medium">Đồng hồ, SmartTag, Camera gia đình</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition cursor-pointer"
          title="Thêm thiết bị mới"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Devices List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Thiết bị trong gia đình ({devices.length})</span>
          <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
            {devices.filter((d) => d.isConnected).length} Đang hoạt động
          </span>
        </div>

        <div className="space-y-2.5">
          {devices.map((device) => {
            const isConnected = device.isConnected;
            const isConnecting = connectingId === device.id;

            return (
              <div
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-center justify-between transition hover:border-blue-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0 shadow-2xs">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{device.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{device.statusText}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  {isConnected ? (
                    <div className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-200/80">
                      <BatteryMedium size={13} />
                      <span>{device.battery}%</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleToggleConnection(device)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1"
                    >
                      {isConnecting && <RefreshCw size={10} className="animate-spin" />}
                      <span>{isConnecting ? 'Đang kết nối...' : 'Kết nối'}</span>
                    </button>
                  )}
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Device Button */}
        <button
          onClick={handleOpenAddModal}
          className="w-full mt-4 py-3.5 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition active:scale-[0.99] cursor-pointer"
        >
          <Plus size={16} />
          <span>Thêm thiết bị thông minh mới</span>
        </button>
      </div>

      {/* Modal Add Device */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-600" />
                <span>Thêm Thiết Bị Thông Minh</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {scanStep === 'form' && (
              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Chọn loại thiết bị
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_TYPE_OPTIONS.map((opt) => {
                      const IconComp = opt.icon;
                      const isSelected = selectedType === opt.type;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => {
                            setSelectedType(opt.type);
                            setDeviceName(opt.defaultName);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-xs'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${opt.color}15` }}
                          >
                            <IconComp size={16} style={{ color: opt.color }} />
                          </div>
                          <span className="text-[11px] font-bold truncate leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Đặt tên thiết bị
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="VD: Đồng hồ KidWatch, SmartTag Ba lô..."
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-[11px] text-slate-600 leading-relaxed">
                  💡 <strong>Hướng dẫn:</strong> Bật nguồn thiết bị và đưa lại gần điện thoại (trong phạm vi 5 mét) để quét sóng Bluetooth / Wi-Fi.
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPairing}
                    disabled={!deviceName.trim()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    Quét & Kết nối ngay
                  </button>
                </div>
              </div>
            )}

            {scanStep === 'scanning' && (
              <div className="py-8 text-center space-y-3">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent animate-spin"></div>
                  <Radio size={32} className="text-blue-600 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Đang dò quét tín hiệu Bluetooth...</h4>
                <p className="text-xs text-slate-500">Đang tìm thiết bị &quot;{deviceName}&quot; xung quanh</p>
              </div>
            )}

            {scanStep === 'success' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Ghép Nối Thành Công!</h4>
                <p className="text-xs text-slate-500">
                  Thiết bị <strong>{deviceName}</strong> đã sẵn sàng truyền dữ liệu và định vị.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer mt-2"
                >
                  Hoàn Tất
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Device Details */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {getDeviceIcon(selectedDevice.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedDevice.name}</h3>
                  <span className="text-[10px] text-slate-400 capitalize">{selectedDevice.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Details Stats */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span className={`font-bold ${selectedDevice.isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {selectedDevice.isConnected ? 'Đang kết nối' : 'Đã ngắt'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Dung lượng pin:</span>
                <span className="font-black text-slate-800">{selectedDevice.battery}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kết nối không dây:</span>
                <span className="font-bold text-blue-600">Bluetooth 5.2 / GPS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Cập nhật vị trí:</span>
                <span className="font-medium text-slate-700">Tự động 30s/lần</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleToggleConnection(selectedDevice)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  selectedDevice.isConnected
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                }`}
              >
                {selectedDevice.isConnected ? 'Ngắt kết nối tạm thời' : 'Kết nối lại thiết bị'}
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteSmartDevice(selectedDevice.id);
                  setSelectedDevice(null);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Hủy ghép nối thiết bị này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
