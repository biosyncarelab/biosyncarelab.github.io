import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { seedAll } from "./firestore-seed-data.mjs";

const allowProd = process.env.BSC_ALLOW_PROD_SEED === "1";
if (!allowProd) {
  console.error(
    "Aborting: set BSC_ALLOW_PROD_SEED=1 to confirm you intend to seed the production project.",
  );
  process.exit(1);
}

const projectId = process.env.BSC_FIREBASE_PROJECT || "bsc-lab";

try {
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
} catch (err) {
  console.error(
    "Failed to initialize Firebase Admin SDK. Ensure GOOGLE_APPLICATION_CREDENTIALS is set or run `gcloud auth application-default login`.",
  );
  console.error(err);
  process.exit(1);
}

const db = getFirestore();

await seedAll(db);

console.log(`Production Firestore (${projectId}) seed complete.`);
