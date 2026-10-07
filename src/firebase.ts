/**
 * Firebase Configuration for Cloud Text Pad
 * Connected to Firebase Project: share-7cffb
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';

// Silence non-critical transport warnings
setLogLevel('error');

// Clean up any stale custom config stored in localStorage from previous builds
try {
  localStorage.removeItem('cloud_text_pad_firebase_config');
} catch {
  // Ignore in SSR / restricted storage
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Fixed Firebase Web App configuration for share-7cffb
export const defaultFirebaseConfig: FirebaseCustomConfig = {
  apiKey: "AIzaSyCU_Tc560k7SBEi0LWAHXCUJ4Gjx6AiGPE",
  authDomain: "share-7cffb.firebaseapp.com",
  projectId: "share-7cffb",
  storageBucket: "share-7cffb.firebasestorage.app",
  messagingSenderId: "498308294647",
  appId: "1:498308294647:web:9bb6296d3049d1daacb0f2",
  measurementId: "G-P5JR19HLWS"
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    defaultFirebaseConfig.apiKey &&
    defaultFirebaseConfig.projectId &&
    !defaultFirebaseConfig.apiKey.includes('YOUR_') &&
    !defaultFirebaseConfig.projectId.includes('YOUR_')
  );
}

// Initialize Firebase App & Firestore
let appInstance;
let dbInstance: Firestore | null = null;

try {
  if (getApps().length === 0) {
    appInstance = initializeApp(defaultFirebaseConfig);
  } else {
    appInstance = getApp();
  }

  // Use initializeFirestore with experimentalForceLongPolling for robust connectivity across all networks
  const firestoreSettings = {
    experimentalForceLongPolling: true,
  };

  try {
    dbInstance = initializeFirestore(appInstance, firestoreSettings);
  } catch {
    dbInstance = getFirestore(appInstance);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const app = appInstance;
export const db = dbInstance;
