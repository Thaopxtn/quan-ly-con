// Firebase Configuration & Initialization
// Supports both Real Firebase Project Credentials and Sandbox/Offline Mode

export interface FirebaseProjectConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL?: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = "parent_pro_firebase_config";

// Default Configuration linked to user's real Firebase Project: qlconcai
export const DEFAULT_FIREBASE_CONFIG: FirebaseProjectConfig = {
  apiKey: "AIzaSyAkD0WZhm3uyLQ4Xlskuxndx0pGdz2jqHk",
  authDomain: "qlconcai.firebaseapp.com",
  projectId: "qlconcai",
  storageBucket: "qlconcai.firebasestorage.app",
  messagingSenderId: "594726838584",
  appId: "1:594726838584:android:7a124bb24cfd34c83221cd",
  databaseURL: "https://qlconcai-default-rtdb.europe-west1.firebasedatabase.app",
};

export function getSavedFirebaseConfig(): FirebaseProjectConfig {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.warn("Failed to parse saved Firebase config", e);
      }
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: Partial<FirebaseProjectConfig>): void {
  if (typeof window !== "undefined") {
    const current = getSavedFirebaseConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(updated));
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getSavedFirebaseConfig();
  return (
    Boolean(config.apiKey) &&
    !config.apiKey.includes("DEMO-KEY") &&
    Boolean(config.projectId) &&
    !config.projectId.includes("parentpro-kidcare-saas")
  );
}
