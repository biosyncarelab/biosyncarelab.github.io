import { strict as assert } from "node:assert";
import { BSCLabKernel } from "../scripts/structures.js";

// Mock browser environment
global.window = {
  AudioContext: class {
    constructor() {
      this.destination = {};
    }
    createGain() { return { connect: () => {} }; }
  }
};

async function testKernel() {
  console.log("Testing BSCLabKernel instantiation...");

  try {
    const kernel = new BSCLabKernel();
    assert.ok(kernel, "Kernel should be instantiated");
    assert.ok(kernel.tracks, "TrackManager should be initialized");
    assert.ok(kernel.audio, "AudioEngine should be initialized");
    assert.ok(kernel.video, "VideoEngine should be initialized");

    console.log("Kernel instantiated successfully.");

    // Test TrackManager
    assert.equal(typeof kernel.tracks.addTrack, "function", "TrackManager should have addTrack method");

    console.log("TrackManager verified.");

  } catch (err) {
    console.error("Kernel test failed:", err);
    process.exit(1);
  }
}

testKernel();
