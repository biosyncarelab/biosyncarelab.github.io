/**
 * Documentation Tab - Markdown documentation loader and viewer
 * Loads and displays markdown documentation files within the app
 */

// Documentation file mapping
const DOC_FILES = {
  // Getting Started
  'quick-start': 'docs/QUICK-START.md',
  'features': 'docs/Features.md',

  // Structure Explorer
  'structures-playback': 'docs/STRUCTURES-PLAYBACK.md',
  'rdf-enrichment': 'docs/RDF-ENRICHMENT.md',

  // Architecture
  'pod-architecture': 'docs/POD-ARCHITECTURE-GUIDE.md',
  'refactoring': 'docs/REFACTORING-SUMMARY.md',

  // NSO & RDF
  'nso-navigator': 'docs/NSO-Navigator.md',
  'ontology-linking': 'docs/Ontology-Linking-Strategy.md',
  'rdf-quality': 'docs/RDF-Quality-Strategy.md',

  // Migration Guides
  'migration-guide': 'docs/Migration-Guide-SSO-ONC-to-NSO.md',
  'appstate-migration': 'docs/COMPLETE-APPSTATE-MIGRATION.md',

  // Development
  'agents': 'docs/Agents.md',
  'kernel-architecture': 'docs/KERNEL-ARCHITECTURE.md',
  'ai-pod-guide': 'docs/AI-POD-GUIDE.md',
};

// DOM elements
const docsGrid = document.getElementById('docs-grid');
const docViewer = document.getElementById('doc-viewer');
const docContent = document.getElementById('doc-content');
const closeViewerBtn = document.getElementById('close-doc-viewer');

/**
 * Load and display a markdown document
 * @param {string} docId - Document identifier from data-doc attribute
 */
async function loadDocument(docId) {
  const filePath = DOC_FILES[docId];

  if (!filePath) {
    console.error(`Unknown document ID: ${docId}`);
    showError(`Document "${docId}" not found`);
    return;
  }

  try {
    // Show loading state
    docContent.innerHTML = '<div class="loading-spinner">Loading documentation...</div>';
    showViewer();

    // Fetch markdown file
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
    }

    const markdown = await response.text();

    // Parse markdown to HTML using marked.js
    if (typeof marked === 'undefined') {
      throw new Error('Marked.js library not loaded');
    }

    const html = marked.parse(markdown);

    // Display rendered content
    docContent.innerHTML = html;

    // Scroll to top of viewer
    docViewer.scrollTop = 0;

  } catch (error) {
    console.error('Error loading document:', error);
    showError(`Failed to load documentation: ${error.message}`);
  }
}

/**
 * Show error message in doc viewer
 * @param {string} message - Error message to display
 */
function showError(message) {
  docContent.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="color: var(--error);">⚠️ Error</h2>
      <p style="color: var(--text-secondary);">${message}</p>
      <button onclick="location.reload()" class="ghost small" style="margin-top: 1rem;">
        Reload Page
      </button>
    </div>
  `;
  showViewer();
}

/**
 * Show document viewer and hide docs grid
 */
function showViewer() {
  docsGrid.classList.add('hidden');
  docViewer.classList.remove('hidden');
}

/**
 * Hide document viewer and show docs grid
 */
function hideViewer() {
  docViewer.classList.add('hidden');
  docsGrid.classList.remove('hidden');
  docContent.innerHTML = '';
}

/**
 * Initialize documentation tab event listeners
 */
function initDocsTab() {
  // Event delegation for doc links
  docsGrid.addEventListener('click', (e) => {
    const docLink = e.target.closest('[data-doc]');
    if (docLink) {
      e.preventDefault();
      const docId = docLink.dataset.doc;
      loadDocument(docId);
    }
  });

  // Close viewer button
  closeViewerBtn.addEventListener('click', () => {
    hideViewer();
  });

  console.log('[DocsTab] Documentation tab initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDocsTab);
} else {
  initDocsTab();
}
