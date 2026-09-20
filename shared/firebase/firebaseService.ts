import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import { getDatabase, Database, ref as rtdbRef, get as rtdbGet, set as rtdbSet, update as rtdbUpdate } from "firebase/database";
import { getSavedFirebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

let app: FirebaseApp | null = null;
let authInstance: ReturnType<typeof getAuth> | null = null;
let dbInstance: Firestore | null = null;
let rtdbInstance: Database | null = null;

export function getFirebaseInstance() {
  const config = getSavedFirebaseConfig();
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = getApp();
    } else {
      try {
        app = initializeApp(config);
      } catch (err) {
        console.warn("Firebase initializeApp warning (using sandbox mode):", err);
      }
    }
  }

  if (app && !authInstance) {
    try {
      authInstance = getAuth(app);
    } catch (e) {
      console.warn("Auth initialization error:", e);
    }
  }

  if (app && !dbInstance) {
    try {
      dbInstance = getFirestore(app);
    } catch (e) {
      console.warn("Firestore initialization error:", e);
    }
  }

  if (app && !rtdbInstance) {
    try {
      rtdbInstance = config.databaseURL ? getDatabase(app, config.databaseURL) : getDatabase(app);
    } catch (e) {
      console.warn("Realtime Database initialization error:", e);
    }
  }

  return { app, auth: authInstance, db: dbInstance, rtdb: rtdbInstance };
}

/**
 * Ensures Kid device has an active authenticated session using Firebase Anonymous Auth.
 * This guarantees that Firebase Security Rules requiring `auth != null` will allow Kid device
 * to read/write sync parameters, telemetry, SOS, and stars without PERMISSION_DENIED.
 */
export async function ensureKidAnonymousAuth(): Promise<User | null> {
  const { auth } = getFirebaseInstance();
  if (!isFirebaseConfigured() || !auth) return null;
  if (auth.currentUser) return auth.currentUser;

  try {
    const cred = await signInAnonymously(auth);
    console.log('[Firebase Auth] Kid device signed in anonymously with UID:', cred.user.uid);
    return cred.user;
  } catch (err) {
    console.warn('[Firebase Auth] Kid anonymous auth notice:', err);
    return null;
  }
}

// User Model for SaaS Parent
export interface ParentAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "parent" | "admin";
  plan: "free" | "pro_family" | "enterprise";
  maxChildren: number;
  createdAt: string;
}

const LOCAL_PARENT_USER_KEY = "parent_pro_active_user";

export async function registerParentAccount(
  email: string,
  pass: string,
  fullName: string
): Promise<{ success: boolean; user?: ParentAccount; error?: string }> {
  try {
    const { auth, db } = getFirebaseInstance();

    // If real Firebase is configured, use Firebase Auth
    if (isFirebaseConfigured() && auth) {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      try {
        await updateProfile(userCred.user, { displayName: fullName });
      } catch (profErr) {
        console.warn("Update profile warning:", profErr);
      }

      const parentData: ParentAccount = {
        uid: userCred.user.uid,
        email: userCred.user.email || email,
        displayName: fullName || email.split("@")[0] || "Phụ Huynh",
        role: "parent",
        plan: "free",
        maxChildren: 5,
        createdAt: new Date().toISOString(),
      };

      // Non-blocking background Firestore sync (never hangs authentication)
      if (db) {
        try {
          setDoc(doc(db, "users", userCred.user.uid), parentData, { merge: true }).catch((fsErr) => {
            console.warn("Background Firestore sync skipped:", fsErr);
          });
        } catch (_) {}
      }

      localStorage.setItem(LOCAL_PARENT_USER_KEY, JSON.stringify(parentData));
      return { success: true, user: parentData };
    }

    return {
      success: false,
      error: "Hệ thống xác thực chưa sẵn sàng hoặc Firebase chưa được cấu hình.",
    };
  } catch (err: any) {
    console.error("Register error:", err);
    let msg = "Đăng ký không thành công.";
    if (err?.code === "auth/email-already-in-use") {
      msg = "Email này đã được đăng ký. Vui lòng bấm 'Đăng nhập ngay' hoặc sử dụng email khác.";
    } else if (err?.code === "auth/invalid-email") {
      msg = "Định dạng email không hợp lệ (ví dụ: ten@gmail.com).";
    } else if (err?.code === "auth/weak-password") {
      msg = "Mật khẩu bảo mật phải có ít nhất 6 ký tự.";
    } else if (err?.code === "auth/network-request-failed") {
      msg = "Lỗi kết nối mạng. Vui lòng kiểm tra Wifi/4G.";
    } else if (err?.code === "auth/operation-not-allowed") {
      msg = "Phương thức đăng ký email chưa được bật trên Firebase Console.";
    } else if (err?.message) {
      msg = err.message;
    }
    return { success: false, error: msg };
  }
}

export async function loginParentAccount(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: ParentAccount; error?: string }> {
  try {
    const { auth, db } = getFirebaseInstance();

    if (isFirebaseConfigured() && auth) {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      let parentData: ParentAccount = {
        uid: userCred.user.uid,
        email: userCred.user.email || email,
        displayName: userCred.user.displayName || email.split("@")[0] || "Phụ Huynh",
        role: "parent",
        plan: "free",
        maxChildren: 5,
        createdAt: new Date().toISOString(),
      };
      if (userCred.user.photoURL) {
        parentData.photoURL = userCred.user.photoURL;
      }

      // Non-blocking Firestore sync with fast timeout check
      if (db) {
        try {
          setDoc(doc(db, "users", userCred.user.uid), parentData, { merge: true }).catch(() => {});
        } catch (_) {}
        // Try quick fetch with 1s timeout, without blocking if offline
        Promise.race([
          getDoc(doc(db, "users", userCred.user.uid)),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
        ]).then((userDoc: any) => {
          if (userDoc?.exists?.()) {
            const updated = { ...parentData, ...userDoc.data() };
            localStorage.setItem(LOCAL_PARENT_USER_KEY, JSON.stringify(updated));
          }
        }).catch(() => {});
      }

      localStorage.setItem(LOCAL_PARENT_USER_KEY, JSON.stringify(parentData));
      return { success: true, user: parentData };
    }

    return {
      success: false,
      error: "Hệ thống xác thực chưa sẵn sàng hoặc Firebase chưa được cấu hình.",
    };
  } catch (err: any) {
    console.error("Login error:", err);
    let msg = "Đăng nhập thất bại.";
    if (
      err?.code === "auth/invalid-credential" ||
      err?.code === "auth/user-not-found" ||
      err?.code === "auth/wrong-password"
    ) {
      msg = "Email hoặc mật khẩu chưa đúng. Nếu chưa có tài khoản, hãy bấm 'Tạo tài khoản mới' bên dưới.";
    } else if (err?.code === "auth/invalid-email") {
      msg = "Địa chỉ email không đúng định dạng.";
    } else if (err?.code === "auth/user-disabled") {
      msg = "Tài khoản này đã bị vô hiệu hóa.";
    } else if (err?.code === "auth/too-many-requests") {
      msg = "Đăng nhập sai quá nhiều lần. Vui lòng đợi 1 phút trước khi thử lại.";
    } else if (err?.code === "auth/network-request-failed") {
      msg = "Lỗi kết nối mạng. Vui lòng kiểm tra Wifi/4G.";
    } else if (err?.message) {
      msg = err.message;
    }
    return { success: false, error: msg };
  }
}

export async function loginWithGoogleParentAccount(): Promise<{
  success: boolean;
  user?: ParentAccount;
  error?: string;
}> {
  try {
    const { auth, db } = getFirebaseInstance();

    // 1. NATIVE ANDROID/IOS: Dùng Google Play Services / Credential Manager trực tiếp
    // Tuyệt đối không mở trình duyệt ngoài để tránh bị kẹt tại handler blank page
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result && result.user) {
          const u = result.user;
          const parentData: ParentAccount = {
            uid: u.uid,
            email: u.email || "",
            displayName: u.displayName || u.email?.split("@")[0] || "Phụ Huynh Google",
            role: "parent",
            plan: "free",
            maxChildren: 5,
            createdAt: new Date().toISOString(),
          };
          if (u.photoUrl) {
            parentData.photoURL = u.photoUrl;
          }

          if (db) {
            try {
              setDoc(doc(db, "users", u.uid), parentData, { merge: true }).catch(() => {});
            } catch (_) {}
          }

          localStorage.setItem(LOCAL_PARENT_USER_KEY, JSON.stringify(parentData));
          return { success: true, user: parentData };
        }
      } catch (nativeErr: any) {
        console.error("Native Google Sign-In error:", nativeErr);
        const msg = nativeErr?.message || String(nativeErr || "");
        const code = nativeErr?.code || "";

        // Chỉ hiển thị 'Đã hủy' nếu người dùng thực sự bấm ra ngoài hoặc nhấn Back để đóng popup (code 12501)
        const isUserCanceled =
          msg.includes("12501") ||
          msg.toLowerCase().includes("user canceled") ||
          msg.toLowerCase().includes("user cancelled");

        if (isUserCanceled) {
          return { success: false, error: "Bạn đã hủy chọn tài khoản Google." };
        }

        // Lỗi 16 hoặc CredentialManager hủy đột ngột do thiếu Web Client ID (WILL_BE_OVERRIDDEN) hoặc chưa nạp SHA-1
        if (
          msg.includes("16") ||
          msg.includes("GetCredential") ||
          msg.includes("WILL_BE_OVERRIDDEN") ||
          msg.includes("10") ||
          msg.includes("12500") ||
          msg.includes("cancel") ||
          msg.includes("CANCELED")
        ) {
          return {
            success: false,
            error: `Lỗi xác thực Google: Dự án chưa cập nhật Web Client ID hoặc file google-services.json chưa đồng bộ SHA-1 mới. Vui lòng tải lại google-services.json từ Firebase Console hoặc đăng nhập bằng Email/Mật khẩu.`,
          };
        }

        return {
          success: false,
          error: `Đăng nhập Google Native (${msg}). Bạn có thể đăng nhập bằng Email và Mật khẩu.`,
        };
      }
    }

    // 2. TRÌNH DUYỆT WEB / DESKTOP (npm run dev)
    if (isFirebaseConfigured() && auth) {
      const provider = new GoogleAuthProvider();
      provider.addScope("profile");
      provider.addScope("email");
      provider.setCustomParameters({ prompt: "select_account" });

      // Fast timeout on popup so it never freezes
      const userCred = await Promise.race([
        signInWithPopup(auth, provider),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject({ code: "auth/popup-timeout" }), 15000)
        ),
      ]);
      const user = userCred.user;

      let parentData: ParentAccount = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || user.email?.split("@")[0] || "Phụ Huynh Google",
        role: "parent",
        plan: "free",
        maxChildren: 5,
        createdAt: new Date().toISOString(),
      };
      if (user.photoURL) {
        parentData.photoURL = user.photoURL;
      }

      // Non-blocking background Firestore sync
      if (db) {
        try {
          setDoc(doc(db, "users", user.uid), parentData, { merge: true }).catch(() => {});
        } catch (_) {}
      }

      localStorage.setItem(LOCAL_PARENT_USER_KEY, JSON.stringify(parentData));
      return { success: true, user: parentData };
    }

    return {
      success: false,
      error: "Hệ thống xác thực chưa sẵn sàng hoặc Firebase chưa được cấu hình.",
    };
  } catch (err: any) {
    console.error("Google Auth error:", err);
    let errorMsg = err?.message || "Đăng nhập Google thất bại.";
    if (err?.code === "auth/popup-closed-by-user") {
      errorMsg = "Cửa sổ đăng nhập Google đã được đóng.";
    } else if (err?.code === "auth/popup-blocked" || err?.code === "auth/operation-not-supported-in-this-environment") {
      errorMsg = "Trình duyệt chặn mở popup Google. Bạn vui lòng đăng nhập bằng Email và Mật khẩu bên dưới.";
    } else if (err?.code === "auth/popup-timeout") {
      errorMsg = "Quá thời gian kết nối Google (hoặc popup bị chặn). Bạn vui lòng đăng nhập bằng Email và Mật khẩu bên dưới.";
    } else if (err?.code === "auth/operation-not-allowed") {
      errorMsg = "Đăng nhập Google chưa được kích hoạt trên Firebase Console. Vui lòng bật Google trong Authentication > Sign-in method.";
    } else if (err?.code === "auth/unauthorized-domain") {
      errorMsg = "Tên miền thaopxtn.github.io chưa được thêm vào Danh sách tên miền được ủy quyền (Authorized Domains) trong Firebase Authentication. Bạn vui lòng đăng nhập bằng Email và Mật khẩu bên dưới.";
    }
    return { success: false, error: errorMsg };
  }
}

export function getCurrentParentAccount(): ParentAccount | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(LOCAL_PARENT_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function logoutParentAccount(): void {
  const { auth } = getFirebaseInstance();
  if (auth) {
    signOut(auth).catch(() => {});
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_PARENT_USER_KEY);
  }
}

// ─── Kid Device Google Authentication & Multi-Device Support ──────────────────

export const LOCAL_KID_LOGGED_USER_KEY = "kid_logged_in_user";

/**
 * Signs in with Google on the Kid Device (supports Parent Google Account or Child's Google Account).
 * Allows the device to associate with the family's cloud account and list existing children.
 */
export async function loginKidWithGoogle(): Promise<{
  success: boolean;
  user?: ParentAccount;
  error?: string;
}> {
  const res = await loginWithGoogleParentAccount();
  if (res.success && res.user && typeof window !== "undefined") {
    localStorage.setItem(LOCAL_KID_LOGGED_USER_KEY, JSON.stringify(res.user));
  }
  return res;
}

export function getCurrentKidLoggedUser(): ParentAccount | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(LOCAL_KID_LOGGED_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
  }
  return null;
}

export function logoutKidAccount(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_KID_LOGGED_USER_KEY);
  }
}

/**
 * Fetches all children associated with a parent account from RTDB and Firestore
 */
export async function fetchChildrenForParentAccount(
  parentId: string
): Promise<Array<{ id: string; name: string; age?: number; grade?: string; avatar?: string; devices?: any[] }>> {
  const { rtdb, db } = getFirebaseInstance();
  const childrenMap: Map<string, any> = new Map();

  // 1. Fetch from RTDB users/${parentId}/children
  if (rtdb && parentId) {
    try {
      const snap = await rtdbGet(rtdbRef(rtdb, `users/${parentId}/children`));
      if (snap.exists()) {
        const val = snap.val();
        if (typeof val === "object" && val !== null) {
          Object.entries(val).forEach(([id, data]: [string, any]) => {
            if (data && typeof data === "object") {
              childrenMap.set(id, { id: data.id || id, ...data });
            }
          });
        }
      }
    } catch (e) {
      console.warn("fetchChildrenForParentAccount RTDB error:", e);
    }
  }

  // 2. Also check pairings/active_children for children linked to this parentId
  if (rtdb) {
    try {
      const allActiveSnap = await rtdbGet(rtdbRef(rtdb, "pairings/active_children"));
      if (allActiveSnap.exists()) {
        const all = allActiveSnap.val();
        if (typeof all === "object" && all !== null) {
          Object.entries(all).forEach(([id, data]: [string, any]) => {
            if (data && (data.parentId === parentId || !parentId)) {
              if (!childrenMap.has(id)) {
                childrenMap.set(id, { id, ...data });
              }
            }
          });
        }
      }
    } catch (_) {}
  }

  // 3. Fallback to Firestore if available
  if (db && parentId && childrenMap.size === 0) {
    try {
      const childrenCol = collection(db, "users", parentId, "children");
      const querySnap = await getDocs(childrenCol);
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          childrenMap.set(docSnap.id, { id: docSnap.id, ...data });
        }
      });
    } catch (_) {}
  }

  return Array.from(childrenMap.values());
}

/**
 * Creates a new child profile under the parent's cloud account
 */
export async function createChildForParentAccount(
  parentId: string,
  parentName: string,
  childData: { name: string; birthYear?: number; age?: number; avatar?: string; gender?: "boy" | "girl"; grade?: string }
): Promise<{ id: string; name: string; age: number; avatar: string; grade: string }> {
  const { rtdb, db } = getFirebaseInstance();
  const childId = "child_" + Date.now();
  const currentYear = new Date().getFullYear();
  const age = childData.age || (childData.birthYear ? Math.max(1, currentYear - childData.birthYear) : 8);
  const grade = childData.grade || `Lớp ${Math.max(1, age - 5)}`;
  const avatar = childData.avatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=180";

  const newChild = {
    id: childId,
    name: childData.name.trim(),
    age,
    grade,
    avatar,
    gender: childData.gender || "boy",
    birthYear: childData.birthYear || (currentYear - age),
    parentId: parentId || "family_primary",
    parentName: parentName || "Bố/Mẹ",
    status: "online",
    battery: 100,
    speed: 0,
    currentAddress: "Chưa cập nhật",
    lat: 21.0285,
    lng: 105.8542,
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };

  // Save to RTDB
  if (rtdb) {
    try {
      if (parentId) {
        await rtdbSet(rtdbRef(rtdb, `users/${parentId}/children/${childId}`), newChild);
      }
      await rtdbSet(rtdbRef(rtdb, `pairings/active_children/${childId}`), newChild);
    } catch (e) {
      console.warn("createChildForParentAccount RTDB warning:", e);
    }
  }

  // Save to Firestore
  if (db && parentId) {
    try {
      await setDoc(doc(db, "users", parentId, "children", childId), newChild, { merge: true });
    } catch (_) {}
  }

  return { id: childId, name: newChild.name, age, avatar, grade };
}
