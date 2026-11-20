"""
Exports OpenAPI JSON specification for RESILINK GRID Hub Backend.
Delivered to Harshavardhan and Yashwanth to code client & firmware contracts against.
"""

import sys
import json
from pathlib import Path

# Add hub directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app


def export_openapi():
    openapi_schema = app.openapi()
    output_path = Path(__file__).resolve().parent.parent / "openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"OpenAPI specification exported to: {output_path}")


if __name__ == "__main__":
    export_openapi()
