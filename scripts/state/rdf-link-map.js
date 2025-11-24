const NSO = 'https://biosyncarelab.github.io/ont#';

export const RDF_LINKS = {
  tracks: {
    BinauralBeatTrack: {
      uri: `${NSO}BinauralBeat`,
      label: 'Binaural Beat',
    },
    IsochronicTrack: {
      uri: `${NSO}IsochronicTone`,
      label: 'Isochronic Tone',
    },
    SineTrack: {
      uri: `${NSO}SineTone`,
      label: 'Pure Sine Tone',
    },
    GeometryVisualTrack: {
      uri: `${NSO}GeometricPatternVisualization`,
      label: 'Geometric Pattern Visualization',
    },
    ParticleVisualTrack: {
      uri: `${NSO}ParticleFieldVisualization`,
      label: 'Particle Field Visualization',
    },
    VibrationTrack: {
      uri: `${NSO}VibrationCue`,
      label: 'Vibration Cue',
    },
  },
  parameters: {
    gain: {
      uri: `${NSO}gain`,
      label: 'Gain (amplitude)',
    },
    pan: {
      uri: `${NSO}pan`,
      label: 'Stereo Pan',
    },
    carrier: {
      uri: `${NSO}carrierFrequency`,
      label: 'Carrier Frequency',
    },
    beat: {
      uri: `${NSO}beatFrequency`,
      label: 'Beat Frequency',
    },
    waveType: {
      uri: `${NSO}Waveform`,
      label: 'Waveform Family',
    },
    waveform: {
      uri: `${NSO}Waveform`,
      label: 'Waveform Family',
    },
    frequency: {
      uri: `${NSO}frequency`,
      label: 'Frequency',
    },
    pulseRate: {
      uri: `${NSO}pulseRate`,
      label: 'Pulse Rate',
    },
    dutyCycle: {
      uri: `${NSO}dutyCycle`,
      label: 'Duty Cycle',
    },
    opacity: {
      uri: `${NSO}opacity`,
      label: 'Opacity',
    },
    scale: {
      uri: `${NSO}scaleFactor`,
      label: 'Scale',
    },
    sides: {
      uri: `${NSO}numberOfSides`,
      label: 'Polygon Sides',
    },
    rotationSpeed: {
      uri: `${NSO}rotationSpeed`,
      label: 'Rotation Speed',
    },
    hue: {
      uri: `${NSO}hue`,
      label: 'Hue (HSL)',
    },
    saturation: {
      uri: `${NSO}saturation`,
      label: 'Saturation (HSL)',
    },
    lightness: {
      uri: `${NSO}lightness`,
      label: 'Lightness (HSL)',
    },
    count: {
      uri: `${NSO}particleCount`,
      label: 'Particle Count',
    },
    speed: {
      uri: `${NSO}particleSpeed`,
      label: 'Particle Speed',
    },
    spread: {
      uri: `${NSO}spread`,
      label: 'Particle Spread',
    },
    intensity: {
      uri: `${NSO}intensity`,
      label: 'Haptic Intensity',
    },
    pattern: {
      uri: `${NSO}vibrationPattern`,
      label: 'Vibration Pattern',
    },
  },
};
