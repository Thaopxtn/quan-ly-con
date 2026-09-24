import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core';

export interface KidPermissionsStatus {
  overlay: boolean;
  accessibility: boolean;
  device_admin: boolean;
  location: boolean;
  battery: boolean;
  usage_stats?: boolean;
  write_settings?: boolean;
  camera?: boolean;
  activity_recognition?: boolean;
  calendar?: boolean;
  audio?: boolean;
  isAllGranted: boolean;
}

export type PermissionSettingType =
  | 'overlay'
  | 'accessibility'
  | 'device_admin'
  | 'location'
  | 'battery'
  | 'usage_stats'
  | 'write_settings'
  | 'camera'
  | 'activity_recognition'
  | 'calendar'
  | 'audio'
  | 'notification_policy'
  | 'home_launcher'
  | 'app_details';

export interface EnforcementRules {
  isLocked: boolean;
  kioskEnabled: boolean;
  kioskPackage?: string;
  blockedPackages: string[];
}

export interface DeviceHardwareInfo {
  phoneNumber: string;
  imei: string;
  mac: string;
  serial: string;
  androidId: string;
  hardwareId: string;
  hardwareIdType: 'imei' | 'mac' | 'serial' | 'android_id' | 'fallback' | 'simulator';
  manufacturer: string;
  model: string;
  deviceName: string;
  osVersion: string;
}

export interface RealInstalledApp {
  id: string;
  name: string;
  packageName: string;
  category: 'study' | 'video' | 'game' | 'social' | 'browser' | 'other';
  icon?: string;
  isSystem?: boolean;
}

export interface KidPermissionsPluginInterface {
  checkPermissions(): Promise<KidPermissionsStatus>;
  openPermissionSettings(options: { type: PermissionSettingType }): Promise<{ success: boolean; type?: string; fallback?: boolean }>;
  openHomeLauncherSettings(): Promise<{ success: boolean }>;
  startProtectionService(): Promise<{ started: boolean }>;
  updateEnforcementRules(rules: {
    isLocked: boolean;
    kioskEnabled: boolean;
    kioskPackage?: string;
    blockedPackages: string[];
  }): Promise<{ success: boolean }>;
  getDeviceInfo(): Promise<DeviceHardwareInfo>;
  requestPhonePermissions(): Promise<{ requested: boolean }>;
  getScreenState(): Promise<{ isScreenOn: boolean }>;
  getInstalledApps(): Promise<{ apps: RealInstalledApp[]; count: number }>;
  launchApp(options: { packageName: string }): Promise<{ success: boolean; packageName?: string }>;
  wakeUpDevice(): Promise<{ success: boolean }>;
  setFlashlight(options: { enabled: boolean }): Promise<{ success: boolean; enabled?: boolean; reason?: string }>;
  setHardwareControl(options: { volume?: number; brightness?: number; flashlight?: boolean }): Promise<{ success: boolean; volume?: number; brightness?: number; flashlight?: boolean }>;
  getHardwareStatus(): Promise<{ volume: number; brightness: number }>;
  controlMedia(options: { action: 'play' | 'pause' | 'play_pause' | 'next' | 'prev' | 'stop' }): Promise<{ success: boolean; action?: string }>;
  getUsageStats(): Promise<{ isGranted: boolean; totalMinutesToday: number; appsUsage: Array<{ packageName: string; usedMinutes: number; lastTimeUsed: number }> }>;
  getHealthData(): Promise<{ sensorAvailable: boolean; dailySteps: number; isActivityRecognitionGranted: boolean }>;
  getBatteryInfo(): Promise<{ level: number; isCharging: boolean }>;
  requestAllAppPermissions(): Promise<{ requested: boolean }>;
  addListener(
    eventName: 'screenStateChange',
    listenerFunc: (data: { isScreenOn: boolean; action?: string }) => void
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
}

const KidPermissionsPlugin = registerPlugin<KidPermissionsPluginInterface>('KidPermissionsPlugin');

export async function getNativeScreenState(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return typeof document !== 'undefined' ? !document.hidden : true;
  }
  try {
    const res = await KidPermissionsPlugin.getScreenState();
    return res?.isScreenOn !== undefined ? res.isScreenOn : (typeof document !== 'undefined' ? !document.hidden : true);
  } catch {
    return typeof document !== 'undefined' ? !document.hidden : true;
  }
}

export function addScreenStateListener(callback: (isScreenOn: boolean) => void): (() => void) {
  let unsubNative: (() => void) | null = null;
  if (Capacitor.isNativePlatform()) {
    try {
      const handle = (KidPermissionsPlugin as any).addListener('screenStateChange', (data: { isScreenOn: boolean }) => {
        if (data && data.isScreenOn !== undefined) {
          callback(data.isScreenOn);
        }
      });
      if (handle && typeof handle.then === 'function') {
        handle.then((h: any) => {
          unsubNative = () => h?.remove?.();
        }).catch((err: any) => {
          console.warn('Native screen state listener setup error:', err);
        });
      } else if (handle && handle.remove) {
        unsubNative = () => handle.remove();
      }
    } catch (e) {
      console.warn('Native screen state listener registration error:', e);
    }
  }
  return () => {
    if (unsubNative) unsubNative();
  };
}

export async function checkRealAndroidPermissions(): Promise<KidPermissionsStatus | null> {
  if (!Capacitor.isNativePlatform()) {
    return null; // On web/simulator, return null so caller falls back to localStorage
  }

  try {
    const res = await KidPermissionsPlugin.checkPermissions();
    return res;
  } catch (err) {
    console.warn('checkRealAndroidPermissions error:', err);
    return null;
  }
}

export async function openAndroidPermissionSettings(type: PermissionSettingType): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log(`[Web Simulator] Simulated opening settings for: ${type}`);
    return false;
  }

  try {
    const res = await KidPermissionsPlugin.openPermissionSettings({ type });
    return !!res?.success;
  } catch (err) {
    console.warn(`openAndroidPermissionSettings for ${type} error:`, err);
    return false;
  }
}

export async function startNativeProtectionService(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Web Simulator] startNativeProtectionService called');
    return true;
  }

  try {
    const res = await KidPermissionsPlugin.startProtectionService();
    return !!res?.started;
  } catch (err) {
    console.warn('startNativeProtectionService error:', err);
    return false;
  }
}

export async function updateNativeEnforcementRules(rules: EnforcementRules): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Web Simulator] updateNativeEnforcementRules called with:', rules);
    return true;
  }

  try {
    const res = await KidPermissionsPlugin.updateEnforcementRules({
      isLocked: rules.isLocked,
      kioskEnabled: rules.kioskEnabled,
      kioskPackage: rules.kioskPackage || '',
      blockedPackages: rules.blockedPackages || []
    });
    return !!res?.success;
  } catch (err) {
    console.warn('updateNativeEnforcementRules error:', err);
    return false;
  }
}

export async function openHomeLauncherSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Web Simulator] openHomeLauncherSettings called');
    return false;
  }

  try {
    const res = await KidPermissionsPlugin.openHomeLauncherSettings();
    return !!res?.success;
  } catch (err) {
    console.warn('openHomeLauncherSettings error:', err);
    return openAndroidPermissionSettings('home_launcher');
  }
}

function getSimulatorDeviceInfo(): DeviceHardwareInfo {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kid_device_hardware_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    const rand = Math.floor(1000000 + Math.random() * 9000000);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let os = 'Web Browser';
    let model = 'Trình duyệt Web';
    let manufacturer = 'Web';
    if (/Windows/i.test(ua)) { os = 'Windows'; model = 'PC Windows'; manufacturer = 'Microsoft'; }
    else if (/Android/i.test(ua)) { os = 'Android Web'; model = 'Thiết bị Android (Web)'; manufacturer = 'Android'; }
    else if (/iPhone|iPad/i.test(ua)) { os = 'iOS Web'; model = /iPad/i.test(ua) ? 'iPad (Web)' : 'iPhone (Web)'; manufacturer = 'Apple'; }
    else if (/Macintosh/i.test(ua)) { os = 'macOS'; model = 'Mac (Web)'; manufacturer = 'Apple'; }
    else if (/Linux/i.test(ua)) { os = 'Linux'; model = 'Thiết bị Linux (Web)'; manufacturer = 'Linux'; }

    const hardwareId = 'web_' + rand.toString(36);
    const info: DeviceHardwareInfo = {
      phoneNumber: '',
      imei: '',
      mac: '',
      serial: 'WEB-' + rand.toString(36).toUpperCase(),
      androidId: hardwareId,
      hardwareId,
      hardwareIdType: 'android_id',
      manufacturer,
      model,
      deviceName: `${model}`,
      osVersion: os,
    };
    localStorage.setItem('kid_device_hardware_info', JSON.stringify(info));
    return info;
  }
  return {
    phoneNumber: '',
    imei: '',
    mac: '',
    serial: '',
    androidId: 'web_default',
    hardwareId: 'web_default',
    hardwareIdType: 'android_id',
    manufacturer: 'Web',
    model: 'Web Client',
    deviceName: 'Web Client',
    osVersion: 'Web',
  };
}

export async function getNativeDeviceInfo(): Promise<DeviceHardwareInfo> {
  if (!Capacitor.isNativePlatform()) {
    return getSimulatorDeviceInfo();
  }
  try {
    const info = await KidPermissionsPlugin.getDeviceInfo();
    if (info && info.hardwareId) {
      return info;
    }
    return getSimulatorDeviceInfo();
  } catch (e) {
    console.warn('getNativeDeviceInfo error:', e);
    return getSimulatorDeviceInfo();
  }
}

export async function requestNativePhonePermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const res = await KidPermissionsPlugin.requestPhonePermissions();
    return !!res?.requested;
  } catch (e) {
    console.warn('requestNativePhonePermissions error:', e);
    return false;
  }
}

export async function fetchRealInstalledApps(): Promise<RealInstalledApp[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.getInstalledApps();
      if (res && Array.isArray(res.apps) && res.apps.length > 0) {
        return res.apps;
      }
    } catch (err) {
      console.warn('fetchRealInstalledApps native error:', err);
    }
  }

  // Fallback / Simulator list of representative apps
  return [
    { id: 'app_youtube', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'video' },
    { id: 'app_zalo', name: 'Zalo', packageName: 'com.zing.zalo', category: 'social' },
    { id: 'app_chrome', name: 'Google Chrome', packageName: 'com.android.chrome', category: 'browser' },
    { id: 'app_duolingo', name: 'Duolingo Học Tiếng Anh', packageName: 'com.duolingo', category: 'study' },
    { id: 'app_vioedu', name: 'VioEdu Học Toán', packageName: 'vn.fpt.vioedu', category: 'study' },
    { id: 'app_monkey', name: 'Monkey Junior', packageName: 'com.earlystart.monkeyjunior', category: 'study' },
    { id: 'app_camera', name: 'Máy Ảnh', packageName: 'com.android.camera', category: 'other', isSystem: true },
    { id: 'app_calculator', name: 'Máy Tính', packageName: 'com.android.calculator2', category: 'study', isSystem: true },
    { id: 'app_clock', name: 'Đồng Hồ & Báo Thức', packageName: 'com.google.android.deskclock', category: 'other', isSystem: true },
    { id: 'app_roblox', name: 'Roblox', packageName: 'com.roblox.client', category: 'game' },
    { id: 'app_tiktok', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'video' },
    { id: 'app_facebook', name: 'Facebook', packageName: 'com.facebook.katana', category: 'social' },
    { id: 'app_messenger', name: 'Messenger', packageName: 'com.facebook.orca', category: 'social' },
    { id: 'app_zingmp3', name: 'Zing MP3', packageName: 'com.zing.mp3', category: 'other' },
    { id: 'app_gallery', name: 'Bộ Sưu Tập', packageName: 'com.android.gallery3d', category: 'other', isSystem: true },
    { id: 'app_settings', name: 'Cài Đặt Hệ Thống', packageName: 'com.android.settings', category: 'other', isSystem: true },
  ];
}

export async function launchNativeApp(packageName: string): Promise<boolean> {
  if (!packageName) return false;
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.launchApp({ packageName });
      return !!res?.success;
    } catch (err) {
      console.warn(`launchNativeApp error for ${packageName}:`, err);
      return false;
    }
  }
  console.log(`[Web Simulator] Simulated launching app: ${packageName}`);
  return true;
}

export async function wakeUpDevice(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.wakeUpDevice();
      return !!res?.success;
    } catch (err) {
      console.warn('wakeUpDevice error:', err);
      return false;
    }
  }
  return true;
}

export async function setNativeFlashlight(enabled: boolean): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.setFlashlight({ enabled });
      return !!res?.success;
    } catch (err) {
      console.warn('setNativeFlashlight error:', err);
      return false;
    }
  }
  console.log(`[Web Simulator] Simulated flashlight: ${enabled}`);
  return true;
}

export async function setNativeHardwareControl(options: {
  volume?: number;
  brightness?: number;
  flashlight?: boolean;
}): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.setHardwareControl(options);
      return !!res?.success;
    } catch (err) {
      console.warn('setNativeHardwareControl error:', err);
      return false;
    }
  }
  console.log('[Web Simulator] Simulated hardware control:', options);
  return true;
}

export async function getNativeHardwareStatus(): Promise<{ volume: number; brightness: number }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.getHardwareStatus();
      if (res) return { volume: res.volume, brightness: res.brightness };
    } catch (err) {
      console.warn('getNativeHardwareStatus error:', err);
    }
  }
  return { volume: 65, brightness: 70 };
}

export async function sendNativeMediaKey(action: 'play' | 'pause' | 'play_pause' | 'next' | 'prev' | 'stop'): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.controlMedia({ action });
      return !!res?.success;
    } catch (err) {
      console.warn(`sendNativeMediaKey [${action}] error:`, err);
      return false;
    }
  }
  console.log(`[Web Simulator] Simulated media action: ${action}`);
  return true;
}

export async function getNativeUsageStats(): Promise<{
  isGranted: boolean;
  totalMinutesToday: number;
  appsUsage: Array<{ packageName: string; usedMinutes: number; lastTimeUsed: number }>;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.getUsageStats();
      if (res) return res;
    } catch (err) {
      console.warn('getNativeUsageStats error:', err);
    }
  }
  return { isGranted: false, totalMinutesToday: 0, appsUsage: [] };
}

export async function getNativeHealthData(): Promise<{
  sensorAvailable: boolean;
  dailySteps: number;
  isActivityRecognitionGranted: boolean;
}> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.getHealthData();
      if (res) return res;
    } catch (err) {
      console.warn('getNativeHealthData error:', err);
    }
  }
  return { sensorAvailable: false, dailySteps: 0, isActivityRecognitionGranted: false };
}

export async function requestAllNativeAppPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.requestAllAppPermissions();
      if (res?.requested) return true;
    } catch (err) {
      console.warn('requestAllNativeAppPermissions error:', err);
      return false;
    }
  }
  return true;
}

export async function getNativeBatteryInfo(): Promise<{ level: number; isCharging: boolean }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await KidPermissionsPlugin.getBatteryInfo();
      if (res && typeof res.level === 'number' && res.level >= 0) return res;
    } catch (err) {
      console.warn('getNativeBatteryInfo error:', err);
    }
  }

  // Web/Browser fallback: read physical battery from standard Battery Status API
  if (typeof navigator !== 'undefined' && typeof (navigator as any).getBattery === 'function') {
    try {
      const b = await (navigator as any).getBattery();
      if (b && typeof b.level === 'number') {
        return {
          level: Math.round(b.level * 100),
          isCharging: Boolean(b.charging),
        };
      }
    } catch (_) {}
  }

  return { level: 100, isCharging: false };
}

