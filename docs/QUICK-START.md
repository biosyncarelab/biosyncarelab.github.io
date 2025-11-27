# Quick Start Guide

Get started with BioSynCare Lab in 5 minutes.

---

## What is BioSynCare Lab?

BioSynCare Lab is a web-based platform for exploring musical structures, managing sensory tracks, and working with semantic RDF data. It combines:

- **Structure Explorer**: Visualize and play change-ringing sequences and symmetry patterns
- **Session Management**: Save, load, and share complex multi-track configurations
- **NSO Navigator**: Browse and explore RDF/Turtle ontologies
- **Track Mixer**: Audio, visual, and haptic track composition with real-time controls

---

## Getting Started

### 1. Open the Lab

Navigate to the deployed site or run locally:

```bash
make serve
# Opens http://localhost:4173
```

### 2. Explore the Tabs

BioSynCare Lab has four main tabs:

**Dashboard** - Session library and track management
**Structure Explorer** - Musical structure visualization and playback
**NSO Navigator** - RDF ontology browser
**Docs** - This documentation system

### 3. Try Structure Playback

1. Click the **Structure Explorer** tab
2. Select a category (Curated or Comprehensive)
3. Choose a structure from the dropdown
4. Click **▶ Play** to hear the musical sequence
5. Adjust tempo, waveform, and other synthesis parameters

### 4. Share a Structure

1. Play any structure to a specific position
2. Click the **📋 Share** button
3. Link is automatically copied to clipboard
4. Share the URL - it will restore the exact state

---

## Key Concepts

### Sessions

A **session** is a saved state of your entire lab configuration, including:
- Selected structures
- Active tracks (audio, visual, haptic)
- Martigli oscillations
- Playback positions

Sessions are stored in Firebase and can be shared via URL.

### Structures

**Structures** are mathematical sequences rendered as:
- Visual grids showing permutations
- Audio sequences using Web Audio API
- RDF metadata describing properties

Two categories:
- **Curated**: Hand-crafted symmetry patterns
- **Comprehensive**: Algorithmically-generated change-ringing

### Tracks

**Tracks** are individual media layers:
- **Audio**: Sound files with waveform preview
- **Visual**: Video files with canvas preview
- **Haptic**: Vibration patterns (mobile devices)
- **Martigli**: Control oscillations for modulation

### NSO (Neuro-Sensory Ontology)

The **NSO** is a semantic ontology describing:
- Sensory modalities (audio, visual, haptic)
- Therapeutic outcomes
- Synchronization patterns
- Musical structures

Browse it in the **NSO Navigator** tab.

---

## Common Tasks

### Create a New Session

1. Go to **Dashboard** tab
2. Configure tracks, Martigli oscillations, or structure controls
3. Click **Save current state**
4. Enter a name and optional folder
5. Session is saved to Firebase

### Load a Session

1. Sign in (if not already signed in)
2. Go to **Dashboard** tab
3. Select session from dropdown
4. Click **Apply session**
5. All tracks and state restored

### Export a Session

1. Load the session you want to export
2. Click **Download snapshot**
3. JSON file downloads with complete session data
4. Can be imported later or shared

### Browse RDF Ontology

1. Go to **NSO Navigator** tab
2. Search for concepts using the search bar
3. Click nodes to explore relationships
4. Toggle between Graph and Tree views
5. View Turtle source for any concept

---

## Navigation Tips

### Keyboard Shortcuts

Currently no keyboard shortcuts are implemented, but tab navigation works as expected with `Tab` and `Shift+Tab`.

### URL State

BioSynCare Lab uses URL fragments to store state:

```
https://example.com/#state=base64EncodedState
```

This means:
- Bookmarks preserve exact state
- Back/forward buttons work
- Shareable links restore full context

### Browser Requirements

BioSynCare Lab requires:
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- JavaScript enabled
- Web Audio API support (for playback)
- LocalStorage enabled (for preferences)

---

## Sign In & Sync

### Firebase Authentication

Sign in to enable:
- Session saving/loading
- Cross-device sync
- Telemetry tracking
- Collaborative features (future)

Supported methods:
- Email/Password
- Google OAuth
- Anonymous sessions

### Data Privacy

Your data is stored in:
- **Firebase Firestore**: Session metadata, user profiles
- **Firebase Storage**: Media files (audio, visual tracks)
- **Local Storage**: UI preferences, cache

All data is associated with your user ID and can be deleted on request.

---

## Troubleshooting

### No Sound During Playback

**Problem**: Structure plays but no audio
**Solution**:
1. Check browser audio permissions
2. Verify Web Audio API support
3. Ensure master volume is not zero
4. Try different browser

### Structure Won't Load

**Problem**: Selected structure shows loading spinner
**Solution**:
1. Check browser console for errors
2. Verify JSON file exists in `data/structures/`
3. Refresh page
4. Clear browser cache

### Session Won't Save

**Problem**: Save button does nothing or shows error
**Solution**:
1. Ensure you're signed in
2. Check Firebase connection (see console)
3. Verify session name is valid (no special chars)
4. Try signing out and back in

### RDF Won't Load in NSO Navigator

**Problem**: NSO Navigator shows empty graph
**Solution**:
1. Check browser console for fetch errors
2. Verify `rdf/modules/*.ttl` files exist
3. Check CORS settings if self-hosting
4. Try refreshing page

---

## Next Steps

Now that you're familiar with the basics:

1. **Explore Structures**: Try all categories and playback controls
2. **Create Sessions**: Save your favorite configurations
3. **Browse NSO**: Understand the semantic ontology
4. **Read Architecture Docs**: Learn how it all works
5. **Contribute**: Report bugs, suggest features on GitHub

---

## Related Documentation

- [Features Overview](features) - Detailed feature descriptions
- [Structure Playback & Synthesis](structures-playback) - Deep dive into playback
- [NSO Navigator](nso-navigator) - RDF ontology exploration guide
- [POD Architecture](pod-architecture) - System architecture overview

---

**Last Updated**: 2025-11-25
**Maintained by**: BioSynCare Lab AI Assistants
