import { registerPlugin, Capacitor, type PluginListenerHandle } from '@capacitor/core';

export interface KidPermissionsStatus {
  overlay: boolean;
  accessibility: boolean;
  device_admin: boolean;
  location: boolean;
  battery: boolean;
  isAllGranted: boolean;
}

export type PermissionSettingType =
  | 'overlay'
  | 'accessibility'
  | 'device_admin'
  | 'location'
  | 'battery'
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
    const mockImei = '86753009' + rand;
    const mockMac = '68:DB:F5:' + [rand % 90 + 10, (rand * 3) % 90 + 10, (rand * 7) % 90 + 10].join(':');
    const mockInfo: DeviceHardwareInfo = {
      phoneNumber: '0988.123.456',
      imei: mockImei,
      mac: mockMac,
      serial: 'SM-A125F-' + rand.toString(36).toUpperCase(),
      androidId: 'aid_' + rand.toString(36),
      hardwareId: mockImei,
      hardwareIdType: 'imei',
      manufacturer: 'Samsung',
      model: 'Galaxy A12 (SM-A125F)',
      deviceName: 'Samsung Galaxy A12',
      osVersion: 'Android 11 (API 30)',
    };
    localStorage.setItem('kid_device_hardware_info', JSON.stringify(mockInfo));
    return mockInfo;
  }
  return {
    phoneNumber: '0988.123.456',
    imei: '867530091234567',
    mac: '68:DB:F5:12:34:56',
    serial: 'SM-A125F-VN',
    androidId: 'aid_default',
    hardwareId: '867530091234567',
    hardwareIdType: 'imei',
    manufacturer: 'Samsung',
    model: 'Galaxy A12',
    deviceName: 'Samsung Galaxy A12',
    osVersion: 'Android 11',
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

