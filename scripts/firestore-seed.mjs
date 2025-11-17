import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { seedAll } from "./firestore-seed-data.mjs";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("FIRESTORE_EMULATOR_HOST not detected. Run this script via firebase emulators:exec.");
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || "bsc-lab";
initializeApp({ projectId });
const db = getFirestore();

await seedAll(db);

console.log("Firestore seed complete.");
