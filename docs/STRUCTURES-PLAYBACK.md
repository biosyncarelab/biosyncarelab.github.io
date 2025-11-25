# Structures Playback & Sharing

Complete guide to the BioSynCare Lab structure explorer, playback controls, and shareable links system.

---

## Overview

The **Structures** tab provides a comprehensive explorer for musical and mathematical structures, featuring:

- **Curated Structures**: Hand-crafted symmetry patterns and transformations
- **Comprehensive Structures**: Algorithmically-generated change-ringing sequences
- **Real-time Playback**: Audio synthesis with visual representation
- **RDF Metadata**: Full semantic web integration for each structure
- **Shareable Links**: State-encoded URLs for sharing specific structures

---

## Structure Categories

### Curated Structures

Artistically designed patterns focusing on symmetry and transformational aesthetics:

- **Symmetry Lines** collection
  - Mirror Sweep on 6
  - Rotating Crossfade on 6
  - Additional symmetry patterns

Each curated structure includes:
- Visual representation
- Audio playback with tuned frequencies
- RDF metadata describing the pattern's mathematical properties
- Share button for generating shareable links

### Comprehensive Structures

Algorithmically-generated change-ringing sequences from bell-ringing traditions:

- **Plain Changes**: 3, 4, 5 bells
- **Plain Hunt**: 4, 5, 6 bells
- **Method Compositions**:
  - Grandsire Doubles
  - Stedman Doubles
  - Additional classical methods

Each comprehensive structure includes:
- Complete permutation sequences
- Mathematical properties (extent, order, symmetry)
- Bell-ringing notation
- Audio synthesis matching traditional tower bells

---

## Playback Controls

### Basic Controls

Each structure card includes:

- **▶ Play**: Start audio playback from current position
- **⏸ Pause**: Pause playback while maintaining position
- **⏹ Stop**: Stop and reset to beginning
- **Position Slider**: Seek to any point in the sequence

### Position Tracking

The playback system maintains precise state:

```javascript
{
  sequenceId: 'plain_hunt_6',
  playbackPosition: 0,      // Current row index (0-based)
  isPlaying: false,         // Playback state
  category: 'comprehensive' // Structure category
}
```

Position is:
- Saved in application state
- Restored when switching tabs
- Included in shareable links
- Synchronized with visual display

---

## Audio Synthesis

### Frequency Mapping

Each bell/element is mapped to a specific frequency:

```javascript
// Default mapping for 6 bells
const frequencies = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  349.23, // F4
  392.00, // G4
  440.00  // A4
];
```

### Web Audio API

Structures use the Web Audio API for synthesis:

- **Oscillator Type**: Sine wave (pure tone)
- **Duration**: 200ms per note
- **Envelope**: Quick attack, gentle release
- **Polyphony**: Simultaneous notes supported

### Playback Loop

The playback engine:
1. Reads current row from sequence
2. Synthesizes frequencies for active elements
3. Advances position counter
4. Schedules next row
5. Updates visual display

---

## Shareable Links

### Link Generation

Every structure card includes a **📋 Share** button that:

1. Captures current application state
2. Encodes state to base64
3. Generates URL with `#state=...` fragment
4. Copies to clipboard
5. Shows confirmation toast

### State Encoding

States are JSON objects encoded as URL fragments:

```javascript
{
  version: 1,
  activeTab: 'structures',
  structures: {
    category: 'curated',
    structureId: 'symmetry-lines',
    sequenceId: 'mirror-sweep-6',
    playbackPosition: 0,
    isPlaying: false
  }
}
```

Encoding process:
1. `JSON.stringify(state)`
2. `encodeURIComponent(json)`
3. `Buffer.toString('base64')`
4. Prepend with `#state=`

### Example Links

**Curated Structure:**
```
http://localhost:3000/#state=eyJ2ZXJzaW9uIjoxLCJhY3Rp...
```

**Comprehensive Structure:**
```
http://localhost:3000/#state=eyJ2ZXJzaW9uIjoxLCJhY3Rp...
```

Links automatically:
- Switch to Structures tab
- Load specified structure
- Restore playback position
- Apply all state from encoding

---

## RDF Integration

### Structure Metadata

Each structure includes full RDF/JSON-LD metadata:

```json
{
  "@context": {
    "bsc": "http://purl.org/biosyncarelab/core#",
    "schema": "http://schema.org/"
  },
  "@id": "bsc:structure/plain-hunt-6",
  "@type": "bsc:ChangeRingingStructure",
  "bsc:name": "Plain Hunt on 6",
  "bsc:numBells": 6,
  "bsc:extent": 720,
  "bsc:hasSymmetry": "palindromic",
  "bsc:notation": "Plain Hunt"
}
```

### Viewing RDF

Click the **RDF** button on any structure card to:
- View formatted JSON-LD
- Inspect semantic properties
- Copy RDF data
- Understand structure relationships

---

## Technical Architecture

### Component Structure

```
structures-tab.js
├── loadStructures()      # Fetch and parse JSON data
├── renderStructureCard() # Create visual card elements
├── handlePlayback()      # Audio synthesis controller
├── shareStructure()      # State encoding & clipboard
└── showRdf()            # RDF viewer modal
```

### Data Flow

1. **Load**: Fetch JSON from `data/structures/*.json`
2. **Parse**: Extract sequences, metadata, RDF
3. **Render**: Create interactive cards
4. **Interact**: Handle play, pause, seek, share
5. **Persist**: Save state for restoration

### State Management

Structures state managed in `scripts/state-manager.js`:

```javascript
structuresState = {
  category: 'curated|comprehensive',
  structureId: 'id-from-structures-file',
  sequenceId: 'id-from-sequence-array',
  playbackPosition: 0,
  isPlaying: false
};
```

---

## Usage Guide

### Basic Playback

1. Navigate to **Structures** tab
2. Select category (Curated or Comprehensive)
3. Click **▶ Play** on any structure card
4. Use position slider to seek
5. Click **⏸ Pause** or **⏹ Stop** as needed

### Sharing Structures

1. Play structure to desired position
2. Click **📋 Share** button
3. Link copied to clipboard automatically
4. Paste URL to share with others
5. Recipients see exact same state

### Exploring RDF

1. Click **RDF** button on structure card
2. Browse semantic metadata
3. Click outside modal to close
4. Use data for semantic web applications

---

## Future Enhancements

Potential additions to structures system:

- **Custom Structure Builder**: User-created patterns
- **Visualization Modes**: Additional visual representations
- **Export Formats**: MIDI, MusicXML, audio files
- **Collaborative Editing**: Shared structure creation
- **Advanced Synthesis**: More oscillator types, effects
- **Structure Analysis**: Automatic pattern detection

---

## Developer Notes

### Adding New Structures

1. Define sequence data in JSON format
2. Include RDF metadata with proper `@context`
3. Add to appropriate category file:
   - `data/structures/curated-structures.json`
   - `data/structures/music-structures-comprehensive.json`
4. Regenerate shareable links if needed

### Modifying Playback

Edit `scripts/structures-tab.js`:

- **Frequencies**: Modify `BELL_FREQUENCIES` array
- **Duration**: Adjust note timing in `playNote()`
- **Synthesis**: Change oscillator type/envelope
- **Visuals**: Update row rendering logic

### State Schema

When extending state, maintain backwards compatibility:

```javascript
if (state.version === 1) {
  // Handle v1 schema
} else if (state.version === 2) {
  // Handle v2 schema with migration
}
```

---

## Troubleshooting

### Playback Issues

**No sound:**
- Check browser audio permissions
- Verify Web Audio API support
- Ensure speakers/headphones connected

**Choppy playback:**
- Reduce browser tab count
- Check CPU usage
- Try different browser

### Share Links

**Link doesn't restore state:**
- Verify base64 encoding integrity
- Check `state-manager.js` version compatibility
- Ensure JSON structure matches schema

**Link too long:**
- State encoding may be too large
- Consider compressing or abbreviating
- Use URL shortener for distribution

---

## Related Documentation

- [Architecture Overview](architecture)
- [NSO Navigator & RDF](nso-overview)
- [Development Setup](development-setup)
- [Migration Guides](migration-v2)

---

**Last Updated**: 2025-11-25
**Maintained by**: BioSynCare Lab AI Assistants
