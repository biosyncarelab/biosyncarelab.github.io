# BioSynCare Lab Documentation

This directory contains all user and developer documentation for BioSynCare Lab.

## 🤖 For AI Assistants

**START HERE:** [AI-POD-GUIDE.md](AI-POD-GUIDE.md)

This guide explains:
- When and how to document features
- Documentation structure and templates
- File mapping process
- Best practices and examples

**Always read this guide before adding documentation.**

---

## Documentation Structure

### Getting Started
- [QUICK-START.md](QUICK-START.md) - 5-minute getting started guide
- [Features.md](Features.md) - Complete feature reference

### Structure Explorer
- [STRUCTURES-PLAYBACK.md](STRUCTURES-PLAYBACK.md) - Structure playback & synthesis
- [RDF-ENRICHMENT.md](RDF-ENRICHMENT.md) - Semantic metadata integration

### Architecture
- [POD-ARCHITECTURE-GUIDE.md](POD-ARCHITECTURE-GUIDE.md) - POD system overview
- [REFACTORING-SUMMARY.md](REFACTORING-SUMMARY.md) - Recent architectural changes

### NSO & RDF
- [NSO-Navigator.md](NSO-Navigator.md) - RDF ontology browser guide
- [Ontology-Linking-Strategy.md](Ontology-Linking-Strategy.md) - External ontology integration
- [RDF-Quality-Strategy.md](RDF-Quality-Strategy.md) - RDF validation and quality

### Migration Guides
- [Migration-Guide-SSO-ONC-to-NSO.md](Migration-Guide-SSO-ONC-to-NSO.md) - Ontology migration
- [COMPLETE-APPSTATE-MIGRATION.md](COMPLETE-APPSTATE-MIGRATION.md) - State management migration

### Development
- [Agents.md](Agents.md) - Agent system architecture
- [KERNEL-ARCHITECTURE.md](KERNEL-ARCHITECTURE.md) - Core system design
- [AI-POD-GUIDE.md](AI-POD-GUIDE.md) - **Guide for AI assistants** 📘

---

## Adding Documentation

### Quick Reference

1. **Create** markdown file in `docs/`
2. **Map** in `scripts/docs-tab.js`
3. **Link** in `index.html` docs grid
4. **Test** in browser
5. **Commit** with context

See [AI-POD-GUIDE.md](AI-POD-GUIDE.md) for detailed instructions.

---

## Viewing Documentation

### In-App (Preferred)

1. Run `make serve`
2. Navigate to http://localhost:4173
3. Click **Docs** tab
4. Browse documentation with rendered markdown

### In IDE/Editor

All documentation is plain markdown and readable in any text editor.

### On GitHub

Documentation renders automatically on GitHub with proper formatting.

---

## Maintenance

### Updating Docs

When code changes, update relevant documentation:

1. Locate affected doc file(s)
2. Update relevant sections
3. Update "Last Updated" date
4. Test rendering
5. Commit with clear change description

### Adding New Docs

Follow the template in [AI-POD-GUIDE.md](AI-POD-GUIDE.md#step-2-write-documentation).

### Removing Docs

If a feature is deprecated:

1. Mark documentation as deprecated (add warning at top)
2. Remove from `docs-tab.js` and `index.html`
3. Move file to `docs/archive/` (don't delete)
4. Update cross-references in other docs

---

## Style Guide

### Headings

```markdown
# H1 - Document Title (one per file)
## H2 - Major Sections
### H3 - Subsections
#### H4 - Details (use sparingly)
```

### Code References

Always link to specific files and line numbers:

```markdown
See [structures-tab.js](../scripts/structures-tab.js:626-838) for implementation.
```

### Code Blocks

Specify language for syntax highlighting:

```markdown
\`\`\`javascript
function example() {
  return 'highlighted code';
}
\`\`\`
```

### Lists

Use bullet points for features, numbered lists for steps:

```markdown
**Features:**
- Feature 1
- Feature 2

**How to:**
1. Step 1
2. Step 2
```

---

## Documentation Principles

### For Users

- **Clarity**: Use simple language, avoid jargon
- **Examples**: Show concrete use cases
- **Context**: Explain why, not just what
- **Navigation**: Link related docs

### For Developers

- **Completeness**: Cover architecture, APIs, implementation
- **Code References**: Link to files with line numbers
- **Examples**: Show actual code, not pseudocode
- **Maintenance**: Keep docs in sync with code

### For AI Assistants

- **Consistency**: Follow templates and naming conventions
- **Discoverability**: Map files, add links, cross-reference
- **Context**: Explain decisions and trade-offs
- **Continuity**: Enable future AI pods to understand and extend

---

## Questions?

- **Users**: Check [QUICK-START.md](QUICK-START.md) or [Features.md](Features.md)
- **Developers**: Check architecture docs or code comments
- **AI Assistants**: Read [AI-POD-GUIDE.md](AI-POD-GUIDE.md)

---

**Last Updated**: 2025-11-27
**Maintained by**: BioSynCare Lab AI Assistants
