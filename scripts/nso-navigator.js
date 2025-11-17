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

// State
let currentUser = null;
let currentURI = null;
let cy = null;
let currentOntology = "bsc-owl";

// Ontology file mappings
const ontologyFiles = {
  "bsc-owl": "rdf/core/bsc-owl.ttl",
  "bsc-skos": "rdf/core/bsc-skos.ttl",
  "sso-ontology": "rdf/external/sso/sso-ontology.ttl",
  "sso-extended": "rdf/external/sso/sso-ontology-extended.ttl",
  "sso-initial": "rdf/external/sso/sso-initial.owl",
  "sso-updated": "rdf/external/sso/sso-updated.owl",
  "onc-ontology": "rdf/external/onc/onc-ontology-attachment-2.ttl",
  "onc-attachment": "rdf/Attachment 2_ONC_Ontology.ttl",
  "harmonicare-sso": "rdf/external/harmonicare/SSO_Ontology.owl",
  "harmonicare-sso-alt": "rdf/external/harmonicare/SSO_Ontology_.owl",
};

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
  resetView: document.getElementById("reset-view"),
  loading: document.getElementById("loading-indicator"),
  error: document.getElementById("error-message"),
  errorText: document.getElementById("error-text"),
};

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

      currentPredicate = expandURI(pair.substring(0, pairSpace).trim());
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

  // Create nodes for classes, properties, and concepts
  for (const [uri, resource] of rdfData.resources) {
    let nodeType = "resource";
    let color = "#64748b"; // default gray

    if (resource.types.includes(classURI)) {
      nodeType = "class";
      color = "#38bdf8"; // blue
    } else if (resource.types.includes(objectPropertyURI)) {
      nodeType = "objectProperty";
      color = "#a78bfa"; // purple
    } else if (resource.types.includes(datatypePropertyURI)) {
      nodeType = "datatypeProperty";
      color = "#fb923c"; // orange
    } else if (resource.types.includes(conceptURI)) {
      nodeType = "concept";
      color = "#22d3ee"; // cyan
    }

    elements.push({
      data: {
        id: uri,
        label: resource.label || getLocalName(uri),
        type: nodeType,
        color: color,
        resource: resource,
      },
    });
    nodeMap.add(uri);
  }

  // Create edges
  for (const triple of rdfData.triples) {
    const { subject, predicate, object, objectType } = triple;

    // Only create edges for URI objects that exist as nodes
    if (objectType === "uri" && nodeMap.has(object)) {
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
      // Domain relations
      else if (predicate === domain) {
        edgeClass = "domain";
        edgeColor = "#10b981"; // green
        edgeStyle = "dashed";
        edgeWidth = 2;
      }
      // Range relations
      else if (predicate === range) {
        edgeClass = "range";
        edgeColor = "#f59e0b"; // amber
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

  return elements;
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
    layout: {
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
}

// Show URI inspector sidebar
async function showURIInspector(resource) {
  currentURI = resource.uri;

  ui.inspectorURI.textContent = resource.uri;
  ui.inspectorLabel.textContent = resource.label || getLocalName(resource.uri);

  // Determine type
  const types = resource.types.map(getLocalName).join(", ") || "Resource";
  ui.inspectorType.textContent = types;

  // Definition (from rdfs:comment or dct:description)
  const commentProp = resource.properties["http://www.w3.org/2000/01/rdf-schema#comment"];
  const descProp = resource.properties["http://purl.org/dc/terms/description"];
  const definition = commentProp?.[0]?.value || descProp?.[0]?.value || "No definition available.";
  ui.inspectorDefinition.textContent = definition;

  // Properties
  ui.inspectorProperties.innerHTML = "";
  for (const [predicate, values] of Object.entries(resource.properties)) {
    const predicateLabel = getLocalName(predicate);
    const dt = document.createElement("dt");
    dt.textContent = predicateLabel;
    ui.inspectorProperties.appendChild(dt);

    for (const val of values) {
      const dd = document.createElement("dd");
      dd.textContent = val.type === "uri" ? getLocalName(val.value) : val.value;
      ui.inspectorProperties.appendChild(dd);
    }
  }

  // Load comments from Firestore
  await loadComments(resource.uri);

  ui.inspector.classList.remove("hidden");
}

function hideURIInspector() {
  ui.inspector.classList.add("hidden");
  currentURI = null;
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
  const filePath = ontologyFiles[ontologyKey];
  if (!filePath) {
    showError("Ontology file not found.");
    return;
  }

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
    const elements = buildGraph(rdfData);

    initCytoscape(elements);
    ui.loading.classList.add("hidden");
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

ui.ontologySelector.addEventListener("change", (e) => {
  currentOntology = e.target.value;
  hideURIInspector();
  loadOntology(currentOntology);
});

ui.resetView.addEventListener("click", () => {
  if (cy) {
    cy.fit();
  }
});

// Initial load
loadOntology(currentOntology);
