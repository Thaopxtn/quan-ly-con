// Cloud Synchronizer between Parent and Child Apps
// Supports both Realtime Database (rtdb) and Cloud Firestore (db) with real-time fallbacks
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  where,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  rtdbRef,
  rtdbSet,
  rtdbGet,
  rtdbUpdate,
  rtdbRemove,
  rtdbOnValue,
  rtdbPush,
} from "./rtdbServerAdapter";
import { getFirebaseInstance } from "./firebaseService";
import { isFirebaseConfigured } from "./firebaseConfig";
import { ChildSpecificSettings, TimeRequest, RoutePoint, SafeZone, ChildDeviceInfo, ChildPcControlConfig, ChildPcTelemetry } from "../types";
import { debugLogService } from "../services/debugLogService";
import { serverApiClient } from "../services/serverApiClient";

export interface CloudChatMessage {
  id?: string;
  sender: "parent" | "kid";
  senderName: string;
  text: string;
  time: string;
  speakTTS?: boolean;
  requireResponse?: boolean;
  timestamp?: any;
}

export interface CloudSOSAlert {
  active: boolean;
  senderName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  time?: string;
  childId: string;
  childName: string;
  updatedAt?: any;
}

export type RemoteCommandType =
  | "buzz_siren"
  | "lock_now"
  | "unlock_now"
  | "flash_toggle"
  | "extend_time"
  | "kiosk_lock"
  | "kiosk_unlock"
  | "broadcast_msg"
  | "clear_broadcast"
  | "hardware_control"
  | "open_shared_link"
  | "close_shared_link"
  | "update_app_rule"
  | "update_app_limit"
  | "ping"
  | "sync_request"
  | "media_control"
  | "pc_lock"
  | "pc_unlock"
  | "pc_shutdown"
  | "pc_restart"
  | "pc_sleep"
  | "pc_study_mode"
  | "pc_broadcast"
  | "pc_block_app"
  | "live_tracking_start"
  | "live_tracking_stop"
  | "none";

export interface RemoteCommandData {
  id?: string;
  command: RemoteCommandType;
  timestamp: number;
  payload?: any;
  childId?: string;
  parentId?: string;
  childName?: string;
}

export interface CommandAckData {
  id: string; // commandId
  command: RemoteCommandType;
  status: 'received' | 'executed' | 'failed';
  receivedAt?: number;
  executedAt?: number;
  childId: string;
  childName: string;
  deviceId?: string;
  deviceName?: string;
  detail?: string;
  error?: string;
}

export function normalizeChildSlug(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Returns a collision-free, strictly partitioned channel key for Realtime Database.
 * Guarantees that data for (Parent A, Child 1) never collides with (Parent B, Child 1),
 * and never mixes up with Child 2 of the same parent.
 */
export function getPartitionedSyncKey(parentId?: string, childId?: string): string {
  const cleanParent = (parentId || 'fam_default').trim().replace(/[\/\.\#\$\[\]]/g, '_');
  const cleanChild = (childId || 'child_default').trim().replace(/[\/\.\#\$\[\]]/g, '_');
  return `${cleanParent}_${cleanChild}`;
}

export function getPartitionedParentKey(parentId?: string): string {
  return (parentId || 'fam_default').trim().replace(/[\/\.\#\$\[\]]/g, '_');
}

export function sanitizeForRtdb(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForRtdb);
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = sanitizeForRtdb(val);
    }
  }
  return result;
}

// 1. Sync settings from Parent to Cloud (strictly partitioned by parentId + childId)
export async function syncChildSettingsToCloud(
  parentId: string,
  childId: string,
  settings: Partial<ChildSpecificSettings>,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const payload = sanitizeForRtdb({
    ...settings,
    childId,
    parentId,
    updatedAt: now,
  });

  let syncSuccess = false;
  let syncError: any = null;

  try {
    // RTDB sync to strictly partitioned channel
    if (rtdb) {
      rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${syncKey}/settings`), payload).catch((e) => {
        debugLogService.log({
          direction: 'parent->cloud',
          category: 'settings',
          action: 'sync_settings_rtdb_error',
          status: 'warning',
          summary: `Lỗi cập nhật RTDB channel pairings/sync/${syncKey}/settings: ${e?.message || e}`,
          childId,
          childName,
          error: e,
        });
      });

      if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
        try {
          await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/settings`), payload);
        } catch (err) {
          // Can fail if non-auth, partitioned channel above already succeeded
        }
      }
      syncSuccess = true;
    }

    // Firestore sync fallback
    if (db && parentId && parentId !== "family_primary") {
      try {
        const docRef = doc(db, "users", parentId, "children", childId, "config", "settings");
        await setDoc(
          docRef,
          {
            ...payload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        syncSuccess = true;
      } catch (err) {
        syncError = err;
      }
    }

    debugLogService.log({
      direction: 'parent->cloud',
      category: 'settings',
      action: 'sync_settings',
      status: syncSuccess ? 'success' : 'error',
      summary: syncSuccess
        ? `Đã đồng bộ cài đặt xuống con: ${settings.screenTimeLimitMinutes !== undefined ? `hạn mức ${settings.screenTimeLimitMinutes} phút, ` : ''}${settings.apps?.length ? `${settings.apps.length} ứng dụng` : 'cài đặt thiết bị'}`
        : `Lỗi đồng bộ cài đặt phụ huynh lên cloud`,
      childId,
      childName,
      payload: {
        screenTimeLimitMinutes: settings.screenTimeLimitMinutes,
        lockChallenge: settings.lockChallenge?.isLocked,
        appsCount: settings.apps?.length,
        hardwareControls: settings.hardwareControls,
      },
      error: syncError,
    });
  } catch (err) {
    debugLogService.log({
      direction: 'parent->cloud',
      category: 'settings',
      action: 'sync_settings_exception',
      status: 'error',
      summary: `Ngoại lệ khi đồng bộ cài đặt: ${err instanceof Error ? err.message : String(err)}`,
      childId,
      childName,
      error: err,
    });
  }
}

// 1b. Fast Dedicated Stars Sync Channel (strictly partitioned by parentId + childId)
export async function syncChildStarsToCloud(
  parentId: string,
  childId: string,
  stars: number,
  transaction?: any,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const payload = sanitizeForRtdb({
    stars,
    transaction: transaction || null,
    childId,
    parentId,
    updatedAt: now,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/stars`), payload).catch(() => {});
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/stars`), payload).catch(() => {});
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "config", "stars");
      await setDoc(docRef, { stars, transaction: transaction || null, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  }

  debugLogService.log({
    direction: 'parent->cloud',
    category: 'stars',
    action: 'sync_stars',
    status: 'success',
    summary: `Cập nhật sao cho bé ${childName || childId}: ${stars} ⭐`,
    childId,
    childName,
    payload: { stars, transaction },
  });
}

export function subscribeChildStarsFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (data: { stars: number; transaction?: any; updatedAt?: number }) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);
  let lastSeenStarsTime = 0;

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(rtdbRef(rtdb, `pairings/sync/${syncKey}/stars`), (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val && typeof val.stars === 'number') {
            const updTime = typeof val.updatedAt === 'number' ? val.updatedAt : 0;
            if (updTime && updTime < lastSeenStarsTime) return;
            if (updTime) lastSeenStarsTime = updTime;
            onUpdate(val);
          }
        }
      }, () => {});
      unsubs.push(u1);
    } catch (_) {}

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(rtdbRef(rtdb, `users/${parentId}/children/${childId}/stars`), (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val.stars === 'number') {
              const updTime = typeof val.updatedAt === 'number' ? val.updatedAt : 0;
              if (updTime && updTime < lastSeenStarsTime) return;
              if (updTime) lastSeenStarsTime = updTime;
              onUpdate(val);
            }
          }
        }, () => {});
        unsubs.push(u3);
      } catch (_) {}
    }
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 2. Subscribe to settings changes (strictly partitioned by parentId + childId)
export function subscribeChildSettingsFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (settings: Partial<ChildSpecificSettings>) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);
  let lastSeenSettingsTime = 0;
  let lastSettingsFingerprint = '';
  let lastSettingsEmitTime = 0;

  const handleSettingsUpdate = (rawVal: any) => {
    if (!rawVal) return;
    const now = Date.now();
    const updateTime = typeof rawVal.updatedAt === 'number' ? rawVal.updatedAt : 0;
    if (updateTime && updateTime < lastSeenSettingsTime) {
      return; // Discard older/stale settings update
    }
    if (updateTime) {
      lastSeenSettingsTime = updateTime;
    }

    const fp = `${rawVal.updatedAt || ''}_${rawVal.apps?.length || 0}_${rawVal.screenTimeLimitMinutes || ''}_${rawVal.kidStars ?? ''}_${rawVal.broadcastMessage?.id || ''}_${rawVal.hardwareControls?.volume ?? ''}`;
    if (fp === lastSettingsFingerprint && now - lastSettingsEmitTime < 1500) {
      return;
    }
    lastSettingsFingerprint = fp;
    lastSettingsEmitTime = now;

    // Purge stale or legacy broadcastMessage (TTL 10 mins or already dismissed)
    if (rawVal.broadcastMessage) {
      const now = Date.now();
      const bMsg = rawVal.broadcastMessage;
      let bCreated = typeof bMsg.createdAt === 'number' ? bMsg.createdAt : 0;
      if (!bCreated && typeof bMsg.timestamp === 'string') {
        const parsed = Date.parse(bMsg.timestamp);
        if (!isNaN(parsed)) bCreated = parsed;
      }

      // If created > 10 minutes ago or missing createdAt from legacy data, discard broadcast overlay
      if (!bCreated || (now - bCreated > 10 * 60 * 1000)) {
        rawVal.broadcastMessage = null;
      } else {
        try {
          const dismissedRaw = typeof window !== 'undefined' ? localStorage.getItem('kidcare_dismissed_broadcasts') : null;
          if (dismissedRaw) {
            const dismissedList: string[] = JSON.parse(dismissedRaw);
            const msgKey = bMsg.id || `${bMsg.title}_${bMsg.message}_${bMsg.timestamp}`;
            if (dismissedList.includes(msgKey)) {
              rawVal.broadcastMessage = null;
            }
          }
        } catch (_) {}
      }
    }

    onUpdate(rawVal as Partial<ChildSpecificSettings>);
  };

  // RTDB listeners
  if (rtdb) {
    // 1. Authoritative partitioned channel
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/settings`),
        (snap) => {
          if (snap.exists()) {
            handleSettingsUpdate(snap.val());
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Parent authenticated path fallback
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/settings`),
          (snap) => {
            if (snap.exists()) {
              handleSettingsUpdate(snap.val());
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}
    }
  }

  // Firestore listener fallback
  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "config", "settings");
      const uFs = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            handleSettingsUpdate(snapshot.data() as Partial<ChildSpecificSettings>);
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

export interface QueuedTelemetryItem {
  id: string;
  timestamp: number;
  battery: number;
  speed: number;
  lat: number;
  lng: number;
  currentAddress: string;
  isScreenOn?: boolean;
  screenState?: 'active' | 'screen_off' | 'background';
  appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
  syncMode?: 'realtime' | 'balanced' | 'power_saving';
  sensors?: any;
  network?: any;
  screenTimeUsedMinutes?: number;
}

const OFFLINE_QUEUE_KEY_PREFIX = 'kidcare_offline_telemetry_';

export function getOfflineTelemetryQueue(childId: string): QueuedTelemetryItem[] {
  try {
    const raw = localStorage.getItem(`${OFFLINE_QUEUE_KEY_PREFIX}${childId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineTelemetry(childId: string, item: Omit<QueuedTelemetryItem, 'id' | 'timestamp'>): void {
  try {
    const queue = getOfflineTelemetryQueue(childId);
    const newItem: QueuedTelemetryItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    queue.push(newItem);
    // Keep max 50 recent points
    while (queue.length > 50) {
      queue.shift();
    }
    localStorage.setItem(`${OFFLINE_QUEUE_KEY_PREFIX}${childId}`, JSON.stringify(queue));
  } catch (e) {
    console.warn('Error saving offline telemetry queue:', e);
  }
}

export async function flushOfflineTelemetryQueue(parentId: string, childId: string): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 0;
  }
  const queue = getOfflineTelemetryQueue(childId);
  if (!queue || queue.length === 0) return 0;

  let flushedCount = 0;
  try {
    const latest = queue[queue.length - 1];
    await uploadChildTelemetryToCloud(parentId, childId, {
      battery: latest.battery,
      speed: latest.speed,
      lat: latest.lat,
      lng: latest.lng,
      currentAddress: latest.currentAddress,
      sensors: latest.sensors,
      network: latest.network,
      screenTimeUsedMinutes: latest.screenTimeUsedMinutes,
    }, false);

    const { rtdb } = getFirebaseInstance();
    if (rtdb) {
      const historyRef = rtdbRef(rtdb, `users/${parentId}/children/${childId}/history`);
      for (const pt of queue) {
        try {
          await rtdbPush(historyRef, {
            lat: pt.lat,
            lng: pt.lng,
            speed: pt.speed,
            time: new Date(pt.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            timestamp: pt.timestamp,
            address: pt.currentAddress,
          });
          flushedCount++;
        } catch {}
      }
    }

    localStorage.removeItem(`${OFFLINE_QUEUE_KEY_PREFIX}${childId}`);
    return flushedCount;
  } catch (err) {
    console.warn('Failed to flush offline queue:', err);
    return 0;
  }
}

/**
 * Registers a specific physical phone as an independent device for a child in Cloud (RTDB & Firestore)
 */
export async function registerChildDeviceInCloud(
  parentId: string,
  childId: string,
  device: ChildDeviceInfo
): Promise<void> {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId || !device?.deviceId) return;

  const cleanParent = getPartitionedParentKey(parentId);
  const now = Date.now();
  const deviceData = sanitizeForRtdb({
    ...device,
    childId,
    parentId: cleanParent,
    updatedAt: now,
  });

  if (rtdb) {
    try {
      // 1. Register under family's child devices path
      await rtdbSet(rtdbRef(rtdb, `pairings/families/${cleanParent}/children/${childId}/devices/${device.deviceId}`), deviceData);
      // 2. Register under parent's child devices path
      if (parentId && parentId !== "family_primary") {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/devices/${device.deviceId}`), deviceData);
      }
    } catch (e) {
      console.warn("registerChildDeviceInCloud RTDB warning:", e);
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const devDocRef = doc(db, "users", parentId, "children", childId, "devices", device.deviceId);
      await setDoc(devDocRef, { ...deviceData, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  }
}

// 3. Child device uploads real-time telemetry (GPS, Battery, Speed, Sensors, Network)
export async function uploadChildTelemetryToCloud(
  parentId: string,
  childId: string,
  telemetry: {
    battery: number;
    speed: number;
    lat: number;
    lng: number;
    currentAddress: string;
    isScreenOn?: boolean;
    screenState?: 'active' | 'screen_off' | 'background';
    appStatus?: 'active_in_app' | 'in_background' | 'screen_off';
    syncMode?: 'realtime' | 'balanced' | 'power_saving';
    sensors?: any;
    network?: any;
    screenTimeUsedMinutes?: number;
    activeOpenedApp?: string;
    installedAppsCount?: number;
    childName?: string;
    deviceId?: string;
    deviceName?: string;
    model?: string;
  },
  autoQueue: boolean = true,
  childName?: string
): Promise<void> {
  const effectiveChildName = childName || telemetry.childName || "";
  // Offline check: If device is offline, immediately save to offline queue
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (autoQueue) {
      queueOfflineTelemetry(childId, telemetry);
    }
    debugLogService.log({
      direction: 'kid->cloud',
      category: 'telemetry',
      action: 'upload_telemetry_offline',
      status: 'warning',
      summary: `Mạng ngoại tuyến, đã lưu hàng đợi telemetry (${effectiveChildName || childId})`,
      childId,
      childName: effectiveChildName,
      payload: { battery: telemetry.battery, screenTimeUsed: telemetry.screenTimeUsedMinutes },
    });
    return;
  }

  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) {
    if (autoQueue) {
      queueOfflineTelemetry(childId, telemetry);
    }
    debugLogService.log({
      direction: 'kid->cloud',
      category: 'telemetry',
      action: 'upload_telemetry_no_config',
      status: 'warning',
      summary: `Chưa cấu hình Firebase hoặc thiếu childId (${childId})`,
      childId,
      childName: effectiveChildName,
    });
    return;
  }

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const payload = sanitizeForRtdb({
    ...telemetry,
    childId,
    parentId,
    childName: effectiveChildName,
    lastUpdated: now,
    isOnline: true,
  });

  let uploadSuccess = false;

  // 1. Write to Realtime Database via strictly partitioned channel
  if (rtdb) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${syncKey}/telemetry`), payload);
      if (telemetry.deviceId) {
        const devPayload = sanitizeForRtdb({
          deviceId: telemetry.deviceId,
          childId,
          parentId,
          childName: effectiveChildName,
          battery: telemetry.battery,
          lat: telemetry.lat,
          lng: telemetry.lng,
          speed: telemetry.speed,
          currentAddress: telemetry.currentAddress,
          isScreenOn: telemetry.isScreenOn,
          screenState: telemetry.screenState,
          activeOpenedApp: telemetry.activeOpenedApp,
          screenTimeUsedMinutes: telemetry.screenTimeUsedMinutes,
          lastActive: new Date().toISOString(),
          updatedAt: now,
        });
        rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${syncKey}/devices/${telemetry.deviceId}`), devPayload).catch(() => {});
      }
      uploadSuccess = true;
    } catch (err) {
      console.warn("RTDB partitioned channel telemetry error:", err);
    }

    // Try users/ path only when authenticated as parent
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/telemetry`), payload);
      } catch (err) {
        // Can fail if non-auth, open channels above already succeeded
      }
    }
    recordTelemetryUpload();
  }

  // 2. Write to Firestore as persistent fallback
  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "live", "telemetry");
      await setDoc(
        docRef,
        {
          ...telemetry,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      uploadSuccess = true;
    } catch (err) {}
  }

  // If both network writes failed, queue telemetry for retry
  if (!uploadSuccess && autoQueue) {
    queueOfflineTelemetry(childId, telemetry);
  }

  if (uploadSuccess) {
    debugLogService.log({
      direction: 'kid->cloud',
      category: 'telemetry',
      action: 'upload_telemetry',
      status: 'success',
      summary: `Đã gửi báo cáo máy con: Pin ${telemetry.battery}%, Đã dùng: ${telemetry.screenTimeUsedMinutes ?? 0} phút, Tốc độ: ${telemetry.speed || 0} km/h`,
      childId,
      childName: effectiveChildName,
      payload: {
        battery: telemetry.battery,
        screenTimeUsedMinutes: telemetry.screenTimeUsedMinutes,
        lat: telemetry.lat,
        lng: telemetry.lng,
        activeApp: telemetry.activeOpenedApp,
      },
    });
  } else {
    debugLogService.log({
      direction: 'kid->cloud',
      category: 'telemetry',
      action: 'upload_telemetry_failed',
      status: 'error',
      summary: `Không thể gửi telemetry lên cloud, đã lưu vào hàng đợi offline`,
      childId,
      childName: effectiveChildName,
      payload: telemetry,
    });
  }
}

// 4. Subscribe to child telemetry in real-time (strictly partitioned by parentId + childId)
export function subscribeChildTelemetryFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (telemetry: any) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);
  let lastFingerprint = '';
  let lastTime = 0;

  const handleTelemetryUpdate = (rawVal: any) => {
    if (!rawVal) return;
    const now = Date.now();
    const fp = `${rawVal.lat}_${rawVal.lng}_${rawVal.battery}_${rawVal.screenTimeUsedMinutes}_${rawVal.activeOpenedApp}_${rawVal.speed}_${rawVal.isScreenOn}`;
    if (fp === lastFingerprint && now - lastTime < 1500) {
      return; // Ignore duplicate telemetry within 1.5 seconds
    }
    lastFingerprint = fp;
    lastTime = now;
    onUpdate(rawVal);
  };

  if (rtdb) {
    // 1. Authoritative partitioned channel
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/telemetry`),
        (snap) => {
          if (snap.exists()) {
            handleTelemetryUpdate(snap.val());
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Parent authenticated path fallback
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/telemetry`),
          (snap) => {
            if (snap.exists()) {
              handleTelemetryUpdate(snap.val());
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "live", "telemetry");
      const uFs = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            handleTelemetryUpdate(snapshot.data());
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

export function subscribeDeviceTelemetryFromCloud(
  deviceId: string,
  onUpdate: (telemetry: any) => void
): () => void {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !rtdb || !deviceId) return () => {};

  try {
    const unsub = rtdbOnValue(
      rtdbRef(rtdb, `pairings/sync/devices/${deviceId}/telemetry`),
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.val());
        }
      },
      () => {}
    );
    return unsub;
  } catch (e) {
    return () => {};
  }
}

// 5. Emergency SOS: Child triggers SOS
export async function triggerCloudSOS(
  parentId: string,
  childId: string,
  sosInfo: { time: string; lat: number; lng: number; address: string; childName?: string },
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const effectiveName = childName || sosInfo.childName || "Bé Yêu";
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const sosData = {
    active: true,
    time: sosInfo.time,
    lat: sosInfo.lat,
    lng: sosInfo.lng,
    address: sosInfo.address,
    childId,
    parentId,
    childName: effectiveName,
    updatedAt: now,
  };

  debugLogService.log({
    direction: 'kid->cloud',
    category: 'sos',
    action: 'trigger_sos',
    status: 'warning',
    summary: `🚨 Phát tín hiệu SOS khẩn cấp: ${effectiveName} tại ${sosInfo.address || 'vị trí hiện tại'}`,
    childId,
    childName: effectiveName,
    payload: sosInfo,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/sos`), sosData).catch(() => {});
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/sos`), sosData).catch(() => {});
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "live", "sos");
      await setDoc(docRef, { ...sosData, updatedAt: serverTimestamp() });
    } catch (_) {}
  }
}

// 6. Emergency SOS: Parent or Child resolves SOS (strictly partitioned)
export async function resolveCloudSOS(parentId: string, childId: string, childName?: string): Promise<void> {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const resolveData = {
    active: false,
    resolvedAt: now,
  };

  debugLogService.log({
    direction: 'parent->cloud',
    category: 'sos',
    action: 'resolve_sos',
    status: 'info',
    summary: `✅ Đã tắt tín hiệu báo động SOS cho bé ${childName || childId}`,
    childId,
    childName,
  });

  if (rtdb) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${syncKey}/sos`), resolveData);
    } catch (_) {}
    if (parentId && parentId !== "family_primary") {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/sos`), resolveData);
      } catch (_) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "live", "sos");
      await setDoc(docRef, { active: false, resolvedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  }
}

// Clear SOS for all children in the family
export async function clearAllFamilySosInCloud(
  parentId: string,
  children: Array<{ id: string; name?: string }>
): Promise<void> {
  if (!children || children.length === 0) return;
  const promises = children.map((c) => resolveCloudSOS(parentId, c.id, c.name));
  await Promise.allSettled(promises);
}

// 7. Subscribe to SOS alert from Cloud (strictly partitioned)
export function subscribeCloudSOS(
  parentId: string,
  childId: string,
  onSOSUpdate: (sosData: CloudSOSAlert) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);

  // Deduplicate rapid successive updates
  let lastForwardedFingerprint = '';
  let lastForwardedTime = 0;

  const handleSOSUpdate = (rawVal: any) => {
    if (!rawVal) return;
    const sosData = rawVal as CloudSOSAlert;
    const now = Date.now();
    const isActive = !!sosData.active;
    const updatedAtVal = sosData.updatedAt
      ? typeof sosData.updatedAt === 'number'
        ? sosData.updatedAt
        : (typeof (sosData.updatedAt as any)?.toMillis === 'function'
          ? (sosData.updatedAt as any).toMillis()
          : String(sosData.updatedAt))
      : '';
    const fingerprint = `${isActive}_${updatedAtVal}_${sosData.time || ''}_${sosData.address || ''}_${sosData.lat || ''}_${sosData.lng || ''}`;

    if (fingerprint === lastForwardedFingerprint && now - lastForwardedTime < 6000) {
      return;
    }

    lastForwardedFingerprint = fingerprint;
    lastForwardedTime = now;
    onSOSUpdate(sosData);
  };

  if (rtdb) {
    // 1. Authoritative partitioned channel
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/sos`),
        (snap) => {
          if (snap.exists()) {
            handleSOSUpdate(snap.val());
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Parent authenticated path fallback
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/sos`),
          (snap) => {
            if (snap.exists()) {
              handleSOSUpdate(snap.val());
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "live", "sos");
      const uFs = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            handleSOSUpdate(snapshot.data());
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 8. Remote Commands: Parent sends command to Kid (e.g. buzz siren, lock)
export async function sendRemoteCommandToKid(
  parentId: string,
  childId: string,
  command: RemoteCommandType,
  payload?: any,
  childName?: string,
  customCmdId?: string
): Promise<string> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return "";

  const now = Date.now();
  const cmdId = customCmdId || `cmd_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const cmdData: RemoteCommandData = {
    id: cmdId,
    command,
    timestamp: now,
    payload: payload || null,
    childId,
    parentId,
    childName: childName || "",
  };

  debugLogService.log({
    direction: 'parent->cloud',
    category: 'command',
    action: `remote_cmd_${command}`,
    status: 'info',
    summary: `Phụ huynh gửi lệnh từ xa [${command}] đến thiết bị ${childName || childId}`,
    childId,
    childName,
    payload,
  });

  const syncKey = getPartitionedSyncKey(parentId, childId);

  if (rtdb) {
    // Partitioned authoritative sync channel
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/active`), cmdData).catch((e) => {
      debugLogService.log({
        direction: 'parent->cloud',
        category: 'command',
        action: `remote_cmd_${command}_rtdb_err`,
        status: 'warning',
        summary: `Lỗi gửi lệnh RTDB: ${e?.message || e}`,
        childId,
        childName,
        error: e,
      });
    });
  }

  // Dual sync to local PC server if available (authenticated with cryptographic token)
  try {
    serverApiClient.sendCommand({
      id: cmdId,
      type: command,
      childId,
      parentId,
      childName: childName || '',
      payload: payload || null,
      timestamp: now,
    }).catch(() => {});
  } catch (_) {}

  return cmdId;
}

// 8.0 Request all paired children to send their latest telemetry & state
export async function requestLatestDataFromAllChildren(
  parentId: string,
  children: Array<{ id: string; name?: string }>
): Promise<string[]> {
  if (!parentId || !children || children.length === 0) return [];
  const cmdIds: string[] = [];
  for (const c of children) {
    if (c && c.id) {
      try {
        const id = await sendRemoteCommandToKid(
          parentId,
          c.id,
          'sync_request',
          { requestedAt: Date.now(), reason: 'parent_app_opened' },
          c.name
        );
        if (id) cmdIds.push(id);
      } catch (err) {
        console.warn(`[requestLatestDataFromAllChildren] Error for child ${c.id}:`, err);
      }
    }
  }
  return cmdIds;
}

// 8.1 Kid acknowledges command receipt and execution back to Parent
export async function sendRemoteCommandAck(
  parentId: string,
  childId: string,
  ack: CommandAckData
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const ackData: CommandAckData = {
    ...ack,
    executedAt: ack.executedAt || now,
    receivedAt: ack.receivedAt || now,
  };

  debugLogService.log({
    direction: 'kid->cloud',
    category: 'command',
    action: `remote_cmd_ack_${ack.command}_${ack.status}`,
    status: 'info',
    summary: `Máy con (${ack.childName || childId}) ${ack.status === 'executed' ? 'đã thực thi thành công' : 'đã nhận'} lệnh [${ack.command}]`,
    childId,
    childName: ack.childName,
    payload: ackData,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/lastAck`), ackData).catch((e) => {
      console.warn('[sendRemoteCommandAck] RTDB ack error:', e);
    });
  }

  // Dual sync ACK to local PC server if reachable (authenticated with cryptographic token)
  try {
    serverApiClient.sendCommandAck(ackData).catch(() => {});
  } catch (_) {}
}

// 8.2 Subscribe to Command ACK on Parent Device
export function subscribeCommandAck(
  parentId: string,
  childId: string,
  onAck: (ack: CommandAckData) => void
): () => void {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const syncKey = getPartitionedSyncKey(parentId, childId);
  let lastHandledAckKey = '';

  if (rtdb) {
    try {
      const unsub = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/lastAck`),
        (snap) => {
          if (snap.exists()) {
            const val = snap.val() as CommandAckData;
            if (val && val.id && val.status) {
              const ackKey = `${val.id}_${val.status}_${val.executedAt || val.receivedAt || 0}`;
              if (ackKey !== lastHandledAckKey) {
                lastHandledAckKey = ackKey;
                // Only process fresh acks (within last 5 minutes, tolerant to clock drift)
                const ackAge = Date.now() - (val.executedAt || val.receivedAt || Date.now());
                if (Math.abs(ackAge) < 300000) {
                  onAck(val);
                }
              }
            }
          }
        },
        () => {}
      );
      return () => {
        try { unsub(); } catch (_) {}
      };
    } catch (_) {}
  }

  return () => {};
}

// Persistent Handled Commands set across re-subscriptions and re-renders
const PERSISTENT_HANDLED_CMDS_KEY = 'kidcare_handled_commands_v1';
const PERSISTENT_LAST_CMD_TIME_KEY = 'kidcare_last_command_time_v1';

function getStoredHandledCommandIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PERSISTENT_HANDLED_CMDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (_) {
    return new Set();
  }
}

function saveHandledCommandId(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const ids = Array.from(getStoredHandledCommandIds());
    if (!ids.includes(id)) {
      ids.push(id);
      // Keep only last 100 handled IDs
      const capped = ids.slice(-100);
      localStorage.setItem(PERSISTENT_HANDLED_CMDS_KEY, JSON.stringify(capped));
    }
  } catch (_) {}
}

function getStoredLastCommandTime(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PERSISTENT_LAST_CMD_TIME_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

function saveLastCommandTime(ts: number): void {
  if (typeof window === 'undefined' || !ts) return;
  try {
    localStorage.setItem(PERSISTENT_LAST_CMD_TIME_KEY, String(ts));
  } catch (_) {}
}

// 9. Child device listens to remote commands in real-time (strictly partitioned by parentId + childId)
export function subscribeRemoteCommandsOnKid(
  parentId: string,
  childId: string,
  onCommand: (cmd: RemoteCommandData) => void,
  childName?: string
): () => void {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const handledIds = getStoredHandledCommandIds();
  // Initialize to last stored command time from device storage
  // Never clamp to (Date.now() - 3000) because slight clock drift between parent and kid phones
  // or app cold-start latency will cause valid commands to be permanently dropped!
  let lastHandledCmdTimestamp = getStoredLastCommandTime();

  const handleIncoming = (data: RemoteCommandData | null) => {
    if (!data || !data.command || data.command === "none") return;
    const now = Date.now();

    // 1. Robust Timestamp Extraction (handles numbers, ISO strings, epoch ms)
    let cmdTimestamp = 0;
    if (typeof data.timestamp === 'number') {
      cmdTimestamp = data.timestamp;
    } else if (typeof data.timestamp === 'string') {
      const parsed = Date.parse(data.timestamp);
      if (!isNaN(parsed)) {
        cmdTimestamp = parsed;
      } else {
        const num = Number(data.timestamp);
        if (!isNaN(num) && num > 0) cmdTimestamp = num;
      }
    }

    // 2. STALE/LEGACY DATA PURGE: If timestamp is missing or non-positive,
    // this is corrupt/stale legacy data sitting in Firebase RTDB from earlier versions.
    // Discard immediately and purge from cloud so it never executes or spams!
    if (!cmdTimestamp || cmdTimestamp <= 0) {
      console.warn('[subscribeRemoteCommandsOnKid] Discarding stale command with missing/invalid timestamp:', data);
      clearRemoteCommand(parentId, childId, childName).catch(() => {});
      return;
    }

    // 3. TTL Freshness Check (TTL 300s / 5 mins): Discard any command older than 5 minutes
    if (now - cmdTimestamp > 300000) {
      clearRemoteCommand(parentId, childId, childName).catch(() => {});
      return;
    }

    // 4. Persistent Deduplication Check: Discard if this exact command was already executed
    const cmdId = data.id || `cmd_${cmdTimestamp}`;
    if (handledIds.has(cmdId)) {
      return;
    }

    // 5. Monotonic Sequence Check: Discard any command older than the last executed command
    if (lastHandledCmdTimestamp > 0 && cmdTimestamp < lastHandledCmdTimestamp) {
      return;
    }

    // Record as handled across app sessions
    handledIds.add(cmdId);
    saveHandledCommandId(cmdId);
    lastHandledCmdTimestamp = cmdTimestamp;
    saveLastCommandTime(cmdTimestamp);

    onCommand(data);
  };

  if (rtdb) {
    // Authoritative partitioned channel - single source of truth!
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/active`),
        (snap) => {
          if (snap.exists()) {
            handleIncoming(snap.val() as RemoteCommandData);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 10. Clear active remote command after execution (strictly partitioned)
export async function clearRemoteCommand(
  parentId: string,
  childId: string,
  childName?: string
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const clearData: RemoteCommandData = {
    id: "none",
    command: "none",
    timestamp: now,
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/active`), clearData).catch(() => {});
  }
}

// 11. Time Extension: Kid requests more time
export async function sendCloudTimeRequest(
  parentId: string,
  childId: string,
  req: { appName: string; requestedMinutes: number; reason: string; childName: string; childId?: string }
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const reqId = "req_" + Date.now();
  const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const timeReqData: TimeRequest = {
    id: reqId,
    childId: req.childId || childId,
    appName: req.appName,
    requestedMinutes: req.requestedMinutes,
    reason: req.reason,
    childName: req.childName,
    status: "pending",
    time: timeStr,
    createdAt: Date.now(),
  };

  const syncKey = getPartitionedSyncKey(parentId, childId);

  debugLogService.log({
    direction: 'kid->cloud',
    category: 'time_request',
    action: 'request_screentime_extension',
    status: 'info',
    summary: `Bé ${req.childName} gửi yêu cầu xin thêm ${req.requestedMinutes} phút cho ${req.appName} (Lý do: "${req.reason || 'Con xin thêm giờ'}")`,
    childId,
    childName: req.childName,
    payload: timeReqData,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/time_requests/${reqId}`), timeReqData).catch(() => {});
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/time_requests/${reqId}`), timeReqData).catch(() => {});
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "time_requests", reqId);
      await setDoc(docRef, { ...timeReqData, createdAt: serverTimestamp() });
    } catch (err) {}
  }
}

// 12. Time Extension: Parent subscribes to time requests (strictly partitioned)
export function subscribeCloudTimeRequests(
  parentId: string,
  childId: string,
  onRequests: (requests: TimeRequest[]) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);

  const enrichRequests = (items: any[]): TimeRequest[] => {
    return items.map((raw) => ({
      ...raw,
      childId: raw.childId || childId,
      childName: raw.childName || childName || 'Con',
    }));
  };

  if (rtdb) {
    // 1. Authoritative partitioned channel
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/time_requests`),
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: TimeRequest[] = Object.values(val);
            onRequests(enrichRequests(list.reverse().slice(0, 20)));
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Parent authenticated path fallback
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/time_requests`),
          (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const list: TimeRequest[] = Object.values(val);
              onRequests(enrichRequests(list.reverse().slice(0, 20)));
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const colRef = collection(db, "users", parentId, "children", childId, "time_requests");
      const q = query(colRef, orderBy("createdAt", "desc"), limit(20));
      const uFs = onSnapshot(
        q,
        (snapshot) => {
          const requests: TimeRequest[] = [];
          snapshot.forEach((d) => {
            requests.push({ id: d.id, ...(d.data() as any) });
          });
          if (requests.length > 0) onRequests(enrichRequests(requests));
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 13. Time Extension: Parent resolves time request (strictly partitioned)
export async function resolveCloudTimeRequest(
  parentId: string,
  childId: string,
  reqId: string,
  status: "approved" | "rejected",
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);

  debugLogService.log({
    direction: 'parent->cloud',
    category: 'time_request',
    action: `resolve_time_request_${status}`,
    status: 'info',
    summary: `Phụ huynh đã ${status === 'approved' ? 'CHẤP THUẬN' : 'TỪ CHỐI'} yêu cầu thêm giờ (${reqId})`,
    childId,
    childName,
    payload: { reqId, status },
  });

  if (rtdb) {
    rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${syncKey}/time_requests/${reqId}`), {
      status,
      resolvedAt: now,
    }).catch(() => {});

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/time_requests/${reqId}`), {
          status,
          resolvedAt: now,
        });
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "time_requests", reqId);
      await updateDoc(docRef, { status, resolvedAt: serverTimestamp() });
    } catch (err) {}
  }
}

// 14. Family Chat: Send message to Cloud (RTDB pairings/sync + Firestore)
export async function sendCloudChatMessage(
  parentId: string,
  childId: string,
  msg: CloudChatMessage,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);

  if (rtdb) {
    try {
      // 1. Authoritative partitioned channel
      const openRef = rtdbPush(rtdbRef(rtdb, `pairings/sync/${syncKey}/chat_messages`));
      const messagePayload: CloudChatMessage = {
        ...msg,
        id: openRef.key || msg.id || `msg_${now}`,
        timestamp: typeof msg.timestamp === "number" ? msg.timestamp : now,
      };
      await rtdbSet(openRef, messagePayload);

      // 2. Authenticated parent path if logged in
      if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
        const userRef = rtdbPush(rtdbRef(rtdb, `users/${parentId}/children/${childId}/chat_messages`));
        rtdbSet(userRef, messagePayload).catch(() => {});
      }
    } catch (err) {
      console.warn("RTDB sendCloudChatMessage error:", err);
    }
  }

  // Firestore sync fallback
  if (db && parentId && parentId !== "family_primary") {
    try {
      const chatColl = collection(db, "users", parentId, "children", childId, "chat_messages");
      await addDoc(chatColl, { ...msg, timestamp: serverTimestamp() });
    } catch (err) {}
  }
}

// 15. Family Chat: Subscribe to real-time chat messages (strictly partitioned)
export function subscribeCloudChatMessages(
  parentId: string,
  childId: string,
  onMessages: (msgs: CloudChatMessage[]) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const allMessagesMap = new Map<string, CloudChatMessage>();

  const dispatchSortedMessages = () => {
    const sorted = Array.from(allMessagesMap.values()).sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
    if (sorted.length > 0) {
      onMessages(sorted.slice(-50));
    }
  };

  const processSnap = (snap: any) => {
    if (!snap.exists()) return;
    const val = snap.val();
    if (!val || typeof val !== "object") return;
    let addedAny = false;
    Object.entries(val).forEach(([key, raw]: [string, any]) => {
      if (!raw || typeof raw !== "object") return;
      const msgId = raw.id || key;
      const existing = allMessagesMap.get(msgId);
      if (!existing || (raw.timestamp && raw.timestamp !== existing.timestamp)) {
        allMessagesMap.set(msgId, {
          id: msgId,
          sender: raw.sender || "parent",
          senderName: raw.senderName || "",
          text: raw.text || "",
          time: raw.time || "",
          speakTTS: Boolean(raw.speakTTS),
          timestamp: typeof raw.timestamp === "number" ? raw.timestamp : 0,
        });
        addedAny = true;
      }
    });
    if (addedAny) {
      dispatchSortedMessages();
    }
  };

  if (rtdb) {
    // 1. Authoritative partitioned channel
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/chat_messages`),
        processSnap,
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Authenticated parent path fallback
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u4 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/chat_messages`),
          processSnap,
          () => {}
        );
        unsubs.push(u4);
      } catch (err) {}
    }
  }

  // 4. Firestore listener fallback
  if (db && parentId && parentId !== "family_primary") {
    try {
      const chatColl = collection(db, "users", parentId, "children", childId, "chat_messages");
      const q = query(chatColl, orderBy("timestamp", "asc"), limit(50));
      const uFs = onSnapshot(
        q,
        (snapshot) => {
          let addedAny = false;
          snapshot.forEach((d) => {
            const data = d.data() as any;
            const msgId = d.id;
            if (!allMessagesMap.has(msgId)) {
              allMessagesMap.set(msgId, {
                id: msgId,
                sender: data.sender || "parent",
                senderName: data.senderName || "",
                text: data.text || "",
                time: data.time || "",
                speakTTS: Boolean(data.speakTTS),
                timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
              });
              addedAny = true;
            }
          });
          if (addedAny) dispatchSortedMessages();
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 16. Thoroughly fetch all children for a parent across RTDB, Firestore, pairings, active_children, sharedChildren, and local cache
export async function fetchChildrenListFromCloud(
  parentId: string,
  parentName?: string
): Promise<any[]> {
  const { db, rtdb, auth } = getFirebaseInstance();
  const childrenMap = new Map<string, any>();

  // 1. Fetch from RTDB users/{parentId}/children - only if authenticated
  if (rtdb && isFirebaseConfigured() && parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `users/${parentId}/children`));
      if (snap.exists()) {
        const val = snap.val();
        Object.values(val).forEach((c: any) => {
          if (c && c.id) childrenMap.set(c.id, c);
        });
      }
    } catch (e) {
      // ignore
    }
  }

  const cleanParent = getPartitionedParentKey(parentId);

  // 1. Fetch from RTDB users/{parentId}/children - if authenticated
  if (rtdb && isFirebaseConfigured() && parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `users/${parentId}/children`));
      if (snap.exists()) {
        const val = snap.val();
        Object.values(val).forEach((c: any) => {
          if (c && c.id) childrenMap.set(c.id, c);
        });
      }
    } catch (e) {}
  }

  // 2. Fetch from RTDB pairings/families/{cleanParent}/children (strictly partitioned per family)
  if (rtdb && isFirebaseConfigured()) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/families/${cleanParent}/children`));
      if (snap.exists()) {
        const val = snap.val();
        Object.values(val).forEach((c: any) => {
          if (c && c.id) {
            const existing = childrenMap.get(c.id) || {};
            childrenMap.set(c.id, { ...existing, ...c });
          }
        });
      }
    } catch (e) {}
  }

  // 3. Fetch from Firestore users/{parentId}/children
  if (db && isFirebaseConfigured() && parentId && parentId !== "family_primary") {
    try {
      const snap = await getDocs(collection(db, "users", parentId, "children"));
      snap.forEach((d) => {
        const data = d.data();
        const id = d.id || data.id;
        if (id) {
          const existing = childrenMap.get(id) || {};
          childrenMap.set(id, { ...existing, id, ...data });
        }
      });
    } catch (e) {}
  }

  // 4. Check localStorage pairing sessions as offline fallback (strictly matching parentId)
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("parent_pro_pairing_sessions");
      if (raw) {
        const sessions: Record<string, any> = JSON.parse(raw);
        Object.values(sessions).forEach((p: any) => {
          if (
            p &&
            p.status === "paired" &&
            p.parentId === parentId &&
            p.childId &&
            !childrenMap.has(p.childId)
          ) {
            childrenMap.set(p.childId, {
              id: p.childId,
              name: p.childName || "Bé yêu",
              avatar: p.childAvatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
              age: p.childAge || 8,
              birthYear: p.childBirthYear || (new Date().getFullYear() - (p.childAge || 8)),
              gender: p.childGender || "boy",
              status: "online",
              battery: 100,
              pairedDevice: p.childDeviceInfo,
              pairedAt: p.pairedAt || p.createdAt,
            });
          }
        });
      }
    } catch (_) {}
  }

  return Array.from(childrenMap.values());
}

// 17. Live listener for all children list (strictly partitioned per family)
export function subscribeDetailedChildrenLive(
  parentId: string,
  onChildren: (children: any[]) => void,
  parentName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !parentId) return () => {};

  const cleanParent = getPartitionedParentKey(parentId);
  let unsubRtdb: (() => void) | null = null;
  let unsubFamilyChildren: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;

  let lastFingerprint = '';
  let lastEmitTime = 0;
  const handleChildrenUpdate = (list: any[]) => {
    if (!list || list.length === 0) return;
    const now = Date.now();
    const fp = list.map((c) => `${c.id}_${c.name}_${c.activeDeviceId || ''}_${c.devices?.length || 0}_${c.battery || ''}`).join('|');
    if (fp === lastFingerprint && now - lastEmitTime < 2000) {
      return;
    }
    lastFingerprint = fp;
    lastEmitTime = now;
    onChildren(list);
  };

  // Immediately run fetch for this parent's children
  fetchChildrenListFromCloud(parentId, parentName).then((list) => {
    if (list.length > 0) handleChildrenUpdate(list);
  }).catch(() => {});

  if (rtdb) {
    // 1. Listen on strictly partitioned family children node
    try {
      unsubFamilyChildren = rtdbOnValue(
        rtdbRef(rtdb, `pairings/families/${cleanParent}/children`),
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: any[] = Object.values(val);
            if (list.length > 0) handleChildrenUpdate(list);
          }
        },
        () => {}
      );
    } catch (_) {}

    // 2. Authenticated parent path if logged in
    if (parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        unsubRtdb = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children`),
          (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const list: any[] = Object.values(val);
              if (list.length > 0) handleChildrenUpdate(list);
            }
          },
          () => {}
        );
      } catch (err) {}
    }
  }

  if (db && parentId !== "family_primary") {
    try {
      const colRef = collection(db, "users", parentId, "children");
      unsubFirestore = onSnapshot(
        colRef,
        (snapshot) => {
          const children: any[] = [];
          snapshot.forEach((d) => {
            children.push({ id: d.id, ...d.data() });
          });
          if (children.length > 0) handleChildrenUpdate(children);
        },
        () => {}
      );
    } catch (err) {}
  }

  return () => {
    if (unsubRtdb) unsubRtdb();
    if (unsubFamilyChildren) unsubFamilyChildren();
    if (unsubFirestore) unsubFirestore();
  };
}

export const subscribeChildrenListFromCloud = subscribeDetailedChildrenLive;

// 18. Register child profile in family registry
export async function registerActiveChildInCloud(
  parentId: string,
  child: { id: string; name: string; avatar?: string; age?: number; grade?: string; parentName?: string }
): Promise<void> {
  const { rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !rtdb || !child?.id) return;

  const now = Date.now();
  const cleanParent = getPartitionedParentKey(parentId);
  const data = {
    id: child.id,
    name: child.name,
    parentId: parentId || "fam_default",
    parentName: child.parentName || "Bố/Mẹ",
    avatar: child.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
    age: child.age || 8,
    grade: child.grade || "Lớp 3",
    updatedAt: now,
  };

  try {
    await rtdbSet(rtdbRef(rtdb, `pairings/families/${cleanParent}/children/${child.id}`), data);
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${child.id}`), data).catch(() => {});
    }
  } catch (e) {
    console.warn("registerActiveChildInCloud error:", e);
  }
}

// 19. KidCare auto-discovers active child profile on boot
export async function autoDiscoverMatchingChild(
  childNameHint: string = "bach"
): Promise<{ id: string; name: string; parentId: string; parentName?: string; avatar?: string; age?: number } | null> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !rtdb) return null;

  const slug = normalizeChildSlug(childNameHint);
  try {
    if (slug) {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/active_children_by_name/${slug}`));
      if (snap.exists()) {
        return snap.val();
      }
    }
    const allSnap = await rtdbGet(rtdbRef(rtdb, "pairings/active_children"));
    if (allSnap.exists()) {
      const all = allSnap.val();
      const match = Object.values(all).find((c: any) =>
        c && (normalizeChildSlug(c.name) === slug || c.name?.toLowerCase().includes(slug))
      );
      if (match) return match as any;
      const list = Object.values(all) as any[];
      if (list.length === 1 && list[0]?.id) {
        return list[0];
      }
      if (list.length > 1) {
        const sorted = list.filter((c: any) => c && c.id).sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
        if (sorted[0]?.id) return sorted[0];
      }
    }
  } catch (e) {
    console.warn("autoDiscoverMatchingChild error:", e);
  }
  return null;
}

// 20. Save or update child profile to Cloud
export async function saveChildProfileToCloud(
  parentId: string,
  child: any
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !child?.id) return;

  const now = Date.now();

  // Register in open registry for auto-discovery
  registerActiveChildInCloud(parentId, child).catch(() => {});

  if (rtdb && parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
    try {
      await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${child.id}`), {
        ...child,
        updatedAt: now,
      });
    } catch (err) {}
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", child.id);
      await setDoc(docRef, { ...child, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {}
  }
}

// 21. Delete child profile from Cloud
export async function deleteChildFromCloud(
  parentId: string,
  childId: string,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    rtdbRemove(rtdbRef(rtdb, `pairings/active_children/${childId}`)).catch(() => {});
    if (slug) {
      rtdbRemove(rtdbRef(rtdb, `pairings/active_children_by_name/${slug}`)).catch(() => {});
    }
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      rtdbRemove(rtdbRef(rtdb, `users/${parentId}/children/${childId}`)).catch(() => {});
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId);
      await deleteDoc(docRef);
    } catch (err) {}
  }
}

// 22. Log real child route point to Cloud (RTDB & Firestore - strictly partitioned)
export async function logChildRoutePointToCloud(
  parentId: string,
  childId: string,
  point: RoutePoint,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const syncKey = getPartitionedSyncKey(parentId, childId);
  const pointPayload = {
    ...point,
    childId,
    parentId,
    timestamp: now,
  };

  if (rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/routeHistory/${point.id}`), pointPayload);
      if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/routeHistory/${point.id}`), pointPayload);
      }
    } catch (err) {
      console.warn("RTDB logChildRoutePointToCloud error:", err);
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "routeHistory", point.id);
      await setDoc(docRef, { ...pointPayload, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {}
  }
}

// 23. Subscribe to real child route history from Cloud (strictly partitioned)
export function subscribeChildRouteHistoryFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (history: RoutePoint[]) => void,
  childName?: string
): () => void {
  const { rtdb, db, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);

  const parseRouteHistoryObj = (val: any): RoutePoint[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return Object.values(val) as RoutePoint[];
  };

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/routeHistory`),
        (snap) => {
          if (snap.exists()) {
            const list = parseRouteHistoryObj(snap.val());
            if (list.length > 0) onUpdate(list);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/routeHistory`),
          (snap) => {
            if (snap.exists()) {
              const list = parseRouteHistoryObj(snap.val());
              if (list.length > 0) onUpdate(list);
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const colRef = collection(db, "users", parentId, "children", childId, "routeHistory");
      const q = query(colRef, orderBy("timestamp", "asc"), limit(100));
      const uFs = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const pts = snapshot.docs.map((d) => d.data() as RoutePoint);
            onUpdate(pts);
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// 24. Sync Safe Zones to Cloud (strictly partitioned per family)
export async function syncSafeZonesToCloud(
  parentId: string,
  safeZones: SafeZone[]
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !parentId) return;

  const now = Date.now();
  const cleanParent = getPartitionedParentKey(parentId);
  const payload = {
    safeZones,
    parentId,
    updatedAt: now,
  };

  if (rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `pairings/sync/${cleanParent}/safeZones`), payload);
      if (parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/safeZones`), payload);
      }
    } catch (err) {}
  }

  if (db && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "config", "safeZones");
      await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {}
  }
}

// 25. Subscribe Safe Zones from Cloud (strictly partitioned per family)
export function subscribeSafeZonesFromCloud(
  parentId: string,
  onUpdate: (zones: SafeZone[]) => void
): () => void {
  const { rtdb, db, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !parentId) return () => {};

  const unsubs: Array<() => void> = [];
  const cleanParent = getPartitionedParentKey(parentId);

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${cleanParent}/safeZones`),
        (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            if (data && Array.isArray(data.safeZones)) {
              onUpdate(data.safeZones);
            }
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/safeZones`),
          (snap) => {
            if (snap.exists()) {
              const data = snap.val();
              if (data && Array.isArray(data.safeZones)) {
                onUpdate(data.safeZones);
              }
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "config", "safeZones");
      const uFs = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && Array.isArray(data.safeZones)) {
              onUpdate(data.safeZones);
            }
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (err) {}
  }

  return () => {
    unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
  };
}

// =========================================================================
// 17. PC Control & Remote Management (Multi-platform Computer Protection)
// =========================================================================

export async function sendRemotePcCommand(
  parentId: string,
  childId: string,
  command: RemoteCommandType,
  payload?: any,
  childName?: string
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const cmdId = `pccmd_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const cmdData: RemoteCommandData = {
    id: cmdId,
    command,
    timestamp: now,
    payload: payload || null,
    childId,
    parentId,
    childName: childName || "",
  };

  const syncKey = getPartitionedSyncKey(parentId, childId);

  debugLogService.log({
    direction: 'parent->cloud',
    category: 'command',
    action: `remote_pc_cmd_${command}`,
    status: 'info',
    summary: `Phụ huynh gửi lệnh điều khiển máy tính [${command}] đến máy con ${childName || childId}`,
    childId,
    childName,
    payload,
  });

  if (rtdb) {
    // 1. Send to primary command channel
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/commands/active`), cmdData).catch(() => {});
    // 2. Also send to dedicated PC command channel for PC background agents
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/pc_commands/active`), cmdData).catch(() => {});
  }
}

export async function syncChildPcConfigToCloud(
  parentId: string,
  childId: string,
  pcConfig: ChildPcControlConfig,
  childName?: string
): Promise<void> {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const syncKey = getPartitionedSyncKey(parentId, childId);
  const now = Date.now();
  const sanitized = sanitizeForRtdb({
    ...pcConfig,
    updatedAt: now,
    childId,
    parentId,
    childName: childName || '',
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/pcConfig`), sanitized).catch(() => {});
  }

  if (db && parentId && parentId !== 'family_primary') {
    try {
      const docRef = doc(db, 'users', parentId, 'children', childId, 'config', 'pcConfig');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (_) {}
  }
}

export function subscribeChildPcConfig(
  parentId: string,
  childId: string,
  onConfig: (config: ChildPcControlConfig) => void
): () => void {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/pcConfig`),
        (snap) => {
          if (snap.exists()) {
            onConfig(snap.val() as ChildPcControlConfig);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (_) {}
  }

  if (db && parentId && parentId !== 'family_primary') {
    try {
      const docRef = doc(db, 'users', parentId, 'children', childId, 'config', 'pcConfig');
      const uFs = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            onConfig(snap.data() as ChildPcControlConfig);
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (_) {}
  }

  return () => {
    unsubs.forEach((u) => { try { u(); } catch (_) {} });
  };
}

export async function uploadChildPcTelemetry(
  parentId: string,
  childId: string,
  telemetry: ChildPcTelemetry
): Promise<void> {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const syncKey = getPartitionedSyncKey(parentId, childId);
  const now = Date.now();
  const sanitized = sanitizeForRtdb({
    ...telemetry,
    lastSeen: now,
    updatedAt: now,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/pcTelemetry`), sanitized).catch(() => {});
  }

  if (db && parentId && parentId !== 'family_primary') {
    try {
      const docRef = doc(db, 'users', parentId, 'children', childId, 'telemetry', 'pc');
      await setDoc(docRef, sanitized, { merge: true });
    } catch (_) {}
  }
}

export function subscribeChildPcTelemetry(
  parentId: string,
  childId: string,
  onTelemetry: (telemetry: ChildPcTelemetry) => void
): () => void {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const syncKey = getPartitionedSyncKey(parentId, childId);

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${syncKey}/pcTelemetry`),
        (snap) => {
          if (snap.exists()) {
            onTelemetry(snap.val() as ChildPcTelemetry);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (_) {}
  }

  if (db && parentId && parentId !== 'family_primary') {
    try {
      const docRef = doc(db, 'users', parentId, 'children', childId, 'telemetry', 'pc');
      const uFs = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            onTelemetry(snap.data() as ChildPcTelemetry);
          }
        },
        () => {}
      );
      unsubs.push(uFs);
    } catch (_) {}
  }

  return () => {
    unsubs.forEach((u) => { try { u(); } catch (_) {} });
  };
}

// =========================================================================
// 18. Live Tracking Mode & Bandwidth Quota Management
// =========================================================================

export interface LiveTrackingState {
  active: boolean;
  expiresAt: number;
  requestedAt?: number;
}

const TELEMETRY_HISTORY_KEY = 'kidcare_telemetry_upload_history';

export function recordTelemetryUpload(): { countLastHour: number; isExcessive: boolean } {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TELEMETRY_HISTORY_KEY) : null;
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => t > oneHourAgo);
    timestamps.push(now);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TELEMETRY_HISTORY_KEY, JSON.stringify(timestamps));
    }
    return {
      countLastHour: timestamps.length,
      isExcessive: timestamps.length > 50, // Flag excessive if more than 50 uploads in an hour
    };
  } catch {
    return { countLastHour: 0, isExcessive: false };
  }
}

export function getTelemetryUploadCountLastHour(): number {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TELEMETRY_HISTORY_KEY) : null;
    if (!raw) return 0;
    const timestamps: number[] = JSON.parse(raw);
    return timestamps.filter((t) => t > oneHourAgo).length;
  } catch {
    return 0;
  }
}

export async function startLiveTracking(
  parentId: string,
  childId: string,
  durationMinutes: number = 5,
  childName?: string
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const expiresAt = now + durationMinutes * 60 * 1000;
  const syncKey = getPartitionedSyncKey(parentId, childId);

  const payload: LiveTrackingState = {
    active: true,
    expiresAt,
    requestedAt: now,
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/live_tracking`), payload).catch(() => {});
  }

  sendRemoteCommandToKid(parentId, childId, 'live_tracking_start', {
    expiresAt,
    durationMinutes,
  }, childName).catch(() => {});
}

export async function stopLiveTracking(
  parentId: string,
  childId: string,
  childName?: string
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const syncKey = getPartitionedSyncKey(parentId, childId);
  const payload: LiveTrackingState = {
    active: false,
    expiresAt: 0,
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${syncKey}/live_tracking`), payload).catch(() => {});
  }

  sendRemoteCommandToKid(parentId, childId, 'live_tracking_stop', undefined, childName).catch(() => {});
}

export function subscribeLiveTrackingState(
  parentId: string,
  childId: string,
  onState: (state: LiveTrackingState) => void
): () => void {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId || !rtdb) return () => {};

  const syncKey = getPartitionedSyncKey(parentId, childId);
  const rRef = rtdbRef(rtdb, `pairings/sync/${syncKey}/live_tracking`);

  return rtdbOnValue(
    rRef,
    (snap) => {
      if (snap.exists()) {
        const val = snap.val() as LiveTrackingState;
        if (val.expiresAt && Date.now() > val.expiresAt) {
          onState({ active: false, expiresAt: 0 });
        } else {
          onState(val);
        }
      } else {
        onState({ active: false, expiresAt: 0 });
      }
    },
    () => {}
  );
}


