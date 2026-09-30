/**
 * Firebase Configuration for Cloud Text Pad
 * Powered by Firebase Cloud Firestore
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Silence non-critical transport warnings
setLogLevel('error');

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

// Default configuration automatically loaded from provisioned firebase-applet-config.json
export const defaultFirebaseConfig: FirebaseCustomConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0731977955.firebaseapp.com",
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0731977955",
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0731977955.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "754787289004",
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || "1:754787289004:web:b3378798b376fbb8515c09",
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || undefined
};

/**
 * Returns stored custom config from localStorage if user updated it via in-app settings,
 * otherwise returns default config.
 */
export function getActiveFirebaseConfig(): FirebaseCustomConfig {
  try {
    const saved = localStorage.getItem('cloud_text_pad_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read custom Firebase config from localStorage', e);
  }
  return defaultFirebaseConfig;
}

/**
 * Helper to check whether the active configuration has real values or placeholder strings
 */
export function isFirebaseConfigured(config: FirebaseCustomConfig = getActiveFirebaseConfig()): boolean {
  if (!config.apiKey || !config.projectId) return false;
  if (config.apiKey.includes('YOUR_') || config.apiKey === 'YOUR_API_KEY_HERE') return false;
  if (config.projectId.includes('YOUR_') || config.projectId === 'YOUR_PROJECT_ID') return false;
  return true;
}

// Initialize Firebase App & Firestore with forced long-polling for instant connection
let appInstance;
let dbInstance: Firestore | null = null;

try {
  const activeConfig = getActiveFirebaseConfig();
  if (getApps().length === 0) {
    appInstance = initializeApp(activeConfig);
  } else {
    appInstance = getApp();
  }

  // Use initializeFirestore with experimentalForceLongPolling to eliminate the 10-second backend timeout
  const firestoreSettings = {
    experimentalForceLongPolling: true,
  };

  try {
    if (activeConfig.firestoreDatabaseId) {
      dbInstance = initializeFirestore(
        appInstance,
        firestoreSettings,
        activeConfig.firestoreDatabaseId
      );
    } else {
      dbInstance = initializeFirestore(
        appInstance,
        firestoreSettings
      );
    }
  } catch (e) {
    // If already initialized
    if (activeConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(appInstance, activeConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(appInstance);
    }
  }
} catch (error) {
  console.error('Firebase initialization notice:', error);
}

export const app = appInstance;
export const db = dbInstance;

/**
 * Allows dynamic re-initialization when the user inputs credentials in the UI
 */
export function reinitializeFirebase(newConfig: FirebaseCustomConfig) {
  try {
    localStorage.setItem('cloud_text_pad_firebase_config', JSON.stringify(newConfig));
    window.location.reload();
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
  }
}

/**
 * Clear custom config from localStorage
 */
export function resetFirebaseConfig() {
  localStorage.removeItem('cloud_text_pad_firebase_config');
  window.location.reload();
}
