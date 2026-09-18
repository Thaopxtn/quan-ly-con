// Sharing Service — Share child management access between parent accounts
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import {
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  update as rtdbUpdate,
} from "firebase/database";
import { getFirebaseInstance } from "./firebaseService";
import { isFirebaseConfigured } from "./firebaseConfig";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ParentRole = "owner" | "co_parent" | "viewer";

export interface ConnectedParent {
  parentId: string;
  parentName: string;
  parentEmail?: string;
  role: ParentRole;
  connectedAt: number;
  deviceModel?: string;
  isCurrentDevice?: boolean;
}

export interface ShareSession {
  code: string;
  fromParentId: string;
  fromParentName: string;
  childId: string;
  childName: string;
  childAvatar?: string;
  role: "co_parent" | "viewer";
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: number;
  expiresAt: number;
  sig: string;
  toParentId?: string;
  toParentName?: string;
}

// ─── Storage ───────────────────────────────────────────────────────────────

const LOCAL_SHARES_KEY = "parent_pro_share_sessions";
const LOCAL_CONNECTED_PARENTS_KEY = "kid_connected_parents";

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateSharePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signShareCode(code: string, createdAt: number, childId: string): string {
  const bucket = Math.floor(createdAt / (5 * 60 * 1000));
  const SECRET = "qlconcai_share_v1_2024";
  let h = 0x811c9dc5;
  const str = `${SECRET}:${code}:${childId}:${bucket}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function verifyShareSig(session: ShareSession): boolean {
  if (!session.sig) return true;
  return session.sig === signShareCode(session.code, session.createdAt, session.childId);
}

// ─── Rate Limiting (shared with pairing service logic) ─────────────────────

const SHARE_RATE_KEY = "share_rate_limit";

function checkShareRateLimit(): { allowed: boolean; waitSeconds?: number } {
  if (typeof window === "undefined") return { allowed: true };
  const now = Date.now();
  const raw = localStorage.getItem(SHARE_RATE_KEY);
  if (!raw) return { allowed: true };
  const rl = JSON.parse(raw);
  if (rl.blockedUntil && now < rl.blockedUntil) {
    return { allowed: false, waitSeconds: Math.ceil((rl.blockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

function recordShareFailure(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const raw = localStorage.getItem(SHARE_RATE_KEY);
  let rl = raw ? JSON.parse(raw) : { attempts: 0, windowStart: now };
  if (now - rl.windowStart > 2 * 60 * 1000) rl = { attempts: 0, windowStart: now };
  rl.attempts++;
  if (rl.attempts >= 5) {
    rl.blockedUntil = now + 5 * 60 * 1000;
    rl.attempts = 0;
    rl.windowStart = now;
  }
  localStorage.setItem(SHARE_RATE_KEY, JSON.stringify(rl));
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Parent A creates a share code for child → Parent B enters this code to gain access
 */
export async function createShareCode(
  fromParentId: string,
  fromParentName: string,
  childId: string,
  childName: string,
  childAvatar: string | undefined,
  role: "co_parent" | "viewer"
): Promise<ShareSession> {
  const code = generateSharePin();
  const now = Date.now();
  const session: ShareSession = {
    code,
    fromParentId,
    fromParentName,
    childId,
    childName,
    childAvatar,
    role,
    status: "pending",
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    sig: signShareCode(code, now, childId),
  };

  // Save to localStorage first
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LOCAL_SHARES_KEY);
    const shares: Record<string, ShareSession> = raw ? JSON.parse(raw) : {};
    shares[code] = session;
    localStorage.setItem(LOCAL_SHARES_KEY, JSON.stringify(shares));
  }

  const { db, rtdb } = getFirebaseInstance();

  // Non-blocking Firebase writes
  if (isFirebaseConfigured() && rtdb) {
    rtdbSet(rtdbRef(rtdb, `shares/${code}`), { ...session, timestamp: now }).catch((e) =>
      console.warn("RTDB share write skipped:", e?.code)
    );
  }
  if (isFirebaseConfigured() && db) {
    setDoc(doc(db, "shares", code), { ...session, timestamp: serverTimestamp() }).catch((e) =>
      console.warn("Firestore share write skipped:", e?.code)
    );
  }

  return session;
}

/**
 * Parent B enters the share code → gains access to the child
 */
export async function acceptShareCode(
  code: string,
  toParentId: string,
  toParentName: string,
  toParentEmail?: string
): Promise<{ success: boolean; session?: ShareSession; error?: string }> {
  const rl = checkShareRateLimit();
  if (!rl.allowed) {
    return { success: false, error: `Thử quá nhiều lần. Vui lòng chờ ${rl.waitSeconds} giây.` };
  }

  const cleanCode = code.replace(/\s+/g, "").trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    recordShareFailure();
    return { success: false, error: "Mã chia sẻ phải gồm đúng 6 chữ số." };
  }

  const { db, rtdb } = getFirebaseInstance();
  let session: ShareSession | null = null;

  // Fetch from RTDB first
  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `shares/${cleanCode}`));
      if (snap.exists()) session = snap.val() as ShareSession;
    } catch (e) {
      console.warn("RTDB share fetch error:", e);
    }
  }

  // Fallback to Firestore
  if (!session && isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "shares", cleanCode));
      if (snap.exists()) session = snap.data() as ShareSession;
    } catch (e) {
      console.warn("Firestore share fetch error:", e);
    }
  }

  // Fallback to localStorage
  if (!session) {
    const raw = localStorage.getItem(LOCAL_SHARES_KEY);
    const shares: Record<string, ShareSession> = raw ? JSON.parse(raw) : {};
    session = shares[cleanCode] || null;
  }

  if (!session) {
    recordShareFailure();
    return { success: false, error: "Mã chia sẻ không tồn tại hoặc đã hết hạn." };
  }

  if (!verifyShareSig(session)) {
    recordShareFailure();
    return { success: false, error: "Mã chia sẻ không hợp lệ." };
  }

  if (Date.now() > session.expiresAt) {
    return { success: false, error: "Mã chia sẻ đã hết hạn (quá 24 giờ). Vui lòng yêu cầu tạo mã mới." };
  }

  if (session.status === "accepted") {
    return { success: false, error: "Mã chia sẻ này đã được sử dụng rồi." };
  }

  if (session.status === "revoked") {
    return { success: false, error: "Mã chia sẻ này đã bị thu hồi." };
  }

  if (session.fromParentId === toParentId) {
    return { success: false, error: "Bạn không thể nhận quyền từ chính tài khoản của mình." };
  }

  session.status = "accepted";
  session.toParentId = toParentId;
  session.toParentName = toParentName;

  const connectedParentData: ConnectedParent = {
    parentId: toParentId,
    parentName: toParentName,
    parentEmail: toParentEmail,
    role: session.role,
    connectedAt: Date.now(),
  };

  // Write to both owner's and new parent's data
  if (isFirebaseConfigured() && rtdb) {
    Promise.all([
      rtdbUpdate(rtdbRef(rtdb, `shares/${cleanCode}`), { status: "accepted", toParentId, toParentName, acceptedAt: Date.now() }),
      // Store under owner's child record
      rtdbSet(rtdbRef(rtdb, `users/${session.fromParentId}/children/${session.childId}/connectedParents/${toParentId}`), connectedParentData),
      // Store a reference under new parent's account
      rtdbSet(rtdbRef(rtdb, `users/${toParentId}/sharedChildren/${session.childId}`), {
        childId: session.childId,
        childName: session.childName,
        childAvatar: session.childAvatar,
        ownerParentId: session.fromParentId,
        ownerParentName: session.fromParentName,
        role: session.role,
        connectedAt: Date.now(),
      }),
    ]).catch((e) => console.warn("RTDB share accept error:", e?.code));
  }

  if (isFirebaseConfigured() && db) {
    Promise.all([
      updateDoc(doc(db, "shares", cleanCode), { status: "accepted", toParentId, toParentName, acceptedAt: serverTimestamp() }),
      setDoc(
        doc(db, "users", session.fromParentId, "children", session.childId, "connectedParents", toParentId),
        { ...connectedParentData, connectedAt: serverTimestamp() },
        { merge: true }
      ),
      setDoc(
        doc(db, "users", toParentId, "sharedChildren", session.childId),
        {
          childId: session.childId,
          childName: session.childName,
          childAvatar: session.childAvatar,
          ownerParentId: session.fromParentId,
          ownerParentName: session.fromParentName,
          role: session.role,
          connectedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]).catch((e) => console.warn("Firestore share accept error:", e?.code));
  }

  // Save locally
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(LOCAL_SHARES_KEY);
    const shares: Record<string, ShareSession> = raw ? JSON.parse(raw) : {};
    shares[cleanCode] = session;
    localStorage.setItem(LOCAL_SHARES_KEY, JSON.stringify(shares));

    // Save connected parent list to kid device's local cache
    saveConnectedParentLocally(session.childId, connectedParentData);
  }

  return { success: true, session };
}

/**
 * Owner revokes another parent's access
 */
export async function revokeParentAccess(
  ownerParentId: string,
  childId: string,
  targetParentId: string
): Promise<{ success: boolean; error?: string }> {
  const { db, rtdb } = getFirebaseInstance();

  if (isFirebaseConfigured() && rtdb) {
    Promise.all([
      rtdbUpdate(rtdbRef(rtdb, `users/${ownerParentId}/children/${childId}/connectedParents/${targetParentId}`), {
        role: "revoked",
        revokedAt: Date.now(),
      }),
      rtdbUpdate(rtdbRef(rtdb, `users/${targetParentId}/sharedChildren/${childId}`), {
        role: "revoked",
        revokedAt: Date.now(),
      }),
    ]).catch((e) => console.warn("RTDB revoke error:", e?.code));
  }

  if (isFirebaseConfigured() && db) {
    Promise.all([
      updateDoc(
        doc(db, "users", ownerParentId, "children", childId, "connectedParents", targetParentId),
        { role: "revoked", revokedAt: serverTimestamp() }
      ),
      updateDoc(
        doc(db, "users", targetParentId, "sharedChildren", childId),
        { role: "revoked", revokedAt: serverTimestamp() }
      ),
    ]).catch((e) => console.warn("Firestore revoke error:", e?.code));
  }

  // Update local cache
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(`${LOCAL_CONNECTED_PARENTS_KEY}_${childId}`);
    if (raw) {
      const list: ConnectedParent[] = JSON.parse(raw);
      const updated = list.filter((p) => p.parentId !== targetParentId);
      localStorage.setItem(`${LOCAL_CONNECTED_PARENTS_KEY}_${childId}`, JSON.stringify(updated));
    }
  }

  return { success: true };
}

/**
 * Get list of all parents connected to a child (from cloud + local)
 */
export async function getConnectedParents(
  ownerParentId: string,
  childId: string
): Promise<ConnectedParent[]> {
  const { db, rtdb } = getFirebaseInstance();
  let parents: ConnectedParent[] = [];

  // Try RTDB first
  if (isFirebaseConfigured() && rtdb) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `users/${ownerParentId}/children/${childId}/connectedParents`));
      if (snap.exists()) {
        const data = snap.val() as Record<string, ConnectedParent>;
        parents = Object.values(data).filter((p) => p.role !== ("revoked" as any));
      }
    } catch (e) {
      console.warn("RTDB connected parents fetch error:", e);
    }
  }

  // Fallback to Firestore
  if (parents.length === 0 && isFirebaseConfigured() && db) {
    try {
      const snapshot = await getDocs(
        collection(db, "users", ownerParentId, "children", childId, "connectedParents")
      );
      parents = snapshot.docs
        .map((d) => d.data() as ConnectedParent)
        .filter((p) => p.role !== ("revoked" as any));
    } catch (e) {
      console.warn("Firestore connected parents fetch error:", e);
    }
  }

  // Fallback to local cache
  if (parents.length === 0) {
    parents = getLocalConnectedParents(childId);
  }

  return parents;
}

// ─── Local Storage Helpers ──────────────────────────────────────────────────

export function saveConnectedParentLocally(childId: string, parent: ConnectedParent): void {
  if (typeof window === "undefined") return;
  const key = `${LOCAL_CONNECTED_PARENTS_KEY}_${childId}`;
  const raw = localStorage.getItem(key);
  const list: ConnectedParent[] = raw ? JSON.parse(raw) : [];
  const filtered = list.filter((p) => p.parentId !== parent.parentId);
  filtered.push(parent);
  localStorage.setItem(key, JSON.stringify(filtered));
}

export function getLocalConnectedParents(childId: string): ConnectedParent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${LOCAL_CONNECTED_PARENTS_KEY}_${childId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConnectedParent[];
  } catch {
    return [];
  }
}

export function clearLocalConnectedParents(childId: string): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${LOCAL_CONNECTED_PARENTS_KEY}_${childId}`);
  }
}
