import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Plus,
  Users,
  Watch,
  Navigation,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  X,
  Share2,
  Crown,
  Eye,
  Loader2,
  Smartphone,
  UserPlus,
  Camera,
  Home,
  Trash2,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAppState } from '@shared/store';
import { getConnectedParents, ConnectedParent } from '@shared/firebase/sharingService';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';
import { getActiveParentId } from '@shared/store';
import { ShareChildModal } from '../../components/ShareChildModal';
import { FamilyMember, ConnectedDevice } from '@shared/types';

interface FamilyDevicesScreenProps {
  onBack: () => void;
  onNavigate?: (screenKey: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b',
  co_parent: '#2563eb',
  viewer: '#64748b',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ tài khoản',
  co_parent: 'Đồng quản lý',
  viewer: 'Chỉ xem',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={11} />,
  co_parent: <ShieldCheck size={11} />,
  viewer: <Eye size={11} />,
};

function getDeviceIcon(icon?: string, type?: string) {
  if (type === 'smartwatch' || icon === 'watch') return <Watch size={20} />;
  if (type === 'gps' || icon === 'navigation') return <Navigation size={20} />;
  if (type === 'camera' || icon === 'camera') return <Camera size={20} />;
  if (type === 'smarthome' || icon === 'home') return <Home size={20} />;
  return <Smartphone size={20} />;
}

export const FamilyDevicesScreen: React.FC<FamilyDevicesScreenProps> = ({ onBack, onNavigate }) => {
  const { state, addFamilyMember, updateFamilyMemberRole, deleteFamilyMember } = useAppState();
  const { family, devices, children } = state;
  const currentParent = getCurrentParentAccount();
  const parentId = currentParent?.uid || getActiveParentId();

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Phụ huynh');

  // Edit/View Member Modal State
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Share modal state
  const [shareTarget, setShareTarget] = useState<{ childId: string; childName: string; childAvatar?: string } | null>(null);

  // Connected parents per child
  const [connectedParentsMap, setConnectedParentsMap] = useState<Record<string, ConnectedParent[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load connected parents for each child
  useEffect(() => {
    if (!parentId || !children?.length) return;
    children.forEach(async (child) => {
      setLoadingMap((prev) => ({ ...prev, [child.id]: true }));
      try {
        const list = await getConnectedParents(parentId, child.id);
        setConnectedParentsMap((prev) => ({ ...prev, [child.id]: list }));
      } catch (_) {}
      setLoadingMap((prev) => ({ ...prev, [child.id]: false }));
    });
  }, [parentId, children?.length]);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 select-none pb-6 relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Gia đình & Kết nối</h2>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto">

        {/* ── Connected Parents per Child ────────────────────────── */}
        {children && children.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">Tài khoản kết nối theo bé</h3>
              <span className="text-[11px] text-slate-500">{children.length} bé</span>
            </div>

            {children.map((child) => {
              const connected = connectedParentsMap[child.id] || [];
              const isLoading = loadingMap[child.id];

              return (
                <div key={child.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Child header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={child.avatar}
                        alt={child.name}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{child.name}</p>
                        <p className="text-[10px] text-slate-500">{child.age} tuổi · {connected.length + 1} tài khoản</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShareTarget({ childId: child.id, childName: child.name, childAvatar: child.avatar })}
                      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-bold rounded-full border border-indigo-200 transition cursor-pointer active:scale-95"
                    >
                      <Share2 size={12} />
                      Chia sẻ
                    </button>
                  </div>

                  {/* Owner (you) */}
                  <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {(currentParent?.displayName || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentParent?.displayName || 'Bạn'}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.3 rounded bg-amber-50 text-amber-700">
                        <Crown size={9} />
                        Chủ tài khoản · Bạn
                      </span>
                    </div>
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                  </div>

                  {/* Connected parents */}
                  {isLoading && connected.length === 0 ? (
                    <div className="flex items-center justify-center py-4 text-slate-400">
                      <Loader2 size={16} className="animate-spin mr-1.5" />
                      <span className="text-xs">Đang tải...</span>
                    </div>
                  ) : connected.length === 0 ? (
                    <div className="px-3.5 py-3 text-center">
                      <p className="text-[11px] text-slate-400">Chưa có tài khoản nào được chia sẻ</p>
                    </div>
                  ) : (
                    connected.map((parent) => {
                      const color = ROLE_COLORS[parent.role] || '#64748b';
                      return (
                        <div key={parent.parentId} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-100 last:border-b-0">
                          <div
                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {(parent.parentName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{parent.parentName}</p>
                            <span
                              className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.3 rounded"
                              style={{ backgroundColor: color + '15', color }}
                            >
                              {ROLE_ICONS[parent.role]}
                              {ROLE_LABELS[parent.role] || parent.role}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add button */}
                  <button
                    onClick={() => setShareTarget({ childId: child.id, childName: child.name, childAvatar: child.avatar })}
                    className="w-full py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus size={13} />
                    Thêm tài khoản quản lý
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Family Members Section ────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Thành viên gia đình</h3>
            <span className="text-[11px] text-slate-500 font-medium">{family.length} Thành viên</span>
          </div>

          <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-soft divide-y divide-slate-100">
            {family.map((member) => (
              <div
                key={member.id}
                onClick={() => {
                  setSelectedMember(member);
                  setEditRole(member.role);
                }}
                className="p-2.5 flex items-center justify-between hover:bg-slate-50/70 rounded-xl transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{member.name}</span>
                      {member.isCurrentUser && (
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                          Bạn
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span>{member.role}</span>
                      <span>•</span>
                      <span className="truncate max-w-[130px]">{member.email}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowAddMemberModal(true)}
            className="w-full py-2.5 bg-white hover:bg-blue-50/50 border border-blue-200 text-blue-600 font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            <Plus size={15} />
            <span>Thêm thành viên</span>
          </button>
        </div>

        {/* ── Connected Devices Section ─────────────────────────── */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Kết nối thiết bị & IoT</h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('devices')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Quản lý IoT →
              </button>
            )}
          </div>

          <div className="space-y-2">
            {devices && devices.length > 0 ? (
              devices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => onNavigate && onNavigate('devices')}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      {getDeviceIcon(dev.icon, dev.type)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{dev.name}</h4>
                      <p className="text-[10px] text-slate-500">
                        {dev.statusText || 'Thiết bị thông minh'} • {dev.battery}% Pin
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 font-bold text-[10px] rounded-full border ${
                      dev.isConnected
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {dev.isConnected ? 'Đã kết nối' : 'Đang ngắt'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 bg-white rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">Chưa có thiết bị nào kết nối</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Add Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Mời thêm thành viên</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">Họ và tên</label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="VD: Bà nội, Cô giáo, Bố..."
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">Email hoặc Số điện thoại</label>
              <input
                type="text"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="VD: banoi@gmail.com hoặc 0987654321"
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600">Vai trò</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
              >
                <option value="Phụ huynh">Phụ huynh (Toàn quyền quản lý)</option>
                <option value="Người giám hộ">Người giám hộ (Chỉ xem vị trí & cảnh báo)</option>
                <option value="Người thân">Người thân (Xem lịch học & nhắn tin)</option>
                <option value="Con cái">Con cái (Thiết bị con)</option>
              </select>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newMemberName.trim()) {
                    addFamilyMember({
                      id: 'f_' + Date.now(),
                      name: newMemberName.trim(),
                      role: newMemberRole,
                      email: newMemberEmail.trim() || 'member@family.vn',
                      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                    });
                    setShowAddMemberModal(false);
                    setNewMemberName('');
                    setNewMemberEmail('');
                    showToast('Đã gửi lời mời thành viên thành công!');
                  }
                }}
                disabled={!newMemberName.trim()}
                className="flex-1 py-2.5 bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 cursor-pointer"
              >
                Gửi lời mời
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Member Details & Edit */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Chi tiết thành viên</h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <img
                src={selectedMember.avatar}
                alt={selectedMember.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                  <span>{selectedMember.name}</span>
                  {selectedMember.isCurrentUser && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                      Bạn
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">{selectedMember.email}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600">Phân quyền vai trò</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={selectedMember.isCurrentUser}
                className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="Phụ huynh">Phụ huynh (Toàn quyền quản lý)</option>
                <option value="Người giám hộ">Người giám hộ (Chỉ xem vị trí & cảnh báo)</option>
                <option value="Người thân">Người thân (Xem lịch học & nhắn tin)</option>
                <option value="Con cái">Con cái (Thiết bị con)</option>
              </select>
              {selectedMember.isCurrentUser && (
                <p className="text-[10px] text-amber-600 mt-1">
                  * Bạn là chủ tài khoản nên không thể hạ quyền chính mình.
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  updateFamilyMemberRole(selectedMember.id, editRole);
                  setSelectedMember(null);
                  showToast('Đã cập nhật vai trò thành công!');
                }}
                className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition cursor-pointer"
              >
                Lưu thay đổi
              </button>

              {!selectedMember.isCurrentUser && (
                <button
                  onClick={() => {
                    deleteFamilyMember(selectedMember.id);
                    setSelectedMember(null);
                    showToast('Đã xóa thành viên khỏi gia đình');
                  }}
                  className="w-full py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Xóa khỏi gia đình</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Child Modal */}
      {shareTarget && (
        <ShareChildModal
          childId={shareTarget.childId}
          childName={shareTarget.childName}
          childAvatar={shareTarget.childAvatar}
          ownerParentId={parentId}
          onClose={() => {
            setShareTarget(null);
            // Reload connected parents after closing
            if (children?.length) {
              children.forEach(async (child) => {
                try {
                  const list = await getConnectedParents(parentId, child.id);
                  setConnectedParentsMap((prev) => ({ ...prev, [child.id]: list }));
                } catch (_) {}
              });
            }
          }}
        />
      )}
    </div>
  );
};
