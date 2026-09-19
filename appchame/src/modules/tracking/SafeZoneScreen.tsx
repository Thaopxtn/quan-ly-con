import React, { useState } from 'react';
import {
  ChevronLeft,
  Plus,
  Home,
  School,
  Gamepad2,
  Bell,
  MapPin,
  X,
  Check,
  Trash2,
  Pencil,
  Navigation,
  Sliders,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  LocateFixed,
  BellRing,
  Volume2,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { InteractiveMap } from '@shared/components/InteractiveMap';
import { SafeZone } from '@shared/types';
import { makePhoneCall } from '@shared/utils/phoneCall';

interface SafeZoneScreenProps {
  onBack: () => void;
}

const PRESET_ICONS = [
  { id: 'home', label: 'Nhà', icon: Home, color: '#10B981' },
  { id: 'school', label: 'Trường học', icon: School, color: '#3B82F6' },
  { id: 'family', label: 'Nhà ông bà', icon: Home, color: '#8B5CF6' },
  { id: 'tutoring', label: 'Lớp học thêm', icon: School, color: '#06B6D4' },
  { id: 'gamepad', label: 'Khu vui chơi', icon: Gamepad2, color: '#F59E0B' },
  { id: 'map-pin', label: 'Địa điểm khác', icon: MapPin, color: '#EC4899' },
];

export const SafeZoneScreen: React.FC<SafeZoneScreenProps> = ({ onBack }) => {
  const { state, toggleSafeZone, addSafeZone, updateSafeZone, deleteSafeZone } = useAppState();
  const { safeZones, children, selectedChildId, child } = state;
  const currentChild = children?.find((c) => c.id === selectedChildId) || child;

  // Modal State (Add or Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneAddress, setZoneAddress] = useState('');
  const [zoneRadius, setZoneRadius] = useState(300);
  const [selectedIcon, setSelectedIcon] = useState('school');
  const [notifyOnEnter, setNotifyOnEnter] = useState(true);
  const [notifyOnExit, setNotifyOnExit] = useState(true);
  const [zoneLat, setZoneLat] = useState(currentChild.lat);
  const [zoneLng, setZoneLng] = useState(currentChild.lng);

  // Simulation test state
  const [showSimModal, setShowSimModal] = useState(false);
  const [simType, setSimType] = useState<'exit' | 'enter'>('exit');
  const [simulatedZone, setSimulatedZone] = useState<SafeZone | null>(null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'home':
        return <Home size={18} className="text-emerald-600" />;
      case 'school':
        return <School size={18} className="text-blue-600" />;
      case 'family':
        return <Home size={18} className="text-purple-600" />;
      case 'tutoring':
        return <School size={18} className="text-cyan-600" />;
      case 'gamepad':
        return <Gamepad2 size={18} className="text-amber-600" />;
      default:
        return <MapPin size={18} className="text-pink-600" />;
    }
  };

  const openAddModal = () => {
    setEditingZoneId(null);
    setZoneName('');
    setZoneAddress(currentChild.currentAddress || 'Vị trí hiện tại của con');
    setZoneRadius(300);
    setSelectedIcon('school');
    setNotifyOnEnter(true);
    setNotifyOnExit(true);
    setZoneLat(currentChild.lat);
    setZoneLng(currentChild.lng);
    setShowModal(true);
  };

  const openEditModal = (zone: SafeZone) => {
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZoneAddress(zone.address);
    setZoneRadius(zone.radius);
    setSelectedIcon(zone.icon);
    setNotifyOnEnter(zone.notifyOnEnter ?? true);
    setNotifyOnExit(zone.notifyOnExit ?? true);
    setZoneLat(zone.lat);
    setZoneLng(zone.lng);
    setShowModal(true);
  };

  const handleUseCurrentChildLocation = () => {
    setZoneLat(currentChild.lat);
    setZoneLng(currentChild.lng);
    setZoneAddress(currentChild.currentAddress || 'Vị trí hiện tại của con');
  };

  const handleSaveZone = () => {
    if (!zoneName.trim()) return;

    const preset = PRESET_ICONS.find((p) => p.id === selectedIcon) || PRESET_ICONS[0];

    if (editingZoneId) {
      // Update existing
      const existing = safeZones.find((z) => z.id === editingZoneId);
      if (existing && updateSafeZone) {
        updateSafeZone({
          ...existing,
          name: zoneName.trim(),
          address: zoneAddress.trim() || 'Khu vực chỉ định',
          radius: zoneRadius,
          icon: selectedIcon,
          color: preset.color,
          lat: zoneLat,
          lng: zoneLng,
          notifyOnEnter,
          notifyOnExit,
        });
      }
    } else {
      // Add new
      const newZone: SafeZone = {
        id: 'zone_' + Date.now(),
        name: zoneName.trim(),
        icon: selectedIcon,
        radius: zoneRadius,
        isActive: true,
        address: zoneAddress.trim() || 'Khu vực chỉ định',
        lat: zoneLat + (Math.random() - 0.5) * 0.002,
        lng: zoneLng + (Math.random() - 0.5) * 0.002,
        color: preset.color,
        notifyOnEnter,
        notifyOnExit,
      };
      addSafeZone(newZone);
    }

    setShowModal(false);
  };

  // Trigger test simulation
  const handleTestSimulation = (zone: SafeZone, type: 'exit' | 'enter') => {
    setSimulatedZone(zone);
    setSimType(type);
    setShowSimModal(true);
  };

  // Preview zone object for live SVG map preview while modal is open
  const previewZoneData = showModal
    ? {
        lat: zoneLat,
        lng: zoneLng,
        radius: zoneRadius,
        color: PRESET_ICONS.find((p) => p.id === selectedIcon)?.color || '#2563EB',
      }
    : null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6 overflow-y-auto">
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
            <h2 className="text-base font-bold text-slate-800">Vùng an toàn (Geofencing)</h2>
            <p className="text-[10px] text-slate-400 font-medium">Báo động khi con ra/vào khu vực</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition cursor-pointer"
          title="Thêm vùng mới"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Geofence Map View */}
      <div className="p-3">
        <InteractiveMap
          safeZones={safeZones}
          centerLat={currentChild.lat}
          centerLng={currentChild.lng}
          childAddress={currentChild.currentAddress}
          childName={currentChild.name}
          childAvatar={currentChild.avatar}
          battery={currentChild.battery}
          previewZone={previewZoneData}
          className="h-60"
        />
      </div>

      {/* Safe Zones List */}
      <div className="flex-1 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Danh sách vùng an toàn</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
            {safeZones.filter((z) => z.isActive).length}/{safeZones.length} Đang kích hoạt
          </span>
        </div>

        <div className="space-y-2.5">
          {safeZones.map((zone) => (
            <div
              key={zone.id}
              className={`bg-white rounded-2xl p-3.5 border transition ${
                zone.isActive ? 'border-slate-200/80 shadow-xs' : 'border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: `${zone.color}18` }}
                  >
                    {getIcon(zone.icon)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{zone.name}</h4>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded shrink-0">
                        {zone.radius}m
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{zone.address}</p>
                    {/* Alert tags */}
                    <div className="flex items-center space-x-2 mt-1.5 text-[9.5px]">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        zone.notifyOnEnter ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {zone.notifyOnEnter ? '✓ Báo khi vào' : '✕ Tắt báo vào'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        zone.notifyOnExit ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {zone.notifyOnExit ? '✓ Báo khi rời' : '✕ Tắt báo rời'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: Edit, Delete, Toggle */}
                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <button
                    onClick={() => openEditModal(zone)}
                    title="Chỉnh sửa vùng"
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => deleteSafeZone(zone.id)}
                    title="Xóa vùng"
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>

                  {/* iOS style toggle */}
                  <button
                    onClick={() => toggleSafeZone(zone.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 cursor-pointer ml-1 ${
                      zone.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        zone.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Simulation Quick Trigger Bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 text-[10px]">Kiểm tra thông báo:</span>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleTestSimulation(zone, 'exit')}
                    className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-[10px] transition cursor-pointer"
                  >
                    Thử báo RỜI vùng
                  </button>
                  <button
                    onClick={() => handleTestSimulation(zone, 'enter')}
                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[10px] transition cursor-pointer"
                  >
                    Thử báo VÀO vùng
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Safe Zone Button */}
        <button
          onClick={openAddModal}
          className="w-full mt-3 py-3 border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition active:scale-[0.99] cursor-pointer"
        >
          <Plus size={16} />
          <span>Thêm Vùng An Toàn Mới</span>
        </button>
      </div>

      {/* Modal Add / Edit Safe Zone */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-600" />
                <span>{editingZoneId ? 'Chỉnh sửa Vùng An Toàn' : 'Thiết lập Vùng An Toàn Mới'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              {/* Type / Icon Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Loại địa điểm
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ICONS.map((p) => {
                    const IconComp = p.icon;
                    const isSelected = selectedIcon === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedIcon(p.id)}
                        className={`p-2 rounded-xl border flex items-center space-x-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-xs'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <IconComp size={15} style={{ color: p.color }} />
                        <span className="text-[10px] font-bold truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zone Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tên khu vực
                </label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="VD: Nhà ông bà, Lớp học bơi, Trường học..."
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address with Use Current Child Location Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Địa chỉ
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentChildLocation}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LocateFixed size={11} />
                    <span>Lấy vị trí của con</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={zoneAddress}
                  onChange={(e) => setZoneAddress(e.target.value)}
                  placeholder="VD: 45 Lê Lợi, Bến Nghé, Quận 1..."
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Radius Slider with Live Label */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Bán kính bảo vệ
                  </label>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {zoneRadius} mét
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={zoneRadius}
                  onChange={(e) => setZoneRadius(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>100m (Tòa nhà)</span>
                  <span>500m (Khu phố)</span>
                  <span>1500m (Phường)</span>
                </div>
              </div>

              {/* Notification Checkboxes */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Thiết lập chuông cảnh báo
                </span>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Bell size={14} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-700">Báo khi con VÀO vùng</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnEnter}
                    onChange={(e) => setNotifyOnEnter(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span className="text-xs font-semibold text-slate-700">Báo khi con RỜI KHỎI vùng</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyOnExit}
                    onChange={(e) => setNotifyOnExit(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveZone}
                disabled={!zoneName.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {editingZoneId ? 'Lưu Thay Đổi' : 'Tạo Vùng An Toàn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geofence Alert Simulation Modal */}
      {showSimModal && simulatedZone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                simType === 'exit' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {simType === 'exit' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  simType === 'exit' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {simType === 'exit' ? 'Cảnh báo Rời Vùng' : 'Thông báo Vào Vùng'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">
                  Bé {currentChild.name} vừa {simType === 'exit' ? 'rời khỏi' : 'đến'} {simulatedZone.name}
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 text-xs space-y-1.5 text-slate-700">
              <p>📍 <strong>Khu vực:</strong> {simulatedZone.name} (Bán kính {simulatedZone.radius}m)</p>
              <p>📌 <strong>Địa chỉ:</strong> {simulatedZone.address}</p>
              <p>⏱️ <strong>Thời gian:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>⚡ <strong>Tốc độ hiện tại:</strong> {currentChild.speed || 16} km/h • Pin: {currentChild.battery}%</p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => makePhoneCall(currentChild.phone || '0987654321')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <PhoneCall size={14} />
                <span>Gọi cho con</span>
              </button>

              <button
                onClick={() => setShowSimModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
