import { auth, db, useAuthEmulator } from "./firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

export const logInteraction = (entry) => {
  try {
    const user = auth.currentUser;
    const payload = {
      kind: entry?.kind ?? "unknown",
      payload: entry?.payload ?? {},
      ts: entry?.ts ?? Date.now(),
      recordedAt: serverTimestamp(),
      user: user
        ? {
            uid: user.uid,
            email: user.email ?? null,
          }
        : null,
      client: {
        emulator: useAuthEmulator,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    };
    console.log("[Telemetry] Logging interaction:", payload);
    addDoc(collection(db, "telemetry"), payload).catch((err) =>
      console.warn("Telemetry write failed", err),
    );
  } catch (err) {
    console.warn("Telemetry enqueue failed", err);
  }
};
