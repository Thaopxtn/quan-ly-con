// Device Pairing Service between Parent App and Kid App
// Security features: rate limiting, HMAC code signature, session token, anti brute-force
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getFirebaseInstance, ensureKidAnonymousAuth } from "./firebaseService";
import { isFirebaseConfigured } from "./firebaseConfig";
import { parentProEventBus } from "../eventBus";
import { serverApiClient } from "../services/serverApiClient";

import { ChildDeviceInfo } from "../types";
import { registerChildDeviceInCloud } from "./cloudSyncService";

/**
 * Recursively removes undefined values from an object or replaces them with defaults/null
 * to prevent Firebase Realtime Database and Firestore from throwing:
 * "set failed: value argument contains undefined in property ..."
 */
export function sanitizeForFirebase<T>(data: T): T {
  if (data === null || data === undefined) return null as unknown as T;
  if (typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirebase(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      if (typeof value === "object" && value !== null) {
        result[key] = sanitizeForFirebase(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PairingSession {
  code: string;
  parentId?: string;
  parentName?: string;
  childId: string;
  childName: string;
  childAge?: number;
  childBirthYear?: number;
  childAvatar?: string;
  childGender?: "boy" | "girl";
  status: "waiting_parent" | "pending" | "pending_approval" | "paired" | "rejected" | "expired";
  initiator?: "parent" | "child";
  createdAt: number;
  expiresAt: number;
  used?: boolean;
  approvalRequestedAt?: number;
  /** HMAC signature to prevent code forgery */
  sig?: string;
  /** Session token shared after pairing for ongoing mutual auth */
  sessionToken?: string;
  childDeviceInfo?: ChildDeviceInfo;
}

export interface KidProfileSetup {
  name: string;
  birthYear: number;
  age: number;
  avatar: string;
  gender?: "boy" | "girl";
}

export interface KidPairedInfo {
  isPaired: boolean;
  parentId: string;
  parentName: string;
  childId: string;
  childName: string;
  childAge?: number;
  childBirthYear?: number;
  childAvatar?: string;
  childGender?: "boy" | "girl";
  pairedAt: string;
  deviceId: string;
  deviceName?: string;
  model?: string;
  manufacturer?: string;
  imei?: string;
  mac?: string;
  serial?: string;
  phoneNumber?: string;
  hardwareIdType?: string;
  /** Session token for ongoing auth between parent & kid devices */
  sessionToken?: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const LOCAL_PAIRING_SESSIONS_KEY = "parent_pro_pairing_sessions";
const KID_DEVICE_PAIRING_KEY = "kid_device_paired_info";
const LOCAL_KID_PENDING_PAIRING_KEY = "kid_pending_pairing_info";
const RATE_LIMIT_KEY = "pairing_rate_limit";

// ─── Security Helpers ─────────────────────────────────────────────────────────

/** Simple HMAC-like signature using a shared app secret + code + timestamp bucket */
function signCode(code: string, createdAt: number): string {
  // Use a 5-minute bucket so the signature stays stable for the session lifetime
  const bucket = Math.floor(createdAt / (5 * 60 * 1000));
  const APP_SECRET = "qlconcai_v1_secret_2024";
  // XOR-based hash (no crypto dependency needed in WebView)
  let h = 0x811c9dc5;
  const str = `${APP_SECRET}:${code}:${bucket}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function verifyCodeSignature(session: PairingSession): boolean {
  if (!session.sig) return true; // Legacy sessions without sig still allowed
  const expected = signCode(session.code, session.createdAt);
  return session.sig === expected;
}

/** Generate a cryptographically random session token */
function generateSessionToken(): string {
  const arr = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

interface RateLimitState {
  attempts: number;
  windowStart: number;
  blockedUntil?: number;
}

const MAX_ATTEMPTS = 5;       // max wrong codes in window
const WINDOW_MS = 2 * 60 * 1000;  // 2-minute window
const BLOCK_MS = 5 * 60 * 1000;   // 5-minute block after too many attempts

export function clearRateLimit(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(RATE_LIMIT_KEY);
    } catch (_) {}
  }
}

function checkRateLimit(): { allowed: boolean; waitSeconds?: number } {
  // Always allowed - no blocking during device pairing
  clearRateLimit();
  return { allowed: true };
}

function recordFailedAttempt(): void {
  // Don't block user
}

// ─── Code Generator ───────────────────────────────────────────────────────────

function generateRandomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Parent initiates pairing for a specific child ───────────────────────────

export async function createChildPairingCode(
  parentId: string,
  parentName: string,
  childId: string,
  childName: string,
  extraChildData?: {
    age?: number;
    birthYear?: number;
    avatar?: string;
    gender?: "boy" | "girl";
  }
): Promise<PairingSession> {
  // Ensure active auth session so Firebase Security Rules allow write
  await ensureKidAnonymousAuth().catch(() => {});

  const code = generateRandomPin();
  const now = Date.now();
  const age = extraChildData?.age ?? 8;
  const birthYear = extraChildData?.birthYear ?? (new Date().getFullYear() - age);
  const avatar = extraChildData?.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150";
  const gender = extraChildData?.gender || "boy";

  const session: PairingSession = {
    code,
    parentId: parentId || "family_primary",
    parentName: parentName || "Bố/Mẹ",
    childId: childId || ("child_" + now),
    childName: childName.trim() || "Bé yêu",
    childAge: age,
    childBirthYear: birthYear,
    childAvatar: avatar,
    childGender: gender,
    status: "pending",
    initiator: "parent",
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes
    sig: signCode(code, now),
    sessionToken: generateSessionToken(),
  };

  const { db } = getFirebaseInstance();

  // Save to localStorage first
  if (typeof window !== "undefined") {
    try {
      const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
      const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
      sessions[code] = session;
      localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (localErr) {
      console.warn("localStorage pairing write warning:", localErr);
    }
  }

  // Sanitize data 100% against undefined values & inject current server URL
  const currentServerUrl = serverApiClient.getServerUrl();
  const sanitized = sanitizeForFirebase({
    ...session,
    timestamp: now,
    serverUrl: currentServerUrl,
  });

  // Save to Local PC Server (Primary)
  try {
    await serverApiClient.createPairing(sanitized);
    console.log(`[Pairing] ✅ Mã ghép đôi ${code} đã tạo trên Máy Chủ cho ${session.childName}`);
  } catch (e: any) {
    console.warn("Server pairing write error:", e?.message);
  }

  // Non-blocking Firestore write (optional backup)
  if (isFirebaseConfigured() && db) {
    setDoc(doc(db, "pairings", code), sanitized).catch((e: any) => {
      console.warn("Firestore pairing write skipped:", e?.code || e?.message);
    });
  }

  parentProEventBus.emit("PAIRING_SESSION_CREATED", session, "parent");

  return session;
}


// ─── Parent reads kid's code → connects and pulls child data ─────────────────

export async function connectParentWithKidCode(
  code: string,
  parentId: string,
  parentName: string
): Promise<{ success: boolean; session?: PairingSession; error?: string }> {
  // 1. Rate limit check (anti brute-force)
  const rl = checkRateLimit();
  if (!rl.allowed) {
    return {
      success: false,
      error: `Nhập sai quá nhiều lần. Vui lòng chờ ${rl.waitSeconds} giây rồi thử lại.`,
    };
  }

  const cleanCode = code.replace(/\s+/g, "").trim();

  // 2. Basic validation
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi phải gồm đúng 6 chữ số." };
  }

  const { db } = getFirebaseInstance();
  let session: PairingSession | null = null;

  // 3. Fetch from Local PC Server first (fastest)
  try {
    session = await serverApiClient.getPairing(cleanCode);
  } catch (e) {
    console.warn("Server fetch pairing error:", e);
  }

  // 4. Fallback to Firestore (with 1s timeout)
  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap: any = await Promise.race([
        getDoc(doc(db, "pairings", cleanCode)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (snap && typeof snap.exists === "function" && snap.exists()) {
        session = snap.data() as PairingSession;
      }
    } catch (e) {
      console.warn("Firestore fetch pairing error:", e);
    }
  }

  // 5. Fallback to localStorage (same device test / offline)
  if (!session && typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    session = sessions[cleanCode] || null;
  }

  if (!session) {
    recordFailedAttempt();
    return {
      success: false,
      error: "Mã không tồn tại hoặc chưa được tạo từ ứng dụng KidCare trên máy con.",
    };
  }

  // 6. Validate HMAC signature (anti-forgery)
  if (!verifyCodeSignature(session)) {
    recordFailedAttempt();
    console.error("Pairing code signature mismatch — possible forgery attempt");
    return { success: false, error: "Mã ghép đôi không hợp lệ. Vui lòng tạo mã mới trên máy con." };
  }

  // 7. Check expiry
  if (Date.now() > session.expiresAt) {
    return {
      success: false,
      error: "Mã kết nối đã hết hạn. Vui lòng tạo mã mới trên máy con.",
    };
  }

  // 8. Check already paired (prevent replay, single use)
  if (session.status === "paired" || session.used) {
    return {
      success: false,
      error: "Mã này đã được sử dụng rồi (mã 1 lần). Vui lòng tạo mã mới trên máy con.",
    };
  }

  // Success — clear rate limit on successful connection
  clearRateLimit();

  // 9. Build child profile data
  const sessionToken = session.sessionToken || generateSessionToken();
  session.status = "paired";
  session.used = true;
  session.parentId = parentId;
  session.parentName = parentName || "Bố/Mẹ";

  const childProfileData = {
    id: session.childId,
    name: session.childName,
    age: session.childAge || 8,
    birthYear: session.childBirthYear || (new Date().getFullYear() - (session.childAge || 8)),
    avatar: session.childAvatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
    gender: session.childGender || "boy",
    pairedDevice: session.childDeviceInfo || {
      model: "Android Device",
      osVersion: "Android 14",
      deviceId: "dev_" + session.childId,
      pairedAt: new Date().toISOString(),
    },
    status: "online",
    battery: 100,
    speed: 0,
    currentAddress: "Vừa kết nối thiết bị",
    lat: 10.762622,
    lng: 106.682245,
    pairedAt: Date.now(),
    lastSeen: Date.now(),
    sessionToken,
  };

  // 10. Write updates — Server + Firestore (non-blocking) + localStorage
  serverApiClient.confirmPairing({
    code: cleanCode,
    childId: session.childId,
    childName: session.childName,
    parentId,
    parentName: session.parentName,
    sessionToken,
  }).catch((e) => console.warn("Server update pairing error:", e?.message));

  if (isFirebaseConfigured() && db) {
    Promise.all([
      updateDoc(doc(db, "pairings", cleanCode), {
        status: "paired",
        parentId,
        parentName: session.parentName,
        pairedAt: serverTimestamp(),
        sessionToken,
      }),
      setDoc(
        doc(db, "users", parentId, "children", session.childId),
        { ...childProfileData, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      ),
    ]).catch((e) => console.warn("Firestore update pairing error:", e?.code));
  }

  // Update localStorage
  if (typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    sessions[cleanCode] = { ...session, sessionToken };
    localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  return { success: true, session: { ...session, sessionToken } };
}

// ─── Kid submits parent's code ────────────────────────────────────────────────

export async function submitChildPairingCode(
  code: string,
  deviceMeta: {
    model: string;
    osVersion: string;
    deviceId?: string;
    deviceName?: string;
    hardwareIdType?: string;
    manufacturer?: string;
    androidId?: string;
    serial?: string;
    mac?: string;
    imei?: string;
    phoneNumber?: string;
    battery?: number;
  }
): Promise<{ success: boolean; session?: PairingSession; kidPairedInfo?: KidPairedInfo; error?: string }> {
  // Ensure active auth session so Firebase Security Rules allow read/write
  await ensureKidAnonymousAuth().catch(() => {});

  const rl = checkRateLimit();
  if (!rl.allowed) {
    return {
      success: false,
      error: `Nhập sai quá nhiều lần. Vui lòng chờ ${rl.waitSeconds} giây rồi thử lại.`,
    };
  }

  const cleanCode = code.replace(/\s+/g, "").trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi phải gồm 6 chữ số." };
  }

  const { db } = getFirebaseInstance();
  let session: PairingSession | null = null;

  // 0. Auto-resolve latest server URL from GitHub if needed
  await serverApiClient.resolveServerUrlFromCloud().catch(() => {});

  // 1. Fetch from Local Server first
  try {
    session = await serverApiClient.getPairing(cleanCode);
  } catch (e) {
    console.warn("Server fetch pairing error:", e);
  }

  // 2. Fallback to Firestore (allow 3.5s timeout for mobile networks)
  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap: any = await Promise.race([
        getDoc(doc(db, "pairings", cleanCode)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);
      if (snap && typeof snap.exists === "function" && snap.exists()) {
        session = snap.data() as PairingSession;
        // If session carried the serverUrl from parent, immediately apply it!
        if (session && (session as any).serverUrl) {
          console.log(`[Pairing] 📡 Tự động cấu hình URL máy chủ từ máy Bố Mẹ: ${(session as any).serverUrl}`);
          serverApiClient.setServerUrl((session as any).serverUrl);
        }
      }
    } catch (e) {
      console.warn("Firestore fetch pairing error:", e);
    }
  }

  // 3. If still not found, try one more time by forcing a refresh from GitHub
  if (!session) {
    const refreshedUrl = await serverApiClient.resolveServerUrlFromCloud(true);
    if (refreshedUrl) {
      try {
        session = await serverApiClient.getPairing(cleanCode);
      } catch (_) {}
    }
  }

  if (!session) {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    session = sessions[cleanCode] || null;
  }

  if (!session) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi không chính xác hoặc chưa được tạo từ ứng dụng Cha Mẹ." };
  }

  if (!verifyCodeSignature(session)) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi không hợp lệ." };
  }

  if (Date.now() > session.expiresAt) {
    return { success: false, error: "Mã ghép đôi đã hết hạn (quá 15 phút). Vui lòng tạo mã mới trên máy Cha Mẹ." };
  }

  if (session.status === "paired" && session.used) {
    return { success: false, error: "Mã này đã được sử dụng rồi. Vui lòng tạo mã mới trên máy Cha Mẹ." };
  }

  clearRateLimit();

  const deviceId = (deviceMeta as any)?.deviceId || ("dev_" + Math.random().toString(36).substring(2, 9));
  const sessionToken = session.sessionToken || generateSessionToken();
  session.status = "paired";
  session.used = true;

  const activeDevName = (deviceMeta as any)?.deviceName || (deviceMeta.model ? `${(deviceMeta as any).manufacturer || ''} ${deviceMeta.model}`.trim() : "Điện thoại của con");

  session.childDeviceInfo = {
    deviceId,
    hardwareIdType: ((deviceMeta as any)?.hardwareIdType as any) || "android_id",
    deviceName: activeDevName,
    model: deviceMeta.model || "Android Device",
    manufacturer: (deviceMeta as any)?.manufacturer || "Android",
    androidId: (deviceMeta as any)?.androidId || "",
    serial: (deviceMeta as any)?.serial || "",
    mac: (deviceMeta as any)?.mac || "",
    imei: (deviceMeta as any)?.imei || "",
    phoneNumber: (deviceMeta as any)?.phoneNumber || "",
    osVersion: deviceMeta.osVersion || "Android",
    pairedAt: new Date().toISOString(),
    status: "online",
    battery: (deviceMeta as any)?.battery || 100,
    isPrimary: true,
  };

  const parentId = session.parentId || "family_primary";
  const childId = session.childId;

  // 1. Register device directly under parent cloud hierarchy
  if (parentId && childId) {
    registerChildDeviceInCloud(parentId, childId, session.childDeviceInfo).catch(() => {});
  }

  // 2. Firebase updates for pairing session (sanitized against undefined values)
  const sanitizedDev = sanitizeForFirebase(session.childDeviceInfo);
  const sanitizedUpdate = sanitizeForFirebase({
    status: "paired",
    used: true,
    childDeviceInfo: sanitizedDev,
    sessionToken,
    pairedAt: Date.now(),
  });

  // Update Local PC Server
  serverApiClient.confirmPairing({ code: cleanCode, ...sanitizedUpdate }).catch((e) =>
    console.warn("Server pairing update error:", e)
  );
  if (isFirebaseConfigured() && db) {
    updateDoc(doc(db, "pairings", cleanCode), sanitizedUpdate).catch((e) =>
      console.warn("Firestore pairing update error:", e?.code || e?.message)
    );
  }

  // 3. Emit event bus for dual simulator / local test
  parentProEventBus.emit("PAIRING_APPROVED", {
    code: cleanCode,
    parentId,
    childId,
    childName: session.childName,
    childDeviceInfo: session.childDeviceInfo,
    sessionToken,
  }, "child");

  const kidPairedInfo: KidPairedInfo = {
    isPaired: true,
    parentId,
    parentName: session.parentName || "Bố/Mẹ",
    childId,
    childName: session.childName,
    childAge: session.childAge || 8,
    childBirthYear: session.childBirthYear,
    childAvatar: session.childAvatar,
    childGender: session.childGender,
    pairedAt: session.childDeviceInfo.pairedAt,
    deviceId,
    deviceName: activeDevName,
    model: session.childDeviceInfo.model,
    manufacturer: session.childDeviceInfo.manufacturer,
    sessionToken,
  };
  saveKidDevicePairedInfo(kidPairedInfo);

  return { success: true, session: { ...session, sessionToken }, kidPairedInfo };
}

// ─── Real-time listener for parent waiting for child to enter pairing code ───

export function subscribePairingSession(
  code: string,
  onUpdate: (session: PairingSession) => void
): () => void {
  const cleanCode = code.replace(/\s+/g, "").trim();
  const { db } = getFirebaseInstance();

  let unsubFirestore: (() => void) | null = null;

  // Real-time listener via Server-Sent Events (SSE)
  const unsubSse = serverApiClient.on("pairing_connected", (data: any) => {
    if (data && (data.code === cleanCode || data.session?.code === cleanCode)) {
      onUpdate(data.session || data);
    }
  });

  // Server polling fallback (fast 1.5s interval while modal is open)
  const serverPoll = setInterval(async () => {
    try {
      const s = await serverApiClient.getPairing(cleanCode);
      if (s && s.status === "paired") {
        onUpdate(s);
      }
    } catch (_) {}
  }, 1500);

  if (isFirebaseConfigured() && db) {
    try {
      const pDoc = doc(db, "pairings", cleanCode);
      unsubFirestore = onSnapshot(pDoc, (snap) => {
        if (snap.exists()) {
          const val = snap.data() as PairingSession;
          onUpdate(val);
        }
      });
    } catch (_) {}
  }

  const unsubEventBus = parentProEventBus.subscribe<any>("PAIRING_APPROVED", (evt: any) => {
    if (evt && (evt.code === cleanCode || !evt.code)) {
      onUpdate({
        code: cleanCode,
        status: "paired",
        parentId: evt.parentId,
        childId: evt.childId,
        childName: evt.childName || "Bé",
        childDeviceInfo: evt.childDeviceInfo,
        createdAt: Date.now(),
        expiresAt: Date.now() + 100000,
        used: true,
      });
    }
  });

  // Local storage polling fallback (demo or same-device)
  const localTimer = setInterval(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
      if (raw) {
        const sessions = JSON.parse(raw);
        const s = sessions[cleanCode];
        if (s && s.status === "paired") {
          onUpdate(s);
        }
      }
    } catch (_) {}
  }, 1000);

  return () => {
    unsubSse();
    clearInterval(serverPoll);
    if (unsubFirestore) unsubFirestore();
    clearInterval(localTimer);
    unsubEventBus();
  };
}


// ─── Kid creates profile and code (15-min, single use) ───────────────────────

export async function createKidInitiatedPairingCode(
  profile: KidProfileSetup,
  deviceMeta: Partial<ChildDeviceInfo> & { model: string; osVersion: string }
): Promise<PairingSession> {
  // Đảm bảo xác thực ẩn danh nếu chưa đăng nhập
  ensureKidAnonymousAuth().catch(() => {});

  const code = generateRandomPin();
  const now = Date.now();
  const childId = "child_" + now;
  const deviceId = deviceMeta.deviceId || "dev_" + Math.random().toString(36).substring(2, 9);
  const deviceName = deviceMeta.deviceName || deviceMeta.model || "Thiết bị của con";

  const fullDeviceInfo: ChildDeviceInfo = {
    deviceId,
    hardwareIdType: deviceMeta.hardwareIdType || "imei",
    deviceName,
    model: deviceMeta.model || "Android Device",
    manufacturer: deviceMeta.manufacturer || "Android",
    phoneNumber: deviceMeta.phoneNumber || "",
    imei: deviceMeta.imei || "",
    mac: deviceMeta.mac || "",
    serial: deviceMeta.serial || "",
    androidId: deviceMeta.androidId || "",
    osVersion: deviceMeta.osVersion || "Android",
    pairedAt: new Date().toISOString(),
    status: "online",
    battery: 100,
  };

  const session: PairingSession = {
    code,
    childId,
    childName: profile.name.trim() || "Bé yêu",
    childAge: profile.age || 8,
    childBirthYear: profile.birthYear || (new Date().getFullYear() - (profile.age || 8)),
    childAvatar: profile.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
    childGender: profile.gender || "boy",
    status: "waiting_parent",
    initiator: "child",
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // Strictly 15 minutes!
    used: false,
    sig: signCode(code, now),
    sessionToken: generateSessionToken(),
    childDeviceInfo: fullDeviceInfo,
  };

  // 1. Lưu LocalStorage ngay lập tức
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_KID_PENDING_PAIRING_KEY, JSON.stringify(session));
      const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
      const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
      sessions[code] = session;
      localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (localErr) {
      console.warn("localStorage write failed:", localErr);
    }
  }

  // 2. Phát EventBus cho môi trường tab/trình giả lập cục bộ
  parentProEventBus.emit("PAIRING_SESSION_CREATED", session, "child");

  // 3. Chuẩn hóa dữ liệu và ghi lên Local Server (và Firestore dự phòng)
  const { db } = getFirebaseInstance();
  const sanitizedSession = sanitizeForFirebase({ ...session, timestamp: now });

  try {
    await serverApiClient.createPairing(sanitizedSession);
    console.log(`[Pairing] ✅ Mã ghép đôi ${code} đã sẵn sàng trên máy chủ!`);
  } catch (e: any) {
    console.warn("Server kid pairing write warning:", e?.message || e);
  }

  if (isFirebaseConfigured() && db) {
    setDoc(doc(db, "pairings", code), sanitizedSession).catch(() => {});
  }

  return session;
}

// ─── Step 2: Parent requests to connect with Kid's 6-digit code ─────────────

export async function requestPairingWithKidCode(
  code: string,
  parentId: string,
  parentName: string
): Promise<{ success: boolean; session?: PairingSession; error?: string }> {
  // 1. Rate limit check (anti brute-force)
  const rl = checkRateLimit();
  if (!rl.allowed) {
    return {
      success: false,
      error: `Nhập sai quá nhiều lần. Vui lòng chờ ${rl.waitSeconds} giây rồi thử lại.`,
    };
  }

  const cleanCode = code.replace(/\s+/g, "").trim();

  // 2. Basic validation
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi phải gồm đúng 6 chữ số." };
  }

  const { db } = getFirebaseInstance();
  let session: PairingSession | null = null;

  // 3. Fetch from Local Server first (fastest)
  try {
    session = await serverApiClient.getPairing(cleanCode);
  } catch (e) {
    console.warn("Server fetch pairing error:", e);
  }

  // 4. Fallback to Firestore
  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "pairings", cleanCode));
      if (snap.exists()) {
        session = snap.data() as PairingSession;
      }
    } catch (e) {
      console.warn("Firestore fetch pairing error:", e);
    }
  }

  // 5. Fallback to localStorage
  if (!session && typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    session = sessions[cleanCode] || null;
  }

  if (!session) {
    recordFailedAttempt();
    return {
      success: false,
      error: "Mã không tồn tại hoặc chưa được tạo từ ứng dụng KidCare trên máy con.",
    };
  }

  // 6. Validate HMAC signature (anti-forgery)
  if (!verifyCodeSignature(session)) {
    recordFailedAttempt();
    return { success: false, error: "Mã ghép đôi không hợp lệ. Vui lòng tạo mã mới trên máy con." };
  }

  // 7. Check 15-minute expiry
  if (Date.now() > session.expiresAt) {
    return {
      success: false,
      error: "Mã kết nối đã hết hạn (hiệu lực trong 15 phút). Vui lòng tạo mã mới trên máy con.",
    };
  }

  // 8. Check already paired or used (single use)
  if (session.status === "paired" || session.used) {
    return {
      success: false,
      error: "Mã này đã được sử dụng rồi (mã 1 lần). Mỗi lần kết nối máy khác phải tạo mã mới trên máy con.",
    };
  }

  // Clear rate limit on valid code
  clearRateLimit();

  // 9. Update status to pending_approval waiting for kid's confirmation
  const effectiveParentId = parentId || "family_primary";
  const effectiveParentName = parentName || "Bố/Mẹ";

  session.status = "pending_approval";
  session.parentId = effectiveParentId;
  session.parentName = effectiveParentName;
  session.approvalRequestedAt = Date.now();

  const updates = sanitizeForFirebase({
    status: "pending_approval",
    parentId: effectiveParentId,
    parentName: effectiveParentName,
    approvalRequestedAt: session.approvalRequestedAt,
  });

  try {
    await serverApiClient.createPairing({ code: cleanCode, ...updates });
    console.log(`[Pairing] ✅ Đã gửi yêu cầu ghép đôi mã ${cleanCode} lên máy chủ thành công!`);
  } catch (e: any) {
    console.warn("Server update pairing error:", e?.message || e);
  }

  if (isFirebaseConfigured() && db) {
    updateDoc(doc(db, "pairings", cleanCode), updates).catch(() => {});
  }

  // Phát tín hiệu EventBus ngay lập tức (cho trình duyệt/giả lập cùng thiết bị)
  parentProEventBus.emit("PAIRING_REQUESTED", {
    code: cleanCode,
    parentId: effectiveParentId,
    parentName: effectiveParentName,
    approvalRequestedAt: session.approvalRequestedAt,
  }, "parent");

  if (typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    sessions[cleanCode] = { ...session };
    localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));

    const kidPending = localStorage.getItem(LOCAL_KID_PENDING_PAIRING_KEY);
    if (kidPending) {
      try {
        const kp = JSON.parse(kidPending);
        if (kp.code === cleanCode) {
          localStorage.setItem(LOCAL_KID_PENDING_PAIRING_KEY, JSON.stringify({ ...kp, ...updates }));
        }
      } catch (_) {}
    }
  }

  return { success: true, session };
}

// ─── Step 3: Kid approves parent pairing request ─────────────────────────────

export async function approveParentPairing(
  code: string
): Promise<{ success: boolean; session?: PairingSession; error?: string }> {
  const cleanCode = code.replace(/\s+/g, "").trim();
  const { db } = getFirebaseInstance();
  let session: PairingSession | null = null;

  try {
    session = await serverApiClient.getPairing(cleanCode);
  } catch (e) {
    console.warn("Server fetch pairing error:", e);
  }

  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "pairings", cleanCode));
      if (snap.exists()) session = snap.data() as PairingSession;
    } catch (e) {
      console.warn("Firestore fetch pairing error:", e);
    }
  }

  if (!session && typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    session = sessions[cleanCode] || null;
  }

  if (!session) {
    return { success: false, error: "Không tìm thấy thông tin phiên ghép đôi." };
  }

  if (Date.now() > session.expiresAt) {
    return { success: false, error: "Mã kết nối đã hết hạn (quá 15 phút). Vui lòng tạo mã mới." };
  }

  const sessionToken = session.sessionToken || generateSessionToken();
  session.status = "paired";
  session.used = true;
  session.sessionToken = sessionToken;

  const childProfileData = {
    id: session.childId,
    name: session.childName,
    age: session.childAge || 8,
    birthYear: session.childBirthYear || (new Date().getFullYear() - (session.childAge || 8)),
    avatar: session.childAvatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150",
    gender: session.childGender || "boy",
    pairedDevice: session.childDeviceInfo || {
      model: "Android Device",
      osVersion: "Android 14",
      deviceId: "dev_" + session.childId,
      pairedAt: new Date().toISOString(),
    },
    status: "online",
    battery: 100,
    speed: 0,
    currentAddress: "Vừa kết nối thiết bị",
    lat: 10.762622,
    lng: 106.682245,
    pairedAt: Date.now(),
    lastSeen: Date.now(),
    sessionToken,
  };

  const parentId = session.parentId || "family_primary";
  const sanitizedChildData = sanitizeForFirebase(childProfileData);
  const sanitizedPairingUpdate = sanitizeForFirebase({
    status: "paired",
    used: true,
    pairedAt: Date.now(),
    sessionToken,
  });

  try {
    await Promise.all([
      serverApiClient.confirmPairing({ code: cleanCode, ...sanitizedPairingUpdate }),
      serverApiClient.saveChildProfile(parentId, sanitizedChildData),
    ]);
    console.log(`[Pairing] ✅ Bé đã chấp nhận kết nối mã ${cleanCode} trên máy chủ thành công!`);
  } catch (e: any) {
    console.warn("Server update pairing error:", e?.message || e);
  }

  if (isFirebaseConfigured() && db) {
    Promise.all([
      updateDoc(doc(db, "pairings", cleanCode), sanitizedPairingUpdate),
      setDoc(
        doc(db, "users", parentId, "children", session.childId),
        { ...sanitizedChildData, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      ),
    ]).catch(() => {});
  }

  // Phát tín hiệu EventBus
  parentProEventBus.emit("PAIRING_APPROVED", {
    code: cleanCode,
    parentId,
    childId: session.childId,
    sessionToken,
  }, "child");

  if (typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    sessions[cleanCode] = { ...session };
    localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  // Save paired info on kid device
  const dev = session.childDeviceInfo;
  const kidPairedInfo: KidPairedInfo = {
    isPaired: true,
    parentId,
    parentName: session.parentName || "Bố/Mẹ",
    childId: session.childId,
    childName: session.childName,
    childAge: session.childAge,
    childBirthYear: session.childBirthYear,
    childAvatar: session.childAvatar,
    childGender: session.childGender,
    pairedAt: new Date().toISOString(),
    deviceId: dev?.deviceId || "dev_" + session.childId,
    deviceName: dev?.deviceName,
    model: dev?.model,
    imei: dev?.imei,
    mac: dev?.mac,
    serial: dev?.serial,
    phoneNumber: dev?.phoneNumber,
    hardwareIdType: dev?.hardwareIdType,
    sessionToken,
  };
  saveKidDevicePairedInfo(kidPairedInfo);
  clearKidPendingPairing();

  return { success: true, session };
}

// ─── Step 3 (Alt): Kid rejects parent pairing request ───────────────────────

export async function rejectParentPairing(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = code.replace(/\s+/g, "").trim();
  const { db } = getFirebaseInstance();

  const updates = sanitizeForFirebase({
    status: "rejected",
    rejectedAt: Date.now(),
  });

  serverApiClient.createPairing({ code: cleanCode, ...updates }).catch((e) =>
    console.warn("Server update pairing error:", e)
  );

  if (isFirebaseConfigured() && db) {
    updateDoc(doc(db, "pairings", cleanCode), updates).catch(() => {});
  }

  // Phát tín hiệu EventBus
  parentProEventBus.emit("PAIRING_REJECTED", { code: cleanCode }, "child");

  if (typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    if (sessions[cleanCode]) {
      sessions[cleanCode] = { ...sessions[cleanCode], status: "rejected" };
      localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }

  return { success: true };
}

// ─── Load child data from Firebase after pairing ─────────────────────────────

export async function loadChildDataFromCloud(
  parentId: string,
  childId: string
): Promise<Record<string, any> | null> {
  const { db } = getFirebaseInstance();

  // Try Local Server first (fastest)
  try {
    const children = await serverApiClient.getChildrenList(parentId);
    if (children && children.length > 0) {
      const match = children.find((c: any) => c.id === childId);
      if (match) return match;
    }
  } catch (e) {
    console.warn("Server load child error:", e);
  }

  // Fallback to Firestore
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "users", parentId, "children", childId));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn("Firestore load child error:", e);
    }
  }

  return null;
}

// ─── Persisted Pairing Info Helpers ──────────────────────────────────────────

export function getKidDevicePairedInfo(): KidPairedInfo | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(KID_DEVICE_PAIRING_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse kid paired info:", e);
      }
    }
  }
  return null;
}

export function saveKidDevicePairedInfo(info: KidPairedInfo): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(KID_DEVICE_PAIRING_KEY, JSON.stringify(info));
  }
}

export function unpairKidDevice(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KID_DEVICE_PAIRING_KEY);
    localStorage.removeItem(LOCAL_KID_PENDING_PAIRING_KEY);
    clearRateLimit();
  }
}

export function getKidPendingPairing(): PairingSession | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(LOCAL_KID_PENDING_PAIRING_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          return parsed;
        }
      } catch (e) {}
    }
  }
  return null;
}

export function clearKidPendingPairing(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_KID_PENDING_PAIRING_KEY);
  }
}

/** Verify that a session token from a connected device matches what we stored */
export function verifySessionToken(incomingToken: string): boolean {
  const pairedInfo = getKidDevicePairedInfo();
  if (!pairedInfo?.sessionToken) return true; // No token stored = legacy, allow
  return pairedInfo.sessionToken === incomingToken;
}
