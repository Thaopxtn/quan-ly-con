import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  Trash2,
  Check,
  Edit2,
  Smartphone,
  Monitor,
  Laptop,
  AlertTriangle,
  Star,
  Battery,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { ChildProfile } from '@shared/types';
import { PairChildDeviceModal } from './PairChildDeviceModal';

interface ManageChildrenModalProps {
  onClose: () => void;
  onChildSwitched?: (childId: string) => void;
}

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const ManageChildrenModal: React.FC<ManageChildrenModalProps> = ({
  onClose,
  onChildSwitched,
}) => {
  const {
    state,
    switchChild,
    deleteChild,
    unlinkChildDevice,
    updateChildProfile,
    updateChildAvatar,
    updateChildDeviceName,
  } = useAppState();

  const { children, selectedChildId } = state;

  // Modals inside manage modal
  const [showPairModal, setShowPairModal] = useState(false);
  const [childToDelete, setChildToDelete] = useState<ChildProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState<number>(10);
  const [editGrade, setEditGrade] = useState('');
  const [avatarPickerChildId, setAvatarPickerChildId] = useState<string | null>(null);
  const [deviceToUnlink, setDeviceToUnlink] = useState<{ childId: string; childName: string; deviceId: string; deviceName: string } | null>(null);
  const [editingDevice, setEditingDevice] = useState<{ childId: string; deviceId: string; currentName: string } | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Switch
  const handleSelectChild = (id: string) => {
    switchChild(id);
    onChildSwitched?.(id);
    const target = children.find((c) => c.id === id);
    showToast(`Đã chuyển sang quản lý bé ${target?.name || ''}`);
  };

  // Handle Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChild) return;
    if (!editName.trim()) {
      showToast('Vui lòng nhập tên bé');
      return;
    }

    updateChildProfile(editingChild.id, {
      name: editName.trim(),
      age: Math.max(1, editAge),
      grade: editGrade.trim() || `${editAge} tuổi`,
    });

    showToast(`Đã cập nhật thông tin bé ${editName.trim()}`);
    setEditingChild(null);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!childToDelete) return;
    setIsDeleting(true);
    const childName = childToDelete.name;
    try {
      deleteChild(childToDelete.id);
      await new Promise((r) => setTimeout(r, 600));
      showToast(`Đã xóa hồ sơ bé ${childName} và gửi lệnh gỡ thiết bị thành công!`);
      setChildToDelete(null);
    } catch (e) {
      showToast('Có lỗi xảy ra khi xóa hồ sơ');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Unlink Device Confirmation
  const handleConfirmUnlinkDevice = () => {
    if (!deviceToUnlink) return;
    unlinkChildDevice(deviceToUnlink.childId, deviceToUnlink.deviceId);
    showToast(`Đã hủy kết nối thiết bị "${deviceToUnlink.deviceName}" khỏi bé ${deviceToUnlink.childName}`);
    setDeviceToUnlink(null);
  };

  // Handle Rename Device
  const handleSaveDeviceName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice || !newDeviceName.trim()) return;
    updateChildDeviceName(editingDevice.childId, editingDevice.deviceId, newDeviceName.trim());
    showToast(`Đã đổi tên máy thành "${newDeviceName.trim()}"`);
    setEditingDevice(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Quản Lý Danh Sách Con</h3>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-black rounded-md">
                  {children.length} bé
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Chỉnh sửa hồ sơ, ngắt kết nối thiết bị hoặc xóa con khỏi tài khoản
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Add Bar */}
        <div className="px-5 py-3 bg-blue-50/40 border-b border-blue-100/60 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Cần quản lý thêm bé hoặc thiết bị mới?
          </span>
          <button
            onClick={() => setShowPairModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Thêm bé mới (Mã 6 số)</span>
          </button>
        </div>

        {/* Child List Body */}
        <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto">
          {children.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users size={32} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Chưa có hồ sơ con nào</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Bấm nút "Thêm bé mới" phía trên để kết nối điện thoại của con qua mã PIN 6 số.
              </p>
              <button
                onClick={() => setShowPairModal(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} />
                <span>Ghép đôi thiết bị ngay</span>
              </button>
            </div>
          ) : (
            children.map((child) => {
              const isSelected = child.id === selectedChildId;
              const devices = child.devices || [];
              const isChildLocked = Boolean(
                child.isLocked ||
                state.childSettings?.[child.id]?.isLocked ||
                (child.id === selectedChildId && state.lockChallenge?.isLocked)
              );

              return (
                <div
                  key={child.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'bg-blue-50/20 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* Child Top Bar */}
                  <div className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar with click to change */}
                      <div
                        onClick={() => setAvatarPickerChildId(child.id)}
                        className="relative cursor-pointer group shrink-0"
                        title="Bấm để đổi avatar"
                      >
                        <img
                          src={child.avatar}
                          alt={child.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-400 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Camera size={16} />
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            child.status === 'online'
                              ? 'bg-emerald-500'
                              : child.status === 'studying'
                              ? 'bg-indigo-500'
                              : 'bg-amber-500'
                          }`}
                        />
                      </div>

                      {/* Child Info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900">{child.name}</h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md flex items-center gap-1">
                              <Check size={11} strokeWidth={3} />
                              <span>Đang quản lý</span>
                            </span>
                          )}
                          {isChildLocked && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md">
                              🔒 Đang khóa máy
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{child.age} tuổi</span>
                          <span>•</span>
                          <span>{child.grade}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <Battery size={13} />
                            <span>{child.battery}%</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-700 font-bold">
                            <Star size={11} className="fill-amber-500 text-amber-500" />
                            <span>{state.childSettings?.[child.id]?.kidStars ?? 28} Sao</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Top Right */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => handleSelectChild(child.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-[11px] font-bold rounded-lg transition border border-slate-200/80 cursor-pointer"
                        >
                          Chọn bé
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingChild(child);
                          setEditName(child.name);
                          setEditAge(child.age);
                          setEditGrade(child.grade);
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition border border-transparent hover:border-slate-200 cursor-pointer"
                        title="Chỉnh sửa thông tin bé"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* DELETE CHILD BUTTON (PROMINENT RED) */}
                      <button
                        type="button"
                        onClick={() => setChildToDelete(child)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition border border-rose-200/80 cursor-pointer"
                        title={`Xóa hoàn toàn hồ sơ bé ${child.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Paired Devices Sub-section */}
                  <div className="px-3.5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Smartphone size={12} className="text-blue-600" />
                        <span>Thiết bị đã kết nối ({devices.length} máy):</span>
                      </span>
                    </div>

                    {devices.length === 0 ? (
                      <div className="py-1 px-2 text-[11px] text-slate-400 italic flex items-center justify-between">
                        <span>Chưa gắn thiết bị nào với bé này.</span>
                        <button
                          type="button"
                          onClick={() => setShowPairModal(true)}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          + Ghép đôi máy
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-0.5">
                        {devices.map((dev, dIdx) => {
                          const isPc = dev.deviceType === 'pc' || dev.deviceType === 'desktop';
                          const isLaptop = dev.deviceType === 'laptop';
                          const isCurActiveDev = (child.activeDeviceId === dev.deviceId) || (!child.activeDeviceId && dIdx === 0);

                          return (
                            <div
                              key={dev.deviceId}
                              className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/70"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                  isPc || isLaptop ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {isPc ? <Monitor size={12} /> : isLaptop ? <Laptop size={12} /> : <Smartphone size={12} />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[130px]">
                                      {dev.deviceName || `Thiết bị ${dIdx + 1}`}
                                    </span>
                                    {isCurActiveDev && (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                                        Chính
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 font-mono truncate">
                                    {dev.hardwareIdType?.toUpperCase() || 'ID'}: {dev.deviceId.slice(0, 12)}...
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDevice({
                                      childId: child.id,
                                      deviceId: dev.deviceId,
                                      currentName: dev.deviceName || `Thiết bị ${dIdx + 1}`,
                                    });
                                    setNewDeviceName(dev.deviceName || `Thiết bị ${dIdx + 1}`);
                                  }}
                                  className="p-1 text-[10px] text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition cursor-pointer"
                                  title="Đổi tên thiết bị"
                                >
                                  Đổi tên
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeviceToUnlink({
                                      childId: child.id,
                                      childName: child.name,
                                      deviceId: dev.deviceId,
                                      deviceName: dev.deviceName || `Thiết bị ${dIdx + 1}`,
                                    })
                                  }
                                  className="p-1 text-[10px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Hủy kết nối thiết bị này"
                                >
                                  Gỡ máy
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Dữ liệu đồng bộ realtime với máy con và máy chủ nội bộ.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ─── CONFIRM DELETE CHILD DIALOG ─────────────────────────────────────── */}
      {childToDelete && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Xác nhận xóa hồ sơ bé "{childToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hành động này sẽ <strong>xóa hoàn toàn</strong> hồ sơ của bé, ngắt kết nối{' '}
                {childToDelete.devices?.length || 0} thiết bị đã ghép đôi, giải phóng lịch trình, giới hạn ứng dụng và toàn bộ dữ liệu định vị khỏi ứng dụng cha mẹ.
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-800 font-medium text-left mt-2">
                ⚠️ Bé sẽ không còn chịu sự kiểm soát của ứng dụng cha mẹ cho đến khi thực hiện ghép đôi lại từ đầu.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setChildToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang gỡ thiết bị & xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Xóa hồ sơ bé</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM UNLINK DEVICE DIALOG ────────────────────────────────────── */}
      {deviceToUnlink && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Smartphone size={24} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-black text-slate-900">
                Gỡ thiết bị "{deviceToUnlink.deviceName}"?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thiết bị này sẽ bị ngắt kết nối khỏi bé <strong>{deviceToUnlink.childName}</strong>. Ứng dụng cha mẹ sẽ không còn nhận định vị hay quản lý được thiết bị này.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeviceToUnlink(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlinkDevice}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Xác nhận gỡ máy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CHILD MODAL ────────────────────────────────────────────────── */}
      {editingChild && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit2 size={15} className="text-blue-600" />
                <span>Chỉnh Sửa Hồ Sơ Bé</span>
              </h3>
              <button
                onClick={() => setEditingChild(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên của bé:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ví dụ: Bé An"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Tuổi:</label>
                  <input
                    type="number"
                    min={1}
                    max={18}
                    value={editAge}
                    onChange={(e) => setEditAge(Number(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Lớp / Khối:</label>
                  <input
                    type="text"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    placeholder="Ví dụ: Lớp 5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChild(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RENAME DEVICE MODAL ─────────────────────────────────────────────── */}
      {editingDevice && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Smartphone size={15} className="text-blue-600" />
                <span>Đổi Tên Thiết Bị</span>
              </h3>
              <button
                onClick={() => setEditingDevice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveDeviceName} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tên thiết bị:</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Ví dụ: OPPO Reno 7 của con"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu tên máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AVATAR PICKER MODAL ─────────────────────────────────────────────── */}
      {avatarPickerChildId && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera size={15} className="text-blue-600" />
                <span>Chọn Avatar Cho Bé</span>
              </h3>
              <button
                onClick={() => setAvatarPickerChildId(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5 py-2">
              {SAMPLE_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    updateChildAvatar(avatarPickerChildId, url);
                    showToast('Đã đổi avatar mới cho bé!');
                    setAvatarPickerChildId(null);
                  }}
                  className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 transition active:scale-95 cursor-pointer"
                >
                  <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAvatarPickerChildId(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* ─── PAIR CHILD DEVICE MODAL ─────────────────────────────────────────── */}
      {showPairModal && (
        <PairChildDeviceModal
          onClose={() => setShowPairModal(false)}
          onSuccess={(cid) => {
            if (cid) switchChild(cid);
            setShowPairModal(false);
            showToast('Đã ghép đôi thiết bị con thành công!');
          }}
        />
      )}
    </div>
  );
};
