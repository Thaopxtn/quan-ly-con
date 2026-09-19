import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  AlertOctagon,
  Gift,
  BookOpen,
  Sparkles,
  Send,
  X,
  Smile,
  ShieldCheck,
  Flame,
  Volume2,
  VolumeX,
  Zap,
  Pin,
  Calculator,
  HelpCircle,
  Footprints,
  Utensils,
  Moon,
  Droplets,
  Mic,
  Volume1,
  RotateCcw,
  Sliders,
  Sun,
  KeyRound,
  MessageCircle,
  Shield,
  Users,
  FileText,
  Smartphone,
  Home,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  ExternalLink,
  Layers,
  LogOut,
} from 'lucide-react';
import { useAppState, syncWithCloudForChild, isSimulatorMode } from '@shared/store';
import { DebugLogModal } from '@shared/components/DebugLogModal';
import { debugLogService } from '@shared/services/debugLogService';
import confetti from 'canvas-confetti';
import { KidPairingModal } from './KidPairingModal';
import { KidActivationScreen } from './KidActivationScreen';
import { KidPermissionsScreen } from './KidPermissionsScreen';
import {
  checkRealAndroidPermissions,
  startNativeProtectionService,
  updateNativeEnforcementRules,
  openHomeLauncherSettings,
  getNativeScreenState,
  addScreenStateListener,
  fetchRealInstalledApps,
  launchNativeApp,
  type RealInstalledApp,
} from './services/nativePermissionsService';
import { EmergencyContactBar } from './EmergencyContactBar';
import { SharedLessonViewerModal } from './SharedLessonViewerModal';
import { KidNotificationBanner } from './KidNotificationBanner';
import { SharedLessonLink } from '../../shared/types';
import { FamilyChatModal } from '../../shared/components/FamilyChatModal';
import { PrivacyPolicyModal } from '../../shared/components/PrivacyPolicyModal';
import {
  uploadChildTelemetryToCloud,
  subscribeRemoteCommandsOnKid,
  clearRemoteCommand,
  flushOfflineTelemetryQueue,
  autoDiscoverMatchingChild,
  logChildRoutePointToCloud,
  triggerCloudSOS,
  subscribeCloudChatMessages,
} from '../../shared/firebase/cloudSyncService';
import {
  getKidDevicePairedInfo,
  saveKidDevicePairedInfo,
  unpairKidDevice,
  KidPairedInfo,
} from '@shared/firebase/pairingService';
import { ensureKidAnonymousAuth, logoutKidAccount } from '@shared/firebase/firebaseService';
import { ConnectedAccountsModal } from './ConnectedAccountsModal';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { haptics } from '@shared/utils/haptics';

function speakVietnamese(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onerror = () => {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {}
      };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function playBuzzSirenAudio() {
  try {
    // Vibrate device aggressively if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([600, 200, 600, 200, 800, 200, 1000]);
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      osc.frequency.setValueAtTime(600, now + i * 0.4);
      osc.frequency.linearRampToValueAtTime(1400, now + i * 0.4 + 0.2);
      osc.frequency.linearRampToValueAtTime(600, now + i * 0.4 + 0.4);
    }
    osc.start(now);
    osc.stop(now + 4);
  } catch (e) {
    console.warn('Audio siren error:', e);
  }
}

interface KidAppProps {
  simulatedChildId?: string;
}

export const KidApp: React.FC<KidAppProps> = ({ simulatedChildId }) => {
  const {
    state,
    triggerSOS,
    requestTimeExtension,
    toggleTaskCompleted,
    redeemRewardOnKid,
    solveChallengeOnKid,
    addStepsOnKid,
    clearBroadcastOverlay,
    clearReminder,
    simulateSensorTrigger,
    setHardwareControls,
    requestChildHardwareAdjustment,
    updateSensorValues,
    setLockChallenge,
    unlockDevice,
    setKioskMode,
    broadcastOverlay,
    extendChildTimeNow,
    switchChild,
    incrementScreenTimeUsed,
    sendKidResponseToParent,
  } = useAppState();

  const [pairedInfo, setPairedInfo] = useState<KidPairedInfo | null>(() => getKidDevicePairedInfo());
  const activeParentId = pairedInfo?.parentId || 'family_primary';
  const realChildId = pairedInfo?.childId || (simulatedChildId && state.children?.find((c) => c.id === simulatedChildId)?.id) || state.selectedChildId || 'bach';

  const targetChild = (simulatedChildId && state.children?.find((c) => c.id === simulatedChildId)) || state.child;
  const targetChildId = realChildId;
  const targetSettings = state.childSettings?.[targetChildId] || {
    screenTimeLimitMinutes: 135,
    apps: state.apps,
    screenTime: state.screenTime,
    hardwareControls: state.hardwareControls,
    kioskMode: state.kioskMode,
    lockChallenge: state.lockChallenge,
    smartRoutines: state.smartRoutines,
    kidTasks: state.kidTasks,
    kidStars: state.kidStars,
  };

  const child = {
    ...targetChild,
    id: targetChildId,
    name: pairedInfo?.childName || targetChild.name || 'bach',
    avatar: pairedInfo?.childAvatar || targetChild.avatar,
    age: pairedInfo?.childAge || targetChild.age,
    grade: pairedInfo?.childAge ? `${pairedInfo.childAge} tuổi` : targetChild.grade,
  };

  // Explicit device pairing: fresh downloads or unpaired devices strictly wait for Google Login or 6-digit PIN
  const handleUnpairCurrentDevice = () => {
    if (typeof window !== 'undefined' && window.confirm('Bạn có chắc muốn hủy liên kết máy này? Thiết bị sẽ trở về màn hình kích hoạt ban đầu.')) {
      unpairKidDevice();
      logoutKidAccount();
      setPairedInfo(null);
      setShowKidControlPanel(false);
      setToastMessage('Đã hủy liên kết thiết bị thành công!');
    }
  };

  const geofenceStateRef = React.useRef<Record<string, boolean>>({});
  const lastGeofenceAlertTimeRef = React.useRef<Record<string, number>>({});
  const [isSosButtonCooldown, setIsSosButtonCooldown] = useState(false);

  const handleKidTriggerSOS = (source: 'header' | 'button') => {
    if (isSosButtonCooldown) {
      showToast('⏳ Tín hiệu SOS đã được gửi đi, đang chờ Bố Mẹ kết nối...');
      return;
    }
    setIsSosButtonCooldown(true);
    setTimeout(() => {
      setIsSosButtonCooldown(false);
    }, 8000);

    haptics.warning();
    triggerSOS({
      childId: targetChildId,
      lat: child.lat,
      lng: child.lng,
      address: child.currentAddress,
    });
    showToast(
      source === 'header'
        ? '🚨 ĐÃ PHÁT TÍN HIỆU SOS ĐẾN BỐ MẸ!'
        : '🚨 ĐÃ PHÁT TÍN HIỆU SOS ĐẾN ĐIỆN THOẠI BỐ MẸ VÀ NGƯỜI THÂN!'
    );
  };

  // Ensure store selectedChildId matches Kid device targetChildId once on load
  const hasSyncedChildRef = useRef(false);
  useEffect(() => {
    if (targetChildId && state.selectedChildId !== targetChildId && !hasSyncedChildRef.current) {
      hasSyncedChildRef.current = true;
      switchChild(targetChildId);
    }
  }, [targetChildId, state.selectedChildId, switchChild]);

  const apps = targetSettings.apps;
  const kidTasks = targetSettings.kidTasks;
  const kidStars = targetSettings.kidStars;
  const hardwareControls = targetSettings.hardwareControls;
  const kioskMode = targetSettings.kioskMode;
  const lockChallenge = targetSettings.lockChallenge;
  const smartRoutines = targetSettings.smartRoutines;
  const screenTime = targetSettings.screenTime;
  const trackingConfig = targetSettings.trackingConfig || {
    isMasterTrackingEnabled: true,
    enableGpsTracking: true,
    enableSensorMonitoring: true,
    enableAppUsageTracking: true,
    enableScreenStateSync: true,
    enableNetworkMonitoring: true,
  };

  const {
    activeSOS,
    studyModeOnly,
    broadcastMessage,
    lastVoiceGuide,
    activeReminder,
    activeOpenedApp,
  } = state;

  const [isBroadcastDismissed, setIsBroadcastDismissed] = useState(false);
  const [selectedBlockedApp, setSelectedBlockedApp] = useState<string | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'rewards' | 'schedule'>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const [showKidControlPanel, setShowKidControlPanel] = useState(false);
  const [showSensorInfoModal, setShowSensorInfoModal] = useState<'profanity' | 'noise' | 'all' | null>(null);
  const [requestHwSent, setRequestHwSent] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const lastProcessedChatTsRef = React.useRef<number>(Date.now() - 5000);
  const [showPermissionsScreen, setShowPermissionsScreen] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [activeSharedLesson, setActiveSharedLesson] = useState<SharedLessonLink | null>(null);

  const [hasMissingPermissions, setHasMissingPermissions] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [errorCount, setErrorCount] = useState(() => debugLogService.getErrorCount());

  useEffect(() => {
    return debugLogService.subscribe(() => {
      setErrorCount(debugLogService.getErrorCount());
    });
  }, []);

  // Hardware back button & gesture navigation handler
  useEffect(() => {
    const handleBack = (): boolean => {
      if (showPermissionsScreen) {
        setShowPermissionsScreen(false);
        return true;
      }
      if (showPrivacyPolicy) {
        setShowPrivacyPolicy(false);
        return true;
      }
      if (showChatModal) {
        setShowChatModal(false);
        return true;
      }
      if (showKidControlPanel) {
        setShowKidControlPanel(false);
        return true;
      }
      if (showPairModal) {
        setShowPairModal(false);
        return true;
      }
      if (showConnectedAccounts) {
        setShowConnectedAccounts(false);
        return true;
      }
      if (selectedBlockedApp) {
        setSelectedBlockedApp(null);
        return true;
      }
      if (showSensorInfoModal) {
        setShowSensorInfoModal(null);
        return true;
      }
      if (activeSharedLesson) {
        setActiveSharedLesson(null);
        return true;
      }
      if (broadcastMessage && !isBroadcastDismissed) {
        setIsBroadcastDismissed(true);
        return true;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false; // at Home root, let native layer minimize to background
    };

    (window as any).handleHardwareBack = handleBack;
    const onBackButton = (e: Event) => {
      e.preventDefault();
      handleBack();
    };
    document.addEventListener('backbutton', onBackButton);

    return () => {
      if ((window as any).handleHardwareBack === handleBack) {
        delete (window as any).handleHardwareBack;
      }
      document.removeEventListener('backbutton', onBackButton);
    };
  }, [
    showPermissionsScreen,
    showPrivacyPolicy,
    showChatModal,
    showKidControlPanel,
    showPairModal,
    showConnectedAccounts,
    selectedBlockedApp,
    showSensorInfoModal,
    activeSharedLesson,
    broadcastMessage,
    isBroadcastDismissed,
    activeTab,
  ]);

  // Launcher App List States & Data (Instant 0ms launch from cached apps)
  const [realInstalledApps, setRealInstalledApps] = useState<RealInstalledApp[]>(() => {
    try {
      const cached = localStorage.getItem('kidcare_cached_apps_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });
  const [isScanningApps, setIsScanningApps] = useState<boolean>(false);
  const [appSearchQuery, setAppSearchQuery] = useState<string>('');
  const [appCategoryFilter, setAppCategoryFilter] = useState<'all' | 'study' | 'allowed' | 'blocked'>('all');
  const [appViewMode, setAppViewMode] = useState<'grid' | 'list'>('grid');

  const loadInstalledApps = React.useCallback(async () => {
    setIsScanningApps(true);
    try {
      const scanned = await fetchRealInstalledApps();
      if (scanned && scanned.length > 0) {
        setRealInstalledApps(scanned);
        try {
          localStorage.setItem('kidcare_cached_apps_v2', JSON.stringify(scanned));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Load installed apps error:', e);
    } finally {
      setIsScanningApps(false);
    }
  }, []);

  useEffect(() => {
    // Launch load optimization: delay real app scan by 1200ms so initial frame paints immediately
    const timer = setTimeout(() => {
      loadInstalledApps();
    }, 1200);
    return () => clearTimeout(timer);
  }, [loadInstalledApps]);

  const getPackageNameForApp = (id: string, name: string): string => {
    const lower = (name + ' ' + id).toLowerCase();
    if (lower.includes('youtube')) return 'com.google.android.youtube';
    if (lower.includes('zalo')) return 'com.zing.zalo';
    if (lower.includes('chrome')) return 'com.android.chrome';
    if (lower.includes('tiktok')) return 'com.zhiliaoapp.musically';
    if (lower.includes('facebook')) return 'com.facebook.katana';
    if (lower.includes('messenger')) return 'com.facebook.orca';
    if (lower.includes('roblox') || lower.includes('game')) return 'com.roblox.client';
    if (lower.includes('duolingo')) return 'com.duolingo';
    if (lower.includes('camera') || lower.includes('ảnh')) return 'com.android.camera';
    if (lower.includes('máy tính') || lower.includes('calculator')) return 'com.android.calculator2';
    if (lower.includes('đồng hồ') || lower.includes('clock')) return 'com.google.android.deskclock';
    if (lower.includes('cài đặt') || lower.includes('setting')) return 'com.android.settings';
    return id.replace('app_', '');
  };

  // Combine real installed apps with parent settings rules
  const launcherApps = useMemo(() => {
    if (realInstalledApps.length > 0) {
      return realInstalledApps.map((realApp) => {
        const matchingRule = apps.find(
          (a) =>
            a.id === realApp.id ||
            a.name.toLowerCase() === realApp.name.toLowerCase() ||
            (realApp.packageName && a.id && realApp.packageName.toLowerCase().includes(a.id.replace('app_', '').toLowerCase()))
        );

        const isBlocked = matchingRule ? matchingRule.status === 'blocked' : false;
        const timeUsed = matchingRule ? matchingRule.timeUsedMinutes : 0;
        const dailyLimit = matchingRule ? matchingRule.dailyLimitMinutes : 0;

        return {
          id: realApp.id,
          name: realApp.name,
          packageName: realApp.packageName,
          category: realApp.category || (matchingRule ? matchingRule.category : 'other'),
          icon: realApp.icon,
          status: isBlocked ? ('blocked' as const) : ('allowed' as const),
          timeUsedMinutes: timeUsed,
          dailyLimitMinutes: dailyLimit,
          isSystem: realApp.isSystem,
        };
      });
    }

    return apps.map((a) => ({
      id: a.id,
      name: a.name,
      packageName: getPackageNameForApp(a.id, a.name),
      category: a.category,
      icon: undefined,
      status: a.status,
      timeUsedMinutes: a.timeUsedMinutes,
      dailyLimitMinutes: a.dailyLimitMinutes,
      isSystem: false,
    }));
  }, [realInstalledApps, apps]);

  const filteredLauncherApps = useMemo(() => {
    return launcherApps.filter((app) => {
      // 1. Search Query
      if (appSearchQuery.trim()) {
        const q = appSearchQuery.trim().toLowerCase();
        const matchesName = app.name.toLowerCase().includes(q);
        const matchesPkg = (app.packageName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPkg) return false;
      }

      // 2. Category / Status Filter
      const isBlocked = app.status === 'blocked' || (studyModeOnly && app.category !== 'study');
      if (appCategoryFilter === 'allowed') {
        return !isBlocked;
      }
      if (appCategoryFilter === 'blocked') {
        return isBlocked;
      }
      if (appCategoryFilter === 'study') {
        return app.category === 'study';
      }

      return true;
    });
  }, [launcherApps, appSearchQuery, appCategoryFilter, studyModeOnly]);
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(() => {
    return localStorage.getItem('kidcare_privacy_policy_accepted_v1') === 'true';
  });

  useEffect(() => {
    if (targetSettings.activeSharedLink?.isOpen && !activeSharedLesson) {
      setActiveSharedLesson(targetSettings.activeSharedLink);
    }
  }, [targetSettings.activeSharedLink]);

  const checkPermissions = async (): Promise<boolean> => {
    let missing = false;
    const realStatus = await checkRealAndroidPermissions();
    if (realStatus) {
      missing = !realStatus.isAllGranted;
      setHasMissingPermissions(missing);
      return missing;
    }

    try {
      const saved = localStorage.getItem('kidcare_permissions_state_v1');
      if (!saved) {
        missing = true;
      } else {
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object') {
          missing = true;
        } else {
          const required = ['overlay', 'accessibility', 'device_admin', 'location', 'battery'];
          missing = required.some((k) => !parsed[k]);
        }
      }
    } catch {
      missing = true;
    }
    setHasMissingPermissions(missing);
    return missing;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__APP_ROLE__ = 'kid';
    }
    // Check permissions on mount and update state without hijacking the screen
    checkPermissions();

    const handleStorage = () => checkPermissions();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleStorage);
    document.addEventListener('visibilitychange', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleStorage);
      document.removeEventListener('visibilitychange', handleStorage);
    };
  }, []);

  // Android Hardware Back Button Handling
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      e.preventDefault();
      if (showPermissionsScreen) {
        setShowPermissionsScreen(false);
        return;
      }
      if (showChatModal) {
        setShowChatModal(false);
        return;
      }
      if (showKidControlPanel) {
        setShowKidControlPanel(false);
        return;
      }
      if (showSensorInfoModal) {
        setShowSensorInfoModal(null);
        return;
      }
      if (showConnectedAccounts) {
        setShowConnectedAccounts(false);
        return;
      }
      if (showPrivacyPolicy) {
        setShowPrivacyPolicy(false);
        return;
      }
      if (selectedBlockedApp) {
        setSelectedBlockedApp(null);
        return;
      }
      if (activeSharedLesson) {
        setActiveSharedLesson(null);
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }
    };

    document.addEventListener('backbutton', handleBackButton);
    return () => {
      document.removeEventListener('backbutton', handleBackButton);
    };
  }, [
    showPermissionsScreen,
    showChatModal,
    showKidControlPanel,
    showSensorInfoModal,
    showConnectedAccounts,
    showPrivacyPolicy,
    selectedBlockedApp,
    activeSharedLesson,
    activeTab,
  ]);

  // Monitoring data from settings
  const alarms = targetSettings.alarms || [];
  const timers = targetSettings.timers || [];
  const scheduleEvents = targetSettings.scheduleEvents || [];
  const sensors = targetSettings.sensorValues;
  const today = new Date().toISOString().slice(0, 10);

  // Challenge solver states
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState(false);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizError, setQuizError] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(300);

  // Countdown timer for challenge
  useEffect(() => {
    let interval: any;
    if (lockChallenge.isLocked && lockChallenge.lockType === 'countdown') {
      interval = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            solveChallengeOnKid();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockChallenge.isLocked, lockChallenge.lockType]);

  // Start Android Native 24/7 Foreground Protection Service on boot/mount
  useEffect(() => {
    startNativeProtectionService().catch((e) => console.warn('Protection service startup error:', e));
  }, []);

  // Helper to map managed app items to Android package keywords/identifiers
  const getBlockedPackagesList = (appList: typeof apps, isStudyMode: boolean): string[] => {
    const pkgMapping: Record<string, string[]> = {
      app_youtube: ['youtube', 'com.google.android.youtube'],
      app_tiktok: ['tiktok', 'musically', 'trill', 'com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'],
      app_zalo: ['zalo', 'com.zing.zalo'],
      app_facebook: ['facebook', 'com.facebook.katana'],
      app_messenger: ['messenger', 'orca', 'com.facebook.orca'],
      app_chrome: ['chrome', 'com.android.chrome'],
      app_game: ['game', 'roblox', 'com.roblox.client', 'freefire', 'genshin', 'pubg'],
      app_instagram: ['instagram', 'com.instagram.android'],
    };

    const blockedList: string[] = [];
    appList.forEach((app) => {
      const isBlocked = app.status === 'blocked' || (isStudyMode && app.category !== 'study');
      if (isBlocked) {
        const mapped = pkgMapping[app.id];
        if (mapped) {
          blockedList.push(...mapped);
        } else {
          blockedList.push(app.id, app.name.toLowerCase());
        }
      }
    });
    return Array.from(new Set(blockedList));
  };

  // Ensure Kid device is authenticated anonymously on Firebase for security rules compliance
  useEffect(() => {
    ensureKidAnonymousAuth().then((u) => {
      if (u) {
        console.log('[KidCare] Authenticated anonymously to Firebase Auth with UID:', u.uid);
      }
    }).catch(() => {});
  }, []);

  // Synchronize rules to Native Android Accessibility Service only when rules actually change
  const lastEnforcementRulesRef = React.useRef<string>('');
  useEffect(() => {
    const isLocked = Boolean(lockChallenge.isLocked);
    const kioskEnabled = Boolean(kioskMode.isEnabled);
    const kioskPackage = kioskMode.pinnedAppId || '';
    const blockedPackages = getBlockedPackagesList(apps, studyModeOnly);

    const rulesPayload = {
      isLocked,
      kioskEnabled,
      kioskPackage,
      blockedPackages,
    };
    const serialized = JSON.stringify(rulesPayload);
    if (lastEnforcementRulesRef.current === serialized) {
      return;
    }
    lastEnforcementRulesRef.current = serialized;

    updateNativeEnforcementRules(rulesPayload).catch((e) => console.warn('updateNativeEnforcementRules error:', e));
  }, [lockChallenge.isLocked, kioskMode.isEnabled, kioskMode.pinnedAppId, apps, studyModeOnly]);

  const appsRef = useRef(apps);
  appsRef.current = apps;
  const studyModeOnlyRef = useRef(studyModeOnly);
  studyModeOnlyRef.current = studyModeOnly;
  const kioskModeRef = useRef(kioskMode);
  kioskModeRef.current = kioskMode;
  const hardwareControlsRef = useRef(hardwareControls);
  hardwareControlsRef.current = hardwareControls;
  const childRef = useRef(child);
  childRef.current = child;
  const targetSettingsRef = useRef(targetSettings);
  targetSettingsRef.current = targetSettings;
  const screenTimeRef = useRef(screenTime);
  screenTimeRef.current = screenTime;
  const activeOpenedAppRef = useRef(activeOpenedApp);
  activeOpenedAppRef.current = activeOpenedApp;
  const realInstalledAppsRef = useRef(realInstalledApps);
  realInstalledAppsRef.current = realInstalledApps;
  const pairedInfoRef = useRef(pairedInfo);
  pairedInfoRef.current = pairedInfo;
  const trackingConfigRef = useRef(trackingConfig);
  trackingConfigRef.current = trackingConfig;

  // Active Cloud Firestore sync for kid device (Runs only when identity changes)
  useEffect(() => {
    if (activeParentId && targetChildId) {
      syncWithCloudForChild(activeParentId, targetChildId, child.name);
    }
  }, [activeParentId, targetChildId, child.name]);

  // Remote Control Commands Execution (Decoupled from local state changes to prevent re-render loops)
  useEffect(() => {
    if (!activeParentId || !targetChildId) return;

    const unsubCmd = subscribeRemoteCommandsOnKid(activeParentId, targetChildId, (cmd) => {
      if (!cmd || !cmd.command || cmd.command === 'none') return;

      const curApps = appsRef.current;
      const curStudyModeOnly = studyModeOnlyRef.current;
      const curKioskMode = kioskModeRef.current;
      const curHw = hardwareControlsRef.current;
      const curChild = childRef.current;
      const curPairedInfo = pairedInfoRef.current;

      switch (cmd.command) {
        case 'buzz_siren':
          playBuzzSirenAudio();
          showToast('🚨 BỐ MẸ ĐANG PHÁT TÍN HIỆU CÒI TÌM MÁY!');
          break;
        case 'ping':
          if (lastTelemetryRef.current && lastTelemetryRef.current.lat && lastTelemetryRef.current.lng) {
            uploadChildTelemetryToCloud(
              activeParentId,
              targetChildId,
              {
                lat: lastTelemetryRef.current.lat,
                lng: lastTelemetryRef.current.lng,
                speed: lastTelemetryRef.current.speed,
                battery: lastTelemetryRef.current.battery,
                currentAddress: curChild.currentAddress || 'Đang hoạt động',
                childName: curChild.name,
                deviceId: curPairedInfo?.deviceId,
                deviceName: curPairedInfo?.deviceName,
                model: curPairedInfo?.model,
                sensors: targetSettingsRef.current.sensorValues,
                screenTimeUsedMinutes: screenTimeRef.current?.todayTotalMinutes || 0,
                activeOpenedApp: typeof activeOpenedAppRef.current === 'object' && activeOpenedAppRef.current ? activeOpenedAppRef.current.name : (typeof activeOpenedAppRef.current === 'string' ? activeOpenedAppRef.current : ''),
                installedAppsCount: realInstalledAppsRef.current.length || curApps.length,
              },
              true,
              curChild.name
            ).catch(() => {});
          }
          break;
        case 'lock_now':
          setLockChallenge(
            cmd.payload?.lockType || 'instant',
            cmd.payload?.title || 'Thiết bị đang bị khóa từ xa',
            cmd.payload?.description || 'Bố mẹ đã tạm khóa thiết bị. Con hãy nghỉ ngơi một chút nhé!'
          );
          updateNativeEnforcementRules({
            isLocked: true,
            kioskEnabled: false,
            kioskPackage: '',
            blockedPackages: getBlockedPackagesList(curApps, curStudyModeOnly),
          }).catch(() => {});
          showToast('🔒 BỐ MẸ ĐÃ TẠM KHÓA MÁY TỪ XA!');
          break;
        case 'unlock_now':
          unlockDevice();
          updateNativeEnforcementRules({
            isLocked: false,
            kioskEnabled: Boolean(curKioskMode.isEnabled),
            kioskPackage: curKioskMode.pinnedAppId || '',
            blockedPackages: getBlockedPackagesList(curApps, curStudyModeOnly),
          }).catch(() => {});
          showToast('🔓 BỐ MẸ ĐÃ MỞ KHÓA THIẾT BỊ CHO CON!');
          break;
        case 'extend_time':
          const extra = cmd.payload?.minutes || 15;
          extendChildTimeNow(extra, targetChildId);
          showToast(`⏱️ BỐ MẸ ĐÃ CỘNG THÊM +${extra} PHÚT DÙNG MÁY!`);
          break;
        case 'kiosk_lock':
          const kioskPkg = cmd.payload?.appId || 'study_app';
          setKioskMode(true, kioskPkg, cmd.payload?.appName || 'Ứng dụng học tập');
          updateNativeEnforcementRules({
            isLocked: false,
            kioskEnabled: true,
            kioskPackage: kioskPkg,
            blockedPackages: getBlockedPackagesList(curApps, curStudyModeOnly),
          }).catch(() => {});
          showToast(`📌 BỐ MẸ ĐÃ BẬT CHẾ ĐỘ GHIM: ${cmd.payload?.appName || 'Học tập'}`);
          break;
        case 'kiosk_unlock':
          setKioskMode(false);
          updateNativeEnforcementRules({
            isLocked: false,
            kioskEnabled: false,
            kioskPackage: '',
            blockedPackages: getBlockedPackagesList(curApps, curStudyModeOnly),
          }).catch(() => {});
          showToast('🔓 Chế độ ghim ứng dụng đã được tắt');
          break;
        case 'broadcast_msg':
          setIsBroadcastDismissed(false);
          broadcastOverlay(cmd.payload?.title || 'Lời dặn từ Bố Mẹ', cmd.payload?.message || '', cmd.payload?.imageUrl, true);
          if (cmd.payload?.speakTTS || cmd.payload?.message) {
            speakVietnamese(cmd.payload?.message || cmd.payload?.title || '');
          }
          showToast('💬 THÔNG ĐIỆP MỚI TỪ BỐ MẸ!');
          break;
        case 'clear_broadcast':
          setIsBroadcastDismissed(true);
          clearBroadcastOverlay();
          break;
        case 'flash_toggle':
          setHardwareControls({ flashlight: cmd.payload?.flashlight !== undefined ? cmd.payload.flashlight : !curHw.flashlight }, 'child');
          showToast('⚡ Đã cập nhật trạng thái đèn flash từ xa');
          break;
        case 'hardware_control':
          if (typeof cmd.payload?.volume === 'number' || typeof cmd.payload?.brightness === 'number') {
            setHardwareControls({
              volume: cmd.payload?.volume !== undefined ? cmd.payload.volume : curHw.volume,
              brightness: cmd.payload?.brightness !== undefined ? cmd.payload.brightness : curHw.brightness,
            }, 'child');
            showToast('🎛️ Bố mẹ đã điều chỉnh âm lượng / độ sáng màn hình');
          }
          break;
        case 'open_shared_link':
          if (cmd.payload?.url) {
            setActiveSharedLesson({
              id: cmd.payload?.id || `link_${Date.now()}`,
              url: cmd.payload.url,
              title: cmd.payload.title || 'Bài học Bố Mẹ gửi',
              note: cmd.payload.note || '',
              forcedMinutes: cmd.payload.forcedMinutes || 0,
              createdAt: cmd.payload.createdAt || Date.now(),
              isOpen: true,
            });
            showToast('🎓 BỐ MẸ VỪA GỬI BÀI HỌC CHO CON!');
          }
          break;
        case 'close_shared_link':
          setActiveSharedLesson(null);
          showToast('✅ Bố mẹ đã đóng bài học từ xa');
          break;
        default:
          break;
      }

      clearRemoteCommand(activeParentId, targetChildId, curChild.name).catch(() => {});
    }, child.name);

    return () => unsubCmd();
  }, [activeParentId, targetChildId, child.name]);

  // Background Real-time Chat Listener on Kid Device
  // Receives parent messages even when FamilyChatModal is closed,
  // alerts child with toast & sound, speaks aloud via TTS if requested, and increments unread badge.
  useEffect(() => {
    if (!activeParentId || !targetChildId) return;

    const unsubChat = subscribeCloudChatMessages(
      activeParentId,
      targetChildId,
      (cloudMsgs) => {
        if (!cloudMsgs || cloudMsgs.length === 0) return;

        // Auto-cache to localStorage for instant chat UI loading
        const storageKey = `family_chat_messages_${targetChildId}`;
        try {
          const savedStr = localStorage.getItem(storageKey);
          const saved: any[] = savedStr ? JSON.parse(savedStr) : [];
          const merged = [...saved.filter((m) => m.id !== 'msg_1' && m.id !== 'msg_2')];
          cloudMsgs.forEach((cm) => {
            const exists = merged.some((m) => m.id === cm.id || (m.text === cm.text && m.time === cm.time));
            if (!exists) merged.push(cm);
          });
          merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch (e) {}

        // Check for new incoming messages from parent
        cloudMsgs.forEach((msg) => {
          if (msg.sender === 'parent' && (msg.timestamp || 0) > lastProcessedChatTsRef.current) {
            lastProcessedChatTsRef.current = msg.timestamp || Date.now();

            if (!showChatModal) {
              setUnreadChatCount((prev) => prev + 1);
              setToastMessage(`💬 Bố/Mẹ: "${msg.text}"`);
              haptics.success();

              if (msg.speakTTS) {
                speakVietnamese(`Bố mẹ dặn: ${msg.text}`);
              }
            }
          }
        });
      },
      child.name
    );

    return () => unsubChat();
  }, [activeParentId, targetChildId, child.name, showChatModal]);

  // Online restoration auto-flush offline telemetry queue
  useEffect(() => {
    if (!activeParentId || !targetChildId) return;
    const handleOnline = () => {
      showToast('📶 Kết nối mạng đã phục hồi, đang đồng bộ dữ liệu...');
      flushOfflineTelemetryQueue(activeParentId, targetChildId).catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [activeParentId, targetChildId]);

  // Smart Adaptive Sync & Battery State Management
  const [isScreenOn, setIsScreenOn] = useState<boolean>(true);
  const [isAppInForeground, setIsAppInForeground] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });

  const heartbeatTimerRef = React.useRef<any>(null);

  // Smart Telemetry state tracking ref (preserves battery & supports adaptive interval)
  const lastTelemetryRef = React.useRef<{
    lat: number;
    lng: number;
    speed: number;
    battery: number;
    lastSent: number;
    isScreenOn: boolean;
    isAppInForeground: boolean;
  }>({
    lat: child.lat,
    lng: child.lng,
    speed: child.speed || 0,
    battery: child.battery || 85,
    lastSent: 0,
    isScreenOn: true,
    isAppInForeground: typeof document !== 'undefined' ? !document.hidden : true,
  });

  // Keep ref updated when state coordinates change
  useEffect(() => {
    if (child.lat && child.lng) {
      lastTelemetryRef.current.lat = child.lat;
      lastTelemetryRef.current.lng = child.lng;
    }
    if (child.battery) {
      lastTelemetryRef.current.battery = child.battery;
    }
    if (child.speed !== undefined) {
      lastTelemetryRef.current.speed = child.speed;
    }
    lastTelemetryRef.current.isScreenOn = isScreenOn;
    lastTelemetryRef.current.isAppInForeground = isAppInForeground;
  }, [child.lat, child.lng, child.battery, child.speed, isScreenOn, isAppInForeground]);

  // 1. Active Screen Time Ticker & Auto-Lock (Ticks every 60 seconds)
  useEffect(() => {
    const ticker = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;

      const totalLimit = targetSettings.screenTimeLimitMinutes || 135;
      const currentUsed = (targetSettings.screenTime?.todayTotalMinutes || 0) + 1;

      incrementScreenTimeUsed(targetChildId, 1);

      if (currentUsed >= totalLimit && !lockChallenge.isLocked) {
        setLockChallenge(
          'countdown',
          'Đã hết thời gian dùng máy hôm nay!',
          `Bé đã dùng đủ ${Math.floor(totalLimit / 60)}h ${totalLimit % 60}p giới hạn được bố mẹ đặt.`
        );
        haptics.warning();
        speakVietnamese('Bé ơi, đã hết thời gian sử dụng điện thoại hôm nay rồi nhé!');
      }
    }, 60000);

    return () => clearInterval(ticker);
  }, [targetSettings.screenTimeLimitMinutes, targetSettings.screenTime?.todayTotalMinutes, lockChallenge.isLocked, targetChildId, incrementScreenTimeUsed, setLockChallenge]);

  // 2. Smart Routines Clock Watcher (Mealtime & Bedtime Schedule)
  useEffect(() => {
    const parseTimeMinutes = (tStr?: string): number => {
      if (!tStr) return -1;
      const [h, m] = tStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const isCurrentTimeInRange = (startStr?: string, endStr?: string): boolean => {
      if (!startStr || !endStr) return false;
      const now = new Date();
      const curMins = now.getHours() * 60 + now.getMinutes();
      const startMins = parseTimeMinutes(startStr);
      const endMins = parseTimeMinutes(endStr);

      if (startMins <= endMins) {
        return curMins >= startMins && curMins < endMins;
      } else {
        return curMins >= startMins || curMins < endMins;
      }
    };

    const checkRoutines = () => {
      const { mealtimeLock, mealtimeStart, mealtimeEnd, bedtimeLock, bedtimeStart, bedtimeEnd } = smartRoutines;

      const inMealtime = Boolean(mealtimeLock && isCurrentTimeInRange(mealtimeStart || '11:30', mealtimeEnd || '12:30'));
      const inBedtime = Boolean(bedtimeLock && isCurrentTimeInRange(bedtimeStart || '21:30', bedtimeEnd || '06:30'));

      if (inMealtime && (!lockChallenge.isLocked || lockChallenge.lockType !== 'mealtime')) {
        setLockChallenge('mealtime', 'Đến giờ ăn cơm rồi!', 'Bé hãy cất điện thoại và cùng gia đình dùng bữa ngon miệng nhé.');
        speakVietnamese('Đến giờ ăn cơm rồi! Bé hãy cất máy và ra dùng bữa cùng gia đình nhé.');
      } else if (inBedtime && (!lockChallenge.isLocked || lockChallenge.lockType !== 'bedtime')) {
        setLockChallenge('bedtime', 'Đã đến giờ đi ngủ!', 'Hãy cất máy và ngủ một giấc thật ngon để ngày mai tràn đầy năng lượng nhé.');
        speakVietnamese('Đã đến giờ đi ngủ rồi! Bé hãy tắt máy và đi ngủ sớm nhé.');
      } else if (!inMealtime && !inBedtime && lockChallenge.isLocked && (lockChallenge.lockType === 'mealtime' || lockChallenge.lockType === 'bedtime')) {
        unlockDevice();
        showToast('🔓 Đã hết giờ hạn chế sinh hoạt. Thiết bị đã được mở khóa!');
      }
    };

    checkRoutines();
    const interval = setInterval(checkRoutines, 30000);
    return () => clearInterval(interval);
  }, [smartRoutines, lockChallenge.isLocked, lockChallenge.lockType, setLockChallenge, unlockDevice]);

  // 3. Voice readout for activeReminder
  useEffect(() => {
    if (activeReminder?.title && activeReminder?.message) {
      speakVietnamese(`${activeReminder.title}. ${activeReminder.message}`);
    }
  }, [activeReminder?.title, activeReminder?.message]);

  // Core helper: Upload fresh telemetry snapshot with screen & sync mode (stabilized with refs)
  const uploadCurrentTelemetrySnapshot = React.useCallback(
    async (reason?: string) => {
      if (!activeParentId || !targetChildId) return;

      const curTrackingConfig = trackingConfigRef.current;
      const curChild = childRef.current;
      const curPairedInfo = pairedInfoRef.current;
      const curTargetSettings = targetSettingsRef.current;
      const curScreenTime = screenTimeRef.current;
      const curActiveApp = activeOpenedAppRef.current;
      const curRealApps = realInstalledAppsRef.current;
      const curApps = appsRef.current;

      const screenOn = lastTelemetryRef.current.isScreenOn;
      const inForeground = lastTelemetryRef.current.isAppInForeground;
      const curSpeed = lastTelemetryRef.current.speed;
      const curBattery = lastTelemetryRef.current.battery;
      const curLat = lastTelemetryRef.current.lat;
      const curLng = lastTelemetryRef.current.lng;

      const isMasterOn = curTrackingConfig.isMasterTrackingEnabled !== false;
      const isGpsOn = isMasterOn && curTrackingConfig.enableGpsTracking !== false;
      const isSensorOn = isMasterOn && curTrackingConfig.enableSensorMonitoring !== false;
      const isAppUsageOn = isMasterOn && curTrackingConfig.enableAppUsageTracking !== false;
      const isScreenStateOn = isMasterOn && curTrackingConfig.enableScreenStateSync !== false;
      const isNetworkOn = isMasterOn && curTrackingConfig.enableNetworkMonitoring !== false;

      // If master tracking is disabled and this is an automated tick, do not upload (sleep mode)
      if (!isMasterOn && reason !== 'tracking_reenabled' && reason !== 'manual_flush' && reason !== 'screen_off') {
        return;
      }

      let syncMode: 'realtime' | 'balanced' | 'power_saving' = 'balanced';
      let appStatus: 'active_in_app' | 'in_background' | 'screen_off' = 'in_background';
      let screenState: 'active' | 'screen_off' | 'background' = 'active';

      if (!isMasterOn) {
        syncMode = 'power_saving';
        appStatus = 'screen_off';
        screenState = 'screen_off';
      } else if (inForeground && screenOn) {
        syncMode = 'realtime';
        appStatus = 'active_in_app';
        screenState = 'active';
      } else if (screenOn) {
        syncMode = 'balanced';
        appStatus = 'in_background';
        screenState = 'active';
      } else {
        syncMode = 'power_saving';
        appStatus = 'screen_off';
        screenState = 'screen_off';
      }

      let effectiveAddress = curChild.currentAddress;
      if (!isMasterOn) {
        effectiveAddress = 'Chế độ ngủ đông - Tiết kiệm pin tối đa (Tạm dừng thu thập)';
      } else if (!isGpsOn) {
        effectiveAddress = 'Đang tạm dừng định vị GPS theo cài đặt của cha mẹ';
      } else {
        effectiveAddress = curChild.currentAddress || (
          inForeground && screenOn
            ? `Bé đang mở ứng dụng (${curLat.toFixed(4)}, ${curLng.toFixed(4)})`
            : !screenOn
            ? `Màn hình tắt - Tiết kiệm pin (${curLat.toFixed(4)}, ${curLng.toFixed(4)})`
            : `Vị trí thực tế (${curLat.toFixed(4)}, ${curLng.toFixed(4)})`
        );
      }

      const sensorsData = curTargetSettings.sensorValues || {
        noiseLevel: 35,
        ambientLight: 280,
        isExcessiveNoise: false,
        profanityDetected: false,
      };

      const networkInfo = {
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionType: (navigator as any)?.connection?.effectiveType || 'wifi/cellular',
      };

      try {
        await uploadChildTelemetryToCloud(
          activeParentId,
          targetChildId,
          {
            lat: isGpsOn ? curLat : 0,
            lng: isGpsOn ? curLng : 0,
            speed: isGpsOn ? curSpeed : 0,
            battery: curBattery,
            currentAddress: effectiveAddress,
            isScreenOn: isScreenStateOn ? screenOn : false,
            screenState: isScreenStateOn ? screenState : 'background',
            appStatus: isScreenStateOn ? appStatus : 'in_background',
            syncMode,
            childName: curChild.name,
            deviceId: curPairedInfo?.deviceId,
            deviceName: curPairedInfo?.deviceName,
            model: curPairedInfo?.model,
            sensors: isSensorOn ? sensorsData : null,
            network: isNetworkOn ? networkInfo : null,
            screenTimeUsedMinutes: isAppUsageOn ? (curScreenTime?.todayTotalMinutes || 0) : undefined,
            activeOpenedApp: isAppUsageOn && isScreenStateOn ? (typeof curActiveApp === 'object' && curActiveApp ? curActiveApp.name : (typeof curActiveApp === 'string' ? curActiveApp : '')) : '',
            installedAppsCount: isAppUsageOn ? (curRealApps.length || curApps.length) : undefined,
          },
          true,
          curChild.name
        );
        lastTelemetryRef.current.lastSent = Date.now();
      } catch (err) {
        console.warn('Telemetry upload error:', err);
      }
    },
    [activeParentId, targetChildId]
  );

  // Compute adaptive interval based on user requirement:
  // "khi con đang mở phần mềm thì dữ liệu cập nhật nhanh chóng, khi tắt màn hình thì mới ở chế độ tiết kiệm lưu lượng máy chủ và pin"
  const getNextHeartbeatIntervalMs = React.useCallback(() => {
    const screenOn = lastTelemetryRef.current.isScreenOn;
    const inForeground = lastTelemetryRef.current.isAppInForeground;
    const curSpeed = lastTelemetryRef.current.speed;
    const curBattery = lastTelemetryRef.current.battery;

    // 1. Con đang mở phần mềm KidCare (Foreground & Active):
    // Cập nhật siêu tốc: 3s nếu di chuyển, 5s nếu đứng yên!
    if (inForeground && screenOn) {
      return curSpeed >= 3 ? 3000 : 5000;
    }

    // 2. Màn hình vẫn bật nhưng KidCare chạy nền:
    // Cân bằng: 15s nếu di chuyển, 30s nếu đứng yên
    if (screenOn) {
      return curSpeed >= 5 ? 15000 : 30000;
    }

    // 3. TẮT MÀN HÌNH:
    // Chế độ siêu tiết kiệm pin & lưu lượng máy chủ:
    if (curBattery < 20) {
      return 300000; // 5 phút nếu pin yếu < 20%
    }
    if (curSpeed >= 15) {
      return 60000; // 1 phút nếu đang đi nhanh trên phương tiện giao thông
    }
    return 150000; // 2.5 phút (150s) khi đứng yên hoặc đi lại chậm
  }, []);

  // Instant Trigger: Trở lại chế độ cập nhật nhanh ngay tức thì khi con mở lại app hoặc bật màn hình
  const triggerInstantTelemetryFlush = React.useCallback(
    (reason: string) => {
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
      }
      uploadCurrentTelemetrySnapshot(reason)
        .catch(() => {})
        .finally(() => {
          if (trackingConfig.isMasterTrackingEnabled === false) return;
          const nextMs = getNextHeartbeatIntervalMs();
          heartbeatTimerRef.current = setTimeout(async () => {
            await uploadCurrentTelemetrySnapshot('scheduled_heartbeat');
          }, nextMs);
        });
    },
    [uploadCurrentTelemetrySnapshot, getNextHeartbeatIntervalMs, trackingConfig.isMasterTrackingEnabled]
  );

  // When parent turns tracking back on from remote, immediately wake up and flush fresh telemetry
  const prevMasterTrackingRef = React.useRef(trackingConfig.isMasterTrackingEnabled);
  useEffect(() => {
    if (prevMasterTrackingRef.current === false && trackingConfig.isMasterTrackingEnabled !== false) {
      showToast('⚡ Bố mẹ đã kích hoạt lại chế độ giám sát trực tuyến.');
      triggerInstantTelemetryFlush('tracking_reenabled');
    } else if (prevMasterTrackingRef.current !== false && trackingConfig.isMasterTrackingEnabled === false) {
      showToast('💤 Thiết bị đã chuyển sang chế độ ngủ đông tiết kiệm pin.');
    }
    prevMasterTrackingRef.current = trackingConfig.isMasterTrackingEnabled !== false;
  }, [trackingConfig.isMasterTrackingEnabled, triggerInstantTelemetryFlush]);

  // Lắng nghe thay đổi trạng thái Màn hình Bật/Tắt & Ứng dụng Mở/Ẩn
  useEffect(() => {
    // 1. Kiểm tra trạng thái màn hình ban đầu từ Android Native
    getNativeScreenState()
      .then((screenOn) => {
        setIsScreenOn(screenOn);
        lastTelemetryRef.current.isScreenOn = screenOn;
      })
      .catch(() => {});

    // 2. Lắng nghe sự kiện Intent.ACTION_SCREEN_ON / SCREEN_OFF / USER_PRESENT
    const unsubNativeScreen = addScreenStateListener((screenOn) => {
      setIsScreenOn(screenOn);
      lastTelemetryRef.current.isScreenOn = screenOn;

      if (screenOn) {
        // Màn hình vừa sáng: Đánh thức và gửi ngay tức thì
        triggerInstantTelemetryFlush('screen_on');
      } else {
        // Màn hình vừa tắt: Gửi ngay 1 gói báo trạng thái "Màn hình tắt - Tiết kiệm pin" rồi chuyển sang chu kỳ dài
        triggerInstantTelemetryFlush('screen_off');
      }
    });

    // 3. Lắng nghe Web Visibility & Focus (khi con mở app lên màn hình hoặc thu nhỏ app)
    const handleVisibilityChange = () => {
      const isVisible = typeof document !== 'undefined' ? !document.hidden : true;
      setIsAppInForeground(isVisible);
      lastTelemetryRef.current.isAppInForeground = isVisible;

      if (isVisible) {
        setIsScreenOn(true);
        lastTelemetryRef.current.isScreenOn = true;
        // Con vừa mở phần mềm KidCare: Kích hoạt ngay chế độ cập nhật siêu tốc!
        triggerInstantTelemetryFlush('app_opened');
      }
    };

    const handleFocus = () => {
      setIsAppInForeground(true);
      setIsScreenOn(true);
      lastTelemetryRef.current.isAppInForeground = true;
      lastTelemetryRef.current.isScreenOn = true;
      triggerInstantTelemetryFlush('app_focus');
    };

    const handleBlur = () => {
      getNativeScreenState()
        .then((screenOn) => {
          setIsScreenOn(screenOn);
          lastTelemetryRef.current.isScreenOn = screenOn;
        })
        .catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      unsubNativeScreen();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [triggerInstantTelemetryFlush]);

  // Adaptive GPS & Telemetry Heartbeat Scheduler
  useEffect(() => {
    if (!activeParentId || !targetChildId) return;

    let isCancelled = false;

    const scheduleLoop = () => {
      if (isCancelled) return;
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
      }

      const intervalMs = getNextHeartbeatIntervalMs();

      heartbeatTimerRef.current = setTimeout(async () => {
        if (isCancelled) return;
        try {
          await uploadCurrentTelemetrySnapshot('adaptive_heartbeat');
        } catch (err) {
          console.warn('Adaptive heartbeat error:', err);
        } finally {
          if (!isCancelled) {
            scheduleLoop();
          }
        }
      }, intervalMs);
    };

    scheduleLoop();

    return () => {
      isCancelled = true;
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current);
      }
    };
  }, [activeParentId, targetChildId, getNextHeartbeatIntervalMs, uploadCurrentTelemetrySnapshot, trackingConfig.isMasterTrackingEnabled]);

  // Real-world Geolocation Watch with Smart Adaptive Frequency
  useEffect(() => {
    let watchId: number | null = null;
    const isMasterOn = trackingConfig.isMasterTrackingEnabled !== false;
    const isGpsOn = isMasterOn && trackingConfig.enableGpsTracking !== false;

    if (!isGpsOn) {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      return;
    }

    // Launch optimization: Defer GPS hardware lock and battery query by 800ms so initial UI renders instantly
    const startTimer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator && activeParentId) {
        try {
          const inForeground = isAppInForeground;
          const screenOn = isScreenOn;

          // Tùy chỉnh tham số GPS theo trạng thái:
          // Khi con mở app: độ chính xác cao nhất, maximumAge thấp (2s)
          // Khi tắt màn hình: maximumAge cao (60s) để chip GPS ngủ tiết kiệm pin
          const geoOptions: PositionOptions = (inForeground && screenOn)
            ? { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
            : screenOn
            ? { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
            : { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 };

          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude, longitude, speed } = pos.coords;
              const currentSpeedKmH = speed ? Math.round(speed * 3.6) : 0;
              const distMoved = calculateDistanceMeters(
                lastTelemetryRef.current.lat,
                lastTelemetryRef.current.lng,
                latitude,
                longitude
              );

              lastTelemetryRef.current.lat = latitude;
              lastTelemetryRef.current.lng = longitude;
              lastTelemetryRef.current.speed = currentSpeedKmH;

              const timeSinceLastSent = Date.now() - lastTelemetryRef.current.lastSent;
              const isCurInFg = lastTelemetryRef.current.isAppInForeground;
              const isCurScreenOn = lastTelemetryRef.current.isScreenOn;

              // Ngưỡng phát hiện di chuyển thích ứng:
              // 1. Khi con mở app: chỉ cần di chuyển 5m hoặc qua 5s là cập nhật ngay!
              // 2. Khi dùng app khác: 20m hoặc 15s-30s
              // 3. Khi tắt màn hình: 80m hoặc 150s (tiết kiệm pin & 4G/máy chủ)
              let distThreshold = 20;
              let timeThreshold = 30000;

              if (isCurInFg && isCurScreenOn) {
                distThreshold = 5;
                timeThreshold = currentSpeedKmH >= 3 ? 3000 : 5000;
              } else if (!isCurScreenOn) {
                distThreshold = 80;
                timeThreshold = lastTelemetryRef.current.battery < 20 ? 300000 : 150000;
              } else {
                distThreshold = 20;
                timeThreshold = currentSpeedKmH >= 5 ? 15000 : 30000;
              }

              const shouldSendNow = distMoved >= distThreshold || timeSinceLastSent >= timeThreshold;

              if (shouldSendNow) {
                uploadCurrentTelemetrySnapshot('movement_or_elapsed').catch(() => {});

                // Chỉ ghi log lộ trình (Route History) khi di chuyển thật sự
                // Tránh spam ghi điểm lộ trình lên Firestore khi máy nằm yên tắt màn hình
                const shouldLogRoute = distMoved >= (isCurInFg ? 15 : 60) || (currentSpeedKmH > 3 && timeSinceLastSent >= (isCurInFg ? 5000 : 45000));

                if (shouldLogRoute) {
                  const ptId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  logChildRoutePointToCloud(
                    activeParentId,
                    targetChildId,
                    {
                      id: ptId,
                      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                      title: currentSpeedKmH > 20 ? 'Di chuyển ô tô/xe buýt' : currentSpeedKmH > 5 ? 'Đang đi xe máy/xe đạp' : currentSpeedKmH > 1 ? 'Đang đi bộ' : 'Dừng chân',
                      address: `Vị trí (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                      lat: latitude,
                      lng: longitude,
                      speed: currentSpeedKmH,
                      battery: lastTelemetryRef.current.battery,
                      type: distMoved > 60 ? 'stop' : 'start',
                      transport: currentSpeedKmH > 25 ? 'car' : currentSpeedKmH > 10 ? 'bike' : currentSpeedKmH > 2 ? 'walk' : 'stay',
                    },
                    child.name
                  ).catch(() => {});
                }

                // Real-time Geofence Evaluation against synced safeZones
                const activeZones = state.safeZones?.filter((z) => z.isActive) || [];
                activeZones.forEach((zone) => {
                  const d = calculateDistanceMeters(latitude, longitude, zone.lat, zone.lng);
                  const wasInside = geofenceStateRef.current[zone.id] ?? true;
                  const isInside = d <= zone.radius;

                  if (wasInside && !isInside) {
                    geofenceStateRef.current[zone.id] = false;
                    const now = Date.now();
                    const lastAlertTime = lastGeofenceAlertTimeRef.current[zone.id] || 0;
                    // Debounce geofence exit alert to at least 60 seconds interval to prevent GPS jitter loops
                    if (now - lastAlertTime > 60000) {
                      lastGeofenceAlertTimeRef.current[zone.id] = now;
                      showToast(`⚠️ BÉ ĐÃ RA KHỎI VÙNG AN TOÀN: ${zone.name.toUpperCase()}!`);
                      haptics.warning();
                      if (zone.notifyOnExit !== false) {
                        triggerCloudSOS(activeParentId, targetChildId, {
                          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                          lat: latitude,
                          lng: longitude,
                          address: `Cảnh báo an toàn: Bé vừa rời khỏi vùng an toàn "${zone.name}"`,
                          childName: child.name,
                        }, child.name).catch(() => {});
                      }
                    }
                  } else if (!wasInside && isInside) {
                    geofenceStateRef.current[zone.id] = true;
                    showToast(`🏡 Bé đã vào vùng an toàn: ${zone.name}!`);
                    haptics.light();
                  }
                });
              }
            },
            (err) => {},
            geoOptions
          );
        } catch (e) {}
      }

      // Native Battery monitoring
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery && activeParentId) {
        (navigator as any).getBattery().then((battery: any) => {
          const updateBattery = () => {
            const level = Math.round(battery.level * 100);
            lastTelemetryRef.current.battery = level;
            uploadCurrentTelemetrySnapshot('battery_level_change').catch(() => {});
          };
          battery.addEventListener('levelchange', updateBattery);
        }).catch(() => {});
      }
    }, 800);

    return () => {
      clearTimeout(startTimer);
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [
    activeParentId,
    targetChildId,
    isAppInForeground,
    isScreenOn,
    child.name,
    uploadCurrentTelemetrySnapshot,
    trackingConfig.isMasterTrackingEnabled,
    trackingConfig.enableGpsTracking,
  ]);

  // Real motion sensor listener on native device (throttled to save memory, prevent frame drops & OOM)
  useEffect(() => {
    const isMasterOn = trackingConfig.isMasterTrackingEnabled !== false;
    const isSensorOn = isMasterOn && trackingConfig.enableSensorMonitoring !== false;
    if (!isSensorOn) return;

    let lastMotionUpdate = 0;
    const handleMotion = (e: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastMotionUpdate < 3000) return;
      if (e.accelerationIncludingGravity) {
        lastMotionUpdate = now;
        const { x, y, z } = e.accelerationIncludingGravity;
        updateSensorValues(targetChildId, {
          accelX: parseFloat((x || 0).toFixed(2)),
          accelY: parseFloat((y || 0).toFixed(2)),
          accelZ: parseFloat((z || 9.8).toFixed(2)),
        });
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion, { passive: true });
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [targetChildId, trackingConfig.isMasterTrackingEnabled, trackingConfig.enableSensorMonitoring]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleTaskCheck = (taskId: string) => {
    const task = kidTasks.find((t) => t.id === taskId);
    const willComplete = !task?.completed;
    toggleTaskCompleted(taskId, child.id);
    if (willComplete) {
      haptics.success();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
      showToast(`🎉 Giỏi quá! Nhận ngay +${task?.stars || 5} Sao!`);
    } else {
      haptics.light();
    }
  };

  const handleRedeemReward = (rewardId: string) => {
    const res = redeemRewardOnKid(child.id, rewardId);
    if (res.success) {
      haptics.success();
      confetti({
        particleCount: 110,
        spread: 120,
        origin: { y: 0.5 },
      });
      showToast(res.message);
    } else {
      haptics.warning();
      showToast(res.message);
    }
  };

  const handleAppClick = async (app: { name: string; packageName?: string; status?: string; category?: string }) => {
    haptics.light();
    const isBlocked = app.status === 'blocked' || (studyModeOnly && app.category !== 'study');
    if (isBlocked) {
      setSelectedBlockedApp(app.name);
      setRequestSent(false);
      setRequestReason('');
      haptics.warning();
    } else {
      showToast(`🚀 Đang mở ${app.name}...`);
      haptics.success();
      if (app.packageName) {
        await launchNativeApp(app.packageName);
      }
    }
  };

  const submitTimeExtension = () => {
    if (!selectedBlockedApp) return;
    haptics.medium();
    requestTimeExtension(selectedBlockedApp, 15, requestReason || 'Con xin thêm thời gian ạ');
    setRequestSent(true);
    setTimeout(() => {
      setSelectedBlockedApp(null);
      setRequestSent(false);
    }, 1500);
  };

  // Math challenge submit
  const handleCheckMath = () => {
    if (!lockChallenge.mathChallenge) return;
    if (Number(mathInput.trim()) === lockChallenge.mathChallenge.answer) {
      haptics.success();
      setMathError(false);
      setMathInput('');
      confetti({ particleCount: 70, spread: 80 });
      solveChallengeOnKid();
      showToast('🎉 Giỏi lắm! Con đã giải đúng bài toán và mở khóa máy thành công!');
    } else {
      haptics.warning();
      setMathError(true);
    }
  };

  // Quiz challenge submit
  const handleSelectQuizOption = (idx: number) => {
    if (!lockChallenge.quizChallenge) return;
    setQuizSelected(idx);
    if (idx === lockChallenge.quizChallenge.correctIndex) {
      haptics.success();
      setQuizError(false);
      confetti({ particleCount: 70, spread: 80 });
      setTimeout(() => {
        solveChallengeOnKid();
        showToast('🎉 Chính xác! Bạn đã mở khóa máy thành công!');
      }, 500);
    } else {
      haptics.warning();
      setQuizError(true);
    }
  };

  if (!simulatedChildId && (!pairedInfo || !pairedInfo.isPaired)) {
    return (
      <KidActivationScreen
        onActivationComplete={() => {
          setPairedInfo(getKidDevicePairedInfo());
        }}
      />
    );
  }

  if (showPermissionsScreen) {
    return (
      <KidPermissionsScreen
        onBack={() => {
          const oneMonthLater = Date.now() + 30 * 24 * 60 * 60 * 1000;
          localStorage.setItem('kidcare_permissions_dismissed_until', oneMonthLater.toString());
          setShowPermissionsScreen(false);
        }}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-sky-50 via-white to-blue-50/30 text-slate-800 select-none overflow-hidden relative">
      {/* Smart Offline Detection Banner */}
      <OfflineBanner />

      {/* Native Status Bar Spacer for Kid Device */}
      {!simulatedChildId && !isSimulatorMode() && (
        <div
          className="w-full shrink-0 bg-sky-50 transition-all pointer-events-none"
          style={{ height: 'var(--status-bar-height, 42px)' }}
        />
      )}

      {/* 2. Flashlight Strobe Glow Beam on Dynamic Island */}
      {hardwareControls.flashlight && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-1 px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black shadow-lg shadow-amber-400/50 animate-bounce">
          <Zap size={12} className="fill-current" />
          <span>ĐÈN FLASH ĐANG BẬT</span>
        </div>
      )}

      {/* 3. iOS Volume HUD Pill */}
      {showVolumeHud && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1 rounded-full shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          {hardwareControls.isMuted || hardwareControls.volume === 0 ? (
            <VolumeX size={14} className="text-rose-400" />
          ) : (
            <Volume2 size={14} className="text-blue-400" />
          )}
          <div className="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                hardwareControls.isMuted ? 'bg-rose-500' : 'bg-blue-400'
              }`}
              style={{ width: `${hardwareControls.isMuted ? 0 : hardwareControls.volume}%` }}
            />
          </div>
          <span className="text-[10px] font-bold">
            {hardwareControls.isMuted ? 'Mute' : `${hardwareControls.volume}%`}
          </span>
        </div>
      )}

      {/* 4. Active Voice Guide Toast */}
      {lastVoiceGuide && (
        <div className="absolute top-14 left-4 right-4 z-40 bg-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center space-x-2.5 animate-in fade-in">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Volume2 size={18} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider">Lời dặn từ Bố Mẹ:</span>
            <p className="text-xs font-semibold truncate leading-tight">{lastVoiceGuide}</p>
          </div>
        </div>
      )}

      {/* 5. Active Smart Reminder Banner */}
      {activeReminder && (
        <div className="absolute top-12 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border border-blue-200 p-3 rounded-2xl shadow-xl space-y-1.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              {activeReminder.type === 'hydration' ? (
                <Droplets size={16} className="text-sky-500" />
              ) : activeReminder.type === 'school' ? (
                <BookOpen size={16} className="text-blue-600" />
              ) : (
                <CheckCircle2 size={16} className="text-purple-600" />
              )}
              <span>{activeReminder.title}</span>
            </h4>
            <button
              onClick={clearReminder}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
            >
              Đã xong
            </button>
          </div>
          <p className="text-[11px] text-slate-600">{activeReminder.message}</p>
        </div>
      )}

      {/* Top Kid Header Bar - Cheerful Friendly Child Style */}
      <div className="bg-sky-500 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white px-4 pt-3.5 pb-3.5 shadow-md select-none rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={child.avatar}
                alt={child.name}
                className="w-12 h-12 rounded-2xl object-cover ring-3 ring-amber-300 shadow-md bg-white"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-xs animate-subtle-pulse"></span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] bg-white/20 backdrop-blur-md text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
                  <Smartphone size={10} />
                  <span>{pairedInfo?.deviceName || 'Thiết bị con'}</span>
                </span>
                <span className="text-[10px] bg-amber-400/90 text-amber-950 font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap shadow-xs">
                  🔥 7 Ngày
                </span>
              </div>
              <h2 className="text-base font-black text-white leading-tight truncate mt-1">
                Chào {pairedInfo?.childName || child.name}! 🌈
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Star Bank Counter (Click to switch to rewards tab) */}
            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 px-3 py-1.5 rounded-2xl shadow-md font-black text-xs transition active:scale-95 cursor-pointer border border-amber-300"
              title="Xem kho sao đổi quà"
            >
              <Star size={14} className="fill-amber-950 text-amber-950" />
              <span>{kidStars} sao</span>
            </button>

            {/* Quick Chat Button */}
            <button
              type="button"
              onClick={() => {
                setUnreadChatCount(0);
                setShowChatModal(true);
              }}
              className="relative w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-xs flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
              title="Nhắn tin với Bố Mẹ"
            >
              <MessageCircle size={18} strokeWidth={2.2} />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                  {unreadChatCount > 9 ? "9+" : unreadChatCount}
                </span>
              )}
            </button>

            {/* Prominent Quick SOS Button */}
            <button
              type="button"
              onClick={() => handleKidTriggerSOS('header')}
              className="px-2.5 py-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/80 shadow-sm flex items-center gap-1 font-black text-xs active:scale-90 transition-all cursor-pointer animate-subtle-pulse"
              title="Báo động cứu hộ khẩn cấp cho Bố Mẹ"
            >
              <AlertOctagon size={15} className="animate-bounce" />
              <span>SOS</span>
            </button>

            {/* Quick Hardware Controls Button */}
            <button
              type="button"
              onClick={() => setShowKidControlPanel(true)}
              className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-xs flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
              title="Cài đặt âm lượng & độ sáng màn hình"
            >
              <Sliders size={18} strokeWidth={2.2} />
            </button>

            {/* Debug Logs Button */}
            <button
              type="button"
              onClick={() => setShowDebugModal(true)}
              className="relative w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-xs flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
              title="Nhật ký truyền nhận & Gỡ lỗi đồng bộ"
            >
              <FileText size={18} strokeWidth={2.2} className={errorCount > 0 ? "text-rose-300" : "text-white"} />
              {errorCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black animate-pulse shadow-sm">
                  {errorCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SOS Banner if Active */}
      {activeSOS && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-pulse shadow-md">
          <div className="flex items-center space-x-2">
            <AlertOctagon size={18} />
            <span>TÍN HIỆU SOS ĐANG ĐƯỢC PHÁT ĐẾN BỐ MẸ!</span>
          </div>
          <span className="text-[10px] underline font-black">Vị trí GPS đang phát</span>
        </div>
      )}

      {/* KIOSK MODE PINNED VIEW (If active) */}
      {kioskMode.isEnabled ? (
        <div className="flex-1 flex flex-col p-4 bg-slate-900 text-white justify-between relative overflow-y-auto">
          <div className="p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-3xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pin size={18} className="text-amber-400 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-amber-300">Chế độ Ghim Kiosk Cưỡng Chế</h4>
                <p className="text-[10px] text-amber-200/80">Con đang trong giờ học tập tập trung</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] font-black rounded-lg uppercase">
              Đang ghim
            </span>
          </div>

          <div className="my-auto py-8 text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-blue-600 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl shadow-xl flex items-center justify-center text-4xl shadow-blue-500/30 ring-4 ring-white/10">
              {kioskMode.pinnedAppName?.charAt(0) || '📱'}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{kioskMode.pinnedAppName}</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                Bố/Mẹ đã ghim máy vào ứng dụng này để con tập trung học bài.
              </p>
            </div>
          </div>

          {/* Always Available Emergency Contact Bar in Kiosk Mode */}
          <div className="pt-2 space-y-2">
            <EmergencyContactBar
              parentPhone={targetSettings.emergencyContact?.parentPhone || '0987654321'}
              allowedApps={targetSettings.emergencyContact?.allowedApps}
              onOpenChat={() => setShowChatModal(true)}
              title="Cần liên hệ Bố Mẹ khi đang ghim ứng dụng:"
            />
          </div>
        </div>
      ) : (
        /* Dedicated Pages per Tab Navigation */
        <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-[max(84px,calc(68px+env(safe-area-inset-bottom)))]">
          {/* ===================== TAB 1: TRANG CHỦ & ỨNG DỤNG ===================== */}
          {activeTab === 'home' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Google Family Link Style: Smart Permissions Setup Card */}
              {hasMissingPermissions && (
                <div
                  onClick={() => setShowPermissionsScreen(true)}
                  className="bg-white border border-amber-200/90 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.985] cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-105 transition">
                      🛡️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-black text-slate-900 tracking-tight">
                          Hoàn tất thiết lập bảo vệ KidCare
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                          Cần thiết lập
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Kích hoạt đầy đủ các quyền để định vị GPS và quản lý thời gian chính xác nhất.
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Bấm để xem danh sách quyền
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPermissionsScreen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          Thiết lập ➔
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🦉 Mascot Companion Card - Emotional & Gamification Polish */}
              <div className="bg-emerald-50 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 rounded-3xl p-3.5 shadow-xs flex items-center gap-3.5 relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20 shrink-0">
                  🦉
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-emerald-100/90 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Bé Cú Thông Thái
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      Level {Math.floor(kidStars / 10) + 1} ⭐
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                    {kidTasks.filter((t) => !t.completed).length > 0
                      ? `Bé còn ${kidTasks.filter((t) => !t.completed).length} nhiệm vụ hôm nay để tích thêm sao đổi quà nè!`
                      : 'Hoan hô! Bé đã hoàn thành xuất sắc các nhiệm vụ hôm nay! 🎉'}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((kidStars % 10) / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-700 whitespace-nowrap">
                      {kidStars % 10}/10 sao thăng cấp
                    </span>
                  </div>
                </div>
              </div>

              {/* Screen Time Remaining Hero Card - Dynamic Adaptive Gradient */}
              {(() => {
                const totalLimit = targetSettings.screenTimeLimitMinutes || 135;
                const usedMins = screenTime.todayTotalMinutes || 0;
                const remainingMins = Math.max(0, totalLimit - usedMins);
                const remH = Math.floor(remainingMins / 60);
                const remM = remainingMins % 60;
                const remText = remainingMins > 0
                  ? `${remH > 0 ? `${remH}h ` : ''}${remM} phút`
                  : '0 phút (Hết giờ)';

                const usedH = Math.floor(usedMins / 60);
                const usedM = usedMins % 60;
                const usedText = `${usedH > 0 ? `${usedH}h ` : ''}${usedM}p`;

                const percentLeft = Math.min(100, Math.round((remainingMins / totalLimit) * 100));
                const isExhausted = remainingMins <= 0;
                const isWarning = remainingMins > 0 && remainingMins <= 20;

                return (
                  <div
                    className={`rounded-3xl p-4 text-white shadow-xl relative overflow-hidden transition-all duration-300 ${
                      isExhausted
                        ? 'bg-slate-900 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-800 shadow-slate-900/30'
                        : isWarning
                        ? 'bg-amber-600 bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 shadow-amber-600/30'
                        : 'bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 shadow-blue-500/25'
                    }`}
                  >
                    <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3 pointer-events-none">
                      <Clock size={130} />
                    </div>

                    {/* Top Row: Title and Status Badge */}
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xs font-bold text-blue-100 flex items-center gap-1.5">
                        <Clock size={15} />
                        <span>Thời gian giải trí tự do hôm nay</span>
                      </span>
                      <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                        {isExhausted ? '🛑 Đã hết giờ' : isWarning ? '⚠️ Sắp hết giờ' : '✅ Đang mở'}
                      </span>
                    </div>

                    {/* Middle Row: Big Remaining Time & Dual Alli360 Action Buttons */}
                    <div className="relative z-10 my-3">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <div>
                          <span className="text-[10.5px] text-blue-100/90 font-medium block">Con còn lại:</span>
                          <h1 className="text-3xl font-black tracking-tight">{remText}</h1>
                        </div>

                        {/* Quick Interactive Alli360 Action Buttons */}
                        <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                          <button
                            type="button"
                            onClick={() => {
                              haptics.light();
                              setShowChatModal(true);
                            }}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>Xin thêm giờ</span>
                            <span>🙋</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              haptics.selection();
                              setActiveTab('tasks');
                            }}
                            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-md flex items-center gap-1 border border-amber-300"
                          >
                            <span>Làm việc nhận giờ</span>
                            <span>🎯</span>
                          </button>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-black/25 h-3 rounded-full overflow-hidden p-0.5 mt-3 border border-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentLeft > 40 ? 'bg-emerald-400 shadow-sm' : percentLeft > 15 ? 'bg-amber-400' : 'bg-rose-400 animate-pulse'
                          }`}
                          style={{ width: `${percentLeft}%` }}
                        />
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="text-[10.5px] text-blue-100 mt-2 font-medium flex items-center justify-between">
                        <span>Đã dùng {usedText} / Giới hạn {Math.floor(totalLimit / 60)}h {totalLimit % 60}p</span>
                        <span className="font-bold bg-white/10 px-1.5 py-0.2 rounded-md">{percentLeft}% còn lại</span>
                      </div>
                    </div>

                    {/* Alli360 Category Transparency Banner */}
                    <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-blue-100/90 font-medium">
                      <span className="flex items-center gap-1">
                        <span>📚</span>
                        <span>Học tập & Gọi điện: Luôn mở</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>🎮</span>
                        <span>Game & Video: Đếm giờ</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 4 Quick Action Shortcuts */}
              <div className="grid grid-cols-4 gap-2.5">
                {/* 1. Permissions */}
                <button
                  type="button"
                  onClick={() => setShowPermissionsScreen(true)}
                  className="relative flex flex-col items-center p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-200 transition-all active:scale-92 text-center group cursor-pointer"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-2xs group-hover:scale-108 transition-all duration-200 ${
                      hasMissingPermissions
                        ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    <Shield size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">
                    {hasMissingPermissions ? 'Cần Quyền' : 'Quyền Bảo Vệ'}
                  </span>
                  {hasMissingPermissions && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs animate-bounce">
                      !
                    </span>
                  )}
                </button>

                {/* 2. Message Parents */}
                <button
                  type="button"
                  onClick={() => {
                    setUnreadChatCount(0);
                    setShowChatModal(true);
                  }}
                  className="relative flex flex-col items-center p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-200 transition-all active:scale-92 text-center group cursor-pointer"
                >
                  <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-2xs bg-blue-50 text-blue-600 border-blue-200 group-hover:scale-108 transition-all duration-200">
                    <MessageCircle size={20} strokeWidth={2} />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-md animate-bounce border-2 border-white">
                        {unreadChatCount > 9 ? "9+" : unreadChatCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">
                    Nhắn Bố Mẹ
                  </span>
                </button>

                {/* 3. Set KidCare as Home Launcher */}
                <button
                  type="button"
                  onClick={() => {
                    openHomeLauncherSettings();
                    showToast('📱 Đang mở cài đặt màn hình chính Launcher');
                  }}
                  className="relative flex flex-col items-center p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-200 transition-all active:scale-92 text-center group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-2xs bg-amber-50 text-amber-600 border-amber-200 group-hover:scale-108 transition-all duration-200">
                    <Home size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">
                    Đặt Launcher
                  </span>
                  {targetSettings.isLauncherEnabled && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                  )}
                </button>

                {/* 4. Pairing / Device Controls */}
                <button
                  type="button"
                  onClick={() => setShowKidControlPanel(true)}
                  className="flex flex-col items-center p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-200 transition-all active:scale-92 text-center group cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 border shadow-2xs bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:scale-108 transition-all duration-200">
                    <Sliders size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight">
                    Cài Đặt Máy
                  </span>
                </button>
              </div>

              {/* Launcher App Drawer & Safe Apps Section */}
              <div className="space-y-3 pt-2">
                {/* Header with Title, Count, Scan & View Toggle */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>Màn Hình Khởi Chạy (Launcher)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {filteredLauncherApps.length}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {realInstalledApps.length > 0
                          ? `Đã quét ${realInstalledApps.length} ứng dụng trên máy`
                          : 'Danh sách ứng dụng cài đặt'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Refresh / Rescan Button */}
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        loadInstalledApps();
                        showToast('🔄 Đang quét lại ứng dụng trên máy...');
                      }}
                      disabled={isScanningApps}
                      title="Quét lại ứng dụng trên máy"
                      className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-2xs active:scale-95 transition-all"
                    >
                      <RefreshCw size={14} className={isScanningApps ? 'animate-spin text-blue-500' : ''} />
                    </button>

                    {/* View Mode Toggle (Grid / List) */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          setAppViewMode('grid');
                        }}
                        className={`p-1 rounded-lg transition-all ${
                          appViewMode === 'grid'
                            ? 'bg-white text-blue-600 shadow-xs font-bold'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Chế độ Lưới"
                      >
                        <LayoutGrid size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          setAppViewMode('list');
                        }}
                        className={`p-1 rounded-lg transition-all ${
                          appViewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-xs font-bold'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Chế độ Danh sách"
                      >
                        <List size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Launcher Setup Alert if Not Enabled */}
                {!targetSettings?.isLauncherEnabled && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚀</span>
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold text-amber-900 block">Đặt KidCare làm Màn hình chính</span>
                        <span className="text-amber-700 text-[10px]">Tự động quay về đây khi bấm phím Home</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        openHomeLauncherSettings();
                        showToast('📱 Đang mở cài đặt màn hình chính Launcher');
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] shadow-xs active:scale-95 transition-all"
                    >
                      Cài đặt
                    </button>
                  </div>
                )}

                {/* Study Mode Notice */}
                {studyModeOnly && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2 flex items-center gap-2 text-amber-800 text-[11px] font-medium">
                    <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                    <span>Đang trong giờ học: Ứng dụng giải trí và mạng xã hội tạm thời bị khóa.</span>
                  </div>
                )}

                {/* Search & Category Filter Chips */}
                <div className="space-y-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={appSearchQuery}
                      onChange={(e) => setAppSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm ứng dụng..."
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
                    />
                    {appSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAppSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10.5px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setAppCategoryFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                        appCategoryFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Tất cả ({launcherApps.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setAppCategoryFilter('allowed');
                      }}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                        appCategoryFilter === 'allowed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Unlock size={11} />
                      Được phép
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setAppCategoryFilter('study');
                      }}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                        appCategoryFilter === 'study'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Star size={11} />
                      Học tập
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setAppCategoryFilter('blocked');
                      }}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${
                        appCategoryFilter === 'blocked'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Lock size={11} />
                      Đang khóa
                    </button>
                  </div>
                </div>

                {/* Empty State */}
                {filteredLauncherApps.length === 0 && (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-6 text-center space-y-2 animate-in fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Search size={22} />
                    </div>
                    <div className="text-xs font-bold text-slate-700">Không tìm thấy ứng dụng phù hợp</div>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Hãy thử tìm với từ khóa khác hoặc làm mới bộ lọc danh sách ứng dụng.
                    </p>
                    {(appSearchQuery || appCategoryFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppSearchQuery('');
                          setAppCategoryFilter('all');
                        }}
                        className="px-3 py-1 rounded-xl bg-blue-50 text-blue-600 font-bold text-[11px] hover:bg-blue-100 transition-colors"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                )}

                {/* Grid View */}
                {appViewMode === 'grid' && filteredLauncherApps.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                    {filteredLauncherApps.map((app) => {
                      const isBlocked = app.status === 'blocked' || (studyModeOnly && app.category !== 'study');
                      const categoryColors = {
                        study: 'from-amber-500 to-orange-400 text-white',
                        video: 'from-rose-500 to-red-400 text-white',
                        game: 'from-purple-500 to-indigo-400 text-white',
                        social: 'from-blue-500 to-sky-400 text-white',
                        browser: 'from-teal-500 to-emerald-400 text-white',
                        other: 'from-slate-600 to-slate-500 text-white',
                      }[app.category || 'other'];

                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handleAppClick(app)}
                          className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all active:scale-90 group cursor-pointer ${
                            isBlocked
                              ? 'bg-slate-100/90 border-slate-200/80 opacity-65 hover:opacity-85'
                              : 'bg-white border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300'
                          }`}
                        >
                          {/* App Icon: Base64 image from native PM or Fallback Gradient Box */}
                          <div className="relative">
                            {app.icon ? (
                              <img
                                src={app.icon}
                                alt={app.name}
                                className={`w-12 h-12 rounded-2xl object-contain drop-shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
                                  isBlocked ? 'grayscale-50' : ''
                                }`}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-2xs transition duration-200 bg-gradient-to-tr ${
                                  isBlocked ? 'bg-slate-300 text-slate-600' : categoryColors
                                } group-hover:scale-105`}
                              >
                                {app.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* Lock / Safe Badge */}
                            {isBlocked ? (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                                <Lock size={9} strokeWidth={2.5} />
                              </span>
                            ) : (
                              app.category === 'study' && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xs ring-2 ring-white">
                                  <Star size={9} strokeWidth={2.5} className="fill-current" />
                                </span>
                              )
                            )}
                          </div>

                          <span className="text-[10px] font-bold text-slate-800 mt-1.5 truncate w-full text-center leading-tight">
                            {app.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* List View */}
                {appViewMode === 'list' && filteredLauncherApps.length > 0 && (
                  <div className="space-y-2">
                    {filteredLauncherApps.map((app) => {
                      const isBlocked = app.status === 'blocked' || (studyModeOnly && app.category !== 'study');
                      const categoryLabels = {
                        study: 'Học tập ⭐',
                        video: 'Xem Video 🎬',
                        game: 'Trò chơi 🎮',
                        social: 'Mạng xã hội 💬',
                        browser: 'Trình duyệt 🌐',
                        other: 'Ứng dụng 📱',
                      }[app.category || 'other'];

                      return (
                        <div
                          key={app.id}
                          onClick={() => handleAppClick(app)}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isBlocked
                              ? 'bg-slate-100/70 border-slate-200/80 opacity-70 hover:opacity-90'
                              : 'bg-white border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {app.icon ? (
                              <img
                                src={app.icon}
                                alt={app.name}
                                className={`w-11 h-11 rounded-2xl object-contain drop-shadow-2xs shrink-0 ${
                                  isBlocked ? 'grayscale-50' : ''
                                }`}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shadow-2xs shrink-0 ${
                                  isBlocked
                                    ? 'bg-slate-300 text-slate-600'
                                    : 'bg-blue-500 bg-gradient-to-tr from-blue-500 to-sky-400 text-white'
                                }`}
                              >
                                {app.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{app.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 truncate">{categoryLabels}</span>
                                {app.packageName && (
                                  <span className="text-[9px] text-slate-300 truncate hidden sm:inline">
                                    • {app.packageName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                <Lock size={11} />
                                <span>Đang khóa</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAppClick(app);
                                }}
                                className="px-3 py-1 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 font-bold text-[10.5px] flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                              >
                                <ExternalLink size={11} />
                                <span>Mở app</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 2: NHIỆM VỤ TÍCH SAO ===================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Gamification Sub-Nav Switcher */}
              <div className="flex items-center bg-amber-100/90 p-1 rounded-2xl border border-amber-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-white text-amber-950 font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-600 fill-amber-500/20" />
                  <span>Nhiệm vụ ({kidTasks.filter(t => !t.completed).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className="flex-1 py-2 px-2.5 rounded-xl text-amber-800 hover:text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Gift size={14} />
                  <span>Kho quà tặng ({kidStars}⭐)</span>
                </button>
              </div>

              {/* Hero Tasks Banner */}
              <div className="bg-amber-500 bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3 pointer-events-none">
                  <Star size={130} />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-100 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Nhiệm Vụ Của Bé
                    </span>
                    <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-bold">
                      ⭐ Kho: {kidStars} sao
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Nhiệm Vụ Tích Sao 🌟</h2>
                  <p className="text-xs text-amber-100">
                    Bé chăm chỉ hoàn thành việc tốt để tích lũy sao đổi quà hấp dẫn nhé!
                  </p>

                  {/* Task Progress Bar */}
                  {(() => {
                    const total = kidTasks.length;
                    const done = kidTasks.filter((t) => t.completed).length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span>Tiến độ hoàn thành: {done}/{total}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Danh sách nhiệm vụ hôm nay:
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Bấm để đánh dấu hoàn thành
                  </span>
                </div>

                {kidTasks.length === 0 ? (
                  <div className="bg-white rounded-3xl p-6 text-center border border-slate-200/80 shadow-xs space-y-2">
                    <p className="text-3xl">🎉</p>
                    <h4 className="text-xs font-bold text-slate-700">Hôm nay không có nhiệm vụ nào!</h4>
                    <p className="text-[11px] text-slate-400">Bố mẹ sẽ giao thêm nhiệm vụ cho con sớm nhé.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kidTasks.map((task, idx) => (
                      <div
                        key={`${task.id}-${idx}`}
                        onClick={() => handleTaskCheck(task.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between active:scale-[0.98] ${
                          task.completed
                            ? 'bg-emerald-50/70 border-emerald-200 text-slate-600 shadow-2xs'
                            : 'bg-white border-slate-200/80 shadow-xs hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          <div
                            className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition shrink-0 ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {task.completed && <CheckCircle2 size={16} />}
                          </div>
                          <div className="min-w-0">
                            <h4
                              className={`text-xs font-bold truncate ${
                                task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {task.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">{task.subject}</span>
                          </div>
                        </div>

                        <span className="text-xs font-black text-amber-500 flex items-center gap-0.5 shrink-0 ml-2 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200">
                          +{task.stars} <Star size={13} className="fill-amber-500 inline" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 3: ĐỔI QUÀ THƯỞNG ===================== */}
          {activeTab === 'rewards' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Gamification Sub-Nav Switcher */}
              <div className="flex items-center bg-pink-100/90 p-1 rounded-2xl border border-pink-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="flex-1 py-2 px-2.5 rounded-xl text-pink-800 hover:text-pink-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Nhiệm vụ ({kidTasks.filter(t => !t.completed).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-white text-pink-950 font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Gift size={14} className="text-pink-600 fill-pink-500/20" />
                  <span>Kho quà tặng ({kidStars}⭐)</span>
                </button>
              </div>

              {/* Hero Rewards Banner */}
              <div className="bg-pink-600 bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 rounded-3xl p-5 text-white shadow-xl shadow-pink-500/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3 pointer-events-none">
                  <Gift size={130} />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-pink-100 flex items-center gap-1.5">
                      <Gift size={14} />
                      Cửa Hàng Quà Tặng
                    </span>
                    <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-bold">
                      Dành riêng cho bé
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Đổi Quà Thưởng 🎁</h2>
                  <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-white">
                    <Star size={14} className="fill-yellow-300 text-yellow-300" />
                    <span>Kho sao hiện tại: {kidStars} sao</span>
                  </div>
                  <p className="text-xs text-pink-100">
                    Bé có thể dùng sao kiếm được để đổi các phần quà yêu thích dưới đây!
                  </p>
                </div>
              </div>

              {/* Rewards Store Catalog */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800">Chọn phần quà muốn đổi:</span>

                <div className="space-y-2">
                  {(state.rewardsCatalog || [])
                    .filter((rew) => !rew.targetChildId || rew.targetChildId === 'all' || rew.targetChildId === targetChildId)
                    .map((rew) => {
                      const canAfford = kidStars >= rew.starsCost;
                      const isSpecificForMe = rew.targetChildId && rew.targetChildId !== 'all';
                      return (
                        <div
                          key={rew.id}
                          className={`bg-white p-3 rounded-2xl border shadow-xs flex items-center justify-between transition ${
                            isSpecificForMe
                              ? 'border-amber-200/90 bg-gradient-to-r from-amber-50/40 via-white to-white'
                              : 'border-slate-100 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 border shadow-2xs ${
                              isSpecificForMe
                                ? 'bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-600 border-amber-200'
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {rew.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">{rew.title}</h4>
                                {isSpecificForMe ? (
                                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold text-[8.5px] border border-amber-200/80 shrink-0">
                                    ⭐ Quà riêng của con
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium text-[8.5px] border border-slate-200 shrink-0">
                                    🌐 Kho chung
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{rew.description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleRedeemReward(rew.id)}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition shadow-xs flex items-center gap-1 active:scale-95 ${
                              canAfford
                                ? 'bg-amber-500 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-amber-500/20 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            <span>{rew.starsCost}</span>
                            <Star size={11} className={canAfford ? 'fill-white text-white' : 'fill-slate-400 text-slate-400'} />
                            <span>{canAfford ? 'Đổi' : `Thiếu ${rew.starsCost - kidStars}`}</span>
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Redemptions history */}
                {((targetSettings.redemptions && targetSettings.redemptions.length > 0) || (state.redemptions && state.redemptions.length > 0)) && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">🎁 Phiếu quà con đã đổi:</span>
                    <div className="space-y-1">
                      {((targetSettings.redemptions && targetSettings.redemptions.length > 0) ? targetSettings.redemptions : state.redemptions).slice(0, 3).map((rd, idx) => (
                        <div key={`${rd.id}-${idx}`} className="p-2 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span>{rd.icon}</span>
                            <span className="font-semibold text-emerald-900">{rd.rewardTitle}</span>
                          </div>
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                            {rd.status === 'completed' ? 'Đã nhận quà ✅' : 'Chờ bố mẹ trao ⏳'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== TAB 4: LỊCH TRÌNH & BÁO THỨC ===================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Hero Schedule Banner */}
              <div className="bg-teal-600 bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 rounded-3xl p-5 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-15 translate-x-3 translate-y-3 pointer-events-none">
                  <Clock size={130} />
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-100 flex items-center gap-1.5">
                      <Clock size={14} />
                      Thời Gian Biểu Của Bé
                    </span>
                    <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full font-bold">
                      {new Date().toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Lịch & Báo Thức ⏰</h2>
                  <p className="text-xs text-emerald-100">
                    Theo dõi các giờ học, giờ ngủ và sự kiện quan trọng bố mẹ đã lên lịch.
                  </p>
                </div>
              </div>

              {/* Today's Alarms */}
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-100">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                  ⏰ Báo thức của con
                </span>
                {alarms.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Bố mẹ chưa đặt báo thức</p>
                ) : (
                  <div className="space-y-1.5">
                    {alarms.map((alarm, i) => (
                      <div key={`${alarm.id}-${i}`} className={`flex items-center justify-between p-2 rounded-xl ${alarm.isEnabled ? 'bg-white border border-amber-200' : 'bg-gray-50 opacity-50'}`}>
                        <div>
                          <p className="text-xl font-bold text-gray-900">{alarm.time}</p>
                          <p className="text-xs text-gray-500">{alarm.label}</p>
                          {alarm.repeatDays.length > 0 && (
                            <p className="text-[10px] text-amber-600">
                              Lặp: {['CN','T2','T3','T4','T5','T6','T7'].filter((_, i) => alarm.repeatDays.includes(i)).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${alarm.isEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>
                          {alarm.isEnabled ? '✅ Bật' : '⏸ Tắt'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Running Timers */}
              {timers.filter(t => t.remainingSeconds > 0).length > 0 && (
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                    ⏱️ Đồng hồ đếm ngược
                  </span>
                  {timers.filter(t => t.remainingSeconds > 0).map((timer, i) => {
                    const pct = timer.totalSeconds > 0 ? (1 - timer.remainingSeconds / timer.totalSeconds) * 100 : 0;
                    const m = Math.floor(timer.remainingSeconds / 60);
                    const s = timer.remainingSeconds % 60;
                    return (
                      <div key={`${timer.id}-${i}`} className="bg-white rounded-xl p-3 mb-2 border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{timer.label}</span>
                          <span className="text-lg font-mono font-bold text-emerald-600">{m.toString().padStart(2,'0')}:{s.toString().padStart(2,'0')}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upcoming Events */}
              <div className="bg-blue-50 rounded-2xl p-3.5 border border-blue-100">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5 mb-2">
                  📅 Sự kiện sắp tới
                </span>
                {scheduleEvents.filter(e => !e.isCompleted).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Chưa có sự kiện nào</p>
                ) : (
                  <div className="space-y-1.5">
                    {scheduleEvents
                      .filter(e => !e.isCompleted)
                      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
                      .slice(0, 5)
                      .map((evt, i) => (
                        <div key={`${evt.id}-${i}`} className="bg-white rounded-xl p-2.5 flex items-start gap-2 border border-blue-100">
                          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: evt.color }} />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{evt.title}</p>
                            <p className="text-[10px] text-gray-500">
                              {evt.date === today ? '📍 Hôm nay' : evt.date} · {evt.time}
                            </p>
                            {evt.note && <p className="text-[10px] text-gray-400 mt-0.5">{evt.note}</p>}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Persistent 1-Tap SOS Emergency Button across all views */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleKidTriggerSOS('button')}
              className="w-full py-4 bg-red-600 bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm rounded-3xl shadow-xl shadow-rose-600/35 flex items-center justify-center space-x-2.5 transition-all active:scale-[0.97] ring-4 ring-rose-500/20 cursor-pointer"
            >
              <AlertOctagon size={24} className="animate-bounce" strokeWidth={2.5} />
              <span className="tracking-tight">SOS BÁO ĐỘNG KHẨN CẤP (BẤM KHI CẦN GIÚP ĐỠ)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Glass Dock - ParentPro Style */}
      {!kioskMode.isEnabled && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-2 pointer-events-none select-none bg-gradient-to-t from-sky-100/90 via-sky-50/40 to-transparent">
          <nav className="pointer-events-auto max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-full px-2 py-1.5 flex items-center justify-around shadow-[0_12px_35px_-5px_rgba(15,23,42,0.18)]">
            {[
              { id: 'home' as const, label: 'Ứng dụng', icon: Smartphone },
              { id: 'tasks' as const, label: 'Nhiệm vụ', icon: CheckCircle2, badge: kidTasks.filter(t => !t.completed).length },
              { id: 'rewards' as const, label: 'Đổi quà', icon: Gift },
              { id: 'schedule' as const, label: 'Lịch hẹn', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    haptics.light();
                    setActiveTab(tab.id);
                  }}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-full transition-all duration-200 active:scale-90 cursor-pointer ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/80 font-bold'
                      : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
                >
                  <div className="relative">
                    <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                    {Boolean(tab.badge && tab.badge > 0) && (
                      <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-subtle-pulse">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 tracking-tight transition-all duration-200 ${
                      isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* 7. NON-BLOCKING FLOATING NOTIFICATION BANNER (When parent broadcasts message) */}
      <KidNotificationBanner
        isVisible={Boolean(broadcastMessage?.isShowing && !isBroadcastDismissed)}
        title={broadcastMessage?.title || 'Lời dặn từ Bố Mẹ'}
        message={broadcastMessage?.message || ''}
        imageUrl={broadcastMessage?.imageUrl}
        timestamp={broadcastMessage?.timestamp}
        onDismiss={() => {
          setIsBroadcastDismissed(true);
          clearBroadcastOverlay();
          if (activeParentId && targetChildId) {
            clearRemoteCommand(activeParentId, targetChildId, child.name).catch(() => {});
          }
        }}
        onSpeak={() => {
          if (broadcastMessage?.message || broadcastMessage?.title) {
            speakVietnamese(broadcastMessage.message || broadcastMessage.title);
          }
        }}
        onReply={(replyText) => {
          sendKidResponseToParent(broadcastMessage?.title || 'Lời dặn từ Bố Mẹ', replyText);
          if (replyText.includes('5 phút') || replyText.includes('5p')) {
            requestTimeExtension('Thời gian dùng máy', 5, 'Con xin thêm 5 phút khi bố mẹ dặn');
          }
          showToast(`✅ Đã gửi phản hồi: "${replyText}"`);
        }}
      />

      {/* 8. INTERACTIVE LOCK CHALLENGE MODAL (Math, Quiz, Steps, Countdown, Mealtime, Bedtime) */}
      {(lockChallenge.isLocked || targetSettings.isLocked) && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md text-white p-6 flex flex-col justify-between animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Lock size={14} />
              <span>Thiết bị đang bị khóa</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>

          {/* Challenge Solvers */}
          <div className="my-auto py-4 space-y-4 text-center">
            {/* Math Challenge */}
            {lockChallenge.lockType === 'math' && lockChallenge.mathChallenge && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-600/20 text-blue-400 rounded-3xl flex items-center justify-center font-bold">
                  <Calculator size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description}</p>
                </div>

                <div className="p-4 bg-blue-900/30 border border-blue-500/40 rounded-2xl">
                  <span className="text-3xl font-black tracking-wider text-blue-300">
                    {lockChallenge.mathChallenge.question}
                  </span>
                </div>

                <div className="space-y-2">
                  <input
                    type="number"
                    value={mathInput}
                    onChange={(e) => setMathInput(e.target.value)}
                    placeholder="Nhập kết quả của con..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-center text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {mathError && (
                    <p className="text-xs text-rose-400 font-bold">Chưa đúng rồi! Con hãy tính lại nhé.</p>
                  )}
                  <button
                    onClick={handleCheckMath}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"
                  >
                    Kiểm tra kết quả để mở máy
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Challenge */}
            {lockChallenge.lockType === 'quiz' && lockChallenge.quizChallenge && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-600/20 text-purple-400 rounded-3xl flex items-center justify-center font-bold">
                  <HelpCircle size={36} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.quizChallenge.question}</p>
                </div>

                <div className="space-y-2">
                  {lockChallenge.quizChallenge.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectQuizOption(i)}
                      className={`w-full p-3 rounded-xl text-xs font-bold border text-left transition ${
                        quizSelected === i
                          ? i === lockChallenge.quizChallenge?.correctIndex
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-rose-600 text-white border-rose-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
                {quizError && (
                  <p className="text-xs text-rose-400 font-bold">Chưa chính xác, hãy thử lại đáp án khác!</p>
                )}
              </div>
            )}

            {/* Movement Challenge */}
            {lockChallenge.lockType === 'movement' && lockChallenge.movementChallenge && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-emerald-600/20 text-emerald-400 rounded-3xl flex items-center justify-center font-bold">
                  <Footprints size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description}</p>
                </div>

                <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl">
                  <div className="flex items-baseline justify-center space-x-2">
                    <span className="text-4xl font-black text-emerald-400">
                      {lockChallenge.movementChallenge.currentSteps}
                    </span>
                    <span className="text-lg text-slate-400 font-bold">
                      / {lockChallenge.movementChallenge.targetSteps} bước
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (lockChallenge.movementChallenge.currentSteps /
                            lockChallenge.movementChallenge.targetSteps) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => addStepsOnKid(10)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-95"
                >
                  <Footprints size={16} />
                  <span>Đi bộ / Lắc máy mô phỏng (+10 bước)</span>
                </button>
              </div>
            )}

            {/* Countdown Challenge */}
            {(lockChallenge.lockType === 'countdown' || lockChallenge.lockType === 'profanity' || lockChallenge.lockType === 'noise') && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-amber-600/20 text-amber-400 rounded-3xl flex items-center justify-center font-bold">
                  <Clock size={36} className="animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description}</p>
                </div>

                <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-2xl text-center">
                  <span className="text-4xl font-black text-amber-400 font-mono">
                    {Math.floor(countdownRemaining / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(countdownRemaining % 60).toString().padStart(2, '0')}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Đếm ngược tự động mở máy</p>
                </div>
              </div>
            )}

            {/* Mealtime Lock */}
            {lockChallenge.lockType === 'mealtime' && (
              <div className="space-y-4">
                <div className="text-6xl animate-bounce">🍚</div>
                <div>
                  <h3 className="text-2xl font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description}</p>
                </div>
              </div>
            )}

            {/* Bedtime Lock */}
            {lockChallenge.lockType === 'bedtime' && (
              <div className="space-y-4">
                <div className="text-6xl animate-pulse">🌙</div>
                <div>
                  <h3 className="text-2xl font-black text-white">{lockChallenge.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description}</p>
                </div>
              </div>
            )}

            {/* Instant Lock or Default Lock */}
            {(lockChallenge.lockType === 'instant' || !['math', 'quiz', 'movement', 'countdown', 'mealtime', 'bedtime'].includes(lockChallenge.lockType)) && (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-rose-600/20 text-rose-500 rounded-3xl flex items-center justify-center font-bold">
                  <Lock size={36} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{lockChallenge.title || 'Thiết bị đang bị khóa từ xa'}</h3>
                  <p className="text-xs text-slate-300 mt-1">{lockChallenge.description || 'Bố mẹ đã tạm khóa thiết bị. Con hãy nghỉ ngơi và liên hệ bố mẹ nhé!'}</p>
                </div>
              </div>
            )}
          </div>

                    {/* EmergencyContactBar on Remote Lock Challenge */}
          <div className="w-full max-w-sm mx-auto pt-3">
            <EmergencyContactBar
              parentPhone={targetSettings.emergencyContact?.parentPhone || '0987654321'}
              allowedApps={targetSettings.emergencyContact?.allowedApps}
              onOpenChat={() => setShowChatModal(true)}
              title="Cần liên hệ Bố Mẹ khi máy đang khóa:"
            />
          </div>

          <div className="text-center text-[11px] text-slate-500">
            Khóa an toàn ParentPro • Chỉ Bố Mẹ mới có quyền mở khóa trực tiếp
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-4 right-4 z-50 bg-slate-900/95 text-white text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Smart Locked App Modal */}
      {selectedBlockedApp && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Lock size={20} />
              </div>
              <button
                onClick={() => setSelectedBlockedApp(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ứng dụng {selectedBlockedApp} đang bị tạm khóa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Bố/Mẹ đã đặt giới hạn để con tập trung học tập và bảo vệ mắt. Con có thể gửi lời nhắn xin thêm 15 phút nhé!
              </p>
            </div>

            {requestSent ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-2xl text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>Đã gửi lời nhắn đến bố/mẹ thành công!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Lý do (VD: Con xem bài tập cô dặn...)"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => setSelectedBlockedApp(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Đóng lại
                  </button>
                  <button
                    onClick={submitTimeExtension}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 flex items-center justify-center space-x-1"
                  >
                    <Send size={14} />
                    <span>Xin bố mẹ 15 phút</span>
                  </button>
                </div>

            {/* Emergency Contact on Blocked App Modal */}
            <div className="pt-2">
              <EmergencyContactBar
                parentPhone={targetSettings.emergencyContact?.parentPhone || '0987654321'}
                allowedApps={targetSettings.emergencyContact?.allowedApps}
                onOpenChat={() => {
                  setSelectedBlockedApp(null);
                  setShowChatModal(true);
                }}
                title="Hoặc gọi cho Bố Mẹ ngay:"
              />
            </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. KID HARDWARE QUICK CONTROL MODAL / SHEET */}
      {showKidControlPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 border border-slate-100 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cài Đặt Thiết Bị Của Con</h3>
                  <p className="text-[10px] text-slate-500">Âm lượng & Độ sáng màn hình</p>
                </div>
              </div>
              <button
                onClick={() => setShowKidControlPanel(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* If Hardware is Locked by Parents */}
            {hardwareControls.isHardwareLocked ? (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Thiết Lập Phần Cứng Đang Bị Bố Mẹ Khóa!</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Bố mẹ đã cố định âm lượng ở mức {hardwareControls.volume}% và độ sáng ở mức {hardwareControls.brightness}% để con tập trung học tập.
                  </p>
                </div>

                {requestHwSent ? (
                  <div className="p-2.5 bg-white text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                    ✓ Đã gửi yêu cầu đến bố mẹ! Hãy đợi bố mẹ duyệt nhé.
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      requestChildHardwareAdjustment('Con xin phép tự chỉnh âm lượng để nghe video bài giảng ạ!', 15);
                      setRequestHwSent(true);
                      setTimeout(() => setRequestHwSent(false), 4000);
                      showToast('Đã gửi yêu cầu mở quyền đến điện thoại bố mẹ!');
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles size={14} />
                    <span>Xin phép bố mẹ mở quyền điều chỉnh (15 phút)</span>
                  </button>
                )}
              </div>
            ) : !hardwareControls.allowChildAdjustment ? (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Lock size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Bố Mẹ Chưa Cấp Quyền Tự Điều Chỉnh</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Con cần xin phép bố mẹ để được phép tự tăng giảm âm lượng và độ sáng.
                  </p>
                </div>

                {requestHwSent ? (
                  <div className="p-2.5 bg-white text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                    ✓ Đã gửi yêu cầu đến bố mẹ! Hãy đợi bố mẹ duyệt nhé.
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      requestChildHardwareAdjustment('Con xin phép bố mẹ mở quyền chỉnh âm lượng và độ sáng trong 15 phút ạ!', 15);
                      setRequestHwSent(true);
                      setTimeout(() => setRequestHwSent(false), 4000);
                      showToast('Đã gửi yêu cầu đến điện thoại bố mẹ!');
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles size={14} />
                    <span>Xin phép bố mẹ cấp quyền (15 phút)</span>
                  </button>
                )}
              </div>
            ) : (
              /* CHILD IS ALLOWED TO ADJUST HARDWARE */
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                  <ShieldCheck size={16} />
                  <span>Con được phép tự điều chỉnh trong giới hạn an toàn!</span>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center space-x-1.5">
                      <Volume2 size={16} className="text-blue-500" />
                      <span>Âm lượng của con</span>
                    </span>
                    <span className="text-blue-600 font-bold">{hardwareControls.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={hardwareControls.maxAllowedVolume || 75}
                    value={hardwareControls.volume}
                    onChange={(e) => setHardwareControls({ volume: Number(e.target.value), isMuted: false }, 'child')}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>0% (Im lặng)</span>
                    <span className="text-amber-600 font-bold">
                      Tối đa an toàn: {hardwareControls.maxAllowedVolume}%
                    </span>
                  </div>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center space-x-1.5">
                      <Sun size={16} className="text-amber-500" />
                      <span>Độ sáng màn hình</span>
                    </span>
                    <span className="text-amber-600 font-bold">{hardwareControls.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={hardwareControls.minAllowedBrightness || 25}
                    max="100"
                    value={hardwareControls.brightness}
                    onChange={(e) => setHardwareControls({ brightness: Number(e.target.value) }, 'child')}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="text-amber-600 font-bold">
                      Tối thiểu bảo vệ mắt: {hardwareControls.minAllowedBrightness}%
                    </span>
                    <span>100% (Sáng nhất)</span>
                  </div>
                </div>

                {/* Device Info & Unlink Option */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Smartphone size={14} className="text-blue-600" />
                      <span>Thiết bị hiện tại:</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                      Đang liên kết
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p><strong>Tên máy:</strong> {pairedInfo?.deviceName || 'Điện thoại của con'}</p>
                    <p><strong>Bé sở hữu:</strong> {pairedInfo?.childName || child.name}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">ID: {pairedInfo?.deviceId || 'Tự nhận diện'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnpairCurrentDevice}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Hủy liên kết / Đổi tài khoản máy này</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowKidControlPanel(false);
                    openHomeLauncherSettings();
                    showToast('📱 Đang mở cài đặt màn hình chính Launcher');
                  }}
                  className="w-full py-2.5 px-3 mb-2 bg-indigo-600 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold rounded-xl text-xs shadow-xs hover:from-indigo-600 hover:to-blue-700 flex items-center justify-center space-x-2 transition active:scale-95 cursor-pointer"
                >
                  <Home size={16} />
                  <span>Cài KidCare Làm Màn Hình Chính (Launcher)</span>
                </button>

                <button
                  onClick={() => setShowKidControlPanel(false)}
                  className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-xs hover:bg-blue-700 transition"
                >
                  Xác nhận & Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sensor Info Modal */}
      {showSensorInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl space-y-3.5 border border-slate-100 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-blue-600" />
                <span>Trạng Thái Cảm Biến Của Bé</span>
              </h3>
              <button
                onClick={() => setShowSensorInfoModal(null)}
                className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <ShieldCheck size={14} className={smartRoutines.profanityDetection ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>AI Kiểm Duyệt Ngôn Từ</span>
                  </span>
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-black ${
                    smartRoutines.profanityDetection ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {smartRoutines.profanityDetection ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {smartRoutines.profanityDetection
                    ? `Bố mẹ đã BẬT chức năng này để nhắc nhở con nói lời hay ý đẹp. Nếu vi phạm sẽ tạm khóa tĩnh tâm ${smartRoutines.profanityPenaltyMinutes || 10} phút.`
                    : 'Bố mẹ đang TẠM TẮT chức năng này trên máy của con.'}
                </p>
              </div>

              {/* Item 2 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Mic size={14} className={smartRoutines.noiseDetection ? 'text-amber-600' : 'text-slate-400'} />
                    <span>Cảm Biến Tiếng Ồn ({smartRoutines.noiseThresholdDb || 85}dB)</span>
                  </span>
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-black ${
                    smartRoutines.noiseDetection ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {smartRoutines.noiseDetection ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {smartRoutines.noiseDetection
                    ? `Bố mẹ đã BẬT cảm biến giám sát tiếng ồn vượt quá ${smartRoutines.noiseThresholdDb || 85}dB để bảo vệ thính giác và môi trường học tập yên tĩnh.`
                    : 'Bố mẹ đang TẠM TẮT cảm biến tiếng ồn trên máy của con.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSensorInfoModal(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Bài Học & Video Bố Mẹ Gửi Kèm Thời Gian Ép Buộc Xem */}
      {activeSharedLesson && (
        <SharedLessonViewerModal
          sharedLink={activeSharedLesson}
          parentPhone={targetSettings.emergencyContact?.parentPhone || '0987654321'}
          allowedEmergencyApps={targetSettings.emergencyContact?.allowedApps}
          onOpenChat={() => setShowChatModal(true)}
          onClose={() => {
            setActiveSharedLesson(null);
            showToast('🎉 Bé đã hoàn thành bài học của Bố Mẹ!');
          }}
          onRewardStars={(stars) => {
            showToast(`⭐ Bé nhận được +${stars} sao vì đã chăm chỉ xem bài học!`);
          }}
        />
      )}

      {/* MODAL: Ghép Đôi Thiết Bị Máy Con (Nhập PIN 6 số) */}
      {showPairModal && (
        <KidPairingModal
          onClose={() => setShowPairModal(false)}
          onPairedSuccess={(pName, cName) => {
            setPairedInfo(getKidDevicePairedInfo());
            showToast(`🎉 Đã kết nối thành công với ${pName}!`);
          }}
        />
      )}

      {/* MODAL: Nhắn Tin Trò Chuyện 2 Chiều với Cha Mẹ */}
      {showChatModal && (
        <FamilyChatModal
          currentRole="kid"
          childId={child.id}
          childName={child.name}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* MODAL: Tài Khoản Kết Nối & Tạo Mã Mới */}
      {showConnectedAccounts && (
        <ConnectedAccountsModal
          onClose={() => setShowConnectedAccounts(false)}
        />
      )}

      {/* MODAL: Chính Sách Quyền Riêng Tư & Bảo Mật */}
      <PrivacyPolicyModal
        isOpen={!isPrivacyAccepted || showPrivacyPolicy}
        role="kid"
        isViewOnly={isPrivacyAccepted && showPrivacyPolicy}
        onAccept={() => {
          setIsPrivacyAccepted(true);
          setShowPrivacyPolicy(false);
          showToast('✅ Đã đồng ý với Chính sách quyền riêng tư');
        }}
        onClose={() => setShowPrivacyPolicy(false)}
      />

      {/* MODAL: Nhật Ký Truyền Nhận Dữ Liệu & Gỡ Lỗi */}
      <DebugLogModal
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        childId={child.id}
        childName={child.name}
      />
    </div>
  );
};
