#!/usr/bin/env python3
"""
RDF Audit Script - Week 1 of NSO Consolidation
Analyzes all RDF files to identify:
- Class counts per file
- Property counts per file
- Naming violations (plural classes, redundant suffixes)
- Duplicate concepts across namespaces
- Missing metadata (labels, definitions)
"""

import os
import re
from pathlib import Path
from collections import defaultdict, Counter

RDF_DIR = Path(__file__).parent.parent / "rdf"

# Patterns for different RDF formats
TURTLE_CLASS = re.compile(r'(\w+:\w+)\s+a\s+owl:Class')
TURTLE_OBJ_PROP = re.compile(r'(\w+:\w+)\s+a\s+owl:ObjectProperty')
TURTLE_DATA_PROP = re.compile(r'(\w+:\w+)\s+a\s+owl:DatatypeProperty')
TURTLE_CONCEPT = re.compile(r'(\w+:\w+)\s+a\s+skos:Concept')
TURTLE_LABEL = re.compile(r'rdfs:label\s+"([^"]+)"')
TURTLE_PREF_LABEL = re.compile(r'skos:prefLabel\s+"([^"]+)"')

# Naming violations
PLURAL_CLASSES = re.compile(r'.*Techniques?$|.*Properties$|.*Outcomes$')
REDUNDANT_SUFFIX = re.compile(r'.*TechniqueTechnique$|.*PropertyProperty$')

def parse_turtle_file(filepath):
    """Parse Turtle/OWL file and extract resources."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    results = {
        'classes': [],
        'object_properties': [],
        'datatype_properties': [],
        'concepts': [],
        'labels': [],
        'violations': []
    }

    # Extract classes
    for match in TURTLE_CLASS.finditer(content):
        class_uri = match.group(1)
        results['classes'].append(class_uri)

        # Check naming violations
        local_name = class_uri.split(':')[-1]
        if PLURAL_CLASSES.match(local_name):
            results['violations'].append({
                'type': 'plural_class',
                'uri': class_uri,
                'suggestion': local_name.rstrip('s')  # Simple singularization
            })
        if REDUNDANT_SUFFIX.match(local_name):
            results['violations'].append({
                'type': 'redundant_suffix',
                'uri': class_uri,
                'suggestion': local_name.replace('TechniqueTechnique', 'Technique').replace('PropertyProperty', 'Property')
            })

    # Extract properties
    for match in TURTLE_OBJ_PROP.finditer(content):
        results['object_properties'].append(match.group(1))

    for match in TURTLE_DATA_PROP.finditer(content):
        results['datatype_properties'].append(match.group(1))

    # Extract concepts
    for match in TURTLE_CONCEPT.finditer(content):
        results['concepts'].append(match.group(1))

    # Extract labels
    for match in TURTLE_LABEL.finditer(content):
        results['labels'].append(match.group(1))
    for match in TURTLE_PREF_LABEL.finditer(content):
        results['labels'].append(match.group(1))

    return results

def audit_rdf_directory():
    """Audit all RDF files in the directory tree."""
    all_files = []
    all_classes = defaultdict(list)
    all_violations = []

    # Find all TTL and OWL files
    for ext in ['*.ttl', '*.owl']:
        all_files.extend(RDF_DIR.glob(f'**/{ext}'))

    print(f"🔍 Found {len(all_files)} RDF files\n")
    print("=" * 80)

    for filepath in sorted(all_files):
        relative_path = filepath.relative_to(RDF_DIR.parent)
        print(f"\n📄 {relative_path}")

        try:
            results = parse_turtle_file(filepath)

            # Summary
            print(f"   Classes: {len(results['classes'])}")
            print(f"   Object Properties: {len(results['object_properties'])}")
            print(f"   Datatype Properties: {len(results['datatype_properties'])}")
            print(f"   Concepts: {len(results['concepts'])}")
            print(f"   Labels: {len(results['labels'])}")

            # Violations
            if results['violations']:
                print(f"   ⚠️  {len(results['violations'])} naming violations:")
                for v in results['violations'][:3]:  # Show first 3
                    print(f"      - {v['type']}: {v['uri']} → {v['suggestion']}")
                all_violations.extend(results['violations'])

            # Track classes for duplicate detection
            for cls in results['classes']:
                local_name = cls.split(':')[-1]
                all_classes[local_name].append(str(relative_path))

        except Exception as e:
            print(f"   ❌ Error parsing: {e}")

    print("\n" + "=" * 80)
    print("\n📊 SUMMARY")
    print("=" * 80)

    # Duplicate classes
    duplicates = {k: v for k, v in all_classes.items() if len(v) > 1}
    if duplicates:
        print(f"\n🔄 {len(duplicates)} classes appear in multiple files:")
        for class_name, files in sorted(duplicates.items())[:10]:  # Top 10
            print(f"   {class_name}:")
            for f in files:
                print(f"      - {f}")

    # Naming violations summary
    if all_violations:
        print(f"\n⚠️  {len(all_violations)} total naming violations")
        violation_types = Counter(v['type'] for v in all_violations)
        for vtype, count in violation_types.most_common():
            print(f"   {vtype}: {count}")

    print("\n✅ Audit complete!")
    print("\n📋 Next steps:")
    print("   1. Review violations and plan renames")
    print("   2. Create migration script for deprecated URIs")
    print("   3. Start consolidating duplicates into bsc: namespace")

if __name__ == '__main__':
    audit_rdf_directory()
