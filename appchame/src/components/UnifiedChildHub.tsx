import React, { useState, useEffect } from 'react';
import { useAppState, syncAllChildrenFromCloud, getActiveParentId } from '@shared/store';
import {
  Plus,
  Check,
  X,
  Sparkles,
  User,
  Clock,
  Battery,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Moon,
  BookOpen,
  Megaphone,
  Users,
  ShieldCheck,
  Star,
  Gift,
  CheckCircle2,
  Camera,
  Award,
  ListTodo,
  Trash2,
  Globe,
  Tag,
  SlidersHorizontal,
  Cloud,
  KeyRound,
  QrCode,
  MessageCircle,
  Smartphone,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PairChildDeviceModal } from './PairChildDeviceModal';
import { CloudSettingsModal } from './CloudSettingsModal';
import { FamilyChatModal } from '../../../shared/components/FamilyChatModal';
import { subscribeCloudChatMessages } from '../../../shared/firebase/cloudSyncService';

const REWARD_PRESET_ICONS = [
  '🎁', '🎮', '🍦', '📚', '🍕', '🎡', '🧸', '🎟️', '🚲', '🎧', '🎨', '⚽', '👗', '🛹', '🎸', '📱', '🏊', '🍔', '🎬', '🏸', '🚀', '🏎️'
];

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
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
];

const EMOJI_AVATARS = [
  '👦', '👧', '🧒', '🚀', '🐱', '🦊', '🦁', '🐼', '👾', '🦄', '🦸', '🧙', '🤖', '⚽', '🎨', '⭐'
];

interface UnifiedChildHubProps {
  onNavigate?: (screenKey: string) => void;
}

export const UnifiedChildHub: React.FC<UnifiedChildHubProps> = ({ onNavigate }) => {
  const {
    state,
    switchChild,
    addChild,
    updateChildAvatar,
    giftStarsToChild,
    assignTaskToChild,
    approveRewardRedemption,
    addRewardItem,
    updateRewardItem,
    deleteRewardItem,
    getFamilyAggregatedStats,
    lockAllChildrenForMealtime,
    lockAllChildrenForBedtime,
    unlockAllChildren,
    toggleStudyModeAll,
    triggerFamilyBroadcast,
    updateChildDeviceName,
    switchActiveChildDevice,
  } = useAppState();

  const { children, selectedChildId, smartRoutines, lockChallenge, studyModeOnly } = state;
  const stats = getFamilyAggregatedStats();

  // Find active child index in children array
  const activeIndex = Math.max(0, children.findIndex((c) => c.id === selectedChildId));

  // Edit Device Name Modal State
  const [editingDevice, setEditingDevice] = useState<{ childId: string; deviceId: string; currentName: string } | null>(null);
  const [newDeviceNameInput, setNewDeviceNameInput] = useState('');

  // Modals for new requirements
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadParentChatCount, setUnreadParentChatCount] = useState<number>(0);
  const lastProcessedParentChatTsRef = React.useRef<number>(Date.now() - 5000);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Gift stars state
  const [giftAmount, setGiftAmount] = useState<number>(10);
  const [giftReason, setGiftReason] = useState<string>('🌟 Khen con tự giác hoàn thành bài tập sớm');

  // Assign task state
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskSubject, setTaskSubject] = useState<string>('Học tập');
  const [taskStars, setTaskStars] = useState<number>(5);
  const [taskDueDate, setTaskDueDate] = useState<string>('Hôm nay');

  // Rewards modal tab & custom reward creation
  const [rewardsTab, setRewardsTab] = useState<'catalog' | 'redemptions' | 'history'>('catalog');
  const [catalogScopeFilter, setCatalogScopeFilter] = useState<string>('all_both'); // 'all_both', 'all_shared', or childId
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardStars, setNewRewardStars] = useState<number>(30);
  const [newRewardIcon, setNewRewardIcon] = useState('🎁');
  const [newRewardScope, setNewRewardScope] = useState<string>('all'); // 'all' or childId
  const [newRewardDesc, setNewRewardDesc] = useState('');

  // Family Broadcast quick modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('Cả nhà chuẩn bị đến giờ ăn cơm rồi nhé!');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag & Swipe state for circular rotation
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Auto-sync children from cloud on mount
  useEffect(() => {
    syncAllChildrenFromCloud();
  }, []);

  const handleManualCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      const list = await syncAllChildrenFromCloud();
      if (list && list.length > 0) {
        showToast(`Đã đồng bộ ${list.length} hồ sơ con từ Cloud! 🎉`);
      } else {
        showToast('Đã kiểm tra Cloud. Chưa tìm thấy thiết bị con mới.');
      }
    } catch (_) {
      showToast('Lỗi đồng bộ Cloud.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Circular rotation helper functions
  const rotateToIndex = (newIndex: number) => {
    const total = children.length;
    if (total === 0) return;
    const normalizedIndex = ((newIndex % total) + total) % total;
    const targetChild = children[normalizedIndex];
    if (targetChild && targetChild.id !== selectedChildId) {
      switchChild(targetChild.id);
      showToast(`Đã chuyển sang: ${targetChild.name}`);
    }
  };

  const rotatePrev = () => {
    rotateToIndex(activeIndex - 1);
  };

  const rotateNext = () => {
    rotateToIndex(activeIndex + 1);
  };

  // Touch / Mouse Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX === null || !isDragging) return;
    const diff = e.changedTouches[0].clientX - dragStartX;
    if (diff > 35) {
      rotatePrev();
    } else if (diff < -35) {
      rotateNext();
    }
    setDragStartX(null);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartX === null || !isDragging) return;
    const diff = e.clientX - dragStartX;
    if (diff > 35) {
      rotatePrev();
    } else if (diff < -35) {
      rotateNext();
    }
    setDragStartX(null);
    setIsDragging(false);
  };

  const [isSubmittingGift, setIsSubmittingGift] = useState(false);
  const handleGiftStars = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChild || isSubmittingGift) return;
    setIsSubmittingGift(true);
    giftStarsToChild(activeChild.id, giftAmount, giftReason.trim());
    setShowGiftModal(false);
    showToast(`Đã tặng +${giftAmount} sao cho ${activeChild.name}! ⭐`);
    setTimeout(() => setIsSubmittingGift(false), 800);
  };

  const handleAssignTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChild || !taskTitle.trim()) return;
    assignTaskToChild(activeChild.id, {
      title: taskTitle.trim(),
      subject: taskSubject,
      stars: taskStars,
      dueDate: taskDueDate,
    });
    setTaskTitle('');
    setShowTaskModal(false);
    showToast(`Đã giao việc "${taskTitle.trim()}" (+${taskStars}⭐) cho ${activeChild.name}!`);
  };

  const handleChangeAvatar = (newAvatarUrl: string) => {
    if (!activeChild) return;
    updateChildAvatar(activeChild.id, newAvatarUrl);
    setShowAvatarModal(false);
    showToast(`Đã đổi avatar mới cho bé ${activeChild.name}!`);
  };

  const handleAddCustomReward = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRewardTitle.trim()) return;
    const targetChildObj = newRewardScope !== 'all' ? children.find((c) => c.id === newRewardScope) : null;
    const targetChildName = targetChildObj ? targetChildObj.name : 'Cả nhà';

    addRewardItem({
      title: newRewardTitle.trim(),
      starsCost: Math.max(1, Number(newRewardStars) || 20),
      icon: newRewardIcon || '🎁',
      category: 'gift',
      description: newRewardDesc.trim() || `Phần thưởng ${newRewardScope === 'all' ? 'dành cho cả nhà' : `dành riêng cho ${targetChildName}`}`,
      targetChildId: newRewardScope,
      targetChildName,
      isCustom: true,
    });

    showToast(`Đã thêm quà "${newRewardTitle.trim()}" (${newRewardStars}⭐) vào ${newRewardScope === 'all' ? 'Kho chung' : `Kho của ${targetChildName}`}! 🎉`);
    setNewRewardTitle('');
    setNewRewardDesc('');
    setShowAddRewardModal(false);
  };

  const isMealtimeLockedAll = smartRoutines.mealtimeLock && lockChallenge.isLocked;
  const isBedtimeLockedAll = smartRoutines.bedtimeLock && lockChallenge.isLocked;

  // Active Child Data
  const totalChildren = children.length;
  const activeChild = totalChildren > 0 ? (children[activeIndex] || children[0]) : null;
  const activeChildSettings = activeChild ? state.childSettings[activeChild.id] : undefined;
  const usedMins = activeChildSettings?.screenTime?.todayTotalMinutes ?? state.screenTime.todayTotalMinutes ?? 0;
  const limitMins = activeChildSettings?.screenTimeLimitMinutes ?? 120;
  const progressPercent = limitMins > 0 ? Math.min(100, Math.round((usedMins / limitMins) * 100)) : 0;

  // Determine prev and next child indices for circular wheel
  const prevIndex = totalChildren > 0 ? (((activeIndex - 1) % totalChildren) + totalChildren) % totalChildren : 0;
  const nextIndex = totalChildren > 0 ? (activeIndex + 1) % totalChildren : 0;

  const prevChild = totalChildren > 1 ? children[prevIndex] : null;
  const nextChild = totalChildren > 1 ? children[nextIndex] : null;

  // Background Real-time Chat Listener on Parent Device
  // Receives child messages even when FamilyChatModal is closed,
  // alerts parent with toast, and increments unread badge.
  useEffect(() => {
    const parentId = getActiveParentId();
    const childId = activeChild?.id;
    if (!parentId || !childId) return;

    const unsub = subscribeCloudChatMessages(
      parentId,
      childId,
      (cloudMsgs) => {
        if (!cloudMsgs || cloudMsgs.length === 0) return;

        cloudMsgs.forEach((msg) => {
          if (msg.sender === 'kid' && (msg.timestamp || 0) > lastProcessedParentChatTsRef.current) {
            lastProcessedParentChatTsRef.current = msg.timestamp || Date.now();

            if (!showChatModal) {
              setUnreadParentChatCount((prev) => prev + 1);
              showToast(`💬 ${activeChild?.name || 'Bé'}: "${msg.text}"`);
            }
          }
        });
      },
      activeChild?.name
    );

    return () => unsub();
  }, [activeChild?.id, activeChild?.name, showChatModal]);

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-soft space-y-3.5 select-none relative overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg animate-bounce flex items-center space-x-1.5 whitespace-nowrap">
          <Sparkles size={13} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header: Family Overview & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100/50 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              Hồ sơ các con
            </h3>
            {/* Status Icons Row - Clean & Compact */}
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-100/80"
                title={`${stats.onlineCount} bé đang Online`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{stats.onlineCount}</span>
              </span>

              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-md border border-indigo-100/80"
                title={`${stats.studyingCount} bé đang Học bài`}
              >
                <BookOpen size={10} className="text-indigo-600" />
                <span>{stats.studyingCount}</span>
              </span>

              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-md border border-blue-100/80"
                title="Bảo vệ an toàn 100%"
              >
                <ShieldCheck size={11} className="text-blue-600" />
                <span>100%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Icon Action Buttons */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setShowCloudModal(true)}
            className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition active:scale-95 border border-indigo-100 shadow-2xs cursor-pointer"
            title="Hạ tầng Cloud Backend & SaaS"
          >
            <Cloud size={15} />
          </button>
          <button
            onClick={() => setShowPairModal(true)}
            className="w-8 h-8 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition active:scale-95 border border-purple-100 shadow-2xs cursor-pointer"
            title="Ghép đôi thiết bị con (Mã 6 số / QR)"
          >
            <KeyRound size={15} />
          </button>
          <button
            onClick={() => setShowPairModal(true)}
            className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition active:scale-95 border border-blue-100 shadow-2xs cursor-pointer"
            title="Ghép đôi thiết bị con mới (Mã 6 số)"
          >
            <Plus size={16} />
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('family')}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition active:scale-95 border border-slate-100 shadow-2xs cursor-pointer"
              title="Xem tất cả thiết bị gia đình"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. MINIMALIST CIRCULAR AVATAR CAROUSEL or EMPTY STATE */}
      {totalChildren === 0 ? (
        <div className="bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 rounded-2xl p-6 border border-dashed border-blue-200 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
            <Smartphone size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-900">
              Chưa có thiết bị con nào kết nối
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Cài ứng dụng <strong>KidCare</strong> trên điện thoại con, tạo hồ sơ và lấy mã PIN 6 số để kết nối hai máy.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button
              onClick={() => setShowPairModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <KeyRound size={15} />
              <span>Ghép đôi thiết bị ngay (Mã 6 số)</span>
            </button>
            <button
              onClick={handleManualCloudSync}
              disabled={isCloudSyncing}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isCloudSyncing ? 'animate-spin' : ''} />
              <span>{isCloudSyncing ? 'Đang tải...' : 'Tải lại từ Cloud 🔄'}</span>
            </button>
          </div>
        </div>
      ) : (
      <div
        className="relative bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-blue-50/20 rounded-2xl p-4 border border-slate-100/90 cursor-grab active:cursor-grabbing transition-all"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Carousel Rotation Stage */}
        <div className="flex items-center justify-between px-1">
          {/* Left Arrow & Prev Child */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                rotatePrev();
              }}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-xs border border-slate-200/70 transition active:scale-90"
              title="Bé trước"
            >
              <ChevronLeft size={16} />
            </button>

            {prevChild && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  rotatePrev();
                }}
                className="flex flex-col items-center opacity-40 hover:opacity-75 transition transform scale-90 cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={prevChild.avatar}
                    alt={prevChild.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 shadow-xs"
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-[50px]">
                  {prevChild.name}
                </span>
              </div>
            )}
          </div>

          {/* CENTER CHILD (Spotlight Avatar Only) */}
          {activeChild && (
            <div className="flex flex-col items-center">
              <div className="relative">
                {/* Active Status Pill */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 z-10 whitespace-nowrap">
                  <Check size={10} />
                  <span>ĐANG CHỌN</span>
                </div>

                {/* Avatar with Elegant Ring - Clickable for Avatar Picker */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAvatarModal(true);
                  }}
                  className="relative p-1 rounded-full ring-4 ring-blue-500/20 bg-white shadow-soft transition-all duration-300 cursor-pointer group"
                  title="Bấm để đổi avatar cho con"
                >
                  <img
                    src={activeChild.avatar}
                    alt={activeChild.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white group-hover:scale-105 transition duration-200"
                  />
                  {/* Camera overlay hover badge */}
                  <div className="absolute inset-1 rounded-full bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col items-center justify-center text-white">
                    <Camera size={18} className="text-white drop-shadow" />
                    <span className="text-[9px] font-bold">Đổi ảnh</span>
                  </div>
                  <span
                    className={`absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      activeChild.status === 'online'
                        ? 'bg-emerald-500 ring-2 ring-emerald-200'
                        : activeChild.status === 'studying'
                        ? 'bg-indigo-500 ring-2 ring-indigo-200'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Arrow & Next Child */}
          <div className="flex items-center space-x-2">
            {nextChild && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  rotateNext();
                }}
                className="flex flex-col items-center opacity-40 hover:opacity-75 transition transform scale-90 cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={nextChild.avatar}
                    alt={nextChild.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 shadow-xs"
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-[50px]">
                  {nextChild.name}
                </span>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                rotateNext();
              }}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-xs border border-slate-200/70 transition active:scale-90"
              title="Bé kế tiếp"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Centered Child Name, Badges & Age (School and Grade are hidden) */}
        {activeChild && (
          <div className="mt-3 text-center space-y-1">
            <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-y-1">
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                {activeChild.name}
              </h4>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                activeChild.status === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeChild.status === 'studying'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {activeChild.status === 'online' ? 'Online' : activeChild.status === 'studying' ? 'Đang học bài' : 'Nghỉ ngơi'}
              </span>

              {/* Smart Adaptive Sync Status Badge */}
              {activeChild.isScreenOn === false || activeChild.screenState === 'screen_off' ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-teal-50 text-teal-700 border-teal-200 flex items-center gap-1 shadow-2xs">
                  <span>🍃</span>
                  <span>Màn hình tắt (Tiết kiệm pin)</span>
                </span>
              ) : activeChild.appStatus === 'active_in_app' || activeChild.screenState === 'active' ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                  </span>
                  <span>Đang mở app (Realtime 3s)</span>
                </span>
              ) : activeChild.appStatus === 'in_background' ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 shadow-2xs">
                  <span>📱</span>
                  <span>Đang mở máy (Chạy nền)</span>
                </span>
              ) : null}

              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100/90 px-1.5 py-0.5 rounded-md border border-slate-200/50">
                🔋 {activeChild.battery}%
              </span>
            </div>

            {/* AGE ONLY (NO school, NO grade) & STARS BANK */}
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium pt-0.5">
              <span>{activeChild.age} tuổi</span>
              <span>•</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1">
                <Star size={11} className="fill-amber-500 text-amber-500" />
                <span>{activeChildSettings?.kidStars ?? state.kidStars ?? 28} Sao</span>
              </span>
            </div>

            {/* MULTI-DEVICE SUPPORT: TÊN MÁY VÀ DANH SÁCH THIẾT BỊ CỦA BÉ */}
            {activeChild.devices && activeChild.devices.length > 0 && (
              <div className="pt-2 border-t border-slate-100/80 mt-2 space-y-1 text-center">
                {activeChild.devices.length > 1 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                      <span className="flex items-center gap-1 text-blue-700">
                        <Smartphone size={13} />
                        <span>Thiết bị của bé ({activeChild.devices.length} máy):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Chạm để xem</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {activeChild.devices.map((dev, dIdx) => {
                        const isCurDev = (activeChild.activeDeviceId === dev.deviceId) || (!activeChild.activeDeviceId && dIdx === 0);
                        return (
                          <div
                            key={dev.deviceId}
                            onClick={(e) => {
                              e.stopPropagation();
                              switchActiveChildDevice(activeChild.id, dev.deviceId);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl border text-left shrink-0 transition cursor-pointer flex items-center gap-2 ${
                              isCurDev
                                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-400/20'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Smartphone size={12} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-black text-slate-900 truncate max-w-[110px]">
                                  {dev.deviceName || `Máy ${dIdx + 1}`}
                                </span>
                                {isCurDev && <Check size={11} className="text-blue-600 shrink-0" />}
                              </div>
                              <div className="text-[9.5px] text-slate-500 font-mono truncate">
                                {dev.hardwareIdType?.toUpperCase() || 'ID'}: {dev.deviceId.slice(0, 8)}...
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDevice({
                                  childId: activeChild.id,
                                  deviceId: dev.deviceId,
                                  currentName: dev.deviceName || `Máy ${dIdx + 1}`,
                                });
                                setNewDeviceNameInput(dev.deviceName || `Máy ${dIdx + 1}`);
                              }}
                              className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition"
                              title="Đổi tên máy"
                            >
                              ✏️
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-[10.5px] text-slate-600 bg-slate-100/70 px-2.5 py-1 rounded-lg">
                    <Smartphone size={12} className="text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-800">
                      {activeChild.devices[0].deviceName || activeChild.devices[0].model}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-500">
                      {activeChild.devices[0].hardwareIdType?.toUpperCase() || 'IMEI'}: {activeChild.devices[0].deviceId}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDevice({
                          childId: activeChild.id,
                          deviceId: activeChild.devices![0].deviceId,
                          currentName: activeChild.devices![0].deviceName || 'Điện thoại',
                        });
                        setNewDeviceNameInput(activeChild.devices![0].deviceName || 'Điện thoại');
                      }}
                      className="ml-1 text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Sửa tên
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. DẤU CHẤM Ở DƯỚI ĐỂ BẤM CHỌN (Minimalist Dots Pagination) */}
        <div className="mt-3 flex items-center justify-center space-x-1.5">
          {children.map((c, idx) => {
            const isDotActive = idx === activeIndex;
            return (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  rotateToIndex(idx);
                }}
                className={`transition-all duration-300 ${
                  isDotActive
                    ? 'w-6 h-1.5 bg-blue-600 rounded-full shadow-xs'
                    : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full'
                }`}
                title={`Xem hồ sơ của ${c.name}`}
              />
            );
          })}
        </div>

        {/* 4. Minimalist Screen Time Progress Bar */}
        <div className="mt-3 bg-white rounded-xl p-2.5 border border-slate-100/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Clock size={13} className="text-blue-500" />
              <span>Thời gian sử dụng:</span>
            </span>
            <div className="flex items-center space-x-1">
              <span className="text-slate-900 font-bold">
                {Math.floor(usedMins / 60)}h{usedMins % 60 > 0 ? `${usedMins % 60}p` : ''} / {Math.floor(limitMins / 60)}h{limitMins % 60 > 0 ? `${limitMins % 60}p` : ''}
              </span>
              <span className="text-slate-400">({progressPercent}%)</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent > 90
                  ? 'bg-rose-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Còn lại hôm nay: <strong className="text-blue-600">{Math.max(0, limitMins - usedMins)} phút</strong></span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('screentime')}
                className="text-blue-600 font-semibold hover:underline"
              >
                Tùy chỉnh &gt;
              </button>
            )}
          </div>

          {/* Quick Gamification / Star, Task, Rewards & Chat Actions */}
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGiftModal(true);
              }}
              className="flex items-center justify-center space-x-1 py-2 px-1 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-800 rounded-xl border border-amber-200 font-bold text-[10.5px] shadow-2xs transition active:scale-95 cursor-pointer"
              title="Tặng sao khen ngợi cho con"
            >
              <Star size={12} className="fill-amber-500 text-amber-500" />
              <span>Tặng sao</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTaskModal(true);
              }}
              className="flex items-center justify-center space-x-1 py-2 px-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 rounded-xl border border-blue-200 font-bold text-[10.5px] shadow-2xs transition active:scale-95 cursor-pointer"
              title="Giao việc nhận sao cho con"
            >
              <CheckCircle2 size={12} className="text-blue-600" />
              <span>Giao việc</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRewardsModal(true);
              }}
              className="flex items-center justify-center space-x-1 py-2 px-1 bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 text-pink-800 rounded-xl border border-pink-200 font-bold text-[10.5px] shadow-2xs transition active:scale-95 cursor-pointer relative"
              title="Kho đổi quà & yêu cầu từ con"
            >
              <Gift size={12} className="text-pink-600" />
              <span>Kho quà</span>
              {(state.redemptions?.filter((r) => r.status === 'pending').length || 0) > 0 && (
                <span className="w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center animate-pulse">
                  {state.redemptions.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setUnreadParentChatCount(0);
                setShowChatModal(true);
              }}
              className="relative flex items-center justify-center space-x-1 py-2 px-1 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-800 rounded-xl border border-indigo-200 font-bold text-[10.5px] shadow-2xs transition active:scale-95 cursor-pointer"
              title="Nhắn tin trò chuyện với con"
            >
              <MessageCircle size={12} className="text-indigo-600" />
              <span>Nhắn tin</span>
              {unreadParentChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-bounce shadow-xs border border-white">
                  {unreadParentChatCount > 9 ? '9+' : unreadParentChatCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 5. Consolidated Shared Family Overview & One-Touch Actions */}
      {totalChildren > 0 && (
      <div className="bg-slate-50/70 rounded-2xl p-2.5 border border-slate-100 space-y-2">
        {/* Family Aggregated Stats Summary */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-blue-500" />
            Tổng quan cả nhà hôm nay:
          </span>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/60">
            ⏱️ {Math.floor(stats.totalUsedMinutes / 60)}h {stats.totalUsedMinutes % 60}p / cả nhà
          </span>
        </div>

        {/* 4 Family-wide One-Touch Action Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* Action 1: Mealtime Lock All */}
          <button
            onClick={() => {
              if (isMealtimeLockedAll) {
                unlockAllChildren();
                showToast('Đã mở khóa các máy con sau giờ ăn cơm!');
              } else {
                lockAllChildrenForMealtime();
                showToast('Đã khóa toàn bộ máy các con để ăn cơm gia đình!');
              }
            }}
            className={`p-2 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 ${
              isMealtimeLockedAll
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
            }`}
          >
            <Utensils size={16} className={isMealtimeLockedAll ? 'text-white' : 'text-amber-600'} />
            <span className="text-[10px] font-bold leading-tight">
              {isMealtimeLockedAll ? 'Mở giờ cơm' : 'Giờ cơm'}
            </span>
          </button>

          {/* Action 2: Bedtime Lock All */}
          <button
            onClick={() => {
              if (isBedtimeLockedAll) {
                unlockAllChildren();
                showToast('Đã mở khóa thiết bị cả nhà!');
              } else {
                lockAllChildrenForBedtime();
                showToast('Đã kích hoạt giờ đi ngủ cho tất cả các máy!');
              }
            }}
            className={`p-2 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 ${
              isBedtimeLockedAll
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
            }`}
          >
            <Moon size={16} className={isBedtimeLockedAll ? 'text-white' : 'text-indigo-600'} />
            <span className="text-[10px] font-bold leading-tight">
              {isBedtimeLockedAll ? 'Mở giờ ngủ' : 'Giờ ngủ'}
            </span>
          </button>

          {/* Action 3: Study Mode All */}
          <button
            onClick={() => {
              toggleStudyModeAll(!studyModeOnly);
              showToast(!studyModeOnly ? 'Đã bật chế độ học tập đồng loạt!' : 'Đã tắt chế độ học tập');
            }}
            className={`p-2 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 ${
              studyModeOnly
                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 shadow-2xs'
            }`}
          >
            <BookOpen size={16} className={studyModeOnly ? 'text-white' : 'text-blue-600'} />
            <span className="text-[10px] font-bold leading-tight">
              {studyModeOnly ? 'Đang học' : 'Giờ học'}
            </span>
          </button>

          {/* Action 4: Family Broadcast */}
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs text-center transition active:scale-95 flex flex-col items-center justify-center gap-1"
          >
            <Megaphone size={16} className="text-emerald-600" />
            <span className="text-[10px] font-bold leading-tight">Nhắc nhở</span>
          </button>
        </div>
      </div>
      )}



      {/* MODAL: Phát Thông Điệp Chung Cho Cả Nhà (Family Broadcast) */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gửi lời nhắn cho cả nhà</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Hiển thị đè màn hình tất cả máy con</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🍽️ Đến giờ ăn cơm rồi con ơi!',
                  '📚 Chuẩn bị sách vở học bài nhé!',
                  '💧 Nhớ uống một ly nước lọc nha!',
                  '🌙 15 phút nữa đến giờ đi ngủ rồi!',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBroadcastText(sample)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-[10px] font-semibold transition border border-slate-200 text-left"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nội dung thông điệp:
                </label>
                <textarea
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (broadcastText.trim()) {
                      triggerFamilyBroadcast(broadcastText.trim(), '📢');
                      setShowBroadcastModal(false);
                      showToast('Đã gửi lời nhắn đến tất cả máy con!');
                    }
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Megaphone size={14} />
                  <span>Gửi cho cả nhà</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Đổi Avatar Cho Con */}
      {showAvatarModal && activeChild && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Đổi avatar cho {activeChild.name}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Chọn nhân vật hoạt hình hoặc ảnh đại diện</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {/* Section 1: Emojis & Gamer Badges */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Nhân vật hoạt hình / Gamer:</span>
                <div className="grid grid-cols-4 gap-2">
                  {EMOJI_AVATARS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const svgAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeChild.name + idx)}`;
                        handleChangeAvatar(svgAvatar);
                      }}
                      className="h-12 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex items-center justify-center text-2xl transition active:scale-90 shadow-2xs cursor-pointer"
                      title={`Chọn avatar`}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Real / Illustrated Photos */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Ảnh phong cách năng động:</span>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_AVATARS.map((uri, idx) => (
                    <img
                      key={idx}
                      src={uri}
                      alt="Preset avatar"
                      onClick={() => handleChangeAvatar(uri)}
                      className={`w-full aspect-square rounded-2xl object-cover cursor-pointer hover:opacity-90 transition active:scale-90 ring-2 ${
                        activeChild.avatar === uri ? 'ring-blue-600 shadow-md' : 'ring-transparent opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Section 3: Custom URL */}
              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Hoặc nhập link ảnh trực tiếp:</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        handleChangeAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Tặng Sao Cho Con */}
      {showGiftModal && activeChild && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Star size={18} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tặng sao cho {activeChild.name}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Hiện có: {activeChildSettings?.kidStars ?? state.kidStars ?? 28} ⭐</p>
                </div>
              </div>
              <button
                onClick={() => setShowGiftModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleGiftStars} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Số sao muốn tặng:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGiftAmount(num)}
                      className={`py-2 rounded-xl text-xs font-black transition border flex items-center justify-center gap-1 cursor-pointer ${
                        giftAmount === num
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>+{num}</span>
                      <Star size={11} className={giftAmount === num ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Gợi ý lời khen ngợi:</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    '🌟 Khen con tự giác học bài chăm chỉ',
                    '🧹 Khen con dọn dẹp phòng & bàn học',
                    '🍽️ Ăn cơm ngoan và đúng giờ',
                    '💖 Biết giúp đỡ bố mẹ việc nhà',
                    '🏆 Đạt điểm cao bài kiểm tra',
                  ].map((praise, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setGiftReason(praise)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-[10px] font-semibold transition border border-slate-200 text-left cursor-pointer"
                    >
                      {praise}
                    </button>
                  ))}
                </div>

                <label className="text-[11px] font-bold text-slate-700 block mb-1">Lời dặn dò / Khen ngợi:</label>
                <textarea
                  rows={2}
                  required
                  value={giftReason}
                  onChange={(e) => setGiftReason(e.target.value)}
                  placeholder="Nhập lời khen để con phấn khởi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGiftModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleGiftStars()}
                  className="flex-1 py-2.5 bg-amber-500 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Star size={14} className="fill-white" />
                  <span>Tặng +{giftAmount} sao</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Giao Nhiệm Vụ Nhận Sao Cho Bé */}
      {showTaskModal && activeChild && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ListTodo size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Giao việc cho {activeChild.name}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Bé hoàn thành sẽ nhận được sao thưởng</p>
                </div>
              </div>
              <button
                onClick={() => setShowTaskModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Tên nhiệm vụ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Làm bài tập Toán trang 45..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Môn / Danh mục:</label>
                  <select
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="Học tập">Học tập chung</option>
                    <option value="Toán học">Toán học</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Việc nhà">Việc nhà</option>
                    <option value="Kỹ năng sống">Kỹ năng sống</option>
                    <option value="Thể chất">Thể chất / Thể dục</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Sao thưởng:</label>
                  <div className="flex space-x-1.5">
                    {[3, 5, 10].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTaskStars(s)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-black transition border flex items-center justify-center gap-0.5 cursor-pointer ${
                          taskStars === s
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>+{s}</span>
                        <Star size={10} className={taskStars === s ? 'fill-white text-white' : 'fill-amber-500 text-amber-500'} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Thời hạn hoàn thành:</label>
                <div className="flex space-x-1.5">
                  {['Hôm nay', '17:00', '20:00', 'Ngày mai'].map((due) => (
                    <button
                      key={due}
                      type="button"
                      onClick={() => setTaskDueDate(due)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition border cursor-pointer ${
                        taskDueDate === due
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {due}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignTask()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Giao việc ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Kho Đổi Quà & Phê Duyệt Thưởng */}
      {showRewardsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                  <Gift size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Kho Đổi Quà & Thưởng Sao</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Quản lý quà tặng & duyệt đổi quà cho con</p>
                </div>
              </div>
              <button
                onClick={() => setShowRewardsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold shrink-0">
              <button
                onClick={() => setRewardsTab('redemptions')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  rewardsTab === 'redemptions' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Yêu cầu đổi ({state.redemptions?.length || 0})
              </button>
              <button
                onClick={() => setRewardsTab('catalog')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  rewardsTab === 'catalog' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Kho quà ({state.rewardsCatalog?.length || 0})
              </button>
              <button
                onClick={() => setRewardsTab('history')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  rewardsTab === 'history' ? 'bg-white text-pink-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Lịch sử sao
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {rewardsTab === 'redemptions' && (
                <div className="space-y-2">
                  {(!state.redemptions || state.redemptions.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <p>Chưa có yêu cầu đổi quà nào từ các con.</p>
                    </div>
                  ) : (
                    state.redemptions.map((rd, idx) => (
                      <div key={`${rd.id}-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                          <span className="text-2xl">{rd.icon}</span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{rd.rewardTitle}</h4>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {rd.childName} • -{rd.starsCost} ⭐ • {rd.timestamp}
                            </span>
                          </div>
                        </div>
                        {rd.status === 'completed' ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg shrink-0">
                            Đã trao ✅
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              approveRewardRedemption(rd.id);
                              showToast(`Đã xác nhận trao quà "${rd.rewardTitle}" cho ${rd.childName}! 🎉`);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs shrink-0 transition cursor-pointer"
                          >
                            Duyệt trao quà
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {rewardsTab === 'catalog' && (
                <div className="space-y-3">
                  {/* Scope filter pills & Add button */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center space-x-1 overflow-x-auto py-0.5 max-w-[230px] no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setCatalogScopeFilter('all_both')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer ${
                          catalogScopeFilter === 'all_both'
                            ? 'bg-pink-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({state.rewardsCatalog?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogScopeFilter('all_shared')}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer flex items-center gap-0.5 ${
                          catalogScopeFilter === 'all_shared'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                        }`}
                      >
                        <Globe size={10} />
                        <span>Kho chung</span>
                      </button>
                      {children.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCatalogScopeFilter(c.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer flex items-center gap-0.5 ${
                            catalogScopeFilter === c.id
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
                          }`}
                        >
                          <Tag size={10} />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddRewardModal(!showAddRewardModal)}
                      className="px-2.5 py-1 bg-pink-500 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-[10.5px] font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                      <span>Thêm quà mới</span>
                    </button>
                  </div>

                  {/* Form Tạo Quà Mới Tùy Chỉnh */}
                  {showAddRewardModal && (
                    <div className="p-3 bg-gradient-to-br from-pink-50/60 to-rose-50/40 border border-pink-200 rounded-2xl space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-pink-100/80 pb-1.5">
                        <span className="text-xs font-bold text-pink-900 flex items-center gap-1">
                          <Gift size={13} />
                          <span>Tạo món quà mới vào kho</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddRewardModal(false)}
                          className="w-5 h-5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-[10px]"
                        >
                          <X size={11} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Tên món quà / Đặc quyền:</label>
                          <input
                            type="text"
                            required
                            placeholder="VD: Mua giày patin, Đi xem phim CGV, Bộ Lego..."
                            value={newRewardTitle}
                            onChange={(e) => setNewRewardTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>

                        {/* Mức giá sao & Biểu tượng */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Giá đổi (⭐ Sao):</label>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={newRewardStars}
                              onChange={(e) => setNewRewardStars(Math.max(1, Number(e.target.value)))}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            {/* Quick chips */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {[20, 30, 50, 100].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setNewRewardStars(s)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                                    newRewardStars === s ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {s}⭐
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Biểu tượng (Icon):</label>
                            <div className="flex items-center space-x-1.5">
                              <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                                {newRewardIcon}
                              </span>
                              <div className="flex-1 flex flex-wrap gap-1 max-h-16 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                                {REWARD_PRESET_ICONS.map((ic, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setNewRewardIcon(ic)}
                                    className={`w-6 h-6 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                                      newRewardIcon === ic ? 'bg-pink-100 ring-2 ring-pink-500' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    {ic}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Đối tượng áp dụng: Kho chung hay riêng bé */}
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Kho áp dụng:</label>
                          <select
                            value={newRewardScope}
                            onChange={(e) => setNewRewardScope(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          >
                            <option value="all">🌐 Kho chung (Tất cả các con đều có thể đổi)</option>
                            {children.map((c) => (
                              <option key={c.id} value={c.id}>
                                👤 Dành riêng cho {c.name} ({c.age} tuổi)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mô tả */}
                        <div>
                          <label className="text-[10.5px] font-bold text-slate-700 block mb-0.5">Mô tả quà tặng:</label>
                          <input
                            type="text"
                            placeholder="VD: Phần thưởng khi con ngoan ngoãn và chăm học..."
                            value={newRewardDesc}
                            onChange={(e) => setNewRewardDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddRewardModal(false)}
                            className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddCustomReward()}
                            className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 size={13} />
                            <span>Lưu vào kho</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danh sách quà theo bộ lọc */}
                  <div className="space-y-2">
                    {(state.rewardsCatalog || [])
                      .filter((rew) => {
                        if (catalogScopeFilter === 'all_both') return true;
                        if (catalogScopeFilter === 'all_shared') return !rew.targetChildId || rew.targetChildId === 'all';
                        return rew.targetChildId === catalogScopeFilter;
                      })
                      .map((rew) => {
                        const isShared = !rew.targetChildId || rew.targetChildId === 'all';
                        return (
                          <div key={rew.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-pink-200 transition">
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              <span className="text-2xl shrink-0">{rew.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{rew.title}</h4>
                                  {isShared ? (
                                    <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-bold text-[8.5px] border border-blue-100 shrink-0 flex items-center gap-0.5">
                                      <Globe size={9} />
                                      <span>Kho chung</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 font-bold text-[8.5px] border border-amber-200 shrink-0 flex items-center gap-0.5">
                                      <Tag size={9} />
                                      <span>Riêng {rew.targetChildName || 'Bé'}</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{rew.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-xl border border-amber-200">
                                {rew.starsCost} ⭐
                              </span>
                              {rew.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteRewardItem(rew.id);
                                    showToast(`Đã xóa món quà "${rew.title}" khỏi kho!`);
                                  }}
                                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                                  title="Xóa món quà này"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {rewardsTab === 'history' && (
                <div className="space-y-2">
                  {(!state.starHistory || state.starHistory.length === 0) ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <p>Chưa có giao dịch sao nào.</p>
                    </div>
                  ) : (
                    state.starHistory.map((st, idx) => (
                      <div key={`${st.id}-${idx}`} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-slate-800 truncate">{st.title}</h4>
                          <span className="text-[10px] text-slate-400">{st.childName} • {st.timestamp} {st.note ? `• "${st.note}"` : ''}</span>
                        </div>
                        <span className={`font-black shrink-0 ${st.stars > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {st.stars > 0 ? `+${st.stars}` : st.stars} ⭐
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ghép Đôi Thiết Bị Con (PIN Code / QR) */}
      {showPairModal && (
        <PairChildDeviceModal
          childId={activeChild?.id || 'child_1'}
          childName={activeChild?.name || 'Bé'}
          onClose={() => setShowPairModal(false)}
        />
      )}

      {/* MODAL: Cấu Hình Cloud Backend & SaaS Multi-tenant */}
      {showCloudModal && (
        <CloudSettingsModal
          onClose={() => setShowCloudModal(false)}
        />
      )}

      {/* MODAL: Nhắn Tin Trò Chuyện 2 Chiều với Con */}
      {showChatModal && (
        <FamilyChatModal
          currentRole="parent"
          childId={activeChild?.id || 'child_1'}
          childName={activeChild?.name || 'Bé'}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* MODAL: Đổi Tên Thiết Bị Của Bé */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 space-y-3.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Smartphone size={16} />
                </div>
                <h4 className="text-xs font-bold text-slate-900">Đổi tên thiết bị</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Tên hiển thị mới:</label>
              <input
                type="text"
                value={newDeviceNameInput}
                onChange={(e) => setNewDeviceNameInput(e.target.value)}
                placeholder="VD: Máy chính của con, iPad học tập..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 italic">
                Tên này giúp phân biệt rõ các máy khác nhau của bé.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newDeviceNameInput.trim() && editingDevice) {
                    updateChildDeviceName(editingDevice.childId, editingDevice.deviceId, newDeviceNameInput.trim());
                    showToast(`Đã đổi tên máy thành "${newDeviceNameInput.trim()}"!`);
                    setEditingDevice(null);
                  }
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Lưu tên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
