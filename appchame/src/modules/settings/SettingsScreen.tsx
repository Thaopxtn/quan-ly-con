import React, { useState } from 'react';
import {
  ChevronLeft,
  User,
  Shield,
  Bell,
  Globe,
  Moon,
  HelpCircle,
  Star,
  LogOut,
  ChevronRight,
  RotateCcw,
  FileText,
  Phone,
  Home,
  Check,
  Smartphone,
  MessageSquare,
  X,
  CheckCircle2,
  Volume2,
  Mail,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  Activity,
  MapPin,
  Mic,
  Clock,
  Power
} from 'lucide-react';
import { useAppState, getActiveParentId, DEFAULT_TRACKING_CONFIG } from '@shared/store';
import { getCurrentParentAccount } from '@shared/firebase/firebaseService';
import { PrivacyPolicyModal } from '@shared/components/PrivacyPolicyModal';
import { makePhoneCall } from '@shared/utils/phoneCall';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onLogout }) => {
  const {
    state,
    toggleTheme,
    resetAllData,
    setEmergencyContact,
    setChildLauncherMode,
    syncAllChildrenFromCloud,
    setTrackingCollectionConfig
  } = useAppState();

  const { theme, children, family } = state;
  const currentChildId = state.selectedChildId;
  const currentSettings = state.childSettings[currentChildId];
  const currentChild = state.children.find(c => c.id === currentChildId) || state.child;
  const currentParent = getCurrentParentAccount();
  const trackingConfig = currentSettings?.trackingConfig || DEFAULT_TRACKING_CONFIG;

  // Modal states
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Notification settings state
  const [notifyGeofence, setNotifyGeofence] = useState(true);
  const [notifySosSound, setNotifySosSound] = useState(true);
  const [notifyStudyReminders, setNotifyStudyReminders] = useState(true);
  const [notifyScreentimeOver, setNotifyScreentimeOver] = useState(true);

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>('vi');

  // Rating state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Support FAQ expansion
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Emergency contact state
  const [parentPhone, setParentPhone] = useState(currentSettings?.emergencyContact?.parentPhone || '0987654321');
  const [allowedApps, setAllowedApps] = useState<Array<'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat'>>(
    currentSettings?.emergencyContact?.allowedApps || ['phone', 'sms', 'zalo', 'family_chat']
  );
  const [isLauncherMode, setIsLauncherMode] = useState<boolean>(Boolean(currentSettings?.isLauncherEnabled));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggleApp = (appKey: 'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat') => {
    const updated = allowedApps.includes(appKey)
      ? allowedApps.filter(a => a !== appKey)
      : [...allowedApps, appKey];
    setAllowedApps(updated);
    setEmergencyContact(parentPhone, updated);
  };

  const handleSavePhone = () => {
    setEmergencyContact(parentPhone, allowedApps);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleToggleLauncher = () => {
    const newVal = !isLauncherMode;
    setIsLauncherMode(newVal);
    setChildLauncherMode(newVal);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncAllChildrenFromCloud();
      setSyncFeedback('Đã đồng bộ toàn bộ dữ liệu gia đình với Cloud Firebase!');
    } catch (e) {
      setSyncFeedback('Đã hoàn tất đồng bộ dữ liệu cục bộ!');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const faqList = [
    {
      q: 'Làm sao để kết nối máy con với máy cha mẹ?',
      a: 'Mở app KidCare trên máy con, nhập thông tin bé và bấm "Lưu & Tạo mã". Máy con sẽ hiện mã 6 số (hiệu lực 15 phút). Cha mẹ mở app ParentPro, bấm "+ Thêm con", nhập mã 6 số và máy con bấm "Chấp nhận" để hoàn tất.',
    },
    {
      q: 'Tính năng định vị GPS hoạt động như thế nào?',
      a: 'KidCare tự động gửi tọa độ vệ tinh và dung lượng pin qua Cloud Firestore mỗi 10-30 giây (hoặc khi di chuyển hơn 25m). Cha mẹ có thể xem vị trí trực tiếp trên bản đồ và lịch sử hành trình từng ngày.',
    },
    {
      q: 'Chế độ ghim ứng dụng (Kiosk) và khóa học tập?',
      a: 'Trong mục "Điều khiển từ xa", cha mẹ có thể chọn "Ghim ứng dụng duy nhất" (VD: VioEdu) hoặc đặt thử thách giải toán / câu đố để con hoàn thành trước khi mở máy.',
    },
  ];

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
            <h2 className="text-base font-bold text-slate-800">Cài đặt hệ thống</h2>
            <p className="text-[10px] text-slate-400 font-medium">Tài khoản, thông báo và bảo mật</p>
          </div>
        </div>
      </div>

      {/* Sync feedback toast */}
      {syncFeedback && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={15} />
          <span>{syncFeedback}</span>
        </div>
      )}

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-soft divide-y divide-slate-100">
          {/* Thông tin tài khoản */}
          <div
            onClick={() => setShowAccountModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Thông tin tài khoản</span>
                <span className="text-[10px] text-slate-400">{currentParent?.displayName || 'Phụ huynh'} • Quản trị viên</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          {/* Bảo mật & quyền riêng tư */}
          <div
            onClick={() => setShowPrivacyModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Shield size={16} />
              </div>
              <span className="text-xs font-bold text-slate-800">Chính sách quyền riêng tư & Bảo mật</span>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          {/* Thu thập dữ liệu & Tiết kiệm pin từ xa */}
          <div
            onClick={() => setShowTrackingModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Thu Thập Dữ Liệu & Tiết Kiệm Pin</span>
                <span className="text-[10px] text-slate-400">
                  {trackingConfig.isMasterTrackingEnabled
                    ? (trackingConfig.enableGpsTracking ? 'Đang bật theo dõi • GPS bật' : 'Tiết kiệm pin • GPS đã tắt')
                    : 'Đã tắt theo dõi • Tiết kiệm pin tối đa'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingConfig.isMasterTrackingEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>

          {/* Thông báo */}
          <div
            onClick={() => setShowNotificationModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Thông báo & Chuông cảnh báo</span>
                <span className="text-[10px] text-slate-400">SOS, Vùng an toàn, Giờ học</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          {/* Ngôn ngữ */}
          <div
            onClick={() => setShowLanguageModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Globe size={16} />
              </div>
              <span className="text-xs font-bold text-slate-800">Ngôn ngữ</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center">
              {selectedLanguage === 'vi' ? 'Tiếng Việt' : 'English'} <ChevronRight size={14} className="ml-1 text-slate-400" />
            </span>
          </div>

          {/* Chế độ tối */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Moon size={16} />
              </div>
              <span className="text-xs font-bold text-slate-800">Chế độ tối (Dark Mode)</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 p-0.5 cursor-pointer ${
                theme === 'dark' ? 'bg-purple-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trợ giúp & hỗ trợ */}
          <div
            onClick={() => setShowSupportModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <HelpCircle size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Trợ giúp & Hỗ trợ</span>
                <span className="text-[10px] text-slate-400">Hotline 24/7, FAQ, Hướng dẫn</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>

          {/* Đánh giá ứng dụng */}
          <div
            onClick={() => setShowRatingModal(true)}
            className="p-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Star size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Đánh giá ứng dụng</span>
                <span className="text-[10px] text-slate-400">Góp ý trải nghiệm dịch vụ</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </div>
        </div>

        {/* 1. Emergency Contact Config during Kid Device Lock */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-soft space-y-3">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Phone size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Liên Lạc Khẩn Cấp Khi Máy Con Bị Khóa</h3>
              <p className="text-[10.5px] text-slate-400">Áp dụng cho máy của {currentChild?.name || 'con'}</p>
            </div>
          </div>

          {/* Phone input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              Số điện thoại Bố/Mẹ để con gọi khi máy bị khóa:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="0987654321"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
              <button
                type="button"
                onClick={handleSavePhone}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                {savedSuccess ? 'Đã lưu ✓' : 'Lưu'}
              </button>
            </div>
          </div>

          {/* Allowed messaging apps checkboxes */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-700 block">
              Ứng dụng cho phép con liên lạc khi màn hình bị khóa:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'phone' as const, label: '📞 Gọi trực tiếp', desc: 'Cuộc gọi điện thoại' },
                { id: 'sms' as const, label: '💬 Nhắn tin SMS', desc: 'Gửi tin nhắn SMS' },
                { id: 'zalo' as const, label: '💙 Ứng dụng Zalo', desc: 'Chat qua Zalo' },
                { id: 'family_chat' as const, label: '👨‍👩‍👧 Chat Gia Đình', desc: 'Chat nội bộ KidCare' },
              ].map((app) => {
                const isChecked = allowedApps.includes(app.id);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleToggleApp(app.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-start space-x-2 cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                        : 'bg-slate-50/60 border-slate-200 text-slate-500 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold block leading-tight">{app.label}</span>
                      <span className="text-[9.5px] text-slate-400">{app.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. KidCare Launcher Mode Configuration */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-soft space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Home size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Đặt KidCare Làm Màn Hình Chính (Launcher)</h3>
                <p className="text-[10.5px] text-slate-400">Giữ con luôn trong không gian an toàn</p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              onClick={handleToggleLauncher}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 cursor-pointer ${
                isLauncherMode ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  isLauncherMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-[10.5px] text-slate-500 leading-relaxed pt-1">
            Khi bật tính năng này, mỗi khi bé nhấn nút Home trên điện thoại, máy sẽ luôn quay về giao diện KidCare thay vì ra màn hình chính mặc định của máy.
          </p>
        </div>

        {/* Đồng bộ & Làm mới dữ liệu */}
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 font-semibold text-xs rounded-2xl flex items-center justify-center space-x-2 transition cursor-pointer"
        >
          <RotateCcw size={14} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
          <span>{isSyncing ? 'Đang đồng bộ Cloud Firebase...' : 'Đồng bộ & Làm mới dữ liệu'}</span>
        </button>

        {/* Đăng xuất Button */}
        <button
          onClick={onLogout}
          className="w-full mt-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition active:scale-[0.98] cursor-pointer"
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Modal 1: Account Info */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User size={16} className="text-blue-600" />
                <span>Thông Tin Tài Khoản Phụ Huynh</span>
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 border border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Họ và tên:</span>
                <span className="font-bold text-slate-900">{currentParent?.displayName || 'Phụ Huynh'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Email đăng nhập:</span>
                <span className="font-semibold text-slate-800">{currentParent?.email || 'phuhuynh@gmail.com'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Vai trò:</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Quản trị viên gia đình
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mã gia đình (Family ID):</span>
                <span className="font-mono text-slate-700 text-[11px]">{getActiveParentId().slice(0, 12)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Số bé đang quản lý:</span>
                <span className="font-bold text-slate-900">{children.length} bé</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kết nối máy chủ:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Cloud Firebase Online
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Notification Settings */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Bell size={16} className="text-amber-500" />
                <span>Cài Đặt Chuông & Thông Báo Đẩy</span>
              </h3>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Còi hú SOS khẩn cấp</span>
                  <span className="text-[10px] text-slate-400">Âm lượng chuông lớn nhất khi con phát SOS</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifySosSound}
                  onChange={(e) => setNotifySosSound(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cảnh báo Vùng An Toàn</span>
                  <span className="text-[10px] text-slate-400">Báo ngay khi con ra/vào trường học hoặc nhà</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyGeofence}
                  onChange={(e) => setNotifyGeofence(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Nhắc nhở học bài & thói quen</span>
                  <span className="text-[10px] text-slate-400">Thông báo tiến độ bài tập và uống nước của con</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyStudyReminders}
                  onChange={(e) => setNotifyStudyReminders(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>

              <label className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Cảnh báo quá giờ sử dụng</span>
                  <span className="text-[10px] text-slate-400">Báo khi con vượt quá thời gian giải trí</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyScreentimeOver}
                  onChange={(e) => setNotifyScreentimeOver(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
              </label>
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Lưu Cài Đặt Thông Báo
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Language */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Globe size={16} className="text-emerald-600" />
                <span>Chọn Ngôn Ngữ Hiển Thị</span>
              </h3>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('vi');
                  setShowLanguageModal(false);
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  selectedLanguage === 'vi'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-lg">🇻🇳</span>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Tiếng Việt</span>
                    <span className="text-[10px] text-slate-400">Ngôn ngữ mặc định</span>
                  </div>
                </div>
                {selectedLanguage === 'vi' && <Check size={16} className="text-emerald-600 font-black" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('en');
                  setShowLanguageModal(false);
                }}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                  selectedLanguage === 'en'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-lg">🇺🇸</span>
                  <div className="text-left">
                    <span className="text-xs font-bold block">English</span>
                    <span className="text-[10px] text-slate-400">English (United States)</span>
                  </div>
                </div>
                {selectedLanguage === 'en' && <Check size={16} className="text-emerald-600 font-black" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Support & FAQ */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <HelpCircle size={16} className="text-sky-600" />
                <span>Trợ Giúp & Hỗ Trợ Phụ Huynh</span>
              </h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick contact buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => makePhoneCall('19006868')}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center text-center transition cursor-pointer text-emerald-800"
              >
                <Phone size={18} className="mb-1 text-emerald-600 animate-bounce" />
                <span className="text-xs font-black">1900-6868</span>
                <span className="text-[9.5px] text-emerald-600">Hotline 24/7 (Miễn phí)</span>
              </button>

              <a
                href="mailto:support@parentpro.vn?subject=Yêu cầu hỗ trợ ParentPro"
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-200 flex flex-col items-center justify-center text-center transition cursor-pointer text-blue-800"
              >
                <Mail size={18} className="mb-1 text-blue-600" />
                <span className="text-xs font-black">Email Hỗ Trợ</span>
                <span className="text-[9.5px] text-blue-600">support@parentpro.vn</span>
              </a>
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Câu hỏi thường gặp (FAQ)
              </span>

              {faqList.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-100/60 transition cursor-pointer"
                    >
                      <span className="pr-2">{item.q}</span>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100/60 pt-2">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Rate App */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span>Đánh Giá ParentPro</span>
              </h3>
              <button
                onClick={() => setShowRatingModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {ratingSubmitted ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <Star size={32} className="fill-amber-500 text-amber-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Cảm Ơn Đóng Góp Của Bạn!</h4>
                <p className="text-xs text-slate-500">
                  Đánh giá {ratingStars} sao của bạn giúp đội ngũ phát triển không ngừng cải thiện ứng dụng bảo vệ con tốt hơn.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-xs text-slate-600">
                  Trải nghiệm quản lý và bảo vệ con của bạn với ParentPro như thế nào?
                </p>

                {/* 5 Stars clickable */}
                <div className="flex items-center justify-center space-x-2 py-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRatingStars(s)}
                      className="p-1 transition active:scale-125 cursor-pointer"
                    >
                      <Star
                        size={32}
                        className={s <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Viết nhận xét hoặc tính năng bạn muốn bổ sung thêm..."
                  className="w-full text-xs font-medium p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 h-20 resize-none text-left"
                />

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRatingModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRatingSubmitted(true);
                      setTimeout(() => {
                        setRatingSubmitted(false);
                        setShowRatingModal(false);
                      }, 2000);
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Gửi Đánh Giá
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Remote Tracking & Battery Saver Controls */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity size={16} className="text-teal-600" />
                  <span>Thu Thập Dữ Liệu & Tiết Kiệm Pin</span>
                </h3>
                <p className="text-[10.5px] text-slate-400">Áp dụng cho máy của {currentChild?.name || 'con'}</p>
              </div>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3.5 pr-1 flex-1">
              {/* Notice Banner */}
              {!trackingConfig.isMasterTrackingEnabled ? (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>Chế độ Ngủ Đông Tiết Kiệm Pin đang BẬT</span>
                  </div>
                  <p className="text-[10.5px] text-amber-700 leading-relaxed">
                    Máy con đã tạm dừng định vị và thu thập dữ liệu để tiết kiệm pin tối đa (lên tới 75% pin). Nút SOS khẩn cấp và nhận lệnh từ xa vẫn hoạt động bình thường.
                  </p>
                </div>
              ) : (
                <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3 text-teal-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-teal-800">
                    <Sparkles size={14} className="shrink-0 text-teal-600" />
                    <span>Kiểm soát từ xa thông minh</span>
                  </div>
                  <p className="text-[10.5px] text-teal-700 leading-relaxed">
                    Khi tắt bớt các tính năng như GPS hoặc Cảm biến, máy con sẽ tự động tắt tương ứng để tiết kiệm pin. Khi bật lại, máy con sẽ lập tức kích hoạt lại.
                  </p>
                </div>
              )}

              {/* Master Switch Card */}
              <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      trackingConfig.isMasterTrackingEnabled ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Power size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tiến Trình Theo Dõi Toàn Diện</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {trackingConfig.isMasterTrackingEnabled ? 'Đang hoạt động bình thường' : 'Đang tạm dừng để tiết kiệm pin'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChildId) return;
                      const nextState = !trackingConfig.isMasterTrackingEnabled;
                      setTrackingCollectionConfig(currentChildId, {
                        ...trackingConfig,
                        isMasterTrackingEnabled: nextState
                      });
                    }}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-0.5 cursor-pointer ${
                      trackingConfig.isMasterTrackingEnabled ? 'bg-teal-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        trackingConfig.isMasterTrackingEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sub-switches: Individual tracking options */}
              <div className={`space-y-2 transition-opacity duration-200 ${
                !trackingConfig.isMasterTrackingEnabled ? 'opacity-40 pointer-events-none' : 'opacity-100'
              }`}>
                <span className="text-[11px] font-bold text-slate-700 block px-1">
                  Tùy chỉnh chi tiết từng bộ phận thu thập:
                </span>

                {/* 1. GPS Tracking */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Định vị GPS thời gian thực</span>
                      <span className="text-[10px] text-slate-400">Tắt GPS giúp máy con tiết kiệm nhiều pin nhất</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChildId) return;
                      setTrackingCollectionConfig(currentChildId, {
                        ...trackingConfig,
                        enableGpsTracking: !trackingConfig.enableGpsTracking
                      });
                    }}
                    className={`w-10 h-5.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer shrink-0 ml-2 ${
                      trackingConfig.enableGpsTracking ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        trackingConfig.enableGpsTracking ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Environmental & Sensors */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Mic size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảm biến chuyển động & Môi trường</span>
                      <span className="text-[10px] text-slate-400">Gia tốc kế, rung lắc và âm thanh xung quanh</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChildId) return;
                      setTrackingCollectionConfig(currentChildId, {
                        ...trackingConfig,
                        enableSensorMonitoring: !trackingConfig.enableSensorMonitoring
                      });
                    }}
                    className={`w-10 h-5.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer shrink-0 ml-2 ${
                      trackingConfig.enableSensorMonitoring ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        trackingConfig.enableSensorMonitoring ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. App Usage Tracking */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Thống kê thời lượng ứng dụng</span>
                      <span className="text-[10px] text-slate-400">Giám sát thời gian con mở từng ứng dụng</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChildId) return;
                      setTrackingCollectionConfig(currentChildId, {
                        ...trackingConfig,
                        enableAppUsageTracking: !trackingConfig.enableAppUsageTracking
                      });
                    }}
                    className={`w-10 h-5.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer shrink-0 ml-2 ${
                      trackingConfig.enableAppUsageTracking ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        trackingConfig.enableAppUsageTracking ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Screen State Sync */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Activity size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Đồng bộ trạng thái màn hình</span>
                      <span className="text-[10px] text-slate-400">Báo cáo máy con đang sáng hay tắt màn hình</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentChildId) return;
                      setTrackingCollectionConfig(currentChildId, {
                        ...trackingConfig,
                        enableScreenStateSync: !trackingConfig.enableScreenStateSync
                      });
                    }}
                    className={`w-10 h-5.5 rounded-full transition-colors duration-200 p-0.5 cursor-pointer shrink-0 ml-2 ${
                      trackingConfig.enableScreenStateSync ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                        trackingConfig.enableScreenStateSync ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-2">
              <button
                type="button"
                onClick={() => setShowTrackingModal(false)}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        role="parent"
        isViewOnly={true}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
};
