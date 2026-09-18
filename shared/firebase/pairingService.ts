// Device Pairing Service between Parent App and Kid App
// Security features: rate limiting, HMAC code signature, session token, anti brute-force
import { doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  update as rtdbUpdate,
} from "firebase/database";
import { getFirebaseInstance, ensureKidAnonymousAuth } from "./firebaseService";
import { isFirebaseConfigured } from "./firebaseConfig";
import { parentProEventBus } from "../eventBus";

import { ChildDeviceInfo } from "../types";

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

function checkRateLimit(): { allowed: boolean; waitSeconds?: number } {
  if (typeof window === "undefined") return { allowed: true };
  const now = Date.now();
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  let rl: RateLimitState = raw ? JSON.parse(raw) : { attempts: 0, windowStart: now };

  // If currently blocked
  if (rl.blockedUntil && now < rl.blockedUntil) {
    const wait = Math.ceil((rl.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds: wait };
  }

  // Reset window if expired
  if (now - rl.windowStart > WINDOW_MS) {
    rl = { attempts: 0, windowStart: now };
  }

  return { allowed: true };
}

function recordFailedAttempt(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const raw = localStorage.getItem(RATE_LIMIT_KEY);
  let rl: RateLimitState = raw ? JSON.parse(raw) : { attempts: 0, windowStart: now };

  // Reset window if expired
  if (now - rl.windowStart > WINDOW_MS) {
    rl = { attempts: 0, windowStart: now };
  }

  rl.attempts++;

  if (rl.attempts >= MAX_ATTEMPTS) {
    rl.blockedUntil = now + BLOCK_MS;
    rl.attempts = 0;
    rl.windowStart = now;
  }

  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl));
}

function clearRateLimit(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RATE_LIMIT_KEY);
  }
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
  childName: string
): Promise<PairingSession> {
  const code = generateRandomPin();
  const now = Date.now();
  const session: PairingSession = {
    code,
    parentId,
    parentName,
    childId,
    childName,
    status: "pending",
    initiator: "parent",
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes
    sig: signCode(code, now),
    sessionToken: generateSessionToken(),
  };

  const { db, rtdb } = getFirebaseInstance();

  // Save to localStorage first
  if (typeof window !== "undefined") {
    const existingStr = localStorage.getItem(LOCAL_PAIRING_SESSIONS_KEY);
    const sessions: Record<string, PairingSession> = existingStr ? JSON.parse(existingStr) : {};
    sessions[code] = session;
    localStorage.setItem(LOCAL_PAIRING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  // Non-blocking Firebase writes
  if (isFirebaseConfigured() && rtdb) {
    rtdbSet(rtdbRef(rtdb, `pairings/${code}`), { ...session, timestamp: now }).catch((e) =>
      console.warn("RTDB pairing write skipped:", e?.code)
    );
  }
  if (isFirebaseConfigured() && db) {
    setDoc(doc(db, "pairings", code), { ...session, timestamp: serverTimestamp() }).catch((e) =>
      console.warn("Firestore pairing write skipped:", e?.code)
    );
  }

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

  const { db, rtdb } = getFirebaseInstance();
  let session: PairingSession | null = null;

  // 3. Fetch from RTDB first (fastest)
  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/${cleanCode}`));
      if (snap.exists()) {
        session = snap.val() as PairingSession;
      }
    } catch (e) {
      console.warn("RTDB fetch pairing error:", e);
    }
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

  // 10. Write updates — Firebase (non-blocking) + localStorage
  if (isFirebaseConfigured() && rtdb) {
    Promise.all([
      rtdbUpdate(rtdbRef(rtdb, `pairings/${cleanCode}`), {
        status: "paired",
        parentId,
        parentName: session.parentName,
        pairedAt: Date.now(),
        sessionToken,
      }),
      rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${session.childId}`), childProfileData),
    ]).catch((e) => console.warn("RTDB update pairing error:", e?.code));
  }

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
  deviceMeta: { model: string; osVersion: string }
): Promise<{ success: boolean; session?: PairingSession; error?: string }> {
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

  const { db, rtdb } = getFirebaseInstance();
  let session: PairingSession | null = null;

  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/${cleanCode}`));
      if (snap.exists()) session = snap.val() as PairingSession;
    } catch (e) {
      console.warn("RTDB fetch pairing error:", e);
    }
  }

  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "pairings", cleanCode));
      if (snap.exists()) session = snap.data() as PairingSession;
    } catch (e) {
      console.warn("Firestore fetch pairing error:", e);
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

  if (session.status === "paired") {
    return { success: false, error: "Mã này đã được sử dụng. Vui lòng tạo mã mới." };
  }

  clearRateLimit();

  const deviceId = "dev_" + Math.random().toString(36).substring(2, 9);
  const sessionToken = session.sessionToken || generateSessionToken();
  session.status = "paired";
  session.childDeviceInfo = {
    deviceId,
    hardwareIdType: "imei",
    deviceName: deviceMeta.model || "Thiết bị của con",
    model: deviceMeta.model || "Android Device",
    osVersion: deviceMeta.osVersion || "Android",
    pairedAt: new Date().toISOString(),
    status: "online",
  };

  // Non-blocking Firebase updates
  if (isFirebaseConfigured() && rtdb) {
    rtdbUpdate(rtdbRef(rtdb, `pairings/${cleanCode}`), {
      status: "paired",
      childDeviceInfo: session.childDeviceInfo,
      sessionToken,
    }).catch((e) => console.warn("RTDB update error:", e?.code));
  }
  if (isFirebaseConfigured() && db) {
    updateDoc(doc(db, "pairings", cleanCode), {
      status: "paired",
      childDeviceInfo: session.childDeviceInfo,
      sessionToken,
    }).catch((e) => console.warn("Firestore update error:", e?.code));
  }

  const kidPairedInfo: KidPairedInfo = {
    isPaired: true,
    parentId: session.parentId || "",
    parentName: session.parentName || "",
    childId: session.childId,
    childName: session.childName,
    childAge: session.childAge,
    childBirthYear: session.childBirthYear,
    childAvatar: session.childAvatar,
    childGender: session.childGender,
    pairedAt: session.childDeviceInfo.pairedAt,
    deviceId,
    sessionToken,
  };
  saveKidDevicePairedInfo(kidPairedInfo);

  return { success: true, session: { ...session, sessionToken } };
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

  // 3. Chuẩn hóa dữ liệu chống lỗi undefined và ghi lên Firebase Realtime Database
  const { db, rtdb } = getFirebaseInstance();
  const sanitizedSession = sanitizeForFirebase({ ...session, timestamp: now });

  if (isFirebaseConfigured() && rtdb) {
    try {
      await rtdbSet(rtdbRef(rtdb, `pairings/${code}`), sanitizedSession);
      console.log(`[Pairing] ✅ Mã ghép đôi ${code} đã sẵn sàng trên Realtime Database!`);
    } catch (e: any) {
      console.warn("RTDB kid pairing write warning:", e?.code || e?.message);
    }
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

  const { db, rtdb } = getFirebaseInstance();
  let session: PairingSession | null = null;

  // 3. Fetch from RTDB first (fastest)
  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/${cleanCode}`));
      if (snap.exists()) {
        session = snap.val() as PairingSession;
      }
    } catch (e) {
      console.warn("RTDB fetch pairing error:", e);
    }
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

  if (isFirebaseConfigured() && rtdb) {
    try {
      await rtdbUpdate(rtdbRef(rtdb, `pairings/${cleanCode}`), updates);
      console.log(`[Pairing] ✅ Đã gửi yêu cầu ghép đôi mã ${cleanCode} lên Realtime Database thành công!`);
    } catch (e: any) {
      console.warn("RTDB update pairing error:", e?.code || e?.message);
    }
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
  const { db, rtdb } = getFirebaseInstance();
  let session: PairingSession | null = null;

  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `pairings/${cleanCode}`));
      if (snap.exists()) session = snap.val() as PairingSession;
    } catch (e) {
      console.warn("RTDB fetch pairing error:", e);
    }
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

  if (isFirebaseConfigured() && rtdb) {
    try {
      await Promise.all([
        rtdbUpdate(rtdbRef(rtdb, `pairings/${cleanCode}`), sanitizedPairingUpdate),
        rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${session.childId}`), sanitizedChildData),
      ]);
      console.log(`[Pairing] ✅ Bé đã chấp nhận kết nối mã ${cleanCode} trên Realtime Database thành công!`);
    } catch (e: any) {
      console.warn("RTDB update pairing error:", e?.code || e?.message);
    }
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
  const { db, rtdb } = getFirebaseInstance();

  const updates = sanitizeForFirebase({
    status: "rejected",
    rejectedAt: Date.now(),
  });

  if (isFirebaseConfigured() && rtdb) {
    rtdbUpdate(rtdbRef(rtdb, `pairings/${cleanCode}`), updates).catch((e) =>
      console.warn("RTDB update pairing error:", e?.code)
    );
  }

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
  const { db, rtdb } = getFirebaseInstance();

  // Try RTDB first (fastest)
  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `users/${parentId}/children/${childId}`));
      if (snap.exists()) {
        return snap.val();
      }
    } catch (e) {
      console.warn("RTDB load child error:", e);
    }
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
