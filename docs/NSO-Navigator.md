# NSO Navigator

The **NSO Navigator** is a standalone RDF ontology browser built for exploring and annotating the Neurosensory Stimulation Ontology (NSO) and related semantic data.

## Features

### Graph Visualization
- **Cytoscape.js-based** interactive graph rendering
- **Visual differentiation** of semantic entities:
  - **Classes** (blue circles): OWL classes representing concepts
  - **Object Properties** (purple diamonds): Properties linking resources
  - **Data Properties** (orange rectangles): Properties with literal values
- **Edge types**:
  - **Subclass relations** (solid blue arrows): Class hierarchy (is-a relationships)
  - **Property relations** (purple arrows): Domain/range and other property connections

### URI Inspector Sidebar
When you click on any node in the graph, the URI Inspector opens showing:
- **URI**: Full resource identifier
- **Type**: Resource classification (Class, ObjectProperty, DatatypeProperty, etc.)
- **Label**: Human-readable name (rdfs:label)
- **Definition**: Description from rdfs:comment or dct:description
- **Properties**: All RDF predicates and their values for this resource
- **Comments**: Community annotations stored in Firestore

### Annotation System
- **Add comments** to any URI in the ontology
- **Firestore integration** persists annotations across sessions
- **User attribution**: Comments show author email and timestamp
- **Requires authentication**: Sign in via the main dashboard first

### Multi-Ontology Support
Switch between different ontologies using the dropdown selector:
- **BSC Core (OWL)**: Main BioSynCare ontology
- **BSC Core (SKOS)**: SKOS vocabulary for BSC concepts
- **SSO Ontology**: Sensory Stimulation Ontology
- **SSO Extended**: Extended SSO with additional concepts
- **ONC Ontology**: External Ontology for Neurosensory Care

## Usage

1. **Open the Navigator**: Visit [nso-navigator.html](../nso-navigator.html)
2. **Explore the graph**:
   - Click and drag to pan
   - Scroll to zoom
   - Click nodes to inspect them
   - Use "Reset View" to fit the entire graph
3. **Inspect resources**: Click any node to see its details in the sidebar
4. **Add annotations**:
   - Sign in first via the main dashboard
   - Click a node to open the inspector
   - Click "+ Add Comment" to contribute an annotation
5. **Switch ontologies**: Use the dropdown to load different RDF files

## Technical Details

### Files
- **HTML**: [nso-navigator.html](../nso-navigator.html)
- **Styles**: [styles/nso-navigator.css](../styles/nso-navigator.css)
- **Script**: [scripts/nso-navigator.js](../scripts/nso-navigator.js)
- **RDF Data**: Located in [rdf/](../rdf/) directory

### Dependencies
- **Cytoscape.js 3.28.1**: Graph visualization (loaded from CDN)
- **Firebase 10.14.0**: Authentication and Firestore (loaded from CDN)
- **Built-in Turtle parser**: Simplified parser for basic RDF/Turtle triples

### Data Model
Annotations are stored in Firestore collection `nso_annotations` with schema:
```javascript
{
  uri: string,           // URI being annotated
  ontology: string,      // Which ontology (e.g., "bsc-owl")
  text: string,          // Comment text
  authorId: string,      // Firebase user ID
  authorEmail: string,   // User email for attribution
  createdAt: timestamp   // Server timestamp
}
```

### Turtle Parser
The built-in parser handles:
- Prefix declarations (`@prefix`)
- Basic triple patterns (subject predicate object)
- URI expansion (both `<uri>` and `prefix:local` forms)
- Literal values (plain, with language tags, with datatypes)
- Property lists (`;` continuation)

**Limitations**: Does not support blank nodes, collections, or complex nested structures.

## Future Enhancements

As noted in [README.md](../README.md) section 2, planned improvements include:

- [ ] Navigation link from main dashboard to NSO Navigator
- [ ] Ontology links embedded in dashboard session/preset cards
- [ ] Diff visualization for weekly RDF updates
- [ ] Moderator scopes for annotation management
- [ ] Enhanced graph layouts (hierarchical, circular, etc.)
- [ ] Full Turtle/RDF parser with blank node support
- [ ] Export annotations as RDF
- [ ] Search/filter functionality for large ontologies

## Related Documentation

- [Features.md](Features.md): Full BSCLab feature specification
- [clarifications.md](clarifications.md): Resolved design decisions
- [Agents.md](Agents.md): Pod roles and collaboration rules
