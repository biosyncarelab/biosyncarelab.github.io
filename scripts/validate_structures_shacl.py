#!/usr/bin/env python3
"""
Validate generated structure datasets (JSON-LD) against SHACL shapes.
Dependencies: pip install pyshacl rdflib
"""

import sys
from pathlib import Path


def ensure_dependency():
    try:
        import pyshacl  # noqa: F401
    except ImportError:
        sys.stderr.write(
            "Missing dependency: pyshacl (and rdflib). "
            "Install with: pip install pyshacl rdflib\n"
        )
        sys.exit(1)


def main():
    ensure_dependency()
    from rdflib import Graph
    from pyshacl import validate

    root = Path(__file__).resolve().parent.parent
    data_dir = root / "rdf" / "datasets"
    shapes_file = root / "rdf" / "shapes" / "structures.shacl.ttl"

    data_files = sorted(data_dir.glob("*.jsonld"))
    if not data_files:
        sys.stderr.write("No JSON-LD datasets found in rdf/datasets. Run export first.\n")
        sys.exit(1)

    if not shapes_file.exists():
        sys.stderr.write(f"Shapes file not found: {shapes_file}\n")
        sys.exit(1)

    # Load local context to avoid network fetch during JSON-LD parse
    context_path = root / "rdf" / "context" / "structures.jsonld"
    if not context_path.exists():
        sys.stderr.write(f"Context file not found: {context_path}\n")
        sys.exit(1)
    import json

    with context_path.open("r", encoding="utf-8") as f:
        context_json = json.load(f).get("@context")

    data_graph = Graph()
    import json as _json
    for file_path in data_files:
        data_obj = _json.loads(file_path.read_text(encoding="utf-8"))
        # Override remote context to avoid network fetches
        data_obj["@context"] = context_json
        raw = _json.dumps(data_obj)
        data_graph.parse(
            data=raw,
            format="json-ld",
            context=context_json,
            publicID=file_path.as_uri()
        )

    shapes_graph = Graph()
    shapes_graph.parse(shapes_file)

    conforms, report_graph, report_text = validate(
        data_graph=data_graph,
        shacl_graph=shapes_graph,
        inference="rdfs",
        abort_on_first=False,
        allow_infos=True,
        allow_warnings=True,
        serialize_report_graph=True,
    )

    print(report_text)
    if not conforms:
        sys.exit(1)


if __name__ == "__main__":
    main()
