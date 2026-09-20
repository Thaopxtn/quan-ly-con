import { useState, useEffect } from 'react';
import {
  ChildProfile,
  ChildDeviceInfo,
  SafeZone,
  AppItem,
  ScreenTimeData,
  ContentFilterCategory,
  StudySubject,
  StudyExercise,
  HealthData,
  AlertNotification,
  FamilyMember,
  ConnectedDevice,
  RoutePoint,
  KidTask,
  TimeRequest,
  HardwareControls,
  HardwareScheduleProfile,
  KioskMode,
  BroadcastMessage,
  LockType,
  LockChallengeState,
  SmartRoutines,
  LiveMonitoring,
  ChildSpecificSettings,
  RewardItem,
  StarTransaction,
  RewardRedemption,
  ChildNotification,
  MediaPlaybackState,
  MediaControlCmd,
  NetworkInfo,
  SensorValues,
  ChildAlarm,
  ChildTimer,
  ChildScheduleEvent,
  EmergencyContactConfig,
  SharedLessonLink,
  TrackingCollectionConfig,
  DeviceTelemetryData,
  ChildPcAppRule,
  ChildPcControlConfig,
  ChildPcTelemetry,
} from './types';

export const DEFAULT_TRACKING_CONFIG: TrackingCollectionConfig = {
  isMasterTrackingEnabled: true,
  enableGpsTracking: true,
  enableSensorMonitoring: true,
  enableAppUsageTracking: true,
  enableScreenStateSync: true,
  enableNetworkMonitoring: true,
};
import {
  INITIAL_CHILD,
  INITIAL_CHILDREN,
  INITIAL_SAFE_ZONES,
  INITIAL_APPS,
  INITIAL_SCREEN_TIME,
  INITIAL_CONTENT_FILTERS,
  INITIAL_STUDY_SUBJECTS,
  INITIAL_EXERCISES,
  INITIAL_HEALTH,
  INITIAL_ALERTS,
  INITIAL_FAMILY,
  INITIAL_DEVICES,
  INITIAL_ROUTE,
  INITIAL_KID_TASKS,
  INITIAL_REWARDS_CATALOG,
  INITIAL_STAR_HISTORY,
  INITIAL_REDEMPTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_MEDIA_PLAYBACK,
  INITIAL_NETWORK_INFO,
  INITIAL_SENSOR_VALUES,
  INITIAL_ALARMS,
  INITIAL_TIMERS,
  INITIAL_SCHEDULE_EVENTS,
} from './mockData';
import { eventBus } from './eventBus';
import {
  triggerCloudSOS,
  resolveCloudSOS,
  clearAllFamilySosInCloud,
  subscribeCloudSOS,
  syncChildSettingsToCloud,
  subscribeChildSettingsFromCloud,
  syncChildStarsToCloud,
  subscribeChildStarsFromCloud,
  subscribeChildTelemetryFromCloud,
  sendRemoteCommandToKid,
  sendRemoteCommandAck,
  requestLatestDataFromAllChildren,
  subscribeCommandAck,
  subscribeRemoteCommandsOnKid,
  clearRemoteCommand,
  RemoteCommandType,
  CommandAckData,
  sendCloudTimeRequest,
  subscribeCloudTimeRequests,
  resolveCloudTimeRequest,
  subscribeCloudChatMessages,
  subscribeChildrenListFromCloud,
  fetchChildrenListFromCloud,
  saveChildProfileToCloud,
  deleteChildFromCloud,
  registerActiveChildInCloud,
  autoDiscoverMatchingChild,
  syncSafeZonesToCloud,
  subscribeSafeZonesFromCloud,
  sendCloudChatMessage,
  CloudChatMessage,
  sendRemotePcCommand,
  syncChildPcConfigToCloud,
  subscribeChildPcConfig,
  uploadChildPcTelemetry,
  subscribeChildPcTelemetry,
} from './firebase/cloudSyncService';
import { getCurrentParentAccount, getFirebaseInstance } from './firebase/firebaseService';
import { getKidDevicePairedInfo } from './firebase/pairingService';
import { isFirebaseConfigured } from './firebase/firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { showSystemNotification, playNotificationSound, NotificationSoundType } from './services/systemNotificationService';

export function isSimulatorMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  const search = window.location.search || '';
  return (
    search.includes('simulator') ||
    search.includes('mode=simulator') ||
    search.includes('mode=dual')
  );
}

export function isKidAppMode(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window as any).__APP_ROLE__ === 'kid') return true;
  if ((window as any).__APP_ROLE__ === 'parent') return false;
  if (window.location.pathname.includes('kid.html')) return true;
  if (window.location.pathname.includes('parent.html')) return false;
  const search = window.location.search || '';
  if (search.includes('mode=child') || search.includes('role=kid') || search.includes('app=kid')) return true;
  if (search.includes('mode=parent') || search.includes('role=parent') || search.includes('app=parent')) return false;
  if (Capacitor.isNativePlatform()) {
    const paired = getKidDevicePairedInfo();
    if (paired?.deviceId) return true;
  }
  return false;
}

export function getStorageKey(): string {
  if (isSimulatorMode()) return 'parent_pro_simulator_state_v2';
  if (isKidAppMode()) {
    const paired = getKidDevicePairedInfo();
    const devId = paired?.deviceId || 'kid_default';
    return `parent_pro_kid_state_${devId}_v3`;
  }
  return 'parent_pro_parent_state_v3';
}

export function getActiveParentId(): string {
  if (isKidAppMode()) {
    const paired = getKidDevicePairedInfo();
    if (paired?.parentId) return paired.parentId;
  }

  const parent = getCurrentParentAccount();
  if (parent?.uid) return parent.uid;

  const paired = getKidDevicePairedInfo();
  if (paired?.parentId) return paired.parentId;

  if (typeof window !== 'undefined') {
    let savedFam = localStorage.getItem('parent_pro_family_id');
    if (!savedFam || savedFam === 'family_primary') {
      savedFam = 'fam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem('parent_pro_family_id', savedFam);
      } catch (_) {}
    }
    return savedFam;
  }
  return 'fam_local_default';
}

export function getActiveChildId(defaultId: string = 'child_1'): string {
  const paired = getKidDevicePairedInfo();
  if (paired?.childId) return paired.childId;
  return defaultId;
}

export interface AppState {
  children: ChildProfile[];
  selectedChildId: string;
  childSettings: Record<string, ChildSpecificSettings>;

  child: ChildProfile; // Tương thích ngược với các màn hình hiện tại
  safeZones: SafeZone[];
  apps: AppItem[];
  screenTime: ScreenTimeData;
  contentFilters: ContentFilterCategory[];
  studySubjects: StudySubject[];
  exercises: StudyExercise[];
  health: HealthData;
  alerts: AlertNotification[];
  family: FamilyMember[];
  devices: ConnectedDevice[];
  routeHistory: RoutePoint[];
  kidTasks: KidTask[];
  kidStars: number;
  activeSOS: boolean;
  sosDetails?: { time: string; lat: number; lng: number; address: string; childId?: string; childName?: string };
  timeRequests: TimeRequest[];
  studyModeOnly: boolean;
  safeSearch: boolean;
  theme: 'light' | 'dark';
  isPremium?: boolean;
  premiumPlan?: 'monthly' | 'yearly';
  premiumExpiresAt?: string;

  // New Advanced Controls
  hardwareControls: HardwareControls;
  kioskMode: KioskMode;
  broadcastMessage: BroadcastMessage | null;
  lockChallenge: LockChallengeState;
  smartRoutines: SmartRoutines;
  liveMonitoring: LiveMonitoring;
  lastVoiceGuide?: string;
  activeReminder?: { type: 'hydration' | 'school' | 'todo'; title: string; message: string } | null;
  activeOpenedApp?: { id: string; name: string } | null;

  // Star & Rewards System
  rewardsCatalog: RewardItem[];
  starHistory: StarTransaction[];
  redemptions: RewardRedemption[];

  // Remote Command Delivery & Acknowledgment Tracking
  lastCommandAck?: CommandAckStatus | null;
}

export interface CommandAckStatus {
  id: string;
  command: string;
  commandTitle: string;
  status: 'pending' | 'received' | 'executed' | 'timeout' | 'failed';
  childId: string;
  childName: string;
  deviceName?: string;
  sentAt: number;
  executedAt?: number;
  detail?: string;
}

export const REMOTE_COMMAND_TITLES: Record<string, string> = {
  buzz_siren: 'Hú còi tìm máy khẩn cấp 🚨',
  lock_now: 'Khóa máy tức thì 🔒',
  unlock_now: 'Mở khóa thiết bị 🔓',
  extend_time: 'Gia hạn thêm thời gian ⏱️',
  kiosk_lock: 'Bật chế độ ghim học tập 📌',
  kiosk_unlock: 'Tắt chế độ ghim học tập 🔓',
  broadcast_msg: 'Phát thông điệp đè màn hình 📢',
  clear_broadcast: 'Tắt thông điệp đè ✕',
  flash_toggle: 'Bật/Tắt đèn Flash ⚡',
  hardware_control: 'Chỉnh âm lượng / độ sáng 🎛️',
  open_shared_link: 'Gửi bài học cho con 🎓',
  close_shared_link: 'Đóng bài học từ xa ✕',
  update_app_rule: 'Cập nhật phân loại ứng dụng 📲',
  update_app_limit: 'Cập nhật giới hạn dùng app ⏱️',
  ping: 'Kiểm tra kết nối tức thì 📡',
  sync_request: 'Đồng bộ dữ liệu mới nhất 🔄',
  media_control: 'Điều khiển media & âm nhạc 🎵',
  live_tracking_start: 'Bật định vị tốc độ cao 🛰️',
  live_tracking_stop: 'Tắt định vị tốc độ cao ⏹️',
};

export const DEFAULT_HARDWARE_SCHEDULES: HardwareScheduleProfile[] = [
  {
    id: 'sched_night',
    name: 'Chế độ ban đêm bảo vệ mắt',
    enabled: true,
    startTime: '21:30',
    endTime: '06:30',
    targetVolume: 0,
    targetBrightness: 20,
    isMuted: true,
    lockDuringSchedule: true,
  },
  {
    id: 'sched_study',
    name: 'Giờ học bài tập trung',
    enabled: false,
    startTime: '19:00',
    endTime: '20:30',
    targetVolume: 20,
    targetBrightness: 70,
    isMuted: false,
    lockDuringSchedule: true,
  },
];

export const DEFAULT_HARDWARE_CONTROLS: HardwareControls = {
  volume: 75,
  brightness: 85,
  isMuted: false,
  flashlight: false,
  isHardwareLocked: false,
  lockVolume: false,
  lockBrightness: false,
  maxAllowedVolume: 75,
  minAllowedBrightness: 25,
  allowChildAdjustment: true,
  childRequestedAdjustment: false,
  activeTimer: null,
  schedules: DEFAULT_HARDWARE_SCHEDULES,
};

export const DEFAULT_PC_APPS: ChildPcAppRule[] = [
  { id: 'roblox', name: 'Roblox Player', processName: 'RobloxPlayerBeta.exe', category: 'game', status: 'time_limited', dailyLimitMinutes: 45, icon: '🎮' },
  { id: 'minecraft', name: 'Minecraft', processName: 'javaw.exe', category: 'game', status: 'time_limited', dailyLimitMinutes: 60, icon: '⛏️' },
  { id: 'steam', name: 'Steam Client', processName: 'steam.exe', category: 'game', status: 'blocked', icon: '💨' },
  { id: 'league', name: 'Liên Minh Huyền Thoại', processName: 'LeagueClient.exe', category: 'game', status: 'blocked', icon: '⚔️' },
  { id: 'epic', name: 'Epic Games Launcher', processName: 'EpicGamesLauncher.exe', category: 'game', status: 'blocked', icon: '🎯' },
  { id: 'discord', name: 'Discord Chat', processName: 'Discord.exe', category: 'social', status: 'allowed', icon: '💬' },
  { id: 'chrome', name: 'Google Chrome', processName: 'chrome.exe', category: 'browser', status: 'allowed', icon: '🌐' },
  { id: 'coccoc', name: 'Trình duyệt Cốc Cốc', processName: 'browser.exe', category: 'browser', status: 'allowed', icon: '🟢' },
];

export const DEFAULT_PC_CONFIG: ChildPcControlConfig = {
  isLocked: false,
  lockReason: '',
  isStudyMode: false,
  dailyLimitMinutes: 120,
  curfewStart: '22:00',
  curfewEnd: '06:00',
  mealtimeLock: false,
  bedtimeLock: false,
  allowedWebsitesOnly: false,
  whitelistedWebsites: [
    'olm.vn',
    'vio.edu.vn',
    'shub.edu.vn',
    'zoom.us',
    'khanacademy.org',
    'hocmai.vn',
    'vietjack.com',
    'google.com',
    'wikipedia.org'
  ],
  blacklistedWebsites: [
    'facebook.com',
    'tiktok.com',
    'gamevui.vn',
    'roblox.com',
    'youtube.com'
  ],
  blockedApps: DEFAULT_PC_APPS,
  shutdownScheduledAt: null,
};

export const createDefaultChildSettings = (
  childId: string,
  overrides?: Partial<ChildSpecificSettings>
): ChildSpecificSettings => {
  if (childId === 'child_2') {
    // Bé Bình (7 tuổi - Lớp 2)
    return {
      screenTimeLimitMinutes: 60, // 1h
      apps: INITIAL_APPS.map(a =>
        ['app_youtube', 'app_chrome'].includes(a.id)
          ? { ...a, status: 'allowed' as const, dailyLimitMinutes: 30 }
          : { ...a, status: 'blocked' as const }
      ),
      screenTime: {
        todayTotalMinutes: 45,
        yesterdayTotalMinutes: 55,
        percentChangeVsYesterday: -18,
        hourlyUsage: [0, 0, 0, 0, 0, 0, 0, 10, 15, 5, 0, 0, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        weekTotalHours: 7.5,
        studyHours: 5.0,
        entertainmentHours: 2.5,
      },
      hardwareControls: {
        ...DEFAULT_HARDWARE_CONTROLS,
        volume: 60,
        brightness: 70,
        maxAllowedVolume: 65,
        minAllowedBrightness: 35,
        allowChildAdjustment: false,
        isHardwareLocked: true,
      },
      kioskMode: { isEnabled: false, pinnedAppId: null, pinnedAppName: null },
      lockChallenge: {
        isLocked: false,
        lockType: 'none',
        title: '',
        description: '',
        mathChallenge: { question: '7 + 5 = ?', answer: 12 },
        quizChallenge: {
          question: 'Con vật nào gáy báo sáng thức dậy?',
          options: ['Con Gà Trống', 'Con Chó', 'Con Mèo', 'Con Vịt'],
          correctIndex: 0,
        },
        movementChallenge: { currentSteps: 0, targetSteps: 30 },
        countdownChallenge: { initialSeconds: 180, remainingSeconds: 180 },
      },
      smartRoutines: {
        mealtimeLock: true,
        mealtimeStart: '11:30',
        mealtimeEnd: '12:30',
        bedtimeLock: true,
        bedtimeStart: '21:00',
        bedtimeEnd: '06:30',
        continuousLimitMinutes: 30,
        profanityDetection: true,
        profanityPenaltyMinutes: 15,
        noiseDetection: true,
        noiseThresholdDb: 80,
        hydrationReminder: true,
        schoolReminder: true,
      },
      kidTasks: [
        { id: 'tsk_b1', title: 'Tập viết chữ đẹp bài 5', subject: 'Tiếng Việt', stars: 5, completed: false, dueDate: 'Hôm nay' },
        { id: 'tsk_b2', title: 'Học thuộc bảng cộng 7', subject: 'Toán học', stars: 4, completed: true, dueDate: '17:00' },
        { id: 'tsk_b3', title: 'Uống 1 ly sữa tươi', subject: 'Sức khỏe', stars: 2, completed: true, dueDate: '19:30' },
      ],
      kidStars: 16,
      activeOpenedApp: null,
      activeReminder: null,
      lastVoiceGuide: '',
      pcConfig: DEFAULT_PC_CONFIG,
      ...overrides,
    };
  }

  if (childId === 'child_3') {
    // Bé Chi (14 tuổi - Lớp 8)
    return {
      screenTimeLimitMinutes: 180, // 3h
      apps: INITIAL_APPS.map(a =>
        a.id === 'app_game'
          ? { ...a, status: 'blocked' as const }
          : { ...a, status: 'allowed' as const, dailyLimitMinutes: 60 }
      ),
      screenTime: {
        todayTotalMinutes: 110,
        yesterdayTotalMinutes: 140,
        percentChangeVsYesterday: -21,
        hourlyUsage: [0, 0, 0, 0, 0, 0, 0, 20, 25, 10, 15, 10, 15, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        weekTotalHours: 21.0,
        studyHours: 12.0,
        entertainmentHours: 9.0,
      },
      hardwareControls: {
        ...DEFAULT_HARDWARE_CONTROLS,
        volume: 80,
        brightness: 90,
        maxAllowedVolume: 90,
        minAllowedBrightness: 20,
        allowChildAdjustment: true,
        isHardwareLocked: false,
      },
      kioskMode: { isEnabled: false, pinnedAppId: null, pinnedAppName: null },
      lockChallenge: {
        isLocked: false,
        lockType: 'none',
        title: '',
        description: '',
        mathChallenge: { question: '125 / 5 = ?', answer: 25 },
        quizChallenge: {
          question: 'Đơn vị đo cường độ dòng điện là gì?',
          options: ['Ampe (A)', 'Vôn (V)', 'Oát (W)', 'Ôm (Ω)'],
          correctIndex: 0,
        },
        movementChallenge: { currentSteps: 0, targetSteps: 80 },
        countdownChallenge: { initialSeconds: 300, remainingSeconds: 300 },
      },
      smartRoutines: {
        mealtimeLock: false,
        mealtimeStart: '12:00',
        mealtimeEnd: '13:00',
        bedtimeLock: true,
        bedtimeStart: '22:30',
        bedtimeEnd: '06:00',
        continuousLimitMinutes: 60,
        profanityDetection: true,
        profanityPenaltyMinutes: 5,
        noiseDetection: false,
        noiseThresholdDb: 90,
        hydrationReminder: true,
        schoolReminder: false,
      },
      kidTasks: [
        { id: 'tsk_c1', title: 'Làm đề cương Hình học HK1', subject: 'Toán học', stars: 5, completed: true, dueDate: 'Hôm nay' },
        { id: 'tsk_c2', title: 'Soạn bài Ngữ văn thuyết minh', subject: 'Ngữ văn', stars: 4, completed: false, dueDate: '21:00' },
      ],
      kidStars: 42,
      activeOpenedApp: null,
      activeReminder: null,
      lastVoiceGuide: '',
      pcConfig: DEFAULT_PC_CONFIG,
      ...overrides,
    };
  }

  // Default: child_1 (Bé An) or new child
  return {
    screenTimeLimitMinutes: 135,
    apps: INITIAL_APPS,
    screenTime: INITIAL_SCREEN_TIME,
    hardwareControls: DEFAULT_HARDWARE_CONTROLS,
    kioskMode: { isEnabled: false, pinnedAppId: null, pinnedAppName: null },
    lockChallenge: {
      isLocked: false,
      lockType: 'none',
      title: '',
      description: '',
      mathChallenge: { question: '38 + 27 = ?', answer: 65 },
      quizChallenge: {
        question: 'Thủ đô của Việt Nam là thành phố nào?',
        options: ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Huế'],
        correctIndex: 1,
        explanation: 'Hà Nội là thủ đô của nước CHXHCN Việt Nam.',
      },
      movementChallenge: { currentSteps: 0, targetSteps: 50 },
      countdownChallenge: { initialSeconds: 300, remainingSeconds: 300 },
    },
    smartRoutines: {
      mealtimeLock: false,
      mealtimeStart: '11:30',
      mealtimeEnd: '12:30',
      bedtimeLock: false,
      bedtimeStart: '21:30',
      bedtimeEnd: '06:30',
      continuousLimitMinutes: 45,
      profanityDetection: true,
      profanityPenaltyMinutes: 10,
      noiseDetection: true,
      noiseThresholdDb: 85,
      hydrationReminder: true,
      schoolReminder: true,
    },
    kidTasks: INITIAL_KID_TASKS,
    kidStars: 28,
    activeOpenedApp: null,
    activeReminder: null,
    lastVoiceGuide: '',
    notifications: INITIAL_NOTIFICATIONS,
    mediaPlayback: INITIAL_MEDIA_PLAYBACK,
    networkInfo: INITIAL_NETWORK_INFO,
    sensorValues: INITIAL_SENSOR_VALUES,
    alarms: INITIAL_ALARMS,
    timers: INITIAL_TIMERS,
    scheduleEvents: INITIAL_SCHEDULE_EVENTS,
    emergencyContact: {
      parentPhone: '0987654321',
      allowedApps: ['phone', 'sms', 'zalo', 'family_chat'],
    },
    isLauncherEnabled: false,
    activeSharedLink: null,
    trackingConfig: DEFAULT_TRACKING_CONFIG,
    pcConfig: DEFAULT_PC_CONFIG,
    ...overrides,
  };
};

function getInitialDemoState(): AppState {
  const initialChildren = INITIAL_CHILDREN;
  const initialChildSettings: Record<string, ChildSpecificSettings> = {
    child_1: createDefaultChildSettings('child_1'),
    child_2: createDefaultChildSettings('child_2'),
    child_3: createDefaultChildSettings('child_3'),
  };

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('parent_pro_simulator_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.children && parsed.selectedChildId && parsed.childSettings) {
          const hydratedChildren: ChildProfile[] = (parsed.children || initialChildren).map((c: any) => {
            const birthYear = c.birthYear || (c.id === 'child_2' ? 2019 : c.id === 'child_3' ? 2012 : 2016);
            const age = Math.max(1, 2026 - birthYear);
            return {
              ...c,
              birthYear,
              age,
            };
          });
          const activeChild = hydratedChildren.find((c: any) => c.id === parsed.selectedChildId) || hydratedChildren[0];
          const activeSettings = parsed.childSettings[activeChild.id] || initialChildSettings[activeChild.id] || initialChildSettings['child_1'];
          const rawRewards: any[] = parsed.rewardsCatalog || INITIAL_REWARDS_CATALOG;
          const hydratedRewards: RewardItem[] = rawRewards.map((r: any) => ({
            ...r,
            targetChildId: r.targetChildId || 'all',
            targetChildName: r.targetChildName || (r.targetChildId === 'child_1' ? 'Bé An' : r.targetChildId === 'child_2' ? 'Bé Bình' : r.targetChildId === 'child_3' ? 'Bé Chi' : 'Cả nhà'),
            isCustom: r.isCustom ?? (r.id.startsWith('rew_an') || r.id.startsWith('rew_binh') || r.id.includes('_custom')),
          }));
          INITIAL_REWARDS_CATALOG.forEach((initR) => {
            if (!hydratedRewards.some((hr) => hr.id === initR.id)) {
              hydratedRewards.push(initR);
            }
          });

          return {
            ...parsed,
            children: hydratedChildren,
            child: activeChild,
            rewardsCatalog: hydratedRewards,
            starHistory: parsed.starHistory || INITIAL_STAR_HISTORY,
            redemptions: parsed.redemptions || INITIAL_REDEMPTIONS,
            apps: activeSettings.apps || parsed.apps || INITIAL_APPS,
            screenTime: activeSettings.screenTime || parsed.screenTime || INITIAL_SCREEN_TIME,
            hardwareControls: {
              ...DEFAULT_HARDWARE_CONTROLS,
              ...(activeSettings.hardwareControls || parsed.hardwareControls || {}),
              schedules: activeSettings.hardwareControls?.schedules || parsed.hardwareControls?.schedules || DEFAULT_HARDWARE_SCHEDULES,
            },
            kioskMode: activeSettings.kioskMode || parsed.kioskMode || { isEnabled: false, pinnedAppId: null, pinnedAppName: null },
            lockChallenge: activeSettings.lockChallenge || parsed.lockChallenge || initialChildSettings['child_1'].lockChallenge,
            smartRoutines: {
              ...initialChildSettings['child_1'].smartRoutines,
              ...(activeSettings.smartRoutines || parsed.smartRoutines || {}),
            },
            kidTasks: activeSettings.kidTasks || parsed.kidTasks || INITIAL_KID_TASKS,
            kidStars: activeSettings.kidStars ?? parsed.kidStars ?? 28,
          };
        }
      } catch (e) {
        console.error('Failed to parse saved simulator state:', e);
      }
    }
  }

  const anSettings = initialChildSettings['child_1'];

  return {
    children: initialChildren,
    selectedChildId: 'child_1',
    childSettings: initialChildSettings,

    child: initialChildren[0],
    safeZones: INITIAL_SAFE_ZONES,
    apps: anSettings.apps,
    screenTime: anSettings.screenTime,
    contentFilters: INITIAL_CONTENT_FILTERS,
    studySubjects: INITIAL_STUDY_SUBJECTS,
    exercises: INITIAL_EXERCISES,
    health: INITIAL_HEALTH,
    alerts: INITIAL_ALERTS,
    family: INITIAL_FAMILY,
    devices: INITIAL_DEVICES,
    routeHistory: INITIAL_ROUTE,
    kidTasks: anSettings.kidTasks,
    kidStars: anSettings.kidStars,
    activeSOS: false,
    timeRequests: [
      {
        id: 'req_1',
        childName: 'Bé An',
        appName: 'TikTok',
        requestedMinutes: 15,
        reason: 'Con muốn xem video nhảy bài thể dục cô giáo dặn ạ',
        status: 'pending',
        time: '11:15',
      },
    ],
    studyModeOnly: false,
    safeSearch: true,
    theme: 'light',
    isPremium: false,

    // New Advanced Controls Defaults
    hardwareControls: anSettings.hardwareControls,
    kioskMode: anSettings.kioskMode,
    broadcastMessage: null,
    lockChallenge: anSettings.lockChallenge,
    smartRoutines: anSettings.smartRoutines,
    liveMonitoring: {
      screenMirroring: false,
      cameraActive: false,
      cameraFacing: 'front',
    },
    lastVoiceGuide: '',
    activeReminder: null,
    activeOpenedApp: null,

    // Star & Rewards Defaults
    rewardsCatalog: INITIAL_REWARDS_CATALOG,
    starHistory: INITIAL_STAR_HISTORY,
    redemptions: INITIAL_REDEMPTIONS,
    lastCommandAck: null,
  };
}

function getInitialRealState(): AppState {
  const currentParent = getCurrentParentAccount();
  const realFamily: FamilyMember[] = currentParent
    ? [
        {
          id: currentParent.uid,
          name: currentParent.displayName || currentParent.email?.split('@')[0] || 'Phụ Huynh',
          role: 'Chủ tài khoản (Admin)',
          email: currentParent.email,
          avatar:
            currentParent.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          isCurrentUser: true,
        },
      ]
    : [];

  const emptyChildPlaceholder: ChildProfile = {
    id: '',
    name: 'Chưa có thiết bị con',
    grade: 'Lớp 1',
    school: '',
    age: 0,
    birthYear: new Date().getFullYear(),
    avatar: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150',
    status: 'offline',
    battery: 0,
    speed: 0,
    currentAddress: 'Chưa kết nối thiết bị',
    lat: 10.762622,
    lng: 106.682245,
    lastUpdated: '--:--',
  };

  const defaultRealState: AppState = {
    children: [],
    selectedChildId: '',
    childSettings: {},
    child: emptyChildPlaceholder,
    safeZones: [],
    apps: [],
    screenTime: {
      todayTotalMinutes: 0,
      yesterdayTotalMinutes: 0,
      percentChangeVsYesterday: 0,
      hourlyUsage: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      weekTotalHours: 0,
      studyHours: 0,
      entertainmentHours: 0,
    },
    contentFilters: INITIAL_CONTENT_FILTERS,
    studySubjects: [],
    exercises: [],
    health: {
      steps: 0,
      stepGoal: 6000,
      activeMinutes: 0,
      activeGoalMinutes: 60,
      heartRate: 0,
      sleepHours: 0,
      sleepMinutes: 0,
      aiSuggestion: '',
    },
    alerts: [],
    family: realFamily,
    devices: [],
    routeHistory: [],
    kidTasks: [],
    kidStars: 0,
    activeSOS: false,
    timeRequests: [],
    studyModeOnly: false,
    safeSearch: true,
    theme: 'light',
    hardwareControls: DEFAULT_HARDWARE_CONTROLS,
    kioskMode: { isEnabled: false, pinnedAppId: null, pinnedAppName: null },
    broadcastMessage: null,
    lockChallenge: {
      isLocked: false,
      lockType: 'none',
      title: '',
      description: '',
      mathChallenge: { question: '', answer: 0 },
      quizChallenge: { question: '', options: [], correctIndex: 0, explanation: '' },
      movementChallenge: { currentSteps: 0, targetSteps: 50 },
      countdownChallenge: { initialSeconds: 300, remainingSeconds: 300 },
    },
    smartRoutines: {
      mealtimeLock: false,
      mealtimeStart: '11:30',
      mealtimeEnd: '12:30',
      bedtimeLock: false,
      bedtimeStart: '21:30',
      bedtimeEnd: '06:30',
      continuousLimitMinutes: 45,
      profanityDetection: true,
      profanityPenaltyMinutes: 10,
      noiseDetection: true,
      noiseThresholdDb: 85,
      hydrationReminder: true,
      schoolReminder: true,
    },
    liveMonitoring: {
      screenMirroring: false,
      cameraActive: false,
      cameraFacing: 'front',
    },
    lastVoiceGuide: '',
    activeReminder: null,
    activeOpenedApp: null,
    rewardsCatalog: [],
    starHistory: [],
    redemptions: [],
    lastCommandAck: null,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('parent_pro_state_v2');
    } catch (e) {}

    const currentKey = getStorageKey();
    const saved =
      localStorage.getItem(currentKey) ||
      (!isKidAppMode()
        ? localStorage.getItem('parent_pro_parent_state_v3') || localStorage.getItem('parent_pro_real_state_v1')
        : null);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const realChildren: ChildProfile[] = parsed.children && parsed.children.length > 0
          ? parsed.children
          : defaultRealState.children;

        const activeChild =
          realChildren.find((c: any) => c.id === parsed.selectedChildId) ||
          realChildren[0] ||
          parsed.child ||
          emptyChildPlaceholder;

        return {
          ...defaultRealState,
          ...parsed,
          activeSOS: false,
          broadcastMessage: null,
          activeReminder: null,
          children: realChildren,
          child: activeChild,
          selectedChildId: realChildren.length > 0 ? (parsed.selectedChildId || realChildren[0].id) : defaultRealState.selectedChildId,
          family: (parsed.family && parsed.family.length > 0) ? parsed.family : defaultRealState.family,
          alerts: parsed.alerts || [],
          timeRequests: parsed.timeRequests || [],
        };
      } catch (e) {
        console.error('Failed to parse real saved state:', e);
      }
    }
  }

  return defaultRealState;
}

function getInitialState(): AppState {
  if (isSimulatorMode()) {
    return getInitialDemoState();
  }
  return getInitialRealState();
}

let globalState: AppState = getInitialState();
const listeners = new Set<(state: AppState) => void>();
let isApplyingCloudUpdate = false;

function applyCloudStateUpdate(updater: (prev: AppState) => AppState) {
  isApplyingCloudUpdate = true;
  try {
    const nextState = updater(globalState);
    globalState = nextState;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(nextState));
      } catch (e) {}
    }
    listeners.forEach((fn) => fn(globalState));
  } finally {
    isApplyingCloudUpdate = false;
  }
}

function saveAndNotify(newState: AppState, targetChildId?: string) {
  const curId = targetChildId || newState.selectedChildId || (newState.children[0]?.id) || 'child_default';
  const curSettings = newState.childSettings?.[curId] || createDefaultChildSettings(curId);
  const curStars = curSettings.kidStars !== undefined ? curSettings.kidStars : (newState.kidStars ?? 0);
  const curTasks = curSettings.kidTasks ?? newState.kidTasks ?? [];
  const curStarHistory = curSettings.starHistory ?? newState.starHistory ?? [];
  const curRedemptions = curSettings.redemptions ?? newState.redemptions ?? [];
  const isCurrentChild = !targetChildId || targetChildId === newState.selectedChildId;

  const updatedChildSettings = {
    ...(newState.childSettings || {}),
    [curId]: {
      ...curSettings,
      screenTimeLimitMinutes: curSettings.screenTimeLimitMinutes ?? 135,
      apps: curSettings.apps || (isCurrentChild ? newState.apps : createDefaultChildSettings(curId).apps),
      screenTime: curSettings.screenTime || (isCurrentChild ? newState.screenTime : createDefaultChildSettings(curId).screenTime),
      hardwareControls: curSettings.hardwareControls || (isCurrentChild ? newState.hardwareControls : createDefaultChildSettings(curId).hardwareControls),
      kioskMode: curSettings.kioskMode || (isCurrentChild ? newState.kioskMode : createDefaultChildSettings(curId).kioskMode),
      lockChallenge: curSettings.lockChallenge || (isCurrentChild ? newState.lockChallenge : createDefaultChildSettings(curId).lockChallenge),
      smartRoutines: curSettings.smartRoutines || (isCurrentChild ? newState.smartRoutines : createDefaultChildSettings(curId).smartRoutines),
      kidTasks: curTasks,
      kidStars: curStars,
      starHistory: curStarHistory,
      redemptions: curRedemptions,
      activeOpenedApp: isCurrentChild ? (newState.activeOpenedApp ?? null) : (curSettings.activeOpenedApp ?? null),
      activeReminder: isCurrentChild ? (newState.activeReminder ?? null) : (curSettings.activeReminder ?? null),
      lastVoiceGuide: isCurrentChild ? (newState.lastVoiceGuide ?? '') : (curSettings.lastVoiceGuide ?? ''),
      broadcastMessage: isCurrentChild ? (newState.broadcastMessage ?? null) : (curSettings.broadcastMessage ?? null),
      isLocked: curSettings.lockChallenge?.isLocked ?? (isCurrentChild ? (newState.lockChallenge?.isLocked ?? false) : false),
      safeZones: curSettings.safeZones ?? newState.safeZones,
    }
  };
  newState.childSettings = updatedChildSettings;
  if (isCurrentChild) {
    newState.kidStars = curStars;
    newState.kidTasks = curTasks;
    newState.starHistory = curStarHistory;
    newState.redemptions = curRedemptions;
  }
  globalState = newState;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(newState));
      // PHÂN LUỒNG RÕ RÀNG: Chỉ ứng dụng Phụ huynh mới được đồng bộ cấu hình cài đặt (Settings, Giới hạn giờ) lên Cloud.
      // Ứng dụng Con CHỈ gửi số liệu thời gian đã dùng (Telemetry), KHÔNG ĐƯỢC ghi đè cài đặt của cha mẹ lên Cloud!
      if (!isApplyingCloudUpdate && !isKidAppMode()) {
        const activeParentId = getActiveParentId();
        const stripUsedTime = (settings: ChildSpecificSettings) => {
          const clone = { ...settings };
          if (clone.screenTime) {
            clone.screenTime = { ...clone.screenTime, todayTotalMinutes: undefined as any };
          }
          return clone;
        };

        if (curId && curId !== 'child_default') {
          const curChild = newState.children.find((c) => c.id === curId) || newState.child;
          syncChildSettingsToCloud(activeParentId, curId, stripUsedTime(updatedChildSettings[curId]), curChild?.name).catch(() => {});
          if (curChild) {
            registerActiveChildInCloud(activeParentId, curChild).catch(() => {});
          }
        }
        if (targetChildId && targetChildId !== curId && updatedChildSettings[targetChildId]) {
          const tChild = newState.children.find((c) => c.id === targetChildId);
          syncChildSettingsToCloud(activeParentId, targetChildId, stripUsedTime(updatedChildSettings[targetChildId]), tChild?.name).catch(() => {});
        }
      }
    } catch (e) {
      // ignore
    }
  }
  listeners.forEach((fn) => fn(globalState));
}

// Active Firestore & Realtime Subscriptions Management
const activeParentChildUnsubs = new Map<string, Array<() => void>>();
let activeGlobalParentUnsubs: Array<() => void> = [];
let activeKidUnsubs: Array<() => void> = [];
let currentSubscribedParentId = '';

// Timestamp tracking to debounce repeated alert notifications
const lastHandledSosByChild: Record<string, number> = {};
const lastBatteryAlertByChild: Record<string, number> = {};
const lastChatAlertByChild: Record<string, number> = {};

// Timestamp of the last dismissed SOS to prevent zombie/stale alert resurrection
let dismissedSosTimestamp = typeof window !== 'undefined'
  ? parseInt(localStorage.getItem('parentpro_dismissed_sos_time') || '0', 10) || 0
  : 0;

// Debounce timestamp for triggerSOS to avoid multiple triggers on rapid clicks
let lastTriggerSosCallTimestamp = 0;

function getSosTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  const parsed = Date.parse(val);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Multi-Child Real-Time Cloud Subscription Manager
 * Subscribes to SOS, telemetry, time requests, chat, stars, and settings
 * for ALL connected children simultaneously.
 */
export function syncParentWithAllChildren(parentId: string, children: ChildProfile[]) {
  if (typeof window === 'undefined' || !parentId || isKidAppMode()) return;

  // If parent account changed, clear all previous child subscriptions
  if (currentSubscribedParentId && currentSubscribedParentId !== parentId) {
    activeParentChildUnsubs.forEach((unsubs) => {
      unsubs.forEach((u) => { try { u(); } catch (_) {} });
    });
    activeParentChildUnsubs.clear();
  }
  currentSubscribedParentId = parentId;

  const currentChildIds = new Set(children.map((c) => c.id).filter(Boolean));

  // 1. Unsubscribe children that are no longer in the profile list
  for (const [subscribedChildId, unsubs] of activeParentChildUnsubs.entries()) {
    if (!currentChildIds.has(subscribedChildId)) {
      unsubs.forEach((u) => { try { u(); } catch (_) {} });
      activeParentChildUnsubs.delete(subscribedChildId);
    }
  }

  // 2. Subscribe each child that doesn't have active subscriptions yet
  children.forEach((child) => {
    if (!child.id || activeParentChildUnsubs.has(child.id)) {
      return;
    }

    const childId = child.id;
    const childName = child.name;
    const childUnsubs: Array<() => void> = [];

    // Register active child in cloud metadata
    registerActiveChildInCloud(parentId, child).catch(() => {});

    // --- (A) SOS Listener for this child ---
    const unsubSOS = subscribeCloudSOS(parentId, childId, (sosData) => {
      if (sosData && sosData.active) {
        const sosTimeMs = getSosTimeMs(sosData.updatedAt) || Date.now();
        if (dismissedSosTimestamp && sosTimeMs <= dismissedSosTimestamp) {
          return;
        }
        const targetChild = globalState.children.find((k) => k.id === childId) || child;
        const sosChildName = sosData.childName || targetChild.name || 'Con';
        const sosInfo = {
          time: sosData.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          lat: sosData.lat || targetChild.lat || 10.762622,
          lng: sosData.lng || targetChild.lng || 106.682245,
          address: sosData.address || targetChild.currentAddress || 'Đang cập nhật vị trí...',
          childId: childId,
          childName: sosChildName,
        };

        const wasActive = globalState.activeSOS;
        const now = Date.now();
        const isRecent = now - (lastHandledSosByChild[childId] || 0) < 15000;

        const alertId = `sos_${childId}_${Math.floor(now / 15000)}`;
        const newAlert: AlertNotification = {
          id: alertId,
          type: 'sos',
          title: `🚨 KHẨN CẤP: Bé ${sosChildName} vừa bấm SOS!`,
          message: `Vị trí tại: ${sosInfo.address}. Con cần trợ giúp khẩn cấp!`,
          time: sosInfo.time,
          isRead: false,
          priority: 'urgent',
          childId: childId,
          childName: sosChildName,
          details: 'Con cần sự trợ giúp ngay lập tức!',
          imageUrl: '🚨',
        };

        applyCloudStateUpdate((prev) => {
          const alreadyHasAlert = prev.alerts.some(
            (a) => a.id === alertId || (a.type === 'sos' && a.childId === childId && !a.isRead)
          );
          return {
            ...prev,
            activeSOS: true,
            sosDetails: sosInfo,
            alerts: alreadyHasAlert ? prev.alerts : [newAlert, ...prev.alerts],
          };
        });

        if (!wasActive || !isRecent) {
          lastHandledSosByChild[childId] = now;
          eventBus.publish('SOS_TRIGGERED', sosInfo, 'child');
          const isGeofenceAlert = (sosInfo.address || '').includes('vùng an toàn');
          showSystemNotification(
            isGeofenceAlert ? `⚠️ CẢNH BÁO: Bé ${sosChildName} ra khỏi vùng an toàn!` : `🚨 KHẨN CẤP: Bé ${sosChildName} nhấn SOS!`,
            {
              body: isGeofenceAlert ? `${sosInfo.address}. Nhấn để xem định vị ngay!` : `Vị trí: ${sosInfo.address}. Nhấn để mở ứng dụng ngay!`,
              soundType: isGeofenceAlert ? 'warning' : 'emergency',
              tag: `sos_${childId}`,
            }
          );
        }
      } else if (sosData && sosData.active === false && globalState.activeSOS) {
        if (globalState.sosDetails?.childId === childId || !globalState.sosDetails?.childId) {
          lastHandledSosByChild[childId] = 0;
          applyCloudStateUpdate((prev) => ({
            ...prev,
            activeSOS: false,
          }));
          eventBus.publish('SOS_CANCELLED', { childId, childName }, 'parent');
        }
      }
    }, childName);
    childUnsubs.push(unsubSOS);

    // --- (B) Telemetry & Battery & GPS Listener for this child ---
    const unsubTelemetry = subscribeChildTelemetryFromCloud(parentId, childId, (telemetry) => {
      if (telemetry && (telemetry.lat || telemetry.battery !== undefined)) {
        const targetChild = globalState.children.find((k) => k.id === childId) || child;
        const currentChildName = telemetry.childName || targetChild.name;

        // Check for Low Battery Alert (< 15% and > 0)
        let newBatteryAlert: AlertNotification | null = null;
        const bat = telemetry.battery;
        if (bat !== undefined && bat > 0 && bat <= 15) {
          const lastBatAlert = lastBatteryAlertByChild[childId] || 0;
          const now = Date.now();
          if (now - lastBatAlert > 15 * 60 * 1000) {
            lastBatteryAlertByChild[childId] = now;
            newBatteryAlert = {
              id: `bat_${childId}_${now}`,
              type: 'battery',
              title: `🪫 Pin yếu: Thiết bị Bé ${currentChildName} chỉ còn ${bat}%`,
              message: `Pin của Bé ${currentChildName} sắp hết (${bat}%). Hãy nhắc con sạc pin để duy trì kết nối an toàn!`,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              isRead: false,
              priority: 'high',
              childId: childId,
              childName: currentChildName,
              imageUrl: '🪫',
            };
            showSystemNotification(`🪫 Pin yếu: Bé ${currentChildName} (${bat}%)`, {
              body: `Pin thiết bị của con sắp cạn. Hãy nhắc con cắm sạc!`,
              soundType: 'warning',
              tag: `bat_${childId}`,
            });
          }
        }

        applyCloudStateUpdate((prev) => {
          const updatedChildren = prev.children.map((c) => {
            if (c.id === childId) {
              let updatedDevices = c.devices ? [...c.devices] : [];
              if (telemetry.deviceId) {
                const devIdx = updatedDevices.findIndex(d => (d.deviceId === telemetry.deviceId || d.id === telemetry.deviceId));
                const baseDev = devIdx >= 0 ? updatedDevices[devIdx] : null;
                const newDevData: ChildDeviceInfo = {
                  deviceId: telemetry.deviceId,
                  id: telemetry.deviceId,
                  deviceName: telemetry.deviceName || baseDev?.deviceName || 'Thiết bị của con',
                  model: telemetry.model || baseDev?.model || 'Android Device',
                  osVersion: baseDev?.osVersion || 'Android',
                  pairedAt: baseDev?.pairedAt || new Date().toISOString(),
                  lat: telemetry.lat ?? baseDev?.lat ?? c.lat,
                  lng: telemetry.lng ?? baseDev?.lng ?? c.lng,
                  battery: telemetry.battery ?? baseDev?.battery ?? c.battery,
                  speed: telemetry.speed ?? baseDev?.speed ?? c.speed,
                  currentAddress: telemetry.currentAddress ?? baseDev?.currentAddress ?? c.currentAddress,
                  isScreenOn: telemetry.isScreenOn ?? baseDev?.isScreenOn ?? c.isScreenOn,
                  screenState: telemetry.screenState ?? baseDev?.screenState ?? c.screenState,
                  appStatus: telemetry.appStatus ?? baseDev?.appStatus ?? c.appStatus,
                  lastActive: new Date().toISOString(),
                  status: 'online',
                  telemetry: {
                    deviceId: telemetry.deviceId,
                    lat: telemetry.lat ?? c.lat,
                    lng: telemetry.lng ?? c.lng,
                    accuracy: telemetry.accuracy ?? 12,
                    speed: telemetry.speed ?? c.speed,
                    battery: telemetry.battery ?? c.battery,
                    currentAddress: telemetry.currentAddress ?? c.currentAddress,
                    isScreenOn: telemetry.isScreenOn ?? c.isScreenOn,
                    screenState: telemetry.screenState ?? c.screenState,
                    appStatus: telemetry.appStatus ?? c.appStatus,
                    syncMode: telemetry.syncMode ?? c.syncMode,
                    activeOpenedApp: telemetry.activeOpenedApp,
                    screenTimeUsedMinutes: telemetry.screenTimeUsedMinutes,
                    sensors: telemetry.sensors,
                    network: telemetry.network,
                    lastActive: new Date().toISOString(),
                    updatedAt: Date.now(),
                  },
                };
                if (devIdx >= 0) {
                  updatedDevices[devIdx] = { ...updatedDevices[devIdx], ...newDevData };
                } else {
                  updatedDevices.push(newDevData);
                }
              }

              const isActiveDev = !c.activeDeviceId || !telemetry.deviceId || c.activeDeviceId === telemetry.deviceId;

              return {
                ...c,
                devices: updatedDevices,
                activeDeviceId: c.activeDeviceId || telemetry.deviceId,
                ...(isActiveDev ? {
                  lat: telemetry.lat ?? c.lat,
                  lng: telemetry.lng ?? c.lng,
                  battery: telemetry.battery ?? c.battery,
                  speed: telemetry.speed ?? c.speed,
                  currentAddress: telemetry.currentAddress ?? c.currentAddress,
                  isScreenOn: telemetry.isScreenOn !== undefined ? telemetry.isScreenOn : c.isScreenOn,
                  screenState: telemetry.screenState ?? c.screenState,
                  appStatus: telemetry.appStatus ?? c.appStatus,
                  syncMode: telemetry.syncMode ?? c.syncMode,
                  activeOpenedApp: telemetry.activeOpenedApp ?? c.activeOpenedApp,
                  screenTimeUsedMinutes: telemetry.screenTimeUsedMinutes ?? c.screenTimeUsedMinutes,
                } : {}),
                lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              };
            }
            return c;
          });

          // TOP-LEVEL ISOLATION: Only mutate top-level state if childId strictly equals selectedChildId
          const isCur = Boolean(prev.selectedChildId && childId === prev.selectedChildId);
          const updatedChild = updatedChildren.find((c) => c.id === prev.selectedChildId) || prev.child;
          const curSettings = prev.childSettings?.[childId] || createDefaultChildSettings(childId);
          const nextSettings = {
            ...curSettings,
            ...(telemetry.sensors ? { sensorValues: { ...curSettings.sensorValues, ...telemetry.sensors } } : {}),
            ...(telemetry.screenTimeUsedMinutes !== undefined ? { screenTime: { ...curSettings.screenTime, todayTotalMinutes: telemetry.screenTimeUsedMinutes } } : {}),
          };

          return {
            ...prev,
            children: updatedChildren,
            child: isCur ? updatedChild : prev.child,
            activeOpenedApp: isCur && telemetry.activeOpenedApp
              ? { id: 'app_active', name: telemetry.activeOpenedApp }
              : prev.activeOpenedApp,
            screenTime: isCur && telemetry.screenTimeUsedMinutes !== undefined
              ? { ...prev.screenTime, todayTotalMinutes: telemetry.screenTimeUsedMinutes }
              : prev.screenTime,
            childSettings: {
              ...prev.childSettings,
              [childId]: nextSettings,
            },
            alerts: newBatteryAlert ? [newBatteryAlert, ...prev.alerts] : prev.alerts,
          };
        });
      }
    }, childName);
    childUnsubs.push(unsubTelemetry);

    // --- (C) Time Requests Listener for this child ---
    const unsubTimeReqs = subscribeCloudTimeRequests(parentId, childId, (requests) => {
      if (requests && requests.length > 0) {
        applyCloudStateUpdate((prev) => {
          const targetChild = prev.children.find((ch) => ch.id === childId) || child;
          const reqChildName = targetChild.name || 'Con';

          const enrichedRequests: TimeRequest[] = requests.map((r) => ({
            ...r,
            childId: r.childId || childId,
            childName: r.childName || reqChildName,
          }));

          // Preserve requests of other children!
          const otherChildRequests = prev.timeRequests.filter((r) => r.childId && r.childId !== childId);
          const allTimeRequests = [...enrichedRequests, ...otherChildRequests];

          // Generate alert cards for pending requests that haven't been alerted
          const newAlerts: AlertNotification[] = [];
          enrichedRequests.forEach((req) => {
            if (req.status === 'pending') {
              const reqAlertId = `time_req_${req.id}`;
              const alreadyNotified = prev.alerts.some(
                (a) => a.id === reqAlertId || (a.type === 'screentime' && a.childId === childId && a.message?.includes(req.appName) && a.time === req.time)
              );
              if (!alreadyNotified) {
                newAlerts.push({
                  id: reqAlertId,
                  type: 'screentime',
                  title: `⏳ Bé ${req.childName} xin thêm ${req.requestedMinutes} phút dùng ${req.appName}`,
                  message: `Lý do: "${req.reason || 'Con xin thêm thời gian sử dụng'}"`,
                  time: req.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  isRead: false,
                  priority: 'medium',
                  childId: childId,
                  childName: req.childName,
                  imageUrl: '⏳',
                });

                showSystemNotification(`Bé ${req.childName} xin thêm giờ`, {
                  body: `Xin thêm ${req.requestedMinutes} phút cho ${req.appName}. Lý do: "${req.reason}"`,
                  soundType: 'info',
                  tag: `req_${req.id}`,
                });
              }
            }
          });

          return {
            ...prev,
            timeRequests: allTimeRequests,
            alerts: newAlerts.length > 0 ? [...newAlerts, ...prev.alerts] : prev.alerts,
          };
        });
      }
    }, childName);
    childUnsubs.push(unsubTimeReqs);

    // --- (D) Family Chat Listener for this child ---
    const unsubChat = subscribeCloudChatMessages(parentId, childId, (messages) => {
      if (messages && messages.length > 0) {
        const targetChild = globalState.children.find((ch) => ch.id === childId) || child;
        const chatChildName = targetChild.name || 'Con';
        const lastMsg = messages[messages.length - 1];

        if (lastMsg && lastMsg.sender === 'kid') {
          const msgTimestamp = typeof lastMsg.timestamp === 'number' ? lastMsg.timestamp : Date.now();
          const lastAlerted = lastChatAlertByChild[childId] || 0;
          if (Date.now() - msgTimestamp < 3 * 60 * 1000 && msgTimestamp > lastAlerted) {
            lastChatAlertByChild[childId] = msgTimestamp;
            const chatAlertId = `chat_alert_${lastMsg.id || msgTimestamp}`;
            const newChatAlert: AlertNotification = {
              id: chatAlertId,
              type: 'parent_message',
              title: `💬 Tin nhắn từ Bé ${chatChildName}`,
              message: lastMsg.text,
              time: lastMsg.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              isRead: false,
              priority: 'low',
              childId: childId,
              childName: chatChildName,
              imageUrl: '💬',
            };

            applyCloudStateUpdate((prev) => {
              const alreadyExists = prev.alerts.some((a) => a.id === chatAlertId);
              return {
                ...prev,
                alerts: alreadyExists ? prev.alerts : [newChatAlert, ...prev.alerts],
              };
            });

            showSystemNotification(`💬 Bé ${chatChildName}`, {
              body: lastMsg.text,
              soundType: 'chat',
              tag: `chat_${childId}`,
            });
          }
        }
      }
    }, childName);
    childUnsubs.push(unsubChat);

    // --- (E) Child Settings Listener ---
    const unsubSettings = subscribeChildSettingsFromCloud(parentId, childId, (cloudSettings) => {
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[childId] || createDefaultChildSettings(childId);
          const mergedSettings = { ...curSettings, ...cloudSettings };
          const isCur = Boolean(prev.selectedChildId && childId === prev.selectedChildId);
          const newStars = mergedSettings.kidStars !== undefined ? mergedSettings.kidStars : curSettings.kidStars;
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [childId]: {
                ...mergedSettings,
                kidStars: newStars,
              },
            },
            ...(isCur ? {
              apps: mergedSettings.apps || prev.apps,
              hardwareControls: mergedSettings.hardwareControls || prev.hardwareControls,
              kioskMode: mergedSettings.kioskMode || prev.kioskMode,
              lockChallenge: mergedSettings.lockChallenge || prev.lockChallenge,
              smartRoutines: mergedSettings.smartRoutines || prev.smartRoutines,
              broadcastMessage: mergedSettings.broadcastMessage !== undefined ? mergedSettings.broadcastMessage : prev.broadcastMessage,
              kidTasks: mergedSettings.kidTasks || prev.kidTasks,
              kidStars: newStars,
              starHistory: mergedSettings.starHistory || prev.starHistory,
              redemptions: mergedSettings.redemptions || prev.redemptions,
              safeZones: mergedSettings.safeZones || prev.safeZones,
              activeReminder: mergedSettings.activeReminder !== undefined ? mergedSettings.activeReminder : prev.activeReminder,
              lastVoiceGuide: mergedSettings.lastVoiceGuide !== undefined ? mergedSettings.lastVoiceGuide : prev.lastVoiceGuide,
              screenTime: mergedSettings.screenTimeLimitMinutes !== undefined
                ? { ...prev.screenTime, dailyLimitMinutes: mergedSettings.screenTimeLimitMinutes }
                : prev.screenTime,
            } : {}),
          };
        });
      }
    }, childName);
    childUnsubs.push(unsubSettings);

    // --- (F) Child Stars Listener ---
    const unsubStars = subscribeChildStarsFromCloud(parentId, childId, (starData) => {
      if (starData && typeof starData.stars === 'number') {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[childId] || createDefaultChildSettings(childId);
          const existingHistory = curSettings.starHistory || [];
          let newHistory = existingHistory;
          if (starData.transaction && starData.transaction.id && !existingHistory.some((tx) => tx.id === starData.transaction.id)) {
            newHistory = [starData.transaction, ...existingHistory];
          }
          const isCur = Boolean(prev.selectedChildId && childId === prev.selectedChildId);
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [childId]: {
                ...curSettings,
                kidStars: starData.stars,
                starHistory: newHistory,
              },
            },
            ...(isCur ? { kidStars: starData.stars, starHistory: newHistory } : {}),
          };
        });
      }
    }, childName);
    childUnsubs.push(unsubStars);

    // --- (G) PC Config Listener ---
    const unsubPcConfig = subscribeChildPcConfig(parentId, childId, (config) => {
      if (config) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[childId] || createDefaultChildSettings(childId);
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [childId]: {
                ...curSettings,
                pcConfig: config,
              },
            },
          };
        });
      }
    });
    childUnsubs.push(unsubPcConfig);

    // --- (H) PC Telemetry Listener ---
    const unsubPcTelemetry = subscribeChildPcTelemetry(parentId, childId, (telemetry) => {
      if (telemetry) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[childId] || createDefaultChildSettings(childId);
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [childId]: {
                ...curSettings,
                pcTelemetry: telemetry,
              },
            },
          };
        });
      }
    });
    childUnsubs.push(unsubPcTelemetry);

    // --- (I) Command Acknowledgment & Feedback Loop Listener ---
    const unsubCommandAck = subscribeCommandAck(parentId, childId, (ack) => {
      if (!ack || !ack.id) return;
      const cmdTitle = REMOTE_COMMAND_TITLES[ack.command] || ack.command || 'Lệnh từ xa';
      const now = Date.now();
      const timeStr = new Date(ack.executedAt || now).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const targetChild = globalState.children.find((ch) => ch.id === childId) || child;
      const childDisplayName = ack.childName || targetChild?.name || 'Con';

      applyCloudStateUpdate((prev) => {
        const prevAck = prev.lastCommandAck;
        const updatedAck: CommandAckStatus = {
          id: ack.id,
          command: ack.command,
          commandTitle: cmdTitle,
          status: ack.status,
          childId: ack.childId || childId,
          childName: childDisplayName,
          deviceName: ack.deviceName || prevAck?.deviceName || '',
          sentAt: prevAck?.id === ack.id ? prevAck.sentAt : (ack.receivedAt || now),
          executedAt: ack.executedAt || now,
          detail: ack.detail || (ack.status === 'executed' ? 'Đã thực thi thành công trên máy con' : 'Máy con đã nhận lệnh'),
        };

        return {
          ...prev,
          lastCommandAck: updatedAck,
        };
      });

      if (ack.status === 'executed') {
        showSystemNotification(`✅ MÁY CON ĐÃ THỰC THI LỆNH!`, {
          body: `Bé ${childDisplayName} đã nhận & thực thi [${cmdTitle}] lúc ${timeStr}!`,
          soundType: 'info',
          tag: `ack_${ack.id}`,
        });
      }
    });
    childUnsubs.push(unsubCommandAck);

    activeParentChildUnsubs.set(childId, childUnsubs);
  });
}

export function syncWithCloudForChild(parentId: string, childId?: string, childNameOverride?: string) {
  if (typeof window === 'undefined' || !parentId) return;

  const isKid = isKidAppMode();

  if (isKid) {
    // Machine is Kid App: Only subscribe to this child's own settings, stars, and chat
    activeKidUnsubs.forEach((u) => { try { u(); } catch (_) {} });
    activeKidUnsubs = [];

    const effectiveChildId = childId || getActiveChildId();
    const curChild = globalState.children.find((c) => c.id === effectiveChildId) || globalState.child;
    const childName = childNameOverride || curChild?.name;

    const unsubSettings = subscribeChildSettingsFromCloud(parentId, effectiveChildId, (cloudSettings) => {
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[effectiveChildId] || createDefaultChildSettings(effectiveChildId);
          const mergedSettings = { ...curSettings, ...cloudSettings };
          let cleanBroadcast = mergedSettings.broadcastMessage !== undefined ? mergedSettings.broadcastMessage : prev.broadcastMessage;
          if (cleanBroadcast) {
            const now = Date.now();
            const bCreated = typeof cleanBroadcast.createdAt === 'number' ? cleanBroadcast.createdAt : 0;
            // Purge if older than 10 mins or missing createdAt (legacy cloud state)
            if (!bCreated || (now - bCreated > 10 * 60 * 1000)) {
              cleanBroadcast = null;
              mergedSettings.broadcastMessage = null;
            }
          }
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [effectiveChildId]: {
                ...mergedSettings,
                broadcastMessage: cleanBroadcast,
              },
            },
            apps: mergedSettings.apps || prev.apps,
            hardwareControls: mergedSettings.hardwareControls || prev.hardwareControls,
            kioskMode: mergedSettings.kioskMode || prev.kioskMode,
            lockChallenge: mergedSettings.lockChallenge || prev.lockChallenge,
            smartRoutines: mergedSettings.smartRoutines || prev.smartRoutines,
            broadcastMessage: cleanBroadcast,
            kidTasks: mergedSettings.kidTasks || prev.kidTasks,
            kidStars: mergedSettings.kidStars !== undefined ? mergedSettings.kidStars : prev.kidStars,
            starHistory: mergedSettings.starHistory || prev.starHistory,
            redemptions: mergedSettings.redemptions || prev.redemptions,
            safeZones: mergedSettings.safeZones || prev.safeZones,
            activeReminder: mergedSettings.activeReminder !== undefined ? mergedSettings.activeReminder : prev.activeReminder,
            lastVoiceGuide: mergedSettings.lastVoiceGuide !== undefined ? mergedSettings.lastVoiceGuide : prev.lastVoiceGuide,
            screenTime: mergedSettings.screenTimeLimitMinutes !== undefined
              ? { ...prev.screenTime, dailyLimitMinutes: mergedSettings.screenTimeLimitMinutes }
              : prev.screenTime,
          };
        });
      }
    }, childName);
    activeKidUnsubs.push(unsubSettings);

    const unsubStars = subscribeChildStarsFromCloud(parentId, effectiveChildId, (starData) => {
      if (starData && typeof starData.stars === 'number') {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[effectiveChildId] || createDefaultChildSettings(effectiveChildId);
          const existingHistory = curSettings.starHistory || [];
          let newHistory = existingHistory;
          if (starData.transaction && starData.transaction.id && !existingHistory.some((tx) => tx.id === starData.transaction.id)) {
            newHistory = [starData.transaction, ...existingHistory];
          }
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [effectiveChildId]: {
                ...curSettings,
                kidStars: starData.stars,
                starHistory: newHistory,
              },
            },
            kidStars: starData.stars,
            starHistory: newHistory,
          };
        });
      }
    }, childName);
    activeKidUnsubs.push(unsubStars);

    const unsubChat = subscribeCloudChatMessages(parentId, effectiveChildId, (_messages) => {
      // Chat handled by FamilyChatModal
    }, childName);
    activeKidUnsubs.push(unsubChat);

    const unsubPcConfig = subscribeChildPcConfig(parentId, effectiveChildId, (config) => {
      if (config) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[effectiveChildId] || createDefaultChildSettings(effectiveChildId);
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [effectiveChildId]: {
                ...curSettings,
                pcConfig: config,
              },
            },
          };
        });
      }
    });
    activeKidUnsubs.push(unsubPcConfig);

    const unsubPcTelemetry = subscribeChildPcTelemetry(parentId, effectiveChildId, (telemetry) => {
      if (telemetry) {
        applyCloudStateUpdate((prev) => {
          const curSettings = prev.childSettings?.[effectiveChildId] || createDefaultChildSettings(effectiveChildId);
          return {
            ...prev,
            childSettings: {
              ...prev.childSettings,
              [effectiveChildId]: {
                ...curSettings,
                pcTelemetry: telemetry,
              },
            },
          };
        });
      }
    });
    activeKidUnsubs.push(unsubPcTelemetry);

    return;
  }

  // Machine is Parent App:
  // 1. Register top-level parent listeners (Children List & Safe Zones) if not yet done
  if (activeGlobalParentUnsubs.length === 0 || currentSubscribedParentId !== parentId) {
    activeGlobalParentUnsubs.forEach((u) => { try { u(); } catch (_) {} });
    activeGlobalParentUnsubs = [];

    const currentParentAcc = getCurrentParentAccount();
    const unsubChildren = subscribeChildrenListFromCloud(
      parentId,
      (cloudChildren) => {
        if (!cloudChildren || cloudChildren.length === 0) return;

        applyCloudStateUpdate((prev) => {
          const cloudIds = new Set(cloudChildren.map((c) => c.id));
          const preservedLocal = prev.children.filter((c) => !cloudIds.has(c.id));
          const mergedChildren = [
            ...preservedLocal,
            ...cloudChildren.map((cc) => {
              const existing = prev.children.find((c) => c.id === cc.id);
              const existingDevices = existing?.devices || [];
              const cloudDevices = cc.devices || [];
              const devMap = new Map<string, ChildDeviceInfo>();
              existingDevices.forEach((d: ChildDeviceInfo) => { if (d && d.deviceId) devMap.set(d.deviceId, d); });
              cloudDevices.forEach((d: ChildDeviceInfo) => {
                if (d && d.deviceId) {
                  const ex = devMap.get(d.deviceId);
                  devMap.set(d.deviceId, { ...(ex || {}), ...d });
                }
              });
              const allDevs = Array.from(devMap.values());

              return {
                ...(existing || {}),
                ...cc,
                devices: allDevs,
                activeDeviceId: cc.activeDeviceId || existing?.activeDeviceId || (allDevs[0]?.deviceId),
              };
            }),
          ];

          const curIdValid = mergedChildren.some((c) => c.id === prev.selectedChildId);
          const nextSelectedChildId = curIdValid ? prev.selectedChildId : (mergedChildren[0]?.id || '');
          const nextChild = mergedChildren.find((c) => c.id === nextSelectedChildId) || mergedChildren[0] || prev.child;

          return {
            ...prev,
            children: mergedChildren,
            selectedChildId: nextSelectedChildId,
            child: nextChild,
          };
        });

        // MULTI-CHILD: Automatically ensure every child in mergedChildren is actively subscribed
        syncParentWithAllChildren(parentId, globalState.children);
      },
      currentParentAcc?.displayName
    );
    activeGlobalParentUnsubs.push(unsubChildren);

    const unsubSafeZones = subscribeSafeZonesFromCloud(parentId, (zones) => {
      if (zones && zones.length > 0) {
        applyCloudStateUpdate((prev) => ({
          ...prev,
          safeZones: zones,
        }));
      }
    });
    activeGlobalParentUnsubs.push(unsubSafeZones);
  }

  // 2. Multi-Child Subscription for all children currently in globalState
  syncParentWithAllChildren(parentId, globalState.children);
}

// Actively query and sync all children across RTDB, Firestore, and pairings
export async function syncAllChildrenFromCloud(explicitParentId?: string): Promise<ChildProfile[]> {
  const currentParent = getCurrentParentAccount();
  const parentId = explicitParentId || currentParent?.uid || getActiveParentId();
  if (!parentId) return [];

  try {
    const cloudChildren = await fetchChildrenListFromCloud(parentId, currentParent?.displayName);
    if (cloudChildren && cloudChildren.length > 0) {
      applyCloudStateUpdate((prev) => {
        const cloudIds = new Set(cloudChildren.map((c) => c.id));
        const preservedLocal = prev.children.filter((c) => !cloudIds.has(c.id));
        const mergedChildren = [
          ...preservedLocal,
          ...cloudChildren.map((cc) => {
            const existing = prev.children.find((c) => c.id === cc.id);
            return {
              ...(existing || {}),
              ...cc,
            };
          }),
        ];

        const curIdValid = mergedChildren.some((c) => c.id === prev.selectedChildId);
        const nextSelectedChildId = curIdValid ? prev.selectedChildId : (mergedChildren[0]?.id || '');
        const nextChild = mergedChildren.find((c) => c.id === nextSelectedChildId) || mergedChildren[0] || prev.child;

        return {
          ...prev,
          children: mergedChildren,
          selectedChildId: nextSelectedChildId,
          child: nextChild,
        };
      });

      // MULTI-CHILD: Ensure all children are actively subscribed
      if (!isKidAppMode()) {
        syncParentWithAllChildren(parentId, globalState.children);
      }
      return cloudChildren;
    }
  } catch (err) {
    console.warn('syncAllChildrenFromCloud error:', err);
  }
  return [];
}

// Global auto-init on startup
if (typeof window !== 'undefined') {
  try {
    const parentId = getActiveParentId();
    const childId = getActiveChildId(globalState.selectedChildId || 'child_1');
    syncWithCloudForChild(parentId, childId);
    syncAllChildrenFromCloud(parentId);
  } catch (e) {}
}

// Global EventBus Subscribers
eventBus.subscribe('APP_STATUS_CHANGED', ({ appId, status }: { appId: string; status: 'allowed' | 'blocked' }) => {
  const updatedApps = globalState.apps.map((app) => (app.id === appId ? { ...app, status } : app));
  saveAndNotify({ ...globalState, apps: updatedApps });
});

eventBus.subscribe('STUDY_MODE_TOGGLED', (enabled: boolean) => {
  saveAndNotify({ ...globalState, studyModeOnly: enabled });
});

eventBus.subscribe('HARDWARE_CONTROL_CHANGED', (hardware: HardwareControls) => {
  saveAndNotify({ ...globalState, hardwareControls: hardware });
});

eventBus.subscribe('HARDWARE_PERMISSION_REQUESTED', ({ reason, requestedMinutes }: { reason: string; requestedMinutes: number }) => {
  const updatedHw: HardwareControls = {
    ...globalState.hardwareControls,
    childRequestedAdjustment: true,
    childRequestTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
  saveAndNotify({ ...globalState, hardwareControls: updatedHw });
});

eventBus.subscribe('HARDWARE_PERMISSION_RESOLVED', ({ approved }: { approved: boolean }) => {
  const updatedHw: HardwareControls = {
    ...globalState.hardwareControls,
    childRequestedAdjustment: false,
    allowChildAdjustment: approved ? true : globalState.hardwareControls.allowChildAdjustment,
    isHardwareLocked: approved ? false : globalState.hardwareControls.isHardwareLocked,
  };
  saveAndNotify({ ...globalState, hardwareControls: updatedHw });
});

eventBus.subscribe('KIOSK_MODE_CHANGED', (kiosk: KioskMode) => {
  saveAndNotify({ ...globalState, kioskMode: kiosk });
});

eventBus.subscribe('REMOTE_APP_OPEN', (appData: { id: string; name: string }) => {
  saveAndNotify({ ...globalState, activeOpenedApp: appData });
});

eventBus.subscribe('BROADCAST_MESSAGE_SENT', (msg: BroadcastMessage) => {
  saveAndNotify({ ...globalState, broadcastMessage: msg });
});

eventBus.subscribe('BROADCAST_MESSAGE_CLEARED', () => {
  saveAndNotify({ ...globalState, broadcastMessage: null });
});

eventBus.subscribe('LOCK_CHALLENGE_UPDATED', (lockData: LockChallengeState) => {
  saveAndNotify({ ...globalState, lockChallenge: lockData });
});

eventBus.subscribe('CHALLENGE_SOLVED', () => {
  saveAndNotify({
    ...globalState,
    lockChallenge: { ...globalState.lockChallenge, isLocked: false, lockType: 'none' },
    kidStars: globalState.kidStars + 5,
  });
});

eventBus.subscribe('SMART_ROUTINE_CHANGED', (routines: SmartRoutines) => {
  saveAndNotify({ ...globalState, smartRoutines: routines });
});

eventBus.subscribe('VOICE_GUIDE_TRIGGERED', (text: string) => {
  saveAndNotify({ ...globalState, lastVoiceGuide: text });
});

eventBus.subscribe('REMINDER_TRIGGERED', (reminder: { type: 'hydration' | 'school' | 'todo'; title: string; message: string } | null) => {
  saveAndNotify({ ...globalState, activeReminder: reminder });
});

eventBus.subscribe('REWARD_CATALOG_UPDATED', (catalog: RewardItem[]) => {
  saveAndNotify({ ...globalState, rewardsCatalog: catalog });
});

eventBus.subscribe('CHILD_SWITCHED', ({ childId }: { childId: string }) => {
  if (isKidAppMode()) {
    // Thiết bị con đã gắn cứng với tài khoản máy con, bỏ qua sự kiện chuyển bé từ tab phụ huynh
    return;
  }
  if (childId && childId !== globalState.selectedChildId) {
    const targetChild = globalState.children.find((c) => c.id === childId);
    if (!targetChild) return;
    const settings = globalState.childSettings[childId] || createDefaultChildSettings(childId);
    const nextState: AppState = {
      ...globalState,
      selectedChildId: childId,
      child: targetChild,
      apps: settings.apps,
      screenTime: settings.screenTime,
      hardwareControls: settings.hardwareControls,
      kioskMode: settings.kioskMode,
      lockChallenge: settings.lockChallenge,
      smartRoutines: settings.smartRoutines,
      kidTasks: settings.kidTasks,
      kidStars: settings.kidStars,
      activeOpenedApp: settings.activeOpenedApp || null,
      activeReminder: settings.activeReminder || null,
      lastVoiceGuide: settings.lastVoiceGuide || '',
    };
    saveAndNotify(nextState);
  }
});

eventBus.subscribe('SENSOR_SIMULATED', ({ type, detail }: { type: 'profanity' | 'noise'; detail: string }) => {
  const isProfanity = type === 'profanity';

  // Nếu phụ huynh đã tắt chức năng này trên máy con, không khóa máy
  if (isProfanity && !globalState.smartRoutines.profanityDetection) {
    console.log('[Store] Cảm biến nói bậy đang bị tắt bởi phụ huynh, bỏ qua khóa máy');
    return;
  }
  if (!isProfanity && !globalState.smartRoutines.noiseDetection) {
    console.log('[Store] Cảm biến âm lượng lớn đang bị tắt bởi phụ huynh, bỏ qua khóa máy');
    return;
  }

  const penaltySeconds = isProfanity
    ? (globalState.smartRoutines.profanityPenaltyMinutes || 10) * 60
    : 300;

  const newAlert: AlertNotification = {
    id: 'sensor_' + Date.now(),
    type: 'screentime',
    title: isProfanity ? '⚠️ Cảnh báo: Phát hiện ngôn từ không phù hợp!' : '📢 Cảnh báo: Âm thanh phòng học vượt quá 85dB!',
    message: detail,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    isRead: false,
    priority: 'high',
  };

  saveAndNotify({
    ...globalState,
    alerts: [newAlert, ...globalState.alerts],
    lockChallenge: {
      isLocked: true,
      lockType: isProfanity ? 'profanity' : 'noise',
      title: isProfanity ? 'Tạm khóa máy do ngôn từ chưa chuẩn mực' : 'Tạm khóa máy do môi trường quá ồn ào',
      description: detail,
      countdownChallenge: {
        initialSeconds: penaltySeconds,
        remainingSeconds: penaltySeconds,
      },
    },
  });
});

eventBus.subscribe('LIVE_STREAM_TOGGLED', (live: LiveMonitoring) => {
  saveAndNotify({ ...globalState, liveMonitoring: live });
});

let lastSosAlertCreatedTime = 0;
eventBus.subscribe('SOS_TRIGGERED', (sosInfo: { time: string; lat: number; lng: number; address: string; childId?: string; childName?: string }) => {
  const now = Date.now();
  // Deduplicate and debounce: if an SOS is already active or an alert was created < 15 seconds ago,
  // simply update sosDetails without prepending duplicate alert cards to globalState.alerts.
  if (globalState.activeSOS && now - lastSosAlertCreatedTime < 15000) {
    saveAndNotify({
      ...globalState,
      sosDetails: { ...sosInfo, childId: sosInfo.childId, childName: sosInfo.childName },
    });
    return;
  }
  lastSosAlertCreatedTime = now;

  const targetChild = sosInfo.childId ? globalState.children.find(c => c.id === sosInfo.childId) : null;
  const childName = sosInfo.childName || targetChild?.name || globalState.child?.name || 'Con';

  const newAlert: AlertNotification = {
    id: 'sos_' + (sosInfo.childId || 'all') + '_' + now,
    type: 'sos',
    title: `🚨 KHẨN CẤP: Bé ${childName} đã nhấn nút SOS!`,
    message: `Vị trí tại: ${sosInfo.address}`,
    time: sosInfo.time,
    isRead: false,
    priority: 'urgent',
    childId: sosInfo.childId,
    childName: childName,
    details: 'Con cần sự trợ giúp ngay lập tức!',
    imageUrl: '🚨',
  };
  saveAndNotify({
    ...globalState,
    activeSOS: true,
    sosDetails: { ...sosInfo, childId: sosInfo.childId, childName },
    alerts: [newAlert, ...globalState.alerts],
  });
});

eventBus.subscribe('SOS_CANCELLED', () => {
  lastSosAlertCreatedTime = 0;
  saveAndNotify({ ...globalState, activeSOS: false });
});

eventBus.subscribe('TIME_EXTENSION_REQUESTED', (req: TimeRequest) => {
  const childName = req.childName || globalState.child?.name || 'Bé';
  saveAndNotify({
    ...globalState,
    timeRequests: [req, ...globalState.timeRequests.filter(r => r.id !== req.id)],
    alerts: [
      {
        id: 'alt_' + Date.now(),
        type: 'screentime',
        title: `⏳ Bé ${childName} xin thêm ${req.requestedMinutes} phút dùng ${req.appName}`,
        message: `Lý do: "${req.reason}"`,
        time: req.time,
        isRead: false,
        priority: 'medium',
        childId: req.childId,
        childName: childName,
        imageUrl: '⏳',
      },
      ...globalState.alerts,
    ],
  });
});

eventBus.subscribe('TIME_EXTENSION_RESOLVED', ({ reqId, status }: { reqId: string; status: 'approved' | 'rejected' }) => {
  const updated = globalState.timeRequests.map((r) => (r.id === reqId ? { ...r, status } : r));
  saveAndNotify({ ...globalState, timeRequests: updated });
});

eventBus.subscribe('TASK_STATUS_CHANGED', ({ taskId, completed, childId, starsDelta, newStars: explicitNewStars }: { taskId: string; completed: boolean; childId?: string; starsDelta?: number; newStars?: number }) => {
  const targetCid = childId || globalState.selectedChildId;
  const targetSettings = globalState.childSettings[targetCid] || createDefaultChildSettings(targetCid);
  const task = targetSettings.kidTasks.find((t) => t.id === taskId) || globalState.kidTasks.find((t) => t.id === taskId);
  
  // If task status is already the same and newStars is not specified, skip to avoid double counting
  if (task && task.completed === completed && explicitNewStars === undefined) {
    return;
  }

  const earned = starsDelta !== undefined ? starsDelta : (completed ? (task?.stars || 5) : -(task?.stars || 5));
  const finalStars = explicitNewStars !== undefined ? explicitNewStars : Math.max(0, (targetSettings.kidStars ?? globalState.kidStars) + earned);

  const updatedTasks = (targetSettings.kidTasks || globalState.kidTasks).map((t) => (t.id === taskId ? { ...t, completed } : t));

  const updatedChildSettings = {
    ...globalState.childSettings,
    [targetCid]: {
      ...targetSettings,
      kidTasks: updatedTasks,
      kidStars: finalStars,
    },
  };

  saveAndNotify({
    ...globalState,
    childSettings: updatedChildSettings,
    kidTasks: targetCid === globalState.selectedChildId ? updatedTasks : globalState.kidTasks,
    kidStars: targetCid === globalState.selectedChildId ? finalStars : globalState.kidStars,
  }, targetCid);
});

const processedTxIds = new Set<string>();
function recordProcessedTxId(id: string) {
  processedTxIds.add(id);
  if (processedTxIds.size > 500) {
    const first = processedTxIds.values().next().value;
    if (first) processedTxIds.delete(first);
  }
}

eventBus.subscribe('STAR_GIFTED', ({ childId, amount, reason, childName, newStars: explicitNewStars, txId }: { childId: string; amount: number; reason: string; childName: string; newStars?: number; txId?: string }) => {
  if (txId) {
    if (processedTxIds.has(txId)) {
      return;
    }
    recordProcessedTxId(txId);
  }

  const targetSettings = globalState.childSettings[childId] || createDefaultChildSettings(childId);
  
  // Strict idempotency: If transaction is already recorded or kidStars already matches explicitNewStars, NEVER add again!
  if (txId && targetSettings.starHistory?.some((tx) => tx.id === txId)) {
    return;
  }
  if (explicitNewStars !== undefined && targetSettings.kidStars === explicitNewStars) {
    return;
  }

  const finalStars = explicitNewStars !== undefined ? explicitNewStars : Math.max(0, (targetSettings.kidStars || 0) + amount);
  const tx: StarTransaction = {
    id: txId || ('tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    childId,
    childName,
    type: 'gift',
    stars: amount,
    title: `Bố/Mẹ tặng +${amount} sao khen ngợi`,
    note: reason,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
  };
  recordProcessedTxId(tx.id);

  const updatedChildSettings = {
    ...globalState.childSettings,
    [childId]: {
      ...targetSettings,
      kidStars: finalStars,
      starHistory: [tx, ...(targetSettings.starHistory || [])],
    },
  };
  saveAndNotify({
    ...globalState,
    childSettings: updatedChildSettings,
    starHistory: [tx, ...globalState.starHistory],
    ...(childId === globalState.selectedChildId ? { kidStars: finalStars } : {}),
  }, childId);
});

eventBus.subscribe('TASK_ASSIGNED', ({ childId, task }: { childId: string; task: KidTask; childName: string }) => {
  const targetSettings = globalState.childSettings[childId] || createDefaultChildSettings(childId);
  // Avoid duplicating existing task
  if (targetSettings.kidTasks.some((t) => t.id === task.id)) {
    return;
  }
  const updatedTasks = [task, ...targetSettings.kidTasks];
  const updatedChildSettings = {
    ...globalState.childSettings,
    [childId]: {
      ...targetSettings,
      kidTasks: updatedTasks,
    },
  };
  saveAndNotify({
    ...globalState,
    childSettings: updatedChildSettings,
    ...(childId === globalState.selectedChildId ? { kidTasks: updatedTasks } : {}),
  }, childId);
});

eventBus.subscribe('REWARD_REDEEMED', ({ childId, reward, redemption, newStars: explicitNewStars }: { childId: string; reward: RewardItem; redemption: RewardRedemption; newStars?: number }) => {
  const targetSettings = globalState.childSettings[childId] || createDefaultChildSettings(childId);
  if (redemption?.id && targetSettings.redemptions?.some((r) => r.id === redemption.id)) {
    return;
  }
  const finalStars = explicitNewStars !== undefined ? explicitNewStars : Math.max(0, (targetSettings.kidStars || 0) - reward.starsCost);
  const updatedChildSettings = {
    ...globalState.childSettings,
    [childId]: {
      ...targetSettings,
      kidStars: finalStars,
      redemptions: [redemption, ...(targetSettings.redemptions || [])],
    },
  };
  saveAndNotify({
    ...globalState,
    childSettings: updatedChildSettings,
    redemptions: [redemption, ...globalState.redemptions],
    ...(childId === globalState.selectedChildId ? { kidStars: finalStars } : {}),
  }, childId);
});

eventBus.subscribe('AVATAR_UPDATED', ({ childId, newAvatar }: { childId: string; newAvatar: string }) => {
  const updatedChildren = globalState.children.map((c) => (c.id === childId ? { ...c, avatar: newAvatar } : c));
  saveAndNotify({
    ...globalState,
    children: updatedChildren,
    ...(childId === globalState.selectedChildId && globalState.child ? { child: { ...globalState.child, avatar: newAvatar } } : {}),
  });
});

// Hardware Timer background ticker
if (typeof window !== 'undefined') {
  setInterval(() => {
    const hw = globalState.hardwareControls;
    if (hw?.activeTimer?.isActive) {
      if (hw.activeTimer.remainingSeconds <= 1) {
        const restored: HardwareControls = {
          ...hw,
          volume: hw.activeTimer.originalVolume,
          brightness: hw.activeTimer.originalBrightness,
          isHardwareLocked: false,
          activeTimer: null,
        };
        saveAndNotify({ ...globalState, hardwareControls: restored });
        eventBus.publish('HARDWARE_CONTROL_CHANGED', restored, 'system');
      } else {
        const updatedTimer = {
          ...hw.activeTimer,
          remainingSeconds: hw.activeTimer.remainingSeconds - 1,
        };
        saveAndNotify({
          ...globalState,
          hardwareControls: {
            ...hw,
            activeTimer: updatedTimer,
          },
        });
      }
    }
  }, 1000);
}

export const useAppState = () => {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    const handler = (newState: AppState) => setState({ ...newState });
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const clearLastCommandAck = () => {
    applyCloudStateUpdate((prev) => ({
      ...prev,
      lastCommandAck: null,
    }));
  };

  const dispatchRemoteCommand = async (
    command: RemoteCommandType,
    payload?: any,
    targetChildId?: string,
    customTitle?: string
  ): Promise<string> => {
    const childId = targetChildId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === childId) || state.child;
    const childName = targetChild?.name || 'Con';
    const title = customTitle || REMOTE_COMMAND_TITLES[command] || command;
    const now = Date.now();
    const cmdId = `cmd_${now}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Mark as pending immediately in state
    const pendingStatus: CommandAckStatus = {
      id: cmdId,
      command,
      commandTitle: title,
      status: 'pending',
      childId,
      childName,
      deviceName: targetChild?.devices?.[0]?.deviceName || '',
      sentAt: now,
      detail: `Đang truyền tín hiệu đến điện thoại của ${childName}...`,
    };

    saveAndNotify({
      ...state,
      lastCommandAck: pendingStatus,
    });

    // 2. Dispatch command via Cloud RTDB & local server
    sendRemoteCommandToKid(parentId, childId, command, payload, childName, cmdId).catch(() => {});

    // 3. Set a 15-second timeout: If child has not acknowledged after 15s, inform parent
    setTimeout(() => {
      applyCloudStateUpdate((prev) => {
        if (prev.lastCommandAck && prev.lastCommandAck.id === cmdId && prev.lastCommandAck.status === 'pending') {
          return {
            ...prev,
            lastCommandAck: {
              ...prev.lastCommandAck,
              status: 'timeout',
              detail: `Điện thoại của ${childName} chưa phản hồi (có thể đang tắt mạng hoặc mất sóng). Lệnh sẽ tự động chạy ngay khi máy con kết nối 4G/WiFi.`,
            },
          };
        }
        return prev;
      });
    }, 15000);

    return cmdId;
  };

  // Hardware Controls with Locking, Limiting & Child Permissions
  const setHardwareControls = (partial: Partial<HardwareControls>, sender: 'parent' | 'child' = 'parent') => {
    let nextVolume = partial.volume !== undefined ? partial.volume : globalState.hardwareControls.volume;
    let nextBrightness = partial.brightness !== undefined ? partial.brightness : globalState.hardwareControls.brightness;

    if (sender === 'child') {
      if (globalState.hardwareControls.isHardwareLocked || !globalState.hardwareControls.allowChildAdjustment) {
        return false;
      }
      nextVolume = Math.min(nextVolume, globalState.hardwareControls.maxAllowedVolume);
      nextBrightness = Math.max(nextBrightness, globalState.hardwareControls.minAllowedBrightness);
    }

    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      ...partial,
      volume: nextVolume,
      brightness: nextBrightness,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, sender);

    if (sender === 'parent') {
      const targetChildId = state.selectedChildId;
      if (targetChildId) {
        if (partial.flashlight !== undefined) {
          dispatchRemoteCommand('flash_toggle', { flashlight: partial.flashlight }, targetChildId, 'Bật/Tắt đèn Flash ⚡');
        } else if (partial.volume !== undefined || partial.brightness !== undefined) {
          dispatchRemoteCommand('hardware_control', {
            volume: partial.volume,
            brightness: partial.brightness,
          }, targetChildId, 'Chỉnh âm lượng / độ sáng 🎛️');
        }
      }
    }
    return true;
  };

  const toggleHardwareLock = (locked?: boolean) => {
    const nextLocked = locked !== undefined ? locked : !globalState.hardwareControls.isHardwareLocked;
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      isHardwareLocked: nextLocked,
      lockVolume: nextLocked,
      lockBrightness: nextLocked,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const toggleLockVolume = () => {
    const nextVal = !globalState.hardwareControls.lockVolume;
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      lockVolume: nextVal,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const toggleLockBrightness = () => {
    const nextVal = !globalState.hardwareControls.lockBrightness;
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      lockBrightness: nextVal,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const setAllowChildAdjustment = (allowed: boolean) => {
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      allowChildAdjustment: allowed,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const setSafeHardwareLimits = (maxVol: number, minBright: number) => {
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      maxAllowedVolume: maxVol,
      minAllowedBrightness: minBright,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const startHardwareTimer = (
    minutes: number,
    label: string,
    targetVolume: number,
    targetBrightness: number,
    isMuted: boolean,
    lockDuring: boolean = true
  ) => {
    const timer = {
      isActive: true,
      minutes,
      remainingSeconds: minutes * 60,
      label,
      originalVolume: globalState.hardwareControls.volume,
      originalBrightness: globalState.hardwareControls.brightness,
    };
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      volume: targetVolume,
      brightness: targetBrightness,
      isMuted,
      isHardwareLocked: lockDuring,
      activeTimer: timer,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const cancelHardwareTimer = () => {
    if (!globalState.hardwareControls.activeTimer) return;
    const timer = globalState.hardwareControls.activeTimer;
    const restored: HardwareControls = {
      ...globalState.hardwareControls,
      volume: timer.originalVolume,
      brightness: timer.originalBrightness,
      isHardwareLocked: false,
      activeTimer: null,
    };
    saveAndNotify({ ...globalState, hardwareControls: restored });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', restored, 'parent');
  };

  const toggleScheduleProfile = (scheduleId: string, enabled?: boolean) => {
    const updatedSchedules = globalState.hardwareControls.schedules.map((s) => {
      if (s.id === scheduleId) {
        return { ...s, enabled: enabled !== undefined ? enabled : !s.enabled };
      }
      return s;
    });
    const updated: HardwareControls = {
      ...globalState.hardwareControls,
      schedules: updatedSchedules,
    };
    saveAndNotify({ ...globalState, hardwareControls: updated });
    eventBus.publish('HARDWARE_CONTROL_CHANGED', updated, 'parent');
  };

  const requestChildHardwareAdjustment = (reason: string, requestedMinutes: number = 15) => {
    eventBus.publish('HARDWARE_PERMISSION_REQUESTED', { reason, requestedMinutes }, 'child');
  };

  const resolveChildHardwareAdjustment = (approved: boolean) => {
    eventBus.publish('HARDWARE_PERMISSION_RESOLVED', { approved }, 'parent');
  };

  // Kiosk Mode
  const setKioskMode = (enabled: boolean, appId: string | null = null, appName: string | null = null) => {
    const updated: KioskMode = { isEnabled: enabled, pinnedAppId: appId, pinnedAppName: appName };
    saveAndNotify({ ...state, kioskMode: updated });
    eventBus.publish('KIOSK_MODE_CHANGED', updated, 'parent');
    const parentId = getActiveParentId();
    const targetChildId = state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    if (parentId && targetChildId) {
      sendRemoteCommandToKid(parentId, targetChildId, enabled ? 'kiosk_lock' : 'kiosk_unlock', { appId, appName }, targetChild?.name).catch(() => {});
    }
  };

  const remoteOpenApp = (appId: string, appName: string) => {
    saveAndNotify({ ...state, activeOpenedApp: { id: appId, name: appName } });
    eventBus.publish('REMOTE_APP_OPEN', { id: appId, name: appName }, 'parent');
  };

  // Broadcast message overlay
  const broadcastOverlay = (title: string, message: string, imageUrl?: string, isIncomingOnKid: boolean = false) => {
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const msg: BroadcastMessage = {
      id: `broadcast_${now}_${Math.random().toString(36).substring(2, 7)}`,
      isShowing: true,
      title,
      message,
      imageUrl,
      timestamp: timeStr,
      createdAt: now,
    };
    saveAndNotify({ ...state, broadcastMessage: msg });
    eventBus.publish('BROADCAST_MESSAGE_SENT', msg, isIncomingOnKid ? 'child' : 'parent');

    // ONLY parent sends remote command to cloud; incoming on kid or kid mode MUST NEVER send command to itself!
    if (!isIncomingOnKid && !isKidAppMode()) {
      const parentId = getActiveParentId();
      const targetChildId = state.selectedChildId;
      const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
      if (parentId && targetChildId) {
        sendRemoteCommandToKid(
          parentId,
          targetChildId,
          'broadcast_msg',
          { id: msg.id, title, message, imageUrl, createdAt: now, timestamp: now },
          targetChild?.name
        ).catch(() => {});
      }
    }
  };

  const clearBroadcastOverlay = () => {
    const curId = state.selectedChildId || state.child?.id || '';
    const updatedSettings = { ...(state.childSettings || {}) };
    if (curId && updatedSettings[curId]) {
      updatedSettings[curId] = {
        ...updatedSettings[curId],
        broadcastMessage: null,
      };
    }
    saveAndNotify({ ...state, broadcastMessage: null, childSettings: updatedSettings });
    eventBus.publish('BROADCAST_MESSAGE_CLEARED', {}, 'parent');

    const parentId = getActiveParentId();
    const kidPaired = getKidDevicePairedInfo();
    const targetChildId = kidPaired?.childId || state.selectedChildId || state.child?.id || '';
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    const targetChildName = kidPaired?.childName || targetChild?.name;

    if (parentId && targetChildId) {
      if (!isKidAppMode()) {
        sendRemoteCommandToKid(parentId, targetChildId, 'clear_broadcast', undefined, targetChildName).catch(() => {});
      }
      clearRemoteCommand(parentId, targetChildId, targetChildName).catch(() => {});
    }
  };

  // Educational Shared Link with forced watch duration
  const sendSharedLinkToKid = (url: string, title: string, forcedMinutes: number = 0, note?: string) => {
    const parentId = getActiveParentId();
    const targetChildId = state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    const sharedLink: SharedLessonLink = {
      id: `link_${Date.now()}`,
      url,
      title: title || 'Bài học Bố Mẹ gửi cho con',
      note: note || '',
      forcedMinutes: forcedMinutes || 0,
      createdAt: Date.now(),
      isOpen: true,
    };

    const currentSpecific = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSpecific,
        activeSharedLink: sharedLink,
      },
    };
    saveAndNotify({ ...state, childSettings: updatedSettings });

    if (parentId && targetChildId) {
      sendRemoteCommandToKid(
        parentId,
        targetChildId,
        'open_shared_link',
        sharedLink,
        targetChild?.name
      ).catch(() => {});
    }
  };

  const closeSharedLinkOnKid = () => {
    const parentId = getActiveParentId();
    const targetChildId = state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;

    const currentSpecific = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSpecific,
        activeSharedLink: null,
      },
    };
    saveAndNotify({ ...state, childSettings: updatedSettings });

    if (parentId && targetChildId) {
      sendRemoteCommandToKid(
        parentId,
        targetChildId,
        'close_shared_link',
        undefined,
        targetChild?.name
      ).catch(() => {});
    }
  };

  // Emergency contact config (phone & allowed messaging apps during lock)
  const setEmergencyContact = (phone: string, allowedApps: Array<'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat'>) => {
    const targetChildId = state.selectedChildId;
    const contactConfig: EmergencyContactConfig = {
      parentPhone: phone,
      allowedApps,
    };

    const currentSpecific = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSpecific,
        emergencyContact: contactConfig,
      },
    };
    saveAndNotify({ ...state, childSettings: updatedSettings });
  };

  const setChildLauncherMode = (enabled: boolean) => {
    const targetChildId = state.selectedChildId;
    const currentSpecific = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSpecific,
        isLauncherEnabled: enabled,
      },
    };
    saveAndNotify({ ...state, childSettings: updatedSettings });
  };

  // Lock challenges
  const setLockChallenge = (lockType: LockType, title?: string, desc?: string, customChallengeData?: Partial<LockChallengeState>) => {
    let customTitle = (customChallengeData && customChallengeData.title) || title || 'Thiết bị đang bị khóa';
    let customDesc = (customChallengeData && customChallengeData.description) || desc || 'Con hãy hoàn thành thử thách để mở máy nhé!';

    let challengeData: Partial<LockChallengeState> = {
      isLocked: lockType !== 'none',
      lockType,
      title: customTitle,
      description: customDesc,
      ...(customChallengeData || {}),
    };

    if (customChallengeData && (customChallengeData.mathChallenge || customChallengeData.quizChallenge || customChallengeData.movementChallenge || customChallengeData.countdownChallenge)) {
      // Retain custom challenge details passed from remote parent
    } else if (lockType === 'math') {
      const num1 = Math.floor(Math.random() * 50) + 10;
      const num2 = Math.floor(Math.random() * 40) + 10;
      challengeData.mathChallenge = {
        question: `${num1} + ${num2} = ?`,
        answer: num1 + num2,
      };
      challengeData.title = 'Thử thách Toán Học 🧮';
      challengeData.description = 'Giải đúng bài toán này để mở khóa máy tính nhé!';
    } else if (lockType === 'quiz') {
      const quizzes = [
        {
          question: 'Hành tinh nào gần Mặt Trời nhất?',
          options: ['Sao Kim', 'Sao Thủy', 'Sao Hỏa', 'Trái Đất'],
          correctIndex: 1,
        },
        {
          question: 'Loài vật nào được mệnh danh là chúa tể sơn lâm?',
          options: ['Voi', 'Gấu Bắc Cực', 'Hổ', 'Hươu cao cổ'],
          correctIndex: 2,
        },
        {
          question: 'Con sông nào dài nhất thế giới?',
          options: ['Sông Mê Kông', 'Sông Nin (Nile)', 'Sông Amazon', 'Sông Hồng'],
          correctIndex: 1,
        },
      ];
      const picked = quizzes[Math.floor(Math.random() * quizzes.length)];
      challengeData.quizChallenge = picked;
      challengeData.title = 'Thử thách Câu Đố Trí Tuệ 💡';
      challengeData.description = 'Chọn đáp án chính xác để mở khóa máy nhé con!';
    } else if (lockType === 'movement') {
      challengeData.movementChallenge = {
        currentSteps: 0,
        targetSteps: 50,
      };
      challengeData.title = 'Thử thách Vận Động Thể Chất 🏃';
      challengeData.description = 'Con hãy đứng dậy đi bộ hoặc nhảy dây 50 bước để bảo vệ mắt và sức khỏe!';
    } else if (lockType === 'countdown') {
      challengeData.countdownChallenge = {
        initialSeconds: 300,
        remainingSeconds: 300,
      };
      challengeData.title = 'Tạm dừng tĩnh tâm ⏳';
      challengeData.description = 'Hết thời gian đếm ngược máy sẽ tự động mở lại.';
    } else if (lockType === 'mealtime') {
      challengeData.title = 'Đến giờ ăn cơm gia đình rồi! 🍚';
      challengeData.description = 'Con hãy cất máy và ra ăn cơm cùng bố mẹ nhé.';
    } else if (lockType === 'bedtime') {
      challengeData.title = 'Đã đến giờ đi ngủ ngon! 🌙';
      challengeData.description = 'Ngủ sớm trước 22:00 để phát triển chiều cao và trí tuệ nhé bé yêu.';
    }

    const fullState: LockChallengeState = {
      ...state.lockChallenge,
      ...challengeData,
      ...(customChallengeData || {}),
      isLocked: lockType !== 'none',
      lockType,
    };

    saveAndNotify({ ...state, lockChallenge: fullState });
    eventBus.publish('LOCK_CHALLENGE_UPDATED', fullState, 'parent');
    const parentId = getActiveParentId();
    const targetChildId = state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    if (parentId && targetChildId && !isKidAppMode()) {
      sendRemoteCommandToKid(parentId, targetChildId, 'lock_now', {
        lockType,
        title: challengeData.title,
        description: challengeData.description,
        challengeData: fullState,
      }, targetChild?.name).catch(() => {});
    }
  };

  const unlockDevice = () => {
    const updated: LockChallengeState = {
      ...state.lockChallenge,
      isLocked: false,
      lockType: 'none',
    };
    saveAndNotify({ ...state, lockChallenge: updated });
    eventBus.publish('LOCK_CHALLENGE_UPDATED', updated, 'parent');
    const parentId = getActiveParentId();
    const targetChildId = state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    if (parentId && targetChildId && !isKidAppMode()) {
      sendRemoteCommandToKid(parentId, targetChildId, 'unlock_now', undefined, targetChild?.name).catch(() => {});
    }
  };

  const solveChallengeOnKid = () => {
    eventBus.publish('CHALLENGE_SOLVED', {}, 'child');
    const parentId = getActiveParentId();
    const kidPaired = getKidDevicePairedInfo();
    const childId = kidPaired?.childId || state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === childId) || state.child;
    const unlockedState: LockChallengeState = {
      ...state.lockChallenge,
      isLocked: false,
      lockType: 'none',
    };
    const newStars = (state.kidStars || 0) + 5;
    if (parentId && childId) {
      syncChildSettingsToCloud(parentId, childId, {
        lockChallenge: unlockedState,
        kidStars: newStars,
      }, targetChild?.name).catch(() => {});
      syncChildStarsToCloud(parentId, childId, newStars, {
        id: 'tx_solve_' + Date.now(),
        childId,
        childName: targetChild.name,
        type: 'challenge_solve',
        stars: 5,
        title: 'Hoàn thành thử thách mở khóa',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
      }, targetChild?.name).catch(() => {});
    }
  };

  const addStepsOnKid = (steps: number) => {
    const curLock = globalState.lockChallenge;
    if (!curLock.movementChallenge) return;
    const cur = curLock.movementChallenge.currentSteps + steps;
    const target = curLock.movementChallenge.targetSteps;
    const isCompleted = cur >= target;
    const updatedLock: LockChallengeState = {
      ...curLock,
      movementChallenge: {
        ...curLock.movementChallenge,
        currentSteps: Math.min(cur, target),
      },
      isLocked: !isCompleted,
      lockType: isCompleted ? 'none' : curLock.lockType,
    };
    const newStars = isCompleted ? (globalState.kidStars || 0) + 5 : (globalState.kidStars || 0);
    saveAndNotify({
      ...globalState,
      lockChallenge: updatedLock,
      kidStars: newStars,
    });
    eventBus.publish('LOCK_CHALLENGE_UPDATED', updatedLock, 'child');

    const parentId = getActiveParentId();
    const kidPaired = getKidDevicePairedInfo();
    const childId = kidPaired?.childId || globalState.selectedChildId;
    const targetChild = globalState.children.find((c) => c.id === childId) || globalState.child;
    if (parentId && childId) {
      syncChildSettingsToCloud(parentId, childId, {
        lockChallenge: updatedLock,
        kidStars: newStars,
      }, targetChild?.name).catch(() => {});
      if (isCompleted) {
        syncChildStarsToCloud(parentId, childId, newStars, {
          id: 'tx_step_' + Date.now(),
          childId,
          childName: targetChild.name,
          type: 'challenge_solve',
          stars: 5,
          title: 'Hoàn thành thử thách vận động',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
        }, targetChild?.name).catch(() => {});
      }
    }
  };

  // Smart routines & reminders
  const toggleSmartRoutine = (key: keyof SmartRoutines, val?: boolean) => {
    const nextVal = val !== undefined ? val : !state.smartRoutines[key];
    const updated: SmartRoutines = {
      ...state.smartRoutines,
      [key]: nextVal,
    };

    let lockTypeToTrigger: LockType = 'none';
    if (key === 'mealtimeLock') lockTypeToTrigger = nextVal ? 'mealtime' : 'none';
    if (key === 'bedtimeLock') lockTypeToTrigger = nextVal ? 'bedtime' : 'none';

    saveAndNotify({ ...state, smartRoutines: updated });
    eventBus.publish('SMART_ROUTINE_CHANGED', updated, 'parent');

    if (lockTypeToTrigger !== 'none') {
      setLockChallenge(lockTypeToTrigger);
    } else if ((key === 'mealtimeLock' || key === 'bedtimeLock') && !nextVal && state.lockChallenge.isLocked) {
      unlockDevice();
    }
  };

  const triggerVoiceGuide = (text: string) => {
    saveAndNotify({ ...state, lastVoiceGuide: text });
    const activeParentId = getActiveParentId();
    const curId = state.selectedChildId;
    if (activeParentId && curId) {
      const curChild = state.children.find((c) => c.id === curId) || state.child;
      sendRemoteCommandToKid(activeParentId, curId, 'broadcast_msg', { title: 'Trợ lý giọng nói Bố Mẹ', message: text, sticker: '📢', speakTTS: true }, curChild?.name).catch(() => {});
    }
    eventBus.publish('VOICE_GUIDE_TRIGGERED', text, 'parent');
  };

  const triggerReminder = (type: 'hydration' | 'school' | 'todo') => {
    const titles = {
      hydration: 'Nhắc nhở: Uống một ly nước lọc 💧',
      school: 'Nhắc nhở: Chuẩn bị sách vở và đồng phục ngày mai 🎒',
      todo: 'Danh sách việc cần làm hôm nay 📝',
    };
    const messages = {
      hydration: 'Uống đủ nước giúp não bộ tỉnh táo và tràn đầy năng lượng!',
      school: 'Kiểm tra hộp bút, thời khóa biểu và sạc đồng hồ thông minh nhé con!',
      todo: '1. Làm bài tập Toán • 2. Nhảy dây 50 cái • 3. Đọc 5 trang sách',
    };
    const rem = { type, title: titles[type], message: messages[type] };
    saveAndNotify({ ...state, activeReminder: rem });
    const activeParentId = getActiveParentId();
    const curId = state.selectedChildId;
    if (activeParentId && curId) {
      const curChild = state.children.find((c) => c.id === curId) || state.child;
      sendRemoteCommandToKid(activeParentId, curId, 'broadcast_msg', { title: rem.title, message: rem.message, sticker: type === 'hydration' ? '💧' : '🎒', speakTTS: true }, curChild?.name).catch(() => {});
    }
    eventBus.publish('REMINDER_TRIGGERED', rem, 'parent');
  };

  const clearReminder = () => {
    saveAndNotify({ ...state, activeReminder: null });
    eventBus.publish('REMINDER_TRIGGERED', null, 'child');
  };

  const simulateSensorTrigger = (sensorType: 'profanity' | 'noise') => {
    const detail =
      sensorType === 'profanity'
        ? 'Hệ thống AI vừa phát hiện từ ngữ kích động/không phù hợp trong cuộc trò chuyện.'
        : 'Âm thanh xung quanh đo được 92dB (vượt ngưỡng cho phép 85dB).';
    eventBus.publish('SENSOR_SIMULATED', { type: sensorType, detail }, 'system');
  };

  const toggleLiveStream = (target: 'screen' | 'camera') => {
    const updated: LiveMonitoring = {
      ...state.liveMonitoring,
      screenMirroring: target === 'screen' ? !state.liveMonitoring.screenMirroring : state.liveMonitoring.screenMirroring,
      cameraActive: target === 'camera' ? !state.liveMonitoring.cameraActive : state.liveMonitoring.cameraActive,
    };
    saveAndNotify({ ...state, liveMonitoring: updated });
    eventBus.publish('LIVE_STREAM_TOGGLED', updated, 'parent');
  };

  const switchCameraFacing = () => {
    const nextFacing = state.liveMonitoring.cameraFacing === 'front' ? 'back' : 'front';
    const updated: LiveMonitoring = { ...state.liveMonitoring, cameraFacing: nextFacing };
    saveAndNotify({ ...state, liveMonitoring: updated });
    eventBus.publish('LIVE_STREAM_TOGGLED', updated, 'parent');
  };

  // Base methods
  const toggleAppStatus = (appId: string, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const targetApps = currentSettings.apps || state.apps;
    const target = targetApps.find((a) => a.id === appId);
    if (!target) return;
    const newStatus: 'allowed' | 'blocked' = target.status === 'allowed' ? 'blocked' : 'allowed';
    const updatedApps = targetApps.map((a) => (a.id === appId ? { ...a, status: newStatus } : a));

    const isCur = state.selectedChildId === targetChildId;
    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        apps: updatedApps,
      },
    };
    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { apps: updatedApps } : {}),
    }, targetChildId);

    eventBus.publish('APP_STATUS_CHANGED', { appId, status: newStatus, childId: targetChildId }, 'parent');
    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildSettingsToCloud(parentId, targetChildId, { apps: updatedApps }).catch(() => {});
      sendRemoteCommandToKid(parentId, targetChildId, 'update_app_rule', { appId, status: newStatus }).catch(() => {});
    }
  };

  const setAppDailyLimit = (appId: string, limitMinutes: number, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const targetApps = currentSettings.apps || state.apps;
    const updatedApps = targetApps.map((a) => (a.id === appId ? { ...a, dailyLimitMinutes: limitMinutes } : a));

    const isCur = state.selectedChildId === targetChildId;
    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        apps: updatedApps,
      },
    };
    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { apps: updatedApps } : {}),
    }, targetChildId);

    eventBus.publish('APP_LIMIT_UPDATED', { appId, limitMinutes, childId: targetChildId }, 'parent');
    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildSettingsToCloud(parentId, targetChildId, { apps: updatedApps }).catch(() => {});
      sendRemoteCommandToKid(parentId, targetChildId, 'update_app_limit', { appId, limitMinutes }).catch(() => {});
    }
  };

  const toggleAppVisibility = (appId: string, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const targetApps = currentSettings.apps || state.apps;
    const target = targetApps.find((a) => a.id === appId);
    if (!target) return;
    const newHidden = !target.isHidden;
    const updatedApps = targetApps.map((a) => (a.id === appId ? { ...a, isHidden: newHidden } : a));

    const isCur = state.selectedChildId === targetChildId;
    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        apps: updatedApps,
      },
    };
    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { apps: updatedApps } : {}),
    }, targetChildId);

    eventBus.publish('APP_VISIBILITY_CHANGED', { appId, isHidden: newHidden, childId: targetChildId }, 'parent');
    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildSettingsToCloud(parentId, targetChildId, { apps: updatedApps }).catch(() => {});
      sendRemoteCommandToKid(parentId, targetChildId, 'update_app_rule', { appId, isHidden: newHidden }).catch(() => {});
    }
  };

  const toggleAppFavorite = (appId: string, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const targetApps = currentSettings.apps || state.apps;
    const target = targetApps.find((a) => a.id === appId);
    if (!target) return;
    const newFav = !target.isFavorite;
    const updatedApps = targetApps.map((a) => (a.id === appId ? { ...a, isFavorite: newFav } : a));

    const isCur = state.selectedChildId === targetChildId;
    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        apps: updatedApps,
      },
    };
    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { apps: updatedApps } : {}),
    }, targetChildId);

    eventBus.publish('APP_FAVORITE_CHANGED', { appId, isFavorite: newFav, childId: targetChildId }, 'parent');
    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildSettingsToCloud(parentId, targetChildId, { apps: updatedApps }).catch(() => {});
    }
  };

  const updateAppRule = (appId: string, updates: Partial<AppItem>, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const targetApps = currentSettings.apps || state.apps;
    const updatedApps = targetApps.map((a) => (a.id === appId ? { ...a, ...updates } : a));

    const isCur = state.selectedChildId === targetChildId;
    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        apps: updatedApps,
      },
    };
    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { apps: updatedApps } : {}),
    }, targetChildId);

    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildSettingsToCloud(parentId, targetChildId, { apps: updatedApps }).catch(() => {});
    }
  };

  const toggleSafeZone = (zoneId: string) => {
    const updatedZones = state.safeZones.map((z) => (z.id === zoneId ? { ...z, isActive: !z.isActive } : z));
    saveAndNotify({ ...state, safeZones: updatedZones });
    const activeParentId = getActiveParentId();
    if (activeParentId) {
      syncSafeZonesToCloud(activeParentId, updatedZones).catch(() => {});
    }
    eventBus.publish('SAFE_ZONE_TOGGLED', { zoneId }, 'parent');
  };

  const addSafeZone = (zone: SafeZone) => {
    const updatedZones = [...state.safeZones, zone];
    saveAndNotify({ ...state, safeZones: updatedZones });
    const activeParentId = getActiveParentId();
    if (activeParentId) {
      syncSafeZonesToCloud(activeParentId, updatedZones).catch(() => {});
    }
    eventBus.publish('SAFE_ZONE_TOGGLED', { zoneId: zone.id }, 'parent');
  };

  const deleteSafeZone = (zoneId: string) => {
    const updatedZones = state.safeZones.filter((z) => z.id !== zoneId);
    saveAndNotify({ ...state, safeZones: updatedZones });
    const activeParentId = getActiveParentId();
    if (activeParentId) {
      syncSafeZonesToCloud(activeParentId, updatedZones).catch(() => {});
    }
    eventBus.publish('SAFE_ZONE_TOGGLED', { zoneId }, 'parent');
  };

  const updateSafeZone = (zone: SafeZone) => {
    const updatedZones = state.safeZones.map((z) => (z.id === zone.id ? zone : z));
    saveAndNotify({ ...state, safeZones: updatedZones });
    const activeParentId = getActiveParentId();
    if (activeParentId) {
      syncSafeZonesToCloud(activeParentId, updatedZones).catch(() => {});
    }
    eventBus.publish('SAFE_ZONE_TOGGLED', { zoneId: zone.id }, 'parent');
  };

  const addRoutePoint = (point: RoutePoint) => {
    const updatedHistory = [...state.routeHistory, point];
    saveAndNotify({ ...state, routeHistory: updatedHistory });
  };

  const toggleContentFilter = (filterId: string) => {
    const updated = state.contentFilters.map((f) => (f.id === filterId ? { ...f, isBlocked: !f.isBlocked } : f));
    saveAndNotify({ ...state, contentFilters: updated });
  };

  const toggleStudyMode = (enable?: boolean) => {
    const nextVal = enable !== undefined ? enable : !state.studyModeOnly;
    saveAndNotify({ ...state, studyModeOnly: nextVal });
    eventBus.publish('STUDY_MODE_TOGGLED', nextVal, 'parent');
  };

  const triggerSOS = (customSos?: { childId?: string; lat?: number; lng?: number; address?: string }) => {
    const now = Date.now();
    // 5s cooldown to prevent double taps / rapid button spam
    if (now - lastTriggerSosCallTimestamp < 5000 && state.activeSOS) {
      return;
    }
    lastTriggerSosCallTimestamp = now;

    const kidPaired = getKidDevicePairedInfo();
    const effectiveChildId = customSos?.childId || kidPaired?.childId || state.selectedChildId;
    const parentId = kidPaired?.parentId || getActiveParentId();
    const targetChild = state.children?.find((c) => c.id === effectiveChildId) || state.child;
    const sosInfo = {
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      lat: customSos?.lat ?? targetChild.lat,
      lng: customSos?.lng ?? targetChild.lng,
      address: customSos?.address || targetChild.currentAddress,
      childName: kidPaired?.childName || targetChild.name,
    };
    eventBus.publish('SOS_TRIGGERED', sosInfo, 'child');
    if (parentId && effectiveChildId) {
      triggerCloudSOS(parentId, effectiveChildId, sosInfo).catch(() => {});
    }
  };

  const cancelSOS = (childId?: string) => {
    lastTriggerSosCallTimestamp = 0;
    const now = Date.now();
    dismissedSosTimestamp = now;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('parentpro_dismissed_sos_time', String(now));
      } catch (e) {}
    }
    const effectiveChildId = childId || state.sosDetails?.childId || state.selectedChildId;
    saveAndNotify({ ...state, activeSOS: false });
    eventBus.publish('SOS_CANCELLED', { childId: effectiveChildId }, 'parent');
    const parentId = getActiveParentId();
    const childrenToClear = state.children && state.children.length > 0 ? state.children : (state.child ? [state.child] : []);
    clearAllFamilySosInCloud(parentId, childrenToClear).catch(() => {});
    if (effectiveChildId) {
      resolveCloudSOS(parentId, effectiveChildId).catch(() => {});
    }
  };

  const requestTimeExtension = (appName: string, requestedMinutes: number, reason: string) => {
    const parentId = getActiveParentId();
    const kidPaired = getKidDevicePairedInfo();
    const effectiveChildId = kidPaired?.childId || state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === effectiveChildId) || state.child;
    const childName = kidPaired?.childName || targetChild?.name || 'Bé';
    const req = {
      appName,
      requestedMinutes,
      reason,
      childName,
      childId: effectiveChildId,
    };
    sendCloudTimeRequest(parentId, effectiveChildId, req).catch(() => {});
    const fullReq: TimeRequest = {
      id: 'req_' + Date.now(),
      ...req,
      status: 'pending',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    eventBus.publish('TIME_EXTENSION_REQUESTED', fullReq, 'child');
  };

  const decideTimeRequest = (reqId: string, status: 'approved' | 'rejected') => {
    const parentId = getActiveParentId();
    const pendingReq = state.timeRequests.find((r) => r.id === reqId);
    const targetChildId = pendingReq?.childId || state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    const childName = pendingReq?.childName || targetChild?.name;

    resolveCloudTimeRequest(parentId, targetChildId, reqId, status, childName).catch(() => {});
    if (status === 'approved') {
      const extraMinutes = pendingReq?.requestedMinutes || 15;
      extendChildTimeNow(extraMinutes, targetChildId);
    } else {
      dispatchRemoteCommand('broadcast_msg', {
        id: `rej_${Date.now()}`,
        title: 'Yêu cầu thêm giờ',
        message: `Bố mẹ chưa duyệt thêm giờ lúc này. Con hãy nghỉ ngơi hoặc hoàn thành bài tập nhé!`,
        sticker: '⏳',
        speakTTS: false,
      }, targetChildId, 'Từ chối xin thêm giờ ⏱️');
    }
    const updated = state.timeRequests.map((r) => (r.id === reqId ? { ...r, status } : r));
    saveAndNotify({ ...state, timeRequests: updated });
    eventBus.publish('TIME_EXTENSION_RESOLVED', { reqId, status, childId: targetChildId, childName }, 'parent');
  };

  const buzzKidPhone = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    dispatchRemoteCommand('buzz_siren', undefined, targetId, 'Hú còi tìm máy khẩn cấp 🚨');
  };

  const lockChildDeviceNow = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const updatedLock: LockChallengeState = {
      ...currentSettings.lockChallenge,
      isLocked: true,
      lockType: 'instant',
      title: 'Thiết bị đang bị khóa từ xa',
      description: 'Bố mẹ đã tạm khóa thiết bị. Con hãy nghỉ ngơi một chút nhé!',
    };
    saveAndNotify({
      ...state,
      lockChallenge: updatedLock,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          lockChallenge: updatedLock,
          isLocked: true,
        },
      },
    });
    dispatchRemoteCommand('lock_now', {
      title: 'Thiết bị đang bị khóa từ xa',
      description: 'Bố mẹ đã tạm khóa thiết bị. Con hãy nghỉ ngơi một chút nhé!',
    }, targetId, 'Khóa máy tức thì 🔒');
  };

  const unlockChildDeviceNow = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const updatedLock: LockChallengeState = {
      ...currentSettings.lockChallenge,
      isLocked: false,
      lockType: 'none',
    };
    saveAndNotify({
      ...state,
      lockChallenge: updatedLock,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          lockChallenge: updatedLock,
          isLocked: false,
        },
      },
    });
    if (!isKidAppMode()) {
      dispatchRemoteCommand('unlock_now', undefined, targetId, 'Mở khóa thiết bị 🔓');
    }
  };

  const extendChildTimeNow = (minutes: number, childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const currentLimit = currentSettings.screenTimeLimitMinutes || 135;
    const newLimit = minutes === -1 ? Math.max(currentLimit, 1440) : (currentLimit + minutes);
    const updatedLock: LockChallengeState = {
      ...currentSettings.lockChallenge,
      isLocked: false,
      lockType: 'none',
    };
    saveAndNotify({
      ...state,
      lockChallenge: updatedLock,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          screenTimeLimitMinutes: newLimit,
          lockChallenge: updatedLock,
          isLocked: false,
        },
      },
    });
    if (!isKidAppMode()) {
      if (minutes === -1) {
        dispatchRemoteCommand('unlock_now', { minutes: -1 }, targetId, 'Mở khóa dùng tự do 🔓');
      } else {
        dispatchRemoteCommand('extend_time', { minutes }, targetId, `Cộng thêm +${minutes} phút ⏱️`);
      }
    }
  };

  // =========================================================================
  // PC Control Actions (Multi-device Computer Protection)
  // =========================================================================
  const lockChildPcNow = (childId?: string, reason?: string) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const prevPcConfig = currentSettings.pcConfig || DEFAULT_PC_CONFIG;
    const defaultMsg = 'Bố mẹ đã tạm khóa máy tính. Con hãy nghỉ ngơi hoặc đi học bài nhé!';
    const updatedPcConfig: ChildPcControlConfig = {
      ...prevPcConfig,
      isLocked: true,
      lockReason: reason || defaultMsg,
    };
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          pcConfig: updatedPcConfig,
        },
      },
    });
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_lock', {
        title: 'Máy tính đang bị khóa từ xa',
        reason: updatedPcConfig.lockReason,
        description: updatedPcConfig.lockReason,
      }, targetChild?.name).catch(() => {});
      syncChildPcConfigToCloud(parentId, targetId, updatedPcConfig, targetChild?.name).catch(() => {});
    }
  };

  const unlockChildPcNow = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const prevPcConfig = currentSettings.pcConfig || DEFAULT_PC_CONFIG;
    const updatedPcConfig: ChildPcControlConfig = {
      ...prevPcConfig,
      isLocked: false,
      lockReason: '',
    };
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          pcConfig: updatedPcConfig,
        },
      },
    });
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_unlock', undefined, targetChild?.name).catch(() => {});
      syncChildPcConfigToCloud(parentId, targetId, updatedPcConfig, targetChild?.name).catch(() => {});
    }
  };

  const shutdownChildPc = (childId?: string, delaySeconds: number = 0) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_shutdown', { delaySeconds }, targetChild?.name).catch(() => {});
    }
  };

  const restartChildPc = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_restart', undefined, targetChild?.name).catch(() => {});
    }
  };

  const sleepChildPc = (childId?: string) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_sleep', undefined, targetChild?.name).catch(() => {});
    }
  };

  const toggleChildPcStudyMode = (childId?: string, enabled?: boolean) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const prevPcConfig = currentSettings.pcConfig || DEFAULT_PC_CONFIG;
    const newStudyMode = enabled !== undefined ? enabled : !prevPcConfig.isStudyMode;
    const updatedPcConfig: ChildPcControlConfig = {
      ...prevPcConfig,
      isStudyMode: newStudyMode,
    };
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          pcConfig: updatedPcConfig,
        },
      },
    });
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_study_mode', { enabled: newStudyMode }, targetChild?.name).catch(() => {});
      syncChildPcConfigToCloud(parentId, targetId, updatedPcConfig, targetChild?.name).catch(() => {});
    }
  };

  const updateChildPcConfig = (childId: string, partial: Partial<ChildPcControlConfig>) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const prevPcConfig = currentSettings.pcConfig || DEFAULT_PC_CONFIG;
    const updatedPcConfig: ChildPcControlConfig = {
      ...prevPcConfig,
      ...partial,
    };
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          pcConfig: updatedPcConfig,
        },
      },
    });
    if (parentId && targetId) {
      syncChildPcConfigToCloud(parentId, targetId, updatedPcConfig, targetChild?.name).catch(() => {});
    }
  };

  const sendPcBroadcastMessage = (childId: string, message: string, sticker?: string) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const targetChild = state.children.find((c) => c.id === targetId) || state.child;
    if (parentId && targetId) {
      sendRemotePcCommand(parentId, targetId, 'pc_broadcast', {
        title: 'Lời dặn từ Bố Mẹ',
        message,
        sticker: sticker || '📢',
        timestamp: Date.now(),
      }, targetChild?.name).catch(() => {});
    }
  };

  const updateChildPcTelemetry = (childId: string, telemetry: ChildPcTelemetry) => {
    const targetId = childId || state.selectedChildId;
    const parentId = getActiveParentId();
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          pcTelemetry: telemetry,
        },
      },
    });
    if (parentId && targetId) {
      uploadChildPcTelemetry(parentId, targetId, telemetry).catch(() => {});
    }
  };

  const incrementScreenTimeUsed = (childId?: string, minutes: number = 1) => {
    const targetId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetId] || createDefaultChildSettings(targetId);
    const newUsed = (currentSettings.screenTime?.todayTotalMinutes || 0) + minutes;
    const updatedScreenTime: ScreenTimeData = {
      ...currentSettings.screenTime,
      todayTotalMinutes: newUsed,
    };
    const isCur = state.selectedChildId === targetId;
    saveAndNotify({
      ...state,
      childSettings: {
        ...state.childSettings,
        [targetId]: {
          ...currentSettings,
          screenTime: updatedScreenTime,
        },
      },
      ...(isCur ? { screenTime: updatedScreenTime } : {}),
    }, targetId);
  };

  const toggleTaskCompleted = (taskId: string, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const targetChild = state.children.find((c) => c.id === targetChildId) || state.child;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const task = currentSettings.kidTasks.find((t) => t.id === taskId) || state.kidTasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextCompleted = !task.completed;
    const starDelta = nextCompleted ? task.stars : -task.stars;
    const newKidStars = Math.max(0, (currentSettings.kidStars || 0) + starDelta);

    const updatedTasks = currentSettings.kidTasks.map((t) =>
      t.id === taskId ? { ...t, completed: nextCompleted } : t
    );

    let updatedHistory = currentSettings.starHistory || [];
    if (nextCompleted) {
      const transaction: StarTransaction = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        childId: targetChildId,
        childName: targetChild.name,
        type: 'task_reward',
        stars: task.stars,
        title: `Hoàn thành việc: ${task.title}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
      };
      updatedHistory = [transaction, ...updatedHistory];
    }

    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        kidTasks: updatedTasks,
        kidStars: newKidStars,
        starHistory: updatedHistory,
      },
    };

    const isCur = state.selectedChildId === targetChildId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { kidTasks: updatedTasks, kidStars: newKidStars } : {}),
      ...(nextCompleted && updatedHistory[0] ? { starHistory: [updatedHistory[0], ...state.starHistory] } : {}),
    };

    saveAndNotify(nextState, targetChildId);
    eventBus.publish('TASK_STATUS_CHANGED', { taskId, completed: nextCompleted, childId: targetChildId, starsDelta: starDelta, newStars: newKidStars }, 'child');
    const parentId = getActiveParentId();
    if (parentId && targetChildId) {
      syncChildStarsToCloud(parentId, targetChildId, newKidStars, nextCompleted ? updatedHistory[0] : undefined, targetChild?.name).catch(() => {});
      syncChildSettingsToCloud(parentId, targetChildId, { kidTasks: updatedTasks, kidStars: newKidStars }, targetChild?.name).catch(() => {});
    }
  };

  const markAlertAsRead = (alertId: string) => {
    const updated = state.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a));
    saveAndNotify({ ...state, alerts: updated });
  };

  const markChatAlertsAsRead = (childId?: string) => {
    const updated = state.alerts.map((a) => {
      const isChat = a.id.startsWith('chat_') || a.type === 'parent_message';
      if (isChat && (!childId || !a.childId || a.childId === childId)) {
        return { ...a, isRead: true };
      }
      return a;
    });
    saveAndNotify({ ...state, alerts: updated });
  };

  const clearAllAlerts = () => {
    saveAndNotify({ ...state, alerts: [] });
  };

  const toggleTheme = () => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    saveAndNotify({ ...state, theme: nextTheme });
  };

  const updateDeviceConnection = (deviceId: string, isConnected: boolean) => {
    const updated = state.devices.map((d) =>
      d.id === deviceId
        ? {
            ...d,
            isConnected,
            statusText: isConnected ? 'Đang kết nối • Tín hiệu tốt' : 'Đã ngắt kết nối',
          }
        : d
    );
    saveAndNotify({ ...state, devices: updated });
  };

  const addSmartDevice = (device: ConnectedDevice) => {
    const updated = [...state.devices, device];
    saveAndNotify({ ...state, devices: updated });
  };

  const deleteSmartDevice = (deviceId: string) => {
    const updated = state.devices.filter((d) => d.id !== deviceId);
    saveAndNotify({ ...state, devices: updated });
  };

  const addFamilyMember = (member: FamilyMember) => {
    const updated = [...state.family, member];
    saveAndNotify({ ...state, family: updated });
  };

  const updateFamilyMemberRole = (memberId: string, role: string) => {
    const updated = state.family.map((m) => (m.id === memberId ? { ...m, role } : m));
    saveAndNotify({ ...state, family: updated });
  };

  const deleteFamilyMember = (memberId: string) => {
    const updated = state.family.filter((m) => m.id !== memberId);
    saveAndNotify({ ...state, family: updated });
  };

  const addKidTask = (task: KidTask, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedTasks = [task, ...currentSettings.kidTasks];
    const isCur = state.selectedChildId === targetChildId;

    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        kidTasks: updatedTasks,
      },
    };

    saveAndNotify({
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { kidTasks: updatedTasks } : {}),
    }, targetChildId);

    eventBus.publish('TASK_STATUS_CHANGED', { taskId: task.id, childId: targetChildId, newTask: true }, 'parent');
  };

  const updateHealthGoals = (goals: { stepGoal?: number; activeGoalMinutes?: number; sleepHours?: number }) => {
    const updatedHealth: HealthData = {
      ...state.health,
      ...(goals.stepGoal !== undefined ? { stepGoal: goals.stepGoal } : {}),
      ...(goals.activeGoalMinutes !== undefined ? { activeGoalMinutes: goals.activeGoalMinutes } : {}),
      ...(goals.sleepHours !== undefined ? { sleepHours: goals.sleepHours } : {}),
    };
    saveAndNotify({ ...state, health: updatedHealth });
  };

  const activatePremiumSubscription = (plan: 'monthly' | 'yearly') => {
    const now = new Date();
    const expiry = new Date();
    if (plan === 'yearly') {
      expiry.setFullYear(now.getFullYear() + 1);
    } else {
      expiry.setMonth(now.getMonth() + 1);
    }

    saveAndNotify({
      ...state,
      isPremium: true,
      premiumPlan: plan,
      premiumExpiresAt: expiry.toLocaleDateString('vi-VN'),
    });
  };

  const switchChild = (childId: string) => {
    let targetChild = state.children.find((c) => c.id === childId);
    if (!targetChild) {
      const paired = getKidDevicePairedInfo();
      if (paired && paired.childId === childId) {
        targetChild = {
          id: childId,
          name: paired.childName || 'Bé',
          age: paired.childAge || 10,
          grade: paired.childAge ? `${paired.childAge} tuổi` : 'Lớp 4',
          school: 'Tiểu học',
          avatar: paired.childAvatar || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150',
          battery: 100,
          speed: 0,
          status: 'online',
          lat: 21.0285,
          lng: 105.8542,
          currentAddress: 'Đang hoạt động',
          lastUpdated: 'Vừa xong',
        };
      } else if (state.child && state.child.id === childId) {
        targetChild = state.child;
      } else {
        return;
      }
    }
    const settings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const nextState: AppState = {
      ...state,
      selectedChildId: childId,
      child: targetChild,
      apps: settings.apps,
      screenTime: settings.screenTime,
      hardwareControls: settings.hardwareControls,
      kioskMode: settings.kioskMode,
      lockChallenge: settings.lockChallenge,
      smartRoutines: settings.smartRoutines,
      kidTasks: settings.kidTasks,
      kidStars: settings.kidStars,
      activeOpenedApp: settings.activeOpenedApp || null,
      activeReminder: settings.activeReminder || null,
      lastVoiceGuide: settings.lastVoiceGuide || '',
    };
    saveAndNotify(nextState);
    if (!isKidAppMode()) {
      eventBus.publish('CHILD_SWITCHED', { childId, name: targetChild.name }, 'parent');
    }
  };

  const addChild = (profile: Partial<ChildProfile>, initialSettings?: Partial<ChildSpecificSettings>) => {
    const newId = profile.id || ('child_' + Date.now());
    const currentYear = new Date().getFullYear();
    const birthYear = profile.birthYear || (profile.age ? currentYear - profile.age : 2018);
    const age = profile.birthYear ? Math.max(1, currentYear - profile.birthYear) : (profile.age || 8);

    const defaultDevices: ChildDeviceInfo[] = profile.devices || (profile.phone ? [{
      deviceId: 'dev_' + newId,
      hardwareIdType: 'imei',
      deviceName: 'Điện thoại của bé',
      model: 'Android Device',
      phoneNumber: profile.phone,
      osVersion: 'Android',
      pairedAt: new Date().toISOString(),
      status: 'online',
    }] : []);

    const newChild: ChildProfile = {
      id: newId,
      name: profile.name || 'Bé mới',
      grade: profile.grade || 'Lớp 3',
      school: profile.school || 'Trường Tiểu học',
      avatar: profile.avatar || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      battery: 85,
      speed: 0,
      currentAddress: '123 Nguyễn Văn Cừ, Quận 1, TP. HCM',
      lat: 10.762622,
      lng: 106.682245,
      lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      ...profile,
      birthYear,
      age,
      devices: defaultDevices,
      activeDeviceId: defaultDevices[0]?.deviceId,
    };
    const newSettings = createDefaultChildSettings(newId, initialSettings);
    const updatedChildren = [...state.children.filter((c) => c.id !== newId), newChild];
    const updatedChildSettings = { ...state.childSettings, [newId]: newSettings };

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      childSettings: updatedChildSettings,
      selectedChildId: newId,
      child: newChild,
      apps: newSettings.apps,
      screenTime: newSettings.screenTime,
      hardwareControls: newSettings.hardwareControls,
      kioskMode: newSettings.kioskMode,
      lockChallenge: newSettings.lockChallenge,
      smartRoutines: newSettings.smartRoutines,
      kidTasks: newSettings.kidTasks,
      kidStars: newSettings.kidStars,
    };
    saveAndNotify(nextState);
    eventBus.publish('CHILD_ADDED', newChild, 'parent');
    eventBus.publish('CHILD_SWITCHED', { childId: newId, name: newChild.name }, 'parent');

    // Persist child to Cloud Firestore if parent is active
    const activeParentId = getActiveParentId();
    if (activeParentId) {
      saveChildProfileToCloud(activeParentId, newChild).catch(() => {});
      syncChildSettingsToCloud(activeParentId, newId, newSettings).catch(() => {});
    }
  };

  const addOrUpdateChildDevice = (childId: string, deviceInfo: ChildDeviceInfo) => {
    const targetChild = state.children.find((c) => c.id === childId);
    if (!targetChild) return;

    const existingDevices = targetChild.devices ? [...targetChild.devices] : [];
    const existingIndex = existingDevices.findIndex((d) => d.deviceId === deviceInfo.deviceId);

    let updatedDevices: ChildDeviceInfo[];
    if (existingIndex >= 0) {
      updatedDevices = [...existingDevices];
      updatedDevices[existingIndex] = {
        ...updatedDevices[existingIndex],
        ...deviceInfo,
        lastActive: new Date().toISOString(),
      };
    } else {
      updatedDevices = [...existingDevices, { ...deviceInfo, lastActive: new Date().toISOString() }];
    }

    const updatedChild: ChildProfile = {
      ...targetChild,
      devices: updatedDevices,
      activeDeviceId: deviceInfo.deviceId,
      phone: targetChild.phone || deviceInfo.phoneNumber || targetChild.phone,
    };

    const updatedChildren = state.children.map((c) => (c.id === childId ? updatedChild : c));
    const isSelected = state.selectedChildId === childId;

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      child: isSelected ? updatedChild : state.child,
    };
    saveAndNotify(nextState);

    const activeParentId = getActiveParentId();
    if (activeParentId) {
      saveChildProfileToCloud(activeParentId, updatedChild).catch(() => {});
    }
  };

  const updateChildDeviceName = (childId: string, deviceId: string, newDeviceName: string) => {
    const targetChild = state.children.find((c) => c.id === childId);
    if (!targetChild || !targetChild.devices) return;

    const updatedDevices = targetChild.devices.map((d) =>
      d.deviceId === deviceId ? { ...d, deviceName: newDeviceName.trim() } : d
    );

    const updatedChild: ChildProfile = {
      ...targetChild,
      devices: updatedDevices,
    };

    const updatedChildren = state.children.map((c) => (c.id === childId ? updatedChild : c));
    const isSelected = state.selectedChildId === childId;

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      child: isSelected ? updatedChild : state.child,
    };
    saveAndNotify(nextState);

    const activeParentId = getActiveParentId();
    if (activeParentId) {
      saveChildProfileToCloud(activeParentId, updatedChild).catch(() => {});
    }
  };

  const switchActiveChildDevice = (childId: string, deviceId: string) => {
    const targetChild = state.children.find((c) => c.id === childId);
    if (!targetChild) return;

    const updatedChild: ChildProfile = {
      ...targetChild,
      activeDeviceId: deviceId,
    };

    const updatedChildren = state.children.map((c) => (c.id === childId ? updatedChild : c));
    const isSelected = state.selectedChildId === childId;

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      child: isSelected ? updatedChild : state.child,
    };
    saveAndNotify(nextState);
  };

  const updateDeviceTelemetry = (childId: string, deviceId: string, telemetry: Partial<DeviceTelemetryData>) => {
    const targetChild = state.children.find((c) => c.id === childId);
    if (!targetChild) return;

    const existingDevices = targetChild.devices ? [...targetChild.devices] : [];
    const existingIndex = existingDevices.findIndex((d) => d.deviceId === deviceId);
    if (existingIndex < 0) return;

    const dev = existingDevices[existingIndex];
    const updatedTelemetry: DeviceTelemetryData = {
      deviceId,
      lat: telemetry.lat ?? dev.lat ?? targetChild.lat,
      lng: telemetry.lng ?? dev.lng ?? targetChild.lng,
      accuracy: telemetry.accuracy ?? 12,
      speed: telemetry.speed ?? dev.speed ?? 0,
      battery: telemetry.battery ?? dev.battery ?? 100,
      currentAddress: telemetry.currentAddress ?? dev.currentAddress ?? targetChild.currentAddress,
      isScreenOn: telemetry.isScreenOn ?? dev.isScreenOn ?? true,
      screenState: telemetry.screenState ?? dev.screenState ?? 'active',
      appStatus: telemetry.appStatus ?? dev.appStatus ?? 'active_in_app',
      syncMode: telemetry.syncMode ?? 'realtime',
      lastActive: new Date().toISOString(),
      updatedAt: Date.now(),
      ...telemetry,
    };

    const updatedDevice: ChildDeviceInfo = {
      ...dev,
      lat: updatedTelemetry.lat,
      lng: updatedTelemetry.lng,
      speed: updatedTelemetry.speed,
      battery: updatedTelemetry.battery,
      currentAddress: updatedTelemetry.currentAddress,
      isScreenOn: updatedTelemetry.isScreenOn,
      screenState: updatedTelemetry.screenState,
      appStatus: updatedTelemetry.appStatus,
      lastActive: updatedTelemetry.lastActive,
      telemetry: updatedTelemetry,
    };

    const updatedDevices = [...existingDevices];
    updatedDevices[existingIndex] = updatedDevice;

    const isMainDev = dev.isPrimary || targetChild.activeDeviceId === deviceId;
    const updatedChild: ChildProfile = {
      ...targetChild,
      devices: updatedDevices,
      ...(isMainDev ? {
        lat: updatedTelemetry.lat,
        lng: updatedTelemetry.lng,
        speed: updatedTelemetry.speed,
        battery: updatedTelemetry.battery,
        currentAddress: updatedTelemetry.currentAddress,
        isScreenOn: updatedTelemetry.isScreenOn,
        screenState: updatedTelemetry.screenState,
        appStatus: updatedTelemetry.appStatus,
      } : {}),
    };

    const updatedChildren = state.children.map((c) => (c.id === childId ? updatedChild : c));
    const isSelected = state.selectedChildId === childId;

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      child: isSelected ? updatedChild : state.child,
    };
    saveAndNotify(nextState);
  };

  const deleteChild = (childId: string) => {
    const updatedChildren = state.children.filter((c) => c.id !== childId);
    const nextSelectedId = updatedChildren.length > 0 ? updatedChildren[0].id : '';
    const nextChild =
      updatedChildren.length > 0
        ? updatedChildren[0]
        : isSimulatorMode()
        ? INITIAL_CHILDREN[0]
        : getInitialRealState().child;

    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      selectedChildId: nextSelectedId,
      child: nextChild,
    };
    saveAndNotify(nextState);

    const activeParentId = getActiveParentId();
    if (activeParentId) {
      deleteChildFromCloud(activeParentId, childId).catch(() => {});
    }
  };

  const setCustomScreenTimeLimit = (childId: string, totalMinutes: number) => {
    const targetSettings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const updatedChildSettings = {
      ...state.childSettings,
      [childId]: {
        ...targetSettings,
        screenTimeLimitMinutes: totalMinutes,
      },
    };
    const isCur = state.selectedChildId === childId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? {
        screenTime: {
          ...state.screenTime,
        }
      } : {}),
    };
    saveAndNotify(nextState, childId);
  };

  const setTrackingCollectionConfig = (childId: string, config: Partial<TrackingCollectionConfig>) => {
    const targetSettings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const existingConfig = targetSettings.trackingConfig || DEFAULT_TRACKING_CONFIG;
    const newConfig: TrackingCollectionConfig = {
      ...existingConfig,
      ...config,
    };
    const updatedChildSettings = {
      ...state.childSettings,
      [childId]: {
        ...targetSettings,
        trackingConfig: newConfig,
      },
    };
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
    };
    saveAndNotify(nextState, childId);
    eventBus.publish('TRACKING_CONFIG_CHANGED', { childId, config: newConfig }, isKidAppMode() ? 'child' : 'parent');

    const activeParentId = getActiveParentId();
    if (activeParentId && childId) {
      syncChildSettingsToCloud(activeParentId, childId, { trackingConfig: newConfig }).catch(() => {});
    }
  };

  const setSensorThresholds = (profanityPenaltyMinutes?: number, noiseThresholdDb?: number) => {
    const updated: SmartRoutines = {
      ...state.smartRoutines,
      profanityPenaltyMinutes: profanityPenaltyMinutes ?? state.smartRoutines.profanityPenaltyMinutes ?? 10,
      noiseThresholdDb: noiseThresholdDb ?? state.smartRoutines.noiseThresholdDb ?? 85,
    };
    saveAndNotify({ ...state, smartRoutines: updated });
    eventBus.publish('SMART_ROUTINE_CHANGED', updated, 'parent');
  };

  const setSmartRoutineTimeRange = (type: 'mealtime' | 'bedtime', start: string, end: string) => {
    const updated: SmartRoutines = {
      ...state.smartRoutines,
      ...(type === 'mealtime' ? { mealtimeStart: start, mealtimeEnd: end } : { bedtimeStart: start, bedtimeEnd: end }),
    };
    saveAndNotify({ ...state, smartRoutines: updated });
    eventBus.publish('SMART_ROUTINE_CHANGED', updated, 'parent');
  };

  const updateSmartRoutines = (newRoutines: Partial<SmartRoutines>, targetChildId?: string) => {
    const effectiveChildId = targetChildId || state.selectedChildId || state.child?.id;
    const currentSettings = effectiveChildId ? (state.childSettings[effectiveChildId] || createDefaultChildSettings(effectiveChildId)) : null;

    const mergedRoutines: SmartRoutines = {
      ...state.smartRoutines,
      ...(currentSettings?.smartRoutines || {}),
      ...newRoutines,
    };

    let updatedChildSettings = { ...state.childSettings };
    if (effectiveChildId && currentSettings) {
      updatedChildSettings[effectiveChildId] = {
        ...currentSettings,
        smartRoutines: mergedRoutines,
      };
    }

    const nextState: AppState = {
      ...state,
      smartRoutines: mergedRoutines,
      childSettings: updatedChildSettings,
    };

    saveAndNotify(nextState, effectiveChildId);
    eventBus.publish('SMART_ROUTINE_CHANGED', mergedRoutines, 'parent');
  };

  const getFamilyAggregatedStats = () => {
    const children = state.children || [];
    let totalUsedMinutes = 0;
    let totalLimitMinutes = 0;
    let totalStars = 0;
    let onlineCount = 0;
    let studyingCount = 0;

    children.forEach((c) => {
      const s = state.childSettings[c.id];
      if (s) {
        totalUsedMinutes += s.screenTime?.todayTotalMinutes || 0;
        totalLimitMinutes += s.screenTimeLimitMinutes || 120;
        totalStars += s.kidStars || 0;
      }
      if (c.status === 'online') onlineCount++;
      else if (c.status === 'studying') studyingCount++;
    });

    return {
      childCount: children.length,
      totalUsedMinutes,
      totalLimitMinutes,
      totalStars,
      onlineCount,
      studyingCount,
      allProtected: true,
    };
  };

  const lockAllChildrenForMealtime = () => {
    const updatedChildSettings = { ...state.childSettings };
    const updatedRoutines = { ...state.smartRoutines, mealtimeLock: true };
    const lock: LockChallengeState = {
      isLocked: true,
      lockType: 'mealtime',
      title: 'Giờ cơm gia đình 🍽️',
      description: 'Cả nhà cùng quây quần bên mâm cơm nhé con!',
    };

    Object.keys(updatedChildSettings).forEach((cid) => {
      updatedChildSettings[cid] = {
        ...updatedChildSettings[cid],
        smartRoutines: { ...updatedChildSettings[cid].smartRoutines, mealtimeLock: true },
        lockChallenge: lock,
      };
    });

    const nextState: AppState = {
      ...state,
      smartRoutines: updatedRoutines,
      lockChallenge: lock,
      childSettings: updatedChildSettings,
    };
    saveAndNotify(nextState);
    eventBus.publish('LOCK_CHALLENGE_UPDATED', lock, 'parent');
    eventBus.publish('SMART_ROUTINE_CHANGED', updatedRoutines, 'parent');
    eventBus.publish('FAMILY_ACTION_TRIGGERED', { action: 'mealtimeLock', enabled: true }, 'parent');
  };

  const lockAllChildrenForBedtime = () => {
    const updatedChildSettings = { ...state.childSettings };
    const updatedRoutines = { ...state.smartRoutines, bedtimeLock: true };
    const lock: LockChallengeState = {
      isLocked: true,
      lockType: 'bedtime',
      title: 'Đã đến giờ đi ngủ 🌙',
      description: 'Chúc con ngủ thật ngon và mơ đẹp!',
    };

    Object.keys(updatedChildSettings).forEach((cid) => {
      updatedChildSettings[cid] = {
        ...updatedChildSettings[cid],
        smartRoutines: { ...updatedChildSettings[cid].smartRoutines, bedtimeLock: true },
        lockChallenge: lock,
      };
    });

    const nextState: AppState = {
      ...state,
      smartRoutines: updatedRoutines,
      lockChallenge: lock,
      childSettings: updatedChildSettings,
    };
    saveAndNotify(nextState);
    eventBus.publish('LOCK_CHALLENGE_UPDATED', lock, 'parent');
    eventBus.publish('SMART_ROUTINE_CHANGED', updatedRoutines, 'parent');
    eventBus.publish('FAMILY_ACTION_TRIGGERED', { action: 'bedtimeLock', enabled: true }, 'parent');
  };

  const unlockAllChildren = () => {
    const updatedChildSettings = { ...state.childSettings };
    const lock: LockChallengeState = {
      isLocked: false,
      lockType: 'none',
      title: '',
      description: '',
    };

    Object.keys(updatedChildSettings).forEach((cid) => {
      updatedChildSettings[cid] = {
        ...updatedChildSettings[cid],
        smartRoutines: {
          ...updatedChildSettings[cid].smartRoutines,
          mealtimeLock: false,
          bedtimeLock: false,
        },
        lockChallenge: lock,
      };
    });

    const nextState: AppState = {
      ...state,
      smartRoutines: { ...state.smartRoutines, mealtimeLock: false, bedtimeLock: false },
      lockChallenge: lock,
      childSettings: updatedChildSettings,
    };
    saveAndNotify(nextState);
    eventBus.publish('LOCK_CHALLENGE_UPDATED', lock, 'parent');
    eventBus.publish('FAMILY_ACTION_TRIGGERED', { action: 'unlockAll' }, 'parent');
  };

  const toggleStudyModeAll = (enable?: boolean) => {
    const nextVal = enable !== undefined ? enable : !state.studyModeOnly;
    const nextState: AppState = {
      ...state,
      studyModeOnly: nextVal,
    };
    saveAndNotify(nextState);
    eventBus.publish('STUDY_MODE_TOGGLED', nextVal, 'parent');
    eventBus.publish('FAMILY_ACTION_TRIGGERED', { action: 'studyModeAll', enabled: nextVal }, 'parent');
  };

  const triggerFamilyBroadcast = (message: string, sticker: string = '📢') => {
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const msg: BroadcastMessage = {
      id: `broadcast_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: `${sticker} Lời nhắn từ Bố Mẹ`,
      message,
      isShowing: true,
      timestamp: timeStr,
      createdAt: now,
    };
    saveAndNotify({ ...state, broadcastMessage: msg });
    eventBus.publish('BROADCAST_MESSAGE_SENT', msg, 'parent');
    eventBus.publish('FAMILY_ACTION_TRIGGERED', { action: 'familyBroadcast', message }, 'parent');

    // Real-time broadcast command to all connected children
    const parentId = getActiveParentId();
    if (parentId) {
      const activeChildren = state.children.length > 0 ? state.children : (state.child ? [state.child] : []);
      activeChildren.forEach((c) => {
        if (c && c.id) {
          sendRemoteCommandToKid(
            parentId,
            c.id,
            'broadcast_msg',
            { id: msg.id, title: msg.title, message: msg.message, imageUrl: sticker, createdAt: now, timestamp: now },
            c.name
          ).catch(() => {});
        }
      });
    }
  };

  const updateChildAvatar = (childId: string, newAvatar: string) => {
    const updatedChildren = state.children.map((c) =>
      c.id === childId ? { ...c, avatar: newAvatar } : c
    );
    const isCur = state.selectedChildId === childId;
    const nextState: AppState = {
      ...state,
      children: updatedChildren,
      ...(isCur && state.child ? { child: { ...state.child, avatar: newAvatar } } : {}),
    };
    saveAndNotify(nextState);
    eventBus.publish('AVATAR_UPDATED', { childId, newAvatar }, 'parent');
  };

  const giftStarsToChild = (childId: string, amount: number, reason: string) => {
    const targetChild = state.children.find((c) => c.id === childId) || state.child;
    const currentSettings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const newKidStars = Math.max(0, (currentSettings.kidStars || 0) + amount);

    const transaction: StarTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
      childName: targetChild.name,
      type: 'gift',
      stars: amount,
      title: `Bố/Mẹ tặng +${amount} sao khen ngợi`,
      note: reason || 'Khen con chăm ngoan!',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
    };
    recordProcessedTxId(transaction.id);

    const newAlert: AlertNotification = {
      id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'study',
      title: `⭐ Tặng sao cho ${targetChild.name}`,
      message: `Đã cộng +${amount} sao: "${reason || 'Khen con chăm ngoan'}"`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      priority: 'low',
    };

    const updatedChildSettings = {
      ...state.childSettings,
      [childId]: {
        ...currentSettings,
        kidStars: newKidStars,
        starHistory: [transaction, ...(currentSettings.starHistory || [])],
      },
    };

    const isCur = state.selectedChildId === childId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      alerts: [newAlert, ...state.alerts],
      starHistory: [transaction, ...state.starHistory],
      ...(isCur ? { kidStars: newKidStars } : {}),
    };

    saveAndNotify(nextState, childId);
    eventBus.publish('STAR_GIFTED', { childId, amount, reason, childName: targetChild.name, newStars: newKidStars, txId: transaction.id }, 'parent');
    const parentId = getActiveParentId();
    if (parentId && childId) {
      syncChildStarsToCloud(parentId, childId, newKidStars, transaction, targetChild?.name).catch(() => {});
    }
  };

  const assignTaskToChild = (
    childId: string,
    taskData: { title: string; subject: string; stars: number; dueDate?: string }
  ) => {
    const targetChild = state.children.find((c) => c.id === childId) || state.child;
    const currentSettings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const newTask: KidTask = {
      id: 'tsk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: taskData.title.trim(),
      subject: taskData.subject || 'Học tập',
      stars: taskData.stars || 5,
      completed: false,
      dueDate: taskData.dueDate || 'Hôm nay',
    };

    const updatedTasks = [newTask, ...(currentSettings.kidTasks || [])];
    const updatedChildSettings = {
      ...state.childSettings,
      [childId]: {
        ...currentSettings,
        kidTasks: updatedTasks,
      },
    };

    const isCur = state.selectedChildId === childId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { kidTasks: updatedTasks } : {}),
    };

    saveAndNotify(nextState, childId);
    eventBus.publish('TASK_ASSIGNED', { childId, task: newTask, childName: targetChild.name }, 'parent');
  };

  const deleteKidTask = (taskId: string, childId?: string) => {
    const targetChildId = childId || state.selectedChildId;
    const currentSettings = state.childSettings[targetChildId] || createDefaultChildSettings(targetChildId);
    const updatedTasks = currentSettings.kidTasks.filter((t) => t.id !== taskId);

    const updatedChildSettings = {
      ...state.childSettings,
      [targetChildId]: {
        ...currentSettings,
        kidTasks: updatedTasks,
      },
    };

    const isCur = state.selectedChildId === targetChildId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      ...(isCur ? { kidTasks: updatedTasks } : {}),
    };
    saveAndNotify(nextState, targetChildId);
  };

  const redeemRewardOnKid = (childId: string, rewardId: string) => {
    const targetChild = state.children.find((c) => c.id === childId) || state.child;
    const reward = state.rewardsCatalog.find((r) => r.id === rewardId);
    if (!reward) return { success: false, message: 'Phần thưởng không tồn tại!' };

    const currentSettings = state.childSettings[childId] || createDefaultChildSettings(childId);
    const currentStars = currentSettings.kidStars ?? state.kidStars ?? 0;

    if (currentStars < reward.starsCost) {
      return { success: false, message: `Con chưa đủ sao (còn thiếu ${reward.starsCost - currentStars} sao nữa)` };
    }

    const newStars = currentStars - reward.starsCost;
    const redemption: RewardRedemption = {
      id: 'rd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
      childName: targetChild.name,
      rewardId: reward.id,
      rewardTitle: reward.title,
      starsCost: reward.starsCost,
      icon: reward.icon,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
      status: 'pending',
    };

    const transaction: StarTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
      childName: targetChild.name,
      type: 'redeem_gift',
      stars: -reward.starsCost,
      title: `Đã đổi: ${reward.title}`,
      note: 'Phiếu đổi quà gửi bố mẹ duyệt',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
    };

    const newAlert: AlertNotification = {
      id: 'alt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'study',
      title: `🎁 ${targetChild.name} vừa đổi quà!`,
      message: `Bé đã đổi ${reward.starsCost}⭐ lấy "${reward.title}". Hãy chuẩn bị quà cho bé nhé!`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
      priority: 'medium',
    };

    const updatedChildSettings = {
      ...state.childSettings,
      [childId]: {
        ...currentSettings,
        kidStars: newStars,
        redemptions: [redemption, ...(currentSettings.redemptions || [])],
        starHistory: [transaction, ...(currentSettings.starHistory || [])],
      },
    };

    const isCur = state.selectedChildId === childId;
    const nextState: AppState = {
      ...state,
      childSettings: updatedChildSettings,
      redemptions: [redemption, ...state.redemptions],
      starHistory: [transaction, ...state.starHistory],
      alerts: [newAlert, ...state.alerts],
      ...(isCur ? { kidStars: newStars } : {}),
    };

    saveAndNotify(nextState, childId);
    eventBus.publish('REWARD_REDEEMED', { childId, reward, redemption, newStars: newStars }, 'child');
    const parentId = getActiveParentId();
    if (parentId && childId) {
      syncChildStarsToCloud(parentId, childId, newStars, transaction, targetChild?.name).catch(() => {});
      syncChildSettingsToCloud(parentId, childId, {
        redemptions: updatedChildSettings[childId]?.redemptions || [redemption],
        kidStars: newStars,
      }, targetChild?.name).catch(() => {});
    }
    return { success: true, message: `Chúc mừng! Con đã đổi thành công "${reward.title}" (-${reward.starsCost}⭐)!` };
  };

  const approveRewardRedemption = (redemptionId: string) => {
    const updatedRedemptions = state.redemptions.map((r) =>
      r.id === redemptionId ? { ...r, status: 'completed' as const } : r
    );
    const updatedChildSettings = { ...state.childSettings };
    Object.keys(updatedChildSettings).forEach((cid) => {
      if (updatedChildSettings[cid].redemptions) {
        updatedChildSettings[cid].redemptions = updatedChildSettings[cid].redemptions?.map((r) =>
          r.id === redemptionId ? { ...r, status: 'completed' as const } : r
        );
      }
    });

    const nextState: AppState = {
      ...state,
      redemptions: updatedRedemptions,
      childSettings: updatedChildSettings,
    };
    saveAndNotify(nextState);
    eventBus.publish('REWARD_APPROVED', { redemptionId }, 'parent');
  };

  const addRewardItem = (item: Omit<RewardItem, 'id'>) => {
    const newId = 'rew_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const targetChildId = item.targetChildId || 'all';
    const targetChildName = item.targetChildName || (
      targetChildId === 'all'
        ? 'Cả nhà'
        : (state.children.find((c) => c.id === targetChildId)?.name || 'Cả nhà')
    );
    const newItem: RewardItem = {
      ...item,
      id: newId,
      isCustom: true,
      targetChildId,
      targetChildName,
    };
    const updatedCatalog = [newItem, ...state.rewardsCatalog];
    saveAndNotify({ ...state, rewardsCatalog: updatedCatalog });
    eventBus.publish('REWARD_CATALOG_UPDATED', updatedCatalog, 'parent');
    return newItem;
  };

  const updateRewardItem = (rewardId: string, updates: Partial<RewardItem>) => {
    const updatedCatalog = state.rewardsCatalog.map((r) => {
      if (r.id === rewardId) {
        const nextTargetId = updates.targetChildId !== undefined ? updates.targetChildId : r.targetChildId;
        const nextTargetName = updates.targetChildName !== undefined
          ? updates.targetChildName
          : (nextTargetId === 'all' ? 'Cả nhà' : (state.children.find((c) => c.id === nextTargetId)?.name || 'Cả nhà'));
        return {
          ...r,
          ...updates,
          targetChildId: nextTargetId,
          targetChildName: nextTargetName,
        };
      }
      return r;
    });
    saveAndNotify({ ...state, rewardsCatalog: updatedCatalog });
    eventBus.publish('REWARD_CATALOG_UPDATED', updatedCatalog, 'parent');
  };

  const deleteRewardItem = (rewardId: string) => {
    const updatedCatalog = state.rewardsCatalog.filter((r) => r.id !== rewardId);
    saveAndNotify({ ...state, rewardsCatalog: updatedCatalog });
    eventBus.publish('REWARD_CATALOG_UPDATED', updatedCatalog, 'parent');
  };

  // ─── Notification actions ────────────────────────────────────
  const markNotificationRead = (childId: string, notifId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedNotifications = (settings.notifications || []).map((n) =>
      n.id === notifId ? { ...n, isRead: true } : n
    );
    const updatedSettings = { ...settings, notifications: updatedNotifications };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('NOTIFICATION_UPDATED', { childId, notifications: updatedNotifications }, 'parent');
  };

  const markAllNotificationsRead = (childId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedNotifications = (settings.notifications || []).map((n) => ({ ...n, isRead: true }));
    const updatedSettings = { ...settings, notifications: updatedNotifications };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('NOTIFICATION_UPDATED', { childId, notifications: updatedNotifications }, 'parent');
  };

  const clearAllNotifications = (childId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedSettings = { ...settings, notifications: [] };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('NOTIFICATION_UPDATED', { childId, notifications: [] }, 'parent');
  };

  // ─── Create & Dispatch Notification ─────────────────────────
  const createNotification = (
    childId: string | 'all',
    alertData: Partial<AlertNotification>,
    options?: {
      speakTTS?: boolean;
      isOverlay?: boolean;
      soundType?: NotificationSoundType;
      appName?: string;
    }
  ) => {
    const parentId = getActiveParentId();
    const timeStr = alertData.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const targetChildren = childId === 'all'
      ? state.children
      : state.children.filter((c) => c.id === childId);

    const effectiveChildren = targetChildren.length > 0
      ? targetChildren
      : [state.children.find((c) => c.id === state.selectedChildId) || state.child];

    let currentAlerts = [...state.alerts];
    let currentChildSettings = { ...state.childSettings };

    effectiveChildren.forEach((targetChild) => {
      if (!targetChild) return;
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const targetChildId = targetChild.id;

      const newAlert: AlertNotification = {
        id: notifId,
        type: alertData.type || 'parent_message',
        title: alertData.title || 'Lời dặn từ Bố Mẹ',
        message: alertData.message || '',
        time: timeStr,
        isRead: false,
        priority: alertData.priority || 'medium',
        childId: targetChildId,
        childName: targetChild.name,
        bonusStars: alertData.bonusStars || 0,
        imageUrl: alertData.imageUrl || (alertData.type === 'reward' ? '⭐' : alertData.type === 'study' ? '📚' : alertData.type === 'reminder' ? '⏰' : alertData.type === 'sos' ? '🚨' : '💬'),
        speakTTS: options?.speakTTS,
      };

      currentAlerts = [newAlert, ...currentAlerts];

      const settings = currentChildSettings[targetChildId] || createDefaultChildSettings(targetChildId);

      const childNotif: ChildNotification = {
        id: notifId,
        appName: options?.appName || 'Lời dặn Bố Mẹ',
        appIcon: newAlert.imageUrl || '📢',
        title: newAlert.title,
        body: newAlert.message,
        time: timeStr,
        isRead: false,
        category: alertData.type === 'reward' ? 'study' : alertData.type === 'sos' ? 'emergency' : 'message',
        bonusStars: alertData.bonusStars,
        isOverlay: options?.isOverlay,
        speakTTS: options?.speakTTS,
      };

      let newStars = settings.kidStars || 0;
      let newHistory = settings.starHistory || [];
      if (alertData.bonusStars && alertData.bonusStars > 0) {
        newStars += alertData.bonusStars;
        const starTx: StarTransaction = {
          id: `star_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          childId: targetChildId,
          childName: targetChild.name,
          title: `Thưởng: ${alertData.title}`,
          stars: alertData.bonusStars,
          type: 'task_reward',
          timestamp: timeStr + ' Hôm nay',
        };
        newHistory = [starTx, ...newHistory];
        if (parentId && targetChildId) {
          syncChildStarsToCloud(parentId, targetChildId, newStars, starTx, targetChild.name).catch(() => {});
        }
      }

      currentChildSettings[targetChildId] = {
        ...settings,
        notifications: [childNotif, ...(settings.notifications || [])],
        kidStars: newStars,
        starHistory: newHistory,
      };

      if (parentId && targetChildId) {
        sendRemoteCommandToKid(
          parentId,
          targetChildId,
          'broadcast_msg',
          {
            notifId,
            title: newAlert.title,
            message: newAlert.message,
            imageUrl: newAlert.imageUrl,
            speakTTS: options?.speakTTS,
            isOverlay: options?.isOverlay,
            bonusStars: alertData.bonusStars,
          },
          targetChild.name
        ).catch(() => {});
      }
    });

    const isCur = effectiveChildren.some((c) => c.id === state.selectedChildId);
    const selectedSettings = currentChildSettings[state.selectedChildId];

    const nextState: AppState = {
      ...state,
      alerts: currentAlerts,
      childSettings: currentChildSettings,
      ...(isCur && selectedSettings ? {
        kidStars: selectedSettings.kidStars,
        starHistory: selectedSettings.starHistory,
      } : {}),
      ...(options?.isOverlay ? {
        broadcastMessage: {
          isShowing: true,
          title: alertData.title || 'Lời dặn từ Bố Mẹ',
          message: alertData.message || '',
          imageUrl: alertData.imageUrl || '📢',
          timestamp: timeStr,
        }
      } : {})
    };

    saveAndNotify(nextState);
    eventBus.publish('NOTIFICATION_CREATED', { alert: alertData, children: effectiveChildren.map(c => c.id) }, 'parent');

    showSystemNotification(alertData.title || 'Lời dặn từ Bố Mẹ', {
      body: alertData.message || '',
      soundType: options?.soundType || (alertData.priority === 'urgent' ? 'emergency' : alertData.type === 'reward' ? 'success' : 'info'),
      tag: `create_notif_${Date.now()}`,
    });
  };

  // ─── Kid Quick Response to Parent ────────────────────────────
  const sendKidResponseToParent = (notifId: string, responseText: string) => {
    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const kidPaired = getKidDevicePairedInfo();
    const currentChildId = kidPaired?.childId || state.selectedChildId || state.child?.id || '';
    const childObj = state.children.find((c) => c.id === currentChildId) || state.child;
    const childName = kidPaired?.childName || childObj?.name || 'Bé';

    const updatedAlerts = state.alerts.map((a) => {
      if (a.id === notifId) {
        return { ...a, kidResponse: responseText, kidResponseTime: timeStr };
      }
      return a;
    });

    const responseAlert: AlertNotification = {
      id: `resp_${Date.now()}`,
      type: 'parent_message',
      title: `${childName}: "${responseText}"`,
      message: `Bé đã phản hồi cho lời nhắc từ phụ huynh lúc ${timeStr}.`,
      time: timeStr,
      isRead: false,
      priority: 'low',
      childId: currentChildId,
      childName: childName,
      imageUrl: '💬',
    };

    const nextAlerts = [responseAlert, ...updatedAlerts];

    const settings = state.childSettings[currentChildId];
    let updatedChildSettings = { ...state.childSettings };
    if (settings) {
      const updatedNotifs = (settings.notifications || []).map((n) =>
        n.id === notifId ? { ...n, kidResponse: responseText, kidResponseTime: timeStr, isRead: true } : n
      );
      updatedChildSettings[currentChildId] = { ...settings, notifications: updatedNotifs };
    }

    const nextState = {
      ...state,
      alerts: nextAlerts,
      childSettings: updatedChildSettings,
    };

    saveAndNotify(nextState);
    eventBus.publish('KID_NOTIFICATION_RESPONSE', { notifId, responseText, childId: currentChildId, childName }, 'child');

    const parentId = getActiveParentId();
    if (parentId && currentChildId) {
      // Transmit response to parent via Cloud Chat stream (Parent receives this in Alerts & Family Chat)
      // NEVER send a remote command back to the Kid device itself!
      const chatMsg: CloudChatMessage = {
        id: `resp_${Date.now()}`,
        sender: 'kid',
        senderName: childName,
        text: `[Phản hồi lời dặn]: ${responseText}`,
        time: timeStr,
        timestamp: Date.now(),
      };
      sendCloudChatMessage(parentId, currentChildId, chatMsg, childName).catch(() => {});
    }

    playNotificationSound('success');
  };

  // ─── Media control actions ───────────────────────────────────
  const sendMediaCmd = (childId: string, cmd: MediaControlCmd, value?: number) => {
    const settings = state.childSettings[childId];
    if (!settings || !settings.mediaPlayback) return;
    let updated = { ...settings.mediaPlayback };
    if (cmd === 'play') updated.isPlaying = true;
    else if (cmd === 'pause') updated.isPlaying = false;
    else if (cmd === 'next') {
      updated.positionSeconds = 0;
      updated.isPlaying = true;
    } else if (cmd === 'prev') {
      updated.positionSeconds = 0;
      updated.isPlaying = true;
    } else if (cmd === 'volume' && value !== undefined) {
      updated.volume = Math.max(0, Math.min(100, value));
    } else if (cmd === 'seek' && value !== undefined) {
      updated.positionSeconds = Math.max(0, Math.min(updated.durationSeconds, value));
    }
    const updatedSettings = { ...settings, mediaPlayback: updated };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('MEDIA_CONTROL_CMD', { childId, cmd, value }, 'parent');
    eventBus.publish('MEDIA_STATE_UPDATED', { childId, mediaPlayback: updated }, 'parent');

    // Send remote command via Firebase Cloud to child device with feedback tracking
    if (childId) {
      dispatchRemoteCommand('media_control', { cmd, value }, childId, `Điều khiển phát nhạc [${cmd}] 🎵`);
    }
  };

  const updateMediaState = (childId: string, mediaState: Partial<MediaPlaybackState>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updated = { ...(settings.mediaPlayback || INITIAL_MEDIA_PLAYBACK), ...mediaState };
    const updatedSettings = { ...settings, mediaPlayback: updated };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('MEDIA_STATE_UPDATED', { childId, mediaPlayback: updated }, 'child');
  };

  // ─── Sensor actions ──────────────────────────────────────────
  const updateSensorValues = (childId: string, values: Partial<SensorValues>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updated = { ...(settings.sensorValues || INITIAL_SENSOR_VALUES), ...values };
    const updatedSettings = { ...settings, sensorValues: updated };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('SENSOR_DATA_UPDATED', { childId, sensorValues: updated }, 'child');
  };

  const updateNetworkInfo = (childId: string, info: Partial<NetworkInfo>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updated = { ...(settings.networkInfo || INITIAL_NETWORK_INFO), ...info };
    const updatedSettings = { ...settings, networkInfo: updated };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('NETWORK_INFO_UPDATED', { childId, networkInfo: updated }, 'child');
  };

  // ─── Alarm actions ───────────────────────────────────────────
  const addAlarm = (childId: string, alarm: Omit<ChildAlarm, 'id' | 'childId'>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const newAlarm: ChildAlarm = {
      ...alarm,
      id: 'alarm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
    };
    const updatedAlarms = [...(settings.alarms || []), newAlarm];
    const updatedSettings = { ...settings, alarms: updatedAlarms };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('ALARM_UPDATED', { childId, alarms: updatedAlarms }, 'parent');
  };

  const updateAlarm = (childId: string, alarmId: string, patch: Partial<ChildAlarm>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedAlarms = (settings.alarms || []).map((a) =>
      a.id === alarmId ? { ...a, ...patch } : a
    );
    const updatedSettings = { ...settings, alarms: updatedAlarms };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('ALARM_UPDATED', { childId, alarms: updatedAlarms }, 'parent');
  };

  const deleteAlarm = (childId: string, alarmId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedAlarms = (settings.alarms || []).filter((a) => a.id !== alarmId);
    const updatedSettings = { ...settings, alarms: updatedAlarms };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('ALARM_UPDATED', { childId, alarms: updatedAlarms }, 'parent');
  };

  // ─── Timer actions ───────────────────────────────────────────
  const addTimer = (childId: string, timer: Omit<ChildTimer, 'id' | 'childId' | 'remainingSeconds' | 'isRunning' | 'createdAt'>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const newTimer: ChildTimer = {
      ...timer,
      id: 'timer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
      remainingSeconds: timer.totalSeconds,
      isRunning: false,
      createdAt: new Date().toISOString(),
    };
    const updatedTimers = [...(settings.timers || []), newTimer];
    const updatedSettings = { ...settings, timers: updatedTimers };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('TIMER_UPDATED', { childId, timers: updatedTimers }, 'parent');
  };

  const updateTimerState = (childId: string, timerId: string, patch: Partial<ChildTimer>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedTimers = (settings.timers || []).map((t) =>
      t.id === timerId ? { ...t, ...patch } : t
    );
    const updatedSettings = { ...settings, timers: updatedTimers };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('TIMER_UPDATED', { childId, timers: updatedTimers }, 'parent');
  };

  const deleteTimer = (childId: string, timerId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedTimers = (settings.timers || []).filter((t) => t.id !== timerId);
    const updatedSettings = { ...settings, timers: updatedTimers };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('TIMER_UPDATED', { childId, timers: updatedTimers }, 'parent');
  };

  // ─── Schedule Event actions ──────────────────────────────────
  const addScheduleEvent = (childId: string, event: Omit<ChildScheduleEvent, 'id' | 'childId'>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const newEvent: ChildScheduleEvent = {
      ...event,
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      childId,
    };
    const updatedEvents = [...(settings.scheduleEvents || []), newEvent];
    const updatedSettings = { ...settings, scheduleEvents: updatedEvents };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('SCHEDULE_UPDATED', { childId, scheduleEvents: updatedEvents }, 'parent');
  };

  const updateScheduleEvent = (childId: string, eventId: string, patch: Partial<ChildScheduleEvent>) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedEvents = (settings.scheduleEvents || []).map((e) =>
      e.id === eventId ? { ...e, ...patch } : e
    );
    const updatedSettings = { ...settings, scheduleEvents: updatedEvents };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('SCHEDULE_UPDATED', { childId, scheduleEvents: updatedEvents }, 'parent');
  };

  const deleteScheduleEvent = (childId: string, eventId: string) => {
    const settings = state.childSettings[childId];
    if (!settings) return;
    const updatedEvents = (settings.scheduleEvents || []).filter((e) => e.id !== eventId);
    const updatedSettings = { ...settings, scheduleEvents: updatedEvents };
    const newState = { ...state, childSettings: { ...state.childSettings, [childId]: updatedSettings } };
    saveAndNotify(newState);
    eventBus.publish('SCHEDULE_UPDATED', { childId, scheduleEvents: updatedEvents }, 'parent');
  };

  const resetAllData = () => {
    localStorage.removeItem(getStorageKey());
    const fresh = getInitialState();
    saveAndNotify(fresh);
  };

  return {
    state,
    switchChild,
    addChild,
    deleteChild,
    updateChildAvatar,
    giftStarsToChild,
    assignTaskToChild,
    deleteKidTask,
    redeemRewardOnKid,
    approveRewardRedemption,
    addRewardItem,
    updateRewardItem,
    deleteRewardItem,
    setCustomScreenTimeLimit,
    incrementScreenTimeUsed,
    setSensorThresholds,
    setSmartRoutineTimeRange,
    setHardwareControls,
    toggleHardwareLock,
    toggleLockVolume,
    toggleLockBrightness,
    setAllowChildAdjustment,
    setSafeHardwareLimits,
    startHardwareTimer,
    cancelHardwareTimer,
    toggleScheduleProfile,
    requestChildHardwareAdjustment,
    resolveChildHardwareAdjustment,
    setKioskMode,
    remoteOpenApp,
    broadcastOverlay,
    clearBroadcastOverlay,
    setLockChallenge,
    unlockDevice,
    solveChallengeOnKid,
    addStepsOnKid,
    toggleSmartRoutine,
    updateSmartRoutines,
    triggerVoiceGuide,
    triggerReminder,
    clearReminder,
    simulateSensorTrigger,
    toggleLiveStream,
    switchCameraFacing,
    toggleAppStatus,
    setAppDailyLimit,
    toggleAppVisibility,
    toggleAppFavorite,
    updateAppRule,
    toggleSafeZone,
    addSafeZone,
    updateSafeZone,
    deleteSafeZone,
    addRoutePoint,
    updateDeviceConnection,
    addSmartDevice,
    deleteSmartDevice,
    addFamilyMember,
    updateFamilyMemberRole,
    deleteFamilyMember,
    addKidTask,
    updateHealthGoals,
    activatePremiumSubscription,
    toggleContentFilter,
    toggleStudyMode,
    triggerSOS,
    cancelSOS,
    requestTimeExtension,
    decideTimeRequest,
    lockChildDeviceNow,
    unlockChildDeviceNow,
    buzzKidPhone,
    extendChildTimeNow,
    dispatchRemoteCommand,
    clearLastCommandAck,
    syncWithCloudForChild,
    syncAllChildrenFromCloud,
    toggleTaskCompleted,
    markAlertAsRead,
    markChatAlertsAsRead,
    clearAllAlerts,
    toggleTheme,
    getFamilyAggregatedStats,
    lockAllChildrenForMealtime,
    lockAllChildrenForBedtime,
    unlockAllChildren,
    toggleStudyModeAll,
    triggerFamilyBroadcast,
    resetAllData,
    // New monitoring actions
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    sendMediaCmd,
    updateMediaState,
    updateSensorValues,
    updateNetworkInfo,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    addTimer,
    updateTimerState,
    deleteTimer,
    addScheduleEvent,
    updateScheduleEvent,
    deleteScheduleEvent,
    sendSharedLinkToKid,
    closeSharedLinkOnKid,
    setEmergencyContact,
    setChildLauncherMode,
    setTrackingCollectionConfig,
    // Multi-device management
    addOrUpdateChildDevice,
    updateChildDeviceName,
    switchActiveChildDevice,
    updateDeviceTelemetry,
    createNotification,
    sendKidResponseToParent,
    // PC Remote Control actions
    lockChildPcNow,
    unlockChildPcNow,
    shutdownChildPc,
    restartChildPc,
    sleepChildPc,
    toggleChildPcStudyMode,
    updateChildPcConfig,
    sendPcBroadcastMessage,
    updateChildPcTelemetry,
    requestLatestDataFromAllChildren,
  };
};

export { requestLatestDataFromAllChildren };
