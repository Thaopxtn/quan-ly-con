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
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  update as rtdbUpdate,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
  push as rtdbPush,
} from "firebase/database";
import { getFirebaseInstance } from "./firebaseService";
import { isFirebaseConfigured } from "./firebaseConfig";
import { ChildSpecificSettings, TimeRequest, RoutePoint, SafeZone, ChildDeviceInfo } from "../types";

export interface CloudChatMessage {
  id?: string;
  sender: "parent" | "kid";
  senderName: string;
  text: string;
  time: string;
  speakTTS?: boolean;
  timestamp?: any;
}

export interface CloudSOSAlert {
  active: boolean;
  time: string;
  lat: number;
  lng: number;
  address: string;
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
  | "none";

export interface RemoteCommandData {
  id?: string;
  command: RemoteCommandType;
  timestamp: number;
  payload?: any;
  childId?: string;
  childName?: string;
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

// 1. Sync settings from Parent to Cloud (RTDB pairings/sync + users)
export async function syncChildSettingsToCloud(
  parentId: string,
  childId: string,
  settings: Partial<ChildSpecificSettings>,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const slug = normalizeChildSlug(childName);
  const payload = sanitizeForRtdb({
    ...settings,
    updatedAt: now,
  });

  // RTDB sync
  if (rtdb) {
    // Open sync channels (always accessible without parent auth barrier)
    rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${childId}/settings`), payload).catch(() => {});
    if (slug && slug !== childId) {
      rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${slug}/settings`), payload).catch(() => {});
    }

    if (parentId && parentId !== "family_primary") {
      rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/settings`), payload).catch(() => {});
      if (auth?.currentUser && auth.currentUser.uid === parentId) {
        try {
          await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/settings`), payload);
        } catch (err) {
          // Can fail if non-auth, open channels above already succeeded
        }
      }
    }
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
    } catch (err) {
      // ignore
    }
  }
}

// 1b. Fast Dedicated Stars Sync Channel (Real-time 2-way sync for stars and rewards)
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
  const slug = normalizeChildSlug(childName);
  const payload = sanitizeForRtdb({
    stars,
    transaction: transaction || null,
    updatedAt: now,
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/stars`), payload).catch(() => {});
    if (slug && slug !== childId) {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/stars`), payload).catch(() => {});
    }
    if (parentId && parentId !== "family_primary") {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/stars`), payload).catch(() => {});
      if (auth?.currentUser && auth.currentUser.uid === parentId) {
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/stars`), payload).catch(() => {});
      }
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "config", "stars");
      await setDoc(docRef, { stars, transaction: transaction || null, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  }
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
  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    // 1. By childId
    try {
      const u1 = rtdbOnValue(rtdbRef(rtdb, `pairings/sync/${childId}/stars`), (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val && typeof val.stars === 'number') {
            onUpdate(val);
          }
        }
      }, () => {});
      unsubs.push(u1);
    } catch (_) {}

    // 2. By combined parent_child
    if (parentId && parentId !== "family_primary") {
      try {
        const uPair = rtdbOnValue(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/stars`), (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val.stars === 'number') {
              onUpdate(val);
            }
          }
        }, () => {});
        unsubs.push(uPair);
      } catch (_) {}
    }

    // 3. By slug
    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(rtdbRef(rtdb, `pairings/sync/${slug}/stars`), (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val.stars === 'number') {
              onUpdate(val);
            }
          }
        }, () => {});
        unsubs.push(u2);
      } catch (_) {}
    }

    // 4. Authenticated parent user path
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(rtdbRef(rtdb, `users/${parentId}/children/${childId}/stars`), (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val.stars === 'number') {
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

// 2. Subscribe to settings changes on Child Device
export function subscribeChildSettingsFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (settings: Partial<ChildSpecificSettings>) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);

  // RTDB listeners
  if (rtdb) {
    // 1. Open channel by childId
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/settings`),
        (snap) => {
          if (snap.exists()) {
            onUpdate(snap.val() as Partial<ChildSpecificSettings>);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 1b. Open channel by parentId_childId
    if (parentId && parentId !== "family_primary") {
      try {
        const uPair = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/settings`),
          (snap) => {
            if (snap.exists()) {
              onUpdate(snap.val() as Partial<ChildSpecificSettings>);
            }
          },
          () => {}
        );
        unsubs.push(uPair);
      } catch (err) {}
    }

    // 2. Open channel by slug (e.g. 'bach')
    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/settings`),
          (snap) => {
            if (snap.exists()) {
              onUpdate(snap.val() as Partial<ChildSpecificSettings>);
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    // 3. Parent user path - only when authenticated to avoid permission_denied
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/settings`),
          (snap) => {
            if (snap.exists()) {
              onUpdate(snap.val() as Partial<ChildSpecificSettings>);
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
            onUpdate(snapshot.data() as Partial<ChildSpecificSettings>);
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

  const now = Date.now();
  const deviceData = sanitizeForRtdb({
    ...device,
    childId,
    parentId: parentId || 'family_primary',
    updatedAt: now,
  });

  if (rtdb) {
    try {
      // 1. Register in child's open sync channel devices
      await rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/devices/${device.deviceId}`), deviceData);
      // 2. Register in global active devices directory
      await rtdbSet(rtdbRef(rtdb, `pairings/active_devices/${device.deviceId}`), deviceData);
      // 3. Register under parent's child devices path
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
  // Offline check: If device is offline, immediately save to offline queue
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (autoQueue) {
      queueOfflineTelemetry(childId, telemetry);
    }
    return;
  }

  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) {
    if (autoQueue) {
      queueOfflineTelemetry(childId, telemetry);
    }
    return;
  }

  const now = Date.now();
  const effectiveChildName = childName || telemetry.childName || "";
  const slug = normalizeChildSlug(effectiveChildName);
  const payload = sanitizeForRtdb({
    ...telemetry,
    childId,
    childName: effectiveChildName,
    lastUpdated: now,
    isOnline: true,
  });

  let uploadSuccess = false;

  // 1. Write to Realtime Database via Open Sync Channel (Always succeeds without auth issues)
  if (rtdb) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${childId}/telemetry`), payload);
      if (slug && slug !== childId) {
        await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${slug}/telemetry`), payload);
      }
      if (telemetry.deviceId) {
        const devPayload = sanitizeForRtdb({
          deviceId: telemetry.deviceId,
          childId,
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
        rtdbUpdate(rtdbRef(rtdb, `pairings/sync/devices/${telemetry.deviceId}/telemetry`), devPayload).catch(() => {});
        rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${childId}/devices/${telemetry.deviceId}`), devPayload).catch(() => {});
      }
      uploadSuccess = true;
    } catch (err) {
      console.warn("RTDB open channel telemetry error:", err);
    }

    // Try users/ path only when authenticated as parent
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}/telemetry`), payload);
        await rtdbUpdate(rtdbRef(rtdb, `users/${parentId}/children/${childId}`), sanitizeForRtdb({
          battery: telemetry.battery,
          speed: telemetry.speed,
          lat: telemetry.lat,
          lng: telemetry.lng,
          currentAddress: telemetry.currentAddress,
          isScreenOn: telemetry.isScreenOn,
          screenState: telemetry.screenState,
          appStatus: telemetry.appStatus,
          syncMode: telemetry.syncMode,
          isOnline: true,
          lastSeen: now,
          screenTimeUsedMinutes: telemetry.screenTimeUsedMinutes,
          activeOpenedApp: telemetry.activeOpenedApp,
          sensors: telemetry.sensors,
        }));
      } catch (err) {
        // Can fail if non-auth, open channels above already succeeded
      }
    }
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
}

// 4. Subscribe to child telemetry in real-time
export function subscribeChildTelemetryFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (telemetry: any) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    // 1. Listen on open channel by childId
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/telemetry`),
        (snap) => {
          if (snap.exists()) {
            onUpdate(snap.val());
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Listen on open channel by slug (e.g. 'bach')
    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/telemetry`),
          (snap) => {
            if (snap.exists()) {
              onUpdate(snap.val());
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    // 3. Listen on users path - only when authenticated as parent
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/telemetry`),
          (snap) => {
            if (snap.exists()) {
              onUpdate(snap.val());
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
            onUpdate(snapshot.data());
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
  const slug = normalizeChildSlug(effectiveName);
  const sosData = {
    active: true,
    time: sosInfo.time,
    lat: sosInfo.lat,
    lng: sosInfo.lng,
    address: sosInfo.address,
    childId,
    childName: effectiveName,
    updatedAt: now,
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/sos`), sosData).catch(() => {});
    if (slug && slug !== childId) {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/sos`), sosData).catch(() => {});
    }
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/sos`), sosData);
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

// 6. Emergency SOS: Parent or Child resolves SOS
export async function resolveCloudSOS(parentId: string, childId: string, childName?: string): Promise<void> {
  const { db, rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const slug = normalizeChildSlug(childName);
  const resolveData = {
    active: false,
    resolvedAt: now,
  };

  if (rtdb) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${childId}/sos`), resolveData);
    } catch (_) {}
    if (slug && slug !== childId) {
      try {
        await rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${slug}/sos`), resolveData);
      } catch (_) {}
    }
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

// 7. Subscribe to SOS alert from Cloud
export function subscribeCloudSOS(
  parentId: string,
  childId: string,
  onSOSUpdate: (sosData: CloudSOSAlert) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/sos`),
        (snap) => {
          if (snap.exists()) {
            onSOSUpdate(snap.val() as CloudSOSAlert);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/sos`),
          (snap) => {
            if (snap.exists()) {
              onSOSUpdate(snap.val() as CloudSOSAlert);
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/sos`),
          (snap) => {
            if (snap.exists()) {
              onSOSUpdate(snap.val() as CloudSOSAlert);
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
            onSOSUpdate(snapshot.data() as CloudSOSAlert);
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
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const cmdId = `cmd_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const slug = normalizeChildSlug(childName);

  const cmdData: RemoteCommandData = {
    id: cmdId,
    command,
    timestamp: now,
    payload: payload || null,
    childId,
    childName: childName || "",
  };

  if (rtdb) {
    // 1. Open sync channel by childId
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/commands/active`), cmdData).catch((e) =>
      console.warn("RTDB sendRemoteCommand childId error:", e)
    );

    // 2. Open sync channel by slug (e.g. 'bach')
    if (slug && slug !== childId) {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/commands/active`), cmdData).catch(() => {});
    }

    // 3. Paired channel and user channel
    if (parentId && parentId !== "family_primary") {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/commands/active`), cmdData).catch(() => {});
      if (auth?.currentUser && auth.currentUser.uid === parentId) {
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/commands/active`), cmdData).catch(() => {});
      }
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "commands", "active");
      await setDoc(docRef, cmdData);
    } catch (err) {}
  }
}

// 9. Subscribe to Remote Commands on Kid Device (Resilient: deduplicated by ID, no clock drift drops)
export function subscribeRemoteCommandsOnKid(
  parentId: string,
  childId: string,
  onCommand: (cmd: RemoteCommandData) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);
  let lastHandledCmdId = "";

  const handleIncoming = (data: RemoteCommandData | null) => {
    if (!data || !data.command || data.command === "none") return;
    const cmdId = data.id || `cmd_${data.timestamp}`;
    if (cmdId === lastHandledCmdId) return; // Deduplicate
    lastHandledCmdId = cmdId;
    onCommand(data);
  };

  if (rtdb) {
    // 1. Listen on open channel by childId
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/commands/active`),
        (snap) => {
          if (snap.exists()) {
            handleIncoming(snap.val() as RemoteCommandData);
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Listen on open channel by slug (e.g. 'bach')
    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/commands/active`),
          (snap) => {
            if (snap.exists()) {
              handleIncoming(snap.val() as RemoteCommandData);
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    // 3. Paired channel and user path
    if (parentId && parentId !== "family_primary") {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/commands/active`),
          (snap) => {
            if (snap.exists()) {
              handleIncoming(snap.val() as RemoteCommandData);
            }
          },
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}

      if (auth?.currentUser && auth.currentUser.uid === parentId) {
        try {
          const u4 = rtdbOnValue(
            rtdbRef(rtdb, `users/${parentId}/children/${childId}/commands/active`),
            (snap) => {
              if (snap.exists()) {
                handleIncoming(snap.val() as RemoteCommandData);
              }
            },
            () => {}
          );
          unsubs.push(u4);
        } catch (err) {}
      }
    }
  }

  if (db && parentId && parentId !== "family_primary") {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "commands", "active");
      const uFs = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            handleIncoming(snapshot.data() as RemoteCommandData);
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

// 10. Clear active remote command after execution
export async function clearRemoteCommand(
  parentId: string,
  childId: string,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const now = Date.now();
  const slug = normalizeChildSlug(childName);
  const clearData: RemoteCommandData = {
    id: "none",
    command: "none",
    timestamp: now,
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/commands/active`), clearData).catch(() => {});
    if (slug && slug !== childId) {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/commands/active`), clearData).catch(() => {});
    }
    if (parentId && parentId !== "family_primary") {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/commands/active`), clearData).catch(() => {});
      if (auth?.currentUser && auth.currentUser.uid === parentId) {
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/commands/active`), clearData).catch(() => {});
      }
    }
  }

  if (db && parentId) {
    try {
      const docRef = doc(db, "users", parentId, "children", childId, "commands", "active");
      await setDoc(docRef, clearData);
    } catch (err) {}
  }
}

// 11. Time Extension: Kid requests more time
export async function sendCloudTimeRequest(
  parentId: string,
  childId: string,
  req: { appName: string; requestedMinutes: number; reason: string; childName: string }
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const reqId = "req_" + Date.now();
  const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const timeReqData = {
    id: reqId,
    ...req,
    status: "pending",
    time: timeStr,
    createdAt: Date.now(),
  };

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/time_requests/${reqId}`), timeReqData).catch(() => {});
    const slug = normalizeChildSlug(req.childName);
    if (slug && slug !== childId) {
      rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/time_requests/${reqId}`), timeReqData).catch(() => {});
    }
    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}/time_requests/${reqId}`), timeReqData);
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

// 12. Time Extension: Parent subscribes to time requests
export function subscribeCloudTimeRequests(
  parentId: string,
  childId: string,
  onRequests: (requests: TimeRequest[]) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/time_requests`),
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list: TimeRequest[] = Object.values(val);
            onRequests(list.reverse().slice(0, 20));
          }
        },
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/time_requests`),
          (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const list: TimeRequest[] = Object.values(val);
              onRequests(list.reverse().slice(0, 20));
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    if (parentId && parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children/${childId}/time_requests`),
          (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const list: TimeRequest[] = Object.values(val);
              onRequests(list.reverse().slice(0, 20));
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
          if (requests.length > 0) onRequests(requests);
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

// 13. Time Extension: Parent resolves time request
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
  const slug = normalizeChildSlug(childName);

  if (rtdb) {
    rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${childId}/time_requests/${reqId}`), {
      status,
      resolvedAt: now,
    }).catch(() => {});
    if (slug && slug !== childId) {
      rtdbUpdate(rtdbRef(rtdb, `pairings/sync/${slug}/time_requests/${reqId}`), {
        status,
        resolvedAt: now,
      }).catch(() => {});
    }
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
  // Ensure slug correctly resolves to the child's slug
  const slug = normalizeChildSlug(childName || (msg.sender === "kid" ? msg.senderName : ""));

  if (rtdb) {
    try {
      // 1. Primary open sync channel by childId (Guaranteed accessible without auth barrier)
      const openRef = rtdbPush(rtdbRef(rtdb, `pairings/sync/${childId}/chat_messages`));
      const messagePayload: CloudChatMessage = {
        ...msg,
        id: openRef.key || msg.id || `msg_${now}`,
        timestamp: typeof msg.timestamp === "number" ? msg.timestamp : now,
      };
      await rtdbSet(openRef, messagePayload);

      // 2. Open sync channel by child slug (e.g. 'bach')
      if (slug && slug !== childId) {
        const slugRef = rtdbPush(rtdbRef(rtdb, `pairings/sync/${slug}/chat_messages`));
        rtdbSet(slugRef, { ...messagePayload, id: slugRef.key || messagePayload.id }).catch(() => {});
      }

      // 3. Paired channel
      if (parentId && parentId !== "family_primary") {
        rtdbSet(
          rtdbPush(rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/chat_messages`)),
          messagePayload
        ).catch(() => {});

        // Only attempt users/ path if authenticated as parent to prevent permission_denied
        if (auth?.currentUser && auth.currentUser.uid === parentId) {
          const userRef = rtdbPush(rtdbRef(rtdb, `users/${parentId}/children/${childId}/chat_messages`));
          rtdbSet(userRef, messagePayload).catch(() => {});
        }
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

// 15. Family Chat: Subscribe to real-time chat messages
export function subscribeCloudChatMessages(
  parentId: string,
  childId: string,
  onMessages: (msgs: CloudChatMessage[]) => void,
  childName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);
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
    // 1. Primary open sync channel by childId
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/chat_messages`),
        processSnap,
        () => {}
      );
      unsubs.push(u1);
    } catch (err) {}

    // 2. Open sync channel by slug (e.g. 'bach')
    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/chat_messages`),
          processSnap,
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

    // 3. Paired channel
    if (parentId && parentId !== "family_primary") {
      try {
        const u3 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${parentId}_${childId}/chat_messages`),
          processSnap,
          () => {}
        );
        unsubs.push(u3);
      } catch (err) {}

      // Only listen on users/ if authenticated as parent to avoid permission_denied
      if (auth?.currentUser && auth.currentUser.uid === parentId) {
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

  // 2. Fetch from RTDB pairings/active_children (open registry)
  if (rtdb && isFirebaseConfigured()) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, "pairings/active_children"));
      if (snap.exists()) {
        const val = snap.val();
        Object.values(val).forEach((c: any) => {
          if (c && c.id && (!parentId || c.parentId === parentId || c.parentId === "family_primary")) {
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

  // 4. Scan RTDB pairings for any completed pairings matching this parentId or parentName
  if (rtdb && isFirebaseConfigured()) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, "pairings"));
      if (snap.exists()) {
        const allPairings = snap.val();
        Object.values(allPairings).forEach((p: any) => {
          if (
            p &&
            p.status === "paired" &&
            (p.parentId === parentId || (parentName && p.parentName === parentName) || !p.parentId) &&
            p.childId
          ) {
            const existing = childrenMap.get(p.childId) || {};
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
              ...existing,
            });
          }
        });
      }
    } catch (e) {}
  }

  // 5. Check localStorage pairing sessions as offline fallback
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("parent_pro_pairing_sessions");
      if (raw) {
        const sessions: Record<string, any> = JSON.parse(raw);
        Object.values(sessions).forEach((p: any) => {
          if (
            p &&
            p.status === "paired" &&
            (p.parentId === parentId || (parentName && p.parentName === parentName)) &&
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

// 17. Live listener for all children list
export function subscribeDetailedChildrenLive(
  parentId: string,
  onChildren: (children: any[]) => void,
  parentName?: string
): () => void {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !parentId) return () => {};

  let unsubRtdb: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;
  let unsubRtdbPairings: (() => void) | null = null;
  let unsubActiveChildren: (() => void) | null = null;

  // Immediately run comprehensive multi-source fetch
  fetchChildrenListFromCloud(parentId, parentName).then((list) => {
    if (list.length > 0) onChildren(list);
  }).catch(() => {});

  if (rtdb) {
    if (parentId !== "family_primary" && auth?.currentUser && auth.currentUser.uid === parentId) {
      try {
        unsubRtdb = rtdbOnValue(
          rtdbRef(rtdb, `users/${parentId}/children`),
          (snap) => {
            if (snap.exists()) {
              const val = snap.val();
              const list: any[] = Object.values(val);
              if (list.length > 0) onChildren(list);
            }
          },
          () => {}
        );
      } catch (err) {}
    }

    // Listen on pairings/active_children
    try {
      unsubActiveChildren = rtdbOnValue(
        rtdbRef(rtdb, "pairings/active_children"),
        (snap) => {
          if (snap.exists()) {
            fetchChildrenListFromCloud(parentId, parentName).then((list) => {
              if (list.length > 0) onChildren(list);
            }).catch(() => {});
          }
        },
        () => {}
      );
    } catch (_) {}

    // Also listen to pairings in RTDB for real-time detection when kid connects
    try {
      unsubRtdbPairings = rtdbOnValue(
        rtdbRef(rtdb, "pairings"),
        (snap) => {
          if (snap.exists()) {
            fetchChildrenListFromCloud(parentId, parentName).then((list) => {
              if (list.length > 0) onChildren(list);
            }).catch(() => {});
          }
        },
        () => {}
      );
    } catch (_) {}
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
          if (children.length > 0) onChildren(children);
        },
        () => {}
      );
    } catch (err) {}
  }

  return () => {
    if (unsubRtdb) unsubRtdb();
    if (unsubActiveChildren) unsubActiveChildren();
    if (unsubRtdbPairings) unsubRtdbPairings();
    if (unsubFirestore) unsubFirestore();
  };
}

export const subscribeChildrenListFromCloud = subscribeDetailedChildrenLive;

// 18. Register child profile in open registry so KidCare can auto-discover
export async function registerActiveChildInCloud(
  parentId: string,
  child: { id: string; name: string; avatar?: string; age?: number; grade?: string; parentName?: string }
): Promise<void> {
  const { rtdb } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !rtdb || !child?.id) return;

  const now = Date.now();
  const slug = normalizeChildSlug(child.name);
  const data = {
    id: child.id,
    name: child.name,
    parentId: parentId || "family_primary",
    parentName: child.parentName || "Bố/Mẹ",
    avatar: child.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
    age: child.age || 8,
    grade: child.grade || "Lớp 3",
    updatedAt: now,
  };

  try {
    await rtdbSet(rtdbRef(rtdb, `pairings/active_children/${child.id}`), data);
    if (slug) {
      await rtdbSet(rtdbRef(rtdb, `pairings/active_children_by_name/${slug}`), data);
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

// 22. Log real child route point to Cloud (RTDB & Firestore)
export async function logChildRoutePointToCloud(
  parentId: string,
  childId: string,
  point: RoutePoint,
  childName?: string
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return;

  const slug = normalizeChildSlug(childName);
  const now = Date.now();
  const pointPayload = {
    ...point,
    timestamp: now,
  };

  if (rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `pairings/sync/${childId}/routeHistory/${point.id}`), pointPayload);
      if (slug && slug !== childId) {
        await rtdbSet(rtdbRef(rtdb, `pairings/sync/${slug}/routeHistory/${point.id}`), pointPayload);
      }
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

// 23. Subscribe to real child route history from Cloud
export function subscribeChildRouteHistoryFromCloud(
  parentId: string,
  childId: string,
  onUpdate: (history: RoutePoint[]) => void,
  childName?: string
): () => void {
  const { rtdb, db, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !childId) return () => {};

  const unsubs: Array<() => void> = [];
  const slug = normalizeChildSlug(childName);

  const parseRouteHistoryObj = (val: any): RoutePoint[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return Object.values(val) as RoutePoint[];
  };

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/${childId}/routeHistory`),
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

    if (slug && slug !== childId) {
      try {
        const u2 = rtdbOnValue(
          rtdbRef(rtdb, `pairings/sync/${slug}/routeHistory`),
          (snap) => {
            if (snap.exists()) {
              const list = parseRouteHistoryObj(snap.val());
              if (list.length > 0) onUpdate(list);
            }
          },
          () => {}
        );
        unsubs.push(u2);
      } catch (err) {}
    }

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

// 24. Sync Safe Zones to Cloud
export async function syncSafeZonesToCloud(
  parentId: string,
  safeZones: SafeZone[]
): Promise<void> {
  const { db, rtdb, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !parentId) return;

  const now = Date.now();
  const payload = {
    safeZones,
    updatedAt: now,
  };

  if (rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `pairings/sync/safeZones`), payload);
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

// 25. Subscribe Safe Zones from Cloud
export function subscribeSafeZonesFromCloud(
  parentId: string,
  onUpdate: (zones: SafeZone[]) => void
): () => void {
  const { rtdb, db, auth } = getFirebaseInstance();
  if (!isFirebaseConfigured()) return () => {};

  const unsubs: Array<() => void> = [];

  if (rtdb) {
    try {
      const u1 = rtdbOnValue(
        rtdbRef(rtdb, `pairings/sync/safeZones`),
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

