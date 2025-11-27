# AI Pod Documentation Guide

**Instructions for AI assistants working on BioSynCare Lab**

This guide explains how to use and maintain the documentation system when implementing features.

---

## Core Principle

**Document every significant feature after implementation.**

When you implement a feature, create or update documentation so future AI pods and users understand:
- What the feature does
- How to use it
- How it works technically
- Where the code lives

---

## When to Document

### Always Document

✅ **New features** - Structure playback, session management, new tabs
✅ **Architecture changes** - State management refactors, new modules
✅ **User-facing functionality** - UI controls, workflows, interactions
✅ **API integrations** - Firebase, RDF, external services
✅ **Complex algorithms** - Audio synthesis, RDF parsing, state encoding

### Optional Documentation

⚠️ **Bug fixes** - Document if the fix changes behavior significantly
⚠️ **Minor improvements** - Document if it affects user workflow
⚠️ **Code cleanup** - Usually no documentation needed

### Never Document

❌ **Trivial changes** - Typo fixes, formatting
❌ **Internal refactors** - If behavior is unchanged
❌ **Temporary code** - Experiments, prototypes

---

## How to Add Documentation

### Step 1: Create Markdown File

Create a new `.md` file in the `docs/` directory:

```bash
touch docs/YOUR-FEATURE-NAME.md
```

**Naming conventions:**
- Use UPPERCASE for major guides: `QUICK-START.md`, `FEATURES.md`
- Use kebab-case for specific topics: `Structure-Playback.md`
- Be descriptive: `RDF-ENRICHMENT.md` not `RDF.md`

### Step 2: Write Documentation

Use this template:

```markdown
# Feature Name

Brief 1-2 sentence description of what this feature does.

---

## Overview

Explain what the feature is and why it exists.

**Key capabilities:**
- Bullet point 1
- Bullet point 2

---

## How to Use

Step-by-step user guide:

1. Navigate to X tab
2. Click Y button
3. Configure Z settings

### Example

Show a concrete example of using the feature.

---

## Technical Details

Explain how it works under the hood:

### Architecture

Describe the system design.

### Key Files

- [path/to/file.js](path/to/file.js:10-50) - Description with line numbers
- [another/file.js](another/file.js:100-150) - Another description

### Code Example

```javascript
// Show relevant code snippet
function exampleFunction() {
  // Explain what this does
}
```

---

## Related Documentation

- [Other Guide](other-guide) - Related topic
- [Another Guide](another-guide) - Related topic

---

**Last Updated**: YYYY-MM-DD
**Maintained by**: BioSynCare Lab AI Assistants
```

### Step 3: Map in docs-tab.js

Add your file to the documentation mapping:

**File**: `scripts/docs-tab.js`

```javascript
const DOC_FILES = {
  // ... existing mappings ...

  // Add your mapping here
  'your-feature-name': 'docs/YOUR-FEATURE-NAME.md',
};
```

**ID conventions:**
- Use kebab-case: `'rdf-enrichment'`
- Be concise but clear: `'quick-start'` not `'getting-started-guide'`
- Match the filename pattern

### Step 4: Add Link in HTML

Add a link to your documentation in the appropriate section:

**File**: `index.html` (lines 529-578)

```html
<section class="docs-section">
  <h3>Your Section Name</h3>
  <ul class="docs-list">
    <li><a href="#" data-doc="existing-doc">Existing Doc</a></li>
    <li><a href="#" data-doc="your-feature-name">Your Feature Name</a></li>
  </ul>
</section>
```

**Section guidelines:**
- **Getting Started**: Introductory guides, quick starts, overviews
- **Structure Explorer**: Features related to structures and playback
- **Architecture**: System design, refactoring, technical deep dives
- **NSO & RDF**: Semantic web, ontologies, RDF integration
- **Migration Guides**: Upgrade guides, breaking changes
- **Development**: Agent system, kernel, advanced topics

If no existing section fits, create a new one:

```html
<section class="docs-section">
  <h3>Your New Section</h3>
  <ul class="docs-list">
    <li><a href="#" data-doc="your-feature-name">Your Feature Name</a></li>
  </ul>
</section>
```

### Step 5: Test the Documentation

1. Start local server: `make serve`
2. Open http://localhost:4173
3. Click **Docs** tab
4. Find your documentation link
5. Click to verify markdown renders correctly
6. Check all internal links work

### Step 6: Commit with Context

Commit your documentation with clear context:

```bash
git add docs/YOUR-FEATURE-NAME.md scripts/docs-tab.js index.html
git commit -m "Document [feature name] implementation

Added comprehensive guide for [feature] including:
- User-facing workflow
- Technical architecture
- Code examples and file references
- Integration with existing systems

This documentation ensures future AI pods understand [feature]
and can maintain/extend it without re-discovering implementation details.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Documentation Best Practices

### Writing Style

✅ **Clear and concise** - Short sentences, active voice
✅ **User-focused** - Explain benefits, not just features
✅ **Complete** - Include all necessary context
✅ **Code references** - Link to specific files and line numbers
✅ **Examples** - Show, don't just tell

❌ **Too technical** - Balance detail with readability
❌ **Assumed knowledge** - Define terms, explain context
❌ **Outdated** - Update docs when code changes
❌ **Vague** - Be specific about file locations, line numbers

### File References

Always include clickable file references with line numbers:

```markdown
The playback logic is in [structures-tab.js](scripts/structures-tab.js:626-838)

Specifically, the StructurePlayer class (lines 626-838) handles:
- Audio synthesis
- Tempo control
- ADSR envelope generation
```

This helps future AI pods quickly locate relevant code.

### Cross-References

Link related documentation:

```markdown
## Related Documentation

- [Structure Playback](structures-playback) - Audio playback guide
- [RDF Enrichment](rdf-enrichment) - Metadata integration
- [Kernel Architecture](kernel-architecture) - System design
```

Use the document ID from `DOC_FILES`, not the filename.

### Code Examples

Show actual code, not pseudocode:

```javascript
// Good: Real, working code
const state = {
  version: 1,
  activeTab: 'structures',
  structures: {
    category: 'comprehensive',
    structureId: 'plain_hunt_6'
  }
};

// Bad: Pseudocode
state = {
  version: some_number,
  activeTab: tab_name,
  structures: { ... }
}
```

### Version History

Update the "Last Updated" date at the bottom:

```markdown
**Last Updated**: 2025-11-27
**Maintained by**: BioSynCare Lab AI Assistants
```

---

## Updating Existing Documentation

### When to Update

Update existing docs when:
- Feature behavior changes
- New capabilities are added
- File locations change
- APIs are modified
- Examples become outdated

### How to Update

1. Read the existing documentation file
2. Identify sections that need updating
3. Update relevant sections (preserve good content)
4. Add new sections if needed
5. Update "Last Updated" date
6. Test the updated documentation
7. Commit with clear change description

**Example update:**

```bash
git add docs/STRUCTURES-PLAYBACK.md
git commit -m "Update Structures Playback docs with new synthesis controls

Added documentation for:
- Note overlap control
- Exponential frequency scaling
- ADSR envelope parameters

Updated code references to reflect latest implementation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Example: Documenting a New Feature

### Scenario

You just implemented a "Structure Mixer" feature that allows users to blend multiple structures for playback.

### Step-by-Step

**1. Create documentation file:**

```bash
touch docs/STRUCTURE-MIXER.md
```

**2. Write comprehensive guide:**

```markdown
# Structure Mixer

Blend multiple musical structures for layered, complex compositions.

---

## Overview

The Structure Mixer allows you to combine 2-8 structures with independent:
- Volume levels
- Tempo multipliers
- Frequency offsets
- Phase shifts

**Use cases:**
- Create polyrhythmic patterns
- Layer complementary sequences
- Explore harmonic relationships

---

## How to Use

1. Go to **Structure Explorer** tab
2. Click **🎚️ Open Mixer** button
3. Click **+ Add Structure** to add structures to mix
4. Adjust volume, tempo, frequency for each
5. Click **▶ Play Mix** to hear the blend

### Example: Creating a Polyrhythm

1. Add "Plain Hunt on 6" at 120 BPM
2. Add "Grandsire Doubles" at 180 BPM (1.5x tempo)
3. Set Plain Hunt volume to 0.7
4. Set Grandsire volume to 0.5
5. Play to hear 2:3 polyrhythm

---

## Technical Details

### Architecture

The mixer creates multiple `StructurePlayer` instances and routes them through a master gain node:

```
StructurePlayer 1 → Gain 1 ─┐
StructurePlayer 2 → Gain 2 ─┼→ Master Gain → Speakers
StructurePlayer 3 → Gain 3 ─┘
```

### Key Files

- [scripts/structure-mixer.js](scripts/structure-mixer.js:1-450) - Core mixer implementation
- [scripts/structures-tab.js](scripts/structures-tab.js:626-838) - StructurePlayer integration
- [index.html](index.html:350-380) - Mixer UI panel

### Code Example

```javascript
class StructureMixer {
  constructor() {
    this.players = [];
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(audioContext.destination);
  }

  addStructure(sequence, options) {
    const player = new StructurePlayer(sequence, options);
    const gain = audioContext.createGain();
    gain.gain.value = options.volume || 0.5;
    gain.connect(this.masterGain);

    this.players.push({ player, gain, options });
  }

  play() {
    this.players.forEach(({ player }) => player.start());
  }
}
```

---

## Related Documentation

- [Structure Playback](structures-playback) - Single structure playback
- [Kernel Architecture](kernel-architecture) - System design overview

---

**Last Updated**: 2025-11-27
**Maintained by**: BioSynCare Lab AI Assistants
```

**3. Add to docs-tab.js:**

```javascript
const DOC_FILES = {
  // ... existing mappings ...

  // Structure Explorer
  'structures-playback': 'docs/STRUCTURES-PLAYBACK.md',
  'structure-mixer': 'docs/STRUCTURE-MIXER.md',  // NEW
  'rdf-enrichment': 'docs/RDF-ENRICHMENT.md',
};
```

**4. Add link in index.html:**

```html
<section class="docs-section">
  <h3>Structure Explorer</h3>
  <ul class="docs-list">
    <li><a href="#" data-doc="structures-playback">Structure Playback & Synthesis</a></li>
    <li><a href="#" data-doc="structure-mixer">Structure Mixer</a></li>
    <li><a href="#" data-doc="rdf-enrichment">RDF Enrichment</a></li>
  </ul>
</section>
```

**5. Test:**

```bash
make serve
# Navigate to http://localhost:4173
# Click Docs tab → Structure Explorer → Structure Mixer
# Verify rendering and links
```

**6. Commit:**

```bash
git add docs/STRUCTURE-MIXER.md scripts/docs-tab.js index.html
git commit -m "Document Structure Mixer feature

Added comprehensive documentation for new Structure Mixer including:
- User workflow for creating mixes
- Polyrhythm example
- Technical architecture with Web Audio routing
- Code examples and file references

Future AI pods can now understand and extend the mixer functionality.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

---

## Common Pitfalls

### ❌ Don't Skip Documentation

**Wrong:**
```
User: "Add a tempo slider to structures"
AI: *adds tempo slider*
AI: "Done! Added tempo slider."
```

**Right:**
```
User: "Add a tempo slider to structures"
AI: *adds tempo slider*
AI: *updates STRUCTURES-PLAYBACK.md with tempo slider section*
AI: "Done! Added tempo slider and documented it in STRUCTURES-PLAYBACK.md"
```

### ❌ Don't Write Vague Docs

**Wrong:**
```markdown
## Tempo Control

You can adjust the tempo using the slider.
```

**Right:**
```markdown
## Tempo Control

Control playback speed from 30 to 300 BPM using the tempo slider.

**Location**: Structure playback controls (below Play/Stop buttons)

**How it works**:
- Drag slider or click track to set BPM
- Tempo updates in real-time during playback
- No need to restart - tempo changes apply to next row

**Implementation**: [structures-tab.js](scripts/structures-tab.js:966-977)

```javascript
function updateTempo(sequenceId, tempo) {
  const tempoValue = document.querySelector(`.tempo-value[data-sequence-id="${sequenceId}"]`);
  if (tempoValue) {
    tempoValue.textContent = `${tempo} BPM`;
  }

  if (currentPlayer && currentPlayer.sequenceId === sequenceId) {
    currentPlayer.setTempo(tempo);
  }
}
```
```

### ❌ Don't Forget Cross-References

**Wrong:**
```markdown
# Structure Mixer

This feature lets you mix structures.

[End of document]
```

**Right:**
```markdown
# Structure Mixer

This feature lets you mix structures.

---

## Related Documentation

- [Structure Playback](structures-playback) - Single structure playback
- [Audio Architecture](audio-architecture) - Web Audio API integration
- [Features Overview](features) - All available features

---
```

---

## Documentation Checklist

Before committing documentation, verify:

- [ ] File created in `docs/` directory
- [ ] Mapped in `scripts/docs-tab.js`
- [ ] Link added to `index.html`
- [ ] Tested in browser (loads and renders correctly)
- [ ] Includes file references with line numbers
- [ ] Has code examples (if applicable)
- [ ] Cross-references related docs
- [ ] "Last Updated" date is current
- [ ] Commit message explains what was documented

---

## Summary

**For Future AI Pods:**

1. **Always document** significant features after implementation
2. **Follow the template** - Overview, How to Use, Technical Details, Related Docs
3. **Update three files** - Create .md, map in docs-tab.js, link in index.html
4. **Test thoroughly** - Verify rendering and links work
5. **Commit with context** - Explain what was documented and why

This ensures continuity across AI sessions and helps users discover and understand features.

---

**Questions?**

Check existing documentation for examples:
- [STRUCTURES-PLAYBACK.md](STRUCTURES-PLAYBACK.md) - Feature guide template
- [KERNEL-ARCHITECTURE.md](KERNEL-ARCHITECTURE.md) - Technical deep dive template
- [QUICK-START.md](QUICK-START.md) - User-focused guide template

---

**Last Updated**: 2025-11-27
**Maintained by**: BioSynCare Lab AI Assistants
