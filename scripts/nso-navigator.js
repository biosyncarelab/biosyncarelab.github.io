import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

if (isLocalhost) {
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
}

// Ontology file mappings with metadata
const ontologyFiles = {
  "bsc-consolidated": {
    path: "rdf/releases/nso-consolidated-v1.0.ttl",
    label: "NSO Consolidated v1.0",
    description: "Complete ontology: 60+ classes across audio, visual, multimodal techniques and outcomes with evidence levels (0-5 scale)"
  },
  "bsc-owl": {
    path: "rdf/core/bsc-owl.ttl",
    label: "BSC Core (OWL)",
    description: "Core classes (Project, Protocol, Session, Technique, Outcome) and 11 safety/evidence metadata properties"
  },
  "bsc-skos": {
    path: "rdf/core/bsc-skos.ttl",
    label: "BSC Core (SKOS)",
    description: "SKOS concept schemes for neurosensory stimulation taxonomy"
  },
  "bsc-audio": {
    path: "rdf/modules/audio.ttl",
    label: "Audio Techniques",
    description: "6 audio techniques: binaural/monaural beats, isochronic tones, solfeggio, Hemi-Sync (evidence: 0.5-2.5)"
  },
  "bsc-visual": {
    path: "rdf/modules/visual.ttl",
    label: "Visual Techniques",
    description: "7 visual techniques: flicker, color therapy, entrainment, Ganzfeld (evidence: 1.2-3.8) with epilepsy warnings"
  },
  "bsc-mixed": {
    path: "rdf/modules/mixed.ttl",
    label: "Multimodal Techniques",
    description: "9 mixed techniques: audiovisual entrainment, vibroacoustic, VR, haptic (evidence: 1.5-3.5)"
  },
  "bsc-outcomes": {
    path: "rdf/modules/outcomes.ttl",
    label: "Outcomes Taxonomy",
    description: "30+ outcomes across cognitive, emotional, physiological, behavioral domains with measurement standards"
  },
  "sso-ontology": {
    path: "rdf/external/sso/sso-ontology.ttl",
    label: "SSO Ontology",
    description: "External: Sensory Stimulation Ontology (legacy)"
  },
  "sso-extended": {
    path: "rdf/external/sso/sso-ontology-extended.ttl",
    label: "SSO Extended",
    description: "External: Extended SSO with additional classes"
  },
  "sso-initial": {
    path: "rdf/external/sso/sso-initial.owl",
    label: "SSO Initial",
    description: "External: Initial SSO version with hierarchies"
  },
  "sso-updated": {
    path: "rdf/external/sso/sso-updated.owl",
    label: "SSO Updated",
    description: "External: Updated SSO version"
  },
  "onc-ontology": {
    path: "rdf/external/onc/onc-ontology-attachment-2.ttl",
    label: "ONC Ontology",
    description: "External: Neurosensory Care Ontology"
  },
  "onc-attachment": {
    path: "rdf/Attachment 2_ONC_Ontology.ttl",
    label: "ONC Attachment",
    description: "External: ONC with hierarchies (legacy)"
  },
  "harmonicare-sso": {
    path: "rdf/external/harmonicare/SSO_Ontology.owl",
    label: "HarmoniCare SSO",
    description: "External: HarmoniCare SSO variant"
  },
  "harmonicare-sso-alt": {
    path: "rdf/external/harmonicare/SSO_Ontology_.owl",
    label: "HarmoniCare SSO Alt",
    description: "External: HarmoniCare SSO alternative"
  },
};

const urlParams =
  typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
const requestedConcept = urlParams.get("concept");
const requestedOntology = urlParams.get("ontology");

// State
let currentUser = null;
let currentURI = null;
let cy = null;
let currentOntology =
  requestedOntology && ontologyFiles[requestedOntology] ? requestedOntology : "bsc-outcomes";
let currentLayout = "cose";
// Default to CognitiveOutcome if no concept requested
let pendingConceptFocus = requestedConcept || "https://biosyncarelab.github.io/ont#CognitiveOutcome";
let showPropertiesAsNodes = true;

// UI Elements
const ui = {
  canvas: document.getElementById("cy-canvas"),
  inspector: document.getElementById("uri-inspector"),
  inspectorURI: document.getElementById("inspector-uri"),
  inspectorType: document.getElementById("inspector-type"),
  inspectorLabel: document.getElementById("inspector-label"),
  inspectorDefinition: document.getElementById("inspector-definition"),
  inspectorProperties: document.getElementById("inspector-properties"),
  inspectorComments: document.getElementById("inspector-comments"),
  closeInspector: document.getElementById("close-inspector"),
  addCommentBtn: document.getElementById("add-comment-btn"),
  commentForm: document.getElementById("comment-form"),
  commentInput: document.getElementById("comment-input"),
  cancelComment: document.getElementById("cancel-comment"),
  ontologySelector: document.getElementById("ontology-selector"),
  ontologyDescription: document.getElementById("ontology-description"),
  layoutSelector: document.getElementById("layout-selector"),
  toggleProperties: document.getElementById("toggle-properties"),
  propertiesToggleText: document.getElementById("properties-toggle-text"),
  toggleFilters: document.getElementById("toggle-filters"),
  edgeFilters: document.getElementById("edge-filters"),
  filterSubclass: document.getElementById("filter-subclass"),
  filterDomain: document.getElementById("filter-domain"),
  filterRange: document.getElementById("filter-range"),
  filterRelated: document.getElementById("filter-related"),
  resetView: document.getElementById("reset-view"),
  loading: document.getElementById("loading-indicator"),
  error: document.getElementById("error-message"),
  errorText: document.getElementById("error-text"),
};

if (ui.ontologySelector) {
  ui.ontologySelector.value = currentOntology;
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    ui.addCommentBtn.disabled = false;
  } else {
    ui.addCommentBtn.disabled = true;
  }
});

// Parse Turtle (simplified parser for basic triples)
function parseTurtle(ttlText) {
  const lines = ttlText.split("\n");
  const prefixes = {};
  const triples = [];
  const resources = new Map();

  let currentSubject = null;
  let currentPredicate = null;

  // Expand prefixed URIs
  const expandURI = (uri) => {
    if (uri.startsWith("<") && uri.endsWith(">")) {
      return uri.slice(1, -1);
    }
    const colonIndex = uri.indexOf(":");
    if (colonIndex > 0) {
      const prefix = uri.substring(0, colonIndex);
      const local = uri.substring(colonIndex + 1);
      if (prefixes[prefix]) {
        return prefixes[prefix] + local;
      }
    }
    return uri;
  };

  // Parse object values
  const parseObject = (objStr) => {
    objStr = objStr.trim().replace(/[;.]\s*$/, "");

    // Literal with language tag
    if (objStr.match(/"([^"]*)"@(\w+)/)) {
      const match = objStr.match(/"([^"]*)"@(\w+)/);
      return { value: match[1], type: "literal", lang: match[2] };
    }

    // Literal with datatype
    if (objStr.match(/"([^"]*)"\^\^/)) {
      const match = objStr.match(/"([^"]*)"\^\^(.+)/);
      return { value: match[1], type: "literal", datatype: match[2] };
    }

    // Simple literal
    if (objStr.startsWith('"') && objStr.endsWith('"')) {
      return { value: objStr.slice(1, -1), type: "literal" };
    }

    // URI
    if (objStr.startsWith("<") && objStr.endsWith(">")) {
      return { value: objStr.slice(1, -1), type: "uri" };
    }

    // Prefixed URI
    if (objStr.includes(":")) {
      const expanded = expandURI(objStr);
      return { value: expanded, type: "uri" };
    }

    return { value: objStr, type: "literal" };
  };

  // First pass: join multi-line statements (those ending with ; or ,)
  const statements = [];
  let currentStatement = "";

  for (let line of lines) {
    line = line.trim();

    // Skip comments and empty lines
    if (!line || line.startsWith("#")) continue;

    // Strip inline comments (everything after # that's not inside angle brackets or quotes)
    // Don't strip # if it's inside angle brackets (part of URI like <...#Concept>)
    if (!line.startsWith("@prefix") && !line.startsWith("@base")) {
      const hashIndex = line.indexOf('#');
      if (hashIndex > 0) {
        // Check if # is inside angle brackets
        const beforeHash = line.substring(0, hashIndex);
        const openBrackets = (beforeHash.match(/</g) || []).length;
        const closeBrackets = (beforeHash.match(/>/g) || []).length;

        // Only strip if brackets are balanced (# is not inside a URI)
        if (openBrackets === closeBrackets && (beforeHash.includes('.') || beforeHash.includes(';'))) {
          line = beforeHash.trim();
        }
      }
    }

    // Handle prefix declarations separately
    if (line.startsWith("@prefix") || line.startsWith("@base")) {
      if (currentStatement) {
        statements.push(currentStatement);
        currentStatement = "";
      }
      statements.push(line);
      continue;
    }

    // Add line to current statement
    if (currentStatement) {
      currentStatement += " " + line;
    } else {
      currentStatement = line;
    }

    // Check if statement is complete (ends with .)
    if (line.endsWith(".")) {
      statements.push(currentStatement);
      currentStatement = "";
    }
  }

  // Add any remaining statement
  if (currentStatement) {
    statements.push(currentStatement);
  }

  // Second pass: parse complete statements
  for (let statement of statements) {
    statement = statement.trim();

    // Parse prefix declarations
    if (statement.startsWith("@prefix")) {
      const match = statement.match(/@prefix\s+(\w+):\s+<([^>]+)>/);
      if (match) {
        prefixes[match[1]] = match[2];
      }
      continue;
    }

    // Parse triples with potential property lists (semicolon-separated)
    // Format: subject pred1 obj1 ; pred2 obj2 ; pred3 obj3 .

    // First, split by first whitespace to get subject
    const firstSpace = statement.search(/\s/);
    if (firstSpace === -1) continue;

    currentSubject = expandURI(statement.substring(0, firstSpace).trim());
    const rest = statement.substring(firstSpace + 1).trim();

    // Split by semicolons to get property-object pairs
    const propertyPairs = rest.split(";");

    for (let pair of propertyPairs) {
      pair = pair.trim().replace(/\s*\.\s*$/, ""); // Remove trailing period
      if (!pair) continue;

      // Split by first whitespace to get predicate and object
      const pairSpace = pair.search(/\s/);
      if (pairSpace === -1) continue;

      let predicateRaw = pair.substring(0, pairSpace).trim();
      // Handle 'a' as shorthand for rdf:type
      if (predicateRaw === 'a') {
        currentPredicate = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
      } else {
        currentPredicate = expandURI(predicateRaw);
      }
      const objectPart = pair.substring(pairSpace + 1).trim();

      // Handle multiple objects separated by commas
      const objects = objectPart.split(",");

      for (let objStr of objects) {
        objStr = objStr.trim();
        if (!objStr) continue;

        const object = parseObject(objStr);

        if (currentSubject && currentPredicate && object) {
          triples.push({
            subject: currentSubject,
            predicate: currentPredicate,
            object: object.value,
            objectType: object.type,
          });
        }
      }
    }
  }

  // Build resource map
  for (const triple of triples) {
    if (!resources.has(triple.subject)) {
      resources.set(triple.subject, {
        uri: triple.subject,
        properties: {},
        types: [],
        label: getLocalName(triple.subject),
      });
    }

    const resource = resources.get(triple.subject);

    // Track types
    if (
      triple.predicate === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" ||
      triple.predicate.endsWith("#type")
    ) {
      resource.types.push(triple.object);
    }

    // Track labels
    if (
      triple.predicate === "http://www.w3.org/2000/01/rdf-schema#label" ||
      triple.predicate.endsWith("#label")
    ) {
      resource.label = triple.object;
    }

    // Store all properties
    if (!resource.properties[triple.predicate]) {
      resource.properties[triple.predicate] = [];
    }
    resource.properties[triple.predicate].push({
      value: triple.object,
      type: triple.objectType,
    });
  }

  return { triples, resources, prefixes };
}

function getLocalName(uri) {
  if (!uri) return "";
  const hashIndex = uri.lastIndexOf("#");
  const slashIndex = uri.lastIndexOf("/");
  const splitIndex = Math.max(hashIndex, slashIndex);
  return splitIndex >= 0 ? uri.substring(splitIndex + 1) : uri;
}

// Build Cytoscape graph from RDF data
function buildGraph(rdfData) {
  const elements = [];
  const nodeMap = new Set();

  const classURI = "http://www.w3.org/2002/07/owl#Class";
  const objectPropertyURI = "http://www.w3.org/2002/07/owl#ObjectProperty";
  const datatypePropertyURI = "http://www.w3.org/2002/07/owl#DatatypeProperty";
  const conceptURI = "http://www.w3.org/2004/02/skos/core#Concept";
  const subClassOf = "http://www.w3.org/2000/01/rdf-schema#subClassOf";
  const domain = "http://www.w3.org/2000/01/rdf-schema#domain";
  const range = "http://www.w3.org/2000/01/rdf-schema#range";
  const skosRelated = "http://www.w3.org/2004/02/skos/core#related";
  const skosBroader = "http://www.w3.org/2004/02/skos/core#broader";
  const skosNarrower = "http://www.w3.org/2004/02/skos/core#narrower";
  const dctSource = "http://purl.org/dc/terms/source";
  const dctIsReplacedBy = "http://purl.org/dc/terms/isReplacedBy";
  const owlDeprecated = "http://www.w3.org/2002/07/owl#deprecated";

  // Build concept-to-class mapping (XConcept -> X via skos:related)
  const conceptToClass = new Map();
  const conceptResources = new Map();

  for (const triple of rdfData.triples) {
    if (triple.predicate === skosRelated && triple.objectType === "uri") {
      const subjectRes = rdfData.resources.get(triple.subject);
      const objectRes = rdfData.resources.get(triple.object);

      console.log('Checking skos:related:', {
        subject: triple.subject,
        object: triple.object,
        subjectTypes: subjectRes?.types,
        objectTypes: objectRes?.types
      });

      // Check both directions: Concept -> Class or Class -> Concept
      if (subjectRes?.types.includes(conceptURI) && objectRes?.types.includes(classURI)) {
        // Concept -> Class
        console.log('Mapping concept to class:', triple.subject, '->', triple.object);
        conceptToClass.set(triple.subject, triple.object);
        conceptResources.set(triple.subject, subjectRes);
      } else if (subjectRes?.types.includes(classURI) && objectRes?.types.includes(conceptURI)) {
        // Class -> Concept (map concept to class)
        console.log('Mapping concept to class (reverse):', triple.object, '->', triple.subject);
        conceptToClass.set(triple.object, triple.subject);
        conceptResources.set(triple.object, objectRes);
      }
    }
  }

  console.log('Total concept-to-class mappings:', conceptToClass.size);

  // Build deprecated-to-replacement mapping (deprecated entities -> replacement via dct:isReplacedBy)
  const deprecatedToReplacement = new Map();
  const deprecatedResources = new Map();

  for (const triple of rdfData.triples) {
    if (triple.predicate === dctIsReplacedBy && triple.objectType === "uri") {
      const deprecatedRes = rdfData.resources.get(triple.subject);
      const replacementRes = rdfData.resources.get(triple.object);

      // Check if subject is deprecated
      const deprecatedProp = deprecatedRes?.properties[owlDeprecated];
      if (deprecatedProp && deprecatedProp[0]?.value === "true") {
        console.log('Mapping deprecated entity to replacement:', triple.subject, '->', triple.object);
        deprecatedToReplacement.set(triple.subject, triple.object);
        deprecatedResources.set(triple.subject, deprecatedRes);
      }
    }
  }

  console.log('Total deprecated-to-replacement mappings:', deprecatedToReplacement.size);

  // Store properties separately (they will become edges, not nodes)
  const objectProperties = new Map();
  const datatypeProperties = new Map();

  // Create nodes for classes and concepts (but NOT properties or deprecated entities)
  for (const [uri, resource] of rdfData.resources) {
    // Skip concepts that are mapped to classes (will be merged)
    if (conceptToClass.has(uri)) {
      console.log('Skipping concept node (will be merged):', uri);
      continue;
    }

    // Skip deprecated entities that are replaced by other entities (will be merged)
    if (deprecatedToReplacement.has(uri)) {
      console.log('Skipping deprecated node (will be merged into replacement):', uri);
      continue;
    }

    let nodeType = "resource";
    let color = "#64748b"; // default gray
    let mergedResource = resource;
    let relatedConcept = null;

    if (resource.types.includes(classURI)) {
      nodeType = "class";
      color = "#38bdf8"; // blue

      // Check if there's a concept related to this class
      for (const [conceptURI, classURI] of conceptToClass) {
        if (classURI === uri) {
          relatedConcept = conceptResources.get(conceptURI);
          // Create merged resource with both class and concept data
          mergedResource = {
            ...resource,
            conceptData: relatedConcept,
            conceptURI: conceptURI
          };
          // Also map concept URI to this class node for getElementById lookups
          nodeMap.add(conceptURI);
          break;
        }
      }

      // Check if there are deprecated entities that replace to this class
      const deprecatedEntities = [];
      for (const [deprecatedURI, replacementURI] of deprecatedToReplacement) {
        if (replacementURI === uri) {
          const deprecatedRes = deprecatedResources.get(deprecatedURI);
          deprecatedEntities.push({
            uri: deprecatedURI,
            data: deprecatedRes
          });
          // Also map deprecated URI to this replacement node for getElementById lookups
          nodeMap.add(deprecatedURI);
        }
      }

      if (deprecatedEntities.length > 0) {
        mergedResource = {
          ...mergedResource,
          deprecatedEntities: deprecatedEntities
        };
      }
    } else if (resource.types.includes(objectPropertyURI)) {
      // Skip built-in RDF/OWL properties - they have special handling
      if (uri === subClassOf || uri === domain || uri === range ||
          uri === skosRelated || uri === skosBroader || uri === skosNarrower) {
        continue; // Skip creating node AND skip storing as property
      }
      // Store object properties separately - they will become edges
      objectProperties.set(uri, resource);
      console.log('Storing object property for edge creation:', uri);
      continue; // Skip creating node
    } else if (resource.types.includes(datatypePropertyURI)) {
      // Store datatype properties separately - they will become edges
      datatypeProperties.set(uri, resource);
      console.log('Storing datatype property for edge creation:', uri);
      continue; // Skip creating node
    } else if (resource.types.includes(conceptURI)) {
      nodeType = "concept";
      color = "#22d3ee"; // cyan
    }

    elements.push({
      data: {
        id: uri,
        label: mergedResource.label || getLocalName(uri),
        type: nodeType,
        color: color,
        resource: mergedResource,
      },
    });
    nodeMap.add(uri);
  }

  // Create edges
  for (const triple of rdfData.triples) {
    const { subject, predicate, object, objectType } = triple;

    // Skip skos:related edges between merged concept/class pairs
    if (predicate === skosRelated && (conceptToClass.has(subject) || conceptToClass.has(object))) {
      console.log('Skipping skos:related edge between merged concept/class:', subject, '->', object);
      continue;
    }

    // Skip domain/range edges - we handle these separately when creating property edges
    if (predicate === domain || predicate === range) {
      continue;
    }

    // Skip metadata edges that should only appear in inspector (not as graph edges)
    if (predicate === dctSource || predicate === dctIsReplacedBy || predicate === owlDeprecated) {
      continue;
    }

    // Only create edges for URI objects where BOTH subject and object exist as nodes
    if (objectType === "uri" && nodeMap.has(subject) && nodeMap.has(object)) {
      let edgeClass = "relation";
      let edgeColor = "#a78bfa"; // purple
      let edgeStyle = "solid";
      let edgeWidth = 2;

      // Subclass relations (hierarchy)
      if (predicate === subClassOf) {
        edgeClass = "subclass";
        edgeColor = "#38bdf8"; // blue
        edgeStyle = "solid";
        edgeWidth = 3;
      }
      // SKOS broader/narrower (hierarchy)
      else if (predicate === skosBroader || predicate === skosNarrower) {
        edgeClass = "hierarchy";
        edgeColor = "#38bdf8"; // blue
        edgeStyle = "dashed";
        edgeWidth = 2;
      }
      // SKOS related
      else if (predicate === skosRelated) {
        edgeClass = "related";
        edgeColor = "#22d3ee"; // cyan
        edgeStyle = "dotted";
        edgeWidth = 1.5;
      }

      elements.push({
        data: {
          id: `${subject}-${predicate}-${object}`,
          source: subject,
          target: object,
          label: getLocalName(predicate),
          edgeType: edgeClass,
          color: edgeColor,
          style: edgeStyle,
          width: edgeWidth,
          predicate: predicate,
        },
      });
    }
  }

  // Create edges from object properties using domain/range
  const thingURI = "http://www.w3.org/2002/07/owl#Thing";

  for (const [propertyURI, propertyResource] of objectProperties) {
    // Skip built-in RDF/OWL properties that have special handling
    if (propertyURI === subClassOf || propertyURI === domain || propertyURI === range ||
        propertyURI === skosRelated || propertyURI === skosBroader || propertyURI === skosNarrower) {
      continue;
    }
    // Get domain and range from property
    let domainURIs = [];
    let rangeURIs = [];

    // Look for domain triples
    for (const triple of rdfData.triples) {
      if (triple.subject === propertyURI && triple.predicate === domain && triple.objectType === "uri") {
        domainURIs.push(triple.object);
      }
      if (triple.subject === propertyURI && triple.predicate === range && triple.objectType === "uri") {
        rangeURIs.push(triple.object);
      }
    }

    // If no domain or range, use Thing
    if (domainURIs.length === 0) {
      domainURIs.push(thingURI);
    }
    if (rangeURIs.length === 0) {
      rangeURIs.push(thingURI);
    }

    // Create Thing node if needed
    if ((domainURIs.includes(thingURI) || rangeURIs.includes(thingURI)) && !nodeMap.has(thingURI)) {
      elements.push({
        data: {
          id: thingURI,
          label: "Thing",
          type: "class",
          color: "#94a3b8", // light gray
          resource: {
            uri: thingURI,
            types: [classURI],
            properties: {},
            label: "Thing"
          },
        },
      });
      nodeMap.add(thingURI);
    }

    // Create edges for each domain-range combination
    for (const domainURI of domainURIs) {
      for (const rangeURI of rangeURIs) {
        // Only create edge if both domain and range nodes exist
        if (nodeMap.has(domainURI) && nodeMap.has(rangeURI)) {
          elements.push({
            data: {
              id: `${domainURI}-${propertyURI}-${rangeURI}`,
              source: domainURI,
              target: rangeURI,
              label: propertyResource.label || getLocalName(propertyURI),
              edgeType: "objectProperty",
              color: "#a78bfa", // purple
              style: "solid",
              width: 2,
              predicate: propertyURI,
            },
          });
          console.log('Created object property edge:', domainURI, '->', rangeURI, 'via', getLocalName(propertyURI));
        }
      }
    }
  }

  // Create edges from datatype properties to datatypes
  for (const [propertyURI, propertyResource] of datatypeProperties) {
    // Get domain and range from property
    let domainURIs = [];
    let rangeURIs = [];

    // Look for domain and range triples
    for (const triple of rdfData.triples) {
      if (triple.subject === propertyURI && triple.predicate === domain && triple.objectType === "uri") {
        domainURIs.push(triple.object);
      }
      if (triple.subject === propertyURI && triple.predicate === range && triple.objectType === "uri") {
        rangeURIs.push(triple.object);
      }
    }

    // If no domain or range, use Thing/string
    if (domainURIs.length === 0) {
      domainURIs.push(thingURI);
    }
    if (rangeURIs.length === 0) {
      rangeURIs.push("http://www.w3.org/2001/XMLSchema#string"); // default datatype
    }

    // Create Thing node if needed
    if (domainURIs.includes(thingURI) && !nodeMap.has(thingURI)) {
      elements.push({
        data: {
          id: thingURI,
          label: "Thing",
          type: "class",
          color: "#94a3b8", // light gray
          resource: {
            uri: thingURI,
            types: [classURI],
            properties: {},
            label: "Thing"
          },
        },
      });
      nodeMap.add(thingURI);
    }

    // Create datatype nodes and edges
    for (const domainURI of domainURIs) {
      for (const rangeURI of rangeURIs) {
        // Create datatype node if it doesn't exist
        if (!nodeMap.has(rangeURI)) {
          elements.push({
            data: {
              id: rangeURI,
              label: getLocalName(rangeURI),
              type: "datatype",
              color: "#fb923c", // orange
              resource: {
                uri: rangeURI,
                types: [],
                properties: {},
                label: getLocalName(rangeURI)
              },
            },
          });
          nodeMap.add(rangeURI);
        }

        // Create edge from domain to datatype
        if (nodeMap.has(domainURI)) {
          elements.push({
            data: {
              id: `${domainURI}-${propertyURI}-${rangeURI}`,
              source: domainURI,
              target: rangeURI,
              label: propertyResource.label || getLocalName(propertyURI),
              edgeType: "datatypeProperty",
              color: "#fb923c", // orange
              style: "dashed",
              width: 2,
              predicate: propertyURI,
            },
          });
          console.log('Created datatype property edge:', domainURI, '->', rangeURI, 'via', getLocalName(propertyURI));
        }
      }
    }
  }

  return { elements, conceptToClass, deprecatedToReplacement };
}

// Get layout configuration by name
function getLayoutConfig(layoutName) {
  const configs = {
    cose: {
      name: "cose",
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },
    circle: {
      name: "circle",
      fit: true,
      padding: 30,
      avoidOverlap: true,
      spacingFactor: 1.5,
    },
    concentric: {
      name: "concentric",
      fit: true,
      padding: 30,
      avoidOverlap: true,
      concentric: (node) => node.degree(),
      levelWidth: () => 2,
    },
    breadthfirst: {
      name: "breadthfirst",
      fit: true,
      padding: 30,
      directed: true,
      spacingFactor: 1.5,
      avoidOverlap: true,
    },
    grid: {
      name: "grid",
      fit: true,
      padding: 30,
      avoidOverlap: true,
      avoidOverlapPadding: 10,
    },
    "cose-bilkent": {
      name: "cose-bilkent",
      fit: true,
      padding: 30,
      randomize: false,
      nodeRepulsion: 4500,
      idealEdgeLength: 100,
      edgeElasticity: 0.45,
      nestingFactor: 0.1,
      gravity: 0.25,
      numIter: 2500,
      tile: true,
    },
  };

  return configs[layoutName] || configs.cose;
}

// Initialize Cytoscape
function initCytoscape(elements) {
  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: ui.canvas,
    elements: elements,
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "background-color": "data(color)",
          color: "#f8fafc",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "12px",
          "font-weight": "600",
          width: 60,
          height: 60,
          "border-width": 2,
          "border-color": "#1e293b",
          "text-outline-width": 2,
          "text-outline-color": "#0f172a",
        },
      },
      {
        selector: "node[type='class']",
        style: {
          shape: "ellipse",
        },
      },
      {
        selector: "node[type='objectProperty']",
        style: {
          shape: "diamond",
        },
      },
      {
        selector: "node[type='datatypeProperty']",
        style: {
          shape: "rectangle",
        },
      },
      {
        selector: "node[type='concept']",
        style: {
          shape: "round-rectangle",
        },
      },
      {
        selector: "edge",
        style: {
          width: "data(width)",
          "line-color": "data(color)",
          "line-style": "data(style)",
          "target-arrow-color": "data(color)",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": "10px",
          color: "#94a3b8",
          "text-rotation": "autorotate",
          "text-background-opacity": 0.8,
          "text-background-color": "#0f172a",
          "text-background-padding": "3px",
        },
      },
      {
        selector: "edge[edgeType='subclass']",
        style: {
          "line-style": "solid",
          width: 3,
        },
      },
      {
        selector: "edge[edgeType='hierarchy']",
        style: {
          "line-style": "dashed",
          width: 2,
        },
      },
      {
        selector: "edge[edgeType='domain']",
        style: {
          "line-style": "dashed",
        },
      },
      {
        selector: "edge[edgeType='range']",
        style: {
          "line-style": "dashed",
        },
      },
      {
        selector: "edge[edgeType='related']",
        style: {
          "line-style": "dotted",
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-width": 4,
          "border-color": "#fbbf24",
        },
      },
    ],
    layout: getLayoutConfig(currentLayout),
  });

  // Node click handler
  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    const resource = node.data("resource");
    showURIInspector(resource);
  });

  // Canvas click handler (deselect)
  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      hideURIInspector();
    }
  });

  if (pendingConceptFocus) {
    setTimeout(focusConceptIfNeeded, 300);
  }
}

function focusConceptIfNeeded() {
  if (!pendingConceptFocus || !cy) return;

  console.log('Attempting to focus concept:', pendingConceptFocus);
  let node = cy.getElementById(pendingConceptFocus);

  // If not found directly, check if it's a concept URI mapped to a class
  if ((!node || node.empty()) && window.conceptToClassMapping) {
    const mappedClassURI = window.conceptToClassMapping.get(pendingConceptFocus);
    if (mappedClassURI) {
      console.log('Concept URI mapped to class URI:', mappedClassURI);
      node = cy.getElementById(mappedClassURI);
    }
  }

  // If still not found, check if it's a deprecated URI mapped to a replacement
  if ((!node || node.empty()) && window.deprecatedToReplacementMapping) {
    const replacementURI = window.deprecatedToReplacementMapping.get(pendingConceptFocus);
    if (replacementURI) {
      console.log('Deprecated URI mapped to replacement URI:', replacementURI);
      node = cy.getElementById(replacementURI);
    }
  }

  if (!node || node.empty()) {
    console.warn('Concept node not found:', pendingConceptFocus);
    console.log('Available nodes:', cy.nodes().map(n => n.id()).slice(0, 10));
    return;
  }

  console.log('Found node:', node.id());
  // Center node without excessive zoom - just pan to it
  cy.center(node);
  node.select();
  const resource = node.data("resource");
  if (resource) {
    showURIInspector(resource);
  }
  pendingConceptFocus = null;
}

// Update URL with current state (ontology + concept)
function updateURLState(conceptURI = null) {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams();
  params.set('ontology', currentOntology);

  if (conceptURI) {
    params.set('concept', conceptURI);
  }

  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({ ontology: currentOntology, concept: conceptURI }, '', newURL);
}

// Show URI inspector sidebar
async function showURIInspector(resource) {
  currentURI = resource.uri;

  // Update URL to include selected concept
  updateURLState(resource.uri);

  ui.inspectorURI.textContent = resource.uri;
  ui.inspectorLabel.textContent = resource.label || getLocalName(resource.uri);

  // Determine type
  const types = resource.types.map(getLocalName).join(", ") || "Resource";
  ui.inspectorType.textContent = types;

  // Definition (from rdfs:comment or dct:description or skos:definition)
  const commentProp = resource.properties["http://www.w3.org/2000/01/rdf-schema#comment"];
  const descProp = resource.properties["http://purl.org/dc/terms/description"];
  const skosDef = resource.conceptData?.properties["http://www.w3.org/2004/02/skos/core#definition"];
  const definition = commentProp?.[0]?.value || skosDef?.[0]?.value || descProp?.[0]?.value || "No definition available.";
  ui.inspectorDefinition.textContent = definition;

  // Properties
  ui.inspectorProperties.innerHTML = "";

  // Helper function to create a section header
  const createSectionHeader = (text, color = "#38bdf8") => {
    const header = document.createElement("strong");
    header.textContent = text;
    header.style.cssText = `display: block; margin-top: 1rem; margin-bottom: 0.5rem; color: ${color}; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem;`;
    return header;
  };

  // Helper function to create a clickable link to another node
  const createNodeLink = (uri, label) => {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = label || getLocalName(uri);
    link.title = uri;
    link.style.color = "#3b82f6";
    link.style.textDecoration = "underline";
    link.onclick = (e) => {
      e.preventDefault();
      const targetNode = cy.getElementById(uri);
      if (targetNode && !targetNode.empty()) {
        cy.center(targetNode);
        targetNode.select();
        showURIInspector(targetNode.data("resource"));
      }
    };
    return link;
  };

  // If this resource has merged concept data, show it first
  if (resource.conceptData) {
    const conceptSection = document.createElement("div");
    conceptSection.style.cssText = "margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;";

    const conceptHeader = document.createElement("strong");
    conceptHeader.textContent = "Concept Information";
    conceptHeader.style.cssText = "display: block; margin-bottom: 0.5rem; color: #22d3ee;";
    conceptSection.appendChild(conceptHeader);

    const conceptURI = document.createElement("div");
    conceptURI.style.cssText = "font-size: 0.85em; color: #666; margin-bottom: 0.5rem;";
    conceptURI.textContent = `URI: ${resource.conceptURI}`;
    conceptSection.appendChild(conceptURI);

    // Add concept properties
    for (const [predicate, values] of Object.entries(resource.conceptData.properties)) {
      const predicateLabel = getLocalName(predicate);
      const dt = document.createElement("dt");
      dt.textContent = predicateLabel + " (concept)";
      dt.style.color = "#22d3ee";
      conceptSection.appendChild(dt);

      for (const val of values) {
        const dd = document.createElement("dd");
        dd.textContent = val.type === "uri" ? getLocalName(val.value) : val.value;
        conceptSection.appendChild(dd);
      }
    }

    ui.inspectorProperties.appendChild(conceptSection);

    // Add relationship note
    const relationNote = document.createElement("div");
    relationNote.style.cssText = "font-size: 0.85em; color: #666; font-style: italic; margin-bottom: 1rem; padding: 0.5rem; background: #f9fafb; border-radius: 4px;";
    relationNote.textContent = `This class has an associated SKOS concept (merged view). The concept provides additional semantic metadata via skos:definition and skos:prefLabel.`;
    ui.inspectorProperties.appendChild(relationNote);

    const classHeader = document.createElement("strong");
    classHeader.textContent = "Class Information";
    classHeader.style.cssText = "display: block; margin-bottom: 0.5rem; color: #38bdf8;";
    ui.inspectorProperties.appendChild(classHeader);
  }

  for (const [predicate, values] of Object.entries(resource.properties)) {
    const predicateLabel = getLocalName(predicate);
    const dt = document.createElement("dt");
    dt.textContent = predicateLabel;

    // Highlight special metadata properties
    if (predicate === "http://www.w3.org/2002/07/owl#deprecated") {
      dt.style.color = "#f59e0b"; // amber for deprecated
      dt.style.fontWeight = "bold";
    } else if (predicate === "http://purl.org/dc/terms/isReplacedBy") {
      dt.style.color = "#10b981"; // green for replacement info
    } else if (predicate === "http://purl.org/dc/terms/source") {
      dt.style.color = "#6366f1"; // indigo for source
    }

    ui.inspectorProperties.appendChild(dt);

    for (const val of values) {
      const dd = document.createElement("dd");

      // For URI values, show full URI as link if it's a replacement or source
      if (val.type === "uri") {
        if (predicate === "http://purl.org/dc/terms/isReplacedBy" ||
            predicate === "http://purl.org/dc/terms/source") {
          // Show full URI for important metadata
          const link = document.createElement("a");
          link.href = "#";
          link.textContent = getLocalName(val.value);
          link.title = val.value; // Show full URI on hover
          link.style.color = "#3b82f6";
          link.onclick = (e) => {
            e.preventDefault();
            // Try to find and focus the target node
            const targetNode = cy.getElementById(val.value);
            if (targetNode && !targetNode.empty()) {
              cy.center(targetNode);
              targetNode.select();
              showURIInspector(targetNode.data("resource"));
            }
          };
          dd.appendChild(link);
        } else {
          dd.textContent = getLocalName(val.value);
        }
      } else {
        dd.textContent = val.value;
      }

      ui.inspectorProperties.appendChild(dd);
    }
  }

  // Add relationship information from graph
  if (cy) {
    const node = cy.getElementById(resource.uri);
    if (node && !node.empty()) {
      // Outgoing relationships
      const outgoingEdges = node.connectedEdges(`[source = "${resource.uri}"]`);
      if (outgoingEdges.length > 0) {
        ui.inspectorProperties.appendChild(createSectionHeader("Outgoing Relationships", "#8b5cf6"));

        const grouped = {};
        outgoingEdges.forEach(edge => {
          const edgeType = edge.data("edgeType");
          const predicate = edge.data("predicate");
          const target = edge.target();
          const targetURI = target.id();
          const targetLabel = target.data("label");

          const key = `${edgeType}:${predicate}`;
          if (!grouped[key]) {
            grouped[key] = { edgeType, predicate, targets: [] };
          }
          grouped[key].targets.push({ uri: targetURI, label: targetLabel });
        });

        for (const [key, info] of Object.entries(grouped)) {
          const dt = document.createElement("dt");
          dt.textContent = getLocalName(info.predicate);
          dt.style.color = "#8b5cf6";
          ui.inspectorProperties.appendChild(dt);

          info.targets.forEach(target => {
            const dd = document.createElement("dd");
            dd.appendChild(createNodeLink(target.uri, target.label));
            ui.inspectorProperties.appendChild(dd);
          });
        }
      }

      // Incoming relationships
      const incomingEdges = node.connectedEdges(`[target = "${resource.uri}"]`);
      if (incomingEdges.length > 0) {
        ui.inspectorProperties.appendChild(createSectionHeader("Incoming Relationships", "#ec4899"));

        const grouped = {};
        incomingEdges.forEach(edge => {
          const edgeType = edge.data("edgeType");
          const predicate = edge.data("predicate");
          const source = edge.source();
          const sourceURI = source.id();
          const sourceLabel = source.data("label");

          const key = `${edgeType}:${predicate}`;
          if (!grouped[key]) {
            grouped[key] = { edgeType, predicate, sources: [] };
          }
          grouped[key].sources.push({ uri: sourceURI, label: sourceLabel });
        });

        for (const [key, info] of Object.entries(grouped)) {
          const dt = document.createElement("dt");
          dt.textContent = getLocalName(info.predicate) + " (from)";
          dt.style.color = "#ec4899";
          ui.inspectorProperties.appendChild(dt);

          info.sources.forEach(source => {
            const dd = document.createElement("dd");
            dd.appendChild(createNodeLink(source.uri, source.label));
            ui.inspectorProperties.appendChild(dd);
          });
        }
      }

      // Properties where this class is the domain
      const domainEdges = cy.edges(`[edgeType = "objectProperty"][source = "${resource.uri}"], [edgeType = "datatypeProperty"][source = "${resource.uri}"]`);
      if (domainEdges.length > 0) {
        ui.inspectorProperties.appendChild(createSectionHeader("Properties (Domain)", "#10b981"));

        domainEdges.forEach(edge => {
          const predicate = edge.data("predicate");
          const target = edge.target();
          const targetLabel = target.data("label");
          const edgeType = edge.data("edgeType");

          const dt = document.createElement("dt");
          dt.textContent = getLocalName(predicate);
          dt.style.color = edgeType === "objectProperty" ? "#a78bfa" : "#fb923c";
          ui.inspectorProperties.appendChild(dt);

          const dd = document.createElement("dd");
          dd.textContent = `→ ${targetLabel}`;
          dd.style.fontSize = "0.9em";
          dd.style.color = "#666";
          ui.inspectorProperties.appendChild(dd);
        });
      }

      // Properties where this class is the range
      const rangeEdges = cy.edges(`[edgeType = "objectProperty"][target = "${resource.uri}"], [edgeType = "datatypeProperty"][target = "${resource.uri}"]`);
      if (rangeEdges.length > 0) {
        ui.inspectorProperties.appendChild(createSectionHeader("Properties (Range)", "#f59e0b"));

        rangeEdges.forEach(edge => {
          const predicate = edge.data("predicate");
          const source = edge.source();
          const sourceLabel = source.data("label");
          const edgeType = edge.data("edgeType");

          const dt = document.createElement("dt");
          dt.textContent = getLocalName(predicate);
          dt.style.color = edgeType === "objectProperty" ? "#a78bfa" : "#fb923c";
          ui.inspectorProperties.appendChild(dt);

          const dd = document.createElement("dd");
          dd.textContent = `← ${sourceLabel}`;
          dd.style.fontSize = "0.9em";
          dd.style.color = "#666";
          ui.inspectorProperties.appendChild(dd);
        });
      }
    }
  }

  // Load comments from Firestore
  await loadComments(resource.uri);

  ui.inspector.classList.remove("hidden");
}

function hideURIInspector() {
  ui.inspector.classList.add("hidden");
  currentURI = null;

  // Update URL to remove concept parameter
  updateURLState(null);
}

// Load comments for URI from Firestore
async function loadComments(uri) {
  ui.inspectorComments.innerHTML = "<p class='muted-text'>Loading comments...</p>";

  try {
    const q = query(
      collection(db, "nso_annotations"),
      where("uri", "==", uri),
      where("ontology", "==", currentOntology),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    ui.inspectorComments.innerHTML = "";

    if (snapshot.empty) {
      ui.inspectorComments.innerHTML = "<p class='muted-text'>No comments yet.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const commentEl = document.createElement("div");
      commentEl.className = "comment-item";

      const header = document.createElement("div");
      header.className = "comment-header";

      const author = document.createElement("span");
      author.className = "comment-author";
      author.textContent = data.authorEmail || "Anonymous";

      const timestamp = document.createElement("span");
      timestamp.className = "comment-timestamp";
      const date = data.createdAt?.toDate?.() || new Date();
      timestamp.textContent = date.toLocaleDateString();

      header.appendChild(author);
      header.appendChild(timestamp);

      const text = document.createElement("p");
      text.className = "comment-text";
      text.textContent = data.text;

      commentEl.appendChild(header);
      commentEl.appendChild(text);
      ui.inspectorComments.appendChild(commentEl);
    });
  } catch (error) {
    console.error("Error loading comments:", error);
    ui.inspectorComments.innerHTML =
      "<p class='muted-text'>Error loading comments. You may need to sign in.</p>";
  }
}

// Save comment to Firestore
async function saveComment(uri, text) {
  if (!currentUser) {
    alert("Please sign in to add comments.");
    return;
  }

  try {
    await addDoc(collection(db, "nso_annotations"), {
      uri: uri,
      ontology: currentOntology,
      text: text,
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      createdAt: serverTimestamp(),
    });

    // Reload comments
    await loadComments(uri);
    ui.commentForm.classList.add("hidden");
    ui.commentInput.value = "";
  } catch (error) {
    console.error("Error saving comment:", error);
    alert("Failed to save comment. Please try again.");
  }
}

// Parse OWL/XML format (handles both typed elements and rdf:Description)
function parseOwlXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const triples = [];
  const resources = new Map();
  const prefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    skos: "http://www.w3.org/2004/02/skos/core#",
  };

  // Extract namespace prefixes from root element
  const root = xmlDoc.documentElement;
  for (const attr of root.attributes) {
    if (attr.name.startsWith("xmlns:")) {
      const prefix = attr.name.substring(6);
      prefixes[prefix] = attr.value;
    }
  }

  // Helper to expand URIs
  const expandUri = (uri) => {
    if (!uri) return uri;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
    const colonIndex = uri.indexOf(":");
    if (colonIndex > 0) {
      const prefix = uri.substring(0, colonIndex);
      const local = uri.substring(colonIndex + 1);
      return prefixes[prefix] ? prefixes[prefix] + local : uri;
    }
    return uri;
  };

  // Parse all rdf:Description elements (generic RDF/XML format)
  const descriptions = xmlDoc.querySelectorAll("rdf\\:Description, Description");
  descriptions.forEach((desc) => {
    const about = desc.getAttribute("rdf:about") || desc.getAttribute("about");
    if (!about) return;

    const subjectUri = expandUri(about);

    // Get rdf:type to determine resource type
    const typeElements = desc.querySelectorAll("rdf\\:type, type");
    const types = [];
    typeElements.forEach((typeEl) => {
      const typeResource = typeEl.getAttribute("rdf:resource") || typeEl.getAttribute("resource");
      if (typeResource) {
        const typeUri = expandUri(typeResource);
        types.push(typeUri);

        // Add type triple
        triples.push({
          subject: subjectUri,
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
          object: typeUri,
          objectType: "uri",
        });
      }
    });

    // Create or update resource
    if (!resources.has(subjectUri)) {
      resources.set(subjectUri, {
        uri: subjectUri,
        properties: {},
        types: types,
        label: getLocalName(subjectUri),
      });
    } else {
      // Merge types
      const resource = resources.get(subjectUri);
      types.forEach((t) => {
        if (!resource.types.includes(t)) {
          resource.types.push(t);
        }
      });
    }

    const resource = resources.get(subjectUri);

    // Parse all child elements as properties
    for (const child of desc.children) {
      const tagName = child.tagName;
      const localName = tagName.includes(":") ? tagName.split(":")[1] : tagName;
      const namespace = tagName.includes(":") ? tagName.split(":")[0] : null;

      // Skip rdf:type as we already handled it
      if (localName === "type" && namespace === "rdf") continue;

      // Get predicate URI
      const predicateUri = namespace && prefixes[namespace]
        ? prefixes[namespace] + localName
        : tagName;

      // Check if it's a resource reference or literal
      const resourceAttr = child.getAttribute("rdf:resource") || child.getAttribute("resource");

      if (resourceAttr) {
        // It's a URI reference
        const objectUri = expandUri(resourceAttr);
        triples.push({
          subject: subjectUri,
          predicate: predicateUri,
          object: objectUri,
          objectType: "uri",
        });

        // Store in properties
        if (!resource.properties[predicateUri]) {
          resource.properties[predicateUri] = [];
        }
        resource.properties[predicateUri].push({
          value: objectUri,
          type: "uri",
        });
      } else if (child.textContent) {
        // It's a literal value
        const value = child.textContent.trim();
        if (value) {
          // Special handling for labels
          if (predicateUri.endsWith("label") || predicateUri.endsWith("prefLabel")) {
            resource.label = value;
          }

          if (!resource.properties[predicateUri]) {
            resource.properties[predicateUri] = [];
          }
          resource.properties[predicateUri].push({
            value: value,
            type: "literal",
          });
        }
      }
    }
  });

  // Also parse typed elements (owl:Class, owl:ObjectProperty) for compatibility
  const classes = xmlDoc.querySelectorAll("owl\\:Class, Class");
  classes.forEach((cls) => {
    const about = cls.getAttribute("rdf:about") || cls.getAttribute("about");
    if (!about) return;

    const uri = expandUri(about);
    if (!resources.has(uri)) {
      resources.set(uri, {
        uri,
        properties: {},
        types: ["http://www.w3.org/2002/07/owl#Class"],
        label: getLocalName(uri),
      });
    }
  });

  return { triples, resources, prefixes };
}

// Load ontology from file
async function loadOntology(ontologyKey) {
  const ontologyMeta = ontologyFiles[ontologyKey];
  if (!ontologyMeta) {
    showError("Ontology file not found.");
    return;
  }
  const filePath = ontologyMeta.path || ontologyMeta; // Support both new and old format

  ui.loading.classList.remove("hidden");
  ui.error.classList.add("hidden");

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}`);
    }

    const fileContent = await response.text();

    // Detect format: XML if starts with <?xml, otherwise Turtle
    const isXml = fileContent.trim().startsWith("<?xml") || fileContent.trim().startsWith("<rdf:RDF");

    const rdfData = isXml ? parseOwlXml(fileContent) : parseTurtle(fileContent);
    const { elements, conceptToClass, deprecatedToReplacement } = buildGraph(rdfData);

    // Store mappings globally for getElementById lookups
    window.conceptToClassMapping = conceptToClass;
    window.deprecatedToReplacementMapping = deprecatedToReplacement;

    initCytoscape(elements);
    ui.loading.classList.add("hidden");

    // Update URL with current ontology (ensures URL is correct on initial load)
    updateURLState(pendingConceptFocus);
  } catch (error) {
    console.error("Error loading ontology:", error);
    showError(`Failed to load ontology: ${error.message}`);
    ui.loading.classList.add("hidden");
  }
}

function showError(message) {
  ui.errorText.textContent = message;
  ui.error.classList.remove("hidden");
}

// Event listeners
ui.closeInspector.addEventListener("click", hideURIInspector);

ui.addCommentBtn.addEventListener("click", () => {
  ui.commentForm.classList.remove("hidden");
  ui.commentInput.focus();
});

ui.cancelComment.addEventListener("click", () => {
  ui.commentForm.classList.add("hidden");
  ui.commentInput.value = "";
});

ui.commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = ui.commentInput.value.trim();
  if (text && currentURI) {
    await saveComment(currentURI, text);
  }
});

// Update ontology description display
function updateOntologyDescription() {
  const selectedOption = ui.ontologySelector.selectedOptions[0];
  const description = selectedOption?.getAttribute('data-description') || '';
  if (ui.ontologyDescription) {
    ui.ontologyDescription.textContent = description;
  }
}

ui.ontologySelector.addEventListener("change", (e) => {
  currentOntology = e.target.value;
  hideURIInspector();

  // Update description display
  updateOntologyDescription();

  // Update URL with new ontology (removes concept since we're loading new graph)
  updateURLState(null);

  loadOntology(currentOntology);
});

ui.resetView.addEventListener("click", () => {
  if (cy) {
    cy.fit();
  }
});

// Layout selector
ui.layoutSelector.addEventListener("change", (e) => {
  currentLayout = e.target.value;
  if (cy) {
    const layout = cy.layout(getLayoutConfig(currentLayout));
    layout.run();
  }
});

// Toggle edge filters panel
ui.toggleFilters.addEventListener("click", () => {
  ui.edgeFilters.classList.toggle("hidden");
});

// Toggle property nodes visibility
ui.toggleProperties.addEventListener("click", () => {
  showPropertiesAsNodes = !showPropertiesAsNodes;

  // Update button text
  ui.propertiesToggleText.textContent = showPropertiesAsNodes ? "Hide Properties" : "Show Properties";

  updatePropertyVisualization();
});

// Update property visualization
function updatePropertyVisualization() {
  if (!cy) return;

  // Get all property nodes (ObjectProperty and DatatypeProperty)
  const propertyNodes = cy.nodes().filter((node) => {
    const type = node.data("type");
    return type === "objectProperty" || type === "datatypeProperty";
  });

  console.log(`[Property Toggle] Showing properties: ${showPropertiesAsNodes}, Found ${propertyNodes.length} property nodes`);

  if (showPropertiesAsNodes) {
    // Show property nodes
    propertyNodes.style("display", "element");
    console.log(`[Property Toggle] Showing ${propertyNodes.length} property nodes`);
  } else {
    // Hide property nodes
    propertyNodes.style("display", "none");
    console.log(`[Property Toggle] Hiding ${propertyNodes.length} property nodes`);
  }

  // Update edge visibility
  updateEdgeVisibility();
}

// Edge filter checkboxes
function updateEdgeVisibility() {
  if (!cy) return;

  const filters = {
    subclass: ui.filterSubclass.checked,
    hierarchy: ui.filterSubclass.checked, // hierarchy uses same checkbox as subclass
    objectProperty: true, // Always show object property edges (new system)
    datatypeProperty: true, // Always show datatype property edges (new system)
    related: ui.filterRelated.checked,
    relation: true, // Default for unclassified edges
  };

  console.log('[Edge Visibility] Filters:', filters);

  let hiddenByFilter = 0;
  let shown = 0;

  cy.edges().forEach((edge) => {
    const edgeType = edge.data("edgeType");
    const source = edge.source();
    const target = edge.target();

    // Check if source/target nodes exist
    if (!source || !target || source.empty() || target.empty()) {
      return;
    }

    // Apply edge filters
    const shouldShow = filters[edgeType] !== undefined ? filters[edgeType] : filters.relation;

    edge.style("display", shouldShow ? "element" : "none");

    if (shouldShow) {
      shown++;
    } else {
      hiddenByFilter++;
    }
  });

  console.log(`[Edge Visibility] Hidden by filter: ${hiddenByFilter}, Shown: ${shown}`);
}

ui.filterSubclass.addEventListener("change", updateEdgeVisibility);
ui.filterDomain.addEventListener("change", updateEdgeVisibility);
ui.filterRange.addEventListener("change", updateEdgeVisibility);
ui.filterRelated.addEventListener("change", updateEdgeVisibility);

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
  if (event.state) {
    const { ontology, concept } = event.state;

    // Update ontology if changed
    if (ontology && ontology !== currentOntology) {
      currentOntology = ontology;
      ui.ontologySelector.value = ontology;
      loadOntology(ontology);
    }

    // Update concept selection
    if (concept && cy) {
      pendingConceptFocus = concept;
      setTimeout(focusConceptIfNeeded, 300);
    } else if (!concept) {
      hideURIInspector();
    }
  }
});

// Initial load
// Set selector to match current ontology (from URL or default)
if (ui.ontologySelector) {
  ui.ontologySelector.value = currentOntology;
}
updateOntologyDescription();
loadOntology(currentOntology);
