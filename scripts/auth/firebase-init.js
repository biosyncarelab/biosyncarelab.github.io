/**
 * Firebase Initialization Module
 * Centralized Firebase setup and configuration
 * Handles emulator connections for local development
 */

import { firebaseConfig } from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import {
  getAuth,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Detect localhost for emulator usage
const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Check if user wants to use emulator (can opt-out via localStorage)
const useAuthEmulator = isLocalhost && !window.localStorage?.getItem("bsc.useProdAuth");

// Connect to emulators in local development
if (useAuthEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  console.log("🔧 Connected to Firebase emulators (auth:9099, firestore:8085)");
}

// Set authentication language to device language
auth.useDeviceLanguage();

// Load analytics only on supported platforms
isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      const analytics = getAnalytics(app);
      console.log("📊 Firebase Analytics initialized");
      return analytics;
    } else {
      console.log("📊 Firebase Analytics not supported on this platform");
      return null;
    }
  })
  .catch((err) => console.warn("Analytics initialization failed", err));

/**
 * Export Firebase instances for use throughout the app
 */
export { app, auth, db, useAuthEmulator, isLocalhost };

/**
 * Utility to check if running in emulator mode
 * @returns {boolean}
 */
export function isUsingEmulator() {
  return useAuthEmulator;
}

/**
 * Get Firebase app instance
 * @returns {FirebaseApp}
 */
export function getApp() {
  return app;
}

/**
 * Get Auth instance
 * @returns {Auth}
 */
export function getAuthInstance() {
  return auth;
}

/**
 * Get Firestore instance
 * @returns {Firestore}
 */
export function getFirestoreInstance() {
  return db;
}
