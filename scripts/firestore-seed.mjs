import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("FIRESTORE_EMULATOR_HOST not detected. Run this script via firebase emulators:exec.");
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || "emulator-bsc-lab";
initializeApp({ projectId });
const db = getFirestore();

const sessions = [
  {
    id: "community-default-alpha",
    label: "Community Alpha Session",
    description: "Baseline alpha entrainment session with sine and binaural tracks.",
    visibility: "public",
    trackCount: 2,
    martigli: {
      startPeriodSec: 10,
      endPeriodSec: 20,
      transitionSec: 120,
      waveform: "sine",
    },
    voices: [
      {
        id: "voice-sine-440",
        label: "Pure sine • 440Hz",
        presetId: "sine",
        params: {
          frequency: 440,
          gain: 0.2,
          pan: 0,
        },
      },
      {
        id: "voice-binaural-alpha",
        label: "Binaural beat • Alpha 10Hz",
        presetId: "binaural-alpha",
        params: {
          base: 200,
          beat: 10,
          leftFrequency: 195,
          rightFrequency: 205,
          gain: 0.25,
        },
      },
    ],
    createdAt: new Date("2025-11-16T22:41:15Z"),
    updatedAt: new Date("2025-11-16T22:41:15Z"),
  },
];

const presets = [
  {
    id: "sine",
    kind: "voice",
    label: "Pure sine • 440Hz",
    params: {
      frequency: 440,
      gain: 0.2,
      martigliDepth_frequency: 0,
      martigliDepth_gain: 0,
    },
  },
  {
    id: "binaural-alpha",
    kind: "voice",
    label: "Binaural beat • Alpha 10Hz",
    params: {
      base: 200,
      beat: 10,
      leftFrequency: 195,
      rightFrequency: 205,
      gain: 0.25,
      panMode: "static",
    },
  },
];

async function seedCollection(path, docs) {
  const writes = docs.map(({ id, ...data }) => db.collection(path).doc(id).set({ id, ...data }));
  await Promise.all(writes);
  console.log(`Seeded ${docs.length} docs into ${path}`);
}

await seedCollection("sessions", sessions);
await seedCollection("presets", presets);

console.log("Firestore seed complete.");
