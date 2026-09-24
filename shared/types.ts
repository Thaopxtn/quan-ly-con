export type ChildStatus = 'online' | 'offline' | 'studying' | 'moving';

export interface DeviceTelemetryData {
  deviceId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  battery: number;
  currentAddress?: string;
  isScreenOn?: boolean;
  screenState?: 'active' | 'screen_off' | 'background';
  appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
  syncMode?: 'realtime' | 'balanced' | 'power_saving';
  activeOpenedApp?: string;
  screenTimeUsedMinutes?: number;
  isLocked?: boolean;
  lockType?: string;
  lockTitle?: string;
  lockedAt?: number;
  network?: any;
  sensors?: any;
  lastActive?: string;
  updatedAt?: number;
}

export interface DeviceSpecificSettings {
  deviceId: string;
  screenTimeLimitMinutes?: number;
  apps?: AppItem[];
  kioskMode?: KioskMode;
  hardwareControls?: HardwareControls;
  smartRoutines?: SmartRoutines;
  lockChallenge?: LockChallengeState;
  trackingConfig?: TrackingCollectionConfig;
}

export interface ChildDeviceInfo {
  deviceId: string; // Hardware unique identifier (IMEI || MAC || Serial || Android ID)
  id?: string; // Optional alias for deviceId
  hardwareIdType?: 'imei' | 'mac' | 'serial' | 'android_id' | 'fallback' | 'simulator';
  deviceName: string; // Tên máy dễ nhớ (VD: "Điện thoại Samsung A12", "Máy tính bảng học tập")
  model: string; // Mã đời máy (VD: "SM-A125F", "Galaxy A12")
  manufacturer?: string; // Hãng sản xuất (VD: "Samsung", "Xiaomi")
  phoneNumber?: string; // Số điện thoại từ SIM nếu có
  imei?: string; // Mã IMEI nếu có
  mac?: string; // Địa chỉ MAC nếu có
  serial?: string; // Số sê-ri nếu có
  androidId?: string; // Android ID
  osVersion: string; // Phiên bản hệ điều hành (VD: "Android 11 (API 30)")
  battery?: number;
  status?: 'online' | 'offline';
  pairedAt: string;
  lastActive?: string;
  isPrimary?: boolean;
  deviceType?: 'phone' | 'tablet' | 'pc' | 'laptop' | 'desktop';
  // Per-device isolated dataset
  lat?: number;
  lng?: number;
  speed?: number;
  currentAddress?: string;
  isScreenOn?: boolean;
  screenState?: 'active' | 'screen_off' | 'background';
  appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
  isLocked?: boolean;
  lockType?: string;
  lockTitle?: string;
  lockedAt?: number;
  telemetry?: DeviceTelemetryData;
  settings?: DeviceSpecificSettings;
  pcTelemetry?: ChildPcTelemetry;
  pcConfig?: ChildPcControlConfig;
}

export interface ChildPcAppRule {
  id: string; // e.g. "roblox", "steam", "minecraft", "league", "discord", "chrome"
  name: string; // "Roblox Player", "Steam", "Liên Minh Huyền Thoại", "Google Chrome"
  processName: string; // "RobloxPlayerBeta.exe", "steam.exe", "LeagueClient.exe"
  category: 'game' | 'study' | 'browser' | 'social' | 'other';
  status: 'allowed' | 'blocked' | 'time_limited';
  dailyLimitMinutes?: number;
  timeUsedMinutes?: number;
  icon?: string;
}

export interface ChildPcControlConfig {
  isLocked: boolean;
  lockReason?: string;
  isStudyMode: boolean; // When true: block all games & entertainment, only allow study apps & whitelisted URLs
  allowedWebsitesOnly?: boolean;
  whitelistedWebsites?: string[]; // e.g. ['olm.vn', 'vio.edu.vn', 'shub.edu.vn', 'zoom.us', 'khanacademy.org']
  blacklistedWebsites?: string[]; // e.g. ['facebook.com', 'tiktok.com', 'gamevui.vn', 'youtube.com']
  dailyLimitMinutes: number; // e.g. 120 (2 hours)
  curfewStart?: string; // "22:00"
  curfewEnd?: string; // "06:00"
  mealtimeLock?: boolean;
  bedtimeLock?: boolean;
  blockedApps: ChildPcAppRule[];
  shutdownScheduledAt?: number | null; // epoch ms if a shutdown is pending
}

export interface ChildPcTelemetry {
  deviceId: string;
  pcName: string; // "PC Bàn Học Của Bách", "Laptop Dell Inspiron"
  osVersion: string; // "Windows 11 Pro 64-bit", "macOS Sonoma"
  status: 'online' | 'offline';
  lastSeen: number;
  activeWindow?: string; // e.g. "Roblox - Blox Fruits" or "Google Chrome - Giải Toán Lớp 5"
  activeProcess?: string; // "RobloxPlayerBeta.exe"
  screenTimeTodayMinutes: number;
  isLocked: boolean;
  isStudyMode: boolean;
  lastScreenshotUrl?: string;
  cpuUsage?: number;
  ramUsage?: number;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface ChildProfile {
  id: string;
  name: string;
  birthYear?: number;
  gender?: 'boy' | 'girl';
  age: number;
  grade: string;
  school: string;
  avatar: string;
  phone?: string;
  status: ChildStatus;
  battery: number;
  speed: number; // km/h
  currentAddress: string;
  lat: number;
  lng: number;
  lastUpdated: string;
  // Multi-device support:
  devices?: ChildDeviceInfo[];
  activeDeviceId?: string;
  // Adaptive sync & screen state:
  isScreenOn?: boolean;
  screenState?: 'active' | 'screen_off' | 'background';
  appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
  syncMode?: 'realtime' | 'balanced' | 'power_saving';
  activeOpenedApp?: string;
  screenTimeUsedMinutes?: number;
  isLocked?: boolean;
  lockType?: string;
  lockTitle?: string;
  lockedAt?: number;
}

export interface SafeZone {
  id: string;
  name: string;
  icon: string;
  radius: number; // meters
  isActive: boolean;
  address: string;
  lat: number;
  lng: number;
  color: string;
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
  alarmSound?: string;
}

export interface AppItem {
  id: string;
  name: string;
  icon?: string;
  category: 'social' | 'video' | 'chat' | 'game' | 'browser' | 'study' | 'other';
  status: 'allowed' | 'blocked';
  timeUsedMinutes: number;
  dailyLimitMinutes: number; // 0 means no limit
  percentChange?: number;
  packageName?: string;
  isHidden?: boolean;
  isFavorite?: boolean;
  order?: number;
  isSystem?: boolean;
}

export interface ScreenTimeData {
  todayTotalMinutes: number;
  yesterdayTotalMinutes: number;
  percentChangeVsYesterday: number;
  hourlyUsage: number[]; // 24 hours: 0..23
  weekTotalHours: number;
  studyHours: number;
  entertainmentHours: number;
}

export interface ContentFilterCategory {
  id: string;
  name: string;
  isBlocked: boolean;
  categoryType: 'web' | 'app' | 'search';
  icon: string;
  desc: string;
}

export interface StudySubject {
  id: string;
  name: string;
  score: number; // %
  color: string;
  icon: string;
}

export interface StudyExercise {
  id: string;
  title: string;
  subject: string;
  result: string; // e.g. "Hoàn thành 8/10"
  scorePercent: number;
  time: string;
}

export interface HealthData {
  steps: number;
  stepGoal: number;
  activeMinutes: number;
  activeGoalMinutes: number;
  heartRate: number; // bpm
  sleepHours: number;
  sleepMinutes: number;
  aiSuggestion: string;
}

export interface AlertNotification {
  id: string;
  type: 'location' | 'study' | 'screentime' | 'battery' | 'sos' | 'device' | 'parent_message' | 'reward' | 'reminder';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  details?: string;
  childId?: string;
  childName?: string;
  bonusStars?: number;
  kidResponse?: string;
  kidResponseTime?: string;
  actionUrl?: string;
  imageUrl?: string;
  speakTTS?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  isCurrentUser?: boolean;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: 'smartwatch' | 'gps' | 'camera' | 'smarthome';
  battery: number;
  isConnected: boolean;
  statusText: string;
  icon: string;
}

export interface RoutePoint {
  id: string;
  time: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  type: 'start' | 'stop' | 'end';
  duration?: string;
  speed?: number;
  battery?: number;
  date?: string;
  transport?: 'walk' | 'bike' | 'car' | 'bus' | 'stay';
}

export interface AIMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface KidTask {
  id: string;
  title: string;
  subject: string;
  stars: number;
  completed: boolean;
  dueDate: string;
}

export interface TimeRequest {
  id: string;
  childId?: string;
  childName: string;
  appName: string;
  requestedMinutes: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  time: string;
  createdAt?: number;
}

export interface HardwareScheduleProfile {
  id: string;
  name: string;
  enabled: boolean;
  startTime: string; // "21:00"
  endTime: string; // "06:30"
  targetVolume: number;
  targetBrightness: number;
  isMuted: boolean;
  lockDuringSchedule: boolean;
}

export interface HardwareTimerState {
  isActive: boolean;
  minutes: number;
  remainingSeconds: number;
  label: string;
  originalVolume: number;
  originalBrightness: number;
}

export interface HardwareControls {
  volume: number; // 0..100
  brightness: number; // 10..100
  isMuted: boolean;
  flashlight: boolean;
  // Locking settings
  isHardwareLocked: boolean; // Khóa toàn bộ thiết đặt phần cứng
  lockVolume: boolean; // Khóa âm lượng cố định
  lockBrightness: boolean; // Khóa độ sáng cố định
  maxAllowedVolume: number; // Giới hạn âm lượng tối đa bé được chỉnh (vd: 75)
  minAllowedBrightness: number; // Giới hạn độ sáng tối thiểu (vd: 25)
  // Child permission
  allowChildAdjustment: boolean; // Cho phép con cái tự điều chỉnh phần cứng
  childRequestedAdjustment?: boolean; // Con đang xin phép điều chỉnh
  childRequestTime?: string;
  // Schedule & Timer
  activeTimer: HardwareTimerState | null;
  schedules: HardwareScheduleProfile[];
}

export interface KioskMode {
  isEnabled: boolean;
  pinnedAppId: string | null;
  pinnedAppName: string | null;
}

export interface BroadcastMessage {
  id?: string;
  isShowing: boolean;
  title: string;
  message: string;
  imageUrl?: string;
  timestamp: string;
  createdAt?: number;
}

export type LockType =
  | 'none'
  | 'instant'
  | 'math'
  | 'quiz'
  | 'movement'
  | 'countdown'
  | 'mealtime'
  | 'bedtime'
  | 'profanity'
  | 'noise';

export interface MathChallenge {
  question: string;
  answer: number;
}

export interface QuizChallenge {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface MovementChallenge {
  currentSteps: number;
  targetSteps: number;
}

export interface CountdownChallenge {
  initialSeconds: number;
  remainingSeconds: number;
}

export interface LockChallengeState {
  isLocked: boolean;
  lockType: LockType;
  title: string;
  description: string;
  mathChallenge?: MathChallenge;
  quizChallenge?: QuizChallenge;
  movementChallenge?: MovementChallenge;
  countdownChallenge?: CountdownChallenge;
}

export interface SmartRoutines {
  mealtimeLock: boolean;
  mealtimeStart?: string; // "11:30"
  mealtimeEnd?: string; // "12:30"
  bedtimeLock: boolean;
  bedtimeStart?: string; // "21:30"
  bedtimeEnd?: string; // "06:30"
  schoolMorningStart?: string; // "07:30"
  schoolMorningEnd?: string; // "11:30"
  schoolAfternoonStart?: string; // "13:30"
  schoolAfternoonEnd?: string; // "17:00"
  homeStudyStart?: string; // "19:30"
  homeStudyEnd?: string; // "21:30"
  studyModeLock?: boolean;
  continuousLimitMinutes: number; // 0 = off, 30, 45, 60
  profanityDetection: boolean;
  profanityPenaltyMinutes: number; // 5, 10, 15, 30
  noiseDetection: boolean;
  noiseThresholdDb: number; // 75, 80, 85, 90
  hydrationReminder: boolean;
  schoolReminder: boolean;
}

export interface LiveMonitoring {
  screenMirroring: boolean;
  cameraActive: boolean;
  cameraFacing: 'front' | 'back';
}

export interface RewardItem {
  id: string;
  title: string;
  starsCost: number;
  icon: string;
  category: 'screen' | 'treat' | 'gift' | 'trip' | 'book' | 'toy' | 'privilege' | 'other';
  description: string;
  targetChildId?: string; // 'all' or specific childId ('child_1'...)
  targetChildName?: string; // 'Cả nhà' or child name e.g. 'Bé An'
  isCustom?: boolean; // created by parent
}

export interface StarTransaction {
  id: string;
  childId: string;
  childName: string;
  type: 'gift' | 'task_reward' | 'redeem_gift';
  stars: number; // + or -
  title: string;
  note?: string;
  timestamp: string;
}

export interface RewardRedemption {
  id: string;
  childId: string;
  childName: string;
  rewardId: string;
  rewardTitle: string;
  starsCost: number;
  icon: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'completed';
}

// ─── Notification ───────────────────────────────────────────
export interface ChildNotification {
  id: string;
  appName: string;
  appIcon: string; // emoji
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  category?: 'message' | 'reminder' | 'study' | 'warning' | 'emergency' | 'app';
  bonusStars?: number;
  isOverlay?: boolean;
  speakTTS?: boolean;
  kidResponse?: string;
  kidResponseTime?: string;
}

// ─── Media Playback ─────────────────────────────────────────
export type MediaControlCmd = 'play' | 'pause' | 'next' | 'prev' | 'volume' | 'seek';

export interface MediaPlaybackState {
  isPlaying: boolean;
  trackTitle: string;
  artist: string;
  album: string;
  artUrl: string;
  positionSeconds: number;
  durationSeconds: number;
  volume: number; // 0-100
  appName: string; // 'Spotify' | 'YouTube Music' | ...
}

// ─── Network ────────────────────────────────────────────────
export interface NearbyWifi {
  ssid: string;
  signal: number; // -30 to -100 dBm
  isConnected: boolean;
  isSecured: boolean;
}

export interface NearbyBluetooth {
  name: string;
  rssi: number; // dBm
  isPaired: boolean;
  type: 'phone' | 'headphone' | 'watch' | 'speaker' | 'unknown';
}

export interface NetworkInfo {
  wifiSSID: string;
  wifiSignalDbm: number;
  wifiConnected: boolean;
  cellBars: number; // 0-4
  cellType: '2G' | '3G' | '4G' | '5G' | 'N/A';
  cellConnected: boolean;
  nearbyWifis: NearbyWifi[];
  nearbyBluetooth: NearbyBluetooth[];
}

// ─── Sensors ────────────────────────────────────────────────
export interface SensorValues {
  // Accelerometer m/s²
  accelX: number;
  accelY: number;
  accelZ: number;
  // Gyroscope rad/s
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  // Magnetometer µT
  magnetX: number;
  magnetY: number;
  magnetZ: number;
  // Orientation degrees
  pitch: number;
  roll: number;
  yaw: number;
  // Environment
  pressureHpa: number;
  lightLux: number;
  proximityNear: boolean;
  stepCount: number;
  // Ambient room sensor extensions
  noiseLevel?: number;
  ambientLight?: number;
  isExcessiveNoise?: boolean;
  profanityDetected?: boolean;
}

// ─── Alarms ─────────────────────────────────────────────────
export interface ChildAlarm {
  id: string;
  childId: string;
  label: string;
  time: string; // "HH:mm"
  repeatDays: number[]; // 0=Sun, 1=Mon, ...6=Sat; [] = once
  isEnabled: boolean;
  isTriggering?: boolean;
}

// ─── Timers ─────────────────────────────────────────────────
export interface ChildTimer {
  id: string;
  childId: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: string;
}

// ─── Schedule Events ─────────────────────────────────────────
export interface ChildScheduleEvent {
  id: string;
  childId: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  note: string;
  color: string; // hex color
  isCompleted: boolean;
  category: 'study' | 'activity' | 'medical' | 'family' | 'other';
}

export interface ChildSpecificSettings {
  screenTimeLimitMinutes: number; // Tổng phút cho phép dùng mỗi ngày (vd: 135p = 2h 15p)
  apps: AppItem[];
  screenTime: ScreenTimeData;
  hardwareControls: HardwareControls;
  kioskMode: KioskMode;
  lockChallenge: LockChallengeState;
  smartRoutines: SmartRoutines;
  kidTasks: KidTask[];
  kidStars: number;
  starHistory?: StarTransaction[];
  redemptions?: RewardRedemption[];
  activeOpenedApp?: { id: string; name: string } | null;
  activeReminder?: { type: 'hydration' | 'school' | 'todo'; title: string; message: string } | null;
  lastVoiceGuide?: string;
  // New monitoring features
  notifications?: ChildNotification[];
  mediaPlayback?: MediaPlaybackState;
  networkInfo?: NetworkInfo;
  sensorValues?: SensorValues;
  alarms?: ChildAlarm[];
  timers?: ChildTimer[];
  scheduleEvents?: ChildScheduleEvent[];
  broadcastMessage?: BroadcastMessage | null;
  isLocked?: boolean;
  lockType?: string;
  lockTitle?: string;
  lockedAt?: number;
  emergencyContact?: EmergencyContactConfig;
  activeSharedLink?: SharedLessonLink | null;
  safeZones?: SafeZone[];
  isLauncherEnabled?: boolean;
  trackingConfig?: TrackingCollectionConfig;
  pcConfig?: ChildPcControlConfig;
  pcTelemetry?: ChildPcTelemetry;
}

export interface TrackingCollectionConfig {
  isMasterTrackingEnabled: boolean; // Master toggle: Tạm dừng toàn bộ thu thập (chế độ ngủ đông tiết kiệm pin tuyệt đối)
  enableGpsTracking: boolean;        // Thu thập vị trí GPS thời gian thực & vẽ lịch sử lộ trình
  enableSensorMonitoring: boolean;   // Thu thập cảm biến (tiếng ồn mic, ánh sáng, gia tốc)
  enableAppUsageTracking: boolean;   // Thu thập thống kê thời gian dùng ứng dụng
  enableScreenStateSync: boolean;    // Giám sát trạng thái bật/tắt màn hình & phản chiếu
  enableNetworkMonitoring: boolean;  // Thu thập trạng thái WiFi / 4G
}

export interface EmergencyContactConfig {
  parentPhone: string;
  allowedApps: Array<'phone' | 'sms' | 'zalo' | 'messenger' | 'family_chat'>;
}

export interface SharedLessonLink {
  id: string;
  url: string;
  title: string;
  note?: string;
  forcedMinutes: number; // 0 = free to close, or 5, 10, 15, 30...
  createdAt: number;
  isOpen: boolean;
}

